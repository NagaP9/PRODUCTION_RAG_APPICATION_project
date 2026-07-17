import type { QueryResponse, UploadResponse } from "./types";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://127.0.0.1:8000";

function buildApiUrl(path: string) {
    return `${API_BASE_URL}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseError(res: Response): Promise<string> {
    try {
        const data = await res.json();

        if (data?.detail) {
            if (Array.isArray(data.detail)) {
                return data.detail
                    .map((d: any) => d?.msg || JSON.stringify(d))
                    .join(", ");
            }

            if (typeof data.detail === "string") {
                return data.detail;
            }
        }

        if (typeof data?.message === "string") {
            return data.message;
        }

        return JSON.stringify(data);
    } catch {
        return `Request failed with status ${res.status}`;
    }
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        throw new Error(await parseError(res));
    }

    return res.json() as Promise<T>;
}

export async function uploadDocumentToSession(
    sessionId: string,
    file: File
): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(buildApiUrl(`/sessions/${sessionId}/upload`), {
        method: "POST",
        body: formData,
    });

    return handleResponse<UploadResponse>(res);
}

export async function queryRag(payload: {
    query: string;
    session_id: string;
    document_id?: string;
    filters?: Record<string, any>;
}): Promise<QueryResponse> {
    const body: Record<string, any> = {
        query: payload.query,
        session_id: payload.session_id,
        document_id: payload.document_id,
    };

    if (payload.filters && Object.keys(payload.filters).length > 0) {
        body.filters = payload.filters;
    }

    Object.keys(body).forEach((key) => {
        if (body[key] === undefined) {
            delete body[key];
        }
    });

    const res = await fetch(buildApiUrl("/query"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    return handleResponse<QueryResponse>(res);
}

export { API_BASE_URL };