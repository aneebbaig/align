"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertInvestmentPlan } from "@/actions/investments";
import { BLANK_ADD_FORM, TYPES, type PlanCategory } from "./investment-types";

/** Creates the plan category only - no money yet. */
export function AddInvestmentDialog({ open, onOpenChange, plan }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: { monthlyTarget: number; autoFromSurplus: boolean; categories: PlanCategory[] } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add investment</DialogTitle></DialogHeader>
        <AddForm plan={plan} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddForm({ plan, onDone }: { plan: { monthlyTarget: number; autoFromSurplus: boolean; categories: PlanCategory[] } | null; onDone: () => void }) {
  const [form, setForm] = useState(BLANK_ADD_FORM);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || pending) return;
    setPending(true);
    const result = await upsertInvestmentPlan({
      monthlyTarget: plan ? plan.monthlyTarget / 100 : undefined,
      autoFromSurplus: plan?.autoFromSurplus,
      categories: [
        ...(plan?.categories ?? []).map((c) => ({ id: c.id, name: c.name, investmentType: c.investmentType, percentage: c.percentage })),
        { name: form.name.trim(), investmentType: form.type, percentage: parseFloat(form.percentage) || 0 },
      ],
    });
    if (result.success) {
      toast.success("Investment added — add money to it any time");
      onDone();
    } else {
      toast.error(result.error ?? "Failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input autoFocus placeholder="e.g. MZNPETF, Gold, Direct stocks" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target split % <span className="text-muted-foreground">(optional)</span></Label>
          <Input type="number" value={form.percentage} onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))} />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        This adds it to your plan. Once created, add money into it any time from the list below.
      </p>
      <Button type="submit" disabled={pending || !form.name.trim()} className="w-full">Add to plan</Button>
    </form>
  );
}
