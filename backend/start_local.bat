@echo off
setlocal enabledelayedexpansion

echo #################################################
echo #  Accountable AI - Local Backend Startup       #
echo #################################################

:: Check if .env exists
if not exist .env (
    echo [ERROR] .env file not found. Please ensure it exists in the backend directory.
    exit /b 1
)

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    exit /b 1
)

:: Check if services are running (Basic check)
echo [INFO] Checking for essential services...

:: Note: Check if Ollama is responsive
curl -s http://localhost:11434/api/tags >nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Ollama is not responsive at http://localhost:11434
    echo Please run 'ollama serve' in another terminal.
) else (
    echo [OK] Ollama is running.
)

:: Start Backend Server
echo [INFO] Starting Backend Server...
start "Backend Server" cmd /c "npx tsx --env-file=.env src/server.ts"

:: Start Worker
echo [INFO] Starting Extraction Worker...
start "Extraction Worker" cmd /c "npx tsx --env-file=.env src/workers/extractor.worker.ts"

echo [SUCCESS] Startup commands issued.
echo Monitor the new terminal windows for logs.
echo API Health Check: http://localhost:3000/api/health
pause
