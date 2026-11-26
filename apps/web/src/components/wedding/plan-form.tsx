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
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { WeddingPlan, PLAN_STATUS_CONFIG } from "./wedding-types";

/** "" -> undefined (leave alone... handled by caller), number/sum -> value, bad -> null */
function money(text: string): number | null | undefined {
  if (!text.trim()) return undefined;
  return parseMoney(text);
}

function PlanForm({ plan, baseSymbol, onDone }: { plan: WeddingPlan; baseSymbol: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    brideName: plan.brideName,
    groomName: plan.groomName,
    weddingDate: plan.weddingDate ? format(new Date(plan.weddingDate), "yyyy-MM-dd") : "",
    haqMehr: plan.haqMehr ? String(plan.haqMehr / 100) : "",
    haqMehrNote: plan.haqMehrNote ?? "",
    notes: plan.notes ?? "",
    status: plan.status,
  });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));

  async function save() {
    const mehr = money(f.haqMehr);
    if (mehr === null) { toast.error("Check the amounts - use a number or a sum like 300000+50000"); return; }
    if (!f.brideName.trim() || !f.groomName.trim()) { toast.error("Both names are needed"); return; }
    setLoading(true);
    const result = await updateWeddingPlan(plan.id, {
      brideName: f.brideName.trim(),
      groomName: f.groomName.trim(),
      weddingDate: f.weddingDate || undefined,
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Haq Mehr ({baseSymbol})</Label>
          <MoneyInput value={f.haqMehr} onChange={(e) => set({ haqMehr: e.target.value })} />
        </div>
        <div><Label>Haq Mehr note</Label><Input placeholder="e.g. 10 tola gold" value={f.haqMehrNote} onChange={(e) => set({ haqMehrNote: e.target.value })} /></div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Haq Mehr is kept separate from your expenses and budget. The budget is set per event.</p>
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
