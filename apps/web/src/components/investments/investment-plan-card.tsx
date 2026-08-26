"use client";

import { useState } from "react";
import { Target, Plus, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  upsertInvestmentPlan,
  type InvestmentPlanCategoryInput,
  type InvestmentSuggestion,
} from "@/actions/savings";
import { cn } from "@/lib/utils";

const INVESTMENT_TYPES = [
  { value: "MUTUAL_FUND", label: "Mutual Fund" },
  { value: "STOCKS", label: "Stocks" },
  { value: "GOLD", label: "Gold" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
  { value: "OTHER", label: "Other" },
];

interface PlanCategory {
  id?: string;
  name: string;
  investmentType: string;
  percentage: string;
}

interface Plan {
  monthlyTarget: number;
  autoFromSurplus: boolean;
  categories: { id: string; name: string; investmentType: string | null; percentage: number }[];
}

const fmt = (n: number) => n.toLocaleString();

// Stepped opacity so the shared `primary` hue reads as one deliberate family
// across allocation segments, instead of a rainbow of competing colors.
const segOpacity = (i: number) => Math.max(0.28, 1 - i * 0.22);

function blankCategories(): PlanCategory[] {
  return [
    { name: "Money-market buffer", investmentType: "FIXED_DEPOSIT", percentage: "25" },
    { name: "Equity fund", investmentType: "MUTUAL_FUND", percentage: "40" },
    { name: "Gold", investmentType: "GOLD", percentage: "15" },
    { name: "Direct stocks", investmentType: "STOCKS", percentage: "20" },
  ];
}

export function InvestmentPlanCard({
  plan,
  suggestion,
  baseSymbol = "Rs",
}: {
  plan: Plan | null;
  suggestion: InvestmentSuggestion;
  baseSymbol?: string;
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoFromSurplus, setAutoFromSurplus] = useState(plan?.autoFromSurplus ?? true);
  const [monthlyTarget, setMonthlyTarget] = useState(plan ? String(plan.monthlyTarget / 100) : "");
  const [categories, setCategories] = useState<PlanCategory[]>(
    plan && plan.categories.length > 0
      ? plan.categories.map((c) => ({ id: c.id, name: c.name, investmentType: c.investmentType ?? "OTHER", percentage: String(c.percentage) }))
      : blankCategories(),
  );

  const pctTotal = categories.reduce((s, c) => s + (parseFloat(c.percentage) || 0), 0);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);

  function updateCategory(i: number, patch: Partial<PlanCategory>) {
    setCategories((cats) => cats.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addCategory() {
    setCategories((cats) => [...cats, { name: "", investmentType: "OTHER", percentage: "0" }]);
  }

  // A category with money already logged against it (matched by id in the
  // live suggestion) needs a confirm before its SIP + history get cascaded
  // away on save - everything else removes immediately.
  function removeCategory(i: number) {
    const cat = categories[i];
    const funded = cat.id && suggestion.categories.find((c) => c.id === cat.id)?.actualAmount;
    if (funded) { setRemoveConfirmIndex(i); return; }
    setCategories((cats) => cats.filter((_, idx) => idx !== i));
  }

  function confirmRemove() {
    if (removeConfirmIndex == null) return;
    setCategories((cats) => cats.filter((_, idx) => idx !== removeConfirmIndex));
    setRemoveConfirmIndex(null);
  }

  async function handleSave() {
    setLoading(true);
    const payload: InvestmentPlanCategoryInput[] = categories
      .filter((c) => c.name.trim())
      .map((c) => ({ id: c.id, name: c.name, investmentType: c.investmentType, percentage: parseFloat(c.percentage) || 0 }));
    const result = await upsertInvestmentPlan({
      monthlyTarget: monthlyTarget ? parseFloat(monthlyTarget) : 0,
      autoFromSurplus,
      categories: payload,
    });
    if (result.success) {
      toast.success("Investment plan saved");
      setConfigOpen(false);
    } else toast.error(result.error ?? "Failed to save plan");
    setLoading(false);
  }

  return (
    <>
      {/* Dashed border = projected/target, distinct from the solid-bordered "actual" cards below it. */}
      <div className="rounded-xl border border-dashed border-border bg-background p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Investment Plan</h3>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Target</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" />
            {suggestion.hasPlan ? "Edit" : "Set up"}
          </Button>
        </div>

        {!suggestion.hasPlan ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Set a monthly contribution split (money-market buffer, equity, gold, direct stocks) to get a suggested
            amount each pay cycle and track planned vs. actual per category.
          </p>
        ) : (
          <div className="space-y-5">
            {/* Hero — the one number worth acting on this cycle */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Suggested to invest this cycle</p>
              <p className="text-3xl font-bold tabnum text-emerald-500 mt-1">{baseSymbol} {fmt(suggestion.suggestedTotal / 100)}</p>
              <p className="text-xs text-muted-foreground tabnum mt-1.5">
                {baseSymbol} {fmt(suggestion.monthlyIncome / 100)} income − {baseSymbol} {fmt(suggestion.obligationsDue / 100)} obligations
                {suggestion.bufferUnmet > 0 && <> − {baseSymbol} {fmt(suggestion.bufferUnmet / 100)} buffer</>}
              </p>
            </div>

            {/* Target allocation — one thin segmented bar + a readout, not four stretched bars */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Target allocation</span>
                {plan && plan.monthlyTarget > 0 && (
                  <span className="text-[11px] text-muted-foreground tabnum">{baseSymbol} {fmt(plan.monthlyTarget / 100)}/mo</span>
                )}
              </div>

              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                {suggestion.categories.map((c, i) => (
                  <div key={c.id} style={{ width: `${c.percentage}%`, backgroundColor: "var(--primary)", opacity: segOpacity(i) }} />
                ))}
              </div>

              <div className="space-y-2.5 pt-0.5">
                {suggestion.categories.map((c, i) => {
                  const done = c.plannedAmount > 0 && c.actualAmount >= c.plannedAmount;
                  return (
                    <div key={c.id} className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: "var(--primary)", opacity: segOpacity(i) }} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground" title={c.name}>{c.name}</span>
                      <span className="shrink-0 text-[11px] tabnum text-muted-foreground">{c.percentage}%</span>
                      <span className="shrink-0 text-[11px] tabnum text-right w-28">
                        <span className={cn(done ? "text-emerald-500 font-medium" : "text-foreground")}>{baseSymbol} {fmt(c.actualAmount / 100)}</span>
                        <span className="text-muted-foreground/50"> / {fmt(c.plannedAmount / 100)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Investment Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-suggest from surplus</Label>
                <p className="text-xs text-muted-foreground">Income − obligations − unmet buffer</p>
              </div>
              <Switch checked={autoFromSurplus} onCheckedChange={setAutoFromSurplus} />
            </div>

            {!autoFromSurplus && (
              <div>
                <Label>Explicit monthly target ({baseSymbol})</Label>
                <Input type="number" value={monthlyTarget} onChange={(e) => setMonthlyTarget(e.target.value)} placeholder="0" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Category split</Label>
                <span className={cn("text-xs", Math.round(pctTotal) === 100 ? "text-muted-foreground" : "text-amber-500")}>
                  {pctTotal}% of 100% {Math.round(pctTotal) !== 100 && "(FYI only, not enforced)"}
                </span>
              </div>
              {categories.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Category name"
                    value={c.name}
                    onChange={(e) => updateCategory(i, { name: e.target.value })}
                    className="flex-[2]"
                  />
                  <select
                    value={c.investmentType}
                    onChange={(e) => updateCategory(i, { investmentType: e.target.value })}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {INVESTMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <Input
                    type="number"
                    value={c.percentage}
                    onChange={(e) => updateCategory(i, { percentage: e.target.value })}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button variant="ghost" size="icon" onClick={() => removeCategory(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCategory}>
                <Plus className="h-3.5 w-3.5" />
                Add category
              </Button>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full">
              Save Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeConfirmIndex != null}
        onOpenChange={(o) => !o && setRemoveConfirmIndex(null)}
        title="Remove this investment from the plan?"
        description="It already has money logged against it - removing it on save also clears its SIP and full contribution history."
        onConfirm={confirmRemove}
      />
    </>
  );
}
