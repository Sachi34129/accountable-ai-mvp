# Testing Guide for Accountable AI Backend

## ✅ Current Status

- ✅ Server is running on port 3000
- ✅ Database connected
- ✅ Test user created: `test-user-1`
- ✅ Authentication working (using `X-User-Id` header)
- ⚠️ OpenAI API key needed for AI features

## 🧪 Quick Test Commands

### 1. Health Check (No auth required)
```bash
curl http://localhost:3000/api/health
```

### 2. Metrics (Works without OpenAI)
```bash
curl -X GET "http://localhost:3000/api/metrics" \
  -H "X-User-Id: test-user-1"
```

### 3. Get Insights (Requires OpenAI API key)
```bash
curl -X GET "http://localhost:3000/api/insights?period=2024-01" \
  -H "X-User-Id: test-user-1"
```

### 4. Get Tax Opportunities (Requires OpenAI API key)
```bash
curl -X GET "http://localhost:3000/api/tax?assessmentYear=2024" \
  -H "X-User-Id: test-user-1"
```

### 5. Get Report (Works without OpenAI if data exists)
```bash
curl -X GET "http://localhost:3000/api/report?month=2024-01" \
  -H "X-User-Id: test-user-1"
```

### 6. Upload Document (Requires OpenAI API key for extraction)
```bash
curl -X POST "http://localhost:3000/api/upload" \
  -H "X-User-Id: test-user-1" \
  -F "file=@/path/to/your/receipt.pdf" \
  -F "type=receipt"
```

### 7. Chat (Requires OpenAI API key)
```bash
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{"message": "What are my total expenses?"}'
```

### 8. Generate Dispute Email (Requires OpenAI API key)
```bash
curl -X POST "http://localhost:3000/api/dispute" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{"transactionId": "transaction-id-here"}'
```

## 📝 Setup OpenAI API Key

1. Go to https://platform.openai.com/account/api-keys
2. Create a new API key
3. Update `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
4. Restart the server

## 🚀 Running the Test Script

A test script is available at `backend/test-api.sh`:

```bash
cd backend
./test-api.sh
```

Note: Requires `jq` for JSON formatting:
```bash
brew install jq
```

## 🔍 Testing Workflow

### Step 1: Test Basic Endpoints (No OpenAI needed)
```bash
# Health check
curl http://localhost:3000/api/health

# Metrics
curl -X GET "http://localhost:3000/api/metrics" -H "X-User-Id: test-user-1"
```

### Step 2: Add OpenAI API Key
1. Get API key from OpenAI
2. Add to `.env` file
3. Restart server

### Step 3: Test AI Features
```bash
# Upload a document
curl -X POST "http://localhost:3000/api/upload" \
  -H "X-User-Id: test-user-1" \
  -F "file=@receipt.jpg" \
  -F "type=receipt"

# Wait for extraction (check worker logs)
# Then test insights
curl -X GET "http://localhost:3000/api/insights?period=2024-01" \
  -H "X-User-Id: test-user-1"
```

## 🐛 Troubleshooting

### "Unauthorized" Error
- Make sure you're including the `X-User-Id` header
- Verify the user exists in the database

### "OpenAI API Error"
- Check your API key in `.env`
- Verify you have credits in your OpenAI account
- Check API rate limits

### "Database Error"
- Ensure PostgreSQL is running: `brew services list | grep postgres`
- Check database connection in `.env`

### "Redis Error"
- Ensure Redis is running: `redis-cli ping`
- Should return `PONG`

## 📊 Expected Responses

### Health Check
```json
{
  "status": "ok",
  "timestamp": "2024-01-02T...",
  "uptime": 123.45
}
```

### Metrics
```json
{
  "accuracy": {
    "extraction": 0,
    "categorization": 0,
    "taxDetection": 0
  },
  "latency": {
    "p50": 0,
    "p90": 0,
    "p99": 0
  },
  "requests": {
    "total": 0,
    "byEndpoint": {}
  }
}
```

### Insights (with data)
```json
{
  "period": "2024-01",
  "insights": [...],
  "count": 3
}
```

## 🎯 Next Steps

1. ✅ Test basic endpoints (health, metrics)
2. ⏳ Add OpenAI API key
3. ⏳ Test document upload
4. ⏳ Test extraction worker
5. ⏳ Test AI features (insights, tax, chat)

