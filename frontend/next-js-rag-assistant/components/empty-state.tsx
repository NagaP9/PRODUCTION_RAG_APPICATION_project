"use client";

import { Sparkles, ShieldCheck, FileSearch, Zap } from "lucide-react";

export function EmptyState() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 -z-10 mx-auto size-32 rounded-full bg-primary/30 blur-3xl" />
        <div className="grid size-16 place-items-center rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-chart-5/10 shadow-lg">
          <Sparkles className="size-7 text-primary" />
        </div>
      </div>

      <h2 className="text-balance bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
        Ask anything about your knowledge base
      </h2>

      <p className="mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
        Lumen searches across your uploaded content and returns precise,
        cited answers grounded in your own data.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[12px] text-muted-foreground">
        <Feature icon={ShieldCheck} label="SOC 2 secure" />
        <Feature icon={FileSearch} label="Hybrid retrieval" />
        <Feature icon={Zap} label="Sub-second answers" />
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1">
      <Icon className="size-3.5 text-primary" />
      {label}
    </span>
  );
}