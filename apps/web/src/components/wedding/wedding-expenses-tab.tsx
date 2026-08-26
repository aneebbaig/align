"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createWeddingExpense, updateWeddingExpense, deleteWeddingExpense } from "@/actions/wedding";
import { cn } from "@/lib/utils";
import {
  WeddingPlan, WeddingExpense, WeddingEvent, CurrencyLite,
  EXPENSE_CATEGORIES,
  fmt, fmtSource, getEventInfo, getExpenseCategoryLabel,
} from "./wedding-types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function CurrencyToggle({
  currencies,
  value,
  onChange,
}: {
  currencies: CurrencyLite[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-md overflow-hidden border border-border text-xs font-medium">
      {currencies.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            "px-3 py-1.5 transition-colors",
            value === c.id
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          {c.code}
        </button>
      ))}
    </div>
  );
}

// ─── form ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  category: string;
  eventId: string;
  s1CurrencyId: string;
  s1Amount: string;
  s1Paid: string;
  hasS2: boolean;
  s2CurrencyId: string;
  s2Amount: string;
  s2Paid: string;
  isPaid: boolean;
  notes: string;
}

function initForm(currencies: CurrencyLite[], initial?: Partial<WeddingExpense>, defaultEventId?: string | null): FormState {
  const base = currencies.find((c) => c.isBase) ?? currencies[0];
  const secondary = currencies.find((c) => c.id !== base?.id) ?? base;
  return {
    name: initial?.name ?? "",
    category: initial?.category ?? "MISC",
    eventId: initial?.eventId ?? defaultEventId ?? "",
    s1CurrencyId: initial?.source1CurrencyId ?? base?.id ?? "",
    s1Amount: initial?.source1Amount ? String(initial.source1Amount / 100) : "",
    s1Paid: initial?.source1Paid ? String(initial.source1Paid / 100) : "",
    hasS2: !!(initial?.source2CurrencyId),
    s2CurrencyId: initial?.source2CurrencyId ?? secondary?.id ?? "",
    s2Amount: initial?.source2Amount ? String(initial.source2Amount / 100) : "",
    s2Paid: initial?.source2Paid ? String(initial.source2Paid / 100) : "",
    isPaid: initial?.isPaid ?? false,
    notes: initial?.notes ?? "",
  };
}

function ExpenseForm({
  initial,
  weddingPlanId,
  events,
  currencies,
  defaultEventId,
  onDone,
  editId,
}: {
  initial?: Partial<WeddingExpense>;
  weddingPlanId: string;
  events: WeddingEvent[];
  currencies: CurrencyLite[];
  defaultEventId?: string | null;
  onDone: () => void;
  editId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<FormState>(() => initForm(currencies, initial, defaultEventId));
  const set = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }));
  const s1Code = currencies.find((c) => c.id === f.s1CurrencyId)?.code ?? "";
  const s2Code = currencies.find((c) => c.id === f.s2CurrencyId)?.code ?? "";
  const otherCurrencyId = (excludeId: string) => currencies.find((c) => c.id !== excludeId)?.id ?? excludeId;

  async function onSubmit() {
    if (!f.name.trim()) return;
    setLoading(true);
    const data = {
      name: f.name,
      category: f.category,
      eventId: f.eventId || undefined,
      source1CurrencyId: f.s1CurrencyId,
      source1Amount: f.s1Amount ? parseFloat(f.s1Amount) : 0,
      source1Paid: f.s1Paid ? parseFloat(f.s1Paid) : undefined,
      source2CurrencyId: f.hasS2 ? f.s2CurrencyId : undefined,
      source2Amount: f.hasS2 && f.s2Amount ? parseFloat(f.s2Amount) : undefined,
      source2Paid: f.hasS2 && f.s2Paid ? parseFloat(f.s2Paid) : undefined,
      isPaid: f.isPaid,
      notes: f.notes || undefined,
    };
    const result = editId
      ? await updateWeddingExpense(editId, data)
      : await createWeddingExpense(weddingPlanId, data);
    if (result.success) {
      toast.success(editId ? "Expense updated" : "Expense added");
      onDone();
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Event + category */}
      <div>
        <Label>For which event?</Label>
        <Select
          value={f.eventId || "__general__"}
          onValueChange={(v) => set({ eventId: v === "__general__" ? "" : v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__general__">General (whole wedding)</SelectItem>
            {events.map((e) => {
              const info = getEventInfo(e.type);
              return <SelectItem key={e.id} value={e.id}>{info.emoji} {e.name}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <Select value={f.category} onValueChange={(v) => set({ category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Description</Label>
          <Input placeholder="e.g. Bridal lehenga" value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
      </div>

      {/* Source 1 */}
      <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Source 1 - Primary
          </span>
          <CurrencyToggle currencies={currencies} value={f.s1CurrencyId} onChange={(v) => set({ s1CurrencyId: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estimated ({s1Code})</Label>
            <Input
              type="number"
              placeholder="e.g. 20000"
              value={f.s1Amount}
              onChange={(e) => set({ s1Amount: e.target.value })}
            />
          </div>
          <div>
            <Label>Actual paid ({s1Code})</Label>
            <Input
              type="number"
              placeholder="leave blank if unpaid"
              value={f.s1Paid}
              onChange={(e) => set({ s1Paid: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Source 2 toggle */}
      {!f.hasS2 ? (
        <button
          type="button"
          onClick={() => set({ hasS2: true, s2CurrencyId: otherCurrencyId(f.s1CurrencyId) })}
          className="text-sm text-primary hover:underline font-medium"
        >
          + Add second funding source (remainder)
        </button>
      ) : (
        <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source 2 - Remainder
            </span>
            <div className="flex items-center gap-2">
              <CurrencyToggle currencies={currencies} value={f.s2CurrencyId} onChange={(v) => set({ s2CurrencyId: v })} />
              <button
                type="button"
                onClick={() => set({ hasS2: false, s2Amount: "", s2Paid: "" })}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimated ({s2Code})</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={f.s2Amount}
                onChange={(e) => set({ s2Amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Actual paid ({s2Code})</Label>
              <Input
                type="number"
                placeholder="leave blank if unpaid"
                value={f.s2Paid}
                onChange={(e) => set({ s2Paid: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id="isPaid"
          type="checkbox"
          checked={f.isPaid}
          onChange={(e) => set({ isPaid: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        <label htmlFor="isPaid" className="text-sm cursor-pointer">Mark as fully paid</label>
      </div>

      <div>
        <Label>Notes (optional)</Label>
        <Textarea rows={2} placeholder="Colour, size, shop, delivery date..." value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      <Button className="w-full" onClick={onSubmit} disabled={loading || !f.name}>
        {loading ? "Saving..." : editId ? "Save Changes" : "Add Expense"}
      </Button>
    </div>
  );
}

// ─── card ─────────────────────────────────────────────────────────────────────

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: {
  expense: WeddingExpense;
  onEdit: (e: WeddingExpense) => void;
  onDelete: (id: string) => void;
}) {
  const hasTwoSources = !!expense.source2Currency;

  return (
    <div className={cn(
      "border rounded-xl p-3.5 transition-all",
      expense.isPaid
        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
        : "border-border bg-card"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{expense.name}</span>
            <Badge className="text-xs bg-muted text-muted-foreground">{getExpenseCategoryLabel(expense.category)}</Badge>
            {expense.isPaid && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />Paid
              </Badge>
            )}
          </div>

          <div className="mt-2 space-y-1 text-sm">
            {/* Source 1 */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-medium w-16 shrink-0">Primary</span>
              <span className="font-medium text-foreground">
                {fmtSource(expense.source1Currency, expense.source1Amount)}
              </span>
              {expense.source1Paid != null && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  · paid {fmtSource(expense.source1Currency, expense.source1Paid)}
                </span>
              )}
            </div>
            {/* Source 2 */}
            {hasTwoSources && expense.source2Currency && expense.source2Amount != null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs font-medium w-16 shrink-0">Remainder</span>
                <span className="font-medium text-foreground">
                  {fmtSource(expense.source2Currency, expense.source2Amount)}
                </span>
                {expense.source2Paid != null && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    · paid {fmtSource(expense.source2Currency, expense.source2Paid)}
                  </span>
                )}
              </div>
            )}
            {expense.notes && <p className="text-xs italic text-muted-foreground">{expense.notes}</p>}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(expense)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(expense.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── section ──────────────────────────────────────────────────────────────────

function EventExpenseSection({
  title,
  emoji,
  eventId,
  expenses,
  events,
  weddingPlanId,
  onEdit,
  onDelete,
  onAddExpense,
}: {
  title: string;
  emoji: string;
  eventId: string | null;
  expenses: WeddingExpense[];
  events: WeddingEvent[];
  weddingPlanId: string;
  onEdit: (e: WeddingExpense) => void;
  onDelete: (id: string) => void;
  onAddExpense: (eventId: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const paid = expenses.filter((e) => e.isPaid).length;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">
            ({expenses.length} item{expenses.length !== 1 ? "s" : ""}{expenses.length > 0 ? ` · ${paid} paid` : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAddExpense(eventId); }}
            className="text-xs text-primary hover:underline font-medium"
          >
            + Add
          </button>
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
      {!collapsed && (
        <div className="p-3 space-y-2">
          {expenses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No expenses yet.</p>
          )}
          {expenses.map((exp) => (
            <ExpenseCard key={exp.id} expense={exp} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main tab ─────────────────────────────────────────────────────────────────

export function WeddingExpensesTab({ plan, currencies }: { plan: WeddingPlan; currencies: CurrencyLite[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultEventId, setAddDefaultEventId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<WeddingExpense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openAddFor(eventId: string | null) {
    setAddDefaultEventId(eventId);
    setAddOpen(true);
  }

  const sortedEvents = [...plan.events].sort((a, b) => a.order - b.order);

  const expensesByEvent: Record<string, WeddingExpense[]> = {};
  const generalExpenses: WeddingExpense[] = [];
  for (const exp of plan.expenses) {
    if (exp.eventId) {
      if (!expensesByEvent[exp.eventId]) expensesByEvent[exp.eventId] = [];
      expensesByEvent[exp.eventId].push(exp);
    } else {
      generalExpenses.push(exp);
    }
  }

  // Totals grouped by currency (can't add across currencies)
  const totalsByCurrency = new Map<string, { currency: CurrencyLite; amount: number }>();
  const addToTotal = (currency: CurrencyLite, amount: number) => {
    const entry = totalsByCurrency.get(currency.id) ?? { currency, amount: 0 };
    entry.amount += amount;
    totalsByCurrency.set(currency.id, entry);
  };
  for (const e of plan.expenses) {
    addToTotal(e.source1Currency, e.source1Amount);
    if (e.source2Currency && e.source2Amount) addToTotal(e.source2Currency, e.source2Amount);
  }
  const currencyTotals = [...totalsByCurrency.values()].sort((a, b) =>
    a.currency.isBase === b.currency.isBase ? 0 : a.currency.isBase ? -1 : 1
  );

  const totalPaid = plan.expenses.filter((e) => e.isPaid).length;

  async function handleDelete() {
    if (!deleteId) return;
    await deleteWeddingExpense(deleteId);
    setDeleteId(null);
    toast.success("Expense removed");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Misc Expenses</h3>
          <p className="text-xs text-muted-foreground">Dresses, flowers, fireworks, props - split across multiple funding sources.</p>
        </div>
        <Button size="sm" onClick={() => openAddFor(null)}>
          <Plus className="h-3.5 w-3.5" />Add Expense
        </Button>
      </div>

      {plan.expenses.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${currencyTotals.length + 1}, minmax(0, 1fr))` }}>
          {currencyTotals.map(({ currency, amount }) => (
            <div key={currency.id} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{currency.code} Estimated</p>
              <p className="font-semibold text-sm">{fmt(amount, currency.symbol)}</p>
            </div>
          ))}
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-semibold text-sm">{totalPaid}/{plan.expenses.length}</p>
          </div>
        </div>
      )}

      {plan.expenses.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No misc expenses yet"
          description="Log dresses, jewellery, fireworks, flowers, transport, props - each with up to two funding sources."
          action={{ label: "Add Expense", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((event) => {
            const info = getEventInfo(event.type);
            return (
              <EventExpenseSection
                key={event.id}
                title={event.name}
                emoji={info.emoji}
                eventId={event.id}
                expenses={expensesByEvent[event.id] ?? []}
                events={plan.events}
                weddingPlanId={plan.id}
                onEdit={setEditExpense}
                onDelete={setDeleteId}
                onAddExpense={openAddFor}
              />
            );
          })}
          <EventExpenseSection
            title="General (whole wedding)"
            emoji="💍"
            eventId={null}
            expenses={generalExpenses}
            events={plan.events}
            weddingPlanId={plan.id}
            onEdit={setEditExpense}
            onDelete={setDeleteId}
            onAddExpense={openAddFor}
          />
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddDefaultEventId(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <ExpenseForm
            weddingPlanId={plan.id}
            events={plan.events}
            currencies={currencies}
            defaultEventId={addDefaultEventId}
            onDone={() => { setAddOpen(false); setAddDefaultEventId(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editExpense} onOpenChange={(o) => !o && setEditExpense(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
          {editExpense && (
            <ExpenseForm
              initial={editExpense}
              weddingPlanId={plan.id}
              events={plan.events}
              currencies={currencies}
              editId={editExpense.id}
              onDone={() => setEditExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove expense?"
        description="This expense entry will be permanently deleted."
        onConfirm={handleDelete}
      />
    </div>
  );
}
