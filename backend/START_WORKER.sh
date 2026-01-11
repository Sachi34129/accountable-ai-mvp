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
echo "  REDIS_URL: ${REDIS_URL:-redis://localhost:6379}"
echo "  AI_PROVIDER: OpenAI API"
echo ""

# Check OpenAI key
  if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY is not set or is placeholder"
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

