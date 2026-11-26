"use client";

import { useState } from "react";
import { MoreHorizontal, Scale, Trash2, Wallet, FolderInput, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InlineAmount } from "@/components/shared/inline-fields";
import {
  deleteWeddingExpense, markWeddingExpensePaid, moveWeddingExpense, restoreWeddingExpensePayment, updateWeddingExpenseAmounts,
} from "@/actions/wedding";
import { costOf, paymentStatus } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_CONFIG, WeddingEvent, WeddingExpense, fmt, getEventInfo } from "./wedding-types";

export type SheetSection = "payment" | "quotes";
export type Tip = { id: string; overBy: number; label: string } | null;

/** Column widths shared with the list header so the money columns line up. */
export const ROW_COLS = { amount: "w-[5.5rem] sm:w-28", pill: "w-[4.25rem] shrink-0" };

/**
 * One expense, everywhere: inline estimate + actual, a payment pill, quote chip and a
 * row menu. Clicking the name opens the full sheet.
 */
export function ExpenseRow({ expense: e, events, sym, showEvent, tip, onOpen, onChanged }: {
  expense: WeddingExpense; events: WeddingEvent[]; sym: string; showEvent?: boolean; tip?: Tip;
  onOpen: (id: string, section?: SheetSection) => void; onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = paymentStatus(e);
  const pill = PAYMENT_STATUS_CONFIG[status];
  const chosen = e.quotes.find((q) => q.isChosen);
  const cheapest = e.quotes.length > 0 ? Math.min(...e.quotes.map((q) => q.amount)) : 0;
  const unchosen = e.quotes.length >= 2 && !chosen;
  const event = e.eventId ? events.find((x) => x.id === e.eventId) : null;

  async function saveAmounts(patch: { estimated?: number; actual?: number | null }) {
    const r = await updateWeddingExpenseAmounts(e.id, patch);
    if (r.success) onChanged(); else toast.error(r.error ?? "Failed");
  }

  async function payInFull() {
    const r = await markWeddingExpensePaid(e.id);
    if (!r.success || !r.data) { toast.error(r.error ?? "Failed"); return; }
    const prev = r.data;
    onChanged();
    toast.success(`${e.name} marked as paid`, {
      action: {
        label: "Undo",
        onClick: async () => {
          const u = await restoreWeddingExpensePayment(e.id, { actual: prev.previousActual, paid: prev.previousPaid });
          if (u.success) onChanged(); else toast.error(u.error ?? "Failed");
        },
      },
    });
  }

  async function moveTo(eventId: string | null) {
    if ((e.eventId ?? null) === eventId) return;
    const r = await moveWeddingExpense(e.id, eventId);
    if (!r.success || !r.data) { toast.error(r.error ?? "Failed"); return; }
    const back = r.data.previousEventId;
    const name = eventId ? events.find((x) => x.id === eventId)?.name ?? "event" : "Whole wedding";
    onChanged();
    toast.success(`Moved to ${name}`, {
      action: {
        label: "Undo",
        onClick: async () => {
          const u = await moveWeddingExpense(e.id, back);
          if (u.success) onChanged(); else toast.error(u.error ?? "Failed");
        },
      },
    });
  }

  async function remove() {
    const r = await deleteWeddingExpense(e.id);
    setConfirmDelete(false);
    if (r.success) { toast.success("Expense deleted"); onChanged(); } else toast.error(r.error ?? "Failed");
  }

  return (
    <div className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1 basis-48 space-y-1">
        <button type="button" onClick={() => onOpen(e.id)} className="block w-full text-left">
          <span className="font-medium truncate flex items-center gap-2">
            <span className="truncate">{e.name}</span>
            {tip && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" title={`Takes ${tip.label} ${fmt(tip.overBy, sym)} over budget`} />}
          </span>
        </button>
        {(e.vendorName || showEvent || e.quotes.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {showEvent && <span className="truncate max-w-[10rem]">{event ? `${getEventInfo(event.type).emoji} ${event.name}` : "💍 Whole wedding"}</span>}
            {e.vendorName && <span className="truncate max-w-[10rem]">{e.vendorName}</span>}
            {e.quotes.length > 0 && (
              <button
                type="button"
                onClick={() => onOpen(e.id, "quotes")}
                className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:underline underline-offset-2",
                  unchosen ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-muted")}
              >
                <Scale className="h-3 w-3" />
                {e.quotes.length} quote{e.quotes.length === 1 ? "" : "s"} · from {fmt(cheapest, sym)} · {unchosen ? "compare" : "view"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-end gap-1.5 sm:gap-2 shrink-0 ml-auto">
        <div className={ROW_COLS.amount}>
          <span className="sm:hidden block text-[10px] text-muted-foreground text-right pr-2">Estimate</span>
          <InlineAmount
            variant="bare" label={`Estimate for ${e.name} (${sym})`} symbol={sym} valuePaisas={e.estimatedAmount}
            disabled={!!chosen} hint={chosen ? "Follows the quote you chose - change the quote instead" : `Estimate (${sym})`}
            onSave={(v) => saveAmounts({ estimated: v ?? 0 })}
          />
        </div>
        <div className={ROW_COLS.amount}>
          <span className="sm:hidden block text-[10px] text-muted-foreground text-right pr-2">Actual</span>
          <InlineAmount
            variant="bare" optional label={`Actual cost of ${e.name} (${sym})`} symbol={sym} valuePaisas={e.actualAmount}
            hint={`Actual cost (${sym}) - empty until the real price is known`}
            onSave={(v) => saveAmounts({ actual: v })}
          />
        </div>
        <span
          className={cn("inline-flex justify-center rounded-full px-2 py-0.5 text-[11px] font-medium", ROW_COLS.pill, pill.badge)}
          title={status === "PAID" ? undefined : `Paid ${fmt(e.paidAmount, sym)} of ${fmt(costOf(e), sym)}`}
        >{pill.label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Actions for ${e.name}`}><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onOpen(e.id)}><ExternalLink className="h-3.5 w-3.5 mr-2" />Open details</DropdownMenuItem>
            {status !== "PAID" && <DropdownMenuItem onClick={payInFull}><Wallet className="h-3.5 w-3.5 mr-2" />Mark paid in full</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => onOpen(e.id, "quotes")}><Scale className="h-3.5 w-3.5 mr-2" />Quotes{e.quotes.length ? ` (${e.quotes.length})` : ""}</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><FolderInput className="h-3.5 w-3.5 mr-2" />Move to event</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => moveTo(null)}>
                  💍 Whole wedding{e.eventId === null && <Check className="h-3.5 w-3.5 ml-auto" />}
                </DropdownMenuItem>
                {events.map((ev) => (
                  <DropdownMenuItem key={ev.id} onClick={() => moveTo(ev.id)}>
                    {getEventInfo(ev.type).emoji} {ev.name}{e.eventId === ev.id && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete ${e.name}?`} description="Its quotes go with it. This can't be undone." onConfirm={remove} />
    </div>
  );
}
