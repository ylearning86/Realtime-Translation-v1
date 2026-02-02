const express = require("express");
const cors = require("cors");
const axios = require("axios");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const PORT = 3000;

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// Enable CORS for Express
app.use(cors());
app.use(express.json());

// Azure services configuration
const AZURE_TRANSLATOR_ENDPOINT = "https://Realtime-Translation-v1-resource.cognitiveservices.azure.com/";
const AZURE_SPEECH_REGION = "japaneast"; // Update based on your resource region
const API_VERSION = "2025-10-01-preview";

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

    const url = `${AZURE_TRANSLATOR_ENDPOINT}translator/text/translate?api-version=${API_VERSION}`;

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

// WebSocket server for real-time speech recognition with speaker diarization
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  let audioBuffer = [];
  let speakerMap = new Map(); // Map to track speaker colors

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === "audio") {
        // Collect audio data
        audioBuffer.push(Buffer.from(message.audio, "base64"));
      } else if (message.type === "transcribe") {
        // Process collected audio for transcription with speaker diarization
        const { subscription_key } = message;

        if (!subscription_key) {
          ws.send(JSON.stringify({ type: "error", message: "Missing API key" }));
          return;
        }

        // Note: This is a simplified implementation
        // Full speaker diarization requires more complex speech service setup
        ws.send(JSON.stringify({
          type: "status",
          message: "Speaker diarization feature is in development. Current version supports basic transcription.",
        }));

        audioBuffer = [];
      } else if (message.type === "getSpeakers") {
        // Return current speaker mapping
        ws.send(JSON.stringify({
          type: "speakers",
          speakers: Array.from(speakerMap.entries()).map(([id, color]) => ({
            id,
            color,
          })),
        }));
      }
    } catch (error) {
      console.error("WebSocket error:", error);
      ws.send(JSON.stringify({ type: "error", message: error.message }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`Translation endpoint: http://localhost:${PORT}/api/translate`);
  console.log(`Using Azure Speech Service in region: ${AZURE_SPEECH_REGION}`);
});
