# How to View Logs

## Correct Commands

Since you're in the `backend` directory, use these commands:

### View all logs (combined):
```bash
tail -f logs/combined.log
```

### View only errors:
```bash
tail -f logs/error.log
```

### View last 50 lines:
```bash
tail -50 logs/combined.log
```

### Search for specific terms:
```bash
# Search for Ollama-related logs
grep -i ollama logs/combined.log | tail -20

# Search for extraction errors
grep -i "extraction\|error" logs/combined.log | tail -20

# Search for worker logs
grep -i worker logs/combined.log | tail -20
```

## Common Issues

### "No matches found" error
- **Problem**: Using `backend/logs/*.log` when already in `backend/` directory
- **Solution**: Use `logs/*.log` or `logs/combined.log` instead

### No log files
- **Problem**: Logs directory doesn't exist or worker hasn't run yet
- **Solution**: 
  ```bash
  mkdir -p logs
  # Then start the worker - it will create log files
  ```

## Real-time Monitoring

To watch logs in real-time while testing:

```bash
# Terminal 1: Watch all logs
tail -f logs/combined.log

# Terminal 2: Watch only errors
tail -f logs/error.log

# Terminal 3: Run the worker
npm run worker
```

## What to Look For

When the worker starts correctly with Ollama, you should see:
- `🤖 Using Ollama for AI processing (local models)`
- `Ollama service initialized: http://localhost:11434`
- `Extraction worker started`
- `🤖 Ollama mode enabled - using local models`

If you see OpenAI errors, the worker is using old code and needs to be restarted.

