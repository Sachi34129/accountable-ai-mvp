## Accountable AI — Hackathon MVP (CA‑Grade Accounting + Tax v1)

Accountable AI is an **AI‑assisted**, **audit‑safe** accounting & tax assistant for India.  
It is designed with “CA‑grade” principles: **conservative automation**, **traceability**, and **no silent inference**.

### What this MVP does
- **Document → OCR → transactions**: Upload PDFs/images (≤ **1MB**) and extract transactions using **OCR.Space** + **Gemini**.
- **Staging → review → commit**: All extracted data lands in **staged imports**. You review/correct categories before committing.
- **CA‑grade categorization**: Deterministic rules first, AI only as a conservative fallback. Produces **confidence + explanation**.
- **Audit log**: Manual overrides produce an **audit trail**.
- **Multi‑Business support**: Transactions are isolated per **Business** (backend model: `Entity`) with multi‑GSTIN support.
- **Chat with your books**: Chat endpoint reads from persisted transactions per business (`X-Entity-Id`).
- **Real dashboard numbers**: Analytics, “health score”, and reports are backed by real data.
- **Tax Compliance v1 (Form 16 → ITR worksheet)**: Upload Form 16, extract fields (OCR + Gemini), run deterministic validations, compute a reproducible draft worksheet and CA handoff pack.

---

## Tech stack
- **Frontend**: React + Vite + TypeScript + Tailwind
- **Backend**: Node.js + Express + TypeScript
- **DB**: PostgreSQL + Prisma
- **OCR**: OCR.Space (`OCR_API_KEY`)
- **LLM**: Open-AI (`OPENAI_API_KEY`)

---

## Repo structure
- `frontend/` — Vite React UI
- `backend/` — Express API + Prisma schema/migrations

---

## Local development (recommended)

### Prerequisites
- Node.js 18+
- PostgreSQL

### 1) Install
```bash
npm install
```

### 2) Backend env (`backend/.env`)
Create `backend/.env`:
```env
NODE_ENV=development
PORT=3000

# Comma-separated allowlist for CORS (dev + prod)
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/accountable_ai?schema=public

# OCR + LLM
OCR_API_KEY=your_ocr_space_key
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-flash

# OAuth (optional locally, required for production Google login)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OAUTH_CALLBACK_URL=http://localhost:3000/api/auth
```

### 3) Migrate DB
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 4) Run
```bash
# Terminal A
cd backend
npm run dev

# Terminal B
cd frontend
npm run dev
```

Open:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/health`

---

## Key product flows

### Accounting: Upload a document (PDF/image)
1. Select a **Business** in the UI.
2. Upload a document (≤ **1MB**).
3. The backend runs OCR + extraction and creates a **staged import**.
4. Review in the “Review Queue”, override categories if needed.
5. Click **Commit** to finalize.

### Tax: Form 16 → ITR Computation v1
1. Upload Form 16 (PDF).
2. Extract fields (OCR + Gemini) and run deterministic validations.
3. Compute a reproducible draft worksheet (old/new regime).
4. Export a **CA handoff pack** (JSON) with provenance.

---

## API notes (important)
- Auth is **cookie‑based sessions** (httpOnly cookie `session`) with DB‑backed sessions.
- Multi‑business scoping uses header: **`X-Entity-Id`** (frontend sets it automatically).
- Upload limits: **1MB** (enforced server‑side).

Logs (local dev):
- `backend/logs/combined.log`
- `backend/logs/error.log`

---

## Deployment (Railway backend + Vercel frontend)

### Backend on Railway
1. Push this repo to GitHub.
2. Railway → **New Project → Deploy from GitHub**.
3. Set **Root Directory** to `backend`.
4. Add **Postgres plugin** (Railway will set `DATABASE_URL`).
5. Set Railway **Variables**:
```env
NODE_ENV=production
PORT=3000

# Allow your Vercel domain for CORS
FRONTEND_URL=https://YOUR_VERCEL_DOMAIN

# IMPORTANT: force Google OAuth callback to go via Vercel /api/*
OAUTH_CALLBACK_URL=https://YOUR_VERCEL_DOMAIN/api/auth

OCR_API_KEY=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```
6. Railway → Settings → **Start Command**:
```bash
npm run railway:start
```
(This runs `prisma migrate deploy` then starts the server.)

### Frontend on Vercel
1. Vercel → **New Project** → import repo.
2. Set **Root Directory** to `frontend`.
3. Deploy.

### Wire `/api/*` from Vercel → Railway
Edit `frontend/vercel.json` and replace:
`https://REPLACE_WITH_YOUR_RAILWAY_BACKEND_DOMAIN`
with your Railway backend domain (example: `https://xxxx.up.railway.app`).

### Google OAuth (production)
Google Cloud Console → OAuth client:
- Authorized JavaScript origin: `https://YOUR_VERCEL_DOMAIN`
- Authorized redirect URI: `https://YOUR_VERCEL_DOMAIN/api/auth/google/callback`

---

## Testing tips (fast)
- Start with **clear PDFs** (receipts/invoices/statements). Avoid blurry photos.
- If OCR returns empty text, try a cleaner scan.
- If “stuck” behavior happens, check `backend/logs/error.log`.

---

## Hackathon highlights
- Conservative CA‑grade automation: **no guessing**, low‑confidence goes to review.
- Full traceability: raw + normalized + categorization + audit logs.
- Multi‑business isolation + GSTIN support.
- Tax module designed so LLM **never computes final tax** — it extracts and explains; computation is deterministic.

