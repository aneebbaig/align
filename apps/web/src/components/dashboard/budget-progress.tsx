import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BudgetCategory {
  id: string;
  category: { name: string; color: string; icon: string };
  allocatedAmount: number;
  spent: number;
  percentage: number;
}

interface Props {
  categories: BudgetCategory[];
  totalBudget: number;
  totalSpent: number;
  baseSymbol?: string;
}

export function BudgetProgress({ categories, totalBudget, totalSpent, baseSymbol = "Rs" }: Props) {
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">Budget</h3>
        <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all →
        </Link>
      </div>

      {totalBudget === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10">
          No budget set.{" "}
          <Link href="/budget" className="text-primary hover:underline">Set one →</Link>
        </div>
      ) : (
        <>
          {/* Overall */}
          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall</span>
              <span className={cn(
                "text-sm font-bold tabnum",
                overallPct > 100 ? "text-red-500" : overallPct >= 75 ? "text-amber-500" : "text-foreground"
              )}>
                {overallPct}%
              </span>
            </div>
            <Progress
              value={Math.min(overallPct, 100)}
              className={cn("h-1.5", overallPct > 100 ? "[&>div]:bg-red-500" : overallPct >= 75 ? "[&>div]:bg-amber-500" : "")}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground/75 mt-1.5">
              <span className="tabnum">{baseSymbol} {(totalSpent / 100).toLocaleString()} spent</span>
              <span className="tabnum">{baseSymbol} {(totalBudget / 100).toLocaleString()} total</span>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground/80">{cat.category.name}</span>
                  <span className={cn(
                    "tabnum",
                    cat.percentage > 100 ? "text-red-500 font-semibold" : cat.percentage >= 75 ? "text-amber-500" : "text-muted-foreground/75"
                  )}>
                    {baseSymbol} {(cat.spent / 100).toLocaleString()}
                    <span className="text-muted-foreground/75"> / {(cat.allocatedAmount / 100).toLocaleString()}</span>
                  </span>
                </div>
                <Progress
                  value={Math.min(cat.percentage, 100)}
                  className={cn("h-1",
                    cat.percentage > 100 ? "[&>div]:bg-red-500" : cat.percentage >= 75 ? "[&>div]:bg-amber-500" : ""
                  )}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
