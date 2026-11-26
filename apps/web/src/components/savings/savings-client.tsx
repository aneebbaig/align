"use client";

import { useState } from "react";
import { Plus, Minus, PiggyBank, Wallet2, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createSavingsPot, deleteSavingsPot, type CurrencyAvailability } from "@/actions/savings";
import { updateCurrency } from "@/actions/currencies";
import { cn } from "@/lib/utils";
import { fmt, potTotalBase, baseCurrencyOf, type SavingsPot, type CurrencyLite } from "./savings-utils";
import { PotMoneyDialogs, type PotMoneyTarget } from "./pot-money-dialogs";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { useAddShortcut } from "@/lib/use-add-shortcut";
import { FundTab } from "./fund-tab";
import { PageHeader } from "@/components/shared/page-header";

interface MonthSaving { label: string; key: string; income: number; expenses: number; surplus: number; cumulative: number; }
interface CumulativeSavings { totalAccumulated: number; months: MonthSaving[]; }

interface Props {
  pots: SavingsPot[];
  currencies: CurrencyLite[];
  cumulativeSavings: CumulativeSavings;
  avgMonthlyExpenses: number;
  emergencyFundMonths: number;
  totalIncome: number;
  readyToAssign: number;
  incomeAvailability: CurrencyAvailability[];
  liquidAvailable: number;
  currentPeriod: { month: number; year: number };
}

function ExchangeRatesBanner({ currencies: initial }: { currencies: CurrencyLite[] }) {
  const [currencies, setCurrencies] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const base = baseCurrencyOf(currencies);
  const others = currencies.filter((c) => !c.isBase);
  if (others.length === 0) return null;

  async function save(id: string) {
    const val = parseFloat(draft);
    if (!val || val <= 0) return;
    setSaving(true);
    const res = await updateCurrency(id, { rateToBase: val });
    setSaving(false);
    if (res.success) {
      setCurrencies((prev) => prev.map((c) => (c.id === id ? { ...c, rateToBase: val } : c)));
      setEditingId(null);
      toast.success("Exchange rate updated");
    } else toast.error(res.error ?? "Failed");
  }

  return (
    <div className="flex flex-col gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
      {others.map((c) => (
        <div key={c.id} className="flex items-center gap-3">
          <div className="flex-1 text-sm text-blue-700 dark:text-blue-300">
            <span className="font-semibold">1 {c.code}</span> = <span className="font-bold">{base.symbol} {c.rateToBase.toLocaleString()}</span>
          </div>
          {editingId === c.id ? (
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); save(c.id); }}>
              <input autoFocus type="number" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-blue-900 text-sm text-blue-800 dark:text-blue-200 focus:outline-none" />
              <Button type="submit" size="sm" disabled={saving}>{saving ? "..." : "Save"}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            </form>
          ) : (
            <Button size="sm" variant="ghost" className="text-blue-600 dark:text-blue-400 h-7 px-2"
              onClick={() => { setDraft(String(c.rateToBase)); setEditingId(c.id); }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Update
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function PotCard({ pot, base, onAdd, onCorrect, onDelete }: {
  pot: SavingsPot; base: CurrencyLite;
  onAdd: () => void; onCorrect: () => void; onDelete: () => void;
}) {
  const totalPotBase = potTotalBase(pot);
  const pct = pot.targetAmount > 0 ? Math.round((totalPotBase / pot.targetAmount) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: pot.color }}>
          <PiggyBank className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{pot.name}</div>
          <div className="text-xs text-muted-foreground">{pot.type}</div>
        </div>
      </div>
      <div className="mb-2">
        {pot.balances.length === 0 && <div className="text-xl font-bold text-muted-foreground">{base.symbol} 0</div>}
        {pot.balances.map((b) => (
          <div key={b.currency.id} className={cn("text-xl font-bold", b.currency.isBase ? "text-foreground" : "text-blue-600 dark:text-blue-400")}>
            {b.currency.symbol} {fmt(b.amount)}
          </div>
        ))}
        {pot.balances.length > 1 && <div className="text-xs text-muted-foreground font-medium mt-0.5">Total ≈ {base.symbol} {fmt(totalPotBase)}</div>}
      </div>
      {pot.targetAmount > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{pct}% of {base.symbol} {fmt(pot.targetAmount)} goal</span>
            {pot.targetDate && <span>by {new Date(pot.targetDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>}
          </div>
          <Progress value={Math.min(pct, 100)} className="h-2 mb-3" />
        </>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add
        </Button>
        <Button size="sm" variant="outline" onClick={onCorrect}>
          <Minus className="h-3.5 w-3.5 mr-1" />Correct
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={onDelete}>✕</Button>
      </div>
    </div>
  );
}

export function SavingsClient({ pots, currencies, cumulativeSavings, avgMonthlyExpenses, emergencyFundMonths, totalIncome, readyToAssign, incomeAvailability, liquidAvailable, currentPeriod }: Props) {
  const base = baseCurrencyOf(currencies);
  const [moneyDialog, setMoneyDialog] = useState<PotMoneyTarget | null>(null);
  const [newPotOpen, setNewPotOpen] = useState(false);
  const [newPot, setNewPot] = useState({ name: "", targetAmount: "", targetDate: "", color: "#3b82f6" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const regularPots = pots.filter((p) => p.type !== "EMERGENCY");

  const totalAllPotsBase = pots.reduce((s, p) => s + potTotalBase(p), 0);
  const regularTotalBase = regularPots.reduce((s, p) => s + potTotalBase(p), 0);

  const emergencyPots = pots.filter((p) => p.type === "EMERGENCY");
  const emergencyTotalBase = emergencyPots.reduce((s, p) => s + potTotalBase(p), 0);
  const efMonthsCovered = avgMonthlyExpenses > 0 ? emergencyTotalBase / avgMonthlyExpenses : 0;
  const efTarget = avgMonthlyExpenses * emergencyFundMonths;
  const efPct = efTarget > 0 ? Math.min(100, Math.round((emergencyTotalBase / efTarget) * 100)) : 0;
  const efStatus: "critical" | "low" | "ok" | "safe" =
    efMonthsCovered < 3 ? "critical" :
    efMonthsCovered < emergencyFundMonths * 0.5 ? "low" :
    efMonthsCovered < emergencyFundMonths ? "ok" : "safe";

  const { months } = cumulativeSavings;

  // N: add money to the first pot (regular pots first), or start a new pot when there are none.
  const firstPotId = (regularPots[0] ?? pots[0])?.id;
  const addFromShortcut = () => {
    if (firstPotId) setMoneyDialog({ kind: "add", potId: firstPotId });
    else setNewPotOpen(true);
  };
  useAddShortcut(!!moneyDialog || newPotOpen, addFromShortcut);

  async function handleCreatePot(e: React.FormEvent) {
    e.preventDefault();
    if (!newPot.name.trim() || loading) return;
    setLoading(true);
    const target = parseMoney(newPot.targetAmount) ?? 0;
    const result = await createSavingsPot({
      name: newPot.name,
      icon: "PiggyBank",
      color: newPot.color,
      targetAmount: target,
      // A pot with a target is a savings goal; type follows the target.
      type: target > 0 ? "GOAL" : "GENERAL",
      targetDate: newPot.targetDate || undefined,
    });
    if (result.success) { toast.success("Pot created!"); setNewPotOpen(false); setNewPot({ name: "", targetAmount: "", targetDate: "", color: "#3b82f6" }); }
    else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  return (
    <>
    <PageHeader section="Savings & Wealth" title="Savings" />
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="emergency">Emergency Fund</TabsTrigger>
        <TabsTrigger value="pots">Savings Pots</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 space-y-4">
        <ExchangeRatesBanner currencies={currencies} />

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Total in all pots</span>
            <div className="p-2 rounded-lg bg-muted text-primary"><PiggyBank className="h-4 w-4" /></div>
          </div>
          <div className="text-3xl font-bold text-foreground">{base.symbol} {fmt(totalAllPotsBase)}</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Emergency", value: `${base.symbol} ${fmt(emergencyTotalBase)}` },
              { label: "Savings", value: `${base.symbol} ${fmt(regularTotalBase)}` },
              { label: "Leftover", value: `${base.symbol} ${fmt(Math.max(0, liquidAvailable))}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                <div className="text-sm font-bold text-foreground">{value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Leftover is cash on hand not sitting in any pot - what used to be a "Liquid Savings" pot, now always live.
          </p>
        </div>

        {emergencyPots.length > 0 && avgMonthlyExpenses > 0 && (
          <div className={cn("rounded-xl border p-4", {
            "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800": efStatus === "critical",
            "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800": efStatus === "low",
            "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800": efStatus === "ok",
            "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800": efStatus === "safe",
          })}>
            <div className="flex items-center gap-3">
              {efStatus === "safe" || efStatus === "ok"
                ? <ShieldCheck className={cn("h-5 w-5 shrink-0", efStatus === "safe" ? "text-emerald-600" : "text-blue-600")} />
                : <AlertTriangle className={cn("h-5 w-5 shrink-0", efStatus === "critical" ? "text-red-600" : "text-amber-600")} />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">Emergency Fund</div>
                <div className="text-xs text-muted-foreground">{efMonthsCovered.toFixed(1)} of {emergencyFundMonths} months · {efPct}% funded</div>
              </div>
              <div className={cn("text-lg font-bold shrink-0", {
                "text-red-600": efStatus === "critical", "text-amber-600": efStatus === "low",
                "text-blue-600": efStatus === "ok", "text-emerald-600": efStatus === "safe",
              })}>{efPct}%</div>
            </div>
            <div className="mt-2 w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div className={cn("h-2 rounded-full transition-all", {
                "bg-red-500": efStatus === "critical", "bg-amber-500": efStatus === "low",
                "bg-blue-500": efStatus === "ok", "bg-emerald-500": efStatus === "safe",
              })} style={{ width: `${efPct}%` }} />
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">This month</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950 rounded-xl p-3">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-0.5">Income</div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{base.symbol} {fmt(totalIncome)}</div>
            </div>
            <div className={cn("rounded-xl p-3", readyToAssign >= 0 ? "bg-emerald-50 dark:bg-emerald-950" : "bg-red-50 dark:bg-red-950")}>
              <div className={cn("text-xs mb-0.5", readyToAssign >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>Ready to assign</div>
              <div className={cn("text-xl font-bold", readyToAssign >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>{base.symbol} {fmt(readyToAssign)}</div>
            </div>
          </div>
        </div>

        {months.length === 0 ? (
          <EmptyState icon={Wallet2} title="No transaction history" description="Add income and expenses to see your monthly trend." />
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Recent months</div>
            {[...months].reverse().slice(0, 3).map((m) => (
              <div key={m.key} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{m.label}</div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs text-emerald-600">+{base.symbol} {fmt(m.income)}</span>
                    <span className="text-xs text-red-500">-{base.symbol} {fmt(m.expenses)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-sm font-bold", m.surplus >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {m.surplus >= 0 ? "+" : ""}{base.symbol} {fmt(m.surplus)}
                  </div>
                  <div className="text-xs text-muted-foreground">saved</div>
                </div>
              </div>
            ))}
            {months.length > 3 && <p className="text-xs text-center text-muted-foreground pt-1">{months.length - 3} older months not shown</p>}
          </div>
        )}
      </TabsContent>

      <TabsContent value="emergency" className="mt-4">
        <FundTab pots={pots} currencies={currencies}
          avgMonthlyExpenses={avgMonthlyExpenses} emergencyFundMonths={emergencyFundMonths}
          onAdd={(potId) => setMoneyDialog({ kind: "add", potId })}
          onCorrect={(potId) => setMoneyDialog({ kind: "correct", potId })}
          onDelete={setDeleteId} />
      </TabsContent>

      <TabsContent value="pots" className="mt-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <div className="text-xs text-muted-foreground">Total in savings pots ({base.code} eq.)</div>
            <div className="text-2xl font-bold text-foreground">{base.symbol} {fmt(regularTotalBase)}</div>
          </div>
          <Button onClick={() => setNewPotOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Pot
          </Button>
        </div>

        {regularPots.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No savings pots"
            description="Create pots for goals or any savings bucket. Emergency Fund is on its own tab."
            action={{ label: "Create a pot", onClick: () => setNewPotOpen(true) }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regularPots.map((pot) => (
              <PotCard key={pot.id} pot={pot} base={base}
                onAdd={() => setMoneyDialog({ kind: "add", potId: pot.id })}
                onCorrect={() => setMoneyDialog({ kind: "correct", potId: pot.id })}
                onDelete={() => setDeleteId(pot.id)} />
            ))}
          </div>
        )}
      </TabsContent>

      <PotMoneyDialogs target={moneyDialog} onClose={() => setMoneyDialog(null)} pots={pots} currencies={currencies}
        currentPeriod={currentPeriod} totalIncome={totalIncome} incomeAvailability={incomeAvailability} />

      <Dialog open={newPotOpen} onOpenChange={setNewPotOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Savings Pot</DialogTitle></DialogHeader>
          <form onSubmit={handleCreatePot} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input autoFocus value={newPot.name} onChange={(e) => setNewPot((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Holiday, New Car, MacBook…" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount ({base.code}) <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
              <MoneyInput value={newPot.targetAmount} onChange={(e) => setNewPot((p) => ({ ...p, targetAmount: e.target.value }))} placeholder="0" />
              <p className="text-xs text-muted-foreground">Target in {base.code}. You can add balances in any configured currency after creating.</p>
            </div>
            {(parseMoney(newPot.targetAmount) ?? 0) > 0 && (
              <div className="space-y-1.5">
                <Label>Target Date <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
                <Input type="date" value={newPot.targetDate} onChange={(e) => setNewPot((p) => ({ ...p, targetDate: e.target.value }))} />
                <p className="text-xs text-muted-foreground">A deadline for this savings goal.</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Label>Color</Label>
              <input type="color" value={newPot.color} onChange={(e) => setNewPot((p) => ({ ...p, color: e.target.value }))} className="w-10 h-8 rounded cursor-pointer border border-border" />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !newPot.name.trim()}>
              {loading ? "Creating..." : "Create Pot"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete pot?" description="All history will be permanently deleted."
        onConfirm={async () => {
          const result = await deleteSavingsPot(deleteId!);
          if (result.success) toast.success("Deleted");
          else toast.error(result.error ?? "Failed");
          setDeleteId(null);
        }} />
    </Tabs>
    </>
  );
}
