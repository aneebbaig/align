"use client";

import { useMemo, useState } from "react";
import { addDays, nextMonday, nextSaturday, isSaturday } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toDateStr } from "@/lib/day-strip";

/** Quick due-date options relative to `today`, as yyyy-MM-dd in local time. */
export function dueDateOptions(today: Date): { label: string; value: string | null }[] {
  const weekend = isSaturday(today) ? today : nextSaturday(today);
  return [
    { label: "None", value: null },
    { label: "Today", value: toDateStr(today) },
    { label: "Tomorrow", value: toDateStr(addDays(today, 1)) },
    { label: "This weekend", value: toDateStr(weekend) },
    { label: "Next week", value: toDateStr(nextMonday(today)) },
  ];
}

/** One-tap due date chips; the value is yyyy-MM-dd or null. */
export function DueDateChips({
  value,
  onChange,
  compact,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  compact?: boolean;
}) {
  const today = useMemo(() => new Date(), []);
  const options = dueDateOptions(today);
  const [pickOpen, setPickOpen] = useState(false);
  const matched = options.some((o) => o.value === value);
  const custom = value !== null && !matched;

  const chipClass = (on: boolean) => cn(
    "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors whitespace-nowrap",
    on ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border bg-muted/40 hover:bg-muted",
  );

  return (
    <div className="space-y-2 min-w-0 max-w-full">
      <div role="radiogroup" aria-label="Due date" className={cn("flex gap-1.5 overflow-x-auto pb-1", compact && "pb-0")}>
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => { setPickOpen(false); onChange(o.value); }}
            className={chipClass(o.value === value)}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={custom || pickOpen}
          onClick={() => setPickOpen((o) => !o)}
          className={chipClass(custom || pickOpen)}
        >
          {custom ? value : "Pick…"}
        </button>
      </div>
      {(pickOpen || custom) && (
        <Input
          type="date"
          aria-label="Pick a due date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}
    </div>
  );
}
