"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Heart, Trash2, MoreHorizontal, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { format, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { createWeddingPlan, deleteWeddingPlan } from "@/actions/wedding";
import { cn } from "@/lib/utils";
import { WeddingPlan, PLAN_STATUS_CONFIG, fmt, fmtShort } from "./wedding-types";
import { BudgetMeter } from "./budget-meter";
import { countdown } from "./plan-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sumTotals } from "@/lib/wedding/totals";

export function WeddingClient({ plans: initialPlans, baseSymbol = "Rs" }: { plans: WeddingPlan[]; baseSymbol?: string }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brideName: "", groomName: "", weddingDate: "", totalBudget: "", haqMehr: "", haqMehrNote: "", notes: "",
  });

  async function onSubmit() {
    if (!form.brideName.trim() || !form.groomName.trim()) return;
    setLoading(true);
    const result = await createWeddingPlan({
      brideName: form.brideName,
      groomName: form.groomName,
      weddingDate: form.weddingDate || undefined,
      totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : undefined,
      haqMehr: form.haqMehr ? parseFloat(form.haqMehr) : undefined,
      haqMehrNote: form.haqMehrNote || undefined,
      notes: form.notes || undefined,
    });
    if (result.success && result.data) {
      toast.success("Wedding plan created!");
      setOpen(false);
      setForm({ brideName: "", groomName: "", weddingDate: "", totalBudget: "", haqMehr: "", haqMehrNote: "", notes: "" });
      router.push(`/wedding/${result.data.id}`);
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteWeddingPlan(deleteId);
    setPlans((p) => p.filter((x) => x.id !== deleteId));
    setDeleteId(null);
    toast.success("Wedding plan deleted");
  }

  return (
    <>
      <PageHeader
        section="Planning"
        title="Wedding"
        description="Plan your Pakistani wedding - events, expenses, vendor quotes and Haq Mehr all in one place."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New Wedding Plan</Button>}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No wedding plan yet"
          description="Start planning your big day - list every expense you can imagine, compare vendor quotes, track your budget."
          action={{ label: "Create Wedding Plan", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const totals = sumTotals(plan.expenses);
            const cd = countdown(plan.weddingDate);
            const events = [...plan.events].sort((x, y) => x.order - y.order);
            const next = events.filter((e) => e.date && differenceInCalendarDays(new Date(e.date), new Date()) >= 0)
              .sort((x, y) => new Date(x.date as Date).getTime() - new Date(y.date as Date).getTime())[0];
            const overEvents = events.filter((e) => e.budgetAllocated > 0 && sumTotals(plan.expenses.filter((x) => x.eventId === e.id)).projected > e.budgetAllocated);

            return (
              <div key={plan.id} className="relative group">
                <Link href={`/wedding/${plan.id}`} className="block bg-card border border-border rounded-xl p-5 hover:border-foreground/15 transition-colors space-y-3">
                  <div className="flex items-start justify-between gap-3 pr-8">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center shrink-0"><Heart className="h-4 w-4 text-pink-500" /></div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{plan.brideName} &amp; {plan.groomName}</div>
                        {plan.weddingDate && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(plan.weddingDate), "d MMM yyyy")}
                            {cd && <span className={cn("ml-1.5", cd.tone)}>· {cd.text}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {plan.status === "DONE" && <Badge className={cn("text-xs shrink-0", PLAN_STATUS_CONFIG.DONE.badge)}>Done</Badge>}
                  </div>

                  <div className="space-y-1.5">
                    <BudgetMeter size="sm" shortCopy projected={totals.projected} paid={totals.paid} budget={plan.totalBudget} symbol={baseSymbol} />
                    <p className="text-xs text-muted-foreground tabular-nums" title={`Planned ${fmt(totals.projected, baseSymbol)}${plan.totalBudget > 0 ? ` of ${fmt(plan.totalBudget, baseSymbol)}` : ""}`}>
                      {fmtShort(totals.projected, baseSymbol)} planned{plan.totalBudget > 0 ? ` of ${fmtShort(plan.totalBudget, baseSymbol)}` : ""}{totals.paid > 0 ? ` · ${fmtShort(totals.paid, baseSymbol)} paid` : ""}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {plan.events.length} events · {plan.expenses.length} expenses{next ? ` · Next: ${next.name} ${format(new Date(next.date as Date), "d MMM")}` : ""}
                  </p>
                  {overEvents.length > 0 && (
                    <p className="flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {overEvents.slice(0, 2).map((e) => `${e.name} over by ${fmtShort(sumTotals(plan.expenses.filter((x) => x.eventId === e.id)).projected - e.budgetAllocated, baseSymbol)}`).join(" · ")}
                      {overEvents.length > 2 ? ` · +${overEvents.length - 2} more` : ""}
                    </p>
                  )}
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="absolute top-3.5 right-3 h-8 w-8 text-muted-foreground" aria-label="Plan actions" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteId(plan.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete plan</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Wedding Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bride's Name</Label>
                <Input placeholder="e.g. Fatima" value={form.brideName} onChange={(e) => setForm((p) => ({ ...p, brideName: e.target.value }))} />
              </div>
              <div>
                <Label>Groom's Name</Label>
                <Input placeholder="e.g. Ahmed" value={form.groomName} onChange={(e) => setForm((p) => ({ ...p, groomName: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Wedding Date (optional)</Label>
              <Input type="date" value={form.weddingDate} onChange={(e) => setForm((p) => ({ ...p, weddingDate: e.target.value }))} />
            </div>
            <div>
              <Label>Total Budget - Rs (optional)</Label>
              <Input type="number" placeholder="e.g. 2000000" value={form.totalBudget} onChange={(e) => setForm((p) => ({ ...p, totalBudget: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Haq Mehr - Rs (optional)</Label>
                <Input type="number" placeholder="e.g. 500000" value={form.haqMehr} onChange={(e) => setForm((p) => ({ ...p, haqMehr: e.target.value }))} />
              </div>
              <div>
                <Label>Haq Mehr Note (optional)</Label>
                <Input placeholder="e.g. 10 tola gold" value={form.haqMehrNote} onChange={(e) => setForm((p) => ({ ...p, haqMehrNote: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} placeholder="Any notes..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={onSubmit} disabled={loading || !form.brideName || !form.groomName}>
              {loading ? "Creating..." : "Create Wedding Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete wedding plan?"
        description="All events, expenses and quotes will be deleted. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
