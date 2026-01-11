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

:: Basic check
echo [INFO] Checking for essential services...
echo [INFO] Note: local model server checks are disabled (API-only AI).

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


