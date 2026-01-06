# Accountable AI Backend

Express.js backend API for Accountable AI - an AI-powered Virtual Chartered Accountant.

## Features

- Document upload and extraction using **local Ollama models** (or OpenAI Vision API)
- Transaction categorization with AI explanations
- Tax deduction opportunity detection
- Financial insights generation
- Monthly report generation
- Chat interface for financial Q&A
- Dispute email generation
- System metrics and telemetry

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (for BullMQ queues)
- **Ollama** (for local AI processing) OR OpenAI API key
- Local file storage (no cloud dependencies required)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/accountable_ai?schema=public"

# Redis (for job queues)
REDIS_URL="redis://localhost:6379"

# AI Configuration - Use Ollama for local processing
USE_OLLAMA=true
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_VISION_MODEL="llava:latest"
OLLAMA_TEXT_MODEL="llama3:latest"

# OR use OpenAI (set USE_OLLAMA=false)
# OPENAI_API_KEY="your_openai_api_key"

# Server Configuration
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# File Storage (local)
UPLOAD_DIR="./uploads"
```

### 3. Set Up Ollama (Recommended for Local Development)

1. **Install Ollama**: Download from https://ollama.ai
2. **Start Ollama server**:
   ```bash
   ollama serve
   ```
3. **Download required models**:
   ```bash
   # Vision model for document extraction
   ollama pull llava:latest
   
   # Text model for categorization, insights, chat
   ollama pull llama3:latest
   ```
4. **Verify Ollama is running**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

See [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) for detailed instructions.

### 4. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 5. Start Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis
```

**Windows:**
Download Redis from https://redis.io/download or use WSL.

### 6. Start the Backend

**Terminal 1 - Backend Server:**
```bash
npm run dev
```

**Terminal 2 - Extraction Worker:**
```bash
npm run worker
```

**Terminal 3 - Categorization Worker (optional):**
```bash
npm run worker:categorization
```

### 7. Verify Setup

Check health endpoint:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ollama": "running"
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection URL |
| `USE_OLLAMA` | No | `false` | Set to `true` to use local Ollama models |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_VISION_MODEL` | No | `llava:latest` | Vision model for document extraction |
| `OLLAMA_TEXT_MODEL` | No | `llama3:latest` | Text model for other AI tasks |
| `OPENAI_API_KEY` | No* | - | Required if `USE_OLLAMA=false` |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL for CORS |
| `UPLOAD_DIR` | No | `./uploads` | Local file storage directory |

*Required if not using Ollama

## API Endpoints

### Health & Status
- `GET /api/health` - Health check with service status

### Document Management
- `GET /api/documents` - List all documents (requires auth)
- `POST /api/upload` - Upload financial documents (PDF/images)
- `DELETE /api/documents/:id` - Delete a document

### Transactions
- `GET /api/transactions` - List transactions (requires auth)
- `POST /api/categorize` - Categorize transactions with AI

### Tax
- `GET /api/tax?assessmentYear=2024` - Get tax deduction opportunities

### Insights
- `GET /api/insights?period=2024-01&type=anomaly` - Get financial insights

### Reports
- `GET /api/report?month=2024-01` - Generate monthly report

### Chat
- `POST /api/chat` - Chat with AI about finances

### Disputes
- `POST /api/dispute` - Generate dispute email drafts

### Metrics
- `GET /api/metrics` - Get system metrics

### Authentication
- `GET /api/auth/google` - Google OAuth login (optional)
- `GET /api/auth/github` - GitHub OAuth login (optional)

## Testing APIs

### Using curl

**1. Health Check:**
```bash
curl http://localhost:3000/api/health
```

**2. Upload Document:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-Id: test-user-1" \
  -F "file=@/path/to/receipt.pdf" \
  -F "type=receipt"
```

**3. List Documents:**
```bash
curl http://localhost:3000/api/documents \
  -H "X-User-Id: test-user-1"
```

**4. List Transactions:**
```bash
curl http://localhost:3000/api/transactions \
  -H "X-User-Id: test-user-1"
```

**5. Categorize Transactions:**
```bash
curl -X POST http://localhost:3000/api/categorize \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{"transactionIds": []}'
```

**6. Get Tax Opportunities:**
```bash
curl "http://localhost:3000/api/tax?assessmentYear=2024" \
  -H "X-User-Id: test-user-1"
```

**7. Get Insights:**
```bash
curl "http://localhost:3000/api/insights?period=2024-01" \
  -H "X-User-Id: test-user-1"
```

**8. Generate Report:**
```bash
curl "http://localhost:3000/api/report?month=2024-01" \
  -H "X-User-Id: test-user-1"
```

**9. Chat with AI:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{"message": "What are my top spending categories?"}'
```

**10. Generate Dispute Email:**
```bash
curl -X POST http://localhost:3000/api/dispute \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-1" \
  -d '{"transactionId": "transaction-id-here", "reason": "Unauthorized charge"}'
```

**11. Get Metrics:**
```bash
curl http://localhost:3000/api/metrics \
  -H "X-User-Id: test-user-1"
```

### Authentication

For local development/testing, use the `X-User-Id` header:
```bash
-H "X-User-Id: your-user-id"
```

In production, use Bearer token:
```bash
-H "Authorization: Bearer your-jwt-token"
```

## Architecture

- **Routes**: Express route handlers for all API endpoints
- **Services**: Business logic and AI integrations (Ollama/OpenAI)
- **Workers**: Background job processors (BullMQ) for async tasks
- **Middleware**: Authentication, validation, error handling, rate limiting
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Local file storage (no cloud dependencies)

## Development

The backend uses:
- **TypeScript** for type safety
- **Express.js** for the web framework
- **Prisma** for database ORM
- **BullMQ** for job queues (requires Redis)
- **Ollama** for local AI processing (recommended)
- **OpenAI API** as alternative AI provider
- **Local file storage** (no AWS S3 required)
- **Winston** for logging

## Project Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic & AI integrations
│   ├── workers/         # Background job processors
│   ├── middleware/      # Auth, validation, error handling
│   ├── db/              # Database configuration
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── prisma/              # Database schema & migrations
├── uploads/              # Local file storage
└── logs/                 # Application logs
```

## Production

Build for production:
```bash
npm run build
npm start
```

Use Docker:
```bash
docker build -t accountable-ai-backend .
docker run -p 3000:3000 accountable-ai-backend
```

## Troubleshooting

### Ollama Not Running

If you see errors about Ollama not being accessible:

1. **Start Ollama:**
   ```bash
   ollama serve
   ```

2. **Verify it's running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. **Check your `.env` file:**
   ```env
   USE_OLLAMA=true
   OLLAMA_BASE_URL=http://localhost:11434
   ```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
redis-server
```

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in `.env`
3. Run migrations: `npm run prisma:migrate`

### Worker Not Processing Jobs

1. Make sure worker is running: `npm run worker`
2. Check Redis connection
3. Check worker logs for errors
4. Verify `.env` is loaded (worker loads it automatically)

## Additional Documentation

- [API Testing Guide](./API_TESTING.md) - Complete API testing examples
- [Ollama Setup](./OLLAMA_SETUP.md) - Detailed Ollama configuration
- [Testing Guide](./TESTING.md) - General testing instructions

## Support

For issues or questions:
1. Check the health endpoint: `GET /api/health`
2. Review logs in `logs/` directory
3. Check worker status and logs
4. Verify all services are running (PostgreSQL, Redis, Ollama)
