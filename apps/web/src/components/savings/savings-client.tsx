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
import { addMoneyToPot, transferBetweenPots, withdrawFromPot, createSavingsPot, deleteSavingsPot, type CurrencyAvailability } from "@/actions/savings";
import { updateCurrency } from "@/actions/currencies";
import { cn } from "@/lib/utils";
import { fmt, potTotalBase, baseCurrencyOf, CurrencyPicker, type SavingsPot, type CurrencyLite } from "./savings-utils";
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
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)}
                className="w-24 px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-blue-900 text-sm text-blue-800 dark:text-blue-200 focus:outline-none" />
              <Button size="sm" disabled={saving} onClick={() => save(c.id)}>{saving ? "..." : "Save"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
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

export function SavingsClient({ pots, currencies, cumulativeSavings, avgMonthlyExpenses, emergencyFundMonths, totalIncome, readyToAssign, incomeAvailability, liquidAvailable }: Props) {
  const base = baseCurrencyOf(currencies);
  const [potDialog, setPotDialog] = useState<{ type: "add" | "correct" | "new" | null; potId?: string }>({ type: null });
  const [amount, setAmount] = useState("");
  const [potCurrencyId, setPotCurrencyId] = useState(base.id);
  const [potSourceType, setPotSourceType] = useState<"income" | "pot" | "manual">("income");
  const [potSourcePotId, setPotSourcePotId] = useState("");
  const [correctNote, setCorrectNote] = useState("");
  const [newPot, setNewPot] = useState({ name: "", targetAmount: "", targetDate: "", color: "#3b82f6", type: "GENERAL" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const regularPots = pots.filter((p) => p.type !== "EMERGENCY");
  const activePot = potDialog.potId ? pots.find((p) => p.id === potDialog.potId) : null;

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
  const availableForCurrency = incomeAvailability.find((c) => c.currencyId === potCurrencyId);

  async function handlePotAction() {
    if (!potDialog.potId || !amount) return;
    if (potSourceType === "pot" && !potSourcePotId) return;
    setLoading(true);
    const n = parseFloat(amount);
    const result = potSourceType === "pot"
      ? await transferBetweenPots(potSourcePotId, potDialog.potId, n, potCurrencyId)
      : await addMoneyToPot(potDialog.potId, n, potCurrencyId, "From income", potSourceType === "manual" ? "MANUAL" : "INCOME");
    if (result.success) {
      toast.success("Money added!");
      setPotDialog({ type: null }); setAmount(""); setPotCurrencyId(base.id); setPotSourceType("income"); setPotSourcePotId("");
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleCorrect() {
    if (!potDialog.potId || !amount) return;
    setLoading(true);
    const n = parseFloat(amount);
    const result = await withdrawFromPot(potDialog.potId, n, potCurrencyId, correctNote || "Balance correction");
    if (result.success) {
      toast.success("Balance corrected");
      setPotDialog({ type: null }); setAmount(""); setPotCurrencyId(base.id); setCorrectNote("");
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleCreatePot() {
    if (!newPot.name) return;
    setLoading(true);
    const target = parseFloat(newPot.targetAmount) || 0;
    const result = await createSavingsPot({
      name: newPot.name,
      icon: "PiggyBank",
      color: newPot.color,
      targetAmount: target,
      // A pot with a target is a savings goal; type follows the target.
      type: target > 0 ? "GOAL" : "GENERAL",
      targetDate: newPot.targetDate || undefined,
    });
    if (result.success) { toast.success("Pot created!"); setPotDialog({ type: null }); setNewPot({ name: "", targetAmount: "", targetDate: "", color: "#3b82f6", type: "GENERAL" }); }
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
          totalIncome={totalIncome}
          incomeAvailability={incomeAvailability}
          onDelete={setDeleteId} />
      </TabsContent>

      <TabsContent value="pots" className="mt-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <div className="text-xs text-muted-foreground">Total in savings pots ({base.code} eq.)</div>
            <div className="text-2xl font-bold text-foreground">{base.symbol} {fmt(regularTotalBase)}</div>
          </div>
          <Button onClick={() => setPotDialog({ type: "new" })}>
            <Plus className="h-4 w-4 mr-2" />New Pot
          </Button>
        </div>

        {regularPots.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No savings pots"
            description="Create pots for goals or any savings bucket. Emergency Fund is on its own tab."
            action={{ label: "Create a pot", onClick: () => setPotDialog({ type: "new" }) }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regularPots.map((pot) => (
              <PotCard key={pot.id} pot={pot} base={base}
                onAdd={() => { setPotDialog({ type: "add", potId: pot.id }); setAmount(""); setPotCurrencyId(base.id); setPotSourceType("income"); setPotSourcePotId(""); }}
                onCorrect={() => { setPotDialog({ type: "correct", potId: pot.id }); setAmount(""); setPotCurrencyId(base.id); setCorrectNote(""); }}
                onDelete={() => setDeleteId(pot.id)} />
            ))}
          </div>
        )}
      </TabsContent>

      <Dialog open={potDialog.type === "add"} onOpenChange={(o) => !o && setPotDialog({ type: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Money - {activePot?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <div className="flex gap-2">
                {(["income", "pot", "manual"] as const).map((src) => (
                  <button key={src} type="button" onClick={() => setPotSourceType(src)}
                    disabled={src === "pot" && pots.filter((p) => p.id !== activePot?.id).length === 0}
                    className={cn("flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-colors",
                      potSourceType === src ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary",
                      src === "pot" && pots.filter((p) => p.id !== activePot?.id).length === 0 && "opacity-50 cursor-not-allowed"
                    )}>{src === "income" ? "Monthly income" : src === "pot" ? "Transfer from pot" : "Manual"}</button>
                ))}
              </div>
              {potSourceType === "manual" && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Use for corrections (e.g. re-adding after an over-deduction) or money from outside your tracked income. No income validation applied.
                </div>
              )}
              {potSourceType === "income" && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs space-y-0.5">
                  {potCurrencyId !== base.id ? (
                    <div className={cn("flex justify-between font-semibold", (availableForCurrency?.available ?? 0) > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>
                      <span>Available from income</span><span>{availableForCurrency?.symbol} {fmt(availableForCurrency?.available ?? 0)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                        <span>This month&apos;s income</span><span className="font-semibold">{base.symbol} {fmt(totalIncome)}</span>
                      </div>
                      <div className={cn("flex justify-between font-semibold", (availableForCurrency?.available ?? 0) > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>
                        <span>Available from income</span><span>{base.symbol} {fmt(availableForCurrency?.available ?? 0)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              {potSourceType === "pot" && (
                <select value={potSourcePotId} onChange={(e) => setPotSourcePotId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option value="">Select a pot…</option>
                  {pots.filter((p) => p.id !== activePot?.id).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.balances.length === 0 ? `${base.symbol} 0` : p.balances.map((b) => `${b.currency.symbol}${fmt(b.amount)}`).join(" / ")}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencyPicker currencies={currencies} value={potCurrencyId} onChange={setPotCurrencyId} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" placeholder="Amount"
                value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg" />
            </div>
            <Button className="w-full" onClick={handlePotAction} disabled={loading || !amount || (potSourceType === "pot" && !potSourcePotId)}>
              Add Money
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={potDialog.type === "correct"} onOpenChange={(o) => !o && setPotDialog({ type: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Correct Balance - {activePot?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs space-y-0.5">
              {activePot?.balances.map((b) => (
                <div key={b.currency.id} className="flex justify-between text-foreground">
                  <span>Current {b.currency.code} balance</span><span className="font-semibold">{b.currency.symbol} {fmt(b.amount)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencyPicker currencies={currencies} value={potCurrencyId} onChange={setPotCurrencyId} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount to remove</Label>
              <Input type="number" placeholder="Amount"
                value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg" />
            </div>
            <div className="space-y-1.5">
              <Label>Note <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
              <Input placeholder="e.g. Spent on car repair, balance error fix…"
                value={correctNote} onChange={(e) => setCorrectNote(e.target.value)} />
            </div>
            <Button variant="destructive" className="w-full" onClick={handleCorrect} disabled={loading || !amount}>
              <Minus className="h-4 w-4 mr-2" />{loading ? "Removing…" : "Remove Amount"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={potDialog.type === "new"} onOpenChange={(o) => !o && setPotDialog({ type: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Savings Pot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newPot.name} onChange={(e) => setNewPot((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Holiday, New Car, MacBook…" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount ({base.code}) <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
              <Input type="number" value={newPot.targetAmount} onChange={(e) => setNewPot((p) => ({ ...p, targetAmount: e.target.value }))} placeholder="0" />
              <p className="text-xs text-muted-foreground">Target in {base.code}. You can add balances in any configured currency after creating.</p>
            </div>
            {(parseFloat(newPot.targetAmount) || 0) > 0 && (
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
            <Button className="w-full" onClick={handleCreatePot} disabled={loading || !newPot.name}>
              {loading ? "Creating..." : "Create Pot"}
            </Button>
          </div>
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
