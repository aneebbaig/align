"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Heart, CalendarDays, Trash2 } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
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
import { WeddingPlan, PLAN_STATUS_CONFIG, fmt } from "./wedding-types";

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
        description="Plan your Pakistani wedding - events, vendors, budget and Haq Mehr all in one place."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New Wedding Plan</Button>}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No wedding plan yet"
          description="Start planning your big day - add events, compare vendors, track your budget."
          action={{ label: "Create Wedding Plan", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const statusCfg = PLAN_STATUS_CONFIG[plan.status] ?? PLAN_STATUS_CONFIG.PLANNING;
            const totalVendorCost = plan.vendors
              .filter((v) => v.isSelected)
              .reduce((s, v) => s + (v.finalAmount ?? v.quotedAmount), 0);
            const paid = plan.vendors
              .filter((v) => v.paymentStatus === "FULLY_PAID")
              .reduce((s, v) => s + (v.finalAmount ?? v.quotedAmount), 0);
            const daysUntil = plan.weddingDate
              ? Math.ceil((new Date(plan.weddingDate).getTime() - Date.now()) / 86400000)
              : null;

            return (
              <div key={plan.id} className="relative group">
                <Link href={`/wedding/${plan.id}`} className="block bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-pink-300/50 transition-all">
                  <div className="h-2 bg-gradient-to-r from-pink-400 to-rose-400" />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center shrink-0">
                          <Heart className="h-4 w-4 text-pink-500" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{plan.brideName} & {plan.groomName}</div>
                          {plan.weddingDate && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(plan.weddingDate), "d MMM yyyy")}
                              {daysUntil !== null && daysUntil > 0 && (
                                <span className={cn("ml-1.5 font-medium", daysUntil < 30 ? "text-amber-500" : "text-muted-foreground")}>
                                  ({daysUntil}d to go)
                                </span>
                              )}
                              {daysUntil !== null && daysUntil <= 0 && (
                                <span className="ml-1.5 text-emerald-500 font-medium">({formatDistanceToNow(new Date(plan.weddingDate), { addSuffix: true })})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={cn("text-xs shrink-0", statusCfg.badge)}>{statusCfg.label}</Badge>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget</span>
                        <span className="font-medium">{fmt(plan.totalBudget, baseSymbol)}</span>
                      </div>
                      {totalVendorCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vendors selected</span>
                          <span className="font-medium">{fmt(totalVendorCost, baseSymbol)}</span>
                        </div>
                      )}
                      {paid > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paid so far</span>
                          <span className="font-medium text-emerald-600">{fmt(paid, baseSymbol)}</span>
                        </div>
                      )}
                      {plan.haqMehr && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Haq Mehr</span>
                          <span className="font-medium text-pink-600">{fmt(plan.haqMehr, baseSymbol)}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{plan.events.length} events</span>
                      <span>·</span>
                      <span>{plan.vendors.length} vendors</span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteId(plan.id); }}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
        description="All events and vendors will be deleted. This cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}
