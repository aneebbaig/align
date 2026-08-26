"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small uppercase micro-header + content - the section idiom already used by
 * the edit-mode "Locked" summary block and mobile's "FUND FROM" label,
 * pulled out here so every creation dialog shares the same visual rhythm. */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** Collapsed-by-default disclosure for rarely-used fields (notes, recurring,
 * regret-purchase, schedule priority/flexibility), so the default form only
 * shows what's needed for the common case. */
export function MoreOptions({ children, defaultOpen = false }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        More options
      </button>
      {open && <div className="space-y-4 pt-3">{children}</div>}
    </div>
  );
}
