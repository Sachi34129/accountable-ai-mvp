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

OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d '=' -f2)
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key" ]; then
  echo "⚠️  WARNING: OPENAI_API_KEY is not set (or is placeholder)"
  echo "   The worker will fail AI calls until you set a valid OpenAI API key."
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

# Start the worker
echo ""
echo "4. Starting worker..."
echo "   Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

mkdir -p logs
npm run worker 2>&1 | tee logs/worker-startup.log

