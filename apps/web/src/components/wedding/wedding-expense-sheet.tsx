"use client";

import { useState } from "react";
import { Check, Pencil, Phone, Trash2, Wallet, X, AtSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  updateWeddingExpense, markWeddingExpensePaid, addWeddingQuote, updateWeddingQuote,
  chooseWeddingQuote, clearWeddingQuoteChoice, deleteWeddingQuote,
} from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { cheapestQuote, quoteSpread, costOf } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { WeddingExpense, WeddingEvent, EXPENSE_CATEGORIES, fmt } from "./wedding-types";

/** "" -> null (blank), a number or sum -> its value, anything else -> undefined (invalid). */
function parseMoney(text: string): number | null | undefined {
  if (!text.trim()) return null;
  if (/^0+(\.0*)?$/.test(text.trim())) return 0;
  const r = evaluateAmount(text);
  return r.ok ? r.value : undefined;
}

const GENERAL = "GENERAL";
const asText = (paisas: number) => (paisas ? String(paisas / 100) : "");

// ─── quotes ──────────────────────────────────────────────────────────────────

function Quotes({ expense, baseSymbol, onChanged }: { expense: WeddingExpense; baseSymbol: string; onChanged: () => void }) {
  const empty = { vendor: "", amount: "", phone: "", instagram: "", notes: "" };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));

  const quotes = expense.quotes;
  const cheapest = cheapestQuote(quotes);
  const spread = quoteSpread(quotes);

  function startEdit(q: WeddingExpense["quotes"][number]) {
    setEditingId(q.id);
    setForm({ vendor: q.vendorName, amount: asText(q.amount), phone: q.phone ?? "", instagram: q.instagram ?? "", notes: q.notes ?? "" });
  }
  const reset = () => { setEditingId(null); setForm(empty); };

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
        <h3 className="text-sm font-semibold">Quotations</h3>
        <p className="text-xs text-muted-foreground">
          {quotes.length === 0
            ? "Got prices from a few vendors? Add each one, then choose the best."
            : spread > 0 ? `${fmt(spread, baseSymbol)} between the cheapest and dearest.` : "Compare and pick one."}
        </p>
      </div>

      {quotes.length > 0 && (
        <ul className="space-y-2">
          {quotes.map((q) => (
            <li key={q.id} className={cn("rounded-lg border p-3", q.isChosen ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-border")}>
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

      <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{editingId ? "Edit quote" : "Add a quote"}</p>
        <div className="grid grid-cols-5 gap-2">
          <Input className="col-span-3" placeholder="Vendor" value={form.vendor} onChange={(e) => set({ vendor: e.target.value })} />
          <Input className="col-span-2" inputMode="decimal" placeholder={`Amount (${baseSymbol})`} value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          <Input className="col-span-2" placeholder="Phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          <Input className="col-span-3" placeholder="Instagram" value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} />
        </div>
        <Input placeholder="Notes - what's included, terms..." value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} disabled={busy}>{editingId ? "Save quote" : "Add quote"}</Button>
          {editingId && <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>}
        </div>
      </div>
    </section>
  );
}

// ─── body ────────────────────────────────────────────────────────────────────

function SheetBody({ expense, events, baseSymbol, onChanged }: {
  expense: WeddingExpense; events: WeddingEvent[]; baseSymbol: string; onChanged: () => void;
}) {
  const chosen = expense.quotes.find((q) => q.isChosen);
  const [d, setD] = useState({
    category: expense.category,
    eventId: expense.eventId ?? GENERAL,
    vendorName: expense.vendorName ?? "",
    vendorPhone: expense.vendorPhone ?? "",
    vendorInstagram: expense.vendorInstagram ?? "",
    paid: asText(expense.paidAmount),
    notes: expense.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof d>) => setD((p) => ({ ...p, ...patch }));
  const cost = costOf(expense);

  async function save() {
    const paid = parseMoney(d.paid);
    if (paid === undefined) { toast.error("Check the paid amount"); return; }
    setSaving(true);
    const result = await updateWeddingExpense(expense.id, {
      category: d.category,
      eventId: d.eventId === GENERAL ? null : d.eventId,
      vendorName: d.vendorName, vendorPhone: d.vendorPhone, vendorInstagram: d.vendorInstagram,
      paid: paid ?? 0,
      notes: d.notes,
    });
    setSaving(false);
    if (result.success) { toast.success("Saved"); onChanged(); } else toast.error(result.error ?? "Failed");
  }

  async function payInFull() {
    const result = await markWeddingExpensePaid(expense.id);
    if (result.success) { toast.success("Marked as paid"); set({ paid: asText(cost) }); onChanged(); } else toast.error(result.error ?? "Failed");
  }

  return (
    <div className="space-y-6 overflow-y-auto pb-6 -mr-2 pr-2">
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={d.category} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Event</Label>
            <Select value={d.eventId} onValueChange={(v) => set({ eventId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={GENERAL}>Whole wedding</SelectItem>
                {events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Vendor</Label>
          {chosen ? (
            <p className="text-sm rounded-md bg-muted/50 px-3 py-2">
              {chosen.vendorName} <span className="text-xs text-muted-foreground">· from the quote you chose</span>
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              <Input className="col-span-5" placeholder="Who is it with? (optional)" value={d.vendorName} onChange={(e) => set({ vendorName: e.target.value })} />
              <Input className="col-span-2" placeholder="Phone" value={d.vendorPhone} onChange={(e) => set({ vendorPhone: e.target.value })} />
              <Input className="col-span-3" placeholder="Instagram" value={d.vendorInstagram} onChange={(e) => set({ vendorInstagram: e.target.value })} />
            </div>
          )}
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything to remember..." />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payment</h3>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={payInFull}><Wallet className="h-3.5 w-3.5" />Pay in full</Button>
        </div>
        <div className="flex items-center gap-2">
          <Input inputMode="decimal" value={d.paid} onChange={(e) => set({ paid: e.target.value })} placeholder="0" className="w-40" />
          <span className="text-xs text-muted-foreground">paid so far of {fmt(cost, baseSymbol)} · deposits count here</span>
        </div>
      </section>

      <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save details"}</Button>

      <hr className="border-border" />
      <Quotes expense={expense} baseSymbol={baseSymbol} onChanged={onChanged} />
    </div>
  );
}

export function ExpenseSheet({ expense, events, baseSymbol, onClose, onChanged }: {
  expense: WeddingExpense | null; events: WeddingEvent[]; baseSymbol: string; onClose: () => void; onChanged: () => void;
}) {
  return (
    <Sheet open={!!expense} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:w-[480px]">
        <SheetHeader>
          <SheetTitle className="truncate pr-8">{expense?.name ?? ""}</SheetTitle>
        </SheetHeader>
        {expense && <SheetBody key={expense.id} expense={expense} events={events} baseSymbol={baseSymbol} onChanged={onChanged} />}
      </SheetContent>
    </Sheet>
  );
}
