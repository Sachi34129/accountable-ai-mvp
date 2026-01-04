# Quick Start Guide

## The Problem
**The worker is not running!** That's why documents aren't being processed.

## Solution: Start the Worker

### Step 1: Open a NEW Terminal
You need TWO terminals:
- **Terminal 1**: Backend server (already running)
- **Terminal 2**: Worker (needs to be started)

### Step 2: Start the Worker
In the new terminal:
```bash
cd /Users/sachithkrishna/accountable-ai-mvp/backend
npm run worker
```

### Step 3: Verify It's Working
You should see:
```
🤖 Using Ollama for AI processing (local models)
   Ollama URL: http://localhost:11434
   Vision Model: llava:latest
   Text Model: llama3:latest
Ollama service initialized: http://localhost:11434, Vision: llava:latest, Text: llama3:latest
Extraction worker started
USE_OLLAMA: true
🤖 Ollama mode enabled - using local models
```

### Step 4: View Logs (Correct Commands)
Since you're in the `backend` directory, use:
```bash
# View all logs in real-time
tail -f logs/combined.log

# View only errors
tail -f logs/error.log

# View last 50 lines
tail -50 logs/combined.log
```

## What You Need Running

1. **PostgreSQL** - Database (should be running)
2. **Redis** - Queue system (should be running)
3. **Ollama** - AI models (should be running: `ollama serve`)
4. **Backend Server** - API server (Terminal 1: `npm run dev`)
5. **Worker** - Document processor (Terminal 2: `npm run worker`) ← **MISSING!**

## Test It

1. Start the worker (Terminal 2)
2. Upload a document through the frontend
3. Watch the worker logs - should see:
   - "Processing extraction job for document..."
   - "Using Ollama for document extraction"
   - "Extraction completed"

## Troubleshooting

### Worker won't start?
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check Ollama
curl http://localhost:11434/api/tags
# Should return list of models

# Check .env
cat .env | grep USE_OLLAMA
# Should show: USE_OLLAMA=true
```

### Still seeing OpenAI errors?
- Worker is using old code - make sure you restarted it after the fixes
- Check logs show "Ollama mode enabled"

