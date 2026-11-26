"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWeddingExpense } from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { budgetStatus } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BUDGET_TONE } from "./budget-meter";
import { GENERAL, WeddingEvent, fmt, getEventInfo } from "./wedding-types";

/** Where an added expense would land, so the bar can say what it does to that budget. */
export type ImpactInfo = { projected: number; budget: number; label: string };

const storageKey = (planId: string) => `wedding:last-event:${planId}`;

/**
 * Brain-dump bar: name + estimate (sums allowed), Enter adds and keeps focus for the next.
 * With `fixedEventId` (null = Whole wedding) it always adds there; without it an event
 * picker shows, remembering the last event used for this wedding. "/" focuses the name.
 */
export function ExpenseAddBar({ planId, events, sym, fixedEventId, impactFor, onAdded }: {
  planId: string; events: WeddingEvent[]; sym: string;
  fixedEventId?: string | null; impactFor?: (eventId: string | null) => ImpactInfo;
  onAdded: () => void;
}) {
  const picking = fixedEventId === undefined;
  const [pick, setPick] = useState<string>(GENERAL);
  const [name, setName] = useState("");
  const [estimate, setEstimate] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Remembered per wedding; read after mount so server and client markup agree.
  useEffect(() => {
    if (!picking) return;
    try {
      const saved = localStorage.getItem(storageKey(planId));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === GENERAL || (saved && events.some((e) => e.id === saved))) setPick(saved);
    } catch { /* storage unavailable: stay on Whole wedding */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, picking]);
  // An event that disappeared (deleted) falls back to Whole wedding.
  const eventId = picking ? (pick !== GENERAL && events.some((e) => e.id === pick) ? pick : null) : fixedEventId;

  function choose(v: string) {
    setPick(v);
    try { localStorage.setItem(storageKey(planId), v); } catch { /* ignore */ }
    nameRef.current?.focus();
  }

  const parsed = estimate.trim() ? evaluateAmount(estimate) : null;
  const typed = parsed?.ok ? Math.round(parsed.value * 100) : 0;
  const info = impactFor?.(eventId ?? null);
  const impact = info ? budgetStatus(info.projected + typed, info.budget) : null;

  async function add() {
    if (!name.trim() || busy) return;
    if (parsed && !parsed.ok) { toast.error(parsed.error); return; }
    setBusy(true);
    const r = await createWeddingExpense(planId, { name, estimated: parsed?.ok ? parsed.value : 0, eventId });
    setBusy(false);
    if (!r.success) { toast.error(r.error ?? "Failed"); return; }
    setName(""); setEstimate("");
    onAdded();
    nameRef.current?.focus(); // keep going - brain-dump the next one
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void add(); } };

  // "/" jumps to the bar, unless you're already typing somewhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el?.matches("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      nameRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="space-y-1.5" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
        {picking && (
          <Select value={eventId ?? GENERAL} onValueChange={choose}>
            <SelectTrigger className="h-10 w-full sm:w-44 shrink-0" aria-label="Add to event"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERAL}>💍 Whole wedding</SelectItem>
              {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{getEventInfo(ev.type).emoji} {ev.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} placeholder="Add an expense – e.g. Venue, Photographer  ( / )" aria-label="New expense name" className="flex-1 min-w-0 basis-40 h-10" />
        <div className="relative w-28 sm:w-36 shrink-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{sym}</span>
          <Input value={estimate} onChange={(e) => setEstimate(e.target.value)} onKeyDown={onKey} inputMode="decimal" placeholder="Estimate" aria-label="Estimate" className="pl-8 h-10" />
        </div>
        <Button onClick={add} disabled={!name.trim() || busy} className="h-10">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add</Button>
      </div>
      {focused && typed > 0 && info && info.budget > 0 && impact && (
        <p className={cn("text-xs pl-1", BUDGET_TONE[impact.state].text)}>
          {impact.state === "over" ? `Would take ${info.label} ${fmt(impact.overBy, sym)} over budget` : `Leaves ${fmt(impact.left, sym)} in ${info.label}`}
        </p>
      )}
    </div>
  );
}
