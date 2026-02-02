# リアルタイム翻訳アプリケーション

音声認識とリアルタイム翻訳を実現するWebアプリケーション

## アーキテクチャ

- **フロントエンド**: HTML/CSS/JavaScript with Web Audio API
- **バックエンド**: Node.js/Express + CORS対応
- **音声認識**: Web Speech API + Azure Speech Services
- **翻訳**: DeepL API
- **デプロイ**: GitHub Pages (フロントエンド) + Render/Railway (バックエンド)

## 開発環境セットアップ

### 1. バックエンドサーバー起動

```bash
cd backend
npm install
npm start
```

サーバーは `http://localhost:3001` で起動

### 2. フロントエンド開始

ブラウザで `index.html` を開く

## 本番環境デプロイ

### Azure Functions + Static Web Apps でデプロイ

#### ステップ 1: 環境変数を設定

```bash
./setup-env.sh
```

または Azure Portal から手動設定：

- `SPEECH_KEY`: Azure Speech Services のキー
- `AZURE_TRANSLATOR_KEY`: Azure Translator のキー  
- `AZURE_LOCATION`: swedencentral

#### ステップ 2: バックエンドをデプロイ

```bash
cd backend
func azure functionapp publish realtime-translation-api --build remote
```

#### ステップ 3: フロントエンドを Static Web Apps にデプロイ

Azure Portal または GitHub Actions で自動デプロイ

📖 詳細は [デプロイガイド](./DEPLOYMENT_GUIDE_SWA.md) を参照

## Usage

1. Select response language (English or 日本語)
2. Click "Start Conversation"
3. Speak naturally into your microphone
4. GPT Realtime will transcribe and respond
5. Responses are translated to your selected language in real-time

## Features

- **Real-time voice input**: Microphone audio streamed to GPT Realtime
- **AI conversations**: Natural dialogue with GPT-4
- **Live transcription**: See your speech transcribed in real-time
- **Translation**: GPT responses can be translated to Japanese
- **Conversation history**: View previous exchanges

## API Configuration

### Azure OpenAI Realtime
- **Endpoint**: `https://Realtime-Translation-v1-resource.openai.azure.com/`
- **Deployment**: `gpt-realtime`
- **API Version**: `2024-10-01-preview`

### Azure Translator
- **Endpoint**: `https://Realtime-Translation-v1-resource.cognitiveservices.azure.com/`
- **API Version**: `2025-10-01-preview`

## Browser Support

- Chrome/Edge: Full support for Web Speech API
- Firefox: Partial support
- Safari: Limited support

## Files

- `index.html` - Frontend UI
- `styles.css` - Styling
- `script.js` - Speech recognition and translation logic
- `backend/server.js` - Proxy server
- `backend/package.json` - Dependencies

