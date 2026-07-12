"use client";

import { useState } from "react";
import {
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceCard } from "@/components/source-card";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.trim() === "") return <div key={i} className="h-3" />;

    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <p key={i} className="leading-7 text-[15px]">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export function ChatBubble({
  message,
}: {
  message: Message;
}) {
  const isUser = message.role === "user";
  const sourceCount = message.sources?.length ?? 0;
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function toggleReaction(next: "up" | "down") {
    setReaction((prev) => (prev === next ? null : next));
  }

  return (
    <div
      className={cn(
        "group flex w-full gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div className={cn("max-w-[85%] space-y-2", isUser ? "text-right" : "")}>
        <div
          className={cn(
            "rounded-3xl border px-5 py-4 shadow-sm",
            isUser
              ? "rounded-tr-md border-blue-500/20 bg-blue-500 text-white"
              : "rounded-tl-md border-white/10 bg-white/[0.03] text-slate-100"
          )}
        >
          <div className="space-y-1">{renderContent(message.content)}</div>

          {!isUser && sourceCount > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setSourcesOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 transition hover:bg-blue-500/15"
              >
                <span>{sourceCount} sources</span>
                {sourcesOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {sourcesOpen && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1220]/80 p-2">
                  <ScrollArea className="max-h-[280px] pr-2">
                    <div className="space-y-2">
                      {message.sources?.map((source, index) => (
                        <SourceCard
                          key={source.id}
                          source={source}
                          index={index}
                          compact
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-3 px-2 text-xs text-slate-500 opacity-100 transition">
            <button
              className={cn(
                "transition hover:text-slate-300",
                copied && "text-emerald-400"
              )}
              type="button"
              onClick={handleCopy}
              title="Copy reply"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              className={cn(
                "transition hover:text-slate-300",
                reaction === "up" && "text-emerald-400"
              )}
              type="button"
              onClick={() => toggleReaction("up")}
              title="Like"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>

            <button
              className={cn(
                "transition hover:text-slate-300",
                reaction === "down" && "text-red-400"
              )}
              type="button"
              onClick={() => toggleReaction("down")}
              title="Dislike"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>

            <span>{message.createdAt}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex w-full justify-start gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="rounded-3xl rounded-tl-md border border-white/10 bg-white/[0.03] px-5 py-4 text-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}