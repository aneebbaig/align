"use client";

import { useState } from "react";
import { Plus, Minus, ShieldCheck, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSavingsPot } from "@/actions/savings";
import { updateEmergencyFundMonths } from "@/actions/settings";
import { cn } from "@/lib/utils";
import { fmt, potTotalBase, baseCurrencyOf, type SavingsPot, type CurrencyLite } from "./savings-utils";

interface FundTabProps {
  pots: SavingsPot[];
  currencies: CurrencyLite[];
  avgMonthlyExpenses: number;
  emergencyFundMonths: number;
  onAdd: (potId: string) => void;
  onCorrect: (potId: string) => void;
  onDelete: (id: string) => void;
}

export function FundTab({
  pots, currencies,
  avgMonthlyExpenses, emergencyFundMonths,
  onAdd, onCorrect, onDelete,
}: FundTabProps) {
  const base = baseCurrencyOf(currencies);
  const [months, setMonths] = useState(emergencyFundMonths);
  const [editingMonths, setEditingMonths] = useState(false);
  const [savingMonths, setSavingMonths] = useState(false);
  const [creatingPot, setCreatingPot] = useState(false);

  const fundPots = pots.filter((p) => p.type === "EMERGENCY");
  const totalBase = fundPots.reduce((s, p) => s + potTotalBase(p), 0);

  const targetAmount = avgMonthlyExpenses * months;
  const monthsCovered = avgMonthlyExpenses > 0 ? totalBase / avgMonthlyExpenses : 0;
  const pct = targetAmount > 0 ? Math.min(100, (totalBase / targetAmount) * 100) : 0;

  let status: "critical" | "low" | "ok" | "safe" = "safe";
  if (monthsCovered < 3) status = "critical";
  else if (monthsCovered < months * 0.5) status = "low";
  else if (monthsCovered < months) status = "ok";
  else status = "safe";


  async function handleSaveMonths(newMonths: number) {
    setSavingMonths(true);
    const result = await updateEmergencyFundMonths(newMonths);
    setSavingMonths(false);
    if (result.success) { setMonths(newMonths); setEditingMonths(false); toast.success("Target updated"); }
    else toast.error("Failed to update");
  }

  async function handleCreatePot() {
    setCreatingPot(true);
    const result = await createSavingsPot({
      name: "Emergency Fund",
      icon: "Shield",
      color: "#10b981",
      targetAmount: 0,
      type: "EMERGENCY",
    });
    setCreatingPot(false);
    if (result.success) toast.success("Emergency Fund pot created!");
    else toast.error(result.error ?? "Failed");
  }

  if (avgMonthlyExpenses === 0) {
    return (
      <div className="bg-muted/40 border border-border rounded-xl p-6 text-center space-y-2">
        <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium text-foreground">No expense data yet</p>
        <p className="text-xs text-muted-foreground">Add expense transactions to calculate your emergency fund target.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn(
        "rounded-xl border p-5 space-y-4",
        status === "critical" ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" :
        status === "low" ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" :
        status === "ok" ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" :
        "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"
      )}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {status === "safe" || status === "ok"
              ? <ShieldCheck className={cn("h-5 w-5", status === "safe" ? "text-emerald-600" : "text-blue-600")} />
              : <AlertTriangle className={cn("h-5 w-5", status === "critical" ? "text-red-600" : "text-amber-600")} />}
            <span className="font-semibold text-foreground">Emergency Fund</span>
          </div>
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full bg-white/60 dark:bg-black/20",
            status === "critical" ? "text-red-600" : status === "low" ? "text-amber-600" :
            status === "ok" ? "text-blue-600" : "text-emerald-600"
          )}>
            {status === "critical" ? "Critical - under 3 months" :
             status === "low" ? `Low - building toward ${months} months` :
             status === "ok" ? "Building - almost there" : `Safe - ${months}+ months covered`}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-foreground text-lg">{monthsCovered.toFixed(1)} months covered</span>
            <span className="text-muted-foreground">Goal: {months} months</span>
          </div>
          <div className="w-full bg-white/60 dark:bg-black/20 rounded-full h-4 overflow-hidden">
            <div className={cn("h-4 rounded-full transition-all",
              status === "critical" ? "bg-red-500" : status === "low" ? "bg-amber-500" :
              status === "ok" ? "bg-blue-500" : "bg-emerald-500"
            )} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{base.symbol} {fmt(totalBase)} total ({base.code} eq.)</span>
            <span>{base.symbol} {fmt(targetAmount)} needed</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Monthly avg", value: `${base.symbol} ${fmt(avgMonthlyExpenses)}` },
            { label: `Target (${months} mo)`, value: `${base.symbol} ${fmt(targetAmount)}` },
            { label: "Still needed", value: totalBase >= targetAmount ? "✓ Done" : `${base.symbol} ${fmt(targetAmount - totalBase)}` },
          ].map(({ label: l, value }) => (
            <div key={l} className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">{l}</div>
              <div className="text-sm font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Target: {months} months of expenses</div>
          <div className="text-xs text-muted-foreground">Recommended: 3-6 months minimum, 9-12 for security</div>
        </div>
        {editingMonths ? (
          <div className="flex items-center gap-2">
            <Input type="number" min={1} max={24} defaultValue={months} className="w-20 h-8 text-sm" id="ef-months"
              onKeyDown={(e) => { if (e.key === "Enter") { const v = parseInt((e.target as HTMLInputElement).value); if (v >= 1 && v <= 24) handleSaveMonths(v); } }}
            />
            <Button size="sm" disabled={savingMonths} onClick={() => { const el = document.getElementById("ef-months") as HTMLInputElement; const v = parseInt(el?.value ?? "6"); if (v >= 1 && v <= 24) handleSaveMonths(v); }}>
              {savingMonths ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingMonths(false)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditingMonths(true)}>Change</Button>
        )}
      </div>

      {fundPots.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center space-y-3">
          <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">No emergency fund pot yet</p>
          <Button onClick={handleCreatePot} disabled={creatingPot}>{creatingPot ? "Setting up…" : "Set Up Emergency Fund"}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {fundPots.map((pot) => {
            const totalPotBase = potTotalBase(pot);
            return (
              <div key={pot.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">{pot.name}</div>
                    {pot.balances.length === 0 ? (
                      <div className="text-2xl font-bold text-muted-foreground">{base.symbol} 0</div>
                    ) : (
                      <>
                        {pot.balances.map((b) => (
                          <div key={b.currency.id} className="flex items-baseline gap-2 flex-wrap">
                            <span className={cn("text-2xl font-bold", b.currency.isBase ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400")}>
                              {b.currency.symbol} {fmt(b.amount)}
                            </span>
                          </div>
                        ))}
                        {pot.balances.length > 1 && (
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">Total ≈ {base.symbol} {fmt(totalPotBase)}</div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" onClick={() => onAdd(pot.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Add
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onCorrect(pot.id)}>
                      <Minus className="h-3.5 w-3.5 mr-1" />Correct
                    </Button>
                    <span className="text-xs text-muted-foreground">Spend → create expense, pick pot as source</span>
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => onDelete(pot.id)}>✕</Button>
                  </div>
                </div>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={handleCreatePot} disabled={creatingPot}>
            <Plus className="h-3.5 w-3.5 mr-1" />{creatingPot ? "Creating…" : "Add Another Emergency Fund Pot"}
          </Button>
        </div>
      )}
    </div>
  );
}
