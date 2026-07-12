# backend/app/api/routes/health.py

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health():
    # Simple liveness-style endpoint used to confirm the API is up.
    return {
        "status": "ok",
        "service": "rag-backend",
    }