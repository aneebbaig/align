"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TransactionForm } from "@/components/expenses/transaction-form";
import {
  createRecurringIncome,
  updateRecurringIncome,
  deleteRecurringIncome,
} from "@/actions/cashflow";

interface RecurringIncome {
  id: string;
  label: string;
  kind: string; // "SALARY" | "FREELANCE" | "OTHER"
  amount: number;
  variable: boolean;
  countsTowardFloor: boolean;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
  occurrences: { month: number; year: number }[];
}

const KINDS = [
  { value: "SALARY", label: "Salary" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "OTHER", label: "Other" },
];

const BLANK_FORM = {
  label: "", kind: "SALARY", amount: "", variable: false, countsTowardFloor: true,
  dayOfMonth: "", startDate: format(new Date(), "yyyy-MM-dd"),
};

export function RecurringIncomeCard({
  incomes, baseSymbol = "Rs", categories = [], currentPeriod, dateFormat,
}: {
  incomes: RecurringIncome[];
  baseSymbol?: string;
  categories?: { id: string; name: string; color: string; icon: string }[];
  currentPeriod?: { month: number; year: number };
  dateFormat?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [recordIncome, setRecordIncome] = useState<RecurringIncome | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const recordedThisPeriod = (inc: RecurringIncome) =>
    !!currentPeriod && inc.occurrences.some((o) => o.month === currentPeriod.month && o.year === currentPeriod.year);

  async function handleAdd() {
    if (!form.label || !form.amount) return;
    setLoading(true);
    const result = await createRecurringIncome({
      label: form.label,
      kind: form.kind as "SALARY" | "FREELANCE" | "OTHER",
      amount: parseFloat(form.amount),
      variable: form.variable,
      countsTowardFloor: form.countsTowardFloor,
      dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth, 10) : undefined,
      startDate: form.startDate,
    });
    if (result.success) {
      toast.success("Recurring income added");
      setAddOpen(false);
      setForm(BLANK_FORM);
    } else toast.error(result.error ?? "Failed to add");
    setLoading(false);
  }

  async function handleToggleActive(inc: RecurringIncome) {
    const result = await updateRecurringIncome(inc.id, { active: !inc.active });
    if (!result.success) toast.error(result.error ?? "Failed to update");
  }

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteRecurringIncome(deleteId);
    if (result.success) toast.success("Removed");
    else toast.error(result.error ?? "Failed to remove");
    setDeleteId(null);
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recurring Income</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setForm(BLANK_FORM); setAddOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />Add
          </Button>
        </div>

        {incomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add your salary (fixed date + amount) and freelance floor (variable, guaranteed minimum) so the
            cash-flow planner knows what income to rely on each cycle.
          </p>
        ) : (
          <div className="space-y-2">
            {incomes.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] shrink-0">{inc.kind}</Badge>
                  <span className="text-foreground/85 truncate">{inc.label}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {baseSymbol} {(inc.amount / 100).toLocaleString()}{inc.variable ? " floor" : ""}
                    {inc.dayOfMonth ? ` · day ${inc.dayOfMonth}` : ""}
                    {!inc.countsTowardFloor ? " · not in floor" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inc.active && (
                    recordedThisPeriod(inc) ? (
                      <span className="text-[10px] text-emerald-600 font-medium">Recorded</span>
                    ) : (
                      <button onClick={() => setRecordIncome(inc)} className="text-xs text-primary hover:underline font-medium" title="Record this month's income">
                        Record
                      </button>
                    )
                  )}
                  <Switch checked={inc.active} onCheckedChange={() => handleToggleActive(inc)} />
                  <button onClick={() => setDeleteId(inc.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Recurring Income</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm((p) => ({ ...p, kind: v, variable: v === "FREELANCE" ? true : p.variable }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. Salary, Freelance clients" autoFocus />
            </div>
            <div>
              <Label>{form.variable ? "Guaranteed floor" : "Amount"} ({baseSymbol})</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Variable</Label>
                <p className="text-xs text-muted-foreground">Amount above is a floor/minimum, not fixed</p>
              </div>
              <Switch checked={form.variable} onCheckedChange={(v) => setForm((p) => ({ ...p, variable: v }))} />
            </div>
            {!form.variable && (
              <div>
                <Label>Day of Month (optional)</Label>
                <Input type="number" min={1} max={31} value={form.dayOfMonth} onChange={(e) => setForm((p) => ({ ...p, dayOfMonth: e.target.value }))} placeholder="e.g. 1" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Label>Counts toward reliable floor</Label>
                <p className="text-xs text-muted-foreground">Off if this income is already spoken for (e.g. salary eaten by fixed bills)</p>
              </div>
              <Switch checked={form.countsTowardFloor} onCheckedChange={(v) => setForm((p) => ({ ...p, countsTowardFloor: v }))} />
            </div>
            <div>
              <Label>Starts</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleAdd} disabled={loading}>
              {loading ? "Adding..." : "Add Income"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove recurring income?"
        description="This stops it from being counted in the cash-flow planner. It does not affect any past transactions."
        onConfirm={handleDelete}
      />

      {/* Record this month - books a real income transaction linked back to this stream */}
      <Dialog open={!!recordIncome} onOpenChange={(o) => !o && setRecordIncome(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Income</DialogTitle></DialogHeader>
          {recordIncome && (
            <TransactionForm
              defaultType="INCOME"
              categories={categories}
              transaction={null}
              initialValues={{
                amount: recordIncome.amount,
                description: recordIncome.label,
                date: format(new Date(), "yyyy-MM-dd"),
              }}
              linkRecurringIncomeId={recordIncome.id}
              currencies={[{ id: "base", code: "PKR", symbol: baseSymbol, rateToBase: 1, isBase: true }]}
              dateFormat={dateFormat}
              onSuccess={() => { toast.success("Income recorded"); setRecordIncome(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
