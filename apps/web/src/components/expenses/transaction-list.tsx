"use client";

import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Pencil, Trash2, AlertTriangle, Frown } from "lucide-react";
import { toast } from "sonner";
import { deleteTransaction } from "@/actions/expenses";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

interface CurrencyLite { id: string; code: string; symbol: string; rateToBase: number; isBase: boolean; }
interface Transaction {
  id: string; amount: number; type: string; categoryId: string; description: string;
  notes?: string | null; date: Date; budgetMonth: number; budgetYear: number; tags: string; isRecurring: boolean;
  recurringFrequency?: string | null; isRegretPurchase?: boolean;
  nativeCurrencyId?: string | null; nativeAmount?: number | null; nativeCurrency?: CurrencyLite | null;
  fundingSource?: string; fundingPotId?: string | null; fundingCurrencyId?: string | null; fundingAmount?: number | null;
  fundingCurrency?: CurrencyLite | null;
  fundingPot?: { id: string; name: string; type: string } | null;
  category: { id: string; name: string; color: string; icon: string };
}

function getDateLabel(date: Date): string {
  if (isToday(new Date(date))) return "Today";
  if (isYesterday(new Date(date))) return "Yesterday";
  return format(new Date(date), "EEEE, d MMM");
}

function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  return transactions.reduce((groups, t) => {
    const label = getDateLabel(t.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
    return groups;
  }, {} as Record<string, Transaction[]>);
}

export function TransactionList({
  transactions,
  budgetByCategoryId = {},
  baseSymbol = "Rs",
  onEdit,
}: {
  transactions: Transaction[];
  budgetByCategoryId?: Record<string, { allocated: number; spent: number }>;
  baseSymbol?: string;
  onEdit: (tx: Transaction) => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteTransaction(deleteId);
    if (result.success) toast.success("Transaction deleted");
    else toast.error("Failed to delete");
    setDeleting(false);
    setDeleteId(null);
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No transactions found"
        description="No transactions match your filters. Try adjusting or clearing them."
        className="border border-dashed border-border rounded-xl"
      />
    );
  }

  const groups = groupByDate(transactions);

  return (
    <>
      <div className="space-y-8 stagger">
        {Object.entries(groups).map(([date, txs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3 px-1">
              <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.14em] shrink-0">
                {date}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div>
              {txs.map((tx) => {
                const budget = tx.type === "EXPENSE" ? budgetByCategoryId[tx.categoryId] : null;
                const isOverBudget = budget && (budget.spent > budget.allocated);

                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "flex items-center gap-3 py-3.5 group first:pt-0 last:pb-0",
                      isOverBudget && "bg-red-50/30 dark:bg-red-950/10 -mx-2 px-2 rounded-lg"
                    )}
                  >
                    {/* Category indicator */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 opacity-80"
                      style={{ backgroundColor: tx.category.color }}
                    >
                      {tx.category.name[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{tx.description}</div>
                      <div className="text-xs text-muted-foreground/75 flex items-center gap-1 mt-0.5">
                        {tx.category.name}
                        {tx.isRecurring && <span className="text-primary/60">↻</span>}
                        {tx.isRegretPurchase && (
                          <span className="flex items-center gap-0.5 text-amber-600/80" title="Marked as a regret buy">
                            <Frown className="h-2.5 w-2.5" />regret
                          </span>
                        )}
                        {tx.type === "EXPENSE" && tx.fundingSource === "SAVINGS_POT" && tx.fundingPot && (
                          <span>· from {tx.fundingPot.name}{tx.fundingCurrency && !tx.fundingCurrency.isBase ? ` ${tx.fundingCurrency.symbol}` : ""}</span>
                        )}
                        {isOverBudget && (
                          <span className="flex items-center gap-0.5 text-red-500/70">
                            <AlertTriangle className="h-2.5 w-2.5" />over budget
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={cn(
                        "text-sm font-semibold tabnum",
                        tx.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                      )}>
                        {tx.type === "INCOME" ? "+" : "-"}{baseSymbol} {(tx.amount / 100).toLocaleString()}
                      </div>
                      {tx.nativeCurrency && tx.nativeAmount && (
                        <div className="text-xs text-muted-foreground/70 tabnum">
                          {tx.nativeCurrency.symbol}{(tx.nativeAmount / 100).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => onEdit(tx)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setDeleteId(tx.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/70 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete transaction?"
        description="This action cannot be undone."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
