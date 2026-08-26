"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createWeddingEvent, updateWeddingEvent, deleteWeddingEvent } from "@/actions/wedding";
import { cn } from "@/lib/utils";
import {
  WeddingPlan, WeddingEvent, EVENT_TYPES, EVENT_STATUS_CONFIG, fmt, getEventInfo,
} from "./wedding-types";

const RESPONSIBLE_LABELS: Record<string, string> = {
  BRIDE: "Bride's Family",
  GROOM: "Groom's Family",
  JOINT: "Joint",
};

const DEFAULT_EVENT_NAMES: Record<string, string> = {
  DHOLKI: "Dholki", MAYUN: "Mayun", MEHNDI: "Mehndi",
  NIKKAH: "Nikkah", BARAT: "Barat", RUKHSATI: "Rukhsati",
  VALIMA: "Valima", OTHER: "",
};

function EventForm({
  initial,
  weddingPlanId,
  onDone,
  editId,
  baseSymbol = "Rs",
}: {
  initial?: Partial<WeddingEvent>;
  weddingPlanId: string;
  onDone: () => void;
  editId?: string;
  baseSymbol?: string;
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
    setLoading(true);
    const data = {
      type: form.type,
      name: form.name,
      date: form.date || undefined,
      venue: form.venue || undefined,
      guestCount: form.guestCount ? parseInt(form.guestCount) : undefined,
      budgetAllocated: form.budgetAllocated ? parseFloat(form.budgetAllocated) : undefined,
      notes: form.notes || undefined,
      status: form.status,
      responsibleParty: form.responsibleParty,
    };
    const result = editId
      ? await updateWeddingEvent(editId, data)
      : await createWeddingEvent(weddingPlanId, { ...data, order: EVENT_TYPES.findIndex((e) => e.value === form.type) });
    if (result.success) {
      toast.success(editId ? "Event updated" : "Event added");
      onDone();
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
        <Input type="number" placeholder="e.g. 500000" value={form.budgetAllocated} onChange={(e) => setForm((p) => ({ ...p, budgetAllocated: e.target.value }))} />
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
      <Button className="w-full" onClick={onSubmit} disabled={loading || !form.name}>
        {loading ? "Saving..." : editId ? "Save Changes" : "Add Event"}
      </Button>
    </div>
  );
}

export function WeddingEventsTab({ plan, baseSymbol = "Rs" }: { plan: WeddingPlan; baseSymbol?: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<WeddingEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedEvents = [...plan.events].sort((a, b) => a.order - b.order);

  async function handleDelete() {
    if (!deleteId) return;
    await deleteWeddingEvent(deleteId);
    setDeleteId(null);
    toast.success("Event removed");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Wedding Events</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />Add Event
        </Button>
      </div>

      {sortedEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Add your wedding events - Dholki, Mehndi, Nikkah, Barat, Valima and more."
          action={{ label: "Add Event", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((event) => {
            const info = getEventInfo(event.type);
            const statusCfg = EVENT_STATUS_CONFIG[event.status] ?? EVENT_STATUS_CONFIG.PLANNED;
            return (
              <div key={event.id} className="border border-border rounded-xl p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl mt-0.5">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{event.name}</span>
                        <Badge className={cn("text-xs", statusCfg.badge)}>{statusCfg.label}</Badge>
                        <Badge variant="outline" className="text-xs">{RESPONSIBLE_LABELS[event.responsibleParty]}</Badge>
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
                        {event.date && <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(event.date), "EEEE, d MMMM yyyy")}</p>}
                        {event.venue && <p>📍 {event.venue}</p>}
                        {event.guestCount && <p>👥 {event.guestCount} guests</p>}
                        {event.budgetAllocated > 0 && <p>💰 Budget: {fmt(event.budgetAllocated, baseSymbol)}</p>}
                        {event.notes && <p className="text-xs mt-1 italic">{event.notes}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditEvent(event)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(event.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <EventForm weddingPlanId={plan.id} onDone={() => setAddOpen(false)} baseSymbol={baseSymbol} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editEvent} onOpenChange={(o) => !o && setEditEvent(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          {editEvent && (
            <EventForm
              initial={editEvent}
              weddingPlanId={plan.id}
              editId={editEvent.id}
              onDone={() => setEditEvent(null)}
              baseSymbol={baseSymbol}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove event?"
        description="This will remove the event from your wedding plan."
        onConfirm={handleDelete}
      />
    </div>
  );
}
