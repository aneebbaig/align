"use client";

import { useMemo, useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const THIS_PERIOD = "THIS_PERIOD";
const LAST_PERIOD = "LAST_PERIOD";
const CUSTOM = "CUSTOM";

interface Filterable {
  description: string;
  categoryId: string;
  category: { name: string };
  date: Date;
  budgetMonth: number;
  budgetYear: number;
}

const periodKey = (m: number, y: number) => `${y}-${String(m).padStart(2, "0")}`;

/** Search + category + period (this/last month, custom range, any month) filtering for a transaction list. */
export function usePeriodFilter<T extends Filterable>(
  transactions: T[],
  currentPeriod: { month: number; year: number },
  lastPeriod: { month: number; year: number },
) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [period, setPeriod] = useState(THIS_PERIOD);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const currentKey = periodKey(currentPeriod.month, currentPeriod.year);
  const lastKey = periodKey(lastPeriod.month, lastPeriod.year);

  const periodOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const t of transactions) {
      const key = periodKey(t.budgetMonth, t.budgetYear);
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ value: key, label: new Date(t.budgetYear, t.budgetMonth - 1).toLocaleString("default", { month: "long", year: "numeric" }) });
      }
    }
    return opts.sort((a, b) => b.value.localeCompare(a.value));
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const key = periodKey(t.budgetMonth, t.budgetYear);
      if (period === THIS_PERIOD) { if (key !== currentKey) return false; }
      else if (period === LAST_PERIOD) { if (key !== lastKey) return false; }
      else if (period === CUSTOM) {
        const d = new Date(t.date);
        if (customStart && d < new Date(customStart)) return false;
        if (customEnd && d > new Date(customEnd + "T23:59:59.999")) return false;
      } else if (period !== "ALL" && key !== period) return false;
      if (q && !t.description.toLowerCase().includes(q) && !t.category.name.toLowerCase().includes(q)) return false;
      if (category !== "ALL" && t.categoryId !== category) return false;
      return true;
    });
  }, [transactions, search, category, period, customStart, customEnd, currentKey, lastKey]);

  const isFiltered = !!(search || category !== "ALL" || period !== THIS_PERIOD);

  function clear() {
    setSearch(""); setCategory("ALL"); setPeriod(THIS_PERIOD); setCustomStart(""); setCustomEnd("");
  }

  return {
    search, setSearch, category, setCategory, period, customStart, setCustomStart, customEnd, setCustomEnd,
    setPeriod: (v: string) => { setPeriod(v); if (v !== CUSTOM) { setCustomStart(""); setCustomEnd(""); } },
    periodOptions, filtered, isFiltered, clear,
  };
}

export type PeriodFilter = ReturnType<typeof usePeriodFilter>;

/** The filter row (search, category, period, clear) plus the "Showing x of y" line. */
export function PeriodFilterBar({ filter, categories, total, searchPlaceholder = "Search..." }: {
  filter: PeriodFilter;
  categories: { id: string; name: string; color: string }[];
  total: number;
  searchPlaceholder?: string;
}) {
  const f = filter;
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input className="pl-9 h-8 text-sm" placeholder={searchPlaceholder} value={f.search} onChange={(e) => f.setSearch(e.target.value)} />
          </div>
          <Select value={f.category} onValueChange={f.setCategory}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <Filter className="h-3 w-3 mr-1 text-muted-foreground/50" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={f.period} onValueChange={f.setPeriod}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={THIS_PERIOD}>This month</SelectItem>
              <SelectItem value={LAST_PERIOD}>Last month</SelectItem>
              <SelectItem value={CUSTOM}>Custom range…</SelectItem>
              <SelectItem value="ALL">All time</SelectItem>
              {f.periodOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {f.isFiltered && (
            <Button size="sm" variant="ghost" onClick={f.clear} aria-label="Clear filters" className="h-8 px-2 text-muted-foreground/60 hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {f.period === CUSTOM && (
          <div className="flex items-center gap-2">
            <Input type="date" value={f.customStart} onChange={(e) => f.setCustomStart(e.target.value)} className="h-8 text-sm w-36" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={f.customEnd} onChange={(e) => f.setCustomEnd(e.target.value)} className="h-8 text-sm w-36" />
          </div>
        )}
      </div>

      {f.isFiltered && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {f.filtered.length} of {total}</span>
          {f.category !== "ALL" && <Badge variant="outline" className="text-xs">{categories.find((c) => c.id === f.category)?.name}</Badge>}
          {f.period !== "ALL" && f.period !== THIS_PERIOD && f.period !== LAST_PERIOD && f.period !== CUSTOM && (
            <Badge variant="outline" className="text-xs">{f.periodOptions.find((m) => m.value === f.period)?.label}</Badge>
          )}
        </div>
      )}
    </>
  );
}
