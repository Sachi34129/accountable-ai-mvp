#!/bin/bash

# Script to restart the extraction worker with proper environment loading

echo "🔄 Restarting extraction worker..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Loaded environment variables from .env"
else
  echo "⚠️  Warning: .env file not found"
fi

# Check if USE_OLLAMA is set
if [ "$USE_OLLAMA" = "true" ]; then
  echo "🤖 Ollama mode: ENABLED"
  echo "   Make sure Ollama is running: ollama serve"
else
  echo "🌐 OpenAI mode: ENABLED"
  echo "   Make sure OPENAI_API_KEY is set in .env"
fi

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
  echo "⚠️  Warning: Redis might not be running"
  echo "   Start Redis: redis-server"
fi

echo ""
echo "Starting worker..."
npm run worker

