import { FileText, FileType, FileCode, File } from "lucide-react"
import type { ComponentType } from "react"

export function fileIcon(type: string): ComponentType<{ className?: string }> {
  switch (type) {
    case "pdf":
      return FileType
    case "md":
      return FileCode
    case "txt":
      return FileText
    default:
      return File
  }
}

export function confidenceTone(confidence: number) {
  if (confidence >= 0.85) return { label: "High", color: "text-success", bar: "bg-success" }
  if (confidence >= 0.7) return { label: "Medium", color: "text-warning", bar: "bg-warning" }
  return { label: "Low", color: "text-muted-foreground", bar: "bg-muted-foreground" }
}
