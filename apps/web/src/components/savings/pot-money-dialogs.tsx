"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMoneyToPot, transferBetweenPots, withdrawFromPot, type CurrencyAvailability, type PotMoveOptions } from "@/actions/savings";
import { monthYearFromDateStr } from "@/components/shared/budget-period-override";
import { EntryDate, useLastUsedDate } from "@/components/shared/entry-date";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { rememberEntryDate } from "@/lib/day-strip";
import { cn } from "@/lib/utils";
import { fmt, baseCurrencyOf, CurrencyPicker, type SavingsPot, type CurrencyLite } from "./savings-utils";

export interface PotMoneyTarget { kind: "add" | "correct"; potId: string }

interface Shared {
  pots: SavingsPot[];
  currencies: CurrencyLite[];
  currentPeriod: { month: number; year: number };
}

/** The single "Add money" / "Correct balance" dialog pair used by the pots tab and the emergency fund tab. */
export function PotMoneyDialogs({ target, onClose, pots, currencies, currentPeriod, totalIncome, incomeAvailability }: Shared & {
  target: PotMoneyTarget | null;
  onClose: () => void;
  totalIncome: number;
  incomeAvailability: CurrencyAvailability[];
}) {
  const pot = target ? pots.find((p) => p.id === target.potId) ?? null : null;
  return (
    <Dialog open={!!target && !!pot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {target && pot && (target.kind === "add"
          ? <AddMoneyForm key={pot.id} pot={pot} pots={pots} currencies={currencies} currentPeriod={currentPeriod}
              totalIncome={totalIncome} incomeAvailability={incomeAvailability} onClose={onClose} />
          : <CorrectForm key={pot.id} pot={pot} pots={pots} currencies={currencies} currentPeriod={currentPeriod} onClose={onClose} />)}
      </DialogContent>
    </Dialog>
  );
}

type SourceType = "income" | "pot" | "manual";

function moveOpts(date: string, fileUnderDate: boolean): PotMoveOptions {
  const o = fileUnderDate ? monthYearFromDateStr(date) : null;
  return { date, ...(o ? { budgetMonth: o.month, budgetYear: o.year } : {}) };
}

function AddMoneyForm({ pot, pots, currencies, currentPeriod, totalIncome, incomeAvailability, onClose }: Shared & {
  pot: SavingsPot; totalIncome: number; incomeAvailability: CurrencyAvailability[]; onClose: () => void;
}) {
  const base = baseCurrencyOf(currencies);
  const lastUsedDate = useLastUsedDate();
  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState(base.id);
  const [sourceType, setSourceType] = useState<SourceType>("income");
  const [sourcePotId, setSourcePotId] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [fileUnderDate, setFileUnderDate] = useState(false);
  const [pending, setPending] = useState(false);

  const otherPots = pots.filter((p) => p.id !== pot.id);
  const available = incomeAvailability.find((c) => c.currencyId === currencyId);
  const n = parseMoney(amount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!n || pending || (sourceType === "pot" && !sourcePotId)) return;
    setPending(true);
    const opts = moveOpts(date, fileUnderDate);
    const result = sourceType === "pot"
      ? await transferBetweenPots(sourcePotId, pot.id, n, currencyId, opts)
      : await addMoneyToPot(pot.id, n, currencyId, "From income", sourceType === "manual" ? "MANUAL" : "INCOME", opts);
    if (result.success) {
      toast.success("Money added!");
      rememberEntryDate(date, new Date());
      onClose();
    } else {
      toast.error(result.error ?? "Failed");
      setPending(false);
    }
  }

  const sourceBtn = (src: SourceType, label: string, disabled = false) => (
    <button key={src} type="button" onClick={() => setSourceType(src)} disabled={disabled}
      className={cn("flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-colors",
        sourceType === src ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary",
        disabled && "opacity-50 cursor-not-allowed")}>{label}</button>
  );

  return (
    <>
      <DialogHeader><DialogTitle>Add Money - {pot.name}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Amount</Label>
          <MoneyInput autoFocus placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg" />
        </div>
        <EntryDate
          date={date}
          onDateChange={setDate}
          homePeriod={currentPeriod}
          checked={fileUnderDate}
          onCheckedChange={setFileUnderDate}
          lastUsed={lastUsedDate}
        />
        <div className="space-y-2">
          <Label>Source</Label>
          <div className="flex gap-2">
            {sourceBtn("income", "Monthly income")}
            {sourceBtn("pot", "Transfer from pot", otherPots.length === 0)}
            {sourceBtn("manual", "Manual")}
          </div>
          {sourceType === "manual" && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Use for corrections (e.g. re-adding after an over-deduction) or money from outside your tracked income. No income validation applied.
            </div>
          )}
          {sourceType === "income" && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs space-y-0.5">
              {currencyId !== base.id ? (
                <div className={cn("flex justify-between font-semibold", (available?.available ?? 0) > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>
                  <span>Available from income</span><span>{available?.symbol} {fmt(available?.available ?? 0)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                    <span>This month&apos;s income</span><span className="font-semibold">{base.symbol} {fmt(totalIncome)}</span>
                  </div>
                  <div className={cn("flex justify-between font-semibold", (available?.available ?? 0) > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>
                    <span>Available from income</span><span>{base.symbol} {fmt(available?.available ?? 0)}</span>
                  </div>
                </>
              )}
            </div>
          )}
          {sourceType === "pot" && (
            <select value={sourcePotId} onChange={(e) => setSourcePotId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm">
              <option value="">Select a pot…</option>
              {otherPots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.balances.length === 0 ? `${base.symbol} 0` : p.balances.map((b) => `${b.currency.symbol}${fmt(b.amount)}`).join(" / ")}
                </option>
              ))}
            </select>
          )}
        </div>
        {currencies.length > 1 && (
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <CurrencyPicker currencies={currencies} value={currencyId} onChange={setCurrencyId} />
          </div>
        )}
        <Button type="submit" className="w-full" disabled={pending || !n || (sourceType === "pot" && !sourcePotId)}>
          {pending ? "Adding…" : "Add Money"}
        </Button>
      </form>
    </>
  );
}

function CorrectForm({ pot, currencies, currentPeriod, onClose }: Shared & { pot: SavingsPot; onClose: () => void }) {
  const base = baseCurrencyOf(currencies);
  const lastUsedDate = useLastUsedDate();
  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState(base.id);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [fileUnderDate, setFileUnderDate] = useState(false);
  const [pending, setPending] = useState(false);
  const n = parseMoney(amount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!n || pending) return;
    setPending(true);
    const result = await withdrawFromPot(pot.id, n, currencyId, note || "Balance correction", moveOpts(date, fileUnderDate));
    if (result.success) {
      toast.success("Balance corrected");
      rememberEntryDate(date, new Date());
      onClose();
    } else {
      toast.error(result.error ?? "Failed");
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader><DialogTitle>Correct Balance - {pot.name}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs space-y-0.5">
          {pot.balances.map((b) => (
            <div key={b.currency.id} className="flex justify-between text-foreground">
              <span>Current {b.currency.code} balance</span><span className="font-semibold">{b.currency.symbol} {fmt(b.amount)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Amount to remove</Label>
          <MoneyInput autoFocus placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg" />
        </div>
        <EntryDate
          date={date}
          onDateChange={setDate}
          homePeriod={currentPeriod}
          checked={fileUnderDate}
          onCheckedChange={setFileUnderDate}
          lastUsed={lastUsedDate}
        />
        {currencies.length > 1 && (
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <CurrencyPicker currencies={currencies} value={currencyId} onChange={setCurrencyId} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Note <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
          <Input placeholder="e.g. Spent on car repair, balance error fix…" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button type="submit" variant="destructive" className="w-full" disabled={pending || !n}>
          <Minus className="h-4 w-4 mr-2" />{pending ? "Removing…" : "Remove Amount"}
        </Button>
      </form>
    </>
  );
}
