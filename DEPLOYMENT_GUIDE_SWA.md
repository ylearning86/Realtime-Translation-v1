# Azure Static Web Apps デプロイ手順

## 準備

1. **GitHub に .env.production ファイルを作成**
   ```bash
   # Realtime-Translation-v1/.env.production
   VITE_API_URL=https://<your-functions-app-name>.azurewebsites.net
   ```

2. **環境変数の設定（Azure Portal）**
   
   Static Web Apps → Settings → Application settings
   
   追加する環境変数：
   - `API_URL`: `https://<your-functions-app-name>.azurewebsites.net`

## デプロイ手順

### ステップ 1: Azure Functions をデプロイ

```bash
cd Realtime-Translation-v1/backend
func azure functionapp publish <function-app-name> --build remote
```

### ステップ 2: Azure Static Web Apps をデプロイ

Azure Portal から：
1. リソースを作成 → Static Web Apps
2. GitHub アカウントを接続
3. リポジトリ: `minerva-zen`
4. ブランチ: `main`
5. ビルド設定:
   - App location: `Realtime-Translation-v1/`
   - Api location: (empty)
   - Output location: (empty)
6. 作成してデプロイ

## URLs

- **フロントエンド**: https://<static-web-app-name>.azurestaticapps.net/Realtime-Translation-v1/
- **バックエンド API**: https://<function-app-name>.azurewebsites.net/api/

## トラブルシューティング

CORS エラーが出た場合:
- Azure Functions → CORS 設定で `*` を追加
