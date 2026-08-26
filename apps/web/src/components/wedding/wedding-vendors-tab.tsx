"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Phone, AtSign, ChevronDown, ChevronUp } from "lucide-react";
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
import {
  createWeddingVendor, updateWeddingVendor, deleteWeddingVendor, selectWeddingVendor,
} from "@/actions/wedding";
import { cn } from "@/lib/utils";
import {
  WeddingPlan, WeddingVendor, WeddingEvent,
  VENDOR_CATEGORIES, PAYMENT_STATUS_CONFIG, EVENT_TYPES,
  fmt, getCategoryLabel, getEventInfo,
} from "./wedding-types";

function VendorForm({
  initial,
  weddingPlanId,
  events,
  defaultEventId,
  onDone,
  editId,
  baseSymbol = "Rs",
}: {
  initial?: Partial<WeddingVendor>;
  weddingPlanId: string;
  events: WeddingEvent[];
  defaultEventId?: string | null;
  onDone: () => void;
  editId?: string;
  baseSymbol?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: initial?.category ?? "PHOTOGRAPHY",
    name: initial?.name ?? "",
    eventId: initial?.eventId ?? defaultEventId ?? "",
    phone: initial?.phone ?? "",
    instagram: initial?.instagram ?? "",
    quotedAmount: initial?.quotedAmount ? String(initial.quotedAmount / 100) : "",
    finalAmount: initial?.finalAmount ? String(initial.finalAmount / 100) : "",
    depositPaid: initial?.depositPaid ? String(initial.depositPaid / 100) : "",
    paymentStatus: initial?.paymentStatus ?? "UNPAID",
    notes: initial?.notes ?? "",
  });

  async function onSubmit() {
    if (!form.name.trim()) return;
    setLoading(true);
    const data = {
      category: form.category,
      name: form.name,
      eventId: form.eventId || undefined,
      phone: form.phone || undefined,
      instagram: form.instagram || undefined,
      quotedAmount: form.quotedAmount ? parseFloat(form.quotedAmount) : undefined,
      finalAmount: form.finalAmount ? parseFloat(form.finalAmount) : undefined,
      depositPaid: form.depositPaid ? parseFloat(form.depositPaid) : undefined,
      paymentStatus: form.paymentStatus,
      notes: form.notes || undefined,
    };
    const result = editId
      ? await updateWeddingVendor(editId, data)
      : await createWeddingVendor(weddingPlanId, data);
    if (result.success) {
      toast.success(editId ? "Vendor updated" : "Vendor added");
      onDone();
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>For which event?</Label>
        <Select value={form.eventId} onValueChange={(v) => setForm((p) => ({ ...p, eventId: v === "__general__" ? "" : v }))}>
          <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__general__">General (whole wedding)</SelectItem>
            {events.map((e) => {
              const info = getEventInfo(e.type);
              return (
                <SelectItem key={e.id} value={e.id}>
                  {info.emoji} {e.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VENDOR_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Vendor Name</Label>
          <Input placeholder="e.g. Moments Studio" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phone (optional)</Label>
          <Input placeholder="+92 300 ..." value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <Label>Instagram (optional)</Label>
          <Input placeholder="@studio.pk" value={form.instagram} onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quoted Amount - {baseSymbol}</Label>
          <Input type="number" placeholder="e.g. 80000" value={form.quotedAmount} onChange={(e) => setForm((p) => ({ ...p, quotedAmount: e.target.value }))} />
        </div>
        <div>
          <Label>Final/Negotiated - {baseSymbol}</Label>
          <Input type="number" placeholder="e.g. 70000" value={form.finalAmount} onChange={(e) => setForm((p) => ({ ...p, finalAmount: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Deposit Paid - {baseSymbol}</Label>
          <Input type="number" value={form.depositPaid} onChange={(e) => setForm((p) => ({ ...p, depositPaid: e.target.value }))} />
        </div>
        <div>
          <Label>Payment Status</Label>
          <Select value={form.paymentStatus} onValueChange={(v) => setForm((p) => ({ ...p, paymentStatus: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
              <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea rows={2} placeholder="Packages, terms, special notes..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
      </div>
      <Button className="w-full" onClick={onSubmit} disabled={loading || !form.name}>
        {loading ? "Saving..." : editId ? "Save Changes" : "Add Vendor"}
      </Button>
    </div>
  );
}

function VendorCard({
  vendor,
  weddingPlanId,
  onEdit,
  onDelete,
  baseSymbol = "Rs",
}: {
  vendor: WeddingVendor;
  weddingPlanId: string;
  onEdit: (v: WeddingVendor) => void;
  onDelete: (id: string) => void;
  baseSymbol?: string;
}) {
  const [toggling, setToggling] = useState(false);
  const paymentCfg = PAYMENT_STATUS_CONFIG[vendor.paymentStatus] ?? PAYMENT_STATUS_CONFIG.UNPAID;
  const effectiveAmount = vendor.finalAmount ?? vendor.quotedAmount;

  async function handleSelect() {
    setToggling(true);
    const result = vendor.isSelected
      ? await updateWeddingVendor(vendor.id, { isSelected: false })
      : await selectWeddingVendor(vendor.id, weddingPlanId, vendor.category, vendor.eventId);
    if (!result.success) toast.error(result.error ?? "Failed");
    setToggling(false);
  }

  return (
    <div className={cn(
      "border rounded-xl p-3.5 transition-all",
      vendor.isSelected
        ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
        : "border-border bg-card"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{vendor.name}</span>
            {vendor.isSelected && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />Selected
              </Badge>
            )}
            <Badge className={cn("text-xs", paymentCfg.badge)}>{paymentCfg.label}</Badge>
          </div>
          <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Quote: <span className="font-medium text-foreground">{fmt(vendor.quotedAmount, baseSymbol)}</span></span>
              {vendor.finalAmount && vendor.finalAmount !== vendor.quotedAmount && (
                <span>Final: <span className="font-medium text-foreground">{fmt(vendor.finalAmount, baseSymbol)}</span></span>
              )}
              {vendor.depositPaid ? <span>Deposit: {fmt(vendor.depositPaid, baseSymbol)}</span> : null}
            </div>
            {(vendor.phone || vendor.instagram) && (
              <div className="flex items-center gap-3">
                {vendor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{vendor.phone}</span>}
                {vendor.instagram && <span className="flex items-center gap-1"><AtSign className="h-3 w-3" />{vendor.instagram}</span>}
              </div>
            )}
            {vendor.notes && <p className="text-xs italic">{vendor.notes}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 items-start">
          <button
            onClick={handleSelect}
            disabled={toggling}
            title={vendor.isSelected ? "Deselect" : "Select as final vendor"}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              vendor.isSelected
                ? "text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button onClick={() => onEdit(vendor)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(vendor.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EventVendorSection({
  title,
  emoji,
  eventId,
  vendors,
  weddingPlanId,
  events,
  onEdit,
  onDelete,
  onAddVendor,
  baseSymbol = "Rs",
}: {
  title: string;
  emoji: string;
  eventId: string | null;
  vendors: WeddingVendor[];
  weddingPlanId: string;
  events: WeddingEvent[];
  onEdit: (v: WeddingVendor) => void;
  onDelete: (id: string) => void;
  onAddVendor: (eventId: string | null) => void;
  baseSymbol?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Group by category within this event
  const byCategory = VENDOR_CATEGORIES.reduce<Record<string, WeddingVendor[]>>((acc, cat) => {
    const vs = vendors.filter((v) => v.category === cat.value);
    if (vs.length > 0) acc[cat.value] = vs;
    return acc;
  }, {});

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">({vendors.length} vendor{vendors.length !== 1 ? "s" : ""})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAddVendor(eventId); }}
            className="text-xs text-primary hover:underline font-medium"
          >
            + Add
          </button>
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
      {!collapsed && (
        <div className="p-3 space-y-4">
          {Object.entries(byCategory).map(([catValue, cvs]) => {
            const selected = cvs.find((v) => v.isSelected);
            return (
              <div key={catValue}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{getCategoryLabel(catValue)}</span>
                  {selected && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ {selected.name} - {fmt(selected.finalAmount ?? selected.quotedAmount, baseSymbol)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {cvs.map((v) => (
                    <VendorCard
                      key={v.id}
                      vendor={v}
                      weddingPlanId={weddingPlanId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      baseSymbol={baseSymbol}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {vendors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No vendors yet. Add one above.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function WeddingVendorsTab({ plan, baseSymbol = "Rs" }: { plan: WeddingPlan; baseSymbol?: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultEventId, setAddDefaultEventId] = useState<string | null>(null);
  const [editVendor, setEditVendor] = useState<WeddingVendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openAddFor(eventId: string | null) {
    setAddDefaultEventId(eventId);
    setAddOpen(true);
  }

  const sortedEvents = [...plan.events].sort((a, b) => a.order - b.order);

  // Vendors per event
  const vendorsByEvent: Record<string, WeddingVendor[]> = {};
  const generalVendors: WeddingVendor[] = [];
  for (const v of plan.vendors) {
    if (v.eventId) {
      if (!vendorsByEvent[v.eventId]) vendorsByEvent[v.eventId] = [];
      vendorsByEvent[v.eventId].push(v);
    } else {
      generalVendors.push(v);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteWeddingVendor(deleteId);
    setDeleteId(null);
    toast.success("Vendor removed");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Vendors</h3>
          <p className="text-xs text-muted-foreground">Each event has its own vendor list. Shortlist multiple, tap ✓ to finalize one per category.</p>
        </div>
        <Button size="sm" onClick={() => openAddFor(null)}>
          <Plus className="h-3.5 w-3.5" />Add Vendor
        </Button>
      </div>

      {plan.vendors.length === 0 && plan.events.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="No vendors yet"
          description="Add events first, then add vendors per event. Compare quotes and select the best one."
          action={{ label: "Add Vendor", onClick: () => setAddOpen(true) }}
        />
      )}

      <div className="space-y-3">
        {sortedEvents.map((event) => {
          const info = getEventInfo(event.type);
          return (
            <EventVendorSection
              key={event.id}
              title={event.name}
              emoji={info.emoji}
              eventId={event.id}
              vendors={vendorsByEvent[event.id] ?? []}
              weddingPlanId={plan.id}
              events={plan.events}
              onEdit={setEditVendor}
              onDelete={setDeleteId}
              onAddVendor={openAddFor}
              baseSymbol={baseSymbol}
            />
          );
        })}

        {/* General vendors section */}
        <EventVendorSection
          title="General (whole wedding)"
          emoji="💍"
          eventId={null}
          vendors={generalVendors}
          weddingPlanId={plan.id}
          events={plan.events}
          onEdit={setEditVendor}
          onDelete={setDeleteId}
          onAddVendor={openAddFor}
          baseSymbol={baseSymbol}
        />
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddDefaultEventId(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <VendorForm
            weddingPlanId={plan.id}
            events={plan.events}
            defaultEventId={addDefaultEventId}
            onDone={() => { setAddOpen(false); setAddDefaultEventId(null); }}
            baseSymbol={baseSymbol}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVendor} onOpenChange={(o) => !o && setEditVendor(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
          {editVendor && (
            <VendorForm
              initial={editVendor}
              weddingPlanId={plan.id}
              events={plan.events}
              editId={editVendor.id}
              onDone={() => setEditVendor(null)}
              baseSymbol={baseSymbol}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove vendor?"
        description="This vendor will be removed from your wedding plan."
        onConfirm={handleDelete}
      />
    </div>
  );
}
