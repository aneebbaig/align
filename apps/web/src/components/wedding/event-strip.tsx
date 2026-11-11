"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createWeddingEvent } from "@/actions/wedding";
import { sumTotals, unallocated } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetMeter } from "./budget-meter";
import { ALL, GENERAL_FOCUS } from "./budget-summary";
import { WeddingPlan, WeddingEvent, EVENT_STATUS_CONFIG, EVENT_TYPES, fmtShort, getEventInfo } from "./wedding-types";

const STARTER = ["DHOLKI", "MAYUN", "MEHNDI", "NIKKAH", "BARAT", "VALIMA"] as const;

/** First run: tap the typical events instead of building them one by one. */
function StarterEvents({ planId, onDone, onCustom }: { planId: string; onDone: () => void; onCustom: () => void }) {
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
        <p className="text-xs text-muted-foreground">Expenses belong to an event (or the whole wedding), and each event can have its own budget. Tap the ones you&apos;re having.</p>
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

/** Event cards: they show every event's budget at a glance and double as the focus filter. */
export function EventStrip({ plan, focus, baseSymbol: sym, onFocus, onEdit, onAdd, onChanged }: {
  plan: WeddingPlan; focus: string; baseSymbol: string;
  onFocus: (f: string) => void; onEdit: (ev: WeddingEvent) => void; onAdd: () => void; onChanged: () => void;
}) {
  const events = [...plan.events].sort((a, b) => a.order - b.order);
  const ref = useRef<HTMLDivElement>(null);
  if (events.length === 0) return <StarterEvents planId={plan.id} onDone={onChanged} onCustom={onAdd} />;

  const totalsFor = (id: string | null) => sumTotals(plan.expenses.filter((e) => e.eventId === id));
  const all = sumTotals(plan.expenses);
  const general = totalsFor(null);
  const left = unallocated(plan.totalBudget, plan.events);

  // Left/Right move between cards, like a tab strip.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("[data-card]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  const card = (selected: boolean, over = false) =>
    cn("snap-start w-44 shrink-0 text-left rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20",
      selected ? "ring-2 ring-primary/70" : over ? "ring-1 ring-red-500/50" : "");

  return (
    <div ref={ref} onKeyDown={onKeyDown} className="flex gap-2 overflow-x-auto snap-x pb-1 -mx-4 px-4 [scrollbar-width:thin]">
      <button data-card type="button" aria-pressed={focus === ALL} onClick={() => onFocus(ALL)} className={card(focus === ALL)}>
        <p className="text-sm font-medium">All</p>
        <p className="text-xs text-muted-foreground tabular-nums">{fmtShort(all.projected, sym)} planned</p>
        <BudgetMeter className="mt-2" size="xs" shortCopy projected={all.projected} paid={all.paid} budget={plan.totalBudget} symbol={sym} />
      </button>

      <button data-card type="button" aria-pressed={focus === GENERAL_FOCUS} onClick={() => onFocus(focus === GENERAL_FOCUS ? ALL : GENERAL_FOCUS)} className={card(focus === GENERAL_FOCUS)}>
        <p className="text-sm font-medium truncate">💍 Whole wedding</p>
        <p className="text-xs text-muted-foreground tabular-nums">{fmtShort(general.projected, sym)}{plan.totalBudget > 0 && left > 0 ? ` · ${fmtShort(left, sym)} unallocated` : ""}</p>
        <BudgetMeter className="mt-2" size="xs" shortCopy projected={general.projected} paid={general.paid} budget={plan.totalBudget > 0 ? Math.max(0, left) : 0} symbol={sym} />
      </button>

      {events.map((ev) => {
        const t = totalsFor(ev.id);
        const cfg = EVENT_STATUS_CONFIG[ev.status] ?? EVENT_STATUS_CONFIG.PLANNED;
        const over = ev.budgetAllocated > 0 && t.projected > ev.budgetAllocated;
        return (
          <div key={ev.id} className="relative group shrink-0 snap-start">
            <button data-card type="button" aria-pressed={focus === ev.id} onClick={() => onFocus(focus === ev.id ? ALL : ev.id)} onDoubleClick={() => onEdit(ev)} className={card(focus === ev.id, over)}>
              <p className="text-sm font-medium truncate pr-5">{getEventInfo(ev.type).emoji} {ev.name}</p>
              <p className="text-xs text-muted-foreground">{ev.date ? format(new Date(ev.date), "d MMM") : "No date"}</p>
              <BudgetMeter className="mt-2" size="xs" shortCopy projected={t.projected} paid={t.paid} budget={ev.budgetAllocated} symbol={sym} />
              <span className={cn("mt-1.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium", cfg.badge)}>{cfg.label}</span>
            </button>
            <button type="button" aria-label={`Edit ${ev.name}`} onClick={() => onEdit(ev)}
              className="absolute top-2 right-2 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <button data-card type="button" onClick={onAdd} className="snap-start w-32 shrink-0 rounded-xl border border-dashed border-border p-3 text-muted-foreground hover:text-foreground hover:border-foreground/30 flex flex-col items-center justify-center gap-1 text-xs">
        <Plus className="h-4 w-4" />Event
      </button>
    </div>
  );
}
