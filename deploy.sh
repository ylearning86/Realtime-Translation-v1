#!/bin/bash

set -e

# Configuration
SUBSCRIPTION_ID="dfbae745-0767-476a-a131-6fefa69ae9a8"
RESOURCE_GROUP="speechservice-rg"
FUNCTION_APP_NAME="realtime-translation-api"
REGION="japaneast"

echo "🔧 Deploying to Azure..."

# Set subscription
az account set --subscription $SUBSCRIPTION_ID

# Configure environment variables for Function App
echo "📝 Setting environment variables..."
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    SPEECH_KEY="${SPEECH_KEY}" \
    AZURE_TRANSLATOR_KEY="${AZURE_TRANSLATOR_KEY}" \
    AZURE_LOCATION="swedencentral" \
    NODE_ENV="production"

# Get the Function App URL
echo "🌐 Getting Function App URL..."
FUNCTION_APP_URL=$(az functionapp show \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --query "defaultHostName" \
  --output tsv)

echo "✅ Function App URL: https://$FUNCTION_APP_URL"

# Deploy backend to Azure Functions
echo "📦 Deploying backend to Azure Functions..."
cd backend

# Build and publish
func azure functionapp publish $FUNCTION_APP_NAME --build remote

cd ..

echo "🎉 Deployment complete!"
echo ""
echo "API Endpoint: https://$FUNCTION_APP_URL/api/"
echo ""
echo "Next steps:"
echo "1. Create Static Web Apps resource"
echo "2. Update frontend with API endpoint"
echo "3. Deploy frontend to Static Web Apps"
