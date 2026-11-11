"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWeddingPlan } from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { allocatedTotal } from "@/lib/wedding/totals";
import { WeddingPlan, PLAN_STATUS_CONFIG, fmt } from "./wedding-types";

/** "" -> undefined (leave alone... handled by caller), number/sum -> value, bad -> null */
function money(text: string): number | null | undefined {
  if (!text.trim()) return undefined;
  const r = evaluateAmount(text);
  return r.ok ? r.value : null;
}

function PlanForm({ plan, baseSymbol, onDone }: { plan: WeddingPlan; baseSymbol: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    brideName: plan.brideName,
    groomName: plan.groomName,
    weddingDate: plan.weddingDate ? format(new Date(plan.weddingDate), "yyyy-MM-dd") : "",
    totalBudget: plan.totalBudget ? String(plan.totalBudget / 100) : "",
    haqMehr: plan.haqMehr ? String(plan.haqMehr / 100) : "",
    haqMehrNote: plan.haqMehrNote ?? "",
    notes: plan.notes ?? "",
    status: plan.status,
  });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));
  const allocated = allocatedTotal(plan.events);

  async function save() {
    const budget = money(f.totalBudget);
    const mehr = money(f.haqMehr);
    if (budget === null || mehr === null) { toast.error("Check the amounts - use a number or a sum like 300000+50000"); return; }
    if (!f.brideName.trim() || !f.groomName.trim()) { toast.error("Both names are needed"); return; }
    setLoading(true);
    const result = await updateWeddingPlan(plan.id, {
      brideName: f.brideName.trim(),
      groomName: f.groomName.trim(),
      weddingDate: f.weddingDate || undefined,
      totalBudget: budget ?? 0,
      haqMehr: mehr ?? 0,
      haqMehrNote: f.haqMehrNote,
      notes: f.notes,
      status: f.status,
    });
    setLoading(false);
    if (result.success) { toast.success("Saved"); onDone(); } else toast.error(result.error ?? "Failed");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Bride&apos;s name</Label><Input value={f.brideName} onChange={(e) => set({ brideName: e.target.value })} /></div>
        <div><Label>Groom&apos;s name</Label><Input value={f.groomName} onChange={(e) => set({ groomName: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Wedding date</Label><Input type="date" value={f.weddingDate} onChange={(e) => set({ weddingDate: e.target.value })} /></div>
        <div>
          <Label>Status</Label>
          <Select value={f.status} onValueChange={(v) => set({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(PLAN_STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Total budget ({baseSymbol})</Label>
        <Input inputMode="decimal" placeholder="e.g. 2500000" value={f.totalBudget} onChange={(e) => set({ totalBudget: e.target.value })} />
        {allocated > 0 && <p className="mt-1 text-xs text-muted-foreground">Events have {fmt(allocated, baseSymbol)} set aside so far.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Haq Mehr ({baseSymbol})</Label>
          <Input inputMode="decimal" value={f.haqMehr} onChange={(e) => set({ haqMehr: e.target.value })} />
        </div>
        <div><Label>Haq Mehr note</Label><Input placeholder="e.g. 10 tola gold" value={f.haqMehrNote} onChange={(e) => set({ haqMehrNote: e.target.value })} /></div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Haq Mehr is kept separate from your expenses and budget.</p>
      <div><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
      <Button className="w-full" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
    </div>
  );
}

export function PlanDialog({ open, onOpenChange, plan, baseSymbol, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; plan: WeddingPlan; baseSymbol: string; onDone: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit wedding plan</DialogTitle></DialogHeader>
        {open && <PlanForm plan={plan} baseSymbol={baseSymbol} onDone={() => { onOpenChange(false); onDone(); }} />}
      </DialogContent>
    </Dialog>
  );
}
