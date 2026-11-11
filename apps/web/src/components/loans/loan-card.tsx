"use client";

import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Ban, CheckCheck, ChevronDown, MoreHorizontal, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DueChip } from "@/components/shared/due-chip";
import { isLoanClosed } from "@/lib/loans/balance";
import { cn } from "@/lib/utils";

export interface LoanPayment {
  id: string; kind: string; amount: number; date: Date; notes: string | null; transactionId: string | null;
  transaction: { fundingSource: string; fundingPotId: string | null; budgetMonth: number; budgetYear: number } | null;
}
export interface Loan {
  id: string; personName: string; description: string | null; type: string;
  principalAmount: number; remainingAmount: number; date: Date; dueDate: Date | null;
  notes: string | null; status: string; transactionId: string | null; payments: LoanPayment[];
}

const REVEAL = "sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity";

const KIND: Record<string, { label: string; tone: string; sign: string }> = {
  PAYMENT:   { label: "Payment", tone: "text-emerald-600 dark:text-emerald-400", sign: "+" },
  TOP_UP:    { label: "Added",   tone: "text-amber-600 dark:text-amber-400",     sign: "+" },
  WRITE_OFF: { label: "Written off", tone: "text-muted-foreground",              sign: "" },
};

function History({ loan, baseSymbol, onEditPayment, onDeletePayment }: {
  loan: Loan; baseSymbol: string; onEditPayment: (p: LoanPayment) => void; onDeletePayment: (id: string) => void;
}) {
  const isGiven = loan.type === "GIVEN";
  const money = (n: number) => `${baseSymbol} ${(n / 100).toLocaleString()}`;
  // Newest first; the loan's own start closes the list.
  const rows = [...loan.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-1">
      {loan.notes && <p className="text-xs text-muted-foreground pb-1">{loan.notes}</p>}
      {rows.map((p) => {
        const k = KIND[p.kind] ?? KIND.PAYMENT;
        const label = p.kind === "WRITE_OFF" ? (isGiven ? "Written off" : "Forgiven") : k.label;
        return (
          <div key={p.id} className="group/row grid grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 text-sm py-0.5">
            <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(p.date), "d MMM yy")}</span>
            <span className="truncate">{label}{p.notes && <span className="text-xs text-muted-foreground"> · {p.notes}</span>}</span>
            <span className={cn("font-medium tabular-nums whitespace-nowrap", k.tone)}>{k.sign}{money(p.amount)}</span>
            <span className={cn("flex gap-0.5", REVEAL)}>
              {p.transaction && p.kind === "PAYMENT" && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Edit payment" onClick={() => onEditPayment(p)}><Pencil className="h-3 w-3" /></Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" aria-label="Delete payment" onClick={() => onDeletePayment(p.id)}><Trash2 className="h-3 w-3" /></Button>
            </span>
          </div>
        );
      })}
      <div className="group/row grid grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 text-sm py-0.5 text-muted-foreground">
        <span className="text-xs tabular-nums">{format(new Date(loan.date), "d MMM yy")}</span>
        <span>{isGiven ? "Lent" : "Borrowed"}</span>
        <span className="tabular-nums whitespace-nowrap">{money(loan.principalAmount)}</span>
        <span className="w-[3.5rem]" />
      </div>
      {rows.length === 0 && <p className="text-xs text-muted-foreground pt-1">No payments yet - record the first one above.</p>}
    </div>
  );
}

export function LoanCard({ loan, baseSymbol, expanded, onToggle, onPay, onMarkPaid, onTopUp, onWriteOff, onDelete, onEditPayment, onDeletePayment }: {
  loan: Loan; baseSymbol: string; expanded: boolean;
  onToggle: () => void; onPay: () => void; onMarkPaid: () => void; onTopUp: () => void; onWriteOff: () => void; onDelete: () => void;
  onEditPayment: (p: LoanPayment) => void; onDeletePayment: (id: string) => void;
}) {
  const closed = isLoanClosed(loan.status);
  const isGiven = loan.type === "GIVEN";
  const money = (n: number) => `${baseSymbol} ${(n / 100).toLocaleString()}`;
  const paid = loan.principalAmount - loan.remainingAmount;
  const pct = loan.principalAmount > 0 ? Math.round((paid / loan.principalAmount) * 100) : 0;
  const tone = isGiven ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
  const tint = isGiven ? "bg-emerald-500/10" : "bg-red-500/10";
  const Dir = isGiven ? ArrowDownLeft : ArrowUpRight;
  const closedLabel = loan.status === "WRITTEN_OFF" ? (isGiven ? "Written off" : "Forgiven") : "Paid in full";

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onTopUp}><PlusCircle className="h-3.5 w-3.5 mr-2" />{isGiven ? "Lend more" : "Borrow more"}</DropdownMenuItem>
        {!closed && <DropdownMenuItem onClick={onWriteOff}><Ban className="h-3.5 w-3.5 mr-2" />{isGiven ? "Write off" : "Mark as forgiven"}</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete loan</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const historyToggle = (
    <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={onToggle} aria-expanded={expanded}>
      History · {loan.payments.length}
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
    </Button>
  );

  // Closed loans: one calm line.
  if (closed) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden opacity-90">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", "bg-muted text-muted-foreground")}><Dir className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{loan.personName}</p>
            <p className="text-xs text-muted-foreground truncate" title={loan.description ?? undefined}>{closedLabel} · {money(loan.principalAmount)}{loan.description ? ` · ${loan.description}` : ""}</p>
          </div>
          {historyToggle}
          {menu}
        </div>
        {expanded && <History loan={loan} baseSymbol={baseSymbol} onEditPayment={onEditPayment} onDeletePayment={onDeletePayment} />}
      </div>
    );
  }

  const overdue = !!loan.dueDate && new Date(loan.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/15 transition-colors">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", tint, tone)}><Dir className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{loan.personName}</p>
            {loan.description && <p className="text-xs text-muted-foreground truncate" title={loan.description}>{loan.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className={cn("text-lg font-semibold tabular-nums whitespace-nowrap", tone)}>{money(loan.remainingAmount)}</p>
            <p className="text-[11px] text-muted-foreground">{isGiven ? "owes you" : "you owe"}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <Progress value={pct} className="h-1" />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">{paid > 0 ? `${money(paid)} of ${money(loan.principalAmount)} back · ${pct}%` : `${money(loan.principalAmount)} lent, nothing back yet`.replace("lent", isGiven ? "lent" : "borrowed")}</span>
            {loan.dueDate && <DueChip date={loan.dueDate} className={overdue ? "font-medium" : undefined} />}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
          <Button size="sm" className="h-8 flex-1 sm:flex-none" onClick={onPay}>Record payment</Button>
          <Button size="sm" variant="ghost" className="h-8 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700" onClick={onMarkPaid}>
            <CheckCheck className="h-3.5 w-3.5" /><span className="hidden min-[420px]:inline">Paid in full</span>
          </Button>
          <div className="ml-auto flex items-center">{historyToggle}{menu}</div>
        </div>
      </div>
      {expanded && <History loan={loan} baseSymbol={baseSymbol} onEditPayment={onEditPayment} onDeletePayment={onDeletePayment} />}
    </div>
  );
}
