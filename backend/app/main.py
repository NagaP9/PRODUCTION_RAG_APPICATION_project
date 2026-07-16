from contextlib import asynccontextmanager
from fastapi import FastAPI

from backend.app.api.routes.upload import router as upload_router
from backend.app.api.routes.query import router as query_router
from backend.app.services.rag_service import get_embeddings, get_vectorstore


@asynccontextmanager
async def lifespan(app: FastAPI):
    embeddings = get_embeddings()
    vectorstore = get_vectorstore(embeddings)

    app.state.embeddings = embeddings
    app.state.vectorstore = vectorstore

    embeddings.embed_query("startup warmup")
    yield


app = FastAPI(
    title="PDF RAG API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(upload_router)
app.include_router(query_router)


@app.get("/")
async def root():
    return {"message": "PDF RAG API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}