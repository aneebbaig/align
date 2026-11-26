"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Circle, GripVertical, Loader2, MoreHorizontal, Pencil, Plus, Receipt, Play, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InlineAmount } from "@/components/shared/inline-fields";
import { LogExpensePopover } from "@/components/plans/log-expense-popover";
import type { ComboCategory } from "@/components/shared/category-combobox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DueChip } from "@/components/shared/due-chip";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createPlannerItem, updatePlannerItem, deletePlannerItem, updatePlannerStatus, updatePlanner, deletePlanner,
  markPlanItemBought, reorderPlannerItems,
} from "@/actions/plan";
import { evaluateAmount } from "@/lib/amount-expr";
import { planTotals } from "@/lib/plans/totals";
import { cn } from "@/lib/utils";
import { fmt } from "@/components/wedding/wedding-types";

interface PlanItem {
  id: string; planId: string; name: string; description: string | null;
  estimatedCost: number; actualCost: number | null; status: string;
  dueDate: Date | null; notes: string | null; eventGroup: string | null;
}
interface Plan {
  id: string; name: string; description: string | null; coverColor: string;
  type: string; status: string; completedAt: Date | null; estimatedTotalCost: number;
  targetDate: Date | null; items: PlanItem[];
}
interface FinancialPosition { liquidAvailable: number }

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Archived",
};

const GENERIC_GROUPS = ["Phase 1", "Phase 2", "Phase 3", "Venue", "Catering", "Decor", "Transport", "Other"];
const HEADING = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
const asText = (paisas: number) => (paisas ? String(paisas / 100) : "");
const dateText = (d: Date | null) => (d ? format(new Date(d), "yyyy-MM-dd") : "");

/** "" -> null (blank), a number or sum -> its value, anything else -> undefined (invalid). */
function parseOptMoney(text: string): number | null | undefined {
  if (!text.trim()) return null;
  if (/^0+(\.0*)?$/.test(text.trim())) return 0;
  const r = evaluateAmount(text);
  return r.ok ? r.value : undefined;
}

// A row that can be dragged by its handle. `children` receives the handle to place.
function SortableRow({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="cursor-grab touch-none text-muted-foreground hover:text-foreground p-1 -ml-1"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      {children(handle)}
    </div>
  );
}

// One draggable list (a group, or the ungrouped items). Reports the new id sequence on drop.
function SortableItems({ items, onReorder, renderItem }: {
  items: PlanItem[];
  onReorder: (ids: string[]) => void;
  renderItem: (item: PlanItem, handle: React.ReactNode) => React.ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const dndId = useId(); // stable across server and client, so several lists on one page hydrate cleanly
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to).map((i) => i.id));
  }
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>{(handle) => renderItem(item, handle)}</SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// The handle stays out of the way until you point at, or tab into, the row (always on for touch).
const REVEAL = "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity";

// Small group chip on a row: pick an existing group, none, or type a new one - no sheet needed.
function GroupChip({ group, groups, onChange }: { group: string | null; groups: string[]; onChange: (g: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const pick = (g: string | null) => { setOpen(false); setText(""); if (g !== group) onChange(g); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={group ? `Group: ${group}` : "Add to a group"}
          className={cn("rounded-full border px-2 py-0.5 text-[11px] leading-4 transition-colors",
            group ? "border-border bg-muted/50 text-foreground hover:bg-muted" : "border-transparent text-muted-foreground/70 hover:border-border hover:text-foreground " + REVEAL)}
        >
          {group ?? "+ group"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1.5 space-y-1">
        {groups.map((g) => (
          <button key={g} type="button" onClick={() => pick(g)} className={cn("block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted truncate", g === group && "font-medium")}>{g}</button>
        ))}
        {group && <button type="button" onClick={() => pick(null)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted">No group</button>}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { e.preventDefault(); pick(text.trim()); } }}
          placeholder="New group – Enter"
          aria-label="New group name"
          className="h-8"
        />
      </PopoverContent>
    </Popover>
  );
}

function ItemRow({ item, handle, sym, busy, groups, categories, onToggle, onOpen, onSaveCost, onSetGroup, onChanged }: {
  item: PlanItem; handle: React.ReactNode; sym: string; busy: boolean; groups: string[]; categories: ComboCategory[];
  onToggle: () => void; onOpen: () => void;
  onSaveCost: (field: "estimatedCost" | "actualCost", value: number | null) => void;
  onSetGroup: (g: string | null) => void; onChanged: () => void;
}) {
  const bought = item.status === "PAID";
  const skipped = item.status === "SKIPPED";
  const hasSub = !!item.dueDate || !!item.notes;
  const [logOpen, setLogOpen] = useState(false);
  const cost = item.actualCost ?? item.estimatedCost;
  return (
    <div
      className={cn("group flex items-center gap-2 pl-3 pr-3 hover:bg-muted/40 transition-colors", skipped && "opacity-50")}
      onKeyDown={(e) => { if (e.key === "Enter" && e.altKey && !bought) { e.preventDefault(); setLogOpen(true); } }}
    >
      <div className={cn("w-5 shrink-0", REVEAL)}>{handle}</div>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-label={bought ? "Mark not bought" : "Mark bought"}
        title={bought ? "Bought - click to undo" : "Mark bought (no expense logged)"}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        {bought ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="flex-1 min-w-0 py-2.5">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <span className={cn("block font-medium truncate", bought && "line-through decoration-muted-foreground/40 text-muted-foreground")}>
            {item.name}
            {skipped && <span className="ml-2 text-xs font-normal text-muted-foreground">Skipped</span>}
          </span>
        </button>
        <div className="mt-0.5 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-muted-foreground">
          <GroupChip group={item.eventGroup} groups={groups} onChange={onSetGroup} />
          {hasSub && item.dueDate && (bought ? <span>Due {format(new Date(item.dueDate), "d MMM")}</span> : <DueChip date={item.dueDate} />)}
          {item.notes && <span className="truncate max-w-[14rem]">{item.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-[4.75rem] sm:w-24">
          <InlineAmount variant="bare" label={`Estimate for ${item.name}`} symbol={sym} valuePaisas={item.estimatedCost} onSave={(v) => onSaveCost("estimatedCost", v ?? 0)} />
        </div>
        <div className="w-[4.75rem] sm:w-24">
          <InlineAmount variant="bare" label={`Actual cost of ${item.name}`} symbol={sym} valuePaisas={item.actualCost} optional onSave={(v) => onSaveCost("actualCost", v)} />
        </div>
        {bought ? (
          <span className="h-8 w-8 shrink-0" />
        ) : (
          <LogExpensePopover
            open={logOpen} onOpenChange={setLogOpen}
            itemId={item.id} itemName={item.name} sym={sym} categories={categories}
            defaultAmount={cost ? String(cost / 100) : ""} onLogged={onChanged}
          >
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Log expense for ${item.name}`} title="Bought – log expense (Alt+Enter)" onClick={() => setLogOpen(true)}>
              <Receipt className="h-4 w-4" />
            </Button>
          </LogExpensePopover>
        )}
      </div>
    </div>
  );
}

function GroupHeader({ title, items }: { title: string; items: PlanItem[] }) {
  return (
    <div className="flex items-baseline gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{items.filter((i) => i.status === "PAID").length} of {items.length} bought</span>
    </div>
  );
}

// ─── item sheet ──────────────────────────────────────────────────────────────

const fieldsOf = (i: PlanItem) => ({
  name: i.name,
  estimate: asText(i.estimatedCost),
  actual: i.actualCost === null ? "" : String(i.actualCost / 100),
  dueDate: dateText(i.dueDate),
  eventGroup: i.eventGroup ?? "",
  notes: i.notes ?? "",
});

function SheetBody({ item, sym, groups, listId, categories, onChanged, onClose }: {
  item: PlanItem; sym: string; groups: string[]; listId: string; categories: ComboCategory[]; onChanged: () => void; onClose: () => void;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const saved = fieldsOf(item);
  const [d, setD] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof d>) => setD((p) => ({ ...p, ...patch }));
  const dirty = (Object.keys(saved) as (keyof typeof saved)[]).some((k) => d[k] !== saved[k]);
  const bought = item.status === "PAID";

  const est = parseOptMoney(d.estimate);
  const act = parseOptMoney(d.actual);
  const diff = typeof est === "number" && typeof act === "number" && est > 0 ? act - est : 0;

  // Saves the form; returns whether it worked. `quiet` skips the toast and refresh (used before logging).
  async function persist(quiet = false): Promise<boolean> {
    if (!d.name.trim()) { toast.error("Name can't be empty"); return false; }
    if (est === undefined) { toast.error("Check the estimate"); return false; }
    if (act === undefined) { toast.error("Check the actual cost"); return false; }
    setSaving(true);
    const r = await updatePlannerItem(item.id, {
      name: d.name,
      estimatedCost: est ?? 0,
      actualCost: act,
      dueDate: d.dueDate || null,
      eventGroup: d.eventGroup.trim() || null,
      notes: d.notes.trim() || null,
    });
    setSaving(false);
    if (!r.success) { toast.error(r.error ?? "Failed"); return false; }
    if (!quiet) { toast.success("Saved"); onChanged(); }
    return true;
  }
  const save = () => void persist();

  async function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.success) { toast.success(ok); onChanged(); } else toast.error(r.error ?? "Failed");
  }

  async function remove() {
    const r = await deletePlannerItem(item.id);
    setConfirmDelete(false);
    if (r.success) { toast.success("Item deleted"); onClose(); onChanged(); } else toast.error(r.error ?? "Failed");
  }

  return (
    <div className="space-y-6 overflow-y-auto pb-6 -mr-2 pr-2">
      <section className="space-y-4">
        <h3 className={HEADING}>Details</h3>
        <div className="space-y-1.5">
          <Label htmlFor="item-name">Name</Label>
          <Input id="item-name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="item-est">Estimate ({sym})</Label>
            <Input id="item-est" inputMode="decimal" value={d.estimate} onChange={(e) => set({ estimate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-act">Actual cost ({sym})</Label>
            <Input id="item-act" inputMode="decimal" value={d.actual} placeholder="Not known yet" onChange={(e) => set({ actual: e.target.value })} />
          </div>
        </div>
        {diff !== 0 && (
          <p className={cn("text-xs tabular-nums", diff > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
            {diff > 0 ? "+" : "−"}{fmt(Math.round(Math.abs(diff) * 100), sym)} {diff > 0 ? "more" : "less"} than estimated
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="item-due">Due date</Label>
            <Input id="item-due" type="date" value={d.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-group">Group</Label>
            <Input id="item-group" list={listId} value={d.eventGroup} placeholder="e.g. Phase 1" onChange={(e) => set({ eventGroup: e.target.value })} />
            <datalist id={listId}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={HEADING}>Notes</h3>
        <Textarea rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Quotation comparison, who to call..." />
      </section>

      <div className="space-y-2">
        <Button className="w-full" onClick={save} disabled={saving || !dirty}>{saving ? "Saving..." : "Save"}</Button>
        {!bought && (
          <LogExpensePopover
            open={logOpen} onOpenChange={setLogOpen}
            itemId={item.id} itemName={d.name.trim() || item.name} sym={sym} categories={categories}
            defaultAmount={String(act ?? est ?? "")} beforeLog={() => (dirty ? persist(true) : Promise.resolve(true))} onLogged={onChanged}
          >
            <Button type="button" variant="outline" className="w-full" disabled={busy || saving} onClick={() => setLogOpen(true)}>
              Bought – log expense
            </Button>
          </LogExpensePopover>
        )}
        {bought ? (
          <Button type="button" variant="ghost" className="w-full" disabled={busy || saving} onClick={() => run(() => updatePlannerItem(item.id, { status: "PENDING" }), "Marked not bought")}>
            Mark not bought
          </Button>
        ) : (
          <Button type="button" variant="ghost" className="w-full" disabled={busy || saving} onClick={() => run(() => markPlanItemBought(item.id), "Marked as bought")}>
            Mark bought without an expense
          </Button>
        )}
        <Button type="button" variant="ghost" className="w-full text-red-600 hover:text-red-600" onClick={() => setConfirmDelete(true)}>Delete item</Button>
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this item?" description="This cannot be undone." onConfirm={remove} />
    </div>
  );
}

function ItemSheet({ item, sym, groups, listId, categories, onClose, onChanged }: {
  item: PlanItem | null; sym: string; groups: string[]; listId: string; categories: ComboCategory[]; onClose: () => void; onChanged: () => void;
}) {
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:w-[480px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle className="truncate pr-8">{item?.name ?? ""}</SheetTitle>
        </SheetHeader>
        {/* Remounts when the saved cost or status changes, so the form never shows stale values. */}
        {item && <SheetBody key={`${item.id}:${item.status}:${item.actualCost}`} item={item} sym={sym} groups={groups} listId={listId} categories={categories} onChanged={onChanged} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

// ─── edit plan ───────────────────────────────────────────────────────────────

function EditPlanDialog({ plan, open, onOpenChange, onDone }: { plan: Plan; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [f, setF] = useState({ name: plan.name, description: plan.description ?? "", targetDate: dateText(plan.targetDate) });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!f.name.trim()) { toast.error("Name can't be empty"); return; }
    setSaving(true);
    const r = await updatePlanner(plan.id, { name: f.name.trim(), description: f.description.trim() || null, targetDate: f.targetDate || null });
    setSaving(false);
    if (r.success) { toast.success("Saved"); onOpenChange(false); onDone(); } else toast.error(r.error ?? "Failed");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit plan</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="plan-name">Name</Label><Input id="plan-name" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="plan-desc">Description</Label><Textarea id="plan-desc" rows={2} value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="plan-date">Target date</Label><Input id="plan-date" type="date" value={f.targetDate} onChange={(e) => setF((p) => ({ ...p, targetDate: e.target.value }))} /></div>
          <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export function PlanDetailClient({ plan, financialPosition, baseSymbol = "Rs", categories = [] }: { plan: Plan; financialPosition: FinancialPosition; baseSymbol?: string; categories?: ComboCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sym = baseSymbol;
  const refresh = () => router.refresh();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const groupListId = useId();

  // Drag-reorder shows instantly; the server order replaces it after the refresh.
  // It only applies to the items array it was made for, so fresh server data wins.
  const [override, setOverride] = useState<{ base: PlanItem[]; ids: string[] } | null>(null);
  const displayItems = override && override.base === plan.items
    ? [...plan.items].sort((a, b) => override.ids.indexOf(a.id) - override.ids.indexOf(b.id))
    : plan.items;

  const openId = params.get("item");
  const open = plan.items.find((i) => i.id === openId) ?? null;
  function setItemParam(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("item", id); else next.delete("item");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Estimates are planning only; a bought item is worth its actual cost.
  const totals = planTotals(plan.items);
  const stillToPay = totals.remaining;
  const paidCount = plan.items.filter((i) => i.status === "PAID").length;
  const scale = Math.max(totals.estimated, totals.paid, 1);
  const liquid = financialPosition.liquidAvailable;
  const covered = liquid >= stillToPay;
  // Clamp to 0-100: you can't cover a negative share (liquid in the red = 0% covered).
  const coveragePct = stillToPay > 0 ? Math.max(0, Math.min(100, Math.round((liquid / stillToPay) * 100))) : 100;

  const grouped: Record<string, PlanItem[]> = {};
  const ungrouped: PlanItem[] = [];
  for (const item of displayItems) {
    if (item.eventGroup) (grouped[item.eventGroup] ??= []).push(item);
    else ungrouped.push(item);
  }
  const groupNames = Array.from(new Set([...Object.keys(grouped), ...GENERIC_GROUPS]));
  const usedGroups = Object.keys(grouped);

  const meta = [
    plan.description,
    plan.targetDate ? `Target ${format(new Date(plan.targetDate), "d MMM yyyy")}` : null,
    STATUS_LABELS[plan.status] ?? plan.status,
    plan.completedAt ? `Completed on ${format(new Date(plan.completedAt), "d MMMM yyyy")}` : null,
  ].filter(Boolean).join(" · ");

  // ── add row ──
  const [name, setName] = useState("");
  const [estimate, setEstimate] = useState("");
  const [adding, setAdding] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  // The group new items go into; remembered per plan so a run of items lands together.
  const groupKey = `align:planGroup:${plan.id}`;
  const [newGroup, setNewGroup] = useState("");
  const [typingGroup, setTypingGroup] = useState(false);
  // localStorage is only readable after mount (reading it during render would mismatch the server HTML).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNewGroup(window.localStorage.getItem(groupKey) ?? ""); }, [groupKey]);
  function chooseGroup(g: string) {
    setNewGroup(g);
    if (g) window.localStorage.setItem(groupKey, g); else window.localStorage.removeItem(groupKey);
  }

  async function add() {
    if (!name.trim() || adding) return;
    const parsed = estimate.trim() ? evaluateAmount(estimate) : null;
    if (parsed && !parsed.ok) { toast.error(parsed.error); return; }
    setAdding(true);
    const r = await createPlannerItem(plan.id, { name: name.trim(), estimatedCost: parsed?.ok ? parsed.value : 0, eventGroup: newGroup || undefined });
    setAdding(false);
    if (!r.success) { toast.error(r.error ?? "Failed"); return; }
    setName(""); setEstimate(""); setTypingGroup(false);
    refresh();
    nameRef.current?.focus(); // keep going - brain-dump the next one
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void add(); } };

  // "/" jumps to the add row, unless you're already typing somewhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el?.matches("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      nameRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── item actions ──
  function setItemStatus(itemId: string, status: string) {
    startTransition(async () => {
      await updatePlannerItem(itemId, { status });
      refresh();
    });
  }

  function saveCost(itemId: string, field: "estimatedCost" | "actualCost", value: number | null) {
    startTransition(async () => {
      const r = await updatePlannerItem(itemId, { [field]: value });
      if (!r.success) toast.error(r.error ?? "Failed");
      refresh();
    });
  }

  function setItemGroup(itemId: string, group: string | null) {
    startTransition(async () => {
      const r = await updatePlannerItem(itemId, { eventGroup: group });
      if (!r.success) toast.error(r.error ?? "Failed");
      refresh();
    });
  }

  // Bought, without booking an expense.
  function markBought(itemId: string) {
    startTransition(async () => {
      const r = await markPlanItemBought(itemId);
      if (r.success) toast.success("Marked as bought", { action: { label: "Undo", onClick: () => setItemStatus(itemId, "PENDING") } });
      else toast.error(r.error ?? "Failed");
      refresh();
    });
  }

  // `ids` is the new order of one list; splice it into the full sequence in the
  // slots those items already occupy, so other groups stay put.
  async function handleReorder(ids: string[]) {
    const inList = new Set(ids);
    let next = 0;
    setOverride({ base: plan.items, ids: displayItems.map((i) => (inList.has(i.id) ? ids[next++] : i.id)) });
    const result = await reorderPlannerItems(plan.id, ids);
    if (!result.success) {
      toast.error(result.error ?? "Failed to reorder");
      setOverride(null);
    }
    refresh();
  }

  function setPlanStatus(status: string) {
    startTransition(async () => {
      const r = await updatePlannerStatus(plan.id, status);
      if (r.success) { toast.success(status === "IN_PROGRESS" ? "Plan started" : `Plan ${STATUS_LABELS[status].toLowerCase()}`); refresh(); } else toast.error(r.error ?? "Failed");
    });
  }

  async function removePlan() {
    await deletePlanner(plan.id);
    toast.success("Plan deleted");
    router.push("/plans");
  }

  const closed = plan.status === "COMPLETED" || plan.status === "CANCELLED";
  const renderRow = (item: PlanItem, handle: React.ReactNode) => (
    <ItemRow
      item={item} handle={handle} sym={sym} busy={isPending} groups={usedGroups} categories={categories}
      onSaveCost={(field, v) => saveCost(item.id, field, v)}
      onSetGroup={(g) => setItemGroup(item.id, g)}
      onChanged={refresh}
      onToggle={() => (item.status === "PAID" ? setItemStatus(item.id, "PENDING") : markBought(item.id))}
      onOpen={() => setItemParam(item.id)}
    />
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* header */}
      <div className="space-y-3">
        <Link href="/plans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Plans
        </Link>
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-semibold">{plan.name}</h1>
            <p className="text-sm text-muted-foreground">{meta}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {plan.status === "PLANNING" && <Button size="sm" onClick={() => setPlanStatus("IN_PROGRESS")} disabled={isPending}><Play className="h-3.5 w-3.5" />Start</Button>}
            {plan.status === "IN_PROGRESS" && <Button size="sm" onClick={() => setPlanStatus("COMPLETED")} disabled={isPending}><Check className="h-3.5 w-3.5" />Complete</Button>}
            {closed && <Button size="sm" variant="outline" onClick={() => setPlanStatus("IN_PROGRESS")} disabled={isPending}>Reopen</Button>}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {plan.status === "PLANNING" && <DropdownMenuItem onClick={() => setPlanStatus("COMPLETED")}>Complete</DropdownMenuItem>}
                {!closed && <DropdownMenuItem onClick={() => setPlanStatus("CANCELLED")}>Archive plan</DropdownMenuItem>}
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeletePlanOpen(true)}>Delete plan</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* summary */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        {plan.items.length > 0 && stillToPay === 0 ? (
          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">All paid</p>
        ) : (
          <p className="text-xl font-semibold tabular-nums">{fmt(stillToPay, sym)} to go</p>
        )}
        <div role="meter" aria-valuenow={totals.paid} aria-valuemin={0} aria-valuemax={scale} aria-label="Paid so far" className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${Math.min(100, (totals.paid / scale) * 100)}%` }} />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          Estimated {fmt(totals.estimated, sym)} · Paid {fmt(totals.paid, sym)} · {paidCount} of {plan.items.length} bought
        </p>
        {stillToPay > 0 && (
          covered ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Your free cash ({fmt(liquid, sym)}) covers what&apos;s left.</p>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {liquid > 0
                ? <>Free cash covers {coveragePct}% – {fmt(stillToPay - liquid, sym)} short.</>
                : <>No free cash right now – all {fmt(stillToPay, sym)} still to find.</>}
            </p>
          )
        )}
      </section>

      {/* add row + list */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} placeholder="Add an item – e.g. Paint, Tickets" aria-label="New item name" className="flex-1 min-w-0 h-10" />
          <div className="relative w-28 sm:w-36 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{sym}</span>
            <Input value={estimate} onChange={(e) => setEstimate(e.target.value)} onKeyDown={onKey} inputMode="decimal" placeholder="Estimate" aria-label="Estimate" className="pl-8 h-10" />
          </div>
          {typingGroup ? (
            <Input
              autoFocus value={newGroup} aria-label="New group name" placeholder="Group name"
              onChange={(e) => setNewGroup(e.target.value)}
              onBlur={() => { chooseGroup(newGroup.trim()); setTypingGroup(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); chooseGroup(newGroup.trim()); setTypingGroup(false); nameRef.current?.focus(); } }}
              className="hidden sm:block w-32 shrink-0 h-10"
            />
          ) : (
            <select
              aria-label="Group for new item"
              value={newGroup}
              onChange={(e) => { if (e.target.value === "__new") { setNewGroup(""); setTypingGroup(true); } else chooseGroup(e.target.value); }}
              className="hidden sm:block w-32 shrink-0 h-10 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">No group</option>
              {Array.from(new Set([...usedGroups, ...(newGroup ? [newGroup] : [])])).map((g) => <option key={g} value={g}>{g}</option>)}
              <option value="__new">New group…</option>
            </select>
          )}
          <Button onClick={add} disabled={!name.trim() || adding} className="h-10">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add</Button>
        </div>

        {plan.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">Nothing here yet. Type everything you expect to buy above - rough estimates are fine.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end gap-1 pr-3 text-[11px] uppercase tracking-wide text-muted-foreground" aria-hidden>
              <span className="w-[4.75rem] sm:w-24 px-2 text-right">Estimate</span>
              <span className="w-[4.75rem] sm:w-24 px-2 text-right">Actual</span>
              <span className="w-8" />
            </div>
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="rounded-xl border border-border bg-card overflow-hidden">
                <GroupHeader title={group} items={items} />
                <SortableItems items={items} onReorder={handleReorder} renderItem={renderRow} />
              </div>
            ))}
            {ungrouped.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {Object.keys(grouped).length > 0 && <GroupHeader title="Other" items={ungrouped} />}
                <SortableItems items={ungrouped} onReorder={handleReorder} renderItem={renderRow} />
              </div>
            )}
          </div>
        )}
      </section>

      <ItemSheet item={open} sym={sym} groups={groupNames} listId={groupListId} categories={categories} onClose={() => setItemParam(null)} onChanged={refresh} />
      <EditPlanDialog key={editOpen ? "open" : "closed"} plan={plan} open={editOpen} onOpenChange={setEditOpen} onDone={refresh} />
      <ConfirmDialog open={deletePlanOpen} onOpenChange={setDeletePlanOpen} title="Delete this plan?" description="All items will be permanently deleted." onConfirm={removePlan} />
    </div>
  );
}
