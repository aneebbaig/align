"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, TrendingUp, TrendingDown, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
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
import { createLoan, recordPayment, updateLoanPayment, deleteLoanPayment, deleteLoan } from "@/actions/loans";
import { createLoanSchedule, deleteLoanSchedule } from "@/actions/cashflow";
import { getExpenseFundingContext } from "@/actions/expenses";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock } from "lucide-react";
import { BudgetPeriodOverride, monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { SplitFunding, FundingSelectContent, type FundingOption } from "@/components/shared/split-funding";
import { FormSection, MoreOptions } from "@/components/shared/form-section";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";

interface LoanPayment {
  id: string; amount: number; date: Date; notes: string | null;
  transaction: { fundingSource: string; fundingPotId: string | null; budgetMonth: number; budgetYear: number } | null;
}
interface LoanSchedule {
  id: string; kind: string; amount: number; startDate: Date; endDate: Date | null;
  flexibility: string; priority: number; slideWindowMonths: number; interestRate: number | null;
  fulfilledPaymentId: string | null;
}
interface Loan {
  id: string; personName: string; description: string | null; type: string;
  principalAmount: number; remainingAmount: number; date: Date; dueDate: Date | null;
  notes: string | null; status: string; payments: LoanPayment[]; schedules: LoanSchedule[];
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
};

export function LoansClient({
  loans, summary, fundingContext, currentPeriod,
}: { loans: Loan[]; summary: Summary; fundingContext: FundingContext; currentPeriod: { month: number; year: number } }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [fileCreateUnderDateBudget, setFileCreateUnderDateBudget] = useState(false);
  const [fileUnderDateBudget, setFileUnderDateBudget] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [linkScheduleId, setLinkScheduleId] = useState<string | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteLoanData, setDeleteLoanData] = useState<{ id: string; personName: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState<string | null>(null); // loanId
  const [scheduleForm, setScheduleForm] = useState({
    kind: "LUMP_SUM", amount: "", startDate: format(new Date(), "yyyy-MM-dd"), endDate: "",
    flexibility: "FIXED", priority: "0", slideWindowMonths: "0",
  });

  const [form, setForm] = useState({ personName: "", description: "", type: "GIVEN", principalAmount: "", date: format(new Date(), "yyyy-MM-dd"), dueDate: "", notes: "" });
  const [bookCreateTransaction, setBookCreateTransaction] = useState(true);
  const [payForm, setPayForm] = useState({ amount: "", date: format(new Date(), "yyyy-MM-dd"), notes: "", fundingSource: "INCOME", fundingPotId: "" });
  const [bookPayTransaction, setBookPayTransaction] = useState(true);
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

  const activeLoans = loans.filter((l) => l.status !== "PAID");
  const paidLoans = loans.filter((l) => l.status === "PAID");

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
          ...(linkScheduleId ? { linkScheduleId } : {}),
        });
    if (result.success) {
      toast.success(
        editingPaymentId ? "Payment updated"
        : !bookPayTransaction ? "Payment recorded - tracking only, no entry recorded"
        : isReceived ? "Payment recorded & expense created!" : "Payment recorded & added to income!"
      );
      setPayOpen(null);
      setEditingPaymentId(null);
      setLinkScheduleId(null);
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
    setLinkScheduleId(null);
    setPayForm((p) => ({ ...p, amount: String(loan.remainingAmount / 100), fundingSource: "INCOME", fundingPotId: "" }));
    setUseSplit(false); setBookPayTransaction(true);
    setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
    setPayOpen(loan.id);
  }

  function openRecordInstallment(loanId: string, schedule: LoanSchedule) {
    setEditingPaymentId(null);
    setLinkScheduleId(schedule.id);
    setPayForm({
      amount: String(schedule.amount / 100),
      date: format(new Date(schedule.startDate), "yyyy-MM-dd"),
      notes: "",
      fundingSource: "INCOME",
      fundingPotId: "",
    });
    setUseSplit(false); setBookPayTransaction(true);
    setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]);
    setFileUnderDateBudget(false);
    setPayOpen(loanId);
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

  function openScheduleDialog(loanId: string) {
    setScheduleForm({
      kind: "LUMP_SUM", amount: "", startDate: format(new Date(), "yyyy-MM-dd"), endDate: "",
      flexibility: "FIXED", priority: "0", slideWindowMonths: "0",
    });
    setScheduleOpen(loanId);
  }

  async function handleAddSchedule() {
    if (!scheduleOpen || !scheduleForm.amount) return;
    if (scheduleForm.kind === "FIXED_INSTALLMENT" && !scheduleForm.endDate) {
      toast.error("Fixed installment plans need an end date");
      return;
    }
    setLoading(true);
    const result = await createLoanSchedule({
      loanId: scheduleOpen,
      kind: scheduleForm.kind as "LUMP_SUM" | "FIXED_INSTALLMENT",
      amount: parseFloat(scheduleForm.amount),
      startDate: scheduleForm.startDate,
      endDate: scheduleForm.kind === "FIXED_INSTALLMENT" ? scheduleForm.endDate : undefined,
      flexibility: scheduleForm.flexibility as "FIXED" | "FLEXIBLE",
      priority: parseInt(scheduleForm.priority, 10) || 0,
      slideWindowMonths: scheduleForm.flexibility === "FLEXIBLE" ? parseInt(scheduleForm.slideWindowMonths, 10) || 0 : 0,
    });
    if (result.success) {
      toast.success("Repayment schedule added");
      setScheduleOpen(null);
    } else toast.error(result.error ?? "Failed to add schedule");
    setLoading(false);
  }

  async function handleDeleteSchedule(id: string) {
    const result = await deleteLoanSchedule(id);
    if (result.success) toast.success("Schedule removed");
    else toast.error(result.error ?? "Failed to remove schedule");
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
              {loan.status !== "PAID" && (
                <div className="mt-2">
                  <Progress value={pct} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">{pct}% paid back</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              {loan.status !== "PAID" && (
                <>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setPayOpen(loan.id)}>
                    Record Payment
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => handleMarkPaid(loan)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />Mark Paid
                  </Button>
                </>
              )}
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
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment History</span>
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
                      <span className="font-medium text-emerald-600">+{baseSymbol} {(p.amount / 100).toLocaleString()}</span>
                      {p.transaction && (
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

            {loan.status !== "PAID" && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarClock className="h-3 w-3" />Repayment Plan
                  </span>
                  <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => openScheduleDialog(loan.id)}>
                    <Plus className="h-3 w-3" />Add
                  </Button>
                </div>
                {loan.schedules.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No repayment schedule yet - add one so the cash-flow planner can project this loan.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {loan.schedules.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {s.flexibility === "FLEXIBLE" ? `Flexible ±${s.slideWindowMonths}mo` : "Fixed"}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {s.kind === "LUMP_SUM"
                              ? `${baseSymbol} ${(s.amount / 100).toLocaleString()} on ${format(new Date(s.startDate), "d MMM yyyy")}`
                              : `${baseSymbol} ${(s.amount / 100).toLocaleString()}/mo, ${format(new Date(s.startDate), "MMM yyyy")}${s.endDate ? ` – ${format(new Date(s.endDate), "MMM yyyy")}` : ""}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.fulfilledPaymentId ? (
                            <span className="text-[10px] text-emerald-600 font-medium">Recorded</span>
                          ) : (
                            <button onClick={() => openRecordInstallment(loan.id, s)} className="text-xs text-primary hover:underline font-medium" title="Record this installment">
                              Record
                            </button>
                          )}
                          <button onClick={() => handleDeleteSchedule(s.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Remove schedule">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <TabsTrigger value="paid">Paid ({paidLoans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeLoans.length === 0 ? (
            <EmptyState icon={AlertCircle} title="No active loans" description="Add a loan to start tracking money you've lent or borrowed." action={{ label: "Add Loan", onClick: () => setCreateOpen(true) }} />
          ) : (
            activeLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4 space-y-3">
          {paidLoans.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No paid loans" description="Fully paid loans will appear here." />
          ) : (
            paidLoans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
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
      <Dialog open={!!payOpen} onOpenChange={(o) => { if (!o) { setPayOpen(null); setEditingPaymentId(null); setLinkScheduleId(null); setUseSplit(false); setBookPayTransaction(true); setSplitRows([{ value: "INCOME", pkrAmount: "" }, { value: "INCOME", pkrAmount: "" }]); } }}>
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

      {/* Add repayment schedule dialog */}
      <Dialog open={!!scheduleOpen} onOpenChange={(o) => !o && setScheduleOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Repayment Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FormSection title="What">
              <Select value={scheduleForm.kind} onValueChange={(v) => setScheduleForm((p) => ({ ...p, kind: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LUMP_SUM">Lump sum on a date</SelectItem>
                  <SelectItem value="FIXED_INSTALLMENT">Fixed installments (monthly)</SelectItem>
                </SelectContent>
              </Select>
            </FormSection>

            <FormSection title="Amount">
              <div>
                <Label>{scheduleForm.kind === "LUMP_SUM" ? "Amount" : "Amount per month"} ({baseSymbol})</Label>
                <Input type="number" value={scheduleForm.amount} onChange={(e) => setScheduleForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" autoFocus />
              </div>
            </FormSection>

            <FormSection title="When">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{scheduleForm.kind === "LUMP_SUM" ? "Due Date" : "Starts"}</Label>
                  <Input type="date" value={scheduleForm.startDate} onChange={(e) => setScheduleForm((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                {scheduleForm.kind === "FIXED_INSTALLMENT" && (
                  <div>
                    <Label>Ends</Label>
                    <Input type="date" value={scheduleForm.endDate} onChange={(e) => setScheduleForm((p) => ({ ...p, endDate: e.target.value }))} />
                  </div>
                )}
              </div>
            </FormSection>

            <MoreOptions>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Flexible</Label>
                  <p className="text-xs text-muted-foreground">Can be slid to a different month in a tight cycle</p>
                </div>
                <Switch
                  checked={scheduleForm.flexibility === "FLEXIBLE"}
                  onCheckedChange={(v) => setScheduleForm((p) => ({ ...p, flexibility: v ? "FLEXIBLE" : "FIXED" }))}
                />
              </div>
              {scheduleForm.flexibility === "FLEXIBLE" && (
                <div>
                  <Label>Slide Window (months)</Label>
                  <Input type="number" min={1} value={scheduleForm.slideWindowMonths} onChange={(e) => setScheduleForm((p) => ({ ...p, slideWindowMonths: e.target.value }))} />
                </div>
              )}
              <div>
                <Label>Priority</Label>
                <Input type="number" value={scheduleForm.priority} onChange={(e) => setScheduleForm((p) => ({ ...p, priority: e.target.value }))} placeholder="0" />
                <p className="text-xs text-muted-foreground mt-1">Lower slides first when a month is tight</p>
              </div>
            </MoreOptions>

            <Button className="w-full" onClick={handleAddSchedule} disabled={loading}>
              {loading ? "Adding..." : "Add Schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
