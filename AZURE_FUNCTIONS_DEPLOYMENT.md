# Azure Functions デプロイガイド

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│         フロントエンド (HTML/CSS/JS)                 │
│  ローカル実行または任意のホスティング                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ HTTPS リクエスト
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Azure Functions (Node.js)   │
        │  translate-speech-api         │
        └──────────────────────────────┘
              │
              ├─► Azure Speech Services
              │   (音声認識)
              │
              ├─► DeepL API
              │   (テキスト翻訳)
              │
              └─► Azure Translator
                  (代替翻訳サービス)
```

## 前提条件

- Azure アカウント（無料枠有）
- Azure CLI または VS Code Azure Tools
- Node.js 18+ LTS
- DeepL API キー（オプション）
- Azure Speech Services キー

### 必要なAzureサブスクリプション情報

```
サブスクリプション: dfbae745-0767-476a-a131-6fefa69ae9a8
リソースグループ: speechservice-rg
リージョン: Japan East (japaneast)
```

---

## Step 1: Azure Functionsプロジェクトセットアップ

### 1.1 Azure Functions Core Toolsのインストール

```bash
# Windows (Chocolatey使用)
choco install azure-functions-core-tools-4

# macOS
brew tap azure/azure
brew install azure-functions-core-tools@4

# Linux
sudo apt-get install azure-functions-core-tools
```

### 1.2 プロジェクト構造の準備

```bash
cd /path/to/Realtime-Translation-v1/backend

# 既存のserver.jsをfunc app用に変換
# local.settings.jsonを作成
```

---

## Step 2: local.settings.json設定

[backend/local.settings.json](./backend/local.settings.json) を作成：

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FUNCTIONS_WORKER_RUNTIME_VERSION": "~20",
    "SPEECH_KEY": "YOUR_SPEECH_KEY",
    "SPEECH_REGION": "japaneast",
    "TRANSLATOR_KEY": "YOUR_TRANSLATOR_KEY",
    "AZURE_TRANSLATOR_ENDPOINT": "https://Realtime-Translation-v1-resource.cognitiveservices.azure.com/",
    "DEEPL_API_KEY": "YOUR_DEEPL_API_KEY"
  }
}
```

### 注意：
- `local.settings.json` は **絶対にGitHubにコミットしないこと**
- `.gitignore` に記載済み

---

## Step 3: HTTP Triggerプロジェクト設定

### 3.1 Azure Functions対応の修正

[backend/server.js](./backend/server.js) を Azure Functions形式に修正：

```javascript
// 現在のExpress.jsコード：
app.post("/api/translate", async (req, res) => { ... })

// Azure Functions用に変換：
module.exports = async function(context, req) {
  if (req.method === "POST") {
    // 翻訳ロジック
    context.res = { body: result };
  } else {
    context.res = { status: 405, body: "Method Not Allowed" };
  }
};
```

### 3.2 function.json設定

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post"],
      "route": "translate"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    }
  ]
}
```

---

## Step 4: Azure Functionsへのデプロイ

### 4.1 Azureへのログイン

```bash
az login
```

### 4.2 Function Appの作成

```bash
# リソースグループ内にFunctionアプリを作成
az functionapp create \
  --resource-group speechservice-rg \
  --consumption-plan-location japaneast \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name translate-speech-api \
  --storage-account translationstorage
```

### 4.3 ローカルデバッグ

```bash
cd backend
npm install
func start
```

ローカルでテスト：
```bash
curl -X POST http://localhost:7071/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": ["Hello"], "source_lang": "en", "target_lang": "ja", "subscription_key": "KEY"}'
```

### 4.4 Azureへのデプロイ

```bash
# 環境変数をAzureに設定
az functionapp config appsettings set \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --settings SPEECH_KEY="YOUR_SPEECH_KEY" \
  SPEECH_REGION="japaneast" \
  TRANSLATOR_KEY="YOUR_TRANSLATOR_KEY" \
  DEEPL_API_KEY="YOUR_DEEPL_API_KEY"

# デプロイ
func azure functionapp publish translate-speech-api
```

---

## Step 5: フロントエンド設定

### 5.1 バックエンドURLの更新

[script.js](./script.js) を修正：

```javascript
// 開発環境
const BACKEND_URL = 'http://localhost:7071';

// 本番環境（Azureへデプロイ後）
const BACKEND_URL = 'https://translate-speech-api.azurewebsites.net';
```

---

## Step 6: CORS設定

Azure FunctionsでCORSを有効化：

```bash
az functionapp cors add \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --allowed-origins "*"
```

または [proxies.json](./backend/proxies.json)で設定：

```json
{
  "$schema": "http://json.schemastore.org/proxies.json",
  "proxies": {
    "translate": {
      "matchCondition": {
        "route": "/api/translate",
        "methods": ["POST"]
      },
      "backendUri": "http://%WEBSITE_HOSTNAME%/api/translate"
    }
  }
}
```

---

## Step 7: 環境変数の設定

### Azure Portal での設定

1. Azure Portal → Functions → 設定 → アプリケーション設定
2. 以下を追加：

| キー | 値 |
|------|-----|
| SPEECH_KEY | `YOUR_AZURE_SPEECH_KEY` |
| SPEECH_REGION | `japaneast` |
| TRANSLATOR_KEY | `YOUR_DEEPL_OR_AZURE_KEY` |
| AZURE_TRANSLATOR_ENDPOINT | `https://Realtime-Translation-v1-resource.cognitiveservices.azure.com/` |
| DEEPL_API_KEY | `YOUR_DEEPL_KEY`（オプション） |

### コマンドラインでの一括設定

```bash
az functionapp config appsettings set \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --settings \
    SPEECH_KEY="$SPEECH_KEY" \
    SPEECH_REGION="japaneast" \
    TRANSLATOR_KEY="$TRANSLATOR_KEY" \
    AZURE_TRANSLATOR_ENDPOINT="https://Realtime-Translation-v1-resource.cognitiveservices.azure.com/" \
    DEEPL_API_KEY="$DEEPL_API_KEY"
```

---

## Step 8: 動作確認

### 8.1 エンドポイント確認

```bash
# Azure Functionsエンドポイント確認
az functionapp show \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --query "defaultHostName"

# 出力: translate-speech-api.azurewebsites.net
```

### 8.2 API テスト

```bash
curl -X POST https://translate-speech-api.azurewebsites.net/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": ["こんにちは"],
    "source_lang": "ja",
    "target_lang": "en",
    "subscription_key": "YOUR_TRANSLATOR_KEY"
  }'
```

### 8.3 ログ確認

```bash
# リアルタイムログ表示
az functionapp log tail \
  --name translate-speech-api \
  --resource-group speechservice-rg
```

---

## Step 9: 本番環境の最適化

### 9.1 App Service Plan の変更（オプション）

従量課金プランから専用プランへ:

```bash
az appservice plan create \
  --name speechplan \
  --resource-group speechservice-rg \
  --sku B1

az functionapp update \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --plan speechplan
```

### 9.2 スケーリング設定

```bash
az monitor autoscale create \
  --resource-group speechservice-rg \
  --resource translate-speech-api \
  --resource-type "Microsoft.Web/sites" \
  --min-count 1 \
  --max-count 5 \
  --count 1
```

### 9.3 監視設定

Application Insights を有効化:

```bash
az functionapp config appsettings set \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="$INSTRUMENTATION_KEY"
```

---

## トラブルシューティング

### エラー：「関数が見つかりません」

```bash
# 関数が正しくデプロイされているか確認
func azure functionapp list-functions translate-speech-api
```

### エラー：「CORS ブロック」

```bash
# CORSを再設定
az functionapp cors add \
  --name translate-speech-api \
  --resource-group speechservice-rg \
  --allowed-origins "http://localhost:3000" "https://yourdomain.com"
```

### エラー：「認証キーが無効」

```bash
# 関数キーの確認
az functionapp keys list \
  --name translate-speech-api \
  --resource-group speechservice-rg
```

---

## 参考資料

- [Azure Functions Node.js ガイド](https://learn.microsoft.com/ja-jp/azure/azure-functions/functions-reference-node)
- [Azure Functions HTTP Trigger](https://learn.microsoft.com/ja-jp/azure/azure-functions/functions-bindings-http-webhook-trigger)
- [Azure CLI リファレンス](https://learn.microsoft.com/cli/azure/functionapp)

