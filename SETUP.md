# Accountable AI MVP - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Database Setup

1. Create a PostgreSQL database
2. Update `backend/.env` with your `DATABASE_URL`
3. Run migrations:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 3. Redis Setup

1. Install and start Redis:
   - macOS: `brew install redis && brew services start redis`
   - Linux: `sudo apt-get install redis-server && sudo systemctl start redis`
   - Docker: `docker run -d -p 6379:6379 redis`

2. Update `backend/.env` with your `REDIS_URL` (default: `redis://localhost:6379`)

### 4. AWS S3 Setup

1. Create an S3 bucket
2. Create IAM user with S3 access
3. Update `backend/.env`:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_BUCKET`
   - `AWS_REGION`

### 5. OpenAI Setup

1. Get API key from https://platform.openai.com
2. Update `backend/.env`:
   - `OPENAI_API_KEY`

### 6. OAuth Setup (Optional for MVP)

1. **Google OAuth:**
   - Go to https://console.cloud.google.com
   - Create OAuth 2.0 credentials
   - Add callback URL: `http://localhost:3000/api/auth/google/callback`
   - Update `backend/.env`:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`

2. **GitHub OAuth:**
   - Go to https://github.com/settings/developers
   - Create OAuth App
   - Add callback URL: `http://localhost:3000/api/auth/github/callback`
   - Update `backend/.env`:
     - `GITHUB_CLIENT_ID`
     - `GITHUB_CLIENT_SECRET`

### 7. Start Services

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Extraction Worker:**
```bash
cd backend
npm run worker
```

**Terminal 3 - Categorization Worker:**
```bash
cd backend
npm run worker:categorization
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm run dev
```

### 8. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/api/health
- Prisma Studio: `cd backend && npm run prisma:studio`

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/accountable_ai?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# JWT (for production)
JWT_SECRET=your_jwt_secret_key

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/callback

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api
```

## Testing the API

### Upload a Document

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "X-User-Id: test-user-id" \
  -F "file=@/path/to/receipt.pdf" \
  -F "type=receipt"
```

### Get Tax Opportunities

```bash
curl http://localhost:3000/api/tax?assessmentYear=2024 \
  -H "X-User-Id: test-user-id"
```

### Chat with AI

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-id" \
  -d '{"message": "What are my top spending categories?"}'
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Ensure database exists

### Redis Connection Issues
- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` format

### S3 Upload Issues
- Verify AWS credentials
- Check bucket permissions
- Verify bucket name and region

### OpenAI API Issues
- Verify API key is valid
- Check API quota/limits
- Ensure sufficient credits

### Worker Not Processing Jobs
- Verify Redis connection
- Check worker logs
- Ensure worker is running

## Production Deployment

1. Set `NODE_ENV=production`
2. Use proper JWT authentication
3. Set up HTTPS
4. Configure CORS properly
5. Use environment-specific database
6. Set up monitoring and logging
7. Use process manager (PM2, systemd)
8. Set up reverse proxy (Nginx)

