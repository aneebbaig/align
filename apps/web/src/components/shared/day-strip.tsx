"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildDayChips, isInStrip, stepDay, toDateStr } from "@/lib/day-strip";

/** Always-visible row of recent days; the chosen day is a yyyy-MM-dd string. */
export function DayStrip({
  value,
  onChange,
  lastUsed,
  lang,
}: {
  value: string;
  onChange: (date: string) => void;
  lastUsed?: string | null;
  lang?: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [pickOpen, setPickOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const chips = buildDayChips({ today, selected: value, lastUsed });
  const outside = !!value && !isInStrip(value, today);
  const showInput = pickOpen || outside;

  function move(next: string) {
    onChange(next);
    setTimeout(() => groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(), 0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(stepDay(value, -1, today)); }
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(stepDay(value, 1, today)); }
    else if (e.key === "Home") { e.preventDefault(); move(toDateStr(today)); }
  }

  const chipClass = (on: boolean) => cn(
    "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors whitespace-nowrap",
    on ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border bg-muted/40 hover:bg-muted",
  );

  return (
    <div className="space-y-2 min-w-0 max-w-full">
      <div ref={groupRef} role="radiogroup" aria-label="Date" onKeyDown={onKeyDown} className="flex gap-1.5 overflow-x-auto pb-1">
        {chips.map((c) => {
          const on = c.value === value;
          return (
            <button
              key={`${c.kind}:${c.value}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(c.value)}
              className={chipClass(on)}
            >
              {c.label}
            </button>
          );
        })}
        <button type="button" onClick={() => setPickOpen((o) => !o)} className={chipClass(false)}>Pick date…</button>
      </div>
      {showInput && (
        <Input
          type="date"
          aria-label="Pick a date"
          lang={lang}
          value={value}
          onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
        />
      )}
    </div>
  );
}
