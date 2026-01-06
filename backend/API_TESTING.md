# API Testing Guide

Complete guide for testing all backend API endpoints.

## Prerequisites

1. Backend server running on `http://localhost:3000`
2. Redis running
3. PostgreSQL database connected
4. Ollama running (if `USE_OLLAMA=true`)
5. Test user ID: `test-user-1` (or any string)

## Authentication

For local testing, use the `X-User-Id` header:
```bash
-H "X-User-Id: test-user-1"
```

## Health Check

### GET /api/health

Check if all services are running:

```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "services": {
    "database": "connected",
    "redis": "connected",
    "ollama": "running"
  }
}
```

## Document Management

### GET /api/documents

List all documents for the authenticated user:

```bash
curl http://localhost:3000/api/documents \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
[
  {
    "id": "doc-123",
    "userId": "test-user-1",
    "type": "receipt",
    "sourceUri": "local://documents/test-user-1/123.pdf",
    "mimeType": "application/pdf",
    "extractionStatus": "completed",
    "extractionProgress": 100,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/upload

Upload a financial document:

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-Id: test-user-1" \
  -F "file=@/path/to/receipt.pdf" \
  -F "type=receipt"
```

**Expected Response:**
```json
{
  "documentId": "doc-123",
  "status": "uploaded",
  "extractionStatus": "pending"
}
```

**Supported File Types:**
- PDF: `application/pdf`
- Images: `image/jpeg`, `image/png`, `image/webp`

**File Size Limit:** 10MB

### DELETE /api/documents/:id

Delete a document:

```bash
curl -X DELETE http://localhost:3000/api/documents/doc-123 \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
{
  "message": "Document deleted successfully"
}
```

## Transactions

### GET /api/transactions

List all transactions:

```bash
curl http://localhost:3000/api/transactions \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
[
  {
    "id": "tx-123",
    "userId": "test-user-1",
    "documentId": "doc-123",
    "date": "2024-01-01T00:00:00.000Z",
    "amount": 1000.50,
    "currency": "INR",
    "description": "Grocery purchase",
    "merchant": "Supermarket",
    "direction": "expense",
    "category": "groceries",
    "subCategory": null,
    "isRecurring": false,
    "labels": [],
    "confidence": 0.95
  }
]
```

### POST /api/categorize

Categorize transactions:

```bash
curl -X POST http://localhost:3000/api/categorize \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{
    "transactionIds": ["tx-123", "tx-456"]
  }'
```

**Or categorize all uncategorized transactions:**
```bash
curl -X POST http://localhost:3000/api/categorize \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{}'
```

**Expected Response:**
```json
{
  "message": "Categorization job enqueued",
  "transactionCount": 2,
  "transactionIds": ["tx-123", "tx-456"]
}
```

## Tax Opportunities

### GET /api/tax

Get tax deduction opportunities:

```bash
curl "http://localhost:3000/api/tax?assessmentYear=2024" \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
{
  "assessmentYear": "2024",
  "taxNotes": [
    {
      "id": "tax-123",
      "section": "80C",
      "title": "Life Insurance Premium",
      "potentialDeduction": 50000,
      "explanation": "You have life insurance premiums eligible for Section 80C deduction",
      "confidence": 0.9
    }
  ],
  "count": 1
}
```

## Financial Insights

### GET /api/insights

Get financial insights:

```bash
curl "http://localhost:3000/api/insights?period=2024-01" \
  -H "X-User-Id: test-user-1"
```

**With type filter:**
```bash
curl "http://localhost:3000/api/insights?period=2024-01&type=anomaly" \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
{
  "period": "2024-01",
  "insights": [
    {
      "id": "insight-123",
      "type": "spending_velocity",
      "summary": "Your spending increased by 20% this month",
      "eli5": "You spent more money this month than usual",
      "explanation": "Detailed explanation...",
      "confidence": 0.85
    }
  ],
  "count": 1
}
```

**Insight Types:**
- `spending_velocity` - Spending patterns
- `anomaly` - Unusual transactions
- `payment_tip` - Payment optimization tips
- `trend` - Spending trends

## Monthly Reports

### GET /api/report

Generate monthly report:

```bash
curl "http://localhost:3000/api/report?month=2024-01" \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
{
  "id": "report-123",
  "userId": "test-user-1",
  "month": "2024-01",
  "totals": {
    "income": 50000,
    "expense": 30000,
    "net": 20000,
    "byCategory": {
      "groceries": 10000,
      "transportation": 5000
    }
  },
  "highlights": [
    "Positive cash flow of ₹20000.00 this month",
    "Top spending category: groceries (₹10000.00)"
  ],
  "insights": [...],
  "taxNotes": [...]
}
```

## Chat

### POST /api/chat

Chat with AI about finances:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{
    "message": "What are my top spending categories?",
    "conversationId": "conv-123"
  }'
```

**Expected Response:**
```json
{
  "message": "Based on your transactions, your top spending categories are...",
  "conversationId": "conv-123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Dispute Emails

### POST /api/dispute

Generate dispute email draft:

```bash
curl -X POST http://localhost:3000/api/dispute \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{
    "transactionId": "tx-123",
    "reason": "Unauthorized charge"
  }'
```

**Expected Response:**
```json
{
  "transactionId": "tx-123",
  "email": {
    "subject": "Dispute: Unauthorized Charge",
    "body": "Dear Merchant,\n\nI am writing to dispute...",
    "recipient": "support@merchant.com"
  },
  "status": "draft",
  "note": "Please review and edit the email before sending."
}
```

## Metrics

### GET /api/metrics

Get system metrics:

```bash
curl http://localhost:3000/api/metrics \
  -H "X-User-Id: test-user-1"
```

**Expected Response:**
```json
{
  "accuracy": {
    "extraction": 0.92,
    "categorization": 0.88,
    "taxDetection": 0.85
  },
  "latency": {
    "p50": 150,
    "p90": 500,
    "p99": 1000
  },
  "requests": {
    "total": 1000,
    "byEndpoint": {
      "/api/upload": 50,
      "/api/chat": 200
    }
  }
}
```

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message",
  "statusCode": 400
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

## Testing Workflow

1. **Check Health:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Upload a Document:**
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -H "X-User-Id: test-user-1" \
     -F "file=@receipt.jpg" \
     -F "type=receipt"
   ```

3. **Wait for Extraction** (check document status):
   ```bash
   curl http://localhost:3000/api/documents \
     -H "X-User-Id: test-user-1"
   ```

4. **View Transactions:**
   ```bash
   curl http://localhost:3000/api/transactions \
     -H "X-User-Id: test-user-1"
   ```

5. **Categorize Transactions:**
   ```bash
   curl -X POST http://localhost:3000/api/categorize \
     -H "Content-Type: application/json" \
     -H "X-User-Id: test-user-1" \
     -d '{}'
   ```

6. **Get Insights:**
   ```bash
   curl "http://localhost:3000/api/insights?period=2024-01" \
     -H "X-User-Id: test-user-1"
   ```

7. **Get Tax Opportunities:**
   ```bash
   curl "http://localhost:3000/api/tax?assessmentYear=2024" \
     -H "X-User-Id: test-user-1"
   ```

8. **Chat with AI:**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -H "X-User-Id: test-user-1" \
     -d '{"message": "Summarize my finances"}'
   ```

## Troubleshooting

### Ollama Not Running

If `USE_OLLAMA=true` but Ollama is not running:

```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Database Connection Error

Check your `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/accountable_ai?schema=public"
```

### Worker Not Processing Jobs

Make sure the worker is running:
```bash
cd backend
npm run worker
```

Check worker logs for errors.
