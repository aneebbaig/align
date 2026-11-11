"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, differenceInCalendarDays } from "date-fns";
import { ArrowLeft, Check, Heart, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteWeddingPlan, updateWeddingPlan } from "@/actions/wedding";
import { sumTotals } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetMeter } from "./budget-meter";
import { WeddingPlan, PLAN_STATUS_CONFIG } from "./wedding-types";

/** "97 days to go" / "Today" / "Married 3 months ago" - amber inside the last 30 days. */
export function countdown(date: Date | string | null): { text: string; tone: string } | null {
  if (!date) return null;
  const days = differenceInCalendarDays(new Date(date), new Date());
  if (days > 30) return { text: `${days} days to go`, tone: "text-muted-foreground" };
  if (days > 0) return { text: `${days} day${days === 1 ? "" : "s"} to go`, tone: "text-amber-600 dark:text-amber-400 font-medium" };
  if (days === 0) return { text: "Today", tone: "text-amber-600 dark:text-amber-400 font-medium" };
  const ago = -days;
  return { text: ago < 60 ? `Married ${ago} day${ago === 1 ? "" : "s"} ago` : `Married ${Math.round(ago / 30)} months ago`, tone: "text-emerald-600 dark:text-emerald-400" };
}

export function PlanHeader({ plan, baseSymbol, onEdit, onChanged }: { plan: WeddingPlan; baseSymbol: string; onEdit: () => void; onChanged: () => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totals = sumTotals(plan.expenses);
  const cd = countdown(plan.weddingDate);

  async function setStatus(status: string) {
    const r = await updateWeddingPlan(plan.id, { status });
    if (r.success) onChanged(); else toast.error(r.error ?? "Failed");
  }
  async function remove() {
    const r = await deleteWeddingPlan(plan.id);
    if (r.success) { toast.success("Wedding plan deleted"); router.push("/wedding"); } else toast.error(r.error ?? "Failed");
  }

  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border/60 space-y-1.5">
      <Link href="/wedding" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3 w-3" />All wedding plans
      </Link>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center shrink-0"><Heart className="h-4 w-4 text-pink-500" /></span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate leading-tight">{plan.brideName} &amp; {plan.groomName}</h1>
            {plan.weddingDate && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(plan.weddingDate), "EEE, d MMM yyyy")}{cd && <span className={cn("ml-2", cd.tone)}>{cd.text}</span>}
              </p>
            )}
          </div>
          {plan.status === "DONE" && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PLAN_STATUS_CONFIG.DONE.badge)}>Done</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <BudgetMeter className="w-40 hidden sm:block" size="xs" shortCopy projected={totals.projected} paid={totals.paid} budget={plan.totalBudget} symbol={baseSymbol} />
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Edit</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
              {Object.entries(PLAN_STATUS_CONFIG).map(([k, v]) => (
                <DropdownMenuItem key={k} onClick={() => setStatus(k)}>
                  {v.label}{plan.status === k && <Check className="h-3.5 w-3.5 ml-auto" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete plan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <BudgetMeter className="w-full sm:hidden" size="xs" shortCopy projected={totals.projected} paid={totals.paid} budget={plan.totalBudget} symbol={baseSymbol} />
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this wedding plan?" description="All events, expenses and quotes will be deleted. This cannot be undone." onConfirm={remove} />
    </div>
  );
}
