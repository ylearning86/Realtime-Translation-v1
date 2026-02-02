const express = require("express");
const cors = require("cors");
const axios = require("axios");
const WebSocket = require("ws");
const http = require("http");
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/api/realtime" });
const PORT = 3002;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Azure configurations - Load from environment variables
const AZURE_TRANSLATOR_ENDPOINT = process.env.AZURE_TRANSLATOR_ENDPOINT || "https://Realtime-Translation-v1-resource.cognitiveservices.azure.com/";
const TRANSLATOR_API_VERSION = "2025-10-01-preview";
const TRANSLATOR_KEY = process.env.TRANSLATOR_KEY || "YOUR_TRANSLATOR_KEY_HERE";

const SPEECH_KEY = process.env.SPEECH_KEY || "YOUR_SPEECH_KEY_HERE";
const SPEECH_REGION = process.env.SPEECH_REGION || 'japaneast';

// Startup configuration check
if (SPEECH_KEY === "YOUR_SPEECH_KEY_HERE") {
  console.warn("⚠️  WARNING: SPEECH_KEY is not configured. Set SPEECH_KEY environment variable.");
}
if (SPEECH_REGION === "japaneast") {
  console.log("ℹ️  Using default SPEECH_REGION: japaneast");
}

// Azure Translator proxy endpoint
app.post("/api/translate", async (req, res) => {
  try {
    const { text, source_lang, target_lang, subscription_key } = req.body;

    if (!subscription_key) {
      return res.status(400).json({
        error: "Missing API key",
        details: "subscription_key is required",
      });
    }

    if (!text || !Array.isArray(text) || text.length === 0 || !text[0]?.trim()) {
      return res.status(400).json({
        error: "Invalid request",
        details: "text array is required",
      });
    }

    // Build Azure Translator request
    const requestBody = {
      inputs: [
        {
          Text: text[0],
          language: source_lang?.toLowerCase() || "en",
          targets: [{ language: target_lang?.toLowerCase() || "ja" }],
        },
      ],
    };

    const headers = {
      "Ocp-Apim-Subscription-Key": subscription_key,
      "Authorization": subscription_key,
      "Content-Type": "application/json",
    };

    const url = `${AZURE_TRANSLATOR_ENDPOINT}translator/text/translate?api-version=${TRANSLATOR_API_VERSION}`;

    // Forward request to Azure Translator API
    const response = await axios.post(url, requestBody, { headers });
    
    // Extract translated text from Azure response
    const translatedText = response.data?.value?.[0]?.translations?.[0]?.text || "";
    
    // Return in compatible format
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
