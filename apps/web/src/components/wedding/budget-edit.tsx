"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { evaluateAmount } from "@/lib/amount-expr";
import { fmt } from "./wedding-types";

/** A budget shown as formatted text; the pencil (or "Set budget") swaps in an input. Enter/blur saves, Escape cancels. */
export function BudgetEdit({ valuePaisas, symbol, label, onSave }: {
  valuePaisas: number; symbol: string; label: string; onSave: (major: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  function start() { setText(valuePaisas ? String(valuePaisas / 100) : ""); setEditing(true); }
  function commit() {
    const raw = text.trim();
    let next = 0;
    if (raw && !/^0+(\.0*)?$/.test(raw)) {
      const r = evaluateAmount(raw);
      if (!r.ok) { toast.error(r.error); return; }
      next = r.value;
    }
    setEditing(false);
    if (Math.round(next * 100) !== valuePaisas) onSave(next);
  }

  if (editing) {
    return (
      <Input
        autoFocus inputMode="decimal" aria-label={label} value={text} placeholder={`${symbol} amount`} className="h-8 w-40 text-sm"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
        }}
      />
    );
  }
  if (!valuePaisas) {
    return <button type="button" onClick={start} className="text-sm text-primary hover:underline underline-offset-2 whitespace-nowrap shrink-0">Set budget</button>;
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium tabular-nums">{fmt(valuePaisas, symbol)}</span>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Edit budget" onClick={start}><Pencil className="h-3.5 w-3.5" /></Button>
    </div>
  );
}
