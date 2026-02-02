#!/bin/bash
# Quick setup script for Realtime-Translation-v1

echo "🚀 Realtime Translation v1 - Setup Script"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend" || exit 1

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  .env file not found"
    echo "   Copying from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   Created: .env"
        echo "   ⚠️  Please edit .env and add your API keys:"
        echo "      - SPEECH_KEY"
        echo "      - SPEECH_REGION"
        echo "      - TRANSLATOR_KEY"
    else
        echo "   ❌ .env.example not found"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Edit backend/.env and add your API keys"
echo "   2. Run: npm start"
echo "   3. Open browser and test the application"
echo ""
