const sdk = require('microsoft-cognitiveservices-speech-sdk');

// Speech Services configuration - Load from environment variables
const SPEECH_KEY = process.env.SPEECH_KEY || "YOUR_SPEECH_KEY_HERE";
const SPEECH_REGION = process.env.SPEECH_REGION || 'eastus'; // Extract from endpoint URL

// Create speech recognizer for continuous recognition
function createSpeechRecognizer(language, onRecognizing, onRecognized, onError) {
  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
  
  const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
  
  // Set language
  if (language === 'ja') {
    speechConfig.speechRecognitionLanguage = 'ja-JP';
  } else {
    speechConfig.speechRecognitionLanguage = 'en-US';
  }
  
  // Enable detailed recognition results
  speechConfig.outputFormat = sdk.OutputFormat.Detailed;
  
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  
  // Handle recognizing (partial results - real-time)
  recognizer.recognizing = (s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
      console.log(`🔄 Recognizing (realtime): ${e.result.text}`);
      onRecognizing(e.result.text);
    }
  };
  
  // Handle recognized (final result)
  recognizer.recognized = (s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
      console.log(`✓ Final transcript: ${e.result.text}`);
      onRecognized(e.result.text);
    } else if (e.result.reason === sdk.ResultReason.NoMatch) {
      console.log('❌ No speech could be recognized.');
      onError('No speech detected');
    } else if (e.result.reason === sdk.ResultReason.Canceled) {
      const cancellation = sdk.CancellationDetails.fromResult(e.result);
      console.error(`❌ Error: ${cancellation.reason}`);
      onError(cancellation.errorDetails);
    }
  };
  
  // Handle errors
  recognizer.canceled = (s, e) => {
    console.error(`❌ Recognizer canceled: ${e.errorDetails}`);
    onError(e.errorDetails);
  };
  
  recognizer.sessionStarted = (s, e) => {
    console.log('🎤 Speech recognition session started');
  };
  
  recognizer.sessionStopped = (s, e) => {
    console.log('🎤 Speech recognition session stopped');
  };
  
  return recognizer;
}

// Create stream-based recognizer for audio chunks
function createStreamRecognizer(language, onRecognizing, onRecognized, onError) {
  // Create push audio input stream
  const pushStream = sdk.AudioInputStream.createPushStream(
    sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
  );
  
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  
  const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
  
  // Set language
  if (language === 'ja') {
    speechConfig.speechRecognitionLanguage = 'ja-JP';
  } else {
    speechConfig.speechRecognitionLanguage = 'en-US';
  }
  
  // Enable detailed recognition results for real-time feedback
  speechConfig.outputFormat = sdk.OutputFormat.Detailed;
  
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  
  // Handle recognizing (partial results - real-time)
  recognizer.recognizing = (s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
      console.log(`🔄 Recognizing (realtime): ${e.result.text}`);
      onRecognizing(e.result.text);
    }
  };
  
  // Handle recognized (final result)
  recognizer.recognized = (s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
      console.log(`✓ Final transcript: ${e.result.text}`);
      onRecognized(e.result.text);
    } else if (e.result.reason === sdk.ResultReason.NoMatch) {
      console.log('❌ No speech could be recognized.');
      onError('No speech detected');
    } else if (e.result.reason === sdk.ResultReason.Canceled) {
      const cancellation = sdk.CancellationDetails.fromResult(e.result);
      console.error(`❌ Error: ${cancellation.reason}`);
      onError(cancellation.errorDetails);
    }
  };
  
  // Handle errors
  recognizer.canceled = (s, e) => {
    console.error(`❌ Recognizer canceled: ${e.errorDetails}`);
    onError(e.errorDetails);
  };
  
  return { recognizer, pushStream };
}

module.exports = {
  createSpeechRecognizer,
  createStreamRecognizer,
  SPEECH_KEY,
  SPEECH_REGION
};
