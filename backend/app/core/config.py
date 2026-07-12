from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field("PDF RAG API", alias="APP_NAME")
    app_env: str = Field("development", alias="APP_ENV")
    debug: bool = Field(True, alias="DEBUG")

    host: str = Field("127.0.0.1", alias="HOST")
    port: int = Field(8000, alias="PORT")

    embedding_model_name: str = Field(
        "sentence-transformers/all-MiniLM-L6-v2",
        alias="EMBEDDING_MODEL_NAME",
    )

    chroma_collection_name: str = Field(
        "rag_documents",
        alias="CHROMA_COLLECTION_NAME",
    )

    chroma_persist_directory: str = Field(
        "./data/chroma",
        alias="CHROMA_PERSIST_DIR",
    )

    retrieval_top_k: int = Field(4, alias="RETRIEVAL_TOP_K")
    min_retrieval_confidence: float = Field(0.35, alias="MIN_RETRIEVAL_CONFIDENCE")
    max_context_chunks: int = Field(4, alias="MAX_CONTEXT_CHUNKS")

    upload_dir: str = Field("./data/uploads", alias="UPLOAD_DIR")
    chunk_size: int = Field(1000, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(200, alias="CHUNK_OVERLAP")
    max_upload_size_mb: int = Field(50, alias="MAX_UPLOAD_SIZE_MB")
    allowed_extensions: str = Field(".pdf,.docx,.txt,.md", alias="ALLOWED_EXTENSIONS")

    cors_origins: str = Field(
        "http://localhost:3000,http://127.0.0.1:3000",
        alias="ALLOWED_ORIGINS",
    )

    groq_api_key: str = Field("", alias="GROQ_API_KEY")
    groq_base_url: str = Field("https://api.groq.com/openai/v1", alias="GROQ_BASE_URL")
    groq_model: str = Field("llama-3.3-70b-versatile", alias="GROQ_MODEL")

    llm_temperature: float = Field(0.0, alias="LLM_TEMPERATURE")
    llm_max_tokens: int = Field(180, alias="LLM_MAX_TOKENS")

    mask_sensitive_data: bool = Field(True, alias="MASK_SENSITIVE_DATA")
    enable_low_confidence_fallback: bool = Field(
        True,
        alias="ENABLE_LOW_CONFIDENCE_FALLBACK",
    )
    strict_grounding: bool = Field(True, alias="STRICT_GROUNDING")

    rate_limit_enabled: bool = Field(True, alias="RATE_LIMIT_ENABLED")
    rate_limit_requests_per_minute: int = Field(
        60,
        alias="RATE_LIMIT_REQUESTS_PER_MINUTE",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_extension_list(self) -> list[str]:
        return [ext.strip().lower() for ext in self.allowed_extensions.split(",") if ext.strip()]


settings = Settings()