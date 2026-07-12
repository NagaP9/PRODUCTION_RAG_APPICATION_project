"use client"

import { Cpu, Layers, Hash, Thermometer, Wifi, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ModelSettings } from "@/lib/types"

const models = [
  { value: "lumen-pro-1.5", label: "Lumen Pro 1.5", hint: "Best quality" },
  { value: "lumen-fast", label: "Lumen Fast", hint: "Low latency" },
  { value: "lumen-research", label: "Lumen Research", hint: "Deep reasoning" },
]

const retrievalModes: { value: ModelSettings["retrievalMode"]; label: string; desc: string }[] = [
  { value: "hybrid", label: "Hybrid", desc: "Semantic + keyword" },
  { value: "semantic", label: "Semantic", desc: "Vector similarity" },
  { value: "keyword", label: "Keyword", desc: "Exact term match" },
]

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  onChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  settings: ModelSettings
  onChange: (s: ModelSettings) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-base">Assistant settings</DialogTitle>
          <DialogDescription>
            Tune retrieval and generation for this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          {/* Model */}
          <Field icon={Cpu} label="Model" desc="The generation model used for answers.">
            <Select
              value={settings.model}
              onValueChange={(v) => onChange({ ...settings, model: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="font-medium">{m.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {m.hint}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Retrieval mode */}
          <Field icon={Layers} label="Retrieval mode" desc="How relevant chunks are found.">
            <div className="grid grid-cols-3 gap-2">
              {retrievalModes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => onChange({ ...settings, retrievalMode: m.value })}
                  className={cn(
                    "relative rounded-xl border p-2.5 text-left transition",
                    settings.retrievalMode === m.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/40 hover:border-primary/40",
                  )}
                >
                  {settings.retrievalMode === m.value && (
                    <Check className="absolute right-2 top-2 size-3.5 text-primary" />
                  )}
                  <p className="text-[13px] font-medium text-foreground">
                    {m.label}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          {/* Top-K */}
          <Field
            icon={Hash}
            label="Top-K results"
            desc="Number of chunks retrieved per query."
            value={String(settings.topK)}
          >
            <Slider
              value={[settings.topK]}
              min={1}
              max={20}
              step={1}
              onValueChange={([v]) => onChange({ ...settings, topK: v })}
            />
          </Field>

          {/* Temperature */}
          <Field
            icon={Thermometer}
            label="Temperature"
            desc="Higher = more creative, lower = more grounded."
            value={settings.temperature.toFixed(1)}
          >
            <Slider
              value={[settings.temperature]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([v]) => onChange({ ...settings, temperature: v })}
            />
          </Field>

          {/* API status */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
                <Wifi className="size-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  API status
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Connected · 38 ms latency
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Operational
            </span>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} className="bg-primary text-primary-foreground">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  icon: Icon,
  label,
  desc,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  desc: string
  value?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground">{label}</span>
        </div>
        {value !== undefined && (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[12px] font-semibold tabular-nums text-foreground">
            {value}
          </span>
        )}
      </div>
      {children}
      <p className="text-[11.5px] text-muted-foreground">{desc}</p>
    </div>
  )
}
