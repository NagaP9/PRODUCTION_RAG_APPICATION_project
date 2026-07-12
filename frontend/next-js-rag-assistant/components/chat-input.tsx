"use client";

import { useRef, useState } from "react";
import { Paperclip, ArrowUp, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const quickSuggestions = [
  "Summarize this",
  "Find contradictions",
  "Cite sources",
  "Explain simply",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

function isAllowedFile(file: File) {
  const lower = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  isLoading,
  showSuggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onAttach: (files: FileList) => void;
  isLoading: boolean;
  showSuggestions: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [fileError, setFileError] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const files = Array.from(selected);
    const valid = files.filter(isAllowedFile);
    const invalid = files.filter((file) => !isAllowedFile(file));

    if (invalid.length > 0) {
      setFileError(
        `Unsupported file type: ${invalid
          .map((f) => f.name)
          .join(", ")}. Allowed formats: PDF, DOCX, TXT, MD.`
      );
    } else {
      setFileError("");
    }

    if (valid.length > 0) {
      const dt = new DataTransfer();
      valid.forEach((file) => dt.items.add(file));
      onAttach(dt.files);
    }

    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {showSuggestions && (
        <div className="flex flex-wrap gap-2">
          {quickSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-[12px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "rounded-3xl border px-4 py-3 shadow-[0_0_0_1px_rgba(59,130,246,0.06)] transition",
          focused
            ? "border-blue-500/40 bg-[#0d1528]"
            : "border-white/10 bg-[#0b1220]"
        )}
      >
        <div className="flex items-end gap-3">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach files"
            className="mb-1 shrink-0 rounded-full text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            placeholder="Ask a question about your documents..."
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          />

          {isLoading ? (
            <Button
              type="button"
              size="icon"
              className="mb-1 rounded-full bg-red-500 text-white hover:bg-red-500/90"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={onSend}
              disabled={!value.trim()}
              className="mb-1 rounded-full bg-blue-500 text-white hover:bg-blue-500/90 disabled:bg-blue-500/40"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500">
        Supported formats: PDF, DOCX, TXT, MD
      </div>

      {fileError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {fileError}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
        <Sparkles className="h-3.5 w-3.5" />
        <span>
          Answers are grounded in your indexed documents and may require
          verification.
        </span>
      </div>
    </div>
  );
}