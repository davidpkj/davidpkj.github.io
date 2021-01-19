// User set preferences
let preferences = {
  // Active lesson numbers
  "lessons": ["2", "3", "4"],
  // Active suffixes
  "suffixes": ["ます", "ません", "でした", "ませんでした"],
  // Active vocabulary themes
  "vocabulary": [],
}

// Remembers the correct answer
let correct;

// Remembers amount of right/wrong questions
let score = {
  "right": 0,
  "wrong": 0,
  "skipped": 0
};

// Keeps track of asked questions & translations
let hadRandom = {
  "verbs": [],
  "vocabulary": [],
  "translations": [],
  // Asked questions go here first, so they can be skipped
  "tempVerbs": [],
  "tempVocabulary": []
};

// More globals
let verbs, suffixes, vocabulary = {};

// Stores amount of possible questions // TODO: let this be calculated
const possibleQuestions = {
  "verbs": {
    "1": 0,
    "2": 6,
    "3": 5,
    "4": 0
  },
  "vocabulary": {
    "1": {
      "floskeln": 15,
      "schule": 20,
      "menschen": 0,
      "gebäude": 2,
      "unternehmen": 4,
      "lebensmittel": 0,
      "verkehrsmittel": 0,
      "zeiten/zahlen": 0,
      "pflanzen": 3,
      "adjektive": 0,
      "sonstiges": 8
    },
    "2": {
      "floskeln": 0,
      "schule": 2,
      "menschen": 0,
      "gebäude": 0,
      "unternehmen": 21,
      "lebensmittel": 23,
      "verkehrsmittel": 0,
      "zeiten/zahlen": 0,
      "pflanzen": 0,
      "adjektive": 0,
      "sonstiges": 4
    },
    "3": {
      "floskeln": 3,
      "schule": 0,
      "menschen": 19,
      "gebäude": 1,
      "unternehmen": 4,
      "lebensmittel": 0,
      "verkehrsmittel": 8,
      "zeiten/zahlen": 13,
      "pflanzen": 0,
      "adjektive": 0,
      "sonstiges": 7
    },
    "4": {
      "floskeln": 1,
      "schule": 0,
      "menschen": 8,
      "gebäude": 10,
      "unternehmen": 2,
      "lebensmittel": 1,
      "verkehrsmittel": 0,
      "zeiten/zahlen": 10,
      "pflanzen": 0,
      "adjektive": 11,
      "sonstiges": 11
    }
  }
}

// Constant DOM Elements
const actionButton = document.querySelector(".action-button");
const buttons = document.querySelectorAll(".guess-button");
const overlay = document.querySelector(".overlay");

// Returns an object respecting the given preferences parsed from the given json
const assignJSONObject = (assignPreferences, jsonObject) => {
  let _object = {};

  if (!assignPreferences.length || !jsonObject) return;

  for (let preference of assignPreferences) {
    _object = Object.assign(_object, jsonObject[preference.toString()]);
  }

  return _object;
}

// Parses JSON & sets globals;
const parseJSON = (string, filepath) => {
  return new Promise((resolve, _) => {
    const _json = JSON.parse(string);

    if (!vocabulary && filepath.includes("vokabeln.json")) {
      let _vocabularyList = _json.lessons;

      if (!_vocabularyList) return;

      for (let lesson in _vocabularyList) {
        // This statement regulates the lesson filter for vocabulary. if true, the lesson gets parsed for selected themes
        if (preferences.lessons.includes(lesson)) vocabulary = Object.assign(vocabulary ? vocabulary : {}, assignJSONObject(preferences.vocabulary, _vocabularyList[lesson]));
      }
    }

    if (!suffixes && filepath.includes("verben.json")) suffixes = assignJSONObject(preferences.suffixes, _json.suffixes);
    if (!verbs && filepath.includes("verben.json") && getNumberOfKeys(suffixes) != 0) verbs = assignJSONObject(preferences.lessons, _json.lessons);

    resolve();
  });
}

// Loads JSON from file
const loadJSON = (file, callback) => {
  return new Promise((resolve, _) => {
    const _xobj = new XMLHttpRequest();

    _xobj.overrideMimeType("application/json");
    _xobj.open("GET", file, true);
    _xobj.onreadystatechange = () => {
      if (_xobj.readyState == 4 && _xobj.status == "200") {
        if (callback != null) callback(_xobj.responseText, file).then(() => resolve());
      }
    };

    _xobj.send(null);
  });
};

// Reparses JSON for selection
const pullJSON = (callback) => {
  vocabulary = null;
  suffixes = null;
  verbs = null;

  if (callback) callback();

  Promise.allSettled([
    loadJSON("../assets/japanisch/vokabeln.json", (string, file) => parseJSON(string, file)),
    loadJSON("../assets/japanisch/verben.json", (string, file) => parseJSON(string, file))
  ]).then(() => {
    resetQuiz();
    randomQuiz();
  });
};

// Removes all state from buttons
const clearButtons = () => {
  buttons.forEach((element) => {
    const elementClasses = element.classList;

    if (elementClasses.contains("right")) elementClasses.remove("right");
    if (elementClasses.contains("wrong")) elementClasses.remove("wrong");

    overlay.style.display = "none";
  });

  return true;
}

// Updates the progress bar
const updateProgress = (percent) => {
  let _customStyleTag = document.querySelector("#customStyleTag");

  if (!percent) percent = (hadRandom.verbs.length + hadRandom.vocabulary.length + hadRandom.tempVerbs.length + hadRandom.tempVocabulary.length) * 100 / (getNumberOfKeys(verbs) + getNumberOfKeys(vocabulary));

  if (!_customStyleTag) {
    _customStyleTag = document.createElement("style");
    _customStyleTag.id = "customStyleTag";
  }

  _customStyleTag.innerHTML = `.progress:after {width: ${percent}%;}`;
  document.head.appendChild(_customStyleTag);

  if (percent == 100) {
    document.querySelector(".progress").style.boxShadow = `0 0 10px 0 var(--primary)`;
    return showResults();
  }
  if (percent == 0) document.querySelector(".progress").style.boxShadow = `0 0 10px 0 var(--disabled)`;

  return true;
}

// Checks if the clicked button is the correct answer
const submit = (element) => {
  if (correct == element.innerText) {
    element.classList.toggle("right");
    score.right++;
  } else {
    element.classList.toggle("wrong");
    score.wrong++;

    buttons.forEach((element) => {
      if (element.innerText == correct) element.classList.toggle("right");
    });
  }

  overlay.style.display = "block";
  
  updateProgress();

  return true;
}

// Resets the quiz
const resetQuiz = () => {
  hadRandom = {
    "verbs": [],
    "vocabulary": [],
    "translations": [],
    "tempVerbs": [],
    "tempVocabulary": []
  };

  score = {
    "right": 0,
    "wrong": 0,
    "skipped": 0
  };

  actionButton.innerText = "Überspringen";

  document.querySelector(".result").style.display = "none";
  document.querySelector(".verb").style.display = "block";

  updateProgress(0);
}

// Pushes temporary verb on list with had verbs
const pushTemp = () => {
  if (hadRandom.tempVerbs[0]) hadRandom.verbs.push(hadRandom.tempVerbs[0]);
  if (hadRandom.tempVocabulary[0]) hadRandom.vocabulary.push(hadRandom.tempVocabulary[0]);
  hadRandom.tempVerbs = [];
  hadRandom.tempVocabulary = [];
}

// Handles the click event of .action-button
const actionButtonClick = () => {
  if (actionButton.innerText == "Überspringen") {
    score.skipped++;

    pushTemp();
    updateProgress();
  } else {
    resetQuiz();
  }

  if ((hadRandom.verbs.length + hadRandom.vocabulary.length + hadRandom.tempVerbs.length + hadRandom.tempVocabulary.length) * 100 / (getNumberOfKeys(verbs) + getNumberOfKeys(vocabulary)) < 100) randomQuiz();

  return true;
}

// Handles the click event of .action-settings-button
const actionSettingsButtonPressed = () => {
  const _svgs = document.querySelectorAll(".svg");
  const _invisibleIndex = _svgs[0].classList.contains("invisible") ? 1 : 0;

  document.querySelector(".action-settings-overlay").classList.toggle("active");

  _svgs.forEach((element) => {
    element.classList.remove("invisible");
  });

  _svgs[_invisibleIndex].classList.add("invisible");

  if (_invisibleIndex == 1) applyPreferences();
}

// Applies preferences
const applyPreferences = (passive) => {
  localStorage.setItem("preferences", JSON.stringify(preferences));

  _storedPreferences = JSON.parse(localStorage.getItem("preferences"));

  if (_storedPreferences) preferences = _storedPreferences;

  calculatePossibleQuestions();

  if (!passive) pullJSON();
}

// Handles the click event of .settings-toggle
const toggleSwitchPressed = (event) => {
  const _eventTarget = event.target;
  const _innerText = _eventTarget.innerText;
  const _preference = preferences[_eventTarget.dataset.category];
  const _preferenceIndex = _preference.indexOf(_innerText.toLowerCase());

  if (_preferenceIndex == -1) {
    _eventTarget.classList.add("active");
    _preference.push(_innerText.toString().toLowerCase());
  } else {
    _eventTarget.classList.remove("active");
    _preference.splice(_preferenceIndex, 1);
  }

  applyPreferences(true);
};

// Calculates the amount of possible questions // TODO: simplify, make more efficient
const calculatePossibleQuestions = () => {
  let _totalLessons = preferences.lessons;
  let _totalPossibleQuestions = 0;
  let _countedSuffixes = false;

  document.querySelectorAll(".settings-toggle").forEach((toggle) => {
    const _innerText = toggle.innerText;
    const _category = toggle.dataset.category;

    if (preferences[_category].indexOf(_innerText.toLowerCase()) != -1) {
      for (let lesson of _totalLessons) {
        if (_category == "vocabulary") {
          _totalPossibleQuestions += possibleQuestions[_category][lesson][_innerText.toLowerCase()];
        } else if (_category == "suffixes" && !_countedSuffixes) {
          _totalPossibleQuestions += possibleQuestions["verbs"][lesson];
          if (lesson == _totalLessons[_totalLessons.length - 1]) _countedSuffixes = true;
        }
      }      
    }
  });

  document.querySelector(".possible-questions").innerText = _totalPossibleQuestions;
}

// Initializes settings
const initializeSettings = () => {
  _storedPreferences = JSON.parse(localStorage.getItem("preferences"));

  if (_storedPreferences) preferences = _storedPreferences;

  document.querySelectorAll(".settings-toggle").forEach((element) => {
    if (preferences[element.dataset.category].indexOf(element.innerText.toLowerCase()) != -1) element.classList.add("active");
    if (!element.onclick) element.onclick = toggleSwitchPressed;
  });

  calculatePossibleQuestions();

  return true;
};

// Handles the click event of .overlay
const overlayClick = () => {
  pushTemp();
  randomQuiz();
}

// Entry point
window.onload = () => {
  buttons.forEach((element) => {
    element.addEventListener("click", (event) => {
      submit(event.target);
    });
  });

  overlay.addEventListener("click", overlayClick);
  actionButton.addEventListener("click", actionButtonClick);
  document.querySelector(".action-settings-button").addEventListener("click", actionSettingsButtonPressed);

  pullJSON(() => initializeSettings());
}

// Returns random number between min and max
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;

// Returns all the keys of an object
const getKeys = (object) => {
  if (object) return Object.keys(object);

  return [];
}

// Returns the amount of keys of an object
const getNumberOfKeys = (object) => {
  if (object) return getKeys(object).length;

  return 0;
}

// Returns random values to construct a verb
const getRandomKeys = () => {
  const _verbKeys = getKeys(verbs);
  const _verbRandom = getRandomInt(0, getNumberOfKeys(verbs));

  const _suffixKeys = getKeys(suffixes);
  const _suffixRandom = getRandomInt(0, getNumberOfKeys(suffixes));

  const _vocabularyKeys = getKeys(vocabulary);
  const _vocabularyRandom = getRandomInt(0, getNumberOfKeys(vocabulary));

  return {
    "verbKeys": _verbKeys,
    "verbRandom": _verbRandom,
    "suffixKeys": _suffixKeys,
    "suffixRandom": _suffixRandom,
    "vocabularyKeys": _vocabularyKeys,
    "vocabularyRandom": _vocabularyRandom
  };
}

// Checks if an item was already used
const checkRepetition = (category, callback) => {
  const _hadRandomOfCategory = hadRandom[category];
  let _object = callback();
  let _item = _object.item;

  while (_hadRandomOfCategory.includes(_item) || _item == correct) {
    _object = callback();
    _item = _object.item;
  }

  if (category == "verbs") {
    hadRandom.tempVerbs.push(_item);
  } else if (category == "vocabulary") {
    hadRandom.tempVocabulary.push(_item);
  } else {
    _hadRandomOfCategory.push(_item);
  }

  return _object;
}

// Returns random question verb
const getQuestionVerb = (redirect) => {
  if ((redirect && getNumberOfKeys(verbs) == 0) || (redirect && getNumberOfKeys(verbs) == hadRandom.verbs.length)) return false;
  if (getNumberOfKeys(verbs) == 0 || getNumberOfKeys(suffixes) == 0 || getNumberOfKeys(verbs) == hadRandom.verbs.length) return getQuestionVocabulary(true);

  _question = checkRepetition("verbs", () => {
    const _randomKeys = getRandomKeys();
    let _verbStem = _randomKeys.verbKeys[_randomKeys.verbRandom];
    let _verb = `${_verbStem}${_randomKeys.suffixKeys[_randomKeys.suffixRandom]}`;

    return {
      "item": _verbStem,
      "question": _verb,
      "translation": `${verbs[_verbStem]}\n(${suffixes[_randomKeys.suffixKeys[_randomKeys.suffixRandom]]})`
    };
  });

  return _question;
}

// Returns random question vocabulary
const getQuestionVocabulary = (redirect) => {
  if ((redirect && getNumberOfKeys(vocabulary) == 0) || (redirect && getNumberOfKeys(vocabulary) == hadRandom.vocabulary.length)) return false;
  if (getNumberOfKeys(vocabulary) == 0 || getNumberOfKeys(vocabulary) == hadRandom.vocabulary.length) return getQuestionVerb(true);

  _question = checkRepetition("vocabulary", () => {
    const _randomKeys = getRandomKeys();
    let _word = _randomKeys.vocabularyKeys[_randomKeys.vocabularyRandom];

    return {
      "item": _word,
      "question": _word,
      "translation": `${vocabulary[_word]}`
    };
  });

  return _question;
}

// Returns random question
const getRandomQuestion = () => {
  let _question;

  if (getRandomInt(0, 2) == 1) {
    _question = getQuestionVerb();
  } else {
    _question = getQuestionVocabulary();
  }

  if (!_question) return false;

  return {
    "question": _question.question,
    "translation": _question.translation
  };
}

// Returns random translation verb
const getTranslationVerb = (redirect) => {
  if (redirect && getNumberOfKeys(verbs) == 0) return false;
  if (getNumberOfKeys(verbs) == 0 || getNumberOfKeys(suffixes) == 0) return getTranslationVocabulary(true);

  const _randomKeys = getRandomKeys();
  let _translation;

  _translation = `${verbs[_randomKeys.verbKeys[_randomKeys.verbRandom]]}\n(${suffixes[_randomKeys.suffixKeys[_randomKeys.suffixRandom]]})`;

  return {
    "item": _translation
  };
}

// Returns random translation vocabulary
const getTranslationVocabulary = (redirect) => {
  if (redirect && getNumberOfKeys(vocabulary) == 0) return false;
  if (getNumberOfKeys(vocabulary) == 0) return getTranslationVerb(true);

  const _randomKeys = getRandomKeys();
  let _translation;

  _translation = `${vocabulary[_randomKeys.vocabularyKeys[_randomKeys.vocabularyRandom]]}`;

  return {
    "item": _translation
  };
}

// Returns random answer
const getRandomTranslation = () => {
  _translation = checkRepetition("translations", () => {
    let _item;

    if (getRandomInt(0, 2) == 1) {
      _item = getTranslationVerb();
    } else {
      _item = getTranslationVocabulary();
    }

    return _item;
  });

  return _translation;
}

// Enables / disabled all .guess-buttons
const toggleButtons = (disabled) => {
  buttons.forEach((element) => {
    element.disabled = disabled;
  });

  actionButton.innerText = "Neue Runde";

  return true;
}

// Checks wether the quiz is actually possible
const isQuizPossible = () => {
  if ((getNumberOfKeys(suffixes) >= 1 && getNumberOfKeys(verbs) >= 4) || getNumberOfKeys(vocabulary) >= 4) return true;

  buttons.forEach((element) => {
    element.innerText = "";
  });

  toggleButtons(true);
  document.querySelector(".verb").innerText = "Treffen Sie bitte eine Auswahl mit 4 oder mehr Fragen.";

  return false;
}

// Parses the given string for furigana and formats it accordingly
const parseFurigana = (string) => {
  if (!string.includes("^(")) return string;

  return `<ruby>${string.replaceAll("^(", "<rt>").replaceAll(")^", "</rt>")}</ruby>`
}

// Asks verb & translation
const randomQuiz = () => {
  clearButtons();

  if (!isQuizPossible()) return false;
  if (hadRandom.verbs.length + hadRandom.vocabulary == getNumberOfKeys(verbs) + getNumberOfKeys(vocabulary)) return showResults();

  const _randomTranslation = getRandomInt(0, 4);
  const _question = getRandomQuestion();

  if (!_question) return showResults();

  toggleButtons(false);

  correct = _question.translation;
  document.querySelector(".verb").innerHTML = parseFurigana(_question.question);
  actionButton.innerText = "Überspringen";
  hadRandom.translations = [];

  buttons.forEach((element, index) => {
    if (_randomTranslation == index) {
      element.innerText = _question.translation;

      return;
    }

    element.innerText = getRandomTranslation().item;
  });

  return true;
}

// Shows results
const showResults = () => {
  const _timesRight = score.right;
  const _timesSkipped = score.skipped;
  const _result = document.querySelector(".result");

  toggleButtons(true);
  overlay.style.display = "none";
  document.querySelector(".verb").style.display = "none";

  _result.style.display = "block";
  _result.innerText = `Sie haben ${_timesRight} von ${getNumberOfKeys(verbs) + getNumberOfKeys(vocabulary)} Fragen richtig beantwortet.\nEs wurde ${_timesSkipped == 0 ? "kein einziges" : _timesSkipped == getNumberOfKeys(verbs) + getNumberOfKeys(vocabulary) ? "jedes" : _timesSkipped} mal übersprungen.`;

  return true;
}

// temporary really bad fix for really dumb problem
window.onerror = () => {
  localStorage.clear()
  location.reload()
}

// TODO: Add features
//   - Timer (to be saved with localstorage -> highscores)
//   - override lessons -> prioritize theme
//   - toggle to ask every possibility of a verb (all verb forms)
