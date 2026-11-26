"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { createLoan } from "@/actions/loans";
import { isLoanClosed, normalizePersonName } from "@/lib/loans/balance";
import { monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { EntryDate, useLastUsedDate } from "@/components/shared/entry-date";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { FormSection, MoreOptions } from "@/components/shared/form-section";
import { rememberEntryDate } from "@/lib/day-strip";
import type { Loan } from "./loan-card";
import type { PeriodRef } from "./loan-types";

const LAST_TYPE_KEY = "align:lastLoanType";

function readLastType(): "GIVEN" | "RECEIVED" {
  if (typeof window === "undefined") return "GIVEN";
  return window.localStorage.getItem(LAST_TYPE_KEY) === "RECEIVED" ? "RECEIVED" : "GIVEN";
}

export function AddLoanDialog({ open, onOpenChange, loans, currentPeriod, baseSymbol, onTopUpInstead }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loans: Loan[];
  currentPeriod: PeriodRef;
  baseSymbol: string;
  onTopUpInstead: (loan: Loan, prefill: { amount?: string; date?: string }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Loan</DialogTitle></DialogHeader>
        <AddLoanForm loans={loans} currentPeriod={currentPeriod} baseSymbol={baseSymbol} onDone={() => onOpenChange(false)} onTopUpInstead={onTopUpInstead} />
      </DialogContent>
    </Dialog>
  );
}

function AddLoanForm({ loans, currentPeriod, baseSymbol, onDone, onTopUpInstead }: {
  loans: Loan[]; currentPeriod: PeriodRef; baseSymbol: string; onDone: () => void;
  onTopUpInstead: (loan: Loan, prefill: { amount?: string; date?: string }) => void;
}) {
  const lastUsedDate = useLastUsedDate();
  const [pending, setPending] = useState(false);
  const [fileUnderDateBudget, setFileUnderDateBudget] = useState(false);
  const [book, setBook] = useState(true);
  const [form, setForm] = useState(() => ({
    personName: "", description: "", type: readLastType() as string, principalAmount: "",
    date: format(new Date(), "yyyy-MM-dd"), dueDate: "", notes: "",
  }));

  // Same person + same direction + still open -> offer "Add to that loan instead".
  const duplicateLoan = form.personName.trim()
    ? loans.find((l) => !isLoanClosed(l.status) && l.type === form.type
        && normalizePersonName(l.personName) === normalizePersonName(form.personName))
    : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseMoney(form.principalAmount);
    if (!form.personName.trim() || !amount || pending) return;
    setPending(true);
    const override = monthYearFromDateStr(form.date);
    const result = await createLoan({
      ...form,
      principalAmount: amount,
      skipTransaction: !book,
      ...(fileUnderDateBudget ? { budgetMonth: override.month, budgetYear: override.year } : {}),
    });
    if (result.success) {
      toast.success(
        !book ? "Loan added - tracking only, no entry recorded"
          : form.type === "GIVEN" ? "Loan added - recorded as an expense" : "Loan added - recorded as income"
      );
      rememberEntryDate(form.date, new Date());
      window.localStorage.setItem(LAST_TYPE_KEY, form.type);
      onDone();
    } else {
      toast.error(result.error ?? "Failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormSection title="Who & what">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GIVEN">I lent money to someone</SelectItem>
              <SelectItem value="RECEIVED">I borrowed money from someone</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Person Name</Label>
          <Input autoFocus value={form.personName} onChange={(e) => setForm((p) => ({ ...p, personName: e.target.value }))} placeholder="e.g. Ahmed, Uncle Tariq" />
        </div>
        {duplicateLoan && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
            You already have an open loan {duplicateLoan.type === "GIVEN" ? "to" : "from"} {duplicateLoan.personName}
            {" "}({baseSymbol} {(duplicateLoan.remainingAmount / 100).toLocaleString()} left).
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 ml-1 text-xs"
              onClick={() => {
                onDone();
                onTopUpInstead(duplicateLoan, { amount: form.principalAmount, date: form.date });
              }}
            >
              Add to that loan instead
            </Button>
          </div>
        )}
        <div>
          <Label>Description (optional)</Label>
          <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What was it for?" />
        </div>
      </FormSection>

      <FormSection title="Amount">
        <div>
          <Label>Amount ({baseSymbol})</Label>
          <MoneyInput value={form.principalAmount} onChange={(e) => setForm((p) => ({ ...p, principalAmount: e.target.value }))} placeholder="0" />
        </div>
        <p className="text-xs text-muted-foreground">
          {form.type === "GIVEN"
            ? "Recorded as an expense - the money leaves your available cash."
            : "Recorded as income - the money becomes available to budget."}
        </p>
      </FormSection>

      <FormSection title="When">
        <EntryDate
          date={form.date}
          onDateChange={(d) => setForm((p) => ({ ...p, date: d }))}
          homePeriod={currentPeriod}
          checked={fileUnderDateBudget}
          onCheckedChange={setFileUnderDateBudget}
          lastUsed={lastUsedDate}
        />
      </FormSection>

      <MoreOptions>
        <div>
          <Label>Due Date (optional)</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any extra details..." />
        </div>
      </MoreOptions>

      <div className="flex items-start gap-2">
        <Checkbox id="bookCreateTransaction" checked={book} onCheckedChange={(c) => setBook(!!c)} className="mt-0.5" />
        <Label htmlFor="bookCreateTransaction" className="cursor-pointer text-sm font-normal leading-snug">
          Also record as {form.type === "GIVEN" ? "an expense" : "income"}
          <span className="block text-xs text-muted-foreground">Uncheck to track this loan without an entry in Expenses/Income</span>
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding..." : "Add Loan"}
      </Button>
    </form>
  );
}
