"use client";

import { AlertOctagon, AlertTriangle, CircleCheck } from "lucide-react";
import { budgetStatus, type BudgetState } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { fmt, fmtShort } from "./wedding-types";

export const BUDGET_TONE: Record<BudgetState, { bar: string; text: string; pill: string }> = {
  ok:    { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", pill: "bg-emerald-500/10" },
  close: { bar: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",     pill: "bg-amber-500/10" },
  over:  { bar: "bg-red-500",     text: "text-red-500 dark:text-red-400",         pill: "bg-red-500/10" },
  none:  { bar: "bg-muted-foreground/40", text: "text-muted-foreground",          pill: "bg-muted" },
};

const ICON: Record<BudgetState, typeof CircleCheck | null> = { ok: CircleCheck, close: AlertTriangle, over: AlertOctagon, none: null };

/** The one-line verdict: "Rs 120,000 left" / "Rs 45,000 over" / "No budget set". */
export function budgetCopy(projected: number, budget: number, symbol: string, compact = false) {
  const b = budgetStatus(projected, budget);
  const m = compact ? fmtShort : fmt;
  if (b.state === "none") return compact ? "No budget" : "No budget set";
  if (b.state === "over") return `${m(b.overBy, symbol)} over`;
  if (b.state === "close") return `${m(b.left, symbol)} left · ${Math.round(b.pct * 100)}%`;
  return `${m(b.left, symbol)} left`;
}

/** A small pill with the verdict - for headers and chips. */
export function BudgetPill({ projected, budget, symbol, compact }: { projected: number; budget: number; symbol: string; compact?: boolean }) {
  const { state } = budgetStatus(projected, budget);
  const Icon = ICON[state];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", BUDGET_TONE[state].pill, BUDGET_TONE[state].text)}>
      {Icon && <Icon className="h-3 w-3" />}
      {budgetCopy(projected, budget, symbol, compact)}
    </span>
  );
}

/**
 * Planned-vs-budget bar. The faint fill is what's planned, the solid fill what's
 * already paid; when over budget a marker shows where the budget line sits.
 */
export function BudgetMeter({ projected, paid, budget, symbol, size = "sm", showCopy = false, shortCopy = false, className }: {
  projected: number; paid: number; budget: number; symbol: string; size?: "xs" | "sm" | "md"; showCopy?: boolean;
  /** One-line verdict under the bar ("Rs 45k over") - for tight cards. */
  shortCopy?: boolean; className?: string;
}) {
  const { state } = budgetStatus(projected, budget);
  const tone = BUDGET_TONE[state];
  const scale = Math.max(budget, projected, 1);
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  const label = state === "none" ? "No budget set" : `${budgetCopy(projected, budget, symbol)} - ${fmt(projected, symbol)} planned of ${fmt(budget, symbol)}`;

  return (
    <div className={cn("space-y-1", className)}>
      <div role="meter" aria-valuenow={projected} aria-valuemin={0} aria-valuemax={Math.max(budget, 1)} aria-label={label} className={cn("relative rounded-full bg-muted overflow-hidden", size === "md" ? "h-2" : size === "xs" ? "h-1" : "h-1.5")}>
        <div className={cn("absolute inset-y-0 left-0 opacity-35", tone.bar)} style={{ width: pct(projected) }} />
        <div className={cn("absolute inset-y-0 left-0", tone.bar)} style={{ width: pct(Math.min(paid, projected)) }} />
        {state === "over" && <div className="absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: pct(budget) }} />}
      </div>
      {shortCopy && <p className={cn("text-[11px] font-medium whitespace-nowrap", tone.text)} title={label}>{budgetCopy(projected, budget, symbol, true)}</p>}
      {showCopy && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {fmt(projected, symbol)} planned{budget > 0 ? ` of ${fmt(budget, symbol)}` : ""}{paid > 0 ? ` · ${fmt(paid, symbol)} paid` : ""}
        </p>
      )}
    </div>
  );
}
