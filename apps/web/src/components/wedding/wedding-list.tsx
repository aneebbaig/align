"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { budgetOfEvents, sumTotals } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetMeter, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { WeddingCreateForm } from "./create-form";
import { WeddingPlan, PLAN_STATUS_CONFIG, fmt } from "./wedding-types";

function WeddingCard({ plan, sym }: { plan: WeddingPlan; sym: string }) {
  const t = sumTotals(plan.expenses);
  const budget = budgetOfEvents(plan.events);
  const tone = BUDGET_TONE[budget > 0 ? (t.projected > budget ? "over" : "ok") : "none"];
  return (
    <Link href={`/wedding/${plan.id}`} className={cn("block rounded-xl border border-border bg-card p-5 space-y-3 transition-colors hover:border-foreground/20", plan.status === "DONE" && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{plan.brideName} &amp; {plan.groomName}</p>
          <p className="text-sm text-muted-foreground">{plan.weddingDate ? format(new Date(plan.weddingDate), "d MMM yyyy") : "No date yet"}</p>
        </div>
        {plan.status === "DONE" && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PLAN_STATUS_CONFIG.DONE.badge)}>Done</span>}
      </div>
      <BudgetMeter size="sm" projected={t.projected} paid={t.paid} budget={budget} symbol={sym} />
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
        <span>Paid {fmt(t.paid, sym)} · To pay {fmt(t.outstanding, sym)}</span>
        {budget > 0 && <span className={cn("font-medium", tone.text)}>{budgetCopy(t.projected, budget, sym, true)}</span>}
      </div>
    </Link>
  );
}

export function WeddingList({ plans, baseSymbol: sym }: { plans: WeddingPlan[]; baseSymbol: string }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Weddings</h1>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New wedding</Button>
      </div>
      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No wedding planned yet.</p>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Plan a wedding</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {plans.map((p) => <WeddingCard key={p.id} plan={p} sym={sym} />)}
        </div>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New wedding</DialogTitle></DialogHeader>
          <WeddingCreateForm baseSymbol={sym} onCreated={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
