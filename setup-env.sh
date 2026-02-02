#!/bin/bash

# Azure リソースの環境変数を設定するスクリプト

SUBSCRIPTION_ID="dfbae745-0767-476a-a131-6fefa69ae9a8"
RESOURCE_GROUP="speechservice-rg"
FUNCTION_APP_NAME="realtime-translation-api"

# Azure CLI で設定
az account set --subscription $SUBSCRIPTION_ID

echo "Function App に環境変数を設定します..."
echo ""
echo "必要な環境変数:"
echo "1. SPEECH_KEY - Azure Speech Services のキー"
echo "2. AZURE_TRANSLATOR_KEY - Azure Translator のキー"
echo ""

# 対話的に入力
read -p "SPEECH_KEY を入力してください: " SPEECH_KEY
read -p "AZURE_TRANSLATOR_KEY を入力してください: " AZURE_TRANSLATOR_KEY

# Function App に設定
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    SPEECH_KEY="$SPEECH_KEY" \
    AZURE_TRANSLATOR_KEY="$AZURE_TRANSLATOR_KEY" \
    AZURE_LOCATION="swedencentral" \
    NODE_ENV="production"

echo "✅ 環境変数を設定しました"
echo ""
echo "Function App デプロイ:"
echo "cd Realtime-Translation-v1/backend"
echo "func azure functionapp publish $FUNCTION_APP_NAME --build remote"
