"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, TrendingUp, TrendingDown, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Trash2, Pencil, PlusCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createLoan, recordPayment, updateLoanPayment, deleteLoanPayment, deleteLoan, addToLoan, writeOffLoan } from "@/actions/loans";
import { isLoanClosed, normalizePersonName, offersWriteOffExpense } from "@/lib/loans/balance";
import { getExpenseFundingContext } from "@/actions/expenses";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { BudgetPeriodOverride, monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { SplitFunding, FundingSelectContent, type FundingOption } from "@/components/shared/split-funding";
import { FormSection, MoreOptions } from "@/components/shared/form-section";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";

interface LoanPayment {
  id: string; kind: string; amount: number; date: Date; notes: string | null; transactionId: string | null;
  transaction: { fundingSource: string; fundingPotId: string | null; budgetMonth: number; budgetYear: number } | null;
}
interface Loan {
  id: string; personName: string; description: string | null; type: string;
  principalAmount: number; remainingAmount: number; date: Date; dueDate: Date | null;
  notes: string | null; status: string; transactionId: string | null; payments: LoanPayment[];
}
interface Summary { totalGiven: number; totalReceived: number; netPosition: number; }
interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
interface PotBalance { amount: number; currency: CurrencyLite; }
interface FundingPot { id: string; name: string; type: string; balances: PotBalance[]; }
interface FundingContext { monthlyIncomeAvailable: number; currencies: CurrencyLite[]; pots: FundingPot[]; }

// Loans record their principal directly as an income/expense transaction -
// no pot involved. Repaying a borrowed (RECEIVED) loan can still draw from a
// pot, same as any other expense; getting repaid on a lent (GIVEN) loan is
// plain income. Loans only ever move money in the household's base currency
// (out of scope for per-loan currency selection - only pots/income support multiple).
function baseBalance(pot: { balances: PotBalance[] }): number {
  return pot.balances.find((b) => b.currency.isBase)?.amount ?? 0;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  WRITTEN_OFF: "bg-muted text-muted-foreground",
};

export function LoansClient({
  loans, summary, fundingContext, currentPeriod,
}: { loans: Loan[]; summary: Summary; fundingContext: FundingContext; currentPeriod: { month: number; year: number } }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [fileCreateUnderDateBudget, setFileCreateUnderDateBudget] = useState(false);
  const [fileUnderDateBudget, setFileUnderDateBudget] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteLoanData, setDeleteLoanData] = useState<{ id: string; personName: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ personName: "", description: "", type: "GIVEN", principalAmount: "", date: format(new Date(), "yyyy-MM-dd"), dueDate: "", notes: "" });
  const [bookCreateTransaction, setBookCreateTransaction] = useState(true);
  const [payForm, setPayForm] = useState({ amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "", fundingSource: "INCOME", fundingPotId: "" });
  const [bookPayTransaction, setBookPayTransaction] = useState(true);
  const [entryDialog, setEntryDialog] = useState<{ loan: Loan; kind: "TOP_UP" | "WRITE_OFF" } | null>(null);
  const [entryForm, setEntryForm] = useState({ amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "", book: true, fileUnderDate: false });

  function openEntry(loan: Loan, kind: "TOP_UP" | "WRITE_OFF", prefill?: { amount?: string; date?: string }) {
    setEntryDialog({ loan, kind });
    setEntryForm({
      amount: prefill?.amount ?? (kind === "WRITE_OFF" ? String(loan.remainingAmount / 100) : ""),
      date: prefill?.date ?? format(new Date(), "yyyy-MM-dd"),
      notes: "",
      book: kind === "TOP_UP" ? true : offersWriteOffExpense(loan, loan.payments),
      fileUnderDate: false,
    });
  }

  // Same person + same direction + still open -> offer "Add to that loan instead".
  const duplicateLoan = form.personName.trim()
    ? loans.find((l) => !isLoanClosed(l.status) && l.type === form.type
        && normalizePersonName(l.personName) === normalizePersonName(form.personName))
    : undefined;
  const [useSplit, setUseSplit] = useState(false);
  const [splitRows, setSplitRows] = useState([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
  const baseSymbol = fundingContext.currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  const baseCurrencyId = fundingContext.currencies.find((c) => c.isBase)?.id;

  // Funding figures for the repayment dialog follow whichever period the
  // payment will actually be filed under - refetch when the date-budget
  // checkbox targets a different period than the page's load-time period.
  const [fetchedFundingContext, setFetchedFundingContext] = useState<FundingContext>();
  const [fundingContextLoading, setFundingContextLoading] = useState(false);
  const payTargetPeriod = fileUnderDateBudget && payForm.date ? monthYearFromDateStr(payForm.date) : currentPeriod;
  const isPayCurrentPeriod = payTargetPeriod.month === currentPeriod.month && payTargetPeriod.year === currentPeriod.year;
  const liveFundingContext = isPayCurrentPeriod ? fundingContext : (fetchedFundingContext ?? fundingContext);

  useEffect(() => {
    if (!payOpen || isPayCurrentPeriod) return;
    let cancelled = false;
    setFundingContextLoading(true);
    getExpenseFundingContext(payTargetPeriod.month, payTargetPeriod.year)
      .then((ctx) => { if (!cancelled) setFetchedFundingContext(ctx); })
      .finally(() => { if (!cancelled) setFundingContextLoading(false); });
    return () => { cancelled = true; };
  }, [payOpen, payTargetPeriod.month, payTargetPeriod.year, isPayCurrentPeriod]);

  const loanFundingOptions: FundingOption[] = [
    { value: "INCOME", group: "income", label: `Monthly income · ${baseSymbol} ${(liveFundingContext.monthlyIncomeAvailable / 100).toLocaleString()} available` },
    ...liveFundingContext.pots.filter((p) => baseBalance(p) > 0).map((pot) => ({
      value: pot.id,
      group: "pot" as const,
      label: `${pot.name} (${pot.type}) · ${baseSymbol} ${(baseBalance(pot) / 100).toLocaleString()}`,
    })),
  ];

  const activeLoans = loans.filter((l) => !isLoanClosed(l.status));
  const closedLoans = loans.filter((l) => isLoanClosed(l.status));

  async function handleCreate() {
    if (!form.personName || !form.principalAmount) return;
    setLoading(true);
    const createDateOverride = monthYearFromDateStr(form.date);
    const result = await createLoan({
      ...form,
      principalAmount: parseFloat(form.principalAmount),
      skipTransaction: !bookCreateTransaction,
      ...(fileCreateUnderDateBudget ? { budgetMonth: createDateOverride.month, budgetYear: createDateOverride.year } : {}),
    });
    if (result.success) {
      toast.success(
        !bookCreateTransaction
          ? "Loan added - tracking only, no entry recorded"
          : form.type === "GIVEN" ? "Loan added - recorded as an expense" : "Loan added - recorded as income"
      );
      setCreateOpen(false);
      setForm({ personName: "", description: "", type: "GIVEN", principalAmount: "", date: format(new Date(), "yyyy-MM-dd"), dueDate: "", notes: "" });
      setFileCreateUnderDateBudget(false);
      setBookCreateTransaction(true);
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleEntry() {
    if (!entryDialog || !entryForm.amount) return;
    setLoading(true);
    const override = entryForm.fileUnderDate ? monthYearFromDateStr(entryForm.date) : null;
    const common = {
      amount: parseFloat(entryForm.amount),
      date: entryForm.date,
      notes: entryForm.notes || undefined,
      ...(override ? { budgetMonth: override.month, budgetYear: override.year } : {}),
    };
    const result = entryDialog.kind === "TOP_UP"
      ? await addToLoan(entryDialog.loan.id, { ...common, skipTransaction: !entryForm.book })
      : await writeOffLoan(entryDialog.loan.id, { ...common, bookExpense: entryForm.book });
    if (result.success) {
      toast.success(entryDialog.kind === "TOP_UP" ? "Added to loan" : entryDialog.loan.type === "GIVEN" ? "Written off" : "Marked as forgiven");
      setEntryDialog(null);
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  const payLoan = loans.find((l) => l.id === payOpen);

  async function handlePayment() {
    if (!payOpen || !payForm.amount) return;
    setLoading(true);
    const isReceived = payLoan?.type === "RECEIVED";

    let splitSources: { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string; pkrAmount: number }[] | undefined;
    if (isReceived && useSplit) {
      const totalPaisas = Math.round(parseFloat(payForm.amount) * 100);
      const primaryTotal = splitRows.slice(0, -1).reduce((s, r) => s + (Math.round(parseFloat(r.pkrAmount || "0") * 100) || 0), 0);
      const lastAmount = totalPaisas - primaryTotal;
      if (lastAmount <= 0) {
        toast.error("Split sources exceed payment amount");
        setLoading(false);
        return;
      }
      splitSources = splitRows.map((row, idx) => {
        const isLast = idx === splitRows.length - 1;
        const pkrAmount = isLast ? lastAmount : (Math.round(parseFloat(row.pkrAmount || "0") * 100) || 0);
        if (row.value === "INCOME") return { source: "INCOME" as const, pkrAmount };
        return { source: "SAVINGS_POT" as const, potId: row.value, currencyId: baseCurrencyId, pkrAmount };
      });
    }

    const payDateOverride = monthYearFromDateStr(payForm.date);
    const result = editingPaymentId
      ? await updateLoanPayment(editingPaymentId, {
          amount: parseFloat(payForm.amount),
          date: payForm.date,
          notes: payForm.notes || undefined,
          ...(isReceived && !useSplit ? {
            fundingSource: payForm.fundingSource,
            fundingPotId: payForm.fundingSource === "SAVINGS_POT" ? payForm.fundingPotId : undefined,
          } : {}),
          ...(fileUnderDateBudget ? { budgetMonth: payDateOverride.month, budgetYear: payDateOverride.year } : {}),
        })
      : await recordPayment(payOpen, {
          amount: parseFloat(payForm.amount),
          date: payForm.date,
          notes: payForm.notes || undefined,
          skipTransaction: !bookPayTransaction,
          ...(isReceived && !useSplit ? {
            fundingSource: payForm.fundingSource,
            fundingPotId: payForm.fundingSource === "SAVINGS_POT" ? payForm.fundingPotId : undefined,
          } : {}),
          splitSources: isReceived && useSplit ? splitSources : undefined,
          ...(fileUnderDateBudget ? { budgetMonth: payDateOverride.month, budgetYear: payDateOverride.year } : {}),
        });
    if (result.success) {
      toast.success(
        editingPaymentId ? "Payment updated"
        : !bookPayTransaction ? "Payment recorded - tracking only, no entry recorded"
        : isReceived ? "Payment recorded & expense created!" : "Payment recorded & added to income!"
      );
      setPayOpen(null);
      setEditingPaymentId(null);

      setPayForm({ amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "", fundingSource: "INCOME", fundingPotId: "" });
      setUseSplit(false); setBookPayTransaction(true);
      setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
      setFileUnderDateBudget(false);
      setBookPayTransaction(true);
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleMarkPaid(loan: Loan) {
    setEditingPaymentId(null);

    setPayForm((p) => ({ ...p, amount: String(loan.remainingAmount / 100), fundingSource: "INCOME", fundingPotId: "" }));
    setUseSplit(false); setBookPayTransaction(true);
    setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
    setPayOpen(loan.id);
  }

  function openEditPayment(loanId: string, payment: LoanPayment) {
    setEditingPaymentId(payment.id);
    setPayForm({
      amount: String(payment.amount / 100),
      date: format(new Date(payment.date), "yyyy-MM-dd"),
      notes: payment.notes ?? "",
      fundingSource: payment.transaction?.fundingSource === "SAVINGS_POT" ? "SAVINGS_POT" : "INCOME",
      fundingPotId: payment.transaction?.fundingSource === "SAVINGS_POT" ? (payment.transaction.fundingPotId ?? "") : "",
    });
    setUseSplit(false); setBookPayTransaction(true);
    setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
    setFileUnderDateBudget(false);
    setPayOpen(loanId);
  }

  async function handleDeletePayment() {
    if (!deletePaymentId) return;
    const result = await deleteLoanPayment(deletePaymentId);
    if (result.success) toast.success("Payment deleted");
    else toast.error(result.error ?? "Failed to delete payment");
    setDeletePaymentId(null);
  }

  async function handleDelete() {
    if (!deleteLoanData) return;
    const result = await deleteLoan(deleteLoanData.id);
    if (result.success) toast.success("Loan deleted");
    else toast.error(result.error ?? "Failed to delete");
    setDeleteLoanData(null);
  }

  function LoanCard({ loan }: { loan: Loan }) {
    const paidAmount = loan.principalAmount - loan.remainingAmount;
    const pct = Math.round((paidAmount / loan.principalAmount) * 100);
    const isGiven = loan.type === "GIVEN";
    const isExpanded = expanded === loan.id;

    return (
      <div className={cn("bg-card border rounded-xl overflow-hidden", isGiven ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-900")}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isGiven ? "bg-emerald-100" : "bg-red-100")}>
              {isGiven ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{loan.personName}</span>
                <Badge className={cn("text-xs", STATUS_BADGE[loan.status])}>{loan.status.replace("_", " ")}</Badge>
                <Badge variant="outline" className={cn("text-xs", isGiven ? "text-emerald-600" : "text-red-600")}>
                  {isGiven ? "I lent" : "I borrowed"}
                </Badge>
              </div>
              {loan.description && <p className="text-xs text-muted-foreground mt-0.5">{loan.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Remaining </span>
                  <span className={cn("font-bold", isGiven ? "text-emerald-600" : "text-red-600")}>
                    {baseSymbol} {(loan.remainingAmount / 100).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">of </span>
                  <span className="text-muted-foreground">{baseSymbol} {(loan.principalAmount / 100).toLocaleString()}</span>
                </div>
                {loan.dueDate && (
                  <div className="text-xs text-muted-foreground">Due: {format(new Date(loan.dueDate), "d MMM yyyy")}</div>
                )}
              </div>
              {!isLoanClosed(loan.status) && (
                <div className="mt-2">
                  <Progress value={pct} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">{pct}% paid back</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              {!isLoanClosed(loan.status) && (
                <>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setPayOpen(loan.id)}>
                    Record Payment
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => handleMarkPaid(loan)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />Mark Paid
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => openEntry(loan, "WRITE_OFF")}>
                    <Ban className="h-3.5 w-3.5 mr-1" />{isGiven ? "Write off" : "Mark as forgiven"}
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => openEntry(loan, "TOP_UP")}>
                <PlusCircle className="h-3.5 w-3.5 mr-1" />{isGiven ? "Lend more" : "Borrow more"}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => setExpanded(isExpanded ? null : loan.id)}>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                History
              </Button>
              <button
                onClick={() => setDeleteLoanData({ id: loan.id, personName: loan.personName })}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                title="Delete loan"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</span>
            </div>
            {loan.payments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payments recorded yet</p>
            ) : (
              <div className="space-y-1.5">
                {loan.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">{format(new Date(p.date), "d MMM yyyy")}</span>
                      {p.notes && <span className="text-muted-foreground text-xs ml-2">· {p.notes}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("font-medium",
                        p.kind === "TOP_UP" ? "text-amber-600" : p.kind === "WRITE_OFF" ? "text-muted-foreground" : "text-emerald-600")}>
                        {p.kind === "TOP_UP" ? "Added +" : p.kind === "WRITE_OFF" ? (isGiven ? "Written off " : "Forgiven ") : "+"}{baseSymbol} {(p.amount / 100).toLocaleString()}
                      </span>
                      {p.transaction && p.kind === "PAYMENT" && (
                        <button onClick={() => openEditPayment(loan.id, p)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5" title="Edit payment">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={() => setDeletePaymentId(p.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-0.5" title="Delete payment">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>Started: {format(new Date(loan.date), "d MMM yyyy")}</span>
              {loan.notes && <span>{loan.notes}</span>}
            </div>

          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        section="Savings & Wealth"
        title="Loans"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Loan
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border mb-6">
        <div className="bg-background px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-1.5">Owed to me</p>
          <p className="text-xl font-bold text-emerald-500 tabnum">{baseSymbol} {(summary.totalGiven / 100).toLocaleString()}</p>
        </div>
        <div className="bg-background px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-1.5">I owe</p>
          <p className="text-xl font-bold text-red-500 tabnum">{baseSymbol} {(summary.totalReceived / 100).toLocaleString()}</p>
        </div>
        <div className="bg-background px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-1.5">Net</p>
          <p className={cn("text-xl font-bold tabnum", summary.netPosition >= 0 ? "text-foreground" : "text-red-500")}>
            {summary.netPosition >= 0 ? "+" : ""}{baseSymbol} {(Math.abs(summary.netPosition) / 100).toLocaleString()}
          </p>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedLoans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeLoans.length === 0 ? (
            <EmptyState icon={AlertCircle} title="No active loans" description="Add a loan to start tracking money you've lent or borrowed." action={{ label: "Add Loan", onClick: () => setCreateOpen(true) }} />
          ) : (
            activeLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4 space-y-3">
          {closedLoans.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No closed loans" description="Paid and written-off loans will appear here." />
          ) : (
            closedLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Create loan dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Loan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FormSection title="Who & what">
              <div>
                <Label>Type</Label>
                <Select onValueChange={(v) => setForm((p) => ({ ...p, type: v }))} defaultValue="GIVEN">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GIVEN">I lent money to someone</SelectItem>
                    <SelectItem value="RECEIVED">I borrowed money from someone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Person Name</Label>
                <Input value={form.personName} onChange={(e) => setForm((p) => ({ ...p, personName: e.target.value }))} placeholder="e.g. Ahmed, Uncle Tariq" />
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
                      setCreateOpen(false);
                      openEntry(duplicateLoan, "TOP_UP", { amount: form.principalAmount, date: form.date });
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
                <Input type="number" value={form.principalAmount} onChange={(e) => setForm((p) => ({ ...p, principalAmount: e.target.value }))} placeholder="0" />
              </div>
              <p className="text-xs text-muted-foreground">
                {form.type === "GIVEN"
                  ? "Recorded as an expense - the money leaves your available cash."
                  : "Recorded as income - the money becomes available to budget."}
              </p>
            </FormSection>

            <FormSection title="When">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <BudgetPeriodOverride date={form.date} checked={fileCreateUnderDateBudget} onChange={setFileCreateUnderDateBudget} />
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
              <Checkbox
                id="bookCreateTransaction"
                checked={bookCreateTransaction}
                onCheckedChange={(c) => setBookCreateTransaction(!!c)}
                className="mt-0.5"
              />
              <Label htmlFor="bookCreateTransaction" className="cursor-pointer text-sm font-normal leading-snug">
                Also record as {form.type === "GIVEN" ? "an expense" : "income"}
                <span className="block text-xs text-muted-foreground">
                  Uncheck to track this loan without an entry in Expenses/Income
                </span>
              </Label>
            </div>

            <Button className="w-full" onClick={handleCreate} disabled={loading}>
              {loading ? "Adding..." : "Add Loan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog open={!!payOpen} onOpenChange={(o) => { if (!o) { setPayOpen(null); setEditingPaymentId(null); setUseSplit(false); setBookPayTransaction(true); setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingPaymentId ? "Edit Payment" : payLoan?.type === "RECEIVED" ? "Record Repayment" : "Record Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormSection title="Amount">
              <Input type="number" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" autoFocus />
            </FormSection>

            <FormSection title="When">
              <div>
                <Label>Date</Label>
                <Input type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <BudgetPeriodOverride
                date={payForm.date}
                checked={fileUnderDateBudget}
                onChange={setFileUnderDateBudget}
                affectsFunding={payLoan?.type === "RECEIVED"}
              />
            </FormSection>

            {!editingPaymentId && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="bookPayTransaction"
                  checked={bookPayTransaction}
                  onCheckedChange={(c) => setBookPayTransaction(!!c)}
                  className="mt-0.5"
                />
                <Label htmlFor="bookPayTransaction" className="cursor-pointer text-sm font-normal leading-snug">
                  Also record as {payLoan?.type === "RECEIVED" ? "an expense" : "income"}
                  <span className="block text-xs text-muted-foreground">
                    Uncheck to track this payment without an entry in Expenses/Income
                  </span>
                </Label>
              </div>
            )}

            {bookPayTransaction && payLoan?.type === "RECEIVED" && (
              <FormSection title="Funding">
                <div className={cn("space-y-3 transition-opacity", fundingContextLoading && "opacity-60")}>
                  <div className="flex items-center justify-between">
                    <Label>Pay from</Label>
                    {!editingPaymentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseSplit(!useSplit);
                          if (!useSplit) setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
                        }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {useSplit ? "Single source" : "Split sources"}
                      </button>
                    )}
                  </div>
                  {editingPaymentId && (
                    <p className="text-xs text-muted-foreground">
                      Editing only supports a single funding source - delete and re-add for split funding.
                    </p>
                  )}

                  {!useSplit ? (
                    <>
                      <Select
                        value={payForm.fundingSource === "SAVINGS_POT" ? payForm.fundingPotId : "INCOME"}
                        onValueChange={(v) => {
                          if (v === "INCOME") setPayForm((p) => ({ ...p, fundingSource: "INCOME", fundingPotId: "" }));
                          else setPayForm((p) => ({ ...p, fundingSource: "SAVINGS_POT", fundingPotId: v }));
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <FundingSelectContent options={loanFundingOptions} />
                      </Select>
                      <p className="text-xs text-muted-foreground">Choosing a savings pot deducts the amount immediately.</p>
                    </>
                  ) : (
                    <SplitFunding
                      totalAmount={parseFloat(payForm.amount) || 0}
                      options={loanFundingOptions}
                      value={splitRows}
                      onChange={setSplitRows}
                    />
                  )}
                </div>
              </FormSection>
            )}
            {bookPayTransaction && payLoan?.type === "GIVEN" && (
              <p className="text-xs text-muted-foreground">Recorded as income - available to budget once received.</p>
            )}

            <MoreOptions>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={payForm.notes} onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Cash, bank transfer" />
              </div>
            </MoreOptions>

            <Button className="w-full" onClick={handlePayment} disabled={loading}>
              {loading ? "Saving..." : editingPaymentId ? "Save Changes" : payLoan?.type === "RECEIVED" ? "Record Repayment" : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletePaymentId}
        onOpenChange={(o) => !o && setDeletePaymentId(null)}
        title="Delete payment?"
        description="This removes the payment and its linked transaction, and adds the amount back to the loan's remaining balance. This cannot be undone."
        onConfirm={handleDeletePayment}
      />

      <ConfirmDialog
        open={!!deleteLoanData}
        onOpenChange={(o) => !o && setDeleteLoanData(null)}
        title="Delete loan?"
        description="This removes the loan and its linked transaction from your ledger, plus all payment history. This cannot be undone."
        onConfirm={handleDelete}
      />

      {/* Add to loan / write off */}
      <Dialog open={!!entryDialog} onOpenChange={(o) => !o && setEntryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entryDialog?.kind === "TOP_UP"
                ? `${entryDialog.loan.type === "GIVEN" ? "Lend more to" : "Borrow more from"} ${entryDialog.loan.personName}`
                : `${entryDialog?.loan.type === "GIVEN" ? "Write off" : "Mark as forgiven"} - ${entryDialog?.loan.personName}`}
            </DialogTitle>
          </DialogHeader>
          {entryDialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Amount ({baseSymbol})</Label>
                <Input type="number" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} />
                {entryDialog.kind === "WRITE_OFF" && (
                  <p className="text-xs text-muted-foreground">
                    {baseSymbol} {(entryDialog.loan.remainingAmount / 100).toLocaleString()} left - lower it to write off only part.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea rows={2} value={entryForm.notes} onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              {entryDialog.kind === "TOP_UP" || offersWriteOffExpense(entryDialog.loan, entryDialog.loan.payments) ? (
                <>
                  <div className="flex items-start gap-2">
                    <Checkbox id="bookLoanEntry" checked={entryForm.book} onCheckedChange={(c) => setEntryForm((f) => ({ ...f, book: !!c }))} className="mt-0.5" />
                    <Label htmlFor="bookLoanEntry" className="cursor-pointer text-sm font-normal leading-snug">
                      Also record as {entryDialog.kind === "WRITE_OFF" || entryDialog.loan.type === "GIVEN" ? "an expense" : "income"}
                      <span className="block text-xs text-muted-foreground">Uncheck to track this without an entry in Expenses/Income</span>
                    </Label>
                  </div>
                  {entryForm.book && (
                    <BudgetPeriodOverride date={entryForm.date} checked={entryForm.fileUnderDate} onChange={(v) => setEntryForm((f) => ({ ...f, fileUnderDate: v }))} />
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Already counted when you created this loan. Nothing new is recorded in Expenses or Income.
                </p>
              )}
              <Button className="w-full" onClick={handleEntry} disabled={loading || !entryForm.amount}>
                {entryDialog.kind === "TOP_UP" ? "Add to loan" : entryDialog.loan.type === "GIVEN" ? "Write off" : "Mark as forgiven"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
