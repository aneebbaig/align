"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, ChevronDown, Loader2, MoreHorizontal, PanelRightOpen, Scale, Store, Trash2, Wallet, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InlineText, InlineAmount } from "@/components/shared/inline-fields";
import { updateWeddingExpense, markWeddingExpensePaid } from "@/actions/wedding";
import { cheapestQuote, costOf, paymentStatus, varianceOf } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { EventPicker, GENERAL } from "./event-picker";
import { WeddingEvent, WeddingExpense, PAYMENT_STATUS_CONFIG, fmt, fmtShort, getEventInfo, getExpenseCategoryLabel } from "./wedding-types";

/** The money columns shared by section headers, rows and footers so they line up. */
export const EXPENSE_GRID = "grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_6.5rem_4.5rem] items-start gap-x-3 gap-y-1 px-4";
/** Hidden until you point at, or tab into, the row (always shown on touch). */
export const REVEAL = "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity";

export type SheetSection = "payment" | "quotes";

export function ExpenseRow({ expense, events, expenses, totalBudget, baseSymbol, budgetHint, onOpen, onDelete, onChanged, onNewEvent }: {
  expense: WeddingExpense; events: WeddingEvent[]; expenses: WeddingExpense[]; totalBudget: number; baseSymbol: string;
  /** Set on the one expense that pushes its event over budget, e.g. "Takes Nikkah Rs 45,000 over budget". */
  budgetHint: string | null;
  onOpen: (section?: SheetSection) => void; onDelete: () => void; onChanged: () => void; onNewEvent: (expenseId: string) => void;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const fade = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (fade.current) clearTimeout(fade.current); }, []);

  async function save(patch: Parameters<typeof updateWeddingExpense>[1]) {
    setState("saving");
    const result = await updateWeddingExpense(expense.id, patch);
    if (!result.success) { setState("error"); toast.error(result.error ?? "Couldn't save"); return; }
    setState("saved");
    if (fade.current) clearTimeout(fade.current);
    fade.current = setTimeout(() => setState("idle"), 1500);
    onChanged();
  }

  async function payInFull() {
    const result = await markWeddingExpensePaid(expense.id);
    if (result.success) { toast.success("Marked as paid"); onChanged(); } else toast.error(result.error ?? "Failed");
  }

  async function moveTo(value: string) {
    const target = value === GENERAL ? null : value;
    if (target === expense.eventId) return;
    const before = expense.eventId;
    const result = await updateWeddingExpense(expense.id, { eventId: target });
    if (!result.success) { toast.error(result.error ?? "Couldn't move"); return; }
    const name = target ? events.find((e) => e.id === target)?.name ?? "event" : "Whole wedding";
    toast.success(`Moved to ${name}`, {
      action: { label: "Undo", onClick: async () => { await updateWeddingExpense(expense.id, { eventId: before }); onChanged(); } },
    });
    onChanged();
  }

  const status = paymentStatus(expense);
  const statusCfg = PAYMENT_STATUS_CONFIG[status];
  const diff = varianceOf(expense);
  const chosen = expense.quotes.find((q) => q.isChosen);
  const cheapest = cheapestQuote(expense.quotes);
  const event = events.find((e) => e.id === expense.eventId);
  const eventInfo = event ? getEventInfo(event.type) : null;

  return (
    <div className={cn("group py-2.5 border-t border-border/60 hover:bg-muted/30 transition-colors", EXPENSE_GRID, budgetHint && "bg-red-50/40 dark:bg-red-950/15")}>
      {/* name */}
      <div className="flex items-center gap-2 min-w-0 sm:order-1">
        <InlineText
          ariaLabel="Expense name"
          value={expense.name}
          onSave={(name) => save({ name })}
          className="flex-1 min-w-0 text-sm font-medium text-foreground"
        />
        <span className="w-4 shrink-0" aria-live="polite">
          {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {state === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          {state === "error" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        </span>
      </div>

      {/* payment + actions (own columns from sm up) */}
      <div className="flex items-center gap-1 sm:contents">
        <div className="sm:order-4 sm:flex sm:flex-col sm:items-start">
          <button
            type="button"
            onClick={() => onOpen("payment")}
            title="Payment - click to record what's been paid"
            className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap hover:opacity-80", statusCfg.badge)}
          >{statusCfg.label}</button>
          {status === "PART_PAID" && (
            <span className="hidden sm:block text-[11px] text-muted-foreground tabular-nums mt-0.5" title={`${fmt(expense.paidAmount, baseSymbol)} of ${fmt(costOf(expense), baseSymbol)}`}>
              {fmtShort(expense.paidAmount, "").trim()} of {fmtShort(costOf(expense), "").trim()}
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-0.5 sm:order-5">
          <Button size="icon" variant="ghost" className={cn("h-7 w-7 text-muted-foreground", REVEAL)} aria-label="Details and quotes" title="Details & quotes" onClick={() => onOpen()}>
            <PanelRightOpen className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Expense actions"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpen()}><PanelRightOpen className="h-3.5 w-3.5 mr-2" />Details &amp; quotes</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTimeout(() => setPickerOpen(true), 0)}><ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Move to event…</DropdownMenuItem>
              {status !== "PAID" && <DropdownMenuItem onClick={payInFull}><Wallet className="h-3.5 w-3.5 mr-2" />Mark paid in full</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* money: own line on phones, columns from sm up */}
      <div className="col-span-full flex gap-3 sm:contents">
        <div className="flex-1 sm:flex-none sm:order-2">
          <span className="sm:hidden text-[11px] text-muted-foreground">Estimate</span>
          <div className="flex items-center gap-1">
            {chosen && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden />}
            <InlineAmount
              variant="bare" label="Estimate" symbol={baseSymbol} valuePaisas={expense.estimatedAmount} disabled={!!chosen}
              hint={chosen ? "Follows the quote you chose - change it in Details & quotes" : undefined}
              onSave={(v) => save({ estimated: v ?? 0 })}
            />
          </div>
        </div>
        <div className="flex-1 sm:flex-none sm:order-3">
          <span className="sm:hidden text-[11px] text-muted-foreground">Actual</span>
          <InlineAmount variant="bare" label="Actual cost" symbol={baseSymbol} valuePaisas={expense.actualAmount} optional onSave={(v) => save({ actual: v })} />
          {diff !== null && diff !== 0 && (
            <p className={cn("text-[11px] tabular-nums text-right pr-2 -mt-0.5", diff > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
              {diff > 0 ? "+" : "−"}{fmt(Math.abs(diff), baseSymbol)}
            </p>
          )}
        </div>
      </div>

      {/* meta: where it belongs (always visible, one click to change), category, vendor, quotes */}
      <div className="col-span-full flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground sm:order-6">
        <EventPicker
          open={pickerOpen} onOpenChange={setPickerOpen}
          events={events} expenses={expenses} totalBudget={totalBudget} symbol={baseSymbol}
          currentValue={expense.eventId ?? GENERAL} cost={costOf(expense)}
          onPick={moveTo} onNewEvent={() => onNewEvent(expense.id)}
        >
          <button type="button" className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 hover:text-foreground" title="Change which event this belongs to">
            <span>{eventInfo ? eventInfo.emoji : "💍"}</span>{event ? event.name : "Whole wedding"}<ChevronDown className="h-3 w-3" />
          </button>
        </EventPicker>
        <span className="rounded bg-muted px-1.5 py-0.5">{getExpenseCategoryLabel(expense.category)}</span>
        {expense.vendorName && (
          <button onClick={() => onOpen()} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 hover:text-foreground"><Store className="h-3 w-3" />{expense.vendorName}</button>
        )}
        {expense.quotes.length > 0 && (
          <button onClick={() => onOpen("quotes")} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-foreground", chosen ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300")}>
            <Scale className="h-3 w-3" />
            {expense.quotes.length} quotes{chosen ? " · chosen" : cheapest ? ` · from ${fmtShort(cheapest.amount, baseSymbol)}` : " · compare"}
          </button>
        )}
        {expense.notes && <button onClick={() => onOpen()} className="italic truncate max-w-[16rem] text-left hover:text-foreground">{expense.notes}</button>}
      </div>

      {budgetHint && (
        <p className="col-span-full sm:order-7 flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />{budgetHint}
        </p>
      )}
    </div>
  );
}
