# クイックスタートガイド

## GitHub リポジトリ
📍 https://github.com/ylearning86/Realtime-Translation-v1

## Azure デプロイ情報
- **サブスクリプション**: dfbae745-0767-476a-a131-6fefa69ae9a8
- **リソースグループ**: speechservice-rg
- **リージョン**: japaneast

## セットアップチェックリスト

### ステップ 1: ローカル開発（テスト）
- [ ] `npm install` でバックエンド依存関係をインストール
- [ ] `npm start` でローカルサーバー起動 (localhost:3001)
- [ ] ブラウザで `index.html` を開いてテスト

### ステップ 2: Azure CLI セットアップ
```bash
# インストール
# Windows: choco install azure-cli
# macOS: brew install azure-cli

# ログイン
az login

# リソースグループ確認
az group show --name speechservice-rg
```

### ステップ 3: Azure Functions デプロイ
```bash
# 1. Azure Functions Core Tools インストール
npm install -g azure-functions-core-tools@4

# 2. ローカルで実行テスト
cd backend
func start

# 3. Azureにデプロイ
func azure functionapp publish translate-speech-api
```

### ステップ 4: 環境変数設定
```bash
az functionapp config appsettings set \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --settings \
    SPEECH_KEY="YOUR_SPEECH_KEY" \
    SPEECH_REGION="japaneast" \
    TRANSLATOR_KEY="YOUR_TRANSLATOR_KEY" \
    DEEPL_API_KEY="YOUR_DEEPL_KEY"
```

### ステップ 5: フロントエンド設定更新
`script.js` の `BACKEND_URL` を以下に変更：
```javascript
const BACKEND_URL = 'https://translate-speech-api.azurewebsites.net';
```

### ステップ 6: 動作確認
```bash
# APIエンドポイントテスト
curl -X POST https://translate-speech-api.azurewebsites.net/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": ["こんにちは"], "source_lang": "ja", "target_lang": "en"}'

# ブラウザで確認
# https://yourdomain.com で アプリケーション実行
```

---

## 必要なAPIキー

| サービス | キー名 | 取得方法 |
|---------|--------|--------|
| Azure Speech Services | SPEECH_KEY | [Azure Portal](https://portal.azure.com) |
| DeepL API | DEEPL_API_KEY | [DeepL Console](https://www.deepl.com/pro-api) |
| Azure Translator | TRANSLATOR_KEY | Azure Portal |

---

## トラブルシューティング

### 「503 Service Unavailable」
→ 環境変数が正しく設定されているか確認

### 「CORS エラー」
```bash
az functionapp cors add \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --allowed-origins "*"
```

### ログ確認
```bash
az functionapp log tail --name translate-speech-api --resource-group speechservice-rg
```

---

## 次のステップ

1. [Azure Functions デプロイガイド](./AZURE_FUNCTIONS_DEPLOYMENT.md) を参照
2. GitHub リポジトリをクローン
3. ローカルで `npm install` を実行
4. 環境変数を `.env` に設定
5. Azure Functions へデプロイ

---

## ドキュメント
- 📘 [Azure Functions 完全ガイド](./AZURE_FUNCTIONS_DEPLOYMENT.md)
- 📙 [README](./README.md)
- 📕 [.env.example](./backend/.env.example)

