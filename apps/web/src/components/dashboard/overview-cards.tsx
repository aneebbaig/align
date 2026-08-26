import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  totalIncome: number;
  totalExpenses: number;
  remainingBudget: number;
  netSavings: number;
  baseSymbol?: string;
}

export function OverviewCards({ totalIncome, totalExpenses, remainingBudget, netSavings, baseSymbol = "Rs" }: Props) {
  const fmt = (n: number) => `${baseSymbol} ${(Math.abs(n) / 100).toLocaleString()}`;

  const stats = [
    {
      label: "Income",
      value: fmt(totalIncome),
      icon: TrendingUp,
      color: "text-emerald-500 dark:text-emerald-400",
    },
    {
      label: "Expenses",
      value: fmt(totalExpenses),
      icon: TrendingDown,
      color: "text-red-500 dark:text-red-400",
    },
    {
      label: "Remaining",
      value: remainingBudget >= 0 ? fmt(remainingBudget) : `-${fmt(remainingBudget)}`,
      icon: Wallet,
      color: remainingBudget < 0 ? "text-red-500" : "text-foreground",
    },
    {
      label: "Net Savings",
      value: netSavings >= 0 ? fmt(netSavings) : `-${fmt(netSavings)}`,
      icon: PiggyBank,
      color: netSavings >= 0 ? "text-foreground" : "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border stagger">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-background px-5 py-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
              {label}
            </p>
            <Icon className={cn("h-3.5 w-3.5 opacity-40", color)} />
          </div>
          <p className={cn("text-2xl font-bold tabnum leading-none", color)}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
