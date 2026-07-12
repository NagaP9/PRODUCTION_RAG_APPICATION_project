export type Role = "user" | "assistant"

export interface Source {
  id: string
  fileName: string
  fileType: "pdf" | "docx" | "txt" | "md"
  page: number
  snippet: string
  confidence: number // 0-1
  collection: string
}

export interface Message {
  id: string
  role: Role
  content: string
  createdAt: string
  sources?: Source[]
}

export interface Conversation {
  id: string
  title: string
  preview: string
  updatedAt: string
  messages: Message[]
}

export interface DocumentItem {
  id: string
  name: string
  type: "pdf" | "docx" | "txt" | "md"
  pages: number
  sizeLabel: string
  status: "indexed" | "indexing" | "failed"
  chunks: number
}

export interface Collection {
  id: string
  name: string
  documentCount: number
  color: string
}

export interface ModelSettings {
  model: string
  retrievalMode: "hybrid" | "semantic" | "keyword"
  topK: number
  temperature: number
}

export const collections: Collection[] = [
  { id: "c1", name: "Product Docs", documentCount: 42, color: "var(--chart-1)" },
  { id: "c2", name: "Legal & Compliance", documentCount: 18, color: "var(--chart-2)" },
  { id: "c3", name: "Engineering Wiki", documentCount: 67, color: "var(--chart-3)" },
  { id: "c4", name: "Sales Playbooks", documentCount: 23, color: "var(--chart-4)" },
]

export const documents: DocumentItem[] = [
  { id: "d1", name: "Security_Whitepaper_2025.pdf", type: "pdf", pages: 34, sizeLabel: "4.2 MB", status: "indexed", chunks: 218 },
  { id: "d2", name: "SOC2_Type_II_Report.pdf", type: "pdf", pages: 88, sizeLabel: "9.1 MB", status: "indexed", chunks: 540 },
  { id: "d3", name: "Onboarding_Handbook.docx", type: "docx", pages: 26, sizeLabel: "1.8 MB", status: "indexing", chunks: 96 },
  { id: "d4", name: "API_Reference.md", type: "md", pages: 12, sizeLabel: "320 KB", status: "indexed", chunks: 74 },
  { id: "d5", name: "Q3_Roadmap_Notes.txt", type: "txt", pages: 4, sizeLabel: "48 KB", status: "failed", chunks: 0 },
]

const sampleSources: Source[] = [
  {
    id: "s1",
    fileName: "Security_Whitepaper_2025.pdf",
    fileType: "pdf",
    page: 12,
    snippet:
      "All customer data is encrypted at rest using AES-256 and in transit via TLS 1.3. Encryption keys are rotated automatically every 90 days and stored in a FIPS 140-2 validated hardware security module.",
    confidence: 0.96,
    collection: "Legal & Compliance",
  },
  {
    id: "s2",
    fileName: "SOC2_Type_II_Report.pdf",
    fileType: "pdf",
    page: 41,
    snippet:
      "The auditor observed that access to production encryption keys is restricted to a limited set of authorized engineers and requires multi-factor authentication with quarterly access reviews.",
    confidence: 0.88,
    collection: "Legal & Compliance",
  },
  {
    id: "s3",
    fileName: "Engineering_Wiki_Crypto.md",
    fileType: "md",
    page: 3,
    snippet:
      "Our envelope encryption scheme wraps per-tenant data keys with a master key managed by the KMS. This allows fast key rotation without re-encrypting the underlying object storage.",
    confidence: 0.74,
    collection: "Engineering Wiki",
  },
]

export const conversations: Conversation[] = [
  {
    id: "conv1",
    title: "How is customer data encrypted?",
    preview: "We use AES-256 at rest and TLS 1.3 in transit...",
    updatedAt: "2m ago",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "How is our customer data encrypted, both at rest and in transit?",
        createdAt: "10:24 AM",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "Your customer data is protected with strong encryption at every layer:\n\n**At rest** — All data is encrypted using **AES-256**, with encryption keys rotated automatically every 90 days and stored in a FIPS 140-2 validated hardware security module.\n\n**In transit** — Connections are secured with **TLS 1.3**.\n\nKey access is tightly controlled: only a limited set of authorized engineers can reach production keys, and access requires MFA with quarterly reviews. Internally, an envelope encryption scheme wraps per-tenant data keys with a KMS-managed master key, enabling fast rotation without re-encrypting object storage.",
        createdAt: "10:24 AM",
        sources: sampleSources,
      },
    ],
  },
  {
    id: "conv2",
    title: "Summarize the Q3 roadmap",
    preview: "The Q3 roadmap focuses on three pillars...",
    updatedAt: "1h ago",
    messages: [],
  },
  {
    id: "conv3",
    title: "What is our data retention policy?",
    preview: "Customer data is retained for 30 days after...",
    updatedAt: "Yesterday",
    messages: [],
  },
  {
    id: "conv4",
    title: "Onboarding checklist for new engineers",
    preview: "New engineers should complete security training...",
    updatedAt: "2 days ago",
    messages: [],
  },
  {
    id: "conv5",
    title: "Compare SOC 2 and ISO 27001 scope",
    preview: "Both frameworks cover information security...",
    updatedAt: "Last week",
    messages: [],
  },
]

export const suggestedPrompts: { title: string; subtitle: string }[] = [
  { title: "Summarize our security posture", subtitle: "Pull key controls from the latest whitepaper" },
  { title: "What's our data retention policy?", subtitle: "Find the exact terms across compliance docs" },
  { title: "Draft an onboarding checklist", subtitle: "Based on the engineering handbook" },
  { title: "Explain envelope encryption", subtitle: "With citations from the engineering wiki" },
]

export const defaultSettings: ModelSettings = {
  model: "lumen-pro-1.5",
  retrievalMode: "hybrid",
  topK: 6,
  temperature: 0.2,
}

export const assistantSampleAnswer: Omit<Message, "id" | "createdAt"> = {
  role: "assistant",
  content:
    "Based on your indexed documents, here's what I found. Our platform encrypts all customer data using **AES-256** at rest and **TLS 1.3** in transit. Encryption keys rotate every 90 days and are held in a FIPS 140-2 validated HSM. Access to production keys is limited, MFA-protected, and reviewed quarterly.",
  sources: sampleSources,
}
