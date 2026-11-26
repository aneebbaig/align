"use client";

import { useState } from "react";
import { Plus, Minus, PiggyBank, RefreshCw } from "lucide-react";
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

interface Props {
  pots: SavingsPot[];
  currencies: CurrencyLite[];
  avgMonthlyExpenses: number;
  emergencyFundMonths: number;
  totalIncome: number;
  incomeAvailability: CurrencyAvailability[];
  currentPeriod: { month: number; year: number };
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

export function SavingsClient({ pots, currencies, avgMonthlyExpenses, emergencyFundMonths, totalIncome, incomeAvailability, currentPeriod }: Props) {
  const base = baseCurrencyOf(currencies);
  const [moneyDialog, setMoneyDialog] = useState<PotMoneyTarget | null>(null);
  const [newPotOpen, setNewPotOpen] = useState(false);
  const [newPot, setNewPot] = useState({ name: "", targetAmount: "", targetDate: "", color: "#3b82f6" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const regularPots = pots.filter((p) => p.type !== "EMERGENCY");

  const regularTotalBase = regularPots.reduce((s, p) => s + potTotalBase(p), 0);

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
    <Tabs defaultValue="emergency">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="emergency">Emergency Fund</TabsTrigger>
        <TabsTrigger value="pots">Savings Pots</TabsTrigger>
      </TabsList>

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
