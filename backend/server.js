require('dotenv').config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const WebSocket = require("ws");
const http = require("http");
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/api/realtime" });
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Load configurations from environment variables
console.log("🔍 Loading environment variables...");
console.log("   SPEECH_KEY exists:", !!process.env.SPEECH_KEY);
console.log("   SPEECH_REGION:", process.env.SPEECH_REGION);
console.log("   AZURE_TRANSLATOR_KEY exists:", !!process.env.AZURE_TRANSLATOR_KEY || !!process.env.TRANSLATOR_KEY);
console.log("   AZURE_TRANSLATOR_ENDPOINT:", process.env.AZURE_TRANSLATOR_ENDPOINT);
console.log("   AZURE_TRANSLATOR_API_VERSION:", process.env.AZURE_TRANSLATOR_API_VERSION);
console.log("   AZURE_FOUNDRY_PROJECT_ENDPOINT:", process.env.AZURE_FOUNDRY_PROJECT_ENDPOINT || process.env.AZURE_EXISTING_AIPROJECT_ENDPOINT);
console.log("   AZURE_LOCATION:", process.env.AZURE_LOCATION);

// Azure Speech Services configuration
const SPEECH_KEY = process.env.SPEECH_KEY || "YOUR_SPEECH_KEY_HERE";
const SPEECH_REGION = process.env.SPEECH_REGION || 'japaneast';

// Azure Translator (Foundry) configuration
const AZURE_TRANSLATOR_ENDPOINT = process.env.AZURE_TRANSLATOR_ENDPOINT || "https://api.cognitive.microsofttranslator.com";
const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY || process.env.TRANSLATOR_KEY || "YOUR_TRANSLATOR_KEY_HERE";
const AZURE_TRANSLATOR_REGION = process.env.AZURE_LOCATION || process.env.AZURE_TRANSLATOR_REGION || "";
const AZURE_TRANSLATOR_API_VERSION = process.env.AZURE_TRANSLATOR_API_VERSION || "3.0";
const AZURE_FOUNDRY_PROJECT_ENDPOINT = process.env.AZURE_FOUNDRY_PROJECT_ENDPOINT || process.env.AZURE_EXISTING_AIPROJECT_ENDPOINT || "";
const AZURE_FOUNDRY_PROJECT_KEY = process.env.AZURE_FOUNDRY_PROJECT_KEY || process.env.AZURE_PROJECT_API_KEY || "";
const USE_FOUNDRY_PROJECT_ENDPOINT = process.env.AZURE_TRANSLATOR_USE_PROJECT_ENDPOINT === "true";
const USE_FOUNDRY_PREVIEW =
  process.env.AZURE_TRANSLATOR_USE_PREVIEW === "true" ||
  AZURE_TRANSLATOR_API_VERSION.startsWith("2025-");

const ACTIVE_TRANSLATOR_ENDPOINT =
  USE_FOUNDRY_PROJECT_ENDPOINT && AZURE_FOUNDRY_PROJECT_ENDPOINT
    ? AZURE_FOUNDRY_PROJECT_ENDPOINT
    : AZURE_TRANSLATOR_ENDPOINT;
const ACTIVE_TRANSLATOR_KEY =
  USE_FOUNDRY_PROJECT_ENDPOINT && AZURE_FOUNDRY_PROJECT_KEY
    ? AZURE_FOUNDRY_PROJECT_KEY
    : AZURE_TRANSLATOR_KEY;

// Startup configuration check
if (SPEECH_KEY === "YOUR_SPEECH_KEY_HERE") {
  console.warn("⚠️  WARNING: SPEECH_KEY is not configured. Set SPEECH_KEY environment variable.");
}
if (SPEECH_REGION === "japaneast") {
  console.log("ℹ️  Using default SPEECH_REGION: japaneast");
}
if (!AZURE_FOUNDRY_PROJECT_KEY && AZURE_TRANSLATOR_KEY === "YOUR_TRANSLATOR_KEY_HERE") {
  console.warn("⚠️  WARNING: Translator key is not configured. Set AZURE_TRANSLATOR_KEY or AZURE_FOUNDRY_PROJECT_KEY.");
}
if (!AZURE_TRANSLATOR_REGION) {
  console.log("ℹ️  AZURE_LOCATION is not set. Ocp-Apim-Subscription-Region header will be omitted.");
}
if (AZURE_FOUNDRY_PROJECT_ENDPOINT && !USE_FOUNDRY_PROJECT_ENDPOINT) {
  console.log("ℹ️  Foundry project endpoint is set but not used. Using AZURE_TRANSLATOR_ENDPOINT instead.");
}
console.log("ℹ️  Translator endpoint in use:", ACTIVE_TRANSLATOR_ENDPOINT);

// Azure Translator proxy endpoint (Foundry)
app.post("/api/translate", async (req, res) => {
  try {
    const { text, source_lang, target_lang } = req.body;

    if (!text || !Array.isArray(text) || text.length === 0 || !text[0]?.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        details: "text array is required",
      });
    }

    const sourceLanguage = (source_lang || "en").toLowerCase();
    const targetLanguage = (target_lang || "ja").toLowerCase();
    const normalizedEndpoint = ACTIVE_TRANSLATOR_ENDPOINT.replace(/\/$/, "");

    const headers = {
      "Ocp-Apim-Subscription-Key": ACTIVE_TRANSLATOR_KEY,
      "Content-Type": "application/json",
    };
    if (AZURE_TRANSLATOR_REGION) {
      headers["Ocp-Apim-Subscription-Region"] = AZURE_TRANSLATOR_REGION;
    }

    let url = "";
    let requestBody;

    // Check if using custom endpoint (cognitiveservices.azure.com)
    const isCustomEndpoint = normalizedEndpoint.includes("cognitiveservices.azure.com");

    if (USE_FOUNDRY_PREVIEW) {
      url = `${normalizedEndpoint}/translator/text/translate?api-version=${AZURE_TRANSLATOR_API_VERSION}`;
      requestBody = {
        inputs: [
          {
            Text: text[0],
            language: sourceLanguage,
            targets: [{ language: targetLanguage }],
          },
        ],
      };
    } else {
      // For custom endpoints, use /translator/text/v3.0/translate
      // For global endpoint, use /translate
      if (isCustomEndpoint) {
        url = `${normalizedEndpoint}/translator/text/v3.0/translate?from=${sourceLanguage}&to=${targetLanguage}`;
      } else {
        url = `${normalizedEndpoint}/translate?api-version=${AZURE_TRANSLATOR_API_VERSION}&from=${sourceLanguage}&to=${targetLanguage}`;
      }
      requestBody = [{ Text: text[0] }];
    }

    console.log("🔄 Azure Translator request:", {
      url,
      apiVersion: AZURE_TRANSLATOR_API_VERSION,
      preview: USE_FOUNDRY_PREVIEW,
      endpoint: ACTIVE_TRANSLATOR_ENDPOINT,
      hasKey: ACTIVE_TRANSLATOR_KEY && ACTIVE_TRANSLATOR_KEY !== "YOUR_TRANSLATOR_KEY_HERE",
      keyPrefix: ACTIVE_TRANSLATOR_KEY ? ACTIVE_TRANSLATOR_KEY.substring(0, 8) + "..." : "none",
      hasRegion: !!AZURE_TRANSLATOR_REGION,
      region: AZURE_TRANSLATOR_REGION,
      headers: Object.keys(headers),
      text: text[0],
    });

    console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));

    const response = await axios.post(url, requestBody, { headers });

    const translatedText =
      response.data?.[0]?.translations?.[0]?.text ||
      response.data?.value?.[0]?.translations?.[0]?.text ||
      "";

    console.log("✓ Translation successful:", translatedText);

    res.json({
      translations: [
        {
          text: translatedText,
        },
      ],
    });
  } catch (error) {
    console.error("Translation error:", error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Translation failed",
      details: error.response?.data || error.message,
    });
  }
});

// WebSocket setup with Speech Services
wss.on("connection", (ws) => {
  console.log("✓ WebSocket client connected");
  console.log(`Total connections: ${wss.clients.size}`);
  
  // Send configuration to client
  ws.send(JSON.stringify({
    type: "config",
    translatorConfigured: AZURE_TRANSLATOR_KEY !== "YOUR_TRANSLATOR_KEY_HERE",
    translationService: "Azure Translator",
  }));
  
  let pushStream = null;
  let recognizer = null;
  let preferredLanguage = "en";

  const startSpeechRecognition = (language = "en") => {
    try {
      preferredLanguage = language;
      
      console.log(`🎤 Starting speech recognition for ${language}...`);
      
      // Create push audio input stream
      const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
      console.log(`📊 Audio format: 16000 Hz, 16-bit, mono`);
      
      pushStream = sdk.AudioInputStream.createPushStream(format);
      console.log(`✓ Push stream created`);
      
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
      
      const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
      console.log(`✓ Speech config created for region: ${SPEECH_REGION}`);
      
      // Set language
      if (language === 'ja') {
        speechConfig.speechRecognitionLanguage = 'ja-JP';
        console.log("✓ Language set to Japanese");
      } else {
        speechConfig.speechRecognitionLanguage = 'en-US';
        console.log("✓ Language set to English");
      }
      
      // Enable detailed recognition results for real-time feedback
      speechConfig.outputFormat = sdk.OutputFormat.Detailed;
      
      recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      // Handle recognizing (partial results - real-time)
      recognizer.recognizing = (s, e) => {
        console.log(`🔄 Recognizing event fired, reason: ${e.result.reason}`);
        if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
          console.log(`🔄 Recognizing (realtime): ${e.result.text}`);
          ws.send(JSON.stringify({
            type: "transcript",
            text: e.result.text,
            isPartial: true,
          }));
        }
      };
      
      // Handle recognized (final result)
      recognizer.recognized = (s, e) => {
        console.log(`📊 Recognized event fired, reason: ${e.result.reason}`);
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          console.log(`✓ Final transcript: "${e.result.text}"`);
          ws.send(JSON.stringify({
            type: "transcript",
            text: e.result.text,
            isPartial: false,
          }));
        } else if (e.result.reason === sdk.ResultReason.NoMatch) {
          console.log('❌ No speech could be recognized.');
          console.log('   NoMatch details:', e.result.noMatchDetails);
          ws.send(JSON.stringify({
            type: "error",
            message: "No speech detected",
          }));
        } else if (e.result.reason === sdk.ResultReason.Canceled) {
          const cancellation = sdk.CancellationDetails.fromResult(e.result);
          console.error(`❌ Error: ${cancellation.reason}`);
          console.error(`   Error details: ${cancellation.errorDetails}`);
          ws.send(JSON.stringify({
            type: "error",
            message: cancellation.errorDetails,
          }));
        }
      };
      
      // Handle errors
      recognizer.canceled = (s, e) => {
        console.error(`❌ Recognizer canceled: ${e.errorDetails}`);
        ws.send(JSON.stringify({
          type: "error",
          message: e.errorDetails,
        }));
      };
      
      recognizer.sessionStarted = (s, e) => {
        console.log('✓ Speech recognition session started');
        ws.send(JSON.stringify({
          type: "ready",
        }));
      };
      
      recognizer.sessionStopped = (s, e) => {
        console.log('✓ Speech recognition session stopped');
      };
      
      // Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("✓ Continuous speech recognition started");
        },
        (err) => {
          console.error("Error starting continuous recognition:", err);
          ws.send(JSON.stringify({
            type: "error",
            message: err,
          }));
        }
      );
      
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      ws.send(JSON.stringify({
        type: "error",
        message: "Failed to start speech recognition: " + error.message,
      }));
    }
  };

  // Handle messages from client
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      console.log("Client message type:", message.type);

      if (message.type === "start") {
        const language = message.language || "en";
        startSpeechRecognition(language);
      } else if (message.type === "audio" && pushStream) {
        // Audio data is Base64 encoded PCM16
        try {
          const audioBuffer = Buffer.from(message.audio, 'base64');
          console.log(`📝 Received audio chunk: ${audioBuffer.length} bytes`);
          
          // Debug: Log first few bytes to verify PCM16 format
          if (audioBuffer.length > 0) {
            const firstBytes = audioBuffer.slice(0, 8);
            console.log(`   First 8 bytes: ${firstBytes.toString('hex')}`);
          }
          
          pushStream.write(audioBuffer);
        } catch (err) {
          console.error("Error decoding audio:", err);
        }
      } else if (message.type === "commit" && recognizer) {
        console.log("✓ Stopping recognition (commit)");
        // Close the push stream to signal end of audio
        if (pushStream) {
          console.log("📝 Closing audio stream...");
          pushStream.close();
          pushStream = null;
        }
        recognizer.stopContinuousRecognitionAsync(
          () => {
            console.log("✓ Recognition stopped");
          },
          (err) => {
            console.error("Error stopping recognition:", err);
          }
        );
      } else {
        console.warn("⚠ Ignored message type:", message.type);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  });

  // Handle client disconnect
  ws.on("close", () => {
    console.log("✗ Client disconnected");
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync();
    }
    if (pushStream) {
      pushStream.close();
    }
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
    console.error("   Check if SPEECH_KEY and SPEECH_REGION are set correctly");
  });
});

// Start server
server.listen(PORT, () => {
  console.log("\n✓ Realtime API server running");
  console.log(`  REST API: http://localhost:${PORT}/api/translate`);
  console.log(`  WebSocket: ws://localhost:${PORT}/api/realtime`);
  console.log(`  Using Azure Speech Services + Azure Translator\n`);
});
