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
import { createWeddingEvent, updateWeddingEvent } from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { WeddingEvent, EVENT_TYPES, fmt } from "./wedding-types";

const DEFAULT_EVENT_NAMES: Record<string, string> = {
  DHOLKI: "Dholki", MAYUN: "Mayun", MEHNDI: "Mehndi",
  NIKKAH: "Nikkah", BARAT: "Barat", RUKHSATI: "Rukhsati",
  VALIMA: "Valima", OTHER: "",
};

export function EventForm({
  initial,
  weddingPlanId,
  onDone,
  editId,
  baseSymbol = "Rs",
  plannedSoFar,
}: {
  initial?: Partial<WeddingEvent>;
  weddingPlanId: string;
  onDone: (createdId?: string) => void;
  editId?: string;
  baseSymbol?: string;
  /** Shown when editing: what is planned across this event's expenses. */
  plannedSoFar?: { amount: number; count: number };
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: initial?.type ?? "NIKKAH",
    name: initial?.name ?? "Nikkah",
    date: initial?.date ? format(new Date(initial.date), "yyyy-MM-dd") : "",
    venue: initial?.venue ?? "",
    guestCount: initial?.guestCount ? String(initial.guestCount) : "",
    budgetAllocated: initial?.budgetAllocated ? String(initial.budgetAllocated / 100) : "",
    notes: initial?.notes ?? "",
    status: initial?.status ?? "PLANNED",
    responsibleParty: initial?.responsibleParty ?? "JOINT",
  });

  async function onSubmit() {
    if (!form.name.trim()) return;
    let budget: number | undefined;
    if (form.budgetAllocated.trim()) {
      const r = evaluateAmount(form.budgetAllocated);
      if (!r.ok) { toast.error(r.error); return; }
      budget = r.value;
    }
    setLoading(true);
    const data = {
      type: form.type,
      name: form.name,
      date: form.date || undefined,
      venue: form.venue || undefined,
      guestCount: form.guestCount ? parseInt(form.guestCount) : undefined,
      budgetAllocated: budget,
      notes: form.notes || undefined,
      status: form.status,
      responsibleParty: form.responsibleParty,
    };
    const result = editId
      ? await updateWeddingEvent(editId, data)
      : await createWeddingEvent(weddingPlanId, { ...data, order: EVENT_TYPES.findIndex((e) => e.value === form.type) });
    if (result.success) {
      toast.success(editId ? "Event updated" : "Event added");
      onDone(!editId && result.success && "data" in result ? (result.data as { id: string } | undefined)?.id : undefined);
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Event Type</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm((p) => ({ ...p, type: v, name: DEFAULT_EVENT_NAMES[v] || p.name }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.emoji} {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Event Name</Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date (optional)</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
        </div>
        <div>
          <Label>Guest Count (optional)</Label>
          <Input type="number" placeholder="e.g. 300" value={form.guestCount} onChange={(e) => setForm((p) => ({ ...p, guestCount: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Venue (optional)</Label>
        <Input placeholder="e.g. Pearl Continental Hotel" value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} />
      </div>
      <div>
        <Label>Budget Allocated - {baseSymbol} (optional)</Label>
        <Input inputMode="decimal" placeholder="e.g. 500000 or 300000+50000" value={form.budgetAllocated} onChange={(e) => setForm((p) => ({ ...p, budgetAllocated: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Responsible Party</Label>
          <Select value={form.responsibleParty} onValueChange={(v) => setForm((p) => ({ ...p, responsibleParty: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="JOINT">Joint</SelectItem>
              <SelectItem value="BRIDE">Bride's Family</SelectItem>
              <SelectItem value="GROOM">Groom's Family</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
      </div>
      {plannedSoFar && plannedSoFar.count > 0 && (
        <p className="text-xs text-muted-foreground">{fmt(plannedSoFar.amount, baseSymbol)} planned across {plannedSoFar.count} expense{plannedSoFar.count === 1 ? "" : "s"}</p>
      )}
      <Button className="w-full" onClick={onSubmit} disabled={loading || !form.name}>
        {loading ? "Saving..." : editId ? "Save Changes" : "Add Event"}
      </Button>
    </div>
  );
}


export function EventDialog({ open, onOpenChange, weddingPlanId, event, baseSymbol, plannedSoFar, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; weddingPlanId: string; event?: WeddingEvent | null; baseSymbol: string;
  plannedSoFar?: { amount: number; count: number }; onDone: (createdId?: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{event ? `Edit ${event.name}` : "Add event"}</DialogTitle></DialogHeader>
        {/* keyed so each open starts from that event's values */}
        <EventForm
          key={event?.id ?? "new"}
          weddingPlanId={weddingPlanId}
          initial={event ?? undefined}
          editId={event?.id}
          baseSymbol={baseSymbol}
          plannedSoFar={plannedSoFar}
          onDone={(id) => { onOpenChange(false); onDone(id); }}
        />
      </DialogContent>
    </Dialog>
  );
}
