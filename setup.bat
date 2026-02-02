@echo off
REM Quick setup script for Realtime-Translation-v1 (Windows)

setlocal enabledelayedexpansion

echo.
echo 🚀 Realtime Translation v1 - Setup Script (Windows)
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed
    echo    Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

REM Navigate to backend directory
cd /d "%~dp0backend" || exit /b 1

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

REM Check for .env file
if not exist ".env" (
    echo.
    echo ⚠️  .env file not found
    echo    Copying from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo    Created: .env
        echo    ⚠️  Please edit .env and add your API keys:
        echo       - SPEECH_KEY
        echo       - SPEECH_REGION
        echo       - TRANSLATOR_KEY
    ) else (
        echo    ❌ .env.example not found
    )
)

echo.
echo ✅ Setup complete!
echo.
echo 🎯 Next steps:
echo    1. Edit backend\.env and add your API keys
echo    2. Run: npm start
echo    3. Open browser and test the application
echo.
pause
