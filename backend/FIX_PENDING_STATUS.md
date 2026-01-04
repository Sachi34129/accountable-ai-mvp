# Fix: Documents Stuck in "Pending" Status

## Problem
Documents were stuck in "pending" status and not being processed.

## Root Causes Found

1. **Worker not loading environment variables**: The worker wasn't loading `.env` file, so `USE_OLLAMA=true` wasn't being read
2. **Worker using old code**: The worker process was still running with code that didn't support Ollama
3. **Status not updating on failure**: While the code tried to update status to "failed", there was no guarantee it would succeed

## Fixes Applied

### 1. Added dotenv to Worker
- Added `dotenv.config()` at the top of `extractor.worker.ts`
- Now the worker properly loads environment variables from `.env`

### 2. Added Mode Logging
- Worker now logs which mode it's using (Ollama or OpenAI)
- Makes it easy to verify the correct mode is active

### 3. Improved Error Handling
- Enhanced error handling in `extraction.ts` to ensure status is always updated
- Added try-catch around status update to prevent failures from blocking error reporting

## How to Fix Your Current Issue

### Step 1: Stop the Current Worker
If you have a worker running, stop it (Ctrl+C in the terminal where it's running).

### Step 2: Restart the Worker
```bash
cd backend
npm run worker
```

You should see:
```
🤖 Ollama mode enabled - using local models
```

If you see:
```
🌐 OpenAI mode enabled - using OpenAI API
```

Then check your `.env` file has:
```env
USE_OLLAMA=true
```

### Step 3: Verify Ollama is Running
```bash
curl http://localhost:11434/api/tags
```

Should return a list of models including `llava:latest` and `llama3:latest`.

### Step 4: Check Pending Documents
The worker will automatically process any pending jobs in the queue. If documents are still stuck:

1. **Check the logs**: `tail -f backend/logs/*.log`
2. **Check database status**: Documents should now update to either "processing", "completed", or "failed"
3. **Upload a new document**: This will test if the fix is working

## Verification

After restarting the worker, you should see:
- ✅ Worker logs showing "Ollama mode enabled"
- ✅ Documents moving from "pending" → "processing" → "completed" or "failed"
- ✅ No more OpenAI quota errors in logs
- ✅ Successful extraction using local Ollama models

## Troubleshooting

### Still seeing OpenAI errors?
- Make sure `USE_OLLAMA=true` in `.env` (no quotes, lowercase "true")
- Restart the worker after changing `.env`
- Check worker logs to see which mode it's using

### Ollama connection errors?
- Make sure Ollama is running: `ollama serve`
- Check Ollama is accessible: `curl http://localhost:11434/api/tags`
- Verify models are downloaded: `ollama list`

### Documents still pending?
- Check if worker is actually running: `ps aux | grep worker`
- Check Redis is running: `redis-cli ping`
- Check worker logs for errors: `tail -f backend/logs/*.log`
- Try uploading a new document to test

## Quick Restart Script

Use the provided script:
```bash
cd backend
./restart-worker.sh
```

This script:
- Loads environment variables
- Checks Ollama/OpenAI configuration
- Verifies Redis is running
- Starts the worker with proper logging

