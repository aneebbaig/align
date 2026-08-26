"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, CheckCircle, Clock, Tag, Store, CheckCircle2, AlertTriangle, TrendingUp, Info } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createPlannerItem, updatePlannerItem, deletePlannerItem, updatePlannerStatus, deletePlanner, logPlanItemExpense } from "@/actions/plan";
import { cn } from "@/lib/utils";

interface PlanItem {
  id: string; planId: string; name: string; description: string | null;
  estimatedCost: number; actualCost: number | null; status: string;
  dueDate: Date | null; notes: string | null; eventGroup: string | null; vendor: string | null;
}
interface Plan {
  id: string; name: string; description: string | null; coverColor: string;
  type: string; status: string; completedAt: Date | null; estimatedTotalCost: number;
  targetDate: Date | null; items: PlanItem[];
}
interface FinancialPosition {
  accumulatedSavings: number;
  savingsPotsTotal: number;
  investmentsTotal: number;
  loansOwed: number;
  loansReceivable: number;
  liquidAvailable: number;
  netWorth: number;
}

const ITEM_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800",
  BOOKED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  SKIPPED: "bg-slate-100 text-slate-400",
};

const PLANNER_STATUS_FLOW = ["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PLANNER_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const GENERIC_GROUPS = ["Phase 1", "Phase 2", "Phase 3", "Venue", "Catering", "Decor", "Transport", "Other"];

export function PlanDetailClient({ plan, financialPosition, baseSymbol = "Rs" }: { plan: Plan; financialPosition: FinancialPosition; baseSymbol?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({
    name: "", estimatedCost: "", dueDate: "", notes: "", eventGroup: "", vendor: "",
  });

  const totalEstimated = plan.items.reduce((s, i) => s + i.estimatedCost, 0);
  // A paid item counts toward "actually paid" even if no actual cost was
  // entered — fall back to its estimate rather than showing 0.
  const totalActual = plan.items.reduce(
    (s, i) => s + (i.actualCost ?? (i.status === "PAID" ? i.estimatedCost : 0)),
    0,
  );
  const paidCount = plan.items.filter((i) => i.status === "PAID").length;
  const pct = plan.items.length > 0 ? Math.round((paidCount / plan.items.length) * 100) : 0;

  // Group items by eventGroup
  const grouped: Record<string, PlanItem[]> = {};
  const ungrouped: PlanItem[] = [];
  for (const item of plan.items) {
    if (item.eventGroup) {
      if (!grouped[item.eventGroup]) grouped[item.eventGroup] = [];
      grouped[item.eventGroup].push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const suggestedGroups = GENERIC_GROUPS;

  async function handleAddItem() {
    if (!newItem.name) return;
    startTransition(async () => {
      const result = await createPlannerItem(plan.id, {
        name: newItem.name,
        estimatedCost: parseFloat(newItem.estimatedCost) || 0,
        dueDate: newItem.dueDate || undefined,
        notes: newItem.notes || undefined,
        eventGroup: newItem.eventGroup || undefined,
        vendor: newItem.vendor || undefined,
      });
      if (result.success) {
        toast.success("Item added");
        setAddOpen(false);
        setNewItem({ name: "", estimatedCost: "", dueDate: "", notes: "", eventGroup: "", vendor: "" });
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  async function handleStatusChange(itemId: string, status: string) {
    startTransition(async () => {
      await updatePlannerItem(itemId, { status });
      toast.success("Status updated");
      router.refresh();
    });
  }

  // One-tap: mark bought + book a real expense for this item.
  async function handleLogExpense(itemId: string) {
    startTransition(async () => {
      const result = await logPlanItemExpense(itemId);
      if (result.success) toast.success("Bought — expense logged");
      else toast.error(result.error ?? "Failed to log expense");
      router.refresh();
    });
  }

  async function handleDeleteItem() {
    if (!deleteItemId) return;
    await deletePlannerItem(deleteItemId);
    toast.success("Item deleted");
    setDeleteItemId(null);
    router.refresh();
  }

  async function handlePlanStatus(status: string) {
    startTransition(async () => {
      const result = await updatePlannerStatus(plan.id, status);
      if (result.success) {
        toast.success(`Plan marked as ${PLANNER_STATUS_LABELS[status]}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  async function handleDeletePlan() {
    await deletePlanner(plan.id);
    toast.success("Plan deleted");
    router.push("/plans");
  }

  function ItemRow({ item }: { item: PlanItem }) {
    return (
      <div className={cn("p-3 rounded-lg border border-border bg-background", item.status === "SKIPPED" && "opacity-50")}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{item.name}</span>
              {item.vendor && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Store className="h-3 w-3" />{item.vendor}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>Est: {baseSymbol} {(item.estimatedCost / 100).toLocaleString()}</span>
              {item.actualCost !== null && (
                <span className="text-emerald-600 font-medium">Paid: {baseSymbol} {(item.actualCost / 100).toLocaleString()}</span>
              )}
              {item.dueDate && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(item.dueDate), "d MMM yyyy")}</span>
              )}
            </div>
            {item.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.notes}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.status === "PAID" ? (
              <button
                onClick={() => handleStatusChange(item.id, "PENDING")}
                disabled={isPending}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-muted-foreground transition-colors"
                title="Bought — click to undo"
              >
                <CheckCircle2 className="h-4 w-4" /> Bought
              </button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isPending}
                onClick={() => handleLogExpense(item.id)}
                title="Mark bought and log a real expense"
              >
                Buy &amp; log
              </Button>
            )}
            <button onClick={() => setDeleteItemId(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/plans">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="h-3 w-1 rounded-full" style={{ backgroundColor: plan.coverColor }} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
          {plan.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
        </div>
        <Badge className={cn("text-xs", {
          "bg-blue-100 text-blue-700": plan.status === "PLANNING",
          "bg-amber-100 text-amber-700": plan.status === "IN_PROGRESS",
          "bg-emerald-100 text-emerald-700": plan.status === "COMPLETED",
          "bg-slate-100 text-slate-500": plan.status === "CANCELLED",
        })}>{PLANNER_STATUS_LABELS[plan.status]}</Badge>
      </div>

      {/* Status actions */}
      {plan.status !== "COMPLETED" && plan.status !== "CANCELLED" && (
        <div className="flex gap-2 flex-wrap">
          {plan.status === "PLANNING" && (
            <Button size="sm" variant="outline" onClick={() => handlePlanStatus("IN_PROGRESS")} disabled={isPending}>
              Mark In Progress
            </Button>
          )}
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handlePlanStatus("COMPLETED")} disabled={isPending}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete Plan
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handlePlanStatus("CANCELLED")} disabled={isPending}>
            Cancel Plan
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500 ml-auto" onClick={() => setDeletePlanId(plan.id)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
          </Button>
        </div>
      )}
      {plan.completedAt && (
        <p className="text-xs text-muted-foreground">Completed on {format(new Date(plan.completedAt), "d MMMM yyyy")}</p>
      )}

      {/* Cost summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Estimated Total</div>
          <div className="text-xl font-bold text-foreground">{baseSymbol} {(totalEstimated / 100).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Actually Paid</div>
          <div className="text-xl font-bold text-emerald-600">{baseSymbol} {(totalActual / 100).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="text-xl font-bold text-primary">{pct}%</div>
          <div className="text-xs text-muted-foreground">{paidCount}/{plan.items.length} items</div>
        </div>
      </div>

      {/* Affordability Panel */}
      {totalEstimated > 0 && (() => {
        const remaining = totalEstimated - totalActual;
        const canAfford = financialPosition.liquidAvailable >= remaining;
        // Clamp to 0-100: you can't cover a negative share (liquid in the red = 0% covered).
        const coveragePct = remaining > 0
          ? Math.max(0, Math.min(100, Math.round((financialPosition.liquidAvailable / remaining) * 100)))
          : 100;
        return (
          <div className={cn("rounded-xl border p-5",
            canAfford
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
              : coveragePct >= 50
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
          )}>
            <div className="flex items-center gap-2 mb-3">
              {canAfford
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <AlertTriangle className={cn("h-4 w-4", coveragePct >= 50 ? "text-amber-600" : "text-red-500")} />
              }
              <span className="font-semibold text-foreground text-sm">
                {totalActual > 0
                  ? canAfford
                    ? "You can cover the remaining balance"
                    : `${Math.min(coveragePct, 100)}% of remaining cost is covered`
                  : canAfford
                    ? "You can afford this plan right now"
                    : `You can cover ${Math.min(coveragePct, 100)}% of this plan`
                }
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <div className="text-xs text-muted-foreground">Still to pay</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(remaining / 100).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Available (liquid)</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(financialPosition.liquidAvailable / 100).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Investments</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(financialPosition.investmentsTotal / 100).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Net worth</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(financialPosition.netWorth / 100).toLocaleString()}</div>
              </div>
            </div>
            {!canAfford && remaining > financialPosition.liquidAvailable && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Shortfall: {baseSymbol} {((remaining - financialPosition.liquidAvailable) / 100).toLocaleString()}.
                  {financialPosition.investmentsTotal >= (remaining - financialPosition.liquidAvailable)
                    ? " Your investments can cover the gap if liquidated."
                    : " Build your savings before committing to this expense."}
                </span>
              </div>
            )}
            {canAfford && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 border-t border-emerald-200 dark:border-emerald-800 pt-3">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Your savings can fund this plan without touching investments.
              </div>
            )}
          </div>
        );
      })()}

      {/* Items */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Items & Checklist</h3>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" />Add Item</Button>
        </div>

        {plan.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No items yet. Add your first expense item!</p>
        ) : (
          <div className="space-y-4">
            {/* Grouped items */}
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</span>
                  <span className="text-xs text-muted-foreground">· {baseSymbol} {(items.reduce((s, i) => s + i.estimatedCost, 0) / 100).toLocaleString()} est.</span>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-muted">
                  {items.map((item) => <ItemRow key={item.id} item={item} />)}
                </div>
              </div>
            ))}

            {/* Ungrouped items */}
            {ungrouped.length > 0 && (
              <div>
                {Object.keys(grouped).length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other</span>
                  </div>
                )}
                <div className="space-y-2">
                  {ungrouped.map((item) => <ItemRow key={item.id} item={item} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Book wedding hall" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estimated Cost ({baseSymbol})</Label>
                <Input type="number" value={newItem.estimatedCost} onChange={(e) => setNewItem((p) => ({ ...p, estimatedCost: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Due Date (optional)</Label>
                <Input type="date" value={newItem.dueDate} onChange={(e) => setNewItem((p) => ({ ...p, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Event Group (optional)</Label>
                <Input
                  list={`groups-${plan.id}`}
                  value={newItem.eventGroup}
                  onChange={(e) => setNewItem((p) => ({ ...p, eventGroup: e.target.value }))}
                  placeholder="e.g. Phase 1"
                />
                <datalist id={`groups-${plan.id}`}>
                  {suggestedGroups.map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <Label>Vendor / Supplier (optional)</Label>
                <Input value={newItem.vendor} onChange={(e) => setNewItem((p) => ({ ...p, vendor: e.target.value }))} placeholder="e.g. Pearl Continental" />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={newItem.notes} onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))} placeholder="Any extra details, quotation comparison..." />
            </div>
            <Button className="w-full" onClick={handleAddItem} disabled={isPending}>
              {isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItemId} onOpenChange={(o) => !o && setDeleteItemId(null)} title="Delete this item?" description="This cannot be undone." onConfirm={handleDeleteItem} />
      <ConfirmDialog open={!!deletePlanId} onOpenChange={(o) => !o && setDeletePlanId(null)} title="Delete this plan?" description="All items will be permanently deleted." onConfirm={handleDeletePlan} />
    </div>
  );
}
