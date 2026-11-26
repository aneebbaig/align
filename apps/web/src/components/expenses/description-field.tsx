"use client";

import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface DescriptionMatch { description: string; categoryId: string }

/** Optional description with autocomplete from past entries (arrow keys + Enter, or click). */
export function DescriptionField({ reg, suggestions, error, onPick }: {
  reg: UseFormRegisterReturn;
  /** Past descriptions matching what is typed; shown only while the field is focused. */
  suggestions: DescriptionMatch[];
  error?: string;
  onPick: (m: DescriptionMatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = open ? suggestions : [];

  return (
    <div className="space-y-1">
      <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
      <div className="relative">
        <Input
          id="description"
          placeholder="What was this for?"
          autoComplete="off"
          {...reg}
          onChange={(e) => { void reg.onChange(e); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => { void reg.onBlur(e); setOpen(false); }}
          onKeyDown={(e) => {
            if (list.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && active >= 0 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); onPick(list[active]); setOpen(false); setActive(-1); }
            else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
          }}
        />
        {list.length > 0 && (
          <ul role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-popover p-1 shadow-md">
            {list.map((m, i) => (
              <li
                key={m.description}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); onPick(m); setOpen(false); setActive(-1); }}
                onMouseEnter={() => setActive(i)}
                className={cn("cursor-pointer rounded px-2 py-1.5 text-sm", i === active && "bg-muted")}
              >
                {m.description}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
