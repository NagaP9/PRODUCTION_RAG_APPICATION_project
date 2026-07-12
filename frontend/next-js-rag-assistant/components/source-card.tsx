"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Quote } from "lucide-react"
import { fileIcon, confidenceTone } from "@/lib/file-utils"
import { cn } from "@/lib/utils"
import type { Source } from "@/lib/ui-data"

export function SourceCard({
  source,
  index,
  compact = false,
}: {
  source: Source
  index: number
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = fileIcon(source.fileType)
  const tone = confidenceTone(source.confidence)
  const pct = Math.round(source.confidence * 100)

  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-card/60 p-3 transition hover:border-primary/40 hover:bg-card",
        compact ? "" : "shadow-sm",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="grid size-4 shrink-0 place-items-center rounded bg-primary/15 text-[9px] font-bold text-primary">
              {index}
            </span>
            <p className="line-clamp-1 text-[13px] font-medium text-foreground">
              {source.fileName}
            </p>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Page {source.page} · {source.collection}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full", tone.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("text-[11px] font-semibold tabular-nums", tone.color)}>
          {pct}%
        </span>
        <span className={cn("text-[10px] font-medium", tone.color)}>
          {tone.label}
        </span>
      </div>

      <div
        className={cn(
          "relative mt-2.5 rounded-lg bg-secondary/50 p-2.5 text-[12px] leading-relaxed text-muted-foreground",
          !expanded && "line-clamp-2",
        )}
      >
        <Quote className="absolute -left-0.5 -top-0.5 size-3 text-primary/40" />
        <span className="pl-3">{source.snippet}</span>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary transition hover:opacity-80"
      >
        {expanded ? (
          <>
            Show less <ChevronUp className="size-3" />
          </>
        ) : (
          <>
            Show snippet <ChevronDown className="size-3" />
          </>
        )}
      </button>
    </div>
  )
}
