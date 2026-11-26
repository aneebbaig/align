"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getExpenseFundingContext } from "@/actions/expenses";
import { addInvestmentContribution, addMoneyToCategory, withdrawFromInvestment } from "@/actions/investments";
import { monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { EntryDate, useLastUsedDate } from "@/components/shared/entry-date";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { rememberEntryDate } from "@/lib/day-strip";
import { cn } from "@/lib/utils";
import type { ContributeTarget, PeriodRef } from "./investment-types";

/** Add money to / withdraw from an investment - one form, two directions. */
export function ContributeDialog({ target, onClose, baseSymbol, currentPeriod }: {
  target: ContributeTarget | null; onClose: () => void; baseSymbol: string; currentPeriod: PeriodRef;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {target && <ContributeForm target={target} onClose={onClose} baseSymbol={baseSymbol} currentPeriod={currentPeriod} />}
      </DialogContent>
    </Dialog>
  );
}

function ContributeForm({ target, onClose, baseSymbol, currentPeriod }: {
  target: ContributeTarget; onClose: () => void; baseSymbol: string; currentPeriod: PeriodRef;
}) {
  const lastUsedDate = useLastUsedDate();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "", book: true, fileUnderDate: false });
  const [availableIncome, setAvailableIncome] = useState<number | null>(null);
  const isDeposit = target.mode === "DEPOSIT";
  const amount = parseMoney(form.amount);
  const targetPeriod = form.fileUnderDate && form.date ? monthYearFromDateStr(form.date) : currentPeriod;

  useEffect(() => {
    if (!isDeposit || !form.book) return;
    let cancelled = false;
    getExpenseFundingContext(targetPeriod.month, targetPeriod.year)
      .then((ctx) => { if (!cancelled) setAvailableIncome(ctx.monthlyIncomeAvailable); })
      .catch(() => { if (!cancelled) setAvailableIncome(null); });
    return () => { cancelled = true; };
  }, [isDeposit, form.book, targetPeriod.month, targetPeriod.year]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || pending) return;
    setPending(true);
    const override = form.fileUnderDate ? monthYearFromDateStr(form.date) : null;
    const payload = {
      amount,
      date: form.date,
      notes: form.notes || undefined,
      skipTransaction: !form.book,
      ...(override ? { budgetMonth: override.month, budgetYear: override.year } : {}),
    };
    const result = !isDeposit
      ? await withdrawFromInvestment(target.investmentId as string, payload)
      : target.investmentId
        ? await addInvestmentContribution(target.investmentId, payload)
        : await addMoneyToCategory(target.categoryId as string, payload);
    if (result.success) {
      toast.success(isDeposit ? "Money added" : "Withdrawal recorded");
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
        <DialogTitle>{isDeposit ? "Add money" : "Withdraw"} — {target.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Amount ({baseSymbol})</Label>
          <MoneyInput autoFocus placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          {!isDeposit && target.currentValue != null && (
            <p className="text-xs text-muted-foreground">
              Current value {baseSymbol} {(target.currentValue / 100).toLocaleString()} - you can&apos;t take out more than that.
            </p>
          )}
        </div>
        <EntryDate
          date={form.date}
          onDateChange={(d) => setForm((f) => ({ ...f, date: d }))}
          homePeriod={form.book ? currentPeriod : undefined}
          checked={form.fileUnderDate}
          onCheckedChange={form.book ? (v) => setForm((f) => ({ ...f, fileUnderDate: v })) : undefined}
          affectsFunding={isDeposit}
          lastUsed={lastUsedDate}
        />
        <div className="space-y-1.5">
          <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="bookInvestmentEntry" checked={form.book} onCheckedChange={(c) => setForm((f) => ({ ...f, book: !!c }))} className="mt-0.5" />
          <Label htmlFor="bookInvestmentEntry" className="cursor-pointer text-sm font-normal leading-snug">
            Also record as {isDeposit ? "an expense" : "income"}
            <span className="block text-xs text-muted-foreground">
              Uncheck to only change the investment, with no entry in {isDeposit ? "Expenses" : "Income"}
            </span>
          </Label>
        </div>
        {form.book && isDeposit && availableIncome != null && (
          <p className={cn("text-xs", availableIncome >= 0 ? "text-muted-foreground" : "text-red-500")}>
            Paid from income · {baseSymbol} {(availableIncome / 100).toLocaleString()} available
          </p>
        )}
        <Button type="submit" disabled={pending || !amount} className="w-full">
          {isDeposit ? "Add money" : "Withdraw"}
        </Button>
      </form>
    </>
  );
}
