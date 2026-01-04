# Fix: Worker Not Using Ollama

## Problem
The worker is still using OpenAI instead of Ollama, causing extraction failures.

## Root Cause
1. **Worker process hasn't been restarted** - Still running with old code
2. **Environment variables not loaded early enough** - Fixed by adding `dotenv.config()` at top of `openai.ts`

## Solution

### Step 1: Stop the Current Worker
Find and kill the worker process:
```bash
# Find worker process
ps aux | grep "extractor.worker"

# Kill it (replace PID with actual process ID)
kill <PID>

# Or if you know it's running in a terminal, just press Ctrl+C
```

### Step 2: Restart the Worker
```bash
cd backend
npm run worker
```

### Step 3: Verify It's Using Ollama
You should see in the logs:
```
🤖 Using Ollama for AI processing (local models)
   Ollama URL: http://localhost:11434
   Vision Model: llava:latest
   Text Model: llama3:latest
Extraction worker started
USE_OLLAMA: true
🤖 Ollama mode enabled - using local models
```

### Step 4: Test with a New Document
1. Upload a document through the frontend
2. Check worker logs - should see "Using Ollama for document extraction"
3. No more OpenAI API errors!

## What Was Fixed

1. **Added `dotenv.config()` at top of `openai.ts`** - Ensures environment variables are loaded before `USE_OLLAMA` is evaluated
2. **Added Ollama health check** - Verifies Ollama is accessible before making API calls
3. **Better logging** - Shows which mode is active and which models are being used

## Verification

After restarting, check:
- ✅ Worker logs show "Ollama mode enabled"
- ✅ No OpenAI API calls in logs
- ✅ Documents process successfully
- ✅ Progress tracking works (10% → 30% → 40% → 70% → 100%)

## If Still Not Working

1. **Check `.env` file**:
   ```bash
   cd backend
   cat .env | grep USE_OLLAMA
   # Should show: USE_OLLAMA=true
   ```

2. **Verify Ollama is running**:
   ```bash
   curl http://localhost:11434/api/tags
   # Should return list of models
   ```

3. **Check worker logs**:
   ```bash
   tail -f backend/logs/*.log
   ```

4. **Restart everything**:
   ```bash
   # Stop worker (Ctrl+C)
   # Stop backend server (Ctrl+C)
   # Restart both
   cd backend
   npm run dev  # In one terminal
   npm run worker  # In another terminal
   ```

