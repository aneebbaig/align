"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, differenceInCalendarDays } from "date-fns";
import { ArrowLeft, Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteWeddingPlan, updateWeddingPlan } from "@/actions/wedding";
import { cn } from "@/lib/utils";
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

export function PlanHeader({ plan, onEdit, onChanged }: { plan: WeddingPlan; onEdit: () => void; onChanged: () => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    <div className="space-y-3">
      <Link href="/wedding" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />All wedding plans
      </Link>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-semibold">
            {plan.brideName} &amp; {plan.groomName}
            {plan.status === "DONE" && <span className={cn("ml-3 align-middle rounded-full px-2 py-0.5 text-[11px] font-medium", PLAN_STATUS_CONFIG.DONE.badge)}>Done</span>}
          </h1>
          {plan.weddingDate && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(plan.weddingDate), "EEEE, d MMMM yyyy")}{cd && <span className={cn("ml-2", cd.tone)}>{cd.text}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this wedding plan?" description="All events, expenses and quotes will be deleted. This cannot be undone." onConfirm={remove} />
    </div>
  );
}
