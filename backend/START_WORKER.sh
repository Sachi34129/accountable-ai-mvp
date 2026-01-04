#!/bin/bash

# Script to properly start the extraction worker

echo "🚀 Starting extraction worker..."
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Loaded environment variables from .env"
else
  echo "⚠️  Warning: .env file not found"
fi

# Check configuration
echo ""
echo "Configuration:"
echo "  USE_OLLAMA: ${USE_OLLAMA:-false}"
echo "  OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-http://localhost:11434}"
echo "  OLLAMA_VISION_MODEL: ${OLLAMA_VISION_MODEL:-llava:latest}"
echo "  OLLAMA_TEXT_MODEL: ${OLLAMA_TEXT_MODEL:-llama3:latest}"
echo "  REDIS_URL: ${REDIS_URL:-redis://localhost:6379}"
echo ""

# Check if USE_OLLAMA is set
if [ "$USE_OLLAMA" = "true" ]; then
  echo "🤖 Ollama mode: ENABLED"
  
  # Check if Ollama is running
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
  else
    echo "❌ ERROR: Ollama is not running!"
    echo "   Start Ollama: ollama serve"
    exit 1
  fi
else
  echo "🌐 OpenAI mode: ENABLED"
  if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY is not set or is placeholder"
  fi
fi

# Check if Redis is running
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is running"
else
  echo "⚠️  Warning: Redis might not be running"
  echo "   Start Redis: redis-server"
fi

echo ""
echo "Starting worker..."
echo "---"
npm run worker

