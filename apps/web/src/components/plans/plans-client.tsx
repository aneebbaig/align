"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, Home, Plane, Wrench, LayoutGrid, Heart, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPlanner } from "@/actions/plan";
import { PageHeader } from "@/components/shared/page-header";
import { planTotals } from "@/lib/plans/totals";
import { sumTotals } from "@/lib/wedding/totals";
import { BudgetMeter } from "@/components/wedding/budget-meter";
import { WeddingCreateForm } from "@/components/wedding/create-form";
import { WeddingPlan, fmtShort } from "@/components/wedding/wedding-types";
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
const WEDDING_TILE = { value: "WEDDING", label: "Wedding", icon: Heart, color: "#ec4899" };

function getTypeInfo(type: string) {
  return PLANNER_TYPES.find((t) => t.value === type) ?? PLANNER_TYPES[0];
}

/** One card, for a plan or a wedding: icon + name, a muted date, a thin meter, one muted line. */
function PlanCard({ href, icon: Icon, color, title, meta, meter, line }: {
  href: string; icon?: LucideIcon; color?: string; title: string; meta?: string | null; meter: React.ReactNode; line: string;
}) {
  return (
    <Link href={href} className="block rounded-xl border border-border bg-card p-5 space-y-3 hover:border-foreground/15 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color }} />}
        <div className="min-w-0">
          <p className="font-medium truncate">{title}</p>
          {meta && <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        {meter}
        <p className="text-xs text-muted-foreground tabular-nums">{line}</p>
      </div>
    </Link>
  );
}

function planCard(plan: Planner, sym: string) {
  const t = planTotals(plan.items);
  const typeInfo = getTypeInfo(plan.type);
  const done = plan.status === "COMPLETED" ? "Completed" : plan.status === "CANCELLED" ? "Cancelled" : null;
  const meta = [plan.targetDate ? format(new Date(plan.targetDate), "d MMM yyyy") : null, done].filter(Boolean).join(" · ");
  const pct = t.estimated > 0 ? Math.min(100, (t.paid / t.estimated) * 100) : 0;
  return (
    <PlanCard
      key={plan.id}
      href={`/plans/${plan.id}`}
      icon={typeInfo.icon}
      color={typeInfo.color}
      title={plan.name}
      meta={meta || null}
      meter={
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      }
      line={`${fmtShort(t.paid, sym)} paid of ${fmtShort(t.estimated, sym)}`}
    />
  );
}

function weddingCard(plan: WeddingPlan, sym: string) {
  const t = sumTotals(plan.expenses);
  return (
    <PlanCard
      key={plan.id}
      href={`/wedding/${plan.id}`}
      title={`💍 ${plan.brideName} & ${plan.groomName}`}
      meta={plan.weddingDate ? format(new Date(plan.weddingDate), "d MMM yyyy") : null}
      meter={<BudgetMeter size="xs" shortCopy={plan.totalBudget > 0} projected={t.projected} paid={t.paid} budget={plan.totalBudget} symbol={sym} />}
      line={`${fmtShort(t.paid, sym)} paid of ${fmtShort(t.projected, sym)}`}
    />
  );
}

export function PlansClient({ planners, weddings, baseSymbol = "Rs" }: { planners: Planner[]; weddings: WeddingPlan[]; baseSymbol?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("GENERAL");
  const [form, setForm] = useState({ name: "", description: "", targetDate: "" });

  const isClosed = (p: Planner) => p.status === "COMPLETED" || p.status === "CANCELLED";
  const activeCards = [
    ...planners.filter((p) => !isClosed(p)).map((p) => planCard(p, baseSymbol)),
    ...weddings.filter((w) => w.status !== "DONE").map((w) => weddingCard(w, baseSymbol)),
  ];
  const closedCards = [
    ...planners.filter(isClosed).map((p) => planCard(p, baseSymbol)),
    ...weddings.filter((w) => w.status === "DONE").map((w) => weddingCard(w, baseSymbol)),
  ];

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

  const tiles = [...PLANNER_TYPES, WEDDING_TILE];

  return (
    <>
      <PageHeader
        section="Planning"
        title="Plans"
        description="Big things you're paying for over time – a trip, a house move, a renovation, a wedding."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New plan</Button>}
      />

      {activeCards.length === 0 && closedCards.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No plans yet"
          description="Big things you're paying for over time – a trip, a house move, a renovation, a wedding."
          action={{ label: "New plan", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="space-y-8">
          {activeCards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">{activeCards}</div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing active right now.</p>
          )}
          {closedCards.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors select-none">
                Completed &amp; cancelled ({closedCards.length})
              </summary>
              <div className="grid gap-3 sm:grid-cols-2 mt-4">{closedCards}</div>
            </details>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Plan type">
              {tiles.map((t) => (
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

            {type === "WEDDING" ? (
              <WeddingCreateForm baseSymbol={baseSymbol} onCreated={() => setOpen(false)} />
            ) : (
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
