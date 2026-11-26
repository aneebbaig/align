"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { recordPayment, updateLoanPayment } from "@/actions/loans";
import { getExpenseFundingContext } from "@/actions/expenses";
import { monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { EntryDate, useLastUsedDate } from "@/components/shared/entry-date";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { SplitFunding, FundingSelectContent, type FundingOption } from "@/components/shared/split-funding";
import { FormSection, MoreOptions } from "@/components/shared/form-section";
import { rememberEntryDate } from "@/lib/day-strip";
import { cn } from "@/lib/utils";
import type { Loan, LoanPayment } from "./loan-card";
import { baseBalance, selectOnFocus, type FundingContext, type PeriodRef } from "./loan-types";

const emptySplit = () => [{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }];

/** Record a payment (amount prefilled with what is left) or edit an existing one. */
export function LoanPaymentDialog({ loan, payment, onClose, fundingContext, currentPeriod, baseSymbol, baseCurrencyId }: {
  loan: Loan | null;
  payment: LoanPayment | null;
  onClose: () => void;
  fundingContext: FundingContext;
  currentPeriod: PeriodRef;
  baseSymbol: string;
  baseCurrencyId?: string;
}) {
  return (
    <Dialog open={!!loan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {loan && (
          <PaymentForm
            key={`${loan.id}:${payment?.id ?? "new"}`}
            loan={loan} payment={payment} onClose={onClose} fundingContext={fundingContext}
            currentPeriod={currentPeriod} baseSymbol={baseSymbol} baseCurrencyId={baseCurrencyId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({ loan, payment, onClose, fundingContext, currentPeriod, baseSymbol, baseCurrencyId }: {
  loan: Loan; payment: LoanPayment | null; onClose: () => void; fundingContext: FundingContext;
  currentPeriod: PeriodRef; baseSymbol: string; baseCurrencyId?: string;
}) {
  const lastUsedDate = useLastUsedDate();
  const editing = !!payment;
  const isReceived = loan.type === "RECEIVED";
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(() => payment
    ? {
        amount: String(payment.amount / 100),
        date: format(new Date(payment.date), "yyyy-MM-dd"),
        notes: payment.notes ?? "",
        fundingSource: payment.transaction?.fundingSource === "SAVINGS_POT" ? "SAVINGS_POT" : "INCOME",
        fundingPotId: payment.transaction?.fundingSource === "SAVINGS_POT" ? (payment.transaction.fundingPotId ?? "") : "",
      }
    : { amount: String(loan.remainingAmount / 100), date: format(new Date(), "yyyy-MM-dd"), notes: "", fundingSource: "INCOME", fundingPotId: "" });
  const [book, setBook] = useState(true);
  const [fileUnderDate, setFileUnderDate] = useState(false);
  const [useSplit, setUseSplit] = useState(false);
  const [splitRows, setSplitRows] = useState(emptySplit);

  // Funding figures follow whichever period the payment will be filed under;
  // refetch when the date-budget checkbox targets a different period than the page's.
  const target = fileUnderDate && form.date ? monthYearFromDateStr(form.date) : currentPeriod;
  const isCurrent = target.month === currentPeriod.month && target.year === currentPeriod.year;
  const targetKey = `${target.year}-${target.month}`;
  const [fetched, setFetched] = useState<{ key: string; ctx: FundingContext }>();
  useEffect(() => {
    if (isCurrent) return;
    let cancelled = false;
    getExpenseFundingContext(target.month, target.year).then((ctx) => { if (!cancelled) setFetched({ key: targetKey, ctx }); });
    return () => { cancelled = true; };
  }, [isCurrent, target.month, target.year, targetKey]);
  const fundingLoading = !isCurrent && fetched?.key !== targetKey;
  const live = isCurrent ? fundingContext : (fetched?.key === targetKey ? fetched.ctx : fundingContext);

  const options: FundingOption[] = [
    { value: "INCOME", group: "income", label: `Monthly income · ${baseSymbol} ${(live.monthlyIncomeAvailable / 100).toLocaleString()} available` },
    ...live.pots.filter((p) => baseBalance(p) > 0).map((pot) => ({
      value: pot.id,
      group: "pot" as const,
      label: `${pot.name} (${pot.type}) · ${baseSymbol} ${(baseBalance(pot) / 100).toLocaleString()}`,
    })),
  ];

  const amount = parseMoney(form.amount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || pending) return;
    setPending(true);

    let splitSources: { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string; pkrAmount: number }[] | undefined;
    if (isReceived && useSplit) {
      const totalPaisas = Math.round(amount * 100);
      const primaryTotal = splitRows.slice(0, -1).reduce((s, r) => s + (Math.round(parseFloat(r.pkrAmount || "0") * 100) || 0), 0);
      const lastAmount = totalPaisas - primaryTotal;
      if (lastAmount <= 0) {
        toast.error("Split sources exceed payment amount");
        setPending(false);
        return;
      }
      splitSources = splitRows.map((row, idx) => {
        const pkrAmount = idx === splitRows.length - 1 ? lastAmount : (Math.round(parseFloat(row.pkrAmount || "0") * 100) || 0);
        if (row.value === "INCOME") return { source: "INCOME" as const, pkrAmount };
        return { source: "SAVINGS_POT" as const, potId: row.value, currencyId: baseCurrencyId, pkrAmount };
      });
    }

    const override = monthYearFromDateStr(form.date);
    const funding = isReceived && !useSplit ? {
      fundingSource: form.fundingSource,
      fundingPotId: form.fundingSource === "SAVINGS_POT" ? form.fundingPotId : undefined,
    } : {};
    const budget = fileUnderDate ? { budgetMonth: override.month, budgetYear: override.year } : {};
    const result = payment
      ? await updateLoanPayment(payment.id, { amount, date: form.date, notes: form.notes || undefined, ...funding, ...budget })
      : await recordPayment(loan.id, {
          amount, date: form.date, notes: form.notes || undefined, skipTransaction: !book,
          ...funding, splitSources: isReceived && useSplit ? splitSources : undefined, ...budget,
        });
    if (result.success) {
      toast.success(
        editing ? "Payment updated"
        : !book ? "Payment recorded - tracking only, no entry recorded"
        : isReceived ? "Payment recorded & expense created!" : "Payment recorded & added to income!"
      );
      rememberEntryDate(form.date, new Date());
      onClose();
    } else {
      toast.error(result.error ?? "Failed");
      setPending(false);
    }
  }

  const title = editing ? "Edit Payment" : isReceived ? "Record Repayment" : "Record Payment";

  return (
    <>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <FormSection title="Amount">
          <MoneyInput autoFocus onFocus={selectOnFocus} value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
        </FormSection>

        <FormSection title="When">
          <EntryDate
            date={form.date}
            onDateChange={(d) => setForm((p) => ({ ...p, date: d }))}
            homePeriod={currentPeriod}
            checked={fileUnderDate}
            onCheckedChange={setFileUnderDate}
            affectsFunding={isReceived}
            lastUsed={lastUsedDate}
          />
        </FormSection>

        {!editing && (
          <div className="flex items-start gap-2">
            <Checkbox id="bookPayTransaction" checked={book} onCheckedChange={(c) => setBook(!!c)} className="mt-0.5" />
            <Label htmlFor="bookPayTransaction" className="cursor-pointer text-sm font-normal leading-snug">
              Also record as {isReceived ? "an expense" : "income"}
              <span className="block text-xs text-muted-foreground">Uncheck to track this payment without an entry in Expenses/Income</span>
            </Label>
          </div>
        )}

        {book && isReceived && (
          <FormSection title="Funding">
            <div className={cn("space-y-3 transition-opacity", fundingLoading && "opacity-60")}>
              <div className="flex items-center justify-between">
                <Label>Pay from</Label>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => { setUseSplit(!useSplit); if (!useSplit) setSplitRows(emptySplit()); }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {useSplit ? "Single source" : "Split sources"}
                  </button>
                )}
              </div>
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Editing only supports a single funding source - delete and re-add for split funding.
                </p>
              )}
              {!useSplit ? (
                <>
                  <Select
                    value={form.fundingSource === "SAVINGS_POT" ? form.fundingPotId : "INCOME"}
                    onValueChange={(v) => setForm((p) => v === "INCOME"
                      ? { ...p, fundingSource: "INCOME", fundingPotId: "" }
                      : { ...p, fundingSource: "SAVINGS_POT", fundingPotId: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <FundingSelectContent options={options} />
                  </Select>
                  <p className="text-xs text-muted-foreground">Choosing a savings pot deducts the amount immediately.</p>
                </>
              ) : (
                <SplitFunding totalAmount={amount ?? 0} options={options} value={splitRows} onChange={setSplitRows} />
              )}
            </div>
          </FormSection>
        )}
        {book && !isReceived && (
          <p className="text-xs text-muted-foreground">Recorded as income - available to budget once received.</p>
        )}

        <MoreOptions>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Cash, bank transfer" />
          </div>
        </MoreOptions>

        <Button type="submit" className="w-full" disabled={pending || !amount}>
          {pending ? "Saving..." : editing ? "Save Changes" : title}
        </Button>
      </form>
    </>
  );
}
