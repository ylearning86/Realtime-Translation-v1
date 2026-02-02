require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

const app = express();

// Enable CORS for Static Web Apps
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false
}));
app.use(express.json());

// Load configurations
const SPEECH_KEY = process.env.SPEECH_KEY || 'YOUR_SPEECH_KEY_HERE';
const SPEECH_REGION = process.env.SPEECH_REGION || 'japaneast';
const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY || 'YOUR_TRANSLATOR_KEY_HERE';
const AZURE_TRANSLATOR_REGION = process.env.AZURE_LOCATION || 'swedencentral';

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, source_lang, target_lang } = req.body;

    if (!text || !Array.isArray(text) || text.length === 0 || !text[0]?.trim()) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'text array is required',
      });
    }

    const sourceLanguage = (source_lang || 'en').toLowerCase();
    const targetLanguage = (target_lang || 'ja').toLowerCase();

    const headers = {
      'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
      'Content-Type': 'application/json',
    };

    const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`;
    const requestBody = [{ Text: text[0] }];

    const response = await axios.post(url, requestBody, { headers });
    const translatedText = response.data?.[0]?.translations?.[0]?.text || '';

    res.json({
      translations: [{ text: translatedText }],
    });
  } catch (error) {
    console.error('Translation error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Translation failed',
      details: error.response?.data || error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
