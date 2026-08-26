"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TransactionForm } from "@/components/expenses/transaction-form";
import { cn } from "@/lib/utils";
import {
  createPlannedExpense,
  updatePlannedExpenseStatus,
  deletePlannedExpense,
} from "@/actions/cashflow";

interface PlannedExpense {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  flexibility: string; // "FIXED" | "FLEXIBLE"
  priority: number;
  slideWindowMonths: number;
  status: string; // "PLANNED" | "PAID" | "SKIPPED"
  notes: string | null;
  categoryId: string | null;
}

const BLANK_FORM = {
  name: "", amount: "", dueDate: format(new Date(), "yyyy-MM-dd"),
  flexibility: "FIXED", priority: "0", slideWindowMonths: "0", notes: "",
};

interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }

export function PlannedExpensesCard({
  expenses, baseSymbol = "Rs", categories = [], fundingContext, currentPeriod, dateFormat,
}: {
  expenses: PlannedExpense[];
  baseSymbol?: string;
  categories?: { id: string; name: string; color: string; icon: string }[];
  fundingContext?: { monthlyIncomeAvailable: number; pots: { id: string; name: string; type: string; balances: { amount: number; currency: CurrencyLite }[] }[] };
  currentPeriod?: { month: number; year: number };
  dateFormat?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [recordExpense, setRecordExpense] = useState<PlannedExpense | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const upcoming = expenses.filter((e) => e.status === "PLANNED");
  const resolved = expenses.filter((e) => e.status !== "PLANNED");

  async function handleAdd() {
    if (!form.name || !form.amount) return;
    setLoading(true);
    const result = await createPlannedExpense({
      name: form.name,
      amount: parseFloat(form.amount),
      dueDate: form.dueDate,
      flexibility: form.flexibility as "FIXED" | "FLEXIBLE",
      priority: parseInt(form.priority, 10) || 0,
      slideWindowMonths: form.flexibility === "FLEXIBLE" ? parseInt(form.slideWindowMonths, 10) || 0 : 0,
      notes: form.notes || undefined,
    });
    if (result.success) {
      toast.success("Planned expense added");
      setAddOpen(false);
      setForm(BLANK_FORM);
    } else toast.error(result.error ?? "Failed to add");
    setLoading(false);
  }

  async function handleStatus(id: string, status: "SKIPPED" | "PLANNED") {
    const result = await updatePlannedExpenseStatus(id, status);
    if (!result.success) toast.error(result.error ?? "Failed to update");
  }

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deletePlannedExpense(deleteId);
    if (result.success) toast.success("Removed");
    else toast.error(result.error ?? "Failed to remove");
    setDeleteId(null);
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Planned Expenses</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setForm(BLANK_FORM); setAddOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />Add
          </Button>
        </div>

        {upcoming.length === 0 && resolved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Know a bill or one-off cost is coming (tuition, insurance renewal, tax)? Add it here so the
            cash-flow planner flags months where it collides with your loan payments.
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {e.flexibility === "FLEXIBLE" ? `Flexible ±${e.slideWindowMonths}mo` : "Fixed"}
                  </Badge>
                  <span className="text-foreground/85 truncate">{e.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {baseSymbol} {(e.amount / 100).toLocaleString()} · {format(new Date(e.dueDate), "d MMM yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setRecordExpense(e)} className="text-muted-foreground hover:text-emerald-500 transition-colors p-1" title="Mark paid">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(e.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {resolved.length > 0 && (
              <div className="pt-2 mt-2 border-t border-border/60 space-y-1.5">
                {resolved.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={cn(e.status === "SKIPPED" && "line-through")}>{e.name}</span>
                    <span>{baseSymbol} {(e.amount / 100).toLocaleString()} · {e.status === "PAID" ? "Paid" : "Skipped"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Planned Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sister's tuition" autoFocus />
            </div>
            <div>
              <Label>Amount ({baseSymbol})</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Flexible</Label>
                <p className="text-xs text-muted-foreground">Can be slid to a different month in a tight cycle</p>
              </div>
              <Switch
                checked={form.flexibility === "FLEXIBLE"}
                onCheckedChange={(v) => setForm((p) => ({ ...p, flexibility: v ? "FLEXIBLE" : "FIXED" }))}
              />
            </div>
            {form.flexibility === "FLEXIBLE" && (
              <div>
                <Label>Slide Window (months)</Label>
                <Input type="number" min={1} value={form.slideWindowMonths} onChange={(e) => setForm((p) => ({ ...p, slideWindowMonths: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Priority</Label>
              <Input type="number" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} placeholder="0" />
              <p className="text-xs text-muted-foreground mt-1">Lower slides first when a month is tight</p>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any extra details..." />
            </div>
            <Button className="w-full" onClick={handleAdd} disabled={loading}>
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete planned expense?"
        description="This removes it from the cash-flow planner. It does not affect any past transactions."
        onConfirm={handleDelete}
      />

      {/* Mark paid - books a real expense transaction linked back to this planned row */}
      <Dialog open={!!recordExpense} onOpenChange={(o) => !o && setRecordExpense(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {recordExpense && (
            <TransactionForm
              defaultType="EXPENSE"
              categories={categories}
              transaction={null}
              initialValues={{
                amount: recordExpense.amount,
                categoryId: recordExpense.categoryId ?? undefined,
                description: recordExpense.name,
                date: format(new Date(recordExpense.dueDate), "yyyy-MM-dd"),
              }}
              linkPlannedExpenseId={recordExpense.id}
              currencies={[{ id: "base", code: "PKR", symbol: baseSymbol, rateToBase: 1, isBase: true }]}
              fundingContext={fundingContext}
              currentPeriod={currentPeriod}
              dateFormat={dateFormat}
              onSuccess={() => { toast.success("Expense recorded"); setRecordExpense(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
