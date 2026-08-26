"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Heart, CalendarDays, Wallet, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { updateWeddingPlan } from "@/actions/wedding";
import { cn } from "@/lib/utils";
import {
  WeddingPlan, EVENT_TYPES, EVENT_STATUS_CONFIG, PLAN_STATUS_CONFIG, fmt, getEventInfo,
} from "./wedding-types";

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", highlight ? "border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-950/40" : "border-border bg-card")}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-xl font-bold", highlight ? "text-pink-600 dark:text-pink-400" : "text-foreground")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function WeddingOverviewTab({ plan, baseSymbol = "Rs" }: { plan: WeddingPlan; baseSymbol?: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brideName: plan.brideName,
    groomName: plan.groomName,
    weddingDate: plan.weddingDate ? format(new Date(plan.weddingDate), "yyyy-MM-dd") : "",
    totalBudget: plan.totalBudget ? String(plan.totalBudget / 100) : "",
    haqMehr: plan.haqMehr ? String(plan.haqMehr / 100) : "",
    haqMehrNote: plan.haqMehrNote ?? "",
    notes: plan.notes ?? "",
    status: plan.status,
  });

  const selectedVendorCost = plan.vendors
    .filter((v) => v.isSelected)
    .reduce((s, v) => s + (v.finalAmount ?? v.quotedAmount), 0);
  const paid = plan.vendors
    .filter((v) => v.paymentStatus === "FULLY_PAID")
    .reduce((s, v) => s + (v.finalAmount ?? v.quotedAmount), 0);
  const remaining = plan.totalBudget - selectedVendorCost;
  const daysUntil = plan.weddingDate
    ? Math.ceil((new Date(plan.weddingDate).getTime() - Date.now()) / 86400000)
    : null;

  const sortedEvents = [...plan.events].sort((a, b) => a.order - b.order);

  async function onSave() {
    setLoading(true);
    const result = await updateWeddingPlan(plan.id, {
      brideName: form.brideName,
      groomName: form.groomName,
      weddingDate: form.weddingDate || undefined,
      totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : undefined,
      haqMehr: form.haqMehr ? parseFloat(form.haqMehr) : undefined,
      haqMehrNote: form.haqMehrNote || undefined,
      notes: form.notes || undefined,
      status: form.status,
    });
    if (result.success) {
      toast.success("Updated");
      setEditOpen(false);
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  const statusCfg = PLAN_STATUS_CONFIG[plan.status] ?? PLAN_STATUS_CONFIG.PLANNING;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center">
            <Heart className="h-5 w-5 text-pink-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{plan.brideName} & {plan.groomName}</h2>
            {plan.weddingDate && (
              <p className="text-sm text-muted-foreground">
                {format(new Date(plan.weddingDate), "EEEE, d MMMM yyyy")}
                {daysUntil !== null && daysUntil > 0 && <span className="ml-2 text-amber-500 font-medium">{daysUntil} days to go</span>}
                {daysUntil !== null && daysUntil <= 0 && <span className="ml-2 text-emerald-500 font-medium">{formatDistanceToNow(new Date(plan.weddingDate), { addSuffix: true })}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", statusCfg.badge)}>{statusCfg.label}</Badge>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Budget" value={fmt(plan.totalBudget, baseSymbol)} />
        <StatCard label="Selected Vendors" value={fmt(selectedVendorCost, baseSymbol)} sub={plan.totalBudget > 0 ? `${Math.round((selectedVendorCost / plan.totalBudget) * 100)}% of budget` : undefined} />
        <StatCard label="Paid So Far" value={fmt(paid, baseSymbol)} highlight />
        <StatCard label="Haq Mehr" value={plan.haqMehr ? fmt(plan.haqMehr, baseSymbol) : "-"} sub={plan.haqMehrNote ?? undefined} />
      </div>

      {/* Events timeline */}
      {sortedEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Events Timeline</h3>
          <div className="space-y-2">
            {sortedEvents.map((event) => {
              const info = getEventInfo(event.type);
              const evCfg = EVENT_STATUS_CONFIG[event.status] ?? EVENT_STATUS_CONFIG.PLANNED;
              return (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                  <span className="text-lg">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{event.name}</span>
                      <Badge className={cn("text-xs", evCfg.badge)}>{evCfg.label}</Badge>
                    </div>
                    {event.venue && <p className="text-xs text-muted-foreground truncate">{event.venue}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {event.date ? (
                      <p className="text-xs font-medium">{format(new Date(event.date), "d MMM")}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No date</p>
                    )}
                    {event.guestCount && <p className="text-xs text-muted-foreground">{event.guestCount} guests</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {plan.notes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.notes}</p>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Wedding Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bride's Name</Label>
                <Input value={form.brideName} onChange={(e) => setForm((p) => ({ ...p, brideName: e.target.value }))} />
              </div>
              <div>
                <Label>Groom's Name</Label>
                <Input value={form.groomName} onChange={(e) => setForm((p) => ({ ...p, groomName: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Wedding Date</Label>
              <Input type="date" value={form.weddingDate} onChange={(e) => setForm((p) => ({ ...p, weddingDate: e.target.value }))} />
            </div>
            <div>
              <Label>Total Budget - Rs</Label>
              <Input type="number" value={form.totalBudget} onChange={(e) => setForm((p) => ({ ...p, totalBudget: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Haq Mehr - Rs</Label>
                <Input type="number" value={form.haqMehr} onChange={(e) => setForm((p) => ({ ...p, haqMehr: e.target.value }))} />
              </div>
              <div>
                <Label>Haq Mehr Note</Label>
                <Input value={form.haqMehrNote} onChange={(e) => setForm((p) => ({ ...p, haqMehrNote: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="PLANNING">Planning</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={onSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
