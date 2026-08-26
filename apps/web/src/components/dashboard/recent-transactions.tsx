import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: Date;
  category: { name: string; color: string; icon: string };
}

export function RecentTransactions({ transactions, baseSymbol = "Rs" }: { transactions: Transaction[]; baseSymbol?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">Recent Transactions</h3>
        <Link href="/expenses" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10">
          No transactions this month
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: t.category.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{t.description}</div>
                <div className="text-xs text-muted-foreground/75">
                  {t.category.name} · {format(new Date(t.date), "d MMM")}
                </div>
              </div>
              <div className={cn(
                "text-sm font-semibold tabnum shrink-0",
                t.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}>
                {t.type === "INCOME" ? "+" : "-"}{baseSymbol} {(t.amount / 100).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
