"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { createWeddingPlan } from "@/actions/wedding";

/** The new-wedding form. On success it opens the new wedding plan. */
export function WeddingCreateForm({ baseSymbol = "Rs", onCreated }: { baseSymbol?: string; onCreated?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brideName: "", groomName: "", weddingDate: "", haqMehr: "", haqMehrNote: "", notes: "",
  });
  const set = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }));

  async function onSubmit() {
    if (!form.brideName.trim() || !form.groomName.trim()) return;
    const haqMehr = form.haqMehr.trim() ? parseMoney(form.haqMehr) : undefined;
    if (haqMehr === null) { toast.error("Check the amounts - use a number or a sum like 300000+50000"); return; }
    setLoading(true);
    const result = await createWeddingPlan({
      brideName: form.brideName,
      groomName: form.groomName,
      weddingDate: form.weddingDate || undefined,
      haqMehr,
      haqMehrNote: form.haqMehrNote || undefined,
      notes: form.notes || undefined,
    });
    if (result.success && result.data) {
      toast.success("Wedding plan created!");
      onCreated?.();
      router.push(`/wedding/${result.data.id}`);
    } else {
      toast.error(result.error ?? "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Bride&apos;s name</Label>
          <Input placeholder="e.g. Fatima" value={form.brideName} onChange={(e) => set({ brideName: e.target.value })} />
        </div>
        <div>
          <Label>Groom&apos;s name</Label>
          <Input placeholder="e.g. Ahmed" value={form.groomName} onChange={(e) => set({ groomName: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Wedding date (optional)</Label>
        <Input type="date" value={form.weddingDate} onChange={(e) => set({ weddingDate: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Haq Mehr - {baseSymbol} (optional)</Label>
          <MoneyInput placeholder="e.g. 500000" value={form.haqMehr} onChange={(e) => set({ haqMehr: e.target.value })} />
        </div>
        <div>
          <Label>Haq Mehr note (optional)</Label>
          <Input placeholder="e.g. 10 tola gold" value={form.haqMehrNote} onChange={(e) => set({ haqMehrNote: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea rows={2} placeholder="Any notes..." value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      <Button className="w-full" onClick={onSubmit} disabled={loading || !form.brideName.trim() || !form.groomName.trim()}>
        {loading ? "Creating..." : "Create wedding plan"}
      </Button>
    </div>
  );
}
