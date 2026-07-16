from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    document_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class SourceMetadataResponse(BaseModel):
    file_name: Optional[str] = None
    document_id: Optional[str] = None
    page: Optional[int] = None
    section: Optional[str] = None
    heading: Optional[str] = None
    score: Optional[float] = None


class SourceResponse(BaseModel):
    content: str
    metadata: SourceMetadataResponse


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceResponse]