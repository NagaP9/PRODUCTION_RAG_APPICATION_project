from typing import Any, Dict
from pydantic import BaseModel, Field


class IngestResponse(BaseModel):
    message: str
    num_documents: int
    num_chunks: int
    metadata: Dict[str, Any] = Field(default_factory=dict)