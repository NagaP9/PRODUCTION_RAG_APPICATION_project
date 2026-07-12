# PRODUCTION RAG App Deployment Guide

This document captures the current deployment plan for the PDF RAG application. The project is organized as a monorepo with a Next.js frontend and a FastAPI backend, and the chosen deployment split is Vercel for the frontend and Render for the backend.[1][2]

## Project structure

The intended repository layout is:

```text
PDF_RAG_APP_PRODUCTION/
  frontend/
    next-js-rag-assistant/
  backend/
    app/
```

This structure works well because Vercel can deploy the Next.js app from a subdirectory, while Render can deploy the FastAPI service from the backend folder with its own build and start commands.[3][2]

## Current .gitignore review

The existing `.gitignore` is a good start because it already excludes secrets, virtual environments, Python cache files, editor folders, and local Chroma/upload data.[4]

Recommended version:

```gitignore
# Secrets
.env
.env.*
!.env.example
*.key
*.pem

# Virtual environment
.venv/
venv/

# Python cache
__pycache__/
*.pyc

# Node / Next
node_modules/
.next/
out/

# IDE / editor
.vscode/
.idea/

# Local app data
/data/
backend/data/
data/uploads/
data/chroma/
data/chroma_db/
*.db

# OS files
.DS_Store
Thumbs.db
```

Two important additions are `node_modules/` and `.next/` for the frontend, because those should not be pushed to GitHub in a Next.js project.[1]

## Push to GitHub

Create a new empty GitHub repository without initializing it with a README, `.gitignore`, or license to avoid conflicts when pushing existing local code.[5][4]

Then run these commands from the `PDF_RAG_APP_PRODUCTION` root folder:

```bash
git init
git add .
git commit -m "Initial commit - PDF RAG app ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

If `origin` already exists, replace the remote URL instead of adding it again:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

## Frontend deployment on Vercel

Deploy the frontend to Vercel from the `frontend/next-js-rag-assistant` directory. Vercel is the natural choice for Next.js and supports subdirectory-based project roots.[1][3]

### Vercel settings

- Framework preset: Next.js
- Root directory: `frontend/next-js-rag-assistant`
- Install/build settings: Vercel usually auto-detects these for Next.js.[1][3]

### Frontend environment variable

Set this in Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND.onrender.com
```

For Next.js, browser-exposed variables need the `NEXT_PUBLIC_` prefix, and Vercel recommends configuring them in project settings for each environment.[6][7]

## Backend deployment on Render

Deploy the backend to Render as a Python Web Service from the `backend` directory. Render supports FastAPI well and provides persistent disks, which are important for uploaded files and Chroma vector data.[2][8]

### Render service settings

- Service type: Web Service
- Root directory: `backend`
- Build command:

```bash
pip install -r requirements.txt
```

- Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The import path may need adjustment if the FastAPI app object is not located at `app.main:app`, but based on the visible structure, that is the likely production start command.[2]

## Persistent storage on Render

The backend currently stores uploads and Chroma data on disk, so Render should be configured with a persistent disk. Render preserves data only under the disk mount path.[8][9]

Recommended production paths:

```env
UPLOAD_DIR=/var/data/uploads
CHROMA_PERSIST_DIR=/var/data/chroma
```

If the disk mount path you choose is different, update both variables to match that mount path exactly.[8]

## Backend production environment variables

Recommended Render environment variables:

```env
APP_NAME="PDF RAG API"
APP_ENV=production
DEBUG=false
HOST=0.0.0.0
PORT=10000

EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
CHROMA_COLLECTION_NAME=rag_documents
CHROMA_PERSIST_DIR=/var/data/chroma
RETRIEVAL_TOP_K=4
MIN_RETRIEVAL_CONFIDENCE=0.35
MAX_CONTEXT_CHUNKS=4

GROQ_API_KEY=your_real_key

UPLOAD_DIR=/var/data/uploads
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_UPLOAD_SIZE_MB=50
ALLOWED_EXTENSIONS=.pdf,.docx,.txt,.md

ALLOWED_ORIGINS=https://YOUR-FRONTEND.vercel.app

GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=180

MASK_SENSITIVE_DATA=true
ENABLE_LOW_CONFIDENCE_FALLBACK=true
STRICT_GROUNDING=true

RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

For production CORS, include only the real frontend domain instead of localhost values.[10][11]

## Deployment order

Deploy in this order:

1. Push the monorepo to GitHub.[5]
2. Create the Render backend service and configure its environment variables and persistent disk.[2][8]
3. Confirm the backend is live by opening the Render service URL and optionally checking the FastAPI docs endpoint.[12]
4. Create the Vercel project using the frontend subdirectory.[3]
5. Set `NEXT_PUBLIC_API_BASE_URL` in Vercel to the live Render backend URL.[6]
6. Redeploy the frontend after the backend URL is available.[1]

## Final checklist

- `.env` and `.env.local` are ignored by Git.
- `node_modules/` and `.next/` are ignored by Git.
- Backend root directory on Render is set correctly.
- Frontend root directory on Vercel is set correctly.
- Render persistent disk is attached.
- `UPLOAD_DIR` and `CHROMA_PERSIST_DIR` point to the persistent disk path.
- `ALLOWED_ORIGINS` uses the real Vercel domain in production.
- `NEXT_PUBLIC_API_BASE_URL` uses the real Render backend URL.
- The backend responds successfully before wiring the frontend to it.

## Notes

The app is already functioning locally with improved retrieval behavior, conservative low-confidence fallback handling, and separate frontend/backend structure suited to production deployment.