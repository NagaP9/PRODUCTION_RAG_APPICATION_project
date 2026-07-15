from pathlib import Path
from typing import Dict, List
import hashlib
import logging
import re
import uuid

from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.app.core.config import settings
from backend.app.services.rag_service import get_vectorstore

logger = logging.getLogger("lumen-backend")


SECTION_PATTERNS = [
    ("document overview", "document_overview"),
    ("company profile", "company_profile"),
    ("founder and contact details", "contacts"),
    ("office locations", "office_locations"),
    ("product modules", "product_modules"),
    ("technical stack", "technical_stack"),
    ("release timeline", "release_timeline"),
    ("upload rules", "upload_rules"),
    ("retrieval rules", "retrieval_rules"),
    ("security notes", "security_notes"),
    ("hr policy snippet", "hr_policy"),
    ("travel policy snippet", "travel_policy"),
    ("incident log", "incident_log"),
    ("incident response policy", "incident_log"),
    ("incident response", "incident_log"),
    ("project notes", "project_notes"),
    ("faq", "faq"),
    ("negative test section", "negative_test"),
    ("summary paragraph", "summary"),
]


def _normalize_path(file_path: str) -> Path:
    path = Path(file_path).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    return path.resolve()


def _validate_file(file_path: Path) -> None:
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if not file_path.is_file():
        raise ValueError(f"Path is not a file: {file_path}")
    if file_path.suffix.lower() not in settings.allowed_extension_list:
        raise ValueError(f"Unsupported file type: {file_path.suffix.lower()}")


def _load_document(file_path: str):
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        return PyPDFLoader(file_path).load()
    if suffix == ".docx":
        return Docx2txtLoader(file_path).load()
    if suffix in {".txt", ".md"}:
        return TextLoader(file_path, encoding="utf-8").load()
    raise ValueError(f"Unsupported file type: {suffix}")


def _hash_file(file_path: Path) -> str:
    sha256 = hashlib.sha256()
    with file_path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def _normalize_extracted_text(text: str) -> str:
    if not text:
        return ""

    replacements = {
        "\ufb01": "fi",
        "\ufb02": "fl",
        "\ufb03": "ffi",
        "\ufb04": "ffl",
        "\ufb05": "ft",
        "\ufb06": "st",
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00a0": " ",
        "\u200b": "",
        "\ufeff": "",
    }

    cleaned = text
    for bad, good in replacements.items():
        cleaned = cleaned.replace(bad, good)

    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"(?<!\n)-\n([a-z])", r"\1", cleaned)
    cleaned = re.sub(r"(?<![.!?:\n])\n(?!\n)", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)

    return cleaned.strip()


def _mask_sensitive_text(text: str) -> str:
    if not text or not settings.mask_sensitive_data:
        return text

    patterns = [
        (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "[REDACTED_EMAIL]"),
        (r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\d{10,12})\b", "[REDACTED_PHONE]"),
        (r"\b(?:\d[ -]*?){12,19}\b", "[REDACTED_NUMBER]"),
    ]

    masked = text
    for pattern, replacement in patterns:
        masked = re.sub(pattern, replacement, masked)

    return masked


def _guess_section_label(text: str) -> str:
    lowered = (text or "").lower()
    for label, normalized in SECTION_PATTERNS:
        if label in lowered:
            return normalized
    return "general"


def _extract_primary_heading(text: str) -> str:
    if not text:
        return "general"

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return "general"

    for line in lines[:8]:
        if len(line) <= 100 and not line.endswith("."):
            return line

    return lines[0][:100]


def _extract_chunk_keywords(text: str) -> List[str]:
    if not text:
        return []

    tokens = re.findall(r"[A-Za-z][A-Za-z0-9\-/]{2,}", text.lower())
    stopwords = {
        "the", "and", "for", "with", "that", "this", "from", "into", "have", "has",
        "will", "your", "what", "when", "where", "which", "their", "about", "there",
        "they", "them", "than", "then", "been", "being", "were", "also", "such",
    }

    seen = []
    for token in tokens:
        if token in stopwords:
            continue
        if token not in seen:
            seen.append(token)
        if len(seen) >= 25:
            break

    return seen


def _stable_chunk_id(document_id: str, page: int, chunk_index: int) -> str:
    return f"{document_id}:p{page}:c{chunk_index}"


def _prepare_documents_metadata(
    docs,
    *,
    session_id: str,
    file_path: Path,
    document_id: str,
    file_hash: str,
) -> None:
    for page_index, doc in enumerate(docs, start=1):
        cleaned_text = _normalize_extracted_text(doc.page_content)
        doc.page_content = cleaned_text

        metadata = dict(doc.metadata or {})
        metadata["session_id"] = session_id
        metadata["document_id"] = document_id
        metadata["file_name"] = file_path.name
        metadata["source"] = metadata.get("source") or file_path.name
        metadata["file_path"] = str(file_path)
        metadata["file_hash"] = file_hash
        metadata["page"] = int(metadata.get("page", page_index))
        metadata["section"] = _guess_section_label(cleaned_text)
        metadata["heading"] = _extract_primary_heading(cleaned_text)

        doc.metadata = metadata


def _split_documents(docs) -> List:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            ". ",
            "? ",
            "! ",
            "; ",
            ", ",
            " ",
            "",
        ],
    )
    return splitter.split_documents(docs)


def _prepare_chunks_for_storage(split_docs: List) -> List[str]:
    ids: List[str] = []

    for chunk_index, doc in enumerate(split_docs, start=1):
        cleaned_chunk = _normalize_extracted_text(doc.page_content)
        masked_chunk = _mask_sensitive_text(cleaned_chunk)
        doc.page_content = masked_chunk

        metadata = dict(doc.metadata or {})
        metadata["chunk_index"] = chunk_index
        metadata["source"] = metadata.get("source") or metadata.get("file_name") or "Unknown document"
        metadata["section"] = metadata.get("section") or _guess_section_label(masked_chunk)
        metadata["heading"] = metadata.get("heading") or _extract_primary_heading(masked_chunk)
        metadata["char_length"] = len(masked_chunk)
        metadata["keywords"] = _extract_chunk_keywords(masked_chunk)

        page = int(metadata.get("page", 0))
        document_id = str(metadata.get("document_id", "unknown"))
        stable_id = _stable_chunk_id(document_id, page, chunk_index)
        metadata["chunk_id"] = stable_id

        doc.metadata = metadata
        ids.append(stable_id)

    return ids


def _delete_existing_file_chunks(session_id: str, file_name: str) -> None:
    vectorstore = get_vectorstore()

    try:
        existing = vectorstore.get(
            where={
                "$and": [
                    {"session_id": session_id},
                    {"file_name": file_name},
                ]
            }
        )
        ids = existing.get("ids", []) if existing else []
        if ids:
            vectorstore.delete(ids=ids)
            logger.info(
                "Deleted %s existing chunks for session=%s file=%s",
                len(ids),
                session_id,
                file_name,
            )
    except Exception as exc:
        logger.warning(
            "Could not delete existing chunks for session=%s file=%s: %s",
            session_id,
            file_name,
            exc,
        )


def ingest_document_file(
    file_path: str,
    session_id: str,
    document_id: str | None = None,
) -> Dict:
    normalized_path = _normalize_path(file_path)
    logger.info("Ingesting document: %s for session=%s", normalized_path, session_id)

    _validate_file(normalized_path)

    if not session_id or not str(session_id).strip():
        raise ValueError("session_id is required for ingestion")

    resolved_document_id = document_id or uuid.uuid4().hex
    file_hash = _hash_file(normalized_path)

    _delete_existing_file_chunks(
        session_id=session_id,
        file_name=normalized_path.name,
    )

    try:
        docs = _load_document(str(normalized_path))
    except Exception as exc:
        logger.exception("Document loading failed for %s: %s", normalized_path, exc)
        raise ValueError(f"Failed to read document {normalized_path.name}: {str(exc)}")

    if not docs:
        raise ValueError(f"No readable content found in {normalized_path.name}")

    _prepare_documents_metadata(
        docs,
        session_id=session_id,
        file_path=normalized_path,
        document_id=resolved_document_id,
        file_hash=file_hash,
    )

    docs = [doc for doc in docs if doc.page_content and doc.page_content.strip()]
    if not docs:
        raise ValueError(f"No usable text remained after cleanup for {normalized_path.name}")

    split_docs = _split_documents(docs)
    split_docs = [doc for doc in split_docs if doc.page_content and doc.page_content.strip()]

    if not split_docs:
        raise ValueError(f"No text chunks could be created from {normalized_path.name}")

    ids = _prepare_chunks_for_storage(split_docs)

    vectorstore = get_vectorstore()
    vectorstore.add_documents(split_docs, ids=ids)

    logger.info(
        "Ingested document %s: %s docs, %s chunks, document_id=%s",
        normalized_path,
        len(docs),
        len(split_docs),
        resolved_document_id,
    )

    return {
        "status": "success",
        "detail": "Document uploaded and indexed successfully",
        "documents": len(docs),
        "chunks": len(split_docs),
        "document_id": resolved_document_id,
        "file_name": normalized_path.name,
        "file_path": str(normalized_path),
        "file_hash": file_hash,
        "session_id": session_id,
    }