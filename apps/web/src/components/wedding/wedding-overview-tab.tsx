"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Heart, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { updateWeddingPlan } from "@/actions/wedding";
import { cn } from "@/lib/utils";
import { sumTotals, groupTotals } from "@/lib/wedding/totals";
import {
  WeddingPlan, EVENT_STATUS_CONFIG, PLAN_STATUS_CONFIG, fmt, getEventInfo, getExpenseCategoryLabel,
} from "./wedding-types";

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

  const totals = sumTotals(plan.expenses);
  const budget = plan.totalBudget;
  const remaining = budget - totals.projected;
  const usedPct = budget > 0 ? Math.min(100, Math.round((totals.projected / budget) * 100)) : 0;
  const byCategory = [...groupTotals(plan.expenses, (e) => e.category)]
    .sort((x, y) => y[1].projected - x[1].projected);
  const byEvent = groupTotals(plan.expenses, (e) => e.eventId ?? "GENERAL");
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

      {/* Total expense */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total expense (planned)</p>
            <p className="text-3xl font-bold tabular-nums">{fmt(totals.projected, baseSymbol)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated {fmt(totals.estimated, baseSymbol)} · {totals.priced} of {totals.count} priced for real
              {totals.priced > 0 && totals.actual !== 0 ? ` (${fmt(totals.actual, baseSymbol)})` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-semibold text-emerald-600 tabular-nums text-right">{fmt(totals.paid, baseSymbol)}</span>
            <span className="text-muted-foreground">Still to pay</span>
            <span className="font-semibold tabular-nums text-right">{fmt(totals.outstanding, baseSymbol)}</span>
          </div>
        </div>

        {budget > 0 ? (
          <div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", remaining < 0 ? "bg-red-500" : usedPct > 85 ? "bg-amber-500" : "bg-pink-500")} style={{ width: `${usedPct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs">
              <span className="text-muted-foreground">Budget {fmt(budget, baseSymbol)}</span>
              <span className={cn("font-medium", remaining < 0 ? "text-red-500" : "text-emerald-600")}>
                {remaining < 0 ? `${fmt(-remaining, baseSymbol)} over budget` : `${fmt(remaining, baseSymbol)} left`}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Set a total budget (Edit) to see how the plan compares.</p>
        )}
        {plan.haqMehr ? (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            Haq Mehr <span className="font-medium text-pink-600">{fmt(plan.haqMehr, baseSymbol)}</span>{plan.haqMehrNote ? ` · ${plan.haqMehrNote}` : ""} (kept separate from the expenses above)
          </p>
        ) : null}
      </div>

      {/* Breakdowns */}
      {totals.count > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">By event</h3>
            <div className="space-y-2.5">
              {[{ key: "GENERAL", name: "Whole wedding", emoji: "💍", allocated: 0 }, ...sortedEvents.map((ev) => ({ key: ev.id, name: ev.name, emoji: getEventInfo(ev.type).emoji, allocated: ev.budgetAllocated }))]
                .filter((r) => byEvent.has(r.key))
                .map((r) => {
                  const t = byEvent.get(r.key)!;
                  return (
                    <div key={r.key} className="flex items-center justify-between text-sm gap-3">
                      <span className="truncate">{r.emoji} {r.name}</span>
                      <span className="tabular-nums shrink-0">
                        <span className="font-medium">{fmt(t.projected, baseSymbol)}</span>
                        {r.allocated > 0 && <span className={cn("ml-1.5 text-xs", t.projected > r.allocated ? "text-red-500" : "text-muted-foreground")}>/ {fmt(r.allocated, baseSymbol)}</span>}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">By category</h3>
            <div className="space-y-2.5">
              {byCategory.map(([cat, t]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm gap-3">
                    <span className="truncate">{getExpenseCategoryLabel(cat)}</span>
                    <span className="font-medium tabular-nums shrink-0">{fmt(t.projected, baseSymbol)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-pink-400/70" style={{ width: `${totals.projected > 0 ? (t.projected / totals.projected) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
