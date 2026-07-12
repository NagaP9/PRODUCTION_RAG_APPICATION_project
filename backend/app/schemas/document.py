from typing import Optional
from pydantic import BaseModel, Field


class DocumentInfo(BaseModel):
    # Represents one indexed file in the backend response/UI metadata
    file_name: str = Field(..., description="Original file name")
    file_path: str = Field(..., description="Stored file path")
    session_id: str = Field(..., description="Owning session ID")
    document_id: str = Field(..., description="Stable document identifier")
    pages: Optional[int] = Field(default=None, description="Page count if known")
    chunks: int = Field(..., description="Number of vectorized chunks")
    status: str = Field(default="indexed", description="Current indexing state")