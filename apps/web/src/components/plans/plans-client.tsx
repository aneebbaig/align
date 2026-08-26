"use client";

import { useState } from "react";
import { Plus, CalendarDays, Home, Plane, Wrench, LayoutGrid, Archive } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPlanner, deletePlanner } from "@/actions/plan";
import { getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";

interface PlannerItem { id: string; estimatedCost: number; actualCost: number | null; status: string; }
interface Planner {
  id: string; name: string; description: string | null; icon: string; coverColor: string;
  type: string; estimatedTotalCost: number; targetDate: Date | null; status: string;
  completedAt: Date | null; items: PlannerItem[];
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const PLANNER_TYPES = [
  { value: "GENERAL", label: "General Event", icon: CalendarDays, color: "#6366f1" },
  { value: "HOUSE_MOVE", label: "House Moving", icon: Home, color: "#f97316" },
  { value: "TRIP", label: "Trip / Vacation", icon: Plane, color: "#06b6d4" },
  { value: "RENOVATION", label: "Renovation", icon: Wrench, color: "#78716c" },
  { value: "CUSTOM", label: "Custom", icon: LayoutGrid, color: "#8b5cf6" },
];

function getTypeInfo(type: string) {
  return PLANNER_TYPES.find((t) => t.value === type) ?? PLANNER_TYPES[0];
}

export function PlansClient({ planners, baseSymbol = "Rs" }: { planners: Planner[]; baseSymbol?: string }) {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", targetDate: "", type: "GENERAL" });

  const activeList = planners.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
  const archivedList = planners.filter((p) => p.status === "COMPLETED" || p.status === "CANCELLED");

  async function onSubmit() {
    if (!form.name) return;
    setLoading(true);
    const typeInfo = getTypeInfo(form.type);
    const result = await createPlanner({
      name: form.name,
      description: form.description || undefined,
      icon: typeInfo.icon.displayName ?? "CalendarDays",
      coverColor: typeInfo.color,
      type: form.type,
      targetDate: form.targetDate || undefined,
    });
    if (result.success) {
      toast.success("Plan created!");
      setForm({ name: "", description: "", targetDate: "", type: "GENERAL" });
      setOpen(false);
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deletePlanner(deleteId);
    toast.success("Plan deleted");
    setDeleteId(null);
  }

  function PlanCard({ plan }: { plan: Planner }) {
    const total = plan.items.reduce((s, i) => s + i.estimatedCost, 0);
    const paid = plan.items.filter((i) => i.status === "PAID").reduce((s, i) => s + (i.actualCost ?? i.estimatedCost), 0);
    const pct = plan.items.length > 0 ? Math.round((plan.items.filter((i) => i.status === "PAID").length / plan.items.length) * 100) : 0;
    const daysLeft = getDaysUntil(plan.targetDate);
    const typeInfo = getTypeInfo(plan.type);

    return (
      <Link href={`/plans/${plan.id}`} className="block bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
        <div className="h-2" style={{ backgroundColor: plan.coverColor }} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <typeInfo.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <div className="font-semibold text-foreground">{plan.name}</div>
                {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
              </div>
            </div>
            <Badge className={cn("text-xs shrink-0", STATUS_COLORS[plan.status])}>{plan.status.replace("_", " ")}</Badge>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated</span>
              <span className="font-medium">{baseSymbol} {(total / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid so far</span>
              <span className="font-medium text-emerald-600">{baseSymbol} {(paid / 100).toLocaleString()}</span>
            </div>
            {plan.targetDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target date</span>
                <span className={cn("font-medium text-xs", daysLeft !== null && daysLeft < 30 ? "text-amber-500" : "text-muted-foreground")}>
                  {format(new Date(plan.targetDate), "d MMM yyyy")}
                  {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d)`}
                </span>
              </div>
            )}
          </div>
          {plan.items.length > 0 && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{pct}% items done · {plan.items.length} items total</div>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <>
      <PageHeader
        section="Planning"
        title="Plans"
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New Plan</Button>}
      />
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeList.length})</TabsTrigger>
          <TabsTrigger value="archived">Completed / Archived ({archivedList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeList.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No active plans"
              description="Plan big events - weddings, house moves, renovations, trips. Add all expenses and track them."
              action={{ label: "Create first plan", onClick: () => setOpen(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeList.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedList.length === 0 ? (
            <EmptyState icon={Archive} title="No archived plans" description="Completed and cancelled plans appear here for reference." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedList.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Life Event Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan Type</Label>
              <Select onValueChange={(v) => setForm((p) => ({ ...p, type: v }))} defaultValue="GENERAL">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANNER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" style={{ color: t.color }} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan Name</Label>
              <Input placeholder="e.g. Barat + Valima" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea rows={2} placeholder="Brief description..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Target Date (optional)</Label>
              <Input type="date" value={form.targetDate} onChange={(e) => setForm((p) => ({ ...p, targetDate: e.target.value }))} />
            </div>
            <Button type="button" className="w-full" onClick={onSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete plan?" description="All items will be deleted too." onConfirm={handleDelete} />
    </>
  );
}
