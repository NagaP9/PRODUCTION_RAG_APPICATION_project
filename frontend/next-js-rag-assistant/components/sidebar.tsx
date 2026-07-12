"use client";

import {
  Plus,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { LumenLogo } from "@/components/lumen-logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onMobileClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border/60 bg-[#0B1220] text-white transition-transform duration-300 md:static md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <LumenLogo />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground md:hidden"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 pb-4">
          <Button
            onClick={onNewChat}
            className="h-12 w-full justify-start gap-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Search chats</span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-6 pb-6">
            <div>
              <SectionLabel icon={MessageSquare}>History</SectionLabel>
              <div className="mt-3 space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      onSelect(conv.id);
                      onMobileClose();
                    }}
                    className={cn(
                      "w-full rounded-2xl px-3 py-3 text-left transition",
                      activeId === conv.id
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="truncate text-sm font-medium">{conv.title}</div>
                    <div className="mt-1 truncate text-xs text-white/45">
                      {conv.updatedAt || "No activity yet"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </div>
  );
}