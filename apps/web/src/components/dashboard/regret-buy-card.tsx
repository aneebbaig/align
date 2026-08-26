import Link from "next/link";
import { format } from "date-fns";
import { Frown } from "lucide-react";

interface RegretStats {
  thisMonth: { count: number; total: number };
  allTime: { count: number; total: number };
  recent: { id: string; description: string; amount: number; date: Date; category: { name: string; color: string } }[];
}

export function RegretBuyCard({ stats, baseSymbol = "Rs" }: { stats: RegretStats; baseSymbol?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Frown className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-foreground">Regret Buys</h3>
        </div>
        <Link href="/expenses" className="text-xs text-primary hover:underline">View expenses</Link>
      </div>

      {stats.allTime.count === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No regret buys logged. Tick "Regret buy" on an expense when you wish you hadn't bought it.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border border-border mb-4">
            <div className="bg-background px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-1">This month</p>
              <p className="text-lg font-bold tabnum text-amber-600 dark:text-amber-400">{baseSymbol} {(stats.thisMonth.total / 100).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground/70">{stats.thisMonth.count} purchase{stats.thisMonth.count === 1 ? "" : "s"}</p>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-1">Could've saved (all-time)</p>
              <p className="text-lg font-bold tabnum text-foreground">{baseSymbol} {(stats.allTime.total / 100).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground/70">{stats.allTime.count} purchase{stats.allTime.count === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="space-y-2">
            {stats.recent.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.category.color }} />
                  <span className="text-foreground/85 truncate">{tx.description}</span>
                  <span className="text-xs text-muted-foreground/60 shrink-0">{format(new Date(tx.date), "d MMM")}</span>
                </div>
                <span className="font-medium tabnum shrink-0 ml-2">{baseSymbol} {(tx.amount / 100).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
