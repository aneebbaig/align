"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "./savings-utils";

interface Investment {
  id: string; name: string; type: string; platform: string;
  investedAmount: number; currentValue: number;
}

export function InvestmentsTab({ investments, baseSymbol = "Rs" }: { investments: Investment[]; baseSymbol?: string }) {
  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const totalCurrentValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalGain = totalCurrentValue - totalInvested;

  if (investments.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No investments yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add investments on the <a href="/investments" className="text-primary underline">Investments page</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Invested</div>
          <div className="text-lg font-bold text-foreground">{baseSymbol} {fmt(totalInvested)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Current Value</div>
          <div className="text-lg font-bold text-foreground">{baseSymbol} {fmt(totalCurrentValue)}</div>
        </div>
        <div className={cn("border rounded-xl px-4 py-3",
          totalGain >= 0
            ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
        )}>
          <div className={cn("text-xs mb-1", totalGain >= 0 ? "text-emerald-600" : "text-red-500")}>Gain / Loss</div>
          <div className={cn("text-lg font-bold", totalGain >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600")}>
            {totalGain >= 0 ? "+" : ""}{baseSymbol} {fmt(totalGain)}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {investments.map((inv) => {
          const gain = inv.currentValue - inv.investedAmount;
          return (
            <div key={inv.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{inv.name}</div>
                <div className="text-xs text-muted-foreground">{inv.type.replace("_", " ")} · {inv.platform}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-foreground">{baseSymbol} {fmt(inv.currentValue)}</div>
                <div className={cn("text-xs font-medium", gain >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {gain >= 0 ? "+" : ""}{baseSymbol} {fmt(gain)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        <a href="/investments" className="text-primary underline">Go to Investments</a> to update values or add new investments
      </p>
    </div>
  );
}
