"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { quickCreateCategory } from "@/actions/settings";
import { cn } from "@/lib/utils";

export interface ComboCategory { id: string; name: string; color: string; icon: string }

/**
 * Category picker you can type into: filters the list as you type and, when
 * what you typed isn't a category yet, offers to create it with one click.
 */
export function CategoryCombobox({ categories, value, type, onChange, onCreated, invalid }: {
  categories: ComboCategory[];
  value: string;
  type: "EXPENSE" | "INCOME";
  onChange: (id: string) => void;
  onCreated: (category: ComboCategory) => void;
  invalid?: boolean;
}) {
  const selected = categories.find((c) => c.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (typing && q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories),
    [categories, q, typing],
  );
  const exact = categories.some((c) => c.name.toLowerCase() === q);
  const canCreate = typing && q.length > 0 && !exact;
  const rows = matches.length + (canCreate ? 1 : 0);

  function pick(c: ComboCategory) {
    onChange(c.id);
    setOpen(false);
    setTyping(false);
    setQuery("");
    inputRef.current?.blur();
  }

  async function create() {
    if (creating || !canCreate) return;
    setCreating(true);
    const result = await quickCreateCategory(query, type);
    setCreating(false);
    if (!result.success) { toast.error(result.error); return; }
    const c = result.category;
    onCreated({ id: c.id, name: c.name, color: c.color, icon: c.icon });
    toast.success(`Added category “${c.name}”`);
    pick({ id: c.id, name: c.name, color: c.color, icon: c.icon });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, rows - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault(); // never submit the form from here
      if (!open) { setOpen(true); return; }
      if (active < matches.length) pick(matches[active]);
      else void create();
    } else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); setTyping(false); setQuery(""); }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          {selected && !typing && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full" style={{ backgroundColor: selected.color }} />
          )}
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            autoComplete="off"
            placeholder="Type or pick a category"
            className={cn(selected && !typing && "pl-8")}
            value={typing ? query : selected?.name ?? ""}
            onFocus={(e) => { setOpen(true); e.currentTarget.select(); }}
            onChange={(e) => { setTyping(true); setQuery(e.target.value); setActive(0); setOpen(true); }}
            onBlur={() => { if (!open) { setTyping(false); setQuery(""); } }}
            onKeyDown={onKeyDown}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="p-1 w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        // The list is portalled outside the dialog, whose scroll lock would swallow the wheel.
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onInteractOutside={(e) => { if (e.target === inputRef.current) e.preventDefault(); else { setTyping(false); setQuery(""); } }}
      >
        {matches.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(c)}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left", i === active && "bg-muted", c.id === value && "font-medium")}
          >
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
        {matches.length === 0 && !canCreate && <p className="px-2 py-3 text-sm text-muted-foreground">No categories yet — type a name to add one.</p>}
        {canCreate && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(matches.length)}
            onClick={create}
            disabled={creating}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left text-primary", active === matches.length && "bg-muted", matches.length > 0 && "mt-1 border-t border-border rounded-t-none")}
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span className="truncate">Add “{query.trim()}” as a new category</span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
