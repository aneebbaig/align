"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MoreHorizontal, Pencil, Store, Scale, Loader2, Check, AlertTriangle, BadgeCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineText, InlineAmount } from "@/components/shared/inline-fields";
import {
  createWeddingExpense, updateWeddingExpense, deleteWeddingExpense, markWeddingExpensePaid,
} from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { sumTotals, paymentStatus, varianceOf, costOf, cheapestQuote } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { WeddingPlan, WeddingExpense, PAYMENT_STATUS_CONFIG, fmt, getEventInfo, getExpenseCategoryLabel } from "./wedding-types";
import { ExpenseSheet } from "./wedding-expense-sheet";

// ─── one expense tile ────────────────────────────────────────────────────────
// Name and the two prices edit in place and save by themselves; everything else
// (event, category, vendor, payment, notes, quotes) lives in the edit sheet.

function ExpenseRow({ expense, baseSymbol, onOpen, onDelete, onChanged }: {
  expense: WeddingExpense; baseSymbol: string;
  onOpen: () => void; onDelete: () => void; onChanged: () => void;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const fade = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (fade.current) clearTimeout(fade.current); }, []);

  async function save(patch: Parameters<typeof updateWeddingExpense>[1]) {
    setState("saving");
    const result = await updateWeddingExpense(expense.id, patch);
    if (!result.success) { setState("error"); toast.error(result.error ?? "Couldn't save"); return; }
    setState("saved");
    if (fade.current) clearTimeout(fade.current);
    fade.current = setTimeout(() => setState("idle"), 1500);
    onChanged();
  }

  async function payInFull() {
    const result = await markWeddingExpensePaid(expense.id);
    if (result.success) { toast.success("Marked as paid"); onChanged(); } else toast.error(result.error ?? "Failed");
  }

  const status = paymentStatus(expense);
  const statusCfg = PAYMENT_STATUS_CONFIG[status];
  const diff = varianceOf(expense);
  const chosen = expense.quotes.find((q) => q.isChosen);
  const cheapest = cheapestQuote(expense.quotes);

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <InlineText
          ariaLabel="Expense name"
          value={expense.name}
          onSave={(name) => save({ name })}
          className="flex-1 min-w-0 text-sm font-medium text-foreground"
        />
        <span className="w-4 shrink-0" aria-live="polite">
          {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {state === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          {state === "error" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        </span>
        <Badge className={cn("text-[11px] shrink-0", statusCfg.badge)}>{statusCfg.label}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground shrink-0" aria-label="Expense actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}><Pencil className="h-3.5 w-3.5 mr-2" />Edit details &amp; quotes</DropdownMenuItem>
            {status !== "PAID" && <DropdownMenuItem onClick={payInFull}><Wallet className="h-3.5 w-3.5 mr-2" />Mark paid in full</DropdownMenuItem>}
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex items-center gap-x-5 gap-y-1.5 flex-wrap">
        <InlineAmount
          label="Estimate" symbol={baseSymbol} valuePaisas={expense.estimatedAmount}
          disabled={!!chosen} hint={chosen ? "Follows the quote you chose - change it in Edit details" : undefined}
          onSave={(v) => save({ estimated: v ?? 0 })}
        />
        <InlineAmount label="Actual" symbol={baseSymbol} valuePaisas={expense.actualAmount} optional onSave={(v) => save({ actual: v })} />
        {diff !== null && diff !== 0 && (
          <span className={cn("text-xs font-medium", diff > 0 ? "text-red-500" : "text-emerald-600")}>
            {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff), baseSymbol)} {diff > 0 ? "over" : "under"} estimate
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{getExpenseCategoryLabel(expense.category)}</span>
        {expense.vendorName && (
          <button onClick={onOpen} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 hover:text-foreground">
            <Store className="h-3 w-3" />{expense.vendorName}
          </button>
        )}
        {expense.quotes.length > 0 && (
          <button onClick={onOpen} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-foreground", chosen ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300")}>
            <Scale className="h-3 w-3" />
            {expense.quotes.length} quotes{chosen ? " · chosen" : cheapest ? ` · from ${fmt(cheapest.amount, baseSymbol)}` : " · compare"}
          </button>
        )}
        {status === "PART_PAID" && <span>{fmt(expense.paidAmount, baseSymbol)} of {fmt(costOf(expense), baseSymbol)} paid</span>}
        {expense.notes && <span className="italic truncate max-w-[16rem]">{expense.notes}</span>}
      </div>
    </div>
  );
}

// ─── quick add ───────────────────────────────────────────────────────────────

function QuickAdd({ planId, eventId, baseSymbol, onAdded }: { planId: string; eventId: string; baseSymbol: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [estimate, setEstimate] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function add() {
    if (!name.trim() || busy) return;
    const parsed = estimate.trim() ? evaluateAmount(estimate) : null;
    if (parsed && !parsed.ok) { toast.error(parsed.error); return; }
    setBusy(true);
    const result = await createWeddingExpense(planId, {
      name, estimated: parsed?.ok ? parsed.value : 0, eventId: eventId || null,
    });
    setBusy(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    setName(""); setEstimate("");
    onAdded();
    nameRef.current?.focus(); // keep going: brain-dump the next one
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void add(); } };

  return (
    <div className="flex gap-2 items-center">
      <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} placeholder="Add an expense - e.g. Bridal dress, DJ, Fireworks" className="flex-1" />
      <div className="relative w-36 shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{baseSymbol}</span>
        <Input value={estimate} onChange={(e) => setEstimate(e.target.value)} onKeyDown={onKey} inputMode="decimal" placeholder="Estimate" className="pl-8" />
      </div>
      <Button onClick={add} disabled={!name.trim() || busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add
      </Button>
    </div>
  );
}

// ─── tab ─────────────────────────────────────────────────────────────────────

export function WeddingExpensesTab({ plan, baseSymbol = "Rs" }: { plan: WeddingPlan; baseSymbol?: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("ALL"); // ALL | GENERAL | event id
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = () => router.refresh();
  const events = [...plan.events].sort((a, b) => a.order - b.order);
  const visible = plan.expenses.filter((e) =>
    filter === "ALL" ? true : filter === "GENERAL" ? e.eventId === null : e.eventId === filter);
  const totals = sumTotals(visible);
  const open = plan.expenses.find((e) => e.id === openId) ?? null;

  // Sections: whole-wedding items first, then each event in order.
  const sections = [
    { key: "GENERAL", title: "Whole wedding", emoji: "💍", allocated: 0, rows: visible.filter((e) => e.eventId === null) },
    ...events.map((ev) => ({ key: ev.id, title: ev.name, emoji: getEventInfo(ev.type).emoji, allocated: ev.budgetAllocated, rows: visible.filter((e) => e.eventId === ev.id) })),
  ].filter((s) => s.rows.length > 0);

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteWeddingExpense(deleteId);
    if (result.success) toast.success("Expense deleted"); else toast.error(result.error ?? "Failed");
    setDeleteId(null);
    refresh();
  }

  const chip = (value: string, label: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        filter === value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground")}
    >{label}</button>
  );

  return (
    <div className="space-y-5">
      <QuickAdd planId={plan.id} eventId={filter !== "ALL" && filter !== "GENERAL" ? filter : ""} baseSymbol={baseSymbol} onAdded={refresh} />

      {events.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {chip("ALL", "All")}
          {chip("GENERAL", "Whole wedding")}
          {events.map((ev) => chip(ev.id, ev.name))}
        </div>
      )}

      {plan.expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {[
            { label: "Planned total", value: fmt(totals.projected, baseSymbol), sub: "actual where known" },
            { label: "Estimated", value: fmt(totals.estimated, baseSymbol), sub: `${totals.count} expenses` },
            { label: "Paid", value: fmt(totals.paid, baseSymbol), sub: "so far", tone: "text-emerald-600 dark:text-emerald-400" },
            { label: "Still to pay", value: fmt(totals.outstanding, baseSymbol), sub: `${totals.priced} of ${totals.count} priced` },
          ].map((c) => (
            <div key={c.label} className="bg-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{c.label}</p>
              <p className={cn("text-lg font-bold tabular-nums", c.tone)}>{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {plan.expenses.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="Nothing planned yet"
          description="Type everything you can think of above - dresses, venue, DJ, fireworks. Rough estimates are fine; refine them as you get quotes."
          className="border border-dashed border-border rounded-xl"
        />
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nothing here yet - add an expense above.</p>
      ) : (
        <div className="space-y-6">
          {sections.map((s) => {
            const t = sumTotals(s.rows);
            return (
              <section key={s.key}>
                <div className="flex items-baseline justify-between gap-3 mb-2 px-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    <span className="mr-1.5">{s.emoji}</span>{s.title}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{s.rows.length}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{fmt(t.projected, baseSymbol)}</span>
                    {s.allocated > 0 && <span className={cn("ml-1.5", t.projected > s.allocated && "text-red-500")}>of {fmt(s.allocated, baseSymbol)} set aside</span>}
                  </p>
                </div>
                <div className="space-y-2">
                  {s.rows.map((e) => (
                    <ExpenseRow key={e.id} expense={e} baseSymbol={baseSymbol} onOpen={() => setOpenId(e.id)} onDelete={() => setDeleteId(e.id)} onChanged={refresh} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ExpenseSheet expense={open} events={events} baseSymbol={baseSymbol} onClose={() => setOpenId(null)} onChanged={refresh} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this expense?"
        description="Its quotes go with it. This can't be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
