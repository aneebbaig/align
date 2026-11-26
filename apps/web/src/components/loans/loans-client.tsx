"use client";

import { useCallback, useState } from "react";
import { Plus, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { deleteLoanPayment, deleteLoan } from "@/actions/loans";
import { isLoanClosed } from "@/lib/loans/balance";
import { useAddShortcut } from "@/lib/use-add-shortcut";
import { cn } from "@/lib/utils";
import { LoanCard, type Loan } from "./loan-card";
import { AddLoanDialog } from "./add-loan-dialog";
import { LoanPaymentDialog } from "./loan-payment-dialog";
import { LoanEntryDialog, type LoanEntryTarget } from "./loan-entry-dialog";
import type { FundingContext, LoansSummary, PeriodRef } from "./loan-types";

export function LoansClient({
  loans, summary, fundingContext, currentPeriod,
}: { loans: Loan[]; summary: LoansSummary; fundingContext: FundingContext; currentPeriod: PeriodRef }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<{ loanId: string; paymentId: string | null } | null>(null);
  const [entryTarget, setEntryTarget] = useState<LoanEntryTarget | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteLoanData, setDeleteLoanData] = useState<{ id: string; personName: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  useAddShortcut(createOpen || !!payTarget || !!entryTarget, openCreate);

  const baseCurrency = fundingContext.currencies.find((c) => c.isBase);
  const baseSymbol = baseCurrency?.symbol ?? "Rs";

  const activeLoans = loans.filter((l) => !isLoanClosed(l.status));
  const closedLoans = loans.filter((l) => isLoanClosed(l.status));

  const payLoan = payTarget ? loans.find((l) => l.id === payTarget.loanId) ?? null : null;
  const payPayment = payLoan && payTarget?.paymentId ? payLoan.payments.find((p) => p.id === payTarget.paymentId) ?? null : null;

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

  const renderCard = (loan: Loan) => (
    <LoanCard
      key={loan.id}
      loan={loan}
      baseSymbol={baseSymbol}
      expanded={expanded === loan.id}
      onToggle={() => setExpanded(expanded === loan.id ? null : loan.id)}
      onPay={() => setPayTarget({ loanId: loan.id, paymentId: null })}
      onMarkPaid={() => setPayTarget({ loanId: loan.id, paymentId: null })}
      onTopUp={() => setEntryTarget({ loan, kind: "TOP_UP" })}
      onWriteOff={() => setEntryTarget({ loan, kind: "WRITE_OFF" })}
      onDelete={() => setDeleteLoanData({ id: loan.id, personName: loan.personName })}
      onEditPayment={(p) => setPayTarget({ loanId: loan.id, paymentId: p.id })}
      onDeletePayment={(id) => setDeletePaymentId(id)}
    />
  );

  return (
    <>
      <PageHeader
        section="Savings & Wealth"
        title="Loans"
        action={
          <Button onClick={openCreate}>
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-1.5">
            {summary.netPosition === 0 ? "All square" : summary.netPosition < 0 ? "Net – you owe" : "Net – owed to you"}
          </p>
          <p className={cn("text-xl font-bold tabnum", summary.netPosition < 0 ? "text-red-500" : summary.netPosition > 0 ? "text-emerald-500" : "text-foreground")}>
            {summary.netPosition === 0 ? "" : summary.netPosition > 0 ? "+" : "-"}{baseSymbol} {(Math.abs(summary.netPosition) / 100).toLocaleString()}
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
            <EmptyState icon={AlertCircle} title="No active loans" description="Add a loan to start tracking money you've lent or borrowed." action={{ label: "Add Loan", onClick: openCreate }} />
          ) : activeLoans.map(renderCard)}
        </TabsContent>

        <TabsContent value="closed" className="mt-4 space-y-3">
          {closedLoans.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No closed loans" description="Paid and written-off loans will appear here." />
          ) : closedLoans.map(renderCard)}
        </TabsContent>
      </Tabs>

      <AddLoanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        loans={loans}
        currentPeriod={currentPeriod}
        baseSymbol={baseSymbol}
        onTopUpInstead={(loan, prefill) => setEntryTarget({ loan, kind: "TOP_UP", prefill })}
      />

      <LoanPaymentDialog
        loan={payLoan}
        payment={payPayment}
        onClose={() => setPayTarget(null)}
        fundingContext={fundingContext}
        currentPeriod={currentPeriod}
        baseSymbol={baseSymbol}
        baseCurrencyId={baseCurrency?.id}
      />

      <LoanEntryDialog target={entryTarget} onClose={() => setEntryTarget(null)} currentPeriod={currentPeriod} baseSymbol={baseSymbol} />

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
    </>
  );
}
