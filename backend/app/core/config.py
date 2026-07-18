from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    app_name: str = "PDF RAG API"
    app_version: str = "1.0.0"
    debug: bool = False

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.1-8b-instant"
    llm_max_tokens: int = 300

    chroma_persist_directory: str = "./chroma_db"
    chroma_collection_name: str = "documents"

    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_batch_size: int = 16

    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50
    allowed_extensions: str = ".pdf,.txt,.md,.docx"

    chunk_size: int = 1000
    chunk_overlap: int = 150

    retrieval_top_k: int = 3
    retrieval_candidate_k: int = 12
    max_context_chunks: int = 3

    min_retrieval_confidence: float = 0.45
    enable_low_confidence_fallback: bool = False
    mask_sensitive_data: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_extension_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.allowed_extensions.split(",") if ext.strip()]


settings = Settings()