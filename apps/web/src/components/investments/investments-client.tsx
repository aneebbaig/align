"use client";

import { useState } from "react";
import { Plus, LineChart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { investmentGain, withdrawnTotal } from "@/lib/investment-math";
import { useAddShortcut } from "@/lib/use-add-shortcut";
import { cn } from "@/lib/utils";
import { deleteInvestment, deleteInvestmentCategory, deleteInvestmentContribution, type InvestmentSuggestion } from "@/actions/investments";
import { InvestmentPlanCard } from "./investment-plan-card";
import { InvestmentRow, type DeleteTarget } from "./investment-row";
import { AddInvestmentDialog } from "./add-investment-dialog";
import { ContributeDialog } from "./contribute-dialog";
import { UpdateValueDialog } from "./update-value-dialog";
import type { ContributeTarget, Investment, PeriodRef, PlanCategory, Row } from "./investment-types";

export function InvestmentsClient({
  investments,
  baseSymbol = "Rs",
  plan,
  suggestion,
  currentPeriod,
}: {
  investments: Investment[];
  baseSymbol?: string;
  plan: { monthlyTarget: number; autoFromSurplus: boolean; categories: PlanCategory[] } | null;
  suggestion: InvestmentSuggestion;
  currentPeriod: PeriodRef;
}) {
  const categories = plan?.categories ?? [];
  const categoryIds = new Set(categories.map((c) => c.id));
  const rows: Row[] = [
    ...categories.map((category) => ({
      kind: "category" as const,
      category,
      investment: investments.find((i) => i.planCategoryId === category.id) ?? null,
    })),
    ...investments.filter((i) => !i.planCategoryId || !categoryIds.has(i.planCategoryId)).map((investment) => ({ kind: "uncategorized" as const, investment })),
  ];

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Investment | null>(null);
  const [contributeTarget, setContributeTarget] = useState<ContributeTarget | null>(null);
  const [clearId, setClearId] = useState<string | null>(null); // clear money & history
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // N: add money to the first investment in the list, or add an investment when there are none.
  const first = rows[0];
  const addFromShortcut = () => {
    if (!first) { setAddOpen(true); return; }
    setContributeTarget(first.kind === "category"
      ? { mode: "DEPOSIT", categoryId: first.category.id, investmentId: first.investment?.id, name: first.category.name }
      : { mode: "DEPOSIT", investmentId: first.investment.id, name: first.investment.name });
  };
  useAddShortcut(addOpen || !!contributeTarget || !!editItem, addFromShortcut);

  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const totalCurrentValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalGain = investments.reduce(
    (s, i) => s + investmentGain(i, withdrawnTotal(i.contributions)).gain,
    0,
  );

  async function handleDeleteContribution(id: string) {
    const result = await deleteInvestmentContribution(id);
    if (!result.success) toast.error(result.error ?? "Failed");
  }

  async function handleClear() {
    if (!clearId) return;
    const result = await deleteInvestment(clearId);
    if (result.success) toast.success("Deleted");
    else toast.error(result.error ?? "Failed");
    setClearId(null);
  }

  async function handleDeleteInvestment() {
    if (!deleteTarget) return;
    const result = deleteTarget.categoryId
      ? await deleteInvestmentCategory(deleteTarget.categoryId)
      : await deleteInvestment(deleteTarget.investmentId as string);
    if (result.success) toast.success("Investment deleted");
    else toast.error(result.error ?? "Failed");
    setDeleteTarget(null);
  }

  return (
    <>
      <PageHeader
        section="Savings & Wealth"
        title="Investments"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add investment
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Plan card = target split (what you intend to invest). The list below = actual contributions. */}
        <InvestmentPlanCard plan={plan} suggestion={suggestion} baseSymbol={baseSymbol} />

        <div className="rounded-xl border border-border bg-background p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Invested Savings</h3>
            </div>
            {investments.length > 0 && (
              <div className="text-right">
                <span className="text-xl font-bold text-foreground tabnum">{baseSymbol} {(totalCurrentValue / 100).toLocaleString()}</span>
                <span className={cn("ml-2 text-xs font-medium tabnum", totalGain >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {totalGain >= 0 ? "+" : ""}{baseSymbol} {(Math.abs(totalGain) / 100).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          {investments.length > 0 && (
            <p className="text-xs text-muted-foreground -mt-2">
              {baseSymbol} {(totalInvested / 100).toLocaleString()} invested across {investments.length} investment{investments.length !== 1 ? "s" : ""}
            </p>
          )}

          {rows.length === 0 ? (
            <EmptyState
              icon={LineChart}
              title="No investments yet"
              description="Add an investment (mutual fund, stock, gold, etc.) to the plan, then add money into it any time, any amount."
              action={{ label: "Add investment", onClick: () => setAddOpen(true) }}
            />
          ) : (
            <div className="divide-y divide-border -mx-5">
              {rows.map((row) => {
                const rowKey = row.kind === "category" ? row.category.id : row.investment.id;
                return (
                  <InvestmentRow
                    key={rowKey}
                    row={row}
                    baseSymbol={baseSymbol}
                    expanded={!!expanded[rowKey]}
                    onToggle={() => setExpanded((e) => ({ ...e, [rowKey]: !e[rowKey] }))}
                    onContribute={setContributeTarget}
                    onEdit={setEditItem}
                    onClear={setClearId}
                    onDelete={setDeleteTarget}
                    onDeleteContribution={handleDeleteContribution}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddInvestmentDialog open={addOpen} onOpenChange={setAddOpen} plan={plan} />
      <ContributeDialog target={contributeTarget} onClose={() => setContributeTarget(null)} baseSymbol={baseSymbol} currentPeriod={currentPeriod} />
      <UpdateValueDialog item={editItem} onClose={() => setEditItem(null)} baseSymbol={baseSymbol} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete investment?"
        description={`Delete ${deleteTarget?.name ?? "this investment"}? Its money and history are removed. Expenses or income it booked are removed too.${deleteTarget?.categoryId ? " It is also removed from your investment plan; the other percentages stay as they are." : ""}`}
        onConfirm={handleDeleteInvestment}
      />

      <ConfirmDialog
        open={!!clearId}
        onOpenChange={(o) => !o && setClearId(null)}
        title="Clear this investment's money & history?"
        description="This removes all logged contributions and mark-to-market value. If it's linked to a plan category, the category stays — you can add money into it again any time."
        onConfirm={handleClear}
      />
    </>
  );
}
