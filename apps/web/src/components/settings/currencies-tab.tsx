"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCurrency, updateCurrency, setBaseCurrency, deleteCurrency } from "@/actions/currencies";
import { Plus, Trash2, Star, Coins } from "lucide-react";
import type { Currency } from "@/components/settings/settings-types";

export function CurrenciesTab({ currencies: initialCurrencies }: { currencies: Currency[] }) {
  // Currencies state
  const [currencies, setCurrencies] = useState(initialCurrencies);
  const [newCurrency, setNewCurrency] = useState({ code: "", symbol: "", rateToBase: "" });
  const [addingCurrency, setAddingCurrency] = useState(false);
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [savingCurrencyId, setSavingCurrencyId] = useState<string | null>(null);
  async function handleAddCurrency() {
    const code = newCurrency.code.trim();
    const rate = parseFloat(newCurrency.rateToBase);
    if (!code || !rate || rate <= 0) return;
    setAddingCurrency(true);
    const result = await createCurrency({ code, symbol: newCurrency.symbol.trim() || code, rateToBase: rate });
    setAddingCurrency(false);
    if (result.success) {
      toast.success(`${code} added`);
      setNewCurrency({ code: "", symbol: "", rateToBase: "" });
      window.location.reload();
    } else {
      toast.error(result.error ?? "Failed to add currency");
    }
  }

  async function handleSaveCurrencyRate(id: string) {
    const raw = editingRates[id];
    const rate = parseFloat(raw);
    if (!rate || rate <= 0) return;
    setSavingCurrencyId(id);
    const result = await updateCurrency(id, { rateToBase: rate });
    setSavingCurrencyId(null);
    if (result.success) {
      toast.success("Exchange rate updated");
      setCurrencies((prev) => prev.map((c) => (c.id === id ? { ...c, rateToBase: rate } : c)));
      setEditingRates((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      toast.error(result.error ?? "Failed to update rate");
    }
  }

  async function handleSetBaseCurrency(id: string) {
    const result = await setBaseCurrency(id);
    if (result.success) {
      toast.success("Base currency changed");
      window.location.reload();
    } else {
      toast.error(result.error ?? "Failed to change base currency");
    }
  }

  async function handleDeleteCurrency(id: string) {
    const result = await deleteCurrency(id);
    if (result.success) {
      toast.success("Currency removed");
      setCurrencies((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error(result.error ?? "Failed to remove currency");
    }
  }

  return (
    <>
      <TabsContent forceMount value="currencies" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Currency</CardTitle>
            <CardDescription>
              Any currency you add can be used for pot balances and income entries. Rate is how many units of your base currency equal 1 unit of this currency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
              <div>
                <Label>Code</Label>
                <Input value={newCurrency.code} onChange={(e) => setNewCurrency((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. EUR" maxLength={10} />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input value={newCurrency.symbol} onChange={(e) => setNewCurrency((p) => ({ ...p, symbol: e.target.value }))} placeholder="e.g. €" maxLength={6} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Rate to base</Label>
                <Input type="number" value={newCurrency.rateToBase} onChange={(e) => setNewCurrency((p) => ({ ...p, rateToBase: e.target.value }))} placeholder="e.g. 300" onKeyDown={(e) => e.key === "Enter" && handleAddCurrency()} />
              </div>
              <Button className="w-full" onClick={handleAddCurrency} disabled={addingCurrency || !newCurrency.code.trim() || !newCurrency.rateToBase}>
                <Plus className="h-4 w-4" />{addingCurrency ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Coins className="h-4 w-4" />Household Currencies</CardTitle>
            <CardDescription>The base currency is what every total, budget, and report is shown in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {currencies.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 min-w-[90px]">
                  {c.isBase
                    ? <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    : <span className="w-3.5 shrink-0" />}
                  <span className="font-semibold text-sm">{c.code}</span>
                  <span className="text-sm text-muted-foreground">{c.symbol}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                  {c.isBase ? (
                    <span className="text-xs text-muted-foreground">Base currency (rate 1)</span>
                  ) : (
                    <>
                      <Input
                        type="number"
                        value={editingRates[c.id] ?? String(c.rateToBase)}
                        onChange={(e) => setEditingRates((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveCurrencyRate(c.id)}
                        className="h-8 w-28 text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">per 1 {c.code}</span>
                      {editingRates[c.id] !== undefined && editingRates[c.id] !== String(c.rateToBase) && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleSaveCurrencyRate(c.id)} disabled={savingCurrencyId === c.id}>
                          {savingCurrencyId === c.id ? "Saving..." : "Save"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!c.isBase && (
                    <button
                      onClick={() => handleSetBaseCurrency(c.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Set as base
                    </button>
                  )}
                  {!c.isBase && (
                    <button
                      onClick={() => handleDeleteCurrency(c.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                      title="Remove currency"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}
