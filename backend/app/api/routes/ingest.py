from pathlib import Path
import re
import shutil
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.app.schemas.ingest import IngestResponse
from backend.app.services.ingest_service import ingest_document_file

router = APIRouter(prefix="/ingest", tags=["Ingest"])


def _project_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _uploads_dir() -> Path:
    upload_dir = _project_root() / "backend" / "data" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _safe_filename(filename: str) -> str:
    cleaned = (filename or "document").strip()
    cleaned = cleaned.replace("\\", "/").split("/")[-1]
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", cleaned)
    cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-")
    return cleaned or "document"


@router.post("", response_model=IngestResponse)
async def ingest(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    document_id: str | None = Form(default=None),
) -> IngestResponse:
    try:
        filename = _safe_filename(file.filename or f"{uuid.uuid4().hex}.bin")
        upload_dir = _uploads_dir()

        suffix = Path(filename).suffix.lower()
        if suffix not in {".pdf", ".docx", ".txt", ".md"}:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

        stored_name = f"{uuid.uuid4().hex}_{filename}"
        stored_path = upload_dir / stored_name

        with stored_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = ingest_document_file(
            file_path=str(stored_path),
            session_id=session_id,
            document_id=document_id,
        )

        return IngestResponse(
            message=result["detail"],
            num_documents=result["documents"],
            num_chunks=result["chunks"],
            metadata={
                "file_path": result["file_path"],
                "file_name": result["file_name"],
                "document_id": result["document_id"],
                "session_id": result["session_id"],
                "file_hash": result["file_hash"],
                "status": result["status"],
            },
        )

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(exc)}")

    finally:
        await file.close()