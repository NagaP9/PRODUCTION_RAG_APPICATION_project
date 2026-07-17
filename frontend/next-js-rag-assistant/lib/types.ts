export type Role = "user" | "assistant";

export type FileType = "pdf" | "docx" | "txt" | "md";

export interface Source {
    id: string;
    fileName: string;
    fileType: FileType;
    page: number;
    snippet: string;
    confidence: number;
    collection: string;
}

export interface Message {
    id: string;
    role: Role;
    content: string;
    createdAt: string;
    sources?: Source[];
}

export interface DocumentItem {
    id: string;
    name: string;
    type: FileType;
    pages: number;
    sizeLabel: string;
    status: "indexed" | "indexing" | "failed";
    chunks: number;
    documentId?: string;
}

export interface Conversation {
    id: string;
    title: string;
    preview: string;
    updatedAt: string;
    sessionId: string;
    messages: Message[];
    documents: DocumentItem[];
}

export interface ModelSettings {
    model: string;
    retrievalMode: "hybrid" | "semantic" | "keyword";
    topK: number;
    temperature: number;
}

export interface UploadResult {
    filename?: string;
    file_name?: string;
    stored_filename?: string;
    status: "success" | "failed";
    documents?: number;
    chunks?: number;
    path?: string;
    session_id: string;
    detail?: string;
    document_id?: string;
    file_path?: string;
    file_hash?: string;
}

export interface UploadResponse {
    message?: string;
    session_id?: string;
    session_name?: string;
    result: UploadResult;
}

export interface QuerySourceMetadata {
    file_name?: string;
    source?: string;
    filename?: string;
    document_id?: string;
    page?: number;
    section?: string;
    heading?: string;
    score?: number;
    session_name?: string;
}

export interface QueryApiSource {
    content: string;
    metadata?: QuerySourceMetadata;
}

export interface QueryResponse {
    answer: string;
    sources: QueryApiSource[];
}

export const defaultSettings: ModelSettings = {
    model: "lumen-pro-1.5",
    retrievalMode: "hybrid",
    topK: 6,
    temperature: 0.2,
};

export const suggestedPrompts: { title: string; subtitle: string }[] = [
    {
        title: "Summarize this document",
        subtitle: "Get the key points with citations",
    },
    {
        title: "Find contradictions",
        subtitle: "Check if documents disagree",
    },
    {
        title: "Explain simply",
        subtitle: "Make the answer easy to understand",
    },
    {
        title: "Cite sources",
        subtitle: "Show exactly where the answer came from",
    },
];