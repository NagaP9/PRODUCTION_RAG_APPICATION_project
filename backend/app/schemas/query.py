from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question")

    session_id: Optional[str] = Field(
        default=None,
        description="Current session ID used for retrieval filtering",
    )

    document_id: Optional[str] = Field(
        default=None,
        description="Optional document ID to restrict retrieval to one uploaded document",
    )

    filters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional additional metadata filters",
    )


class SourceChunk(BaseModel):
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceChunk] = Field(default_factory=list)