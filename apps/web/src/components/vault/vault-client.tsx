"use client";

import { useState } from "react";
import { Plus, Gift } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { createSurprise } from "@/actions/vault";
import { cn } from "@/lib/utils";
import { getDaysUntil } from "@/lib/utils";

interface Surprise {
  id: string; name: string; description: string | null; forWhom: string; occasion: string | null;
  targetDate: Date | null; estimatedBudget: number; actualSpent: number; status: string;
}

const STATUS_COLORS: Record<string, string> = {
  IDEA: "bg-slate-100 text-slate-600",
  PLANNING: "bg-blue-100 text-blue-700",
  BUYING: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
  DELIVERED: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
};

export function VaultClient({ surprises, baseSymbol = "Rs" }: { surprises: Surprise[]; baseSymbol?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", forWhom: "", occasion: "", targetDate: "", estimatedBudget: "" });

  async function handleCreate() {
    if (!form.name || !form.forWhom) return;
    setLoading(true);
    const result = await createSurprise({ ...form, estimatedBudget: parseFloat(form.estimatedBudget) || 0, targetDate: form.targetDate || undefined });
    if (result.success) { toast.success("Surprise created! 🎁"); setOpen(false); setForm({ name: "", description: "", forWhom: "", occasion: "", targetDate: "", estimatedBudget: "" }); }
    else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="bg-rose-500 hover:bg-rose-600">
          <Plus className="h-4 w-4" />New Surprise
        </Button>
      </div>

      {surprises.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No surprises planned yet"
          description="Plan secret gifts and surprises - only you can see these!"
          action={{ label: "Plan a surprise", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surprises.map((s) => {
            const daysLeft = getDaysUntil(s.targetDate);
            const budgetPct = s.estimatedBudget > 0 ? Math.round((s.actualSpent / s.estimatedBudget) * 100) : 0;
            return (
              <Link key={s.id} href={`/vault/${s.id}`} className="block group">
                <div className="bg-card border border-rose-100 dark:border-rose-900 rounded-xl p-5 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-rose-500 transition-colors">{s.name}</div>
                      <div className="text-xs text-rose-500 mt-0.5">For: {s.forWhom}</div>
                    </div>
                    <Badge className={cn("text-xs", STATUS_COLORS[s.status])}>{s.status}</Badge>
                  </div>
                  {s.occasion && <Badge variant="outline" className="text-xs mb-2">{s.occasion}</Badge>}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget</span>
                      <span>{baseSymbol} {(s.estimatedBudget / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="text-rose-500">{baseSymbol} {(s.actualSpent / 100).toLocaleString()}</span>
                    </div>
                    {daysLeft !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className={cn("font-medium", daysLeft < 7 ? "text-red-500" : "text-muted-foreground")}>
                          {s.targetDate ? format(new Date(s.targetDate), "d MMM") : "-"} {daysLeft > 0 ? `(${daysLeft}d)` : "(passed)"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Plan a Surprise 🎁</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Surprise Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Birthday Gift for Wife" /></div>
            <div><Label>For Whom</Label><Input value={form.forWhom} onChange={(e) => setForm((p) => ({ ...p, forWhom: e.target.value }))} placeholder="e.g. Wife, Mum, Friend" /></div>
            <div><Label>Occasion (optional)</Label><Input value={form.occasion} onChange={(e) => setForm((p) => ({ ...p, occasion: e.target.value }))} placeholder="e.g. Birthday, Anniversary, Eid" /></div>
            <div><Label>Target Date</Label><Input type="date" value={form.targetDate} onChange={(e) => setForm((p) => ({ ...p, targetDate: e.target.value }))} /></div>
            <div><Label>Estimated Budget ({baseSymbol})</Label><Input type="number" value={form.estimatedBudget} onChange={(e) => setForm((p) => ({ ...p, estimatedBudget: e.target.value }))} /></div>
            <div><Label>Notes (optional)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ideas, notes..." /></div>
            <Button className="w-full bg-rose-500 hover:bg-rose-600" onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Create Surprise 🎁"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
