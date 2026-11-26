"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { addToLoan, writeOffLoan } from "@/actions/loans";
import { offersWriteOffExpense } from "@/lib/loans/balance";
import { monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { EntryDate, useLastUsedDate } from "@/components/shared/entry-date";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { rememberEntryDate } from "@/lib/day-strip";
import type { Loan } from "./loan-card";
import { selectOnFocus, type PeriodRef } from "./loan-types";

export interface LoanEntryTarget { loan: Loan; kind: "TOP_UP" | "WRITE_OFF"; prefill?: { amount?: string; date?: string } }

/** "Lend more / borrow more" and "write off / forgiven" for an existing loan. */
export function LoanEntryDialog({ target, onClose, currentPeriod, baseSymbol }: {
  target: LoanEntryTarget | null; onClose: () => void; currentPeriod: PeriodRef; baseSymbol: string;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {target && <EntryForm target={target} onClose={onClose} currentPeriod={currentPeriod} baseSymbol={baseSymbol} />}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({ target, onClose, currentPeriod, baseSymbol }: {
  target: LoanEntryTarget; onClose: () => void; currentPeriod: PeriodRef; baseSymbol: string;
}) {
  const { loan, kind, prefill } = target;
  const lastUsedDate = useLastUsedDate();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    amount: prefill?.amount ?? (kind === "WRITE_OFF" ? String(loan.remainingAmount / 100) : ""),
    date: prefill?.date ?? format(new Date(), "yyyy-MM-dd"),
    notes: "",
    book: kind === "TOP_UP" ? true : offersWriteOffExpense(loan, loan.payments),
    fileUnderDate: false,
  });
  const amount = parseMoney(form.amount);
  const offersBooking = kind === "TOP_UP" || offersWriteOffExpense(loan, loan.payments);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || pending) return;
    setPending(true);
    const override = form.fileUnderDate ? monthYearFromDateStr(form.date) : null;
    const common = {
      amount,
      date: form.date,
      notes: form.notes || undefined,
      ...(override ? { budgetMonth: override.month, budgetYear: override.year } : {}),
    };
    const result = kind === "TOP_UP"
      ? await addToLoan(loan.id, { ...common, skipTransaction: !form.book })
      : await writeOffLoan(loan.id, { ...common, bookExpense: form.book });
    if (result.success) {
      toast.success(kind === "TOP_UP" ? "Added to loan" : loan.type === "GIVEN" ? "Written off" : "Marked as forgiven");
      rememberEntryDate(form.date, new Date());
      onClose();
    } else {
      toast.error(result.error ?? "Failed");
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {kind === "TOP_UP"
            ? `${loan.type === "GIVEN" ? "Lend more to" : "Borrow more from"} ${loan.personName}`
            : `${loan.type === "GIVEN" ? "Write off" : "Mark as forgiven"} - ${loan.personName}`}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Amount ({baseSymbol})</Label>
          <MoneyInput autoFocus onFocus={selectOnFocus} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
          {kind === "WRITE_OFF" && (
            <p className="text-xs text-muted-foreground">
              {baseSymbol} {(loan.remainingAmount / 100).toLocaleString()} left - lower it to write off only part.
            </p>
          )}
        </div>
        <EntryDate
          date={form.date}
          onDateChange={(d) => setForm((f) => ({ ...f, date: d }))}
          homePeriod={form.book ? currentPeriod : undefined}
          checked={form.fileUnderDate}
          onCheckedChange={form.book ? (v) => setForm((f) => ({ ...f, fileUnderDate: v })) : undefined}
          lastUsed={lastUsedDate}
        />
        <div className="space-y-1.5">
          <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        {offersBooking ? (
          <div className="flex items-start gap-2">
            <Checkbox id="bookLoanEntry" checked={form.book} onCheckedChange={(c) => setForm((f) => ({ ...f, book: !!c }))} className="mt-0.5" />
            <Label htmlFor="bookLoanEntry" className="cursor-pointer text-sm font-normal leading-snug">
              Also record as {kind === "WRITE_OFF" || loan.type === "GIVEN" ? "an expense" : "income"}
              <span className="block text-xs text-muted-foreground">Uncheck to track this without an entry in Expenses/Income</span>
            </Label>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Already counted when you created this loan. Nothing new is recorded in Expenses or Income.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending || !amount}>
          {kind === "TOP_UP" ? "Add to loan" : loan.type === "GIVEN" ? "Write off" : "Mark as forgiven"}
        </Button>
      </form>
    </>
  );
}
