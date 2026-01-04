# Fix: Ollama Not Being Called

## Problem
The worker was still calling OpenAI API even though `USE_OLLAMA=true` was set in `.env`.

## Root Cause
The `USE_OLLAMA` constant was evaluated at **module load time**, which meant:
1. If the worker started before `.env` was fully loaded, it cached `false`
2. The constant never re-evaluated, even if `.env` was loaded later
3. The worker process needed to be completely restarted to pick up changes

## Solution
Changed all AI functions to check `process.env.USE_OLLAMA === 'true'` **at runtime** instead of using a module-level constant. This ensures:
- The check happens every time a function is called
- It always reads the latest environment variable value
- No need to restart the worker when changing `.env` (though restart is still recommended)

## Changes Made

### `backend/src/services/openai.ts`
- Removed module-level `USE_OLLAMA` constant
- Added runtime checks in all functions:
  - `extractFromDocument()`
  - `categorizeTransaction()`
  - `detectTaxOpportunities()`
  - `generateInsights()`
  - `chatWithFinances()`
  - `generateDisputeEmail()`
- Added debug logging to show which mode is being used

## How to Verify

1. **Restart the worker** (important!):
   ```bash
   cd backend
   ./RESTART_WORKER.sh
   ```

2. **Check the logs** - you should see:
   ```
   ✅ Using Ollama for document extraction
   ```

3. **Upload a document** and watch the worker logs - should see Ollama being called, not OpenAI errors.

## If Still Not Working

1. **Verify .env file**:
   ```bash
   cat .env | grep USE_OLLAMA
   # Should show: USE_OLLAMA=true
   ```

2. **Check worker logs** for debug messages:
   ```bash
   tail -f logs/combined.log | grep -i ollama
   ```

3. **Kill and restart worker**:
   ```bash
   pkill -f extractor.worker
   npm run worker
   ```

4. **Verify Ollama is running**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

