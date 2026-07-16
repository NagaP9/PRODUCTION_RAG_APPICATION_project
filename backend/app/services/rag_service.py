from typing import Any, Dict, List, Optional, Tuple
from functools import lru_cache
import logging
import re

from openai import OpenAI
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from backend.app.core.config import settings

logger = logging.getLogger("lumen-backend")


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    logger.info("Initializing embedding model: %s", settings.embedding_model_name)
    return HuggingFaceEmbeddings(
        model_name=settings.embedding_model_name,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": False},
    )


@lru_cache(maxsize=1)
def get_vectorstore(embeddings: Optional[HuggingFaceEmbeddings] = None) -> Chroma:
    logger.info(
        "Initializing Chroma vectorstore: collection=%s persist_dir=%s",
        settings.chroma_collection_name,
        settings.chroma_persist_directory,
    )
    return Chroma(
        collection_name=settings.chroma_collection_name,
        persist_directory=settings.chroma_persist_directory,
        embedding_function=embeddings or get_embeddings(),
    )


@lru_cache(maxsize=1)
def get_client() -> Optional[OpenAI]:
    if not settings.groq_api_key:
        return None

    return OpenAI(
        api_key=settings.groq_api_key,
        base_url=settings.groq_base_url,
    )


def _clean_filters(filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not filters:
        return {}

    cleaned: Dict[str, Any] = {}
    for key, value in filters.items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        if isinstance(value, (list, dict)) and len(value) == 0:
            continue
        cleaned[key] = value

    return cleaned


def _normalize_text(text: str) -> str:
    return " ".join((text or "").replace("\n", " ").split()).strip()


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


def _shorten(text: str, limit: int = 280) -> str:
    cleaned = _normalize_text(text)
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rstrip() + "..."


def _extract_exact_tokens(query: str) -> List[str]:
    if not query:
        return []

    exact_patterns: List[str] = []
    exact_patterns.extend(re.findall(r"\bINC-\d+\b", query, flags=re.IGNORECASE))
    exact_patterns.extend(re.findall(r"\b\d+(?:\.\d+)+\b", query))
    exact_patterns.extend(re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b", query))

    seen: List[str] = []
    for token in exact_patterns:
        normalized = token.strip()
        if normalized and normalized not in seen:
            seen.append(normalized)

    return seen


def _query_incident_id(query: str) -> Optional[str]:
    match = re.search(r"\bINC-\d+\b", query or "", flags=re.IGNORECASE)
    return match.group(0).upper() if match else None


def _infer_query_intent(query: str) -> str:
    q = (query or "").lower()

    if "incident" in q or "inc-" in q:
        return "incident"
    if any(term in q for term in ["sensitive", "redact", "redacted", "pii", "card-like", "phone", "email", "security"]):
        return "security"
    if "bengaluru" in q or ("office" in q and any(city in q for city in ["hyderabad", "pune", "bengaluru", "cities"])):
        return "office"
    if any(term in q for term in ["retrieval confidence", "cannot answer reliably", "invent facts", "grounded"]):
        return "retrieval_rules"
    if any(term in q for term in ["upload size", "file type", "accepted file", "supported formats", "50 mb"]):
        return "upload_rules"
    if any(term in q for term in ["embedding model", "vector database", "fastapi", "groq", "chroma"]):
        return "technical_stack"
    if any(term in q for term in ["project owner", "support email", "backup support", "operations phone", "contact"]):
        return "contacts"
    return "general"


def _intent_sections(intent: str) -> List[str]:
    mapping = {
        "incident": ["incident_log", "incident_response", "security_incidents"],
        "security": ["security_notes", "contacts"],
        "office": ["office_locations", "faq"],
        "retrieval_rules": ["retrieval_rules", "faq"],
        "upload_rules": ["upload_rules", "faq"],
        "technical_stack": ["technical_stack", "faq"],
        "contacts": ["contacts", "faq"],
        "general": [],
    }
    return mapping.get(intent, [])


def _build_metadata_filter(
    session_id: Optional[str] = None,
    document_id: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    clauses: List[Dict[str, Any]] = []

    if session_id and str(session_id).strip():
        clauses.append({"session_id": session_id})

    if document_id and str(document_id).strip():
        clauses.append({"document_id": document_id})

    cleaned_filters = _clean_filters(filters)
    for key, value in cleaned_filters.items():
        clauses.append({key: value})

    if not clauses:
        return None

    if len(clauses) == 1:
        return clauses[0]

    return {"$and": clauses}


def _build_section_filter(
    session_id: Optional[str],
    document_id: Optional[str],
    sections: List[str],
    filters: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    clauses: List[Dict[str, Any]] = []

    if session_id and str(session_id).strip():
        clauses.append({"session_id": session_id})

    if document_id and str(document_id).strip():
        clauses.append({"document_id": document_id})

    cleaned_filters = _clean_filters(filters)
    for key, value in cleaned_filters.items():
        clauses.append({key: value})

    if sections:
        if len(sections) == 1:
            clauses.append({"section": sections[0]})
        else:
            clauses.append({"$or": [{"section": section} for section in sections]})

    if not clauses:
        return None

    if len(clauses) == 1:
        return clauses[0]

    return {"$and": clauses}


def _keyword_overlap_score(query: str, text: str) -> int:
    query_terms = {
        token.lower()
        for token in re.findall(r"[a-zA-Z0-9\-]+", query)
        if len(token) >= 3
    }
    text_terms = {
        token.lower()
        for token in re.findall(r"[a-zA-Z0-9\-]+", text)
        if len(token) >= 3
    }
    return len(query_terms.intersection(text_terms))


def _exact_token_boost(query: str, text: str) -> int:
    exact_tokens = _extract_exact_tokens(query)
    normalized_text = text.lower()
    boost = 0

    for token in exact_tokens:
        if token.lower() in normalized_text:
            boost += 8

    return boost


def _section_match_boost(intent: str, metadata: Dict[str, Any]) -> int:
    preferred_sections = set(_intent_sections(intent))
    if not preferred_sections:
        return 0

    section = str(metadata.get("section", "")).lower()
    heading = str(metadata.get("heading", "")).lower()

    if section in preferred_sections:
        return 6

    if any(pref.replace("_", " ") in heading for pref in preferred_sections):
        return 3

    return 0


def _negative_signal_penalty(intent: str, metadata: Dict[str, Any], text: str) -> int:
    lowered = text.lower()
    section = str(metadata.get("section", "")).lower()

    if intent == "incident" and section not in {"incident_log", "incident_response", "security_incidents"}:
        return 6
    if intent == "security" and section not in {"security_notes", "contacts"}:
        return 5
    if intent == "office" and section not in {"office_locations", "faq"}:
        return 4
    if intent == "incident" and any(term in lowered for term in ["remote work", "laptop replacement", "termination", "internet stipend"]):
        return 4
    if intent == "security" and any(term in lowered for term in ["remote work", "holidays", "termination", "laptop replacement"]):
        return 4
    if intent == "office" and any(term in lowered for term in ["incident", "redacted_email", "redacted_phone", "redacted_number"]):
        return 4

    return 0


def _score_to_confidence(raw_score: Optional[float], rank: int) -> float:
    if raw_score is None:
        base = 0.55
    else:
        score = float(raw_score)
        if score <= 0.10:
            base = 0.96
        elif score <= 0.20:
            base = 0.90
        elif score <= 0.35:
            base = 0.82
        elif score <= 0.50:
            base = 0.72
        elif score <= 0.75:
            base = 0.60
        else:
            base = 0.46

    confidence = max(0.25, min(0.99, base - (rank * 0.05)))
    return round(confidence, 2)


def _dedupe_results(results: List[Tuple[Any, float]]) -> List[Tuple[Any, float]]:
    seen = set()
    deduped: List[Tuple[Any, float]] = []

    for doc, score in results:
        metadata = dict(doc.metadata or {})
        key = (
            metadata.get("chunk_id"),
            _normalize_text(doc.page_content),
            metadata.get("document_id"),
            metadata.get("page"),
            metadata.get("chunk_index"),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append((doc, score))

    return deduped


def _rerank_results(
    query: str,
    intent: str,
    results: List[Tuple[Any, float]],
) -> List[Tuple[Any, float]]:
    rescored: List[Tuple[Any, float, int, float]] = []

    for doc, distance_score in results:
        content = _normalize_text(doc.page_content)
        metadata = dict(doc.metadata or {})

        score = 0
        score += _keyword_overlap_score(query, content)
        score += _exact_token_boost(query, content)
        score += _section_match_boost(intent, metadata)
        score -= _negative_signal_penalty(intent, metadata, content)

        rescored.append((doc, distance_score, score, distance_score))

    rescored.sort(key=lambda item: (-item[2], item[3]))
    return [(doc, score) for doc, score, _boosted_score, _distance in rescored]


def _precision_top_k(intent: str) -> int:
    if intent in {"incident", "security", "office"}:
        return 2
    return settings.retrieval_top_k


def _candidate_k(intent: str) -> int:
    if intent in {"incident", "security", "office"}:
        return 6
    return max(settings.retrieval_top_k * 3, 8)


def _retrieve_documents(
    query: str,
    session_id: Optional[str] = None,
    document_id: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Tuple[Any, float]]:
    vectorstore = get_vectorstore()
    intent = _infer_query_intent(query)
    top_k = _precision_top_k(intent)
    candidate_k = _candidate_k(intent)
    preferred_sections = _intent_sections(intent)

    section_filter = _build_section_filter(
        session_id=session_id,
        document_id=document_id,
        sections=preferred_sections,
        filters=filters,
    )
    base_filter = _build_metadata_filter(
        session_id=session_id,
        document_id=document_id,
        filters=filters,
    )

    raw_results: List[Tuple[Any, float]] = []

    if section_filter:
        raw_results = vectorstore.similarity_search_with_score(
            query=query,
            k=candidate_k,
            filter=section_filter,
        )

    if len(raw_results) < top_k:
        fallback_results = (
            vectorstore.similarity_search_with_score(
                query=query,
                k=candidate_k,
                filter=base_filter,
            )
            if base_filter
            else vectorstore.similarity_search_with_score(
                query=query,
                k=candidate_k,
            )
        )
        raw_results.extend(fallback_results)

    raw_results = _dedupe_results(raw_results)
    reranked = _rerank_results(query, intent, raw_results)
    return reranked[:top_k]


def _average_confidence(results: List[Tuple[Any, float]]) -> float:
    if not results:
        return 0.0

    values = [
        _score_to_confidence(score, idx)
        for idx, (_doc, score) in enumerate(results)
    ]
    return round(sum(values) / len(values), 2)


def _contains_exact_token(text: str, token: str) -> bool:
    return token.lower() in (text or "").lower()


def _incident_docs_for_answer(query: str, docs: List[Any]) -> List[Any]:
    incident_id = _query_incident_id(query)
    if not incident_id:
        return docs[:1]

    matching = []
    for doc in docs:
        content = _normalize_text(doc.page_content)
        if _contains_exact_token(content, incident_id):
            matching.append(doc)

    if matching:
        return matching[:2]

    return docs[:1]


def _context_docs_for_answer(query: str, docs: List[Any]) -> List[Any]:
    intent = _infer_query_intent(query)

    if intent == "incident":
        return _incident_docs_for_answer(query, docs)

    if intent in {"security", "office"}:
        return docs[:2]

    return docs[: settings.max_context_chunks]


def _format_context(query: str, docs: List[Any]) -> str:
    sections: List[str] = []

    for i, doc in enumerate(_context_docs_for_answer(query, docs), start=1):
        metadata = dict(doc.metadata or {})
        source = metadata.get("file_name") or metadata.get("source") or "Unknown document"
        page = metadata.get("page", "N/A")
        section = metadata.get("section", "general")
        heading = metadata.get("heading", "general")
        document_id = metadata.get("document_id", "N/A")
        content = _mask_sensitive_text(_normalize_text(doc.page_content))

        sections.append(
            f"Source {i}\n"
            f"Document: {source}\n"
            f"Page: {page}\n"
            f"Section: {section}\n"
            f"Heading: {heading}\n"
            f"Document ID: {document_id}\n"
            f"Content: {content}"
        )

    return "\n\n".join(sections)


def _answer_has_source_leakage(answer: str) -> bool:
    lowered = (answer or "").lower()
    bad_patterns = [
        "source 1",
        "source 2",
        "document:",
        "page:",
        "section:",
        "heading:",
        "document id:",
        "content:",
    ]
    return any(pattern in lowered for pattern in bad_patterns)


def _answer_has_garbage_prefix(answer: str) -> bool:
    lowered = (answer or "").strip().lower()
    bad_starts = [
        "year after",
        "source",
        "document:",
        "page:",
        "section:",
        "heading:",
        "content:",
    ]
    return any(lowered.startswith(prefix) for prefix in bad_starts)


def _validated_answer_or_refusal(query: str, answer: str, docs: List[Any]) -> str:
    if not answer:
        return "I could not generate a grounded answer from the retrieved content."

    if _answer_has_source_leakage(answer) or _answer_has_garbage_prefix(answer):
        return "I cannot answer reliably from the uploaded content."

    incident_id = _query_incident_id(query)
    if incident_id:
        joined = " ".join(_normalize_text(doc.page_content) for doc in docs)
        if incident_id.lower() not in joined.lower():
            return "I cannot answer reliably from the uploaded content."

    return _mask_sensitive_text(answer.strip())


def _generate_answer(query: str, docs: List[Any]) -> str:
    if not docs:
        return "I could not find relevant information in the uploaded content."

    client = get_client()
    if client is None:
        return "I found relevant document content, but no Groq API key is configured."

    intent = _infer_query_intent(query)
    filtered_docs = _context_docs_for_answer(query, docs)
    context = _format_context(query, filtered_docs)

    system_prompt = (
        "You are a concise document-grounded RAG assistant. "
        "Answer only from the retrieved evidence. "
        "Do not reveal or reconstruct masked sensitive values. "
        "Do not copy source formatting or metadata. "
        "Never output labels such as Source, Document, Page, Section, Heading, Document ID, or Content. "
        "If the evidence looks mixed, noisy, incomplete, or contradictory, say: "
        "'I cannot answer reliably from the uploaded content.' "
        "For exact identifiers such as incident IDs, answer only if the same identifier appears clearly in the evidence."
    )

    if intent == "incident":
        style_instruction = (
            "Use exactly one sentence. "
            "State only the incident outcome or event details supported by the evidence. "
            "Do not mention source labels or quote raw snippets."
        )
    elif intent == "office":
        style_instruction = "Use one short sentence."
    else:
        style_instruction = "Use 1 to 2 concise sentences."

    user_prompt = f"""
Question:
{query}

Retrieved evidence:
{context}

Instructions:
- Start with the answer immediately.
- {style_instruction}
- Do not mention source numbers.
- Do not explain retrieval.
- Do not output any metadata fields.
- If the evidence does not clearly support the answer, say: I cannot answer reliably from the uploaded content.
- Never guess beyond the evidence.
"""

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            max_tokens=settings.llm_max_tokens,
        )

        answer = (response.choices[0].message.content or "").strip()
        return _validated_answer_or_refusal(query, answer, filtered_docs)

    except Exception as exc:
        logger.exception("Answer generation failed: %s", exc)
        return "I found relevant document content, but I could not generate a final answer at the moment."


def _build_sources(results: List[Tuple[Any, float]]) -> List[Dict[str, Any]]:
    sources: List[Dict[str, Any]] = []

    for idx, (doc, raw_score) in enumerate(results):
        metadata = dict(doc.metadata or {})
        metadata["score"] = _score_to_confidence(raw_score, idx)

        sources.append(
            {
                "content": _shorten(_mask_sensitive_text(doc.page_content)),
                "metadata": metadata,
            }
        )

    return sources


def answer_question(
    query: str,
    session_id: Optional[str] = None,
    document_id: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    cleaned_query = (query or "").strip()
    if not cleaned_query:
        raise ValueError("Query cannot be empty")

    logger.info(
        "Received query for session=%s document_id=%s: %s",
        session_id,
        document_id,
        cleaned_query,
    )

    try:
        results = _retrieve_documents(
            query=cleaned_query,
            session_id=session_id,
            document_id=document_id,
            filters=filters,
        )
    except Exception as exc:
        logger.exception("Retrieval failed: %s", exc)
        return {
            "answer": "Document retrieval failed while searching the uploaded content.",
            "sources": [],
        }

    if not results:
        return {
            "answer": "I could not find relevant information in the uploaded content.",
            "sources": [],
        }

    avg_confidence = _average_confidence(results)
    docs = [doc for doc, _score in results]

    if settings.enable_low_confidence_fallback and avg_confidence < settings.min_retrieval_confidence:
        answer = (
            "I found some related content, but the retrieval confidence is too low "
            "to give a reliable answer from the uploaded content."
        )
    else:
        answer = _generate_answer(cleaned_query, docs)

    return {
        "answer": answer,
        "sources": _build_sources(results),
    }