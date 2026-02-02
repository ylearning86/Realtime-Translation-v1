# トラブルシューティング：WebSocket 401エラー

## エラーメッセージ
```
Error from server: Unable to contact server. StatusCode: 1006, undefined Reason: Unexpected server response: 401
```

## 原因
Azure Speech Services のキーが無効または設定されていません。

---

## 解決方法

### ステップ 1: 環境変数を確認

#### Windows (PowerShell)
```powershell
# 現在の環境変数を確認
$env:SPEECH_KEY
$env:SPEECH_REGION

# 設定
$env:SPEECH_KEY = "YOUR_ACTUAL_SPEECH_KEY"
$env:SPEECH_REGION = "japaneast"
```

#### macOS / Linux (Bash)
```bash
# 現在の環境変数を確認
echo $SPEECH_KEY
echo $SPEECH_REGION

# 設定
export SPEECH_KEY="YOUR_ACTUAL_SPEECH_KEY"
export SPEECH_REGION="japaneast"
```

### ステップ 2: バックエンドサーバーを起動

```bash
cd backend

# 依存関係をインストール
npm install

# サーバー起動（環境変数が設定されている状態で）
npm start
```

期待される出力:
```
✓ Realtime API server running
  REST API: http://localhost:3002/api/translate
  WebSocket: ws://localhost:3002/api/realtime
  Using Azure Speech Services + Azure Translator
```

### ステップ 3: Azure Speech Key を取得

1. [Azure Portal](https://portal.azure.com) にログイン
2. 検索ボックスで「Speech Services」を検索
3. 作成済みの Speech Service リソースを選択
4. 左メニュー → 「キーとエンドポイント」
5. **Key 1** または **Key 2** をコピー

### ステップ 4: フロントエンドでテスト

```bash
# ブラウザで index.html を開く
# 開発者ツール (F12) → コンソールタブを確認

# 期待されるログ:
# ✓ Connected to Realtime server
# ✓ Recording started
```

---

## デバッグ方法

### コンソールログを確認

ブラウザ開発者ツール (F12) → コンソールで以下を確認:

#### 成功時の ログ:
```
✓ DOM Elements initialized
✓ Initializing application...
✓ Connected to Realtime server
✓ Recording started
✓ Transcript received
```

#### エラーのログ:
```
Error from server: Unable to contact server. StatusCode: 1006
→ SPEECH_KEY が無効
```

### バックエンドログを確認

```
Warning: SPEECH_KEY is not configured. Set SPEECH_KEY environment variable.
→ 環境変数が未設定
```

---

## よくある問題

### 1. 「401 Unauthorized」エラー
**原因**: Azure Speech Key が無効
**解決**: 
```bash
# キーを正しく設定して再起動
export SPEECH_KEY="xxxx-xxxx-xxxx-xxxx"
npm start
```

### 2. 「Connection refused」エラー
**原因**: バックエンドサーバーが起動していない
**解決**:
```bash
cd backend
npm start
# 確認: http://localhost:3002/api/realtime に接続可能か
```

### 3. 「ENOENT: no such file or directory」
**原因**: `node_modules` がインストールされていない
**解決**:
```bash
npm install
npm start
```

---

## 環境変数の永続化

### Windows (PowerShell - 永続設定)
```powershell
# システム環境変数として設定
[System.Environment]::SetEnvironmentVariable("SPEECH_KEY","YOUR_KEY","User")
[System.Environment]::SetEnvironmentVariable("SPEECH_REGION","japaneast","User")

# PowerShell再起動後に有効
```

### macOS / Linux (.bashrc または .zshrc)
```bash
# ~/.bashrc または ~/.zshrc に追加
export SPEECH_KEY="YOUR_KEY"
export SPEECH_REGION="japaneast"

# 反映
source ~/.bashrc
```

### Node.js プロジェクト (.env ファイル)
backend/ ディレクトリに `.env` ファイルを作成:
```
SPEECH_KEY=YOUR_ACTUAL_KEY
SPEECH_REGION=japaneast
TRANSLATOR_KEY=YOUR_TRANSLATOR_KEY
DEEPL_API_KEY=YOUR_DEEPL_KEY
```

---

## 次のステップ

✅ 環境変数を設定した後
✅ バックエンドサーバーを再起動した後
✅ ブラウザをリロード

でエラーが解決します。

