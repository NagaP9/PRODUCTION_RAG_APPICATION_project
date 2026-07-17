"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { EmptyState } from "@/components/empty-state";
import { ChatBubble, TypingBubble } from "@/components/chat-bubble";
import { ChatInput } from "@/components/chat-input";
import { SourcesPanel } from "@/components/sources-panel";

import type {
  Conversation,
  Message,
  Source,
  ModelSettings,
  DocumentItem,
} from "@/lib/types";
import { defaultSettings } from "@/lib/types";
import { queryRag, uploadDocumentToSession } from "@/lib/api";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

function now() {
  return new Date().toISOString();
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyConversation(): Conversation {
  return {
    id: "conv-initial",
    title: "New conversation",
    preview: "",
    updatedAt: "",
    sessionId: createSessionId(),
    messages: [],
    documents: [],
  };
}

function createRuntimeConversation(): Conversation {
  return {
    id: `conv-${Date.now()}`,
    title: "New conversation",
    preview: "",
    updatedAt: now(),
    sessionId: createSessionId(),
    messages: [],
    documents: [],
  };
}

function getDocumentType(fileName: string): DocumentItem["type"] {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "docx" || ext === "txt" || ext === "md") {
    return ext;
  }
  return "pdf";
}

export default function Page() {
  const initialConversation = useMemo(() => createEmptyConversation(), []);
  const [convs, setConvs] = useState<Conversation[]>([initialConversation]);
  const [activeId, setActiveId] = useState(initialConversation.id);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [activeSources, setActiveSources] = useState<Source[] | null>(null);
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const [draftSettings, setDraftSettings] =
    useState<ModelSettings>(defaultSettings);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const activeConv = convs.find((c) => c.id === activeId) ?? convs[0];
  const messages = activeConv?.messages ?? [];
  const documents = activeConv?.documents ?? [];
  const isEmpty = messages.length === 0;
  const activeDocument = documents[0];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isLoading]);

  useEffect(() => {
    const lastWithSources = [...messages]
      .reverse()
      .find((m) => m.sources && m.sources.length > 0);

    setActiveSources(lastWithSources?.sources ?? null);
  }, [activeId, messages]);

  function updateActiveConv(updater: (c: Conversation) => Conversation) {
    setConvs((prev) => prev.map((c) => (c.id === activeId ? updater(c) : c)));
  }

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

    if (!activeConv?.sessionId) {
      toast.error("Missing session", {
        description: "Start a new chat or upload a document first.",
      });
      return;
    }

    if ((activeConv.documents?.length ?? 0) === 0) {
      toast.error("No uploaded document", {
        description: "Upload a document first before asking questions.",
      });
      return;
    }

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: now(),
    };

    updateActiveConv((c) => ({
      ...c,
      title: c.messages.length === 0 ? text.slice(0, 48) : c.title,
      preview: text,
      updatedAt: now(),
      messages: [...c.messages, userMsg],
    }));

    setInput("");
    setIsLoading(true);

    try {
      const data = await queryRag({
        query: text,
        session_id: activeConv.sessionId,
        document_id: activeDocument?.documentId,
      });

      const mappedSources: Source[] = (data.sources ?? []).map(
        (s: any, idx: number) => {
          const sourceFileName =
            s.metadata?.file_name ??
            s.metadata?.source ??
            s.metadata?.filename ??
            "unknown.pdf";

          return {
            id: `src-${Date.now()}-${idx}`,
            fileName: sourceFileName,
            fileType: getDocumentType(sourceFileName),
            page: typeof s.metadata?.page === "number" ? s.metadata.page : 1,
            snippet: s.content ?? "",
            confidence:
              typeof s.metadata?.score === "number" ? s.metadata.score : 0,
            collection: s.metadata?.document_id ?? "Knowledge base files",
          };
        }
      );

      const answer: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        createdAt: now(),
        sources: mappedSources,
      };

      updateActiveConv((c) => ({
        ...c,
        updatedAt: now(),
        preview: data.answer.slice(0, 80),
        messages: [...c.messages, answer],
      }));

      setActiveSources(mappedSources.length ? mappedSources : null);

      toast.success("Answer ready", {
        description: `${mappedSources.length} sources retrieved · ${settings.model}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Please check backend connection.";

      toast.error("Failed to get answer", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat() {
    const fresh = createRuntimeConversation();
    setConvs((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setActiveSources(null);
    setUploads([]);
    setSidebarOpen(false);
  }

  async function handleUpload(files: FileList) {
    const list = Array.from(files);
    if (!list.length) return;

    const sessionId = activeConv?.sessionId;
    if (!sessionId) {
      toast.error("Missing session", {
        description: "Start a new chat and try uploading again.",
      });
      return;
    }

    const tempUploads = list.map((file, idx) => ({
      id: `up-${Date.now()}-${idx}`,
      name: file.name,
      progress: 25,
    }));

    setUploads((prev) => [...prev, ...tempUploads]);
    setSourcesOpen(true);

    toast.info("Indexing started", {
      description: `${list.length} file${list.length > 1 ? "s" : ""} queued for processing.`,
    });

    try {
      const uploadedDocs: DocumentItem[] = [];

      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const tempId = tempUploads[i].id;

        const response = await uploadDocumentToSession(sessionId, file);

        if (response.result?.status !== "success") {
          throw new Error(
            response.result?.detail || `Failed to upload ${file.name}`
          );
        }

        setUploads((prev) =>
          prev.map((u) => (u.id === tempId ? { ...u, progress: 100 } : u))
        );

        uploadedDocs.push({
          id: `doc-${Date.now()}-${i}`,
          name: response.result?.file_name ?? file.name,
          type: getDocumentType(file.name),
          pages: response.result?.documents ?? 1,
          sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          status: "indexed",
          chunks: response.result?.chunks ?? 0,
          documentId: response.result?.document_id,
        });
      }

      updateActiveConv((c) => ({
        ...c,
        documents: [...uploadedDocs, ...c.documents],
        updatedAt: now(),
      }));

      toast.success("Document indexed", {
        description: `${list.length} file${list.length > 1 ? "s are" : " is"} ready to search.`,
      });

      setTimeout(() => {
        setUploads((prev) =>
          prev.filter((u) => !tempUploads.some((t) => t.id === u.id))
        );
      }, 800);
    } catch (error) {
      setUploads((prev) =>
        prev.filter((u) => !tempUploads.some((t) => t.id === u.id))
      );

      const message =
        error instanceof Error ? error.message : "Could not upload documents.";

      toast.error("Upload failed", {
        description: message,
      });
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        conversations={convs}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleTheme={() => setIsDark((v) => !v)}
          isDark={isDark}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <EmptyState onPromptClick={(t: string) => handleSend(t)} />
          ) : (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  message={m}
                  onShowSources={(msg: Message) => {
                    setActiveSources(msg.sources ?? null);
                    setSourcesOpen(true);
                  }}
                />
              ))}
              {isLoading ? <TypingBubble /> : null}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUpload(e.target.files);
            e.currentTarget.value = "";
          }}
        />

        <div className="border-t border-border/60 bg-background/80 px-4 py-4 backdrop-blur">
          <div className="mx-auto w-full max-w-4xl">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => handleSend()}
              onAttach={handleUpload}
              isLoading={isLoading}
              showSuggestions={isEmpty}
            />
          </div>
        </div>
      </div>

      <SourcesPanel
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        sources={activeSources}
        uploads={uploads}
        documents={documents}
        onUploadClick={() => fileRef.current?.click()}
      />
    </div>
  );
}