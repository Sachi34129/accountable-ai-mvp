# Fix: Ollama Model Runner Crash

## Problem
Ollama model runner was crashing with error:
```
model runner has unexpectedly stopped, this may be due to resource limitations or an internal error
```

## Root Causes
1. **Memory Issues**: Large images or insufficient RAM
2. **Model Not Loaded**: Model needs to be pre-loaded before use
3. **No Retry Logic**: Single failures caused complete job failure
4. **Large Output**: Unlimited output length could cause memory issues

## Solution

### 1. Added Model Pre-loading
- Before making API calls, ensure the model is loaded
- This prevents "model not found" errors

### 2. Added Retry Logic with Exponential Backoff
- Retries up to 3 times on failures
- Exponential backoff: 1s, 2s, 4s delays
- Handles both 500 errors and network failures

### 3. Added Image Size Checking
- Warns if image is > 10MB
- Logs image size for debugging

### 4. Limited Output Length
- Added `num_predict: 2048` to limit response length
- Prevents memory issues from very long outputs

### 5. Better Error Handling
- Graceful JSON parsing with fallback
- Helpful error messages with troubleshooting tips
- Returns empty result instead of crashing on parse errors

## Changes Made

### `backend/src/services/ollama.ts`
- Added `ensureModelLoaded()` function
- Updated `callOllama()` with retry logic
- Added image size checking in `extractFromDocument()`
- Added `num_predict` limit to prevent memory issues
- Improved error messages with troubleshooting tips

## How to Use

1. **Restart the worker**:
   ```bash
   cd backend
   ./RESTART_WORKER.sh
   ```

2. **If still getting crashes**, try:
   - **Free up RAM**: Close other applications
   - **Use smaller model**: 
     ```bash
     export OLLAMA_VISION_MODEL=llava:7b
     ```
   - **Reduce image size**: Compress images before uploading
   - **Check Ollama logs**: 
     ```bash
     ollama logs
     ```

## Testing

Upload a document and watch the logs. You should see:
- Model pre-loading messages
- Retry attempts if needed
- Image size warnings if applicable
- Successful extraction or helpful error messages

