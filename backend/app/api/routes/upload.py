import re
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile

from backend.app.core.config import settings
from backend.app.services.ingest_service import ingest_document_file

router = APIRouter(prefix="/api", tags=["upload"])


def _session_dir(session_id: str) -> Path:
    # Keep each session's uploads isolated in its own folder.
    path = Path(settings.upload_dir) / session_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _sanitize_filename(filename: str) -> str:
    """
    Remove unsafe characters from the original filename.
    We keep the name readable, but do not trust the raw browser-supplied value.
    """
    if not filename:
        return "uploaded_file"

    cleaned = re.sub(r'[/\\:*?"<>|\x00-\x1F]+', "_", filename).strip()
    return cleaned or "uploaded_file"


def _validate_extension(filename: str) -> None:
    # Only allow extensions configured in settings.
    ext = Path(filename).suffix.lower()
    if ext not in settings.allowed_extension_list:
        allowed = ", ".join(settings.allowed_extension_list)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed types: {allowed}",
        )


def _validate_content_length(content_length: int | None) -> None:
    """
    Pre-check upload size using Content-Length when the client provides it.
    This is not perfect, but it catches many oversized uploads early.
    """
    if content_length is None:
        return

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if content_length > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max allowed size is {settings.max_upload_size_mb} MB.",
        )


async def _save_upload_file(file: UploadFile, destination: Path) -> None:
    """
    Save the uploaded file in chunks instead of reading everything into memory.
    This is safer for larger files.
    """
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    total_written = 0

    with destination.open("wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)  # 1 MB chunks
            if not chunk:
                break

            total_written += len(chunk)
            if total_written > max_bytes:
                # Remove partial file if it exceeded the allowed limit
                buffer.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Max allowed size is {settings.max_upload_size_mb} MB.",
                )

            buffer.write(chunk)

    await file.close()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    content_length: int | None = Header(default=None),
):
    """
    Upload a file into a brand-new session.
    The backend creates a session_id automatically and immediately ingests the file.
    """
    try:
        _validate_content_length(content_length)

        original_name = _sanitize_filename(file.filename or "uploaded_file")
        _validate_extension(original_name)

        session_id = uuid.uuid4().hex
        upload_dir = _session_dir(session_id)

        # Use a generated prefix so files never overwrite each other
        file_path = upload_dir / f"{uuid.uuid4().hex}_{original_name}"

        await _save_upload_file(file, file_path)

        result = ingest_document_file(str(file_path), session_id=session_id)

        return {
            "session_id": session_id,
            "result": result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(exc)}")


@router.post("/sessions/{session_id}/upload")
async def upload_document_to_session(
    session_id: str,
    file: UploadFile = File(...),
    content_length: int | None = Header(default=None),
):
    """
    Upload a file into an existing session.
    This is useful when the same chat/session should contain multiple documents.
    """
    try:
        if not session_id.strip():
            raise HTTPException(status_code=400, detail="session_id is required")

        _validate_content_length(content_length)

        original_name = _sanitize_filename(file.filename or "uploaded_file")
        _validate_extension(original_name)

        upload_dir = _session_dir(session_id)
        file_path = upload_dir / f"{uuid.uuid4().hex}_{original_name}"

        await _save_upload_file(file, file_path)

        result = ingest_document_file(str(file_path), session_id=session_id)

        return {
            "session_id": session_id,
            "result": result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(exc)}")