"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createWeddingEvent } from "@/actions/wedding";
import { cn } from "@/lib/utils";
import { EVENT_TYPES, getEventInfo } from "./wedding-types";

const STARTER = ["DHOLKI", "MAYUN", "MEHNDI", "NIKKAH", "BARAT", "VALIMA"] as const;

/** First run: tap the typical events instead of building them one by one. */
export function StarterEvents({ planId, onDone, onCustom }: { planId: string; onDone: () => void; onCustom: () => void }) {
  const [picked, setPicked] = useState<string[]>(["NIKKAH", "BARAT", "VALIMA"]);
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    for (const type of EVENT_TYPES.filter((t) => picked.includes(t.value))) {
      const r = await createWeddingEvent(planId, { type: type.value, name: type.label, order: type.order });
      if (!r.success) { toast.error(r.error ?? "Failed"); break; }
    }
    setBusy(false);
    onDone();
  }
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Start with your events</p>
        <p className="text-xs text-muted-foreground">Every expense belongs to an event, and the wedding budget is what its events add up to. Tap the ones you&apos;re having.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STARTER.map((v) => {
          const t = getEventInfo(v);
          const on = picked.includes(v);
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => setPicked((p) => on ? p.filter((x) => x !== v) : [...p, v])}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground")}>
              {t.emoji} {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={add} disabled={busy || picked.length === 0}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Add selected</Button>
        <button type="button" onClick={onCustom} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Custom event</button>
      </div>
    </div>
  );
}
