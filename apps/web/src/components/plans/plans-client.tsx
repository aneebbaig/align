"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, Home, Plane, Wrench, LayoutGrid, Archive, MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPlanner, deletePlanner, updatePlannerStatus } from "@/actions/plan";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { planTotals } from "@/lib/plans/totals";
import { fmtShort } from "@/components/wedding/wedding-types";
import { cn } from "@/lib/utils";

interface PlannerItem { id: string; estimatedCost: number; actualCost: number | null; status: string; }
interface Planner {
  id: string; name: string; description: string | null; icon: string; coverColor: string;
  type: string; estimatedTotalCost: number; targetDate: Date | null; status: string;
  completedAt: Date | null; items: PlannerItem[];
}

const PLANNER_TYPES: { value: string; label: string; icon: LucideIcon; color: string }[] = [
  { value: "GENERAL", label: "General Event", icon: CalendarDays, color: "#6366f1" },
  { value: "HOUSE_MOVE", label: "House Moving", icon: Home, color: "#f97316" },
  { value: "TRIP", label: "Trip / Vacation", icon: Plane, color: "#06b6d4" },
  { value: "RENOVATION", label: "Renovation", icon: Wrench, color: "#78716c" },
  { value: "CUSTOM", label: "Custom", icon: LayoutGrid, color: "#8b5cf6" },
];

function getTypeInfo(type: string) {
  return PLANNER_TYPES.find((t) => t.value === type) ?? PLANNER_TYPES[0];
}

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "success" | "outline" }> = {
  IN_PROGRESS: { label: "In progress", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Archived", variant: "outline" },
};

const isClosed = (p: Planner) => p.status === "COMPLETED" || p.status === "CANCELLED";

/** One plan card: a link to the plan plus a menu (the menu sits beside the link, never inside it). */
function PlanCard({ plan, sym, onStatus, onDelete }: {
  plan: Planner; sym: string; onStatus: (id: string, status: string) => void; onDelete: (plan: Planner) => void;
}) {
  const t = planTotals(plan.items);
  const typeInfo = getTypeInfo(plan.type);
  const badge = STATUS_BADGE[plan.status];
  const pct = t.estimated > 0 ? Math.min(100, (t.paid / t.estimated) * 100) : 0;
  const boughtCount = plan.items.filter((i) => i.status === "PAID").length;
  const donePct = plan.items.length > 0 ? Math.round((boughtCount / plan.items.length) * 100) : 0;
  const closed = isClosed(plan);
  return (
    <div className="relative rounded-xl border border-border bg-card hover:border-foreground/15 transition-colors">
      <Link href={`/plans/${plan.id}`} className="block p-5 pr-12 space-y-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <typeInfo.icon className="h-4 w-4 shrink-0" style={{ color: typeInfo.color }} />
          <div className="min-w-0">
            <p className="font-medium truncate">{plan.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              {plan.targetDate && <span>{format(new Date(plan.targetDate), "d MMM yyyy")}</span>}
              {badge && <Badge variant={badge.variant} className="px-2 py-0 text-[11px] font-medium">{badge.label}</Badge>}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">{fmtShort(t.paid, sym)} paid of {fmtShort(t.estimated, sym)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{donePct}% done · {plan.items.length} {plan.items.length === 1 ? "item" : "items"}</p>
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="absolute top-3 right-3 h-8 w-8" aria-label={`Actions for ${plan.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {plan.status === "PLANNING" && <DropdownMenuItem onClick={() => onStatus(plan.id, "IN_PROGRESS")}>Start</DropdownMenuItem>}
          {!closed && <DropdownMenuItem onClick={() => onStatus(plan.id, "COMPLETED")}>Complete</DropdownMenuItem>}
          {!closed && <DropdownMenuItem onClick={() => onStatus(plan.id, "CANCELLED")}>Archive</DropdownMenuItem>}
          {closed && <DropdownMenuItem onClick={() => onStatus(plan.id, "IN_PROGRESS")}>Reopen</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(plan)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PlansClient({ planners, baseSymbol = "Rs" }: { planners: Planner[]; baseSymbol?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("GENERAL");
  const [form, setForm] = useState({ name: "", description: "", targetDate: "" });

  const [deleting, setDeleting] = useState<Planner | null>(null);
  const activeList = planners.filter((p) => !isClosed(p));
  const closedList = planners.filter(isClosed);

  async function changeStatus(id: string, status: string) {
    const r = await updatePlannerStatus(id, status);
    if (r.success) { toast.success(status === "COMPLETED" ? "Plan completed" : status === "CANCELLED" ? "Plan archived" : "Plan started"); router.refresh(); }
    else toast.error(r.error ?? "Failed");
  }

  async function removePlan() {
    if (!deleting) return;
    const r = await deletePlanner(deleting.id);
    setDeleting(null);
    if (r.success) { toast.success("Plan deleted"); router.refresh(); } else toast.error(r.error ?? "Failed");
  }

  const renderCards = (list: Planner[]) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map((p) => <PlanCard key={p.id} plan={p} sym={baseSymbol} onStatus={changeStatus} onDelete={setDeleting} />)}
    </div>
  );

  async function onSubmit() {
    if (!form.name.trim()) return;
    setLoading(true);
    const typeInfo = getTypeInfo(type);
    const result = await createPlanner({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      icon: typeInfo.icon.displayName ?? "CalendarDays",
      coverColor: typeInfo.color,
      type,
      targetDate: form.targetDate || undefined,
    });
    if (result.success && result.data) {
      toast.success("Plan created");
      setForm({ name: "", description: "", targetDate: "" });
      setOpen(false);
      router.push(`/plans/${result.data.id}`);
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }


  return (
    <>
      <PageHeader
        section="Planning"
        title="Plans"
        description="Big things you're paying for over time – a trip, a house move, a renovation."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New plan</Button>}
      />

      {planners.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No plans yet"
          description="Big things you're paying for over time – a trip, a house move, a renovation."
          action={{ label: "New plan", onClick: () => setOpen(true) }}
        />
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeList.length})</TabsTrigger>
            <TabsTrigger value="done">Done &amp; archived ({closedList.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            {activeList.length > 0 ? renderCards(activeList) : <p className="text-sm text-muted-foreground">Nothing active right now.</p>}
          </TabsContent>
          <TabsContent value="done" className="mt-4">
            {closedList.length > 0
              ? renderCards(closedList)
              : <EmptyState icon={Archive} title="Nothing here yet" description="Completed and archived plans show up here." />}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Plan type">
              {PLANNER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={type === t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs transition-colors",
                    type === t.value ? "border-foreground/40 bg-muted/60 font-medium" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30",
                  )}
                >
                  <t.icon className="h-4 w-4" style={{ color: t.color }} />
                  <span className="text-center leading-tight">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-name">Name</Label>
                  <Input id="plan-name" placeholder="e.g. Kitchen refresh" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") void onSubmit(); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-desc">Description (optional)</Label>
                  <Textarea id="plan-desc" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-date">Target date (optional)</Label>
                  <Input id="plan-date" type="date" value={form.targetDate} onChange={(e) => setForm((p) => ({ ...p, targetDate: e.target.value }))} />
                </div>
                <Button type="button" className="w-full" onClick={onSubmit} disabled={loading || !form.name.trim()}>
                  {loading ? "Creating..." : "Create"}
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title={`Delete "${deleting?.name ?? ""}"?`} description="All its items will be permanently deleted." onConfirm={removePlan} />
    </>
  );
}
