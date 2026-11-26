"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { DayStrip } from "@/components/shared/day-strip";
import { useLastUsedDate } from "@/components/shared/entry-date";
import { CategoryCombobox, type ComboCategory } from "@/components/shared/category-combobox";
import { logPlanItemExpense, undoPlanItemExpense } from "@/actions/plan";
import { rememberEntryDate, toDateStr } from "@/lib/day-strip";
import { fmt } from "@/components/wedding/wedding-types";

export const PLAN_CATEGORY = "Plan Purchase";

function LogForm({ itemId, itemName, defaultAmount, categories, sym, beforeLog, onClose, onLogged }: {
  itemId: string; itemName: string; defaultAmount: string; categories: ComboCategory[]; sym: string;
  beforeLog?: () => Promise<boolean>; onClose: () => void; onLogged: () => void;
}) {
  const [amount, setAmount] = useState(defaultAmount);
  const [date, setDate] = useState(() => toDateStr(new Date()));
  const [cats, setCats] = useState(categories);
  const [categoryId, setCategoryId] = useState(() => categories.find((c) => c.name === PLAN_CATEGORY)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const lastUsed = useLastUsedDate();
  const parsed = parseMoney(amount);

  async function confirm() {
    if (busy) return;
    if (!parsed || parsed <= 0) { toast.error("Enter the amount paid"); return; }
    setBusy(true);
    if (beforeLog && !(await beforeLog())) { setBusy(false); return; }
    // No category chosen: the server falls back to (and creates, if needed) "Plan Purchase".
    const r = await logPlanItemExpense(itemId, { amount: parsed, date, categoryId: categoryId || undefined });
    setBusy(false);
    if (!r.success) { toast.error(r.error ?? "Failed"); return; }
    rememberEntryDate(date, new Date());
    const txId = r.data?.transactionId ?? null;
    toast.success(`Bought ${itemName} – ${fmt(Math.round(parsed * 100), sym)} logged`, {
      action: {
        label: "Undo",
        onClick: async () => {
          const u = await undoPlanItemExpense(itemId, txId);
          if (u.success) { toast.success("Expense removed"); onLogged(); } else toast.error(u.error ?? "Failed");
        },
      },
    });
    onClose();
    onLogged();
  }

  return (
    <div className="space-y-3" onKeyDown={(e) => { if (e.key === "Enter" && !e.defaultPrevented && (e.target as HTMLElement).tagName !== "BUTTON") { e.preventDefault(); void confirm(); } }}>
      <p className="text-sm font-medium truncate">Log “{itemName}”</p>
      <MoneyInput autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount paid" placeholder="Amount paid" />
      <DayStrip value={date} onChange={setDate} lastUsed={lastUsed} />
      <CategoryCombobox
        categories={cats}
        value={categoryId}
        type="EXPENSE"
        onChange={setCategoryId}
        onCreated={(c) => setCats((p) => [...p, c])}
      />
      {!categoryId && <p className="text-xs text-muted-foreground -mt-1">Left empty, it files under “{PLAN_CATEGORY}”.</p>}
      <Button className="w-full" onClick={confirm} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}Bought – log expense
      </Button>
    </div>
  );
}

/** A small popover (anchored to `children`) to log a plan item as bought: amount, day, category. Enter confirms. */
export function LogExpensePopover({ open, onOpenChange, children, ...form }: {
  open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode;
  itemId: string; itemName: string; defaultAmount: string; categories: ComboCategory[]; sym: string;
  /** Runs before the expense is booked (e.g. save pending edits); return false to stop. */
  beforeLog?: () => Promise<boolean>; onLogged: () => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <LogForm {...form} onClose={() => onOpenChange(false)} />
      </PopoverContent>
    </Popover>
  );
}
