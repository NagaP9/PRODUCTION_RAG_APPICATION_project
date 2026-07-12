export type Role = "user" | "assistant";

export interface Source {
    id: string;
    fileName: string;
    fileType: "pdf" | "docx" | "txt" | "md";
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
    type: "pdf" | "docx" | "txt" | "md";
    pages: number;
    sizeLabel: string;
    status: "indexed" | "indexing" | "failed";
    chunks: number;
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
}

export interface UploadResponse {
    message: string;
    session_id: string;
    session_name?: string;
    result: UploadResult;
}

export interface QueryApiSource {
    content: string;
    metadata?: Record<string, any>;
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