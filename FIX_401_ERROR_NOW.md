# 🔧 今すぐ修正する手順

## 問題
エラーメッセージ: `Unable to contact server. StatusCode: 1006, Unexpected server response: 401`

## 原因
**Azure Speech Services のキーが未設定です**

---

## 🚀 5分で修正する手順

### Step 1: Azure Portal でキーを取得

1. https://portal.azure.com にアクセス
2. 左メニュー → 「すべてのリソース」
3. リソースグループ `speechservice-rg` を開く
4. 「Speech」リソースをクリック
5. 左メニュー → 「キーとエンドポイント」
6. **Key 1** をコピー（例: `xxxxx-xxxxx-xxxxx-xxxxx`）
7. **リージョン** をコピー（例: `japaneast`）

### Step 2: backend/.env ファイルを編集

`backend/.env` ファイルを以下の内容で作成/編集してください：

```env
# Azure Speech Services
SPEECH_KEY=Key1から取得したキー
SPEECH_REGION=japaneast

# Azure Translator
TRANSLATOR_KEY=Your_Translator_Key_Here
AZURE_TRANSLATOR_ENDPOINT=https://Realtime-Translation-v1-resource.cognitiveservices.azure.com/

# DeepL API (オプション)
DEEPL_API_KEY=your_deepl_key_here
```

**例（プレースホルダー）:**
```env
SPEECH_KEY=xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
TRANSLATOR_KEY=yyyy-yyyy-yyyy-yyyy-yyyy-yyyy-yyyy-yyyy
```

### Step 3: バックエンドサーバーを再起動

```bash
cd backend

# 既存プロセスを終了
# 上の コンソール出力で見たように Ctrl+C で終了

# サーバーを再起動
npm start
```

期待される出力:
```
✓ Realtime API server running
  REST API: http://localhost:3002/api/translate
  WebSocket: ws://localhost:3002/api/realtime
```

### Step 4: ブラウザで テスト

1. ブラウザで `index.html` をリロード
2. 開発者ツール (F12) → コンソールで以下を確認:
   - ✅ `✓ Connected to Realtime server`
   - ✅ `✓ Recording started`
   - ✅ `✓ Transcript received`

---

## ✅ 確認ポイント

ログが以下のように表示されたら **成功** です：

```
✓ Realtime API server running
  REST API: http://localhost:3002/api/translate
  WebSocket: ws://localhost:3002/api/realtime
✓ WebSocket client connected
✓ Speech recognition session started
✓ Continuous speech recognition started
✓ Transcript received: こんにちは
```

---

## ❌ まだエラーが出ている場合

1. **backend/.env が存在するか確認**
   ```bash
   ls -la backend/.env
   ```

2. **SPEECH_KEY が正しいか確認**
   - Azure Portal で再確認
   - 前後の空白を削除
   - コピペミスがないか確認

3. **npm を再インストール**
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   npm start
   ```

4. **ログを確認**
   ```
   Warning: SPEECH_KEY is not configured.
   → backend/.env が読み込まれていない
   ```

---

## 📝 環境変数の永続化（オプション）

### Windows (PowerShell)
```powershell
[System.Environment]::SetEnvironmentVariable("SPEECH_KEY","Your_Key_Here","User")
[System.Environment]::SetEnvironmentVariable("SPEECH_REGION","japaneast","User")

# PowerShell を再起動して有効化
```

### macOS / Linux
```bash
# ~/.bashrc または ~/.zshrc に追加
export SPEECH_KEY="Your_Key_Here"
export SPEECH_REGION="japaneast"

# 反映
source ~/.bashrc
```

