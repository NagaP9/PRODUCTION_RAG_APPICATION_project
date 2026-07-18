import logging

from fastapi import APIRouter, HTTPException

from backend.app.schemas.query import QueryRequest, QueryResponse
from backend.app.services.rag_service import answer_question


logger = logging.getLogger("lumen-backend")

router = APIRouter(prefix="/api", tags=["query"])


@router.post("/query", response_model=QueryResponse)
async def query_documents(payload: QueryRequest):
    """
    Query indexed documents using session-aware and optional document-aware retrieval.
    """
    try:
        result = answer_question(
            query=payload.query,
            session_id=payload.session_id,
            document_id=payload.document_id,
            filters=payload.filters,
        )
        return QueryResponse(**result)

    except ValueError as exc:
        logger.exception(
            "Query validation failed for session=%s document_id=%s query=%s",
            payload.session_id,
            payload.document_id,
            payload.query,
        )
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception as exc:
        logger.exception(
            "Query failed for session=%s document_id=%s query=%s",
            payload.session_id,
            payload.document_id,
            payload.query,
        )
        raise HTTPException(status_code=500, detail=f"Query failed: {str(exc)}")