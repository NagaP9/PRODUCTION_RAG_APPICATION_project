"use client";

import {
  X,
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fileIcon } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import type { Source, DocumentItem } from "@/lib/types";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

interface SourcesPanelProps {
  open: boolean;
  onClose: () => void;
  sources: Source[] | null;
  uploads: UploadingFile[];
  documents: DocumentItem[];
  onUploadClick: () => void;
}

export function SourcesPanel({
  open,
  onClose,
  uploads,
  documents,
  onUploadClick,
}: SourcesPanelProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-[360px] border-l border-white/10 bg-[#0B1220] text-white transition-transform duration-300 lg:static lg:z-0 lg:block lg:w-[360px] lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <h2 className="text-sm font-semibold tracking-wide text-white">
            UPLOADED CONTENT
          </h2>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden p-4">
          <section className="mb-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Upload documents
            </p>

            <button
              type="button"
              onClick={onUploadClick}
              className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-blue-400/40 hover:bg-white/[0.05]"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-white">
                  Drop files or click to upload
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  PDF, DOCX, TXT, MD · up to 50 MB
                </p>
              </div>
            </button>

            {uploads.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploads.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {file.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading / indexing
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {Math.min(file.progress, 100)}%
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${Math.min(file.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="min-h-0 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Indexed documents
              </p>

              <button
                type="button"
                onClick={onUploadClick}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {documents.length > 0 ? (
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-2">
                <ScrollArea className="h-full max-h-[520px] pr-2">
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                No indexed documents yet.
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

function DocumentRow({ doc }: { doc: DocumentItem }) {
  const Icon = fileIcon(doc.type);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-300">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-medium text-white">
              {doc.name}
            </p>

            {doc.status === "indexed" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Indexed
              </span>
            ) : doc.status === "indexing" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Indexing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                <AlertCircle className="h-3 w-3" />
                Failed
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-400">
            {doc.pages} pages · {doc.sizeLabel}
            {doc.status === "indexed" ? ` · ${doc.chunks} chunks` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}