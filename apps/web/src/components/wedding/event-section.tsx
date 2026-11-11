"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Loader2, MapPin, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InlineAmount } from "@/components/shared/inline-fields";
import { createWeddingExpense, updateWeddingEvent } from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { budgetStatus, sumTotals, tippingExpense } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetMeter, BudgetPill, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { ExpenseRow, EXPENSE_GRID, type SheetSection } from "./expense-row";
import { WeddingEvent, WeddingExpense, EVENT_STATUS_CONFIG, fmt, getEventInfo } from "./wedding-types";

const RESPONSIBLE: Record<string, string> = { BRIDE: "Bride's family", GROOM: "Groom's family", JOINT: "Joint" };

interface RowCallbacks {
  events: WeddingEvent[]; allExpenses: WeddingExpense[]; totalBudget: number; baseSymbol: string;
  onOpen: (id: string, section?: SheetSection) => void;
  onDelete: (id: string) => void;
  onChanged: () => void;
  onNewEvent: (expenseId: string | null) => void;
}

/** Remember which sections are folded away, per wedding, across visits. */
function useCollapsed(planId: string, key: string): [boolean, (v: boolean) => void] {
  const storeKey = `wedding:${planId}:collapsed`;
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed((JSON.parse(localStorage.getItem(storeKey) ?? "[]") as string[]).includes(key)); } catch { /* ignore */ }
  }, [storeKey, key]);
  function set(v: boolean) {
    setCollapsed(v);
    try {
      const cur = new Set(JSON.parse(localStorage.getItem(storeKey) ?? "[]") as string[]);
      if (v) cur.add(key); else cur.delete(key);
      localStorage.setItem(storeKey, JSON.stringify([...cur]));
    } catch { /* ignore */ }
  }
  return [collapsed, set];
}

// ─── add row ─────────────────────────────────────────────────────────────────

function AddRow({ planId, eventId, label, budget, projected, baseSymbol, onAdded }: {
  planId: string; eventId: string | null; label: string; budget: number; projected: number; baseSymbol: string; onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [estimate, setEstimate] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  const parsed = estimate.trim() ? evaluateAmount(estimate) : null;
  const typed = parsed?.ok ? Math.round(parsed.value * 100) : 0;
  const after = budgetStatus(projected + typed, budget);

  async function add() {
    if (!name.trim() || busy) return;
    if (parsed && !parsed.ok) { toast.error(parsed.error); return; }
    setBusy(true);
    const result = await createWeddingExpense(planId, { name, estimated: parsed?.ok ? parsed.value : 0, eventId });
    setBusy(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    setName(""); setEstimate("");
    onAdded();
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void add(); } };

  return (
    <div className="border-t border-border/60 px-4 py-2" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <div className="flex items-center gap-2">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
        <input
          value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey}
          placeholder={`Add to ${label}…`} aria-label={`Add an expense to ${label}`}
          className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
        {(name || estimate) && (
          <div className="flex items-center gap-1 rounded-md border border-border px-2 h-7 w-32 focus-within:border-primary">
            <span className="text-xs text-muted-foreground">{baseSymbol}</span>
            <input value={estimate} onChange={(e) => setEstimate(e.target.value)} onKeyDown={onKey} inputMode="decimal" placeholder="Estimate" aria-label="Estimate" className="w-full min-w-0 bg-transparent text-sm outline-none tabular-nums" />
          </div>
        )}
      </div>
      {focused && typed > 0 && budget > 0 && (
        <p className={cn("mt-1 pl-5 text-xs", BUDGET_TONE[after.state].text)}>
          {after.state === "over" ? `Would take ${label} ${fmt(after.overBy, baseSymbol)} over budget` : `Leaves ${fmt(after.left, baseSymbol)} in ${label}`}
        </p>
      )}
    </div>
  );
}

// ─── event / whole-wedding section ──────────────────────────────────────────

export function EventSection({ planId, event, rows, allRows, generalBudget, filtered, ...cb }: RowCallbacks & {
  planId: string;
  /** null = the "Whole wedding" section. */
  event: WeddingEvent | null;
  /** Rows to show (after filters), in display order. */
  rows: WeddingExpense[];
  /** Every expense in this section, filters aside - budget maths always use all of them. */
  allRows: WeddingExpense[];
  /** Budget left for the whole-wedding section (total budget minus event budgets; 0 = none). */
  generalBudget: number;
  filtered: boolean;
  onEditEvent: (ev: WeddingEvent) => void;
  onDeleteEvent: (ev: WeddingEvent) => void;
}) {
  const { baseSymbol: sym } = cb;
  const key = event?.id ?? "GENERAL";
  const [collapsed, setCollapsed] = useCollapsed(planId, key);
  const budget = event ? event.budgetAllocated : generalBudget;
  const totals = sumTotals(allRows);
  const shown = sumTotals(rows);
  const status = budgetStatus(totals.projected, budget);
  const info = event ? getEventInfo(event.type) : null;
  const title = event ? event.name : "Whole wedding";
  const tip = tippingExpense(allRows.map((r) => ({ ...r })), budget);
  const statusCfg = event ? EVENT_STATUS_CONFIG[event.status] ?? EVENT_STATUS_CONFIG.PLANNED : null;

  async function setStatus(status: string) {
    if (!event) return;
    const r = await updateWeddingEvent(event.id, { status });
    if (r.success) cb.onChanged(); else toast.error(r.error ?? "Failed");
  }
  async function saveBudget(v: number | null) {
    if (!event) return;
    const r = await updateWeddingEvent(event.id, { budgetAllocated: v ?? 0 });
    if (r.success) cb.onChanged(); else toast.error(r.error ?? "Failed");
  }

  const meta = event ? [
    event.date ? format(new Date(event.date), "d MMM") : null,
    event.venue ? <span key="v" className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{event.venue}</span> : null,
    event.guestCount ? <span key="g" className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{event.guestCount}</span> : null,
    RESPONSIBLE[event.responsibleParty] ?? null,
  ].filter(Boolean) : [];

  return (
    <section id={`section-${key}`} className={cn("scroll-mt-24 bg-card border rounded-xl overflow-hidden", status.state === "over" ? "ring-1 ring-red-500/40" : "")}>
      <div className="px-4 pt-3 pb-2.5 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 min-w-0 text-left" aria-expanded={!collapsed}>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", collapsed && "-rotate-90")} />
            <h3 className="text-sm font-semibold truncate">{info ? info.emoji : "💍"} {title}</h3>
            <span className="text-xs text-muted-foreground shrink-0">{allRows.length}</span>
          </button>
          {event && statusCfg && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0", statusCfg.badge)}>
                  {statusCfg.label}<ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.entries(EVENT_STATUS_CONFIG).map(([k, v]) => <DropdownMenuItem key={k} onClick={() => setStatus(k)}>{v.label}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {meta.length > 0 && (
            <p className="hidden md:flex items-center gap-x-2 text-xs text-muted-foreground truncate min-w-0">
              {meta.map((m, i) => <span key={i} className="inline-flex items-center gap-x-2 truncate">{i > 0 && <span aria-hidden>·</span>}{m}</span>)}
            </p>
          )}
          {event && (
            <div className="ml-auto flex items-center shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label={`Edit ${event.name}`} onClick={() => cb.onEditEvent(event)}><Pencil className="h-3.5 w-3.5" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Event actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => cb.onEditEvent(event)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit event</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => cb.onDeleteEvent(event)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete event</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs">
          {event ? (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Budget</span>
              <div className="w-28"><InlineAmount variant="bare" label={`${event.name} budget`} symbol={sym} valuePaisas={event.budgetAllocated || null} optional onSave={saveBudget} /></div>
            </div>
          ) : (
            <span className="text-muted-foreground" title="Your total budget minus what you've given to events">
              {budget > 0 ? `Unallocated budget ${fmt(budget, sym)}` : "No separate budget"}
            </span>
          )}
          <span className="tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{fmt(totals.projected, sym)}</span> planned{totals.paid > 0 ? ` · ${fmt(totals.paid, sym)} paid` : ""}
          </span>
          {budget > 0 && <span className="ml-auto"><BudgetPill projected={totals.projected} budget={budget} symbol={sym} /></span>}
        </div>

        {budget > 0 && <BudgetMeter projected={totals.projected} paid={totals.paid} budget={budget} symbol={sym} />}
      </div>

      {collapsed ? null : (
        <>
          {rows.length > 0 && (
            <div className={cn("hidden sm:grid py-1.5 border-t border-border/60 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60", EXPENSE_GRID)}>
              <span />
              <span className="text-right pr-2">Estimate</span><span className="text-right pr-2">Actual</span><span>Payment</span><span />
            </div>
          )}
          {rows.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              events={cb.events} expenses={cb.allExpenses} totalBudget={cb.totalBudget} baseSymbol={sym}
              budgetHint={tip?.id === e.id ? `Takes ${title} ${fmt(tip.overBy, sym)} over budget` : null}
              onOpen={(section) => cb.onOpen(e.id, section)}
              onDelete={() => cb.onDelete(e.id)}
              onChanged={cb.onChanged}
              onNewEvent={cb.onNewEvent}
            />
          ))}
          {rows.length === 0 && allRows.length > 0 && <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">Nothing matches the filter here.</p>}
          <AddRow planId={planId} eventId={event?.id ?? null} label={title} budget={budget} projected={totals.projected} baseSymbol={sym} onAdded={cb.onChanged} />
          {rows.length > 0 && (
            <div className={cn("py-2 border-t border-border/60 text-xs font-semibold tabular-nums", EXPENSE_GRID)}>
              <span className="text-muted-foreground font-medium">
                Total{filtered && shown.count !== totals.count ? ` (${shown.count} shown · totals above include hidden)` : ""}
                <span className="sm:hidden"> · est {fmt(shown.estimated, sym)}</span>
              </span>
              <span className="hidden sm:block text-right pr-2">{fmt(shown.estimated, sym)}</span>
              <span className="hidden sm:block text-right pr-2 text-muted-foreground">{shown.priced > 0 ? fmt(shown.actual, sym) : "—"}</span>
              <span className="hidden sm:block" /><span className="hidden sm:block" />
            </div>
          )}
        </>
      )}
      {collapsed && <p className="sr-only">{budgetCopy(totals.projected, budget, sym)}</p>}
    </section>
  );
}

// ─── category section (the "By category" view) ───────────────────────────────

export function CategorySection({ title, rows, ...cb }: RowCallbacks & { title: string; rows: WeddingExpense[] }) {
  const sym = cb.baseSymbol;
  const totals = sumTotals(rows);
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h3 className="text-sm font-semibold truncate">{title} <span className="text-xs font-normal text-muted-foreground">{rows.length}</span></h3>
        <p className="text-xs text-muted-foreground tabular-nums"><span className="font-semibold text-foreground">{fmt(totals.projected, sym)}</span> planned</p>
      </div>
      {rows.map((e) => (
        <ExpenseRow
          key={e.id} expense={e}
          events={cb.events} expenses={cb.allExpenses} totalBudget={cb.totalBudget} baseSymbol={sym} budgetHint={null}
          onOpen={(section) => cb.onOpen(e.id, section)} onDelete={() => cb.onDelete(e.id)} onChanged={cb.onChanged} onNewEvent={cb.onNewEvent}
        />
      ))}
    </section>
  );
}
