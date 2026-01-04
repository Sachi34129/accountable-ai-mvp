#!/bin/bash
# Script to properly restart the extraction worker

cd "$(dirname "$0")"

echo "🔄 Restarting Accountable AI Extraction Worker..."
echo ""

# Kill any existing worker processes
echo "1. Stopping any existing worker processes..."
pkill -f "extractor.worker" 2>/dev/null
sleep 2

# Verify .env file
echo "2. Checking .env configuration..."
if [ ! -f .env ]; then
  echo "❌ ERROR: .env file not found!"
  exit 1
fi

USE_OLLAMA=$(grep "^USE_OLLAMA=" .env | cut -d '=' -f2)
echo "   USE_OLLAMA=${USE_OLLAMA}"

if [ "$USE_OLLAMA" != "true" ]; then
  echo "⚠️  WARNING: USE_OLLAMA is not set to 'true'"
  echo "   The worker will use OpenAI API instead of Ollama"
fi

# Check Redis
echo ""
echo "3. Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
  echo "   ✅ Redis is running"
else
  echo "   ❌ Redis is NOT running. Start it with: redis-server"
  exit 1
fi

# Check Ollama (if enabled)
if [ "$USE_OLLAMA" = "true" ]; then
  echo ""
  echo "4. Checking Ollama connection..."
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✅ Ollama is running"
  else
    echo "   ❌ Ollama is NOT running. Start it with: ollama serve"
    exit 1
  fi
fi

# Start the worker
echo ""
echo "5. Starting worker..."
echo "   Watch the logs below for '✅ Using Ollama' messages"
echo "   Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

mkdir -p logs
npm run worker 2>&1 | tee logs/worker-startup.log

