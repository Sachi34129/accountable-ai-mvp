#!/bin/bash

# Test API endpoints
BASE_URL="http://localhost:3000/api"
USER_ID="test-user-1"

echo "🧪 Testing Accountable AI Backend API"
echo "======================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
curl -s "$BASE_URL/health" | jq .
echo ""
echo ""

# Test 2: Get Insights (should return empty initially)
echo "2️⃣  Testing Insights Endpoint..."
curl -s -X GET "$BASE_URL/insights?period=2024-01" \
  -H "X-User-Id: $USER_ID" | jq .
echo ""
echo ""

# Test 3: Get Tax Opportunities
echo "3️⃣  Testing Tax Endpoint..."
curl -s -X GET "$BASE_URL/tax?assessmentYear=2024" \
  -H "X-User-Id: $USER_ID" | jq .
echo ""
echo ""

# Test 4: Get Report
echo "4️⃣  Testing Report Endpoint..."
curl -s -X GET "$BASE_URL/report?month=2024-01" \
  -H "X-User-Id: $USER_ID" | jq .
echo ""
echo ""

# Test 5: Chat (requires OpenAI API key)
echo "5️⃣  Testing Chat Endpoint..."
curl -s -X POST "$BASE_URL/chat" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{"message": "What are my total expenses?"}' | jq .
echo ""
echo ""

# Test 6: Metrics
echo "6️⃣  Testing Metrics Endpoint..."
curl -s -X GET "$BASE_URL/metrics" \
  -H "X-User-Id: $USER_ID" | jq .
echo ""
echo ""

echo "✅ Testing complete!"
echo ""
echo "📝 To test file upload, use:"
echo "curl -X POST $BASE_URL/upload \\"
echo "  -H 'X-User-Id: $USER_ID' \\"
echo "  -F 'file=@/path/to/your/receipt.pdf' \\"
echo "  -F 'type=receipt'"

