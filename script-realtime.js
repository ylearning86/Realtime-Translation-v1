// DOM Elements (will be initialized after DOM loads)
let startBtn, stopBtn, clearBtn, languagePair;
let userTranscript, gptResponse, conversationHistory;

// State
let ws = null;
let audioContext = null;
let mediaStream = null;
let processor = null;
let isRecording = false;
let responseLanguage = "ja"; // Default to Japanese (JP → EN)
let openaiReady = false; // Track if OpenAI connection is ready

// Initialize DOM elements after page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing elements...");
  
  startBtn = document.getElementById("startBtn");
  stopBtn = document.getElementById("stopBtn");
  clearBtn = document.getElementById("clearBtn");
  languagePair = document.getElementById("languagePair");
  userTranscript = document.getElementById("userTranscript");
  gptResponse = document.getElementById("gptResponse");
  conversationHistory = document.getElementById("conversationHistory");
  
  console.log("✓ DOM Elements initialized:");
  console.log("  gptResponse:", gptResponse);
  console.log("  userTranscript:", userTranscript);
  
  // Initialize after elements are ready
  initializeApp();
});

// Initialize application
function initializeApp() {
  console.log("✓ Initializing application...");
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize UI
  updateUI();
  
  // Connect to WebSocket
  connectWebSocket().catch(error => {
    console.error("Connection error:", error);
  });
}

// WebSocket connection with improved error handling
const connectWebSocket = () => {
  return new Promise((resolve, reject) => {
    // Determine WebSocket URL
    let wsUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Local development
      wsUrl = 'ws://localhost:3001/api/realtime';
    } else {
      // Production - determine protocol based on current page protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/api/realtime`;
    }
    console.log("Attempting to connect to", wsUrl);
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✓ Connected to Realtime server");
      resolve();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    ws.onerror = (error) => {
      console.error("✗ WebSocket error:", error);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = () => {
      console.log("Disconnected from server");
      isRecording = false;
      updateUI();
    };
  });
};

// Handle incoming WebSocket messages
const handleWebSocketMessage = (message) => {
  console.log("Received message type:", message.type);
  
  if (message.type === "ready") {
    console.log("✓ OpenAI connection ready, can start recording");
    openaiReady = true;
  } else if (message.type === "transcript") {
    console.log("✓ Transcript received (isPartial:", message.isPartial + "):", message.text);
    
    // Skip empty transcripts
    if (!message.text || message.text.trim() === "") {
      console.log("⚠ Skipping empty transcript");
      return;
    }
    
    // Remove placeholder if exists
    const placeholder = userTranscript.querySelector(".placeholder");
    if (placeholder) {
      placeholder.remove();
    }
    
    if (message.isPartial) {
      // Partial/realtime transcript - update temporary span
      let tempSpan = userTranscript.querySelector(".temp-transcript");
      if (!tempSpan) {
        tempSpan = document.createElement("div");
        tempSpan.className = "temp-transcript";
        
        // Insert at the top (after placeholder if exists)
        const placeholder = userTranscript.querySelector(".placeholder");
        if (placeholder) {
          userTranscript.insertBefore(tempSpan, placeholder.nextSibling);
        } else if (userTranscript.firstChild) {
          userTranscript.insertBefore(tempSpan, userTranscript.firstChild);
        } else {
          userTranscript.appendChild(tempSpan);
        }
      }
      tempSpan.textContent = message.text;
      tempSpan.style.opacity = "0.7";
      
      // Auto-scroll to top to show realtime input
      userTranscript.scrollTop = 0;
    } else {
      // Final transcript - remove temp and add to history
      const tempSpan = userTranscript.querySelector(".temp-transcript");
      if (tempSpan) {
        tempSpan.remove();
      }
      
      // Add to conversation history (newest at top)
      const entry = document.createElement("div");
      entry.className = "transcript-entry";
      entry.textContent = message.text;
      
      // Insert at the beginning (after placeholder if exists)
      const placeholder = userTranscript.querySelector(".placeholder");
      if (placeholder) {
        userTranscript.insertBefore(entry, placeholder.nextSibling);
      } else if (userTranscript.firstChild) {
        userTranscript.insertBefore(entry, userTranscript.firstChild);
      } else {
        userTranscript.appendChild(entry);
      }
      
      // Auto-scroll to top to show latest
      userTranscript.scrollTop = 0;
    }
    
    // Only translate complete transcripts
    if (!message.isPartial) {
      // Translate the recognized speech
      if (responseLanguage === "ja") {
        // User spoke Japanese, translate to English
        console.log("Translating Japanese to English...");
        translateText(message.text, "ja", "en");
      } else if (responseLanguage === "en") {
        // User spoke English, translate to Japanese
        console.log("Translating English to Japanese...");
        translateText(message.text, "en", "ja");
      }
    }
  } else if (message.type === "error") {
    console.error("Error from server:", message.message);
    alert("Error: " + message.message);
  }
};

// Translate recognized speech
const translateText = (text, sourceLang, targetLang) => {
  if (!text.trim()) return;

  const langMap = { ja: "JA", en: "EN" };
  const from = langMap[sourceLang];
  const to = langMap[targetLang];

  console.log(`Translating from ${from} to ${to}:`, text);

  // Determine API URL based on environment
  let apiUrl;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Local development
    apiUrl = 'http://localhost:3001/api/translate';
  } else {
    // Production - use same host
    apiUrl = `${window.location.protocol}//${window.location.host}/api/translate`;
  }
  
  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: [text],
      source_lang: from,
      target_lang: to,
      subscription_key: apiKey.value || "YOUR_TRANSLATOR_KEY_HERE",
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      const translated = data?.translations?.[0]?.text || "";
      console.log("✓ Translation result:", translated);
      
      // Remove placeholder if exists
      const placeholder = gptResponse.querySelector(".placeholder");
      if (placeholder) {
        placeholder.remove();
      }
      
      // Add to conversation history (newest at top)
      const entry = document.createElement("div");
      entry.className = "translation-entry";
      entry.textContent = translated;
      
      // Insert at the beginning
      if (gptResponse.firstChild) {
        gptResponse.insertBefore(entry, gptResponse.firstChild);
      } else {
        gptResponse.appendChild(entry);
      }
      
      // Auto-scroll to top to show latest
      gptResponse.scrollTop = 0;
    })
    .catch((error) => {
      console.error("Translation error:", error);
      
      // Remove placeholder if exists
      const placeholder = gptResponse.querySelector(".placeholder");
      if (placeholder) {
        placeholder.remove();
      }
      
      // Add error message to history (newest at top)
      const entry = document.createElement("div");
      entry.className = "translation-entry error";
      entry.textContent = "[Translation failed]";
      
      if (gptResponse.firstChild) {
        gptResponse.insertBefore(entry, gptResponse.firstChild);
      } else {
        gptResponse.appendChild(entry);
      }
    });
};

// Initialize audio capture
const initAudio = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Create AudioContext with 16kHz sample rate (required by Speech SDK)
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    
    console.log(`AudioContext sample rate: ${audioContext.sampleRate} Hz`);

    // Create audio processor
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Create ScriptProcessor for audio chunks
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      if (!isRecording) return;

      // Get audio data
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Convert to PCM16
      const pcm16 = convertToPCM16(inputData);
      
      // Convert to base64 for transmission
      const pcm16Array = new Uint8Array(pcm16);
      let binaryString = '';
      for (let i = 0; i < pcm16Array.length; i++) {
        binaryString += String.fromCharCode(pcm16Array[i]);
      }
      const audioBase64 = btoa(binaryString);
      
      // Send to WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "audio",
          audio: audioBase64,
        }));
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    console.log("Audio initialized");
  } catch (error) {
    console.error("Audio initialization error:", error);
    alert("Cannot access microphone. Please check permissions.");
  }
};

// Convert Float32 to PCM16 (mono, 16kHz)
const convertToPCM16 = (float32Array) => {
  const pcm16Array = new Int16Array(float32Array.length);
  
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to -1 to 1 range
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit PCM
    pcm16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  
  return pcm16Array.buffer;
};

// Start recording
const startRecording = async () => {
  try {
    if (!audioContext) {
      await initAudio();
    }

    isRecording = true;
    openaiReady = false; // Reset ready flag
    userTranscript.textContent = "";
    gptResponse.textContent = "";

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Send start signal with selected language to initialize OpenAI connection
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log(`Sending start signal with language: ${responseLanguage}`);
      ws.send(JSON.stringify({ 
        type: "start",
        language: responseLanguage 
      }));
      console.log("Waiting for OpenAI connection...");
    }

    updateUI();
    console.log("✓ Recording started");
  } catch (error) {
    console.error("Start recording error:", error);
  }
};

// Stop recording
const stopRecording = () => {
  console.log("Stop button clicked, isRecording:", isRecording);
  console.log("  ws exists:", !!ws);
  console.log("  ws.readyState:", ws?.readyState);
  console.log("  WebSocket.OPEN:", WebSocket.OPEN);
  
  isRecording = false;

  // Commit audio buffer for transcription
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("Committing audio for transcription");
    ws.send(JSON.stringify({ type: "commit" }));
    console.log("✓ Audio committed, waiting for transcript...");
  } else {
    console.error("WebSocket not open, cannot commit audio");
    console.error("  ws:", ws);
    console.error("  readyState:", ws?.readyState);
  }

  updateUI();
  console.log("✓ Recording stopped");
};

// Clear history
const clearHistory = () => {
  userTranscript.innerHTML = '<span class="placeholder">Your speech will appear here...</span>';
  gptResponse.innerHTML = '<span class="placeholder">Translation will appear here...</span>';
};

// Update UI state
const updateUI = () => {
  const statusIndicator = document.getElementById("statusIndicator");
  const liveBadge = document.getElementById("liveBadge");
  
  startBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
  
  if (isRecording) {
    statusIndicator.classList.add("recording");
    statusIndicator.querySelector(".status-text").textContent = "Recording...";
    liveBadge.classList.add("active");
  } else {
    statusIndicator.classList.remove("recording");
    statusIndicator.querySelector(".status-text").textContent = "Ready";
    liveBadge.classList.remove("active");
  }
};

// Event listeners setup (called after DOM loads)
function setupEventListeners() {
  startBtn.addEventListener("click", async () => {
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        await connectWebSocket();
      }
      await startRecording();
    } catch (error) {
      console.error("Start error:", error);
      alert("Failed to start conversation");
    }
  });

  stopBtn.addEventListener("click", stopRecording);
  clearBtn.addEventListener("click", clearHistory);

  // Language buttons
  const langButtons = document.querySelectorAll(".lang-btn");
  langButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      langButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      responseLanguage = btn.dataset.lang;
      console.log(`Language switched to: ${responseLanguage}`);
    });
  });

  // Legacy support for languagePair select (if exists)
  if (languagePair && languagePair.tagName === "SELECT") {
    languagePair.addEventListener("change", (e) => {
      responseLanguage = e.target.value;
    });
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (ws) {
    ws.close();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
});

