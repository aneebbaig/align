"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Phone, Plus, Trash2, Wallet, X, AtSign } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  updateWeddingExpense, markWeddingExpensePaid, addWeddingQuote, updateWeddingQuote,
  chooseWeddingQuote, clearWeddingQuoteChoice, deleteWeddingQuote, deleteWeddingExpense,
} from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { budgetStatus, cheapestQuote, quoteSpread, costOf, varianceOf } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetMeter, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { WeddingExpense, WeddingEvent, EXPENSE_CATEGORIES, fmt, getEventInfo } from "./wedding-types";

/** "" -> null (blank), a number or sum -> its value, anything else -> undefined (invalid). */
function parseMoney(text: string): number | null | undefined {
  if (!text.trim()) return null;
  if (/^0+(\.0*)?$/.test(text.trim())) return 0;
  const r = evaluateAmount(text);
  return r.ok ? r.value : undefined;
}

const HEADING = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
const asText = (paisas: number) => (paisas ? String(paisas / 100) : "");

// ─── quotes ──────────────────────────────────────────────────────────────────

function Quotes({ expense, baseSymbol, onChanged }: { expense: WeddingExpense; baseSymbol: string; onChanged: () => void }) {
  const empty = { vendor: "", amount: "", phone: "", instagram: "", notes: "" };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));

  const quotes = expense.quotes;
  const cheapest = cheapestQuote(quotes);
  const spread = quoteSpread(quotes);

  function startEdit(q: WeddingExpense["quotes"][number]) {
    setEditingId(q.id);
    setAdding(true);
    setForm({ vendor: q.vendorName, amount: asText(q.amount), phone: q.phone ?? "", instagram: q.instagram ?? "", notes: q.notes ?? "" });
  }
  const reset = () => { setEditingId(null); setForm(empty); setAdding(false); };

  async function submit() {
    const amount = parseMoney(form.amount);
    if (!form.vendor.trim()) { toast.error("Enter the vendor's name"); return; }
    if (amount === undefined || amount === null) { toast.error("Enter the quoted amount"); return; }
    setBusy(true);
    const payload = { vendorName: form.vendor, amount, phone: form.phone, instagram: form.instagram, notes: form.notes };
    const result = editingId ? await updateWeddingQuote(editingId, payload) : await addWeddingQuote(expense.id, payload);
    setBusy(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    reset();
    onChanged();
  }

  async function run(fn: () => Promise<{ success: boolean; error?: string }>, ok?: string) {
    const result = await fn();
    if (result.success) { if (ok) toast.success(ok); onChanged(); } else toast.error(result.error ?? "Failed");
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className={HEADING}>Quotes</h3>
        <p className="text-xs text-muted-foreground">
          {quotes.length === 0
            ? "Got prices from a few vendors? Add each one, then choose the best."
            : spread > 0 ? `${fmt(spread, baseSymbol)} between the cheapest and dearest.` : "Compare and pick one."}
        </p>
      </div>

      {quotes.length > 0 && (
        <ul className="space-y-2">
          {quotes.map((q) => (
            <li key={q.id} className={cn("rounded-lg border p-3", q.isChosen ? "ring-1 ring-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20" : "")}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">{q.vendorName}</span>
                    {q.isChosen && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Chosen</Badge>}
                    {cheapest?.id === q.id && <Badge className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">Lowest</Badge>}
                  </div>
                  {(q.phone || q.instagram) && (
                    <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-3">
                      {q.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{q.phone}</span>}
                      {q.instagram && <span className="inline-flex items-center gap-1"><AtSign className="h-3 w-3" />{q.instagram}</span>}
                    </p>
                  )}
                  {q.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">{q.notes}</p>}
                </div>
                <p className="text-sm font-bold tabular-nums shrink-0">{fmt(q.amount, baseSymbol)}</p>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {q.isChosen ? (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => run(() => clearWeddingQuoteChoice(expense.id))}>
                    <X className="h-3.5 w-3.5" />Unchoose
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => run(() => chooseWeddingQuote(q.id), `Going with ${q.vendorName}`)}>
                    <Check className="h-3.5 w-3.5" />Go with this one
                  </Button>
                )}
                <div className="ml-auto flex gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Edit quote" onClick={() => startEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" aria-label="Delete quote" onClick={() => run(() => deleteWeddingQuote(q.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />Add a quote</Button>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">{editingId ? "Edit quote" : "Add a quote"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => set({ vendor: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Amount ({baseSymbol})</Label><Input inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Input placeholder="What's included, terms..." value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={busy}>{editingId ? "Save quote" : "Add quote"}</Button>
            <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── body ────────────────────────────────────────────────────────────────────

const fieldsOf = (e: WeddingExpense) => ({
  name: e.name,
  estimate: asText(e.estimatedAmount),
  actual: e.actualAmount === null ? "" : String(e.actualAmount / 100),
  eventId: e.eventId,
  category: e.category,
  paid: asText(e.paidAmount),
  vendorName: e.vendorName ?? "",
  vendorPhone: e.vendorPhone ?? "",
  vendorInstagram: e.vendorInstagram ?? "",
  notes: e.notes ?? "",
});

function SheetBody({ expense, events, expenses, baseSymbol, initialSection, onChanged, onClose }: {
  expense: WeddingExpense; events: WeddingEvent[]; expenses: WeddingExpense[]; baseSymbol: string;
  initialSection?: "payment" | "quotes"; onChanged: () => void; onClose: () => void;
}) {
  const chosen = expense.quotes.find((q) => q.isChosen);
  const [d, setD] = useState(() => fieldsOf(expense));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof d>) => setD((p) => ({ ...p, ...patch }));
  const cost = costOf(expense);
  const quotesRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  // A chosen quote owns the estimate and vendor, so they follow the saved expense, not the form.
  const saved = fieldsOf(expense);
  const dirty = (Object.keys(saved) as (keyof typeof saved)[]).some((k) => {
    if (chosen && (k === "estimate" || k === "vendorName" || k === "vendorPhone" || k === "vendorInstagram")) return false;
    return d[k] !== saved[k];
  });
  const diff = varianceOf(expense);

  useEffect(() => {
    const target = initialSection === "payment" ? paymentRef.current : initialSection === "quotes" ? quotesRef.current : null;
    target?.scrollIntoView({ block: "start" });
  }, [initialSection]);

  // The meter for the event picked in the form, so you see its effect before saving.
  const event = events.find((e) => e.id === d.eventId) ?? null;
  const inEvent = expenses.filter((e) => e.eventId === d.eventId && e.id !== expense.id);
  const eventProjected = inEvent.reduce((s, e) => s + costOf(e), 0) + cost;
  const eventBudget = event?.budgetAllocated ?? 0;

  async function save() {
    const estimate = parseMoney(d.estimate);
    const actual = parseMoney(d.actual);
    const paid = parseMoney(d.paid);
    if (estimate === undefined) { toast.error("Check the estimate"); return; }
    if (actual === undefined) { toast.error("Check the actual cost"); return; }
    if (paid === undefined) { toast.error("Check the paid amount"); return; }
    setSaving(true);
    const moved = d.eventId !== saved.eventId;
    const result = await updateWeddingExpense(expense.id, {
      name: d.name,
      category: d.category,
      eventId: d.eventId,
      ...(chosen ? {} : { estimated: estimate ?? 0, vendorName: d.vendorName, vendorPhone: d.vendorPhone, vendorInstagram: d.vendorInstagram }),
      actual,
      paid: paid ?? 0,
      notes: d.notes,
    });
    setSaving(false);
    if (!result.success) { toast.error(result.error ?? "Failed"); return; }
    toast.success(moved ? `Moved to ${event?.name ?? "event"}` : "Saved");
    onChanged();
  }

  async function payInFull() {
    const result = await markWeddingExpensePaid(expense.id);
    if (result.success) { toast.success("Marked as paid"); set({ paid: asText(cost) }); onChanged(); } else toast.error(result.error ?? "Failed");
  }

  async function remove() {
    const result = await deleteWeddingExpense(expense.id);
    setConfirmDelete(false);
    if (result.success) { toast.success("Expense deleted"); onClose(); onChanged(); } else toast.error(result.error ?? "Failed");
  }

  return (
    <div className="space-y-6 overflow-y-auto pb-6 -mr-2 pr-2">
      <section className="space-y-4">
        <h3 className={HEADING}>Details</h3>
        <div className="space-y-1.5">
          <Label htmlFor="exp-name">Name</Label>
          <Input id="exp-name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="exp-est">Estimate ({baseSymbol})</Label>
            <Input id="exp-est" inputMode="decimal" value={chosen ? saved.estimate : d.estimate} disabled={!!chosen} title={chosen ? "Follows the quote you chose - change the quote instead" : undefined} onChange={(e) => set({ estimate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-act">Actual cost ({baseSymbol})</Label>
            <Input id="exp-act" inputMode="decimal" value={d.actual} placeholder="Not known yet" onChange={(e) => set({ actual: e.target.value })} />
          </div>
        </div>
        {diff !== null && diff !== 0 && (
          <p className={cn("text-xs tabular-nums", diff > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
            {diff > 0 ? "+" : "−"}{fmt(Math.abs(diff), baseSymbol)} {diff > 0 ? "more" : "less"} than estimated
          </p>
        )}
        <div className="space-y-1.5">
          <Label>Event</Label>
          <Select value={d.eventId} onValueChange={(v) => set({ eventId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{getEventInfo(ev.type).emoji} {ev.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {eventBudget > 0 && (
            <div className="space-y-1 pt-1">
              <BudgetMeter projected={eventProjected} paid={0} budget={eventBudget} symbol={baseSymbol} />
              <p className={cn("text-xs font-medium", BUDGET_TONE[budgetStatus(eventProjected, eventBudget).state].text)}>
                {event?.name}: {budgetCopy(eventProjected, eventBudget, baseSymbol)}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={d.category} onValueChange={(v) => set({ category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </section>

      <section ref={paymentRef} className="space-y-3 scroll-mt-2">
        <h3 className={HEADING}>Payment</h3>
        <div className="space-y-1.5">
          <Label htmlFor="exp-paid">Paid so far ({baseSymbol})</Label>
          <div className="flex items-center gap-2">
            <Input id="exp-paid" inputMode="decimal" value={d.paid} onChange={(e) => set({ paid: e.target.value })} placeholder="0" className="w-40" />
            <Button type="button" size="sm" variant="outline" onClick={payInFull}><Wallet className="h-3.5 w-3.5" />Pay in full</Button>
          </div>
          <p className="text-xs text-muted-foreground">of {fmt(cost, baseSymbol)} · deposits count here</p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={HEADING}>Vendor</h3>
        {chosen ? (
          <p className="text-sm rounded-md bg-muted/50 px-3 py-2">{chosen.vendorName} <span className="text-xs text-muted-foreground">· from the quote you chose</span></p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="exp-vendor">Name</Label><Input id="exp-vendor" placeholder="Who is it with? (optional)" value={d.vendorName} onChange={(e) => set({ vendorName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="exp-phone">Phone</Label><Input id="exp-phone" value={d.vendorPhone} onChange={(e) => set({ vendorPhone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="exp-ig">Instagram</Label><Input id="exp-ig" value={d.vendorInstagram} onChange={(e) => set({ vendorInstagram: e.target.value })} /></div>
            </div>
          </div>
        )}
      </section>

      <div ref={quotesRef} className="scroll-mt-2"><Quotes expense={expense} baseSymbol={baseSymbol} onChanged={onChanged} /></div>

      <section className="space-y-3">
        <h3 className={HEADING}>Notes</h3>
        <Textarea rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything to remember..." />
      </section>

      <div className="space-y-2">
        <Button className="w-full" onClick={save} disabled={saving || !dirty}>{saving ? "Saving..." : "Save"}</Button>
        <Button type="button" variant="ghost" className="w-full text-red-600 hover:text-red-600" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete expense</Button>
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this expense?" description="Its quotes go with it. This can't be undone." onConfirm={remove} />
    </div>
  );
}

export function ExpenseSheet({ expense, events, expenses, baseSymbol, initialSection, onClose, onChanged }: {
  expense: WeddingExpense | null; events: WeddingEvent[]; expenses: WeddingExpense[]; baseSymbol: string;
  initialSection?: "payment" | "quotes"; onClose: () => void; onChanged: () => void;
}) {
  return (
    <Sheet open={!!expense} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:w-[480px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle className="truncate pr-8">{expense?.name ?? ""}</SheetTitle>
        </SheetHeader>
        {expense && (
          <SheetBody key={expense.id} expense={expense} events={events} expenses={expenses} baseSymbol={baseSymbol} initialSection={initialSection} onChanged={onChanged} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}
