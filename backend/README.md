# Accountable AI Backend

Express.js backend API for Accountable AI - an AI-powered Virtual Chartered Accountant.

## Features

- Document upload and extraction using OpenAI Vision API
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
- AWS S3 bucket (for document storage)
- OpenAI API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the server:
```bash
npm run dev
```

5. Start the workers (in separate terminals):
```bash
# Extraction worker
npm run worker

# Categorization worker
npm run worker:categorization
```

## Environment Variables

See `.env.example` for all required environment variables.

## API Endpoints

### Document Management
- `POST /api/upload` - Upload financial documents (PDF/images)
- `POST /api/extract` - Trigger document extraction (internal)

### Transactions
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
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/github` - GitHub OAuth login

## Architecture

- **Routes**: Express route handlers
- **Services**: Business logic and external API integrations
- **Workers**: Background job processors (BullMQ)
- **Middleware**: Authentication, validation, error handling
- **Database**: PostgreSQL with Prisma ORM

## Development

The backend uses:
- TypeScript for type safety
- Express.js for the web framework
- Prisma for database ORM
- BullMQ for job queues
- OpenAI API for AI features
- AWS S3 for file storage
- Winston for logging

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

