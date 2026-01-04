# Accountable AI MVP

An AI-powered Virtual Chartered Accountant that helps users understand, manage, and optimize their personal finances using explainable, accountable, and user-friendly AI.

## Project Structure

- `backend/` - Express.js API server with all core endpoints
- `frontend/` - React frontend application

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- AWS S3 bucket (for document storage)

### Environment Setup

1. Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories
2. Fill in all required environment variables

### Installation

```bash
npm install
```

### Development

```bash
# Run both backend and frontend
npm run dev

# Or run separately
npm run dev:backend
npm run dev:frontend
```

## Core APIs

- `POST /api/upload` - Upload financial documents
- `POST /api/categorize` - Categorize transactions
- `GET /api/tax` - Get tax deduction opportunities
- `GET /api/insights` - Get financial insights
- `GET /api/report` - Generate monthly reports
- `POST /api/chat` - Chat interface for Q&A
- `POST /api/dispute` - Generate dispute emails
- `GET /api/metrics` - Get system metrics

