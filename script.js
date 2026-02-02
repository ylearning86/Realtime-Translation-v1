// DOM Elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const languagePair = document.getElementById("languagePair");
const apiKey = document.getElementById("apiKey");

// バックエンドURL設定
// 開発環境: http://localhost:3001
// 本番環境（Render/Railway等）: https://your-backend-url.com
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://your-production-backend-url.com';

const liveEnglish = document.getElementById("liveEnglish");
const liveJapanese = document.getElementById("liveJapanese");
const finalEnglish = document.getElementById("finalEnglish");
const finalJapanese = document.getElementById("finalJapanese");
const historyEnglish = document.getElementById("historyEnglish");
const historyJapanese = document.getElementById("historyJapanese");

const sourceLangName = document.getElementById("sourceLangName");
const targetLangName = document.getElementById("targetLangName");
const finalSourceLangName = document.getElementById("finalSourceLangName");
const finalTargetLangName = document.getElementById("finalTargetLangName");
const historySourceLangName = document.getElementById("historySourceLangName");
const historyTargetLangName = document.getElementById("historyTargetLangName");

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let translateTimer = null;
let translationQueue = Promise.resolve();

// Language State
let sourceLanguage = "en"; // en or ja
let targetLanguage = "ja"; // ja or en

// Settings
const MIN_TEXT_LENGTH = 1;
const CONFIDENCE_THRESHOLD = 0.1;
const HISTORY_LIMIT = 6;

const getLanguageName = (code) => {
  const names = { en: "English", ja: "日本語" };
  return names[code] || code.toUpperCase();
};

const setupRecognition = () => {
  if (!SpeechRecognition) {
    alert("Speech Recognition API not supported in this browser");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = sourceLanguage === "en" ? "en-US" : "ja-JP";

  recognition.onstart = () => {
    isListening = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
  };

  recognition.onend = () => {
    isListening = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  recognition.onresult = (event) => {
    let transcript = "";
    let isFinal = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptSegment = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence;
      transcript += transcriptSegment;

      if (event.results[i].isFinal) {
        isFinal = true;
      }
    }

    if (transcript.trim()) {
      handleResult(transcript, isFinal);
    }
  };
};

const handleResult = (transcript, isFinal) => {
  if (isFinal) {
    finalEnglish.textContent = sourceLanguage === "en" ? transcript : "";
    finalJapanese.textContent = sourceLanguage === "ja" ? transcript : "";
    queueFinalTranslation(transcript);
  } else {
    liveEnglish.textContent = sourceLanguage === "en" ? transcript : "";
    liveJapanese.textContent = sourceLanguage === "ja" ? transcript : "";
    scheduleLiveTranslation(transcript);
  }
};

const translateText = (text, fromLang, toLang) => {
  const key = apiKey.value.trim();
  if (!key) {
    console.error("API key not set");
    return Promise.resolve("");
  }

  return fetch(`${BACKEND_URL}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: [text],
      source_lang: fromLang === "en" ? "EN" : "JA",
      target_lang: toLang === "ja" ? "JA" : "EN",
      subscription_key: key,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      const translatedText = data?.translations?.[0]?.text || "";
      return translatedText;
    })
    .catch((error) => {
      console.error("Translation error:", error);
      return "";
    });
};

const scheduleLiveTranslation = (transcript) => {
  clearTimeout(translateTimer);
  translateTimer = setTimeout(() => {
    translateText(transcript, sourceLanguage, targetLanguage)
      .then((translated) => {
        if (sourceLanguage === "en") {
          liveJapanese.textContent = translated;
        } else {
          liveEnglish.textContent = translated;
        }
      });
  }, 350);
};

const queueFinalTranslation = (transcript) => {
  translationQueue = translationQueue.then(() => {
    return translateText(transcript, sourceLanguage, targetLanguage).then((translated) => {
      if (transcript.trim().length < MIN_TEXT_LENGTH) return;

      // Add to history
      const historyItem = document.createElement("li");
      historyItem.textContent = transcript;

      if (sourceLanguage === "en") {
        historyEnglish.appendChild(historyItem);
        finalEnglish.textContent = transcript;

        if (translated) {
          const translationItem = document.createElement("li");
          translationItem.textContent = translated;
          historyJapanese.appendChild(translationItem);
          finalJapanese.textContent = translated;
        }
      } else {
        historyJapanese.appendChild(historyItem);
        finalJapanese.textContent = transcript;

        if (translated) {
          const translationItem = document.createElement("li");
          translationItem.textContent = translated;
          historyEnglish.appendChild(translationItem);
          finalEnglish.textContent = translated;
        }
      }

      // Limit history
      while (historyEnglish.children.length > HISTORY_LIMIT) {
        historyEnglish.removeChild(historyEnglish.firstChild);
      }
      while (historyJapanese.children.length > HISTORY_LIMIT) {
        historyJapanese.removeChild(historyJapanese.firstChild);
      }
    });
  });
};

const updateLanguagePair = () => {
  const pair = languagePair.value;
  if (pair === "en-ja") {
    sourceLanguage = "en";
    targetLanguage = "ja";
  } else {
    sourceLanguage = "ja";
    targetLanguage = "en";
  }

  // Update language display
  sourceLangName.textContent = getLanguageName(sourceLanguage);
  targetLangName.textContent = getLanguageName(targetLanguage);
  finalSourceLangName.textContent = getLanguageName(sourceLanguage);
  finalTargetLangName.textContent = getLanguageName(targetLanguage);
  historySourceLangName.textContent = getLanguageName(sourceLanguage);
  historyTargetLangName.textContent = getLanguageName(targetLanguage);

  // Update recognition language
  if (recognition) {
    recognition.lang = sourceLanguage === "en" ? "en-US" : "ja-JP";
  }
};

const clearHistory = () => {
  historyEnglish.innerHTML = "";
  historyJapanese.innerHTML = "";
  liveEnglish.textContent = "";
  liveJapanese.textContent = "";
  finalEnglish.textContent = "";
  finalJapanese.textContent = "";
};

// Event Listeners
startBtn.addEventListener("click", () => {
  if (recognition) {
    recognition.start();
  }
});

stopBtn.addEventListener("click", () => {
  if (recognition) {
    recognition.stop();
  }
});

clearBtn.addEventListener("click", clearHistory);

languagePair.addEventListener("change", updateLanguagePair);

// Initialize
setupRecognition();
updateLanguagePair();
