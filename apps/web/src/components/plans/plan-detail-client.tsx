"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, GripVertical, Plus, Trash2, CheckCircle, Tag, CheckCircle2, AlertTriangle, TrendingUp, Info, MoreHorizontal, Pencil, Loader2, Check, Circle, Receipt } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPlannerItem, updatePlannerItem, deletePlannerItem, updatePlannerStatus, deletePlanner, logPlanItemExpense, markPlanItemBought, reorderPlannerItems } from "@/actions/plan";
import { cn } from "@/lib/utils";
import { InlineText, InlineAmount } from "@/components/shared/inline-fields";
import { DueChip } from "@/components/shared/due-chip";
import { planTotals } from "@/lib/plans/totals";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
interface FinancialPosition {
  accumulatedSavings: number;
  savingsPotsTotal: number;
  investmentsTotal: number;
  loansOwed: number;
  loansReceivable: number;
  liquidAvailable: number;
  netWorth: number;
}

const ITEM_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800",
  BOOKED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  SKIPPED: "bg-slate-100 text-slate-400",
};

const PLANNER_STATUS_FLOW = ["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PLANNER_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const GENERIC_GROUPS = ["Phase 1", "Phase 2", "Phase 3", "Venue", "Catering", "Decor", "Transport", "Other"];

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
        <div className="divide-y divide-border/60">
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>{(handle) => renderItem(item, handle)}</SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// One grid shared by the group header, every row and the group footer, so the money columns line up.
const ROW_GRID = "grid grid-cols-[1.25rem_1.25rem_minmax(0,1fr)_auto] sm:grid-cols-[1.25rem_1.25rem_minmax(0,1fr)_7rem_7rem_9.5rem] items-start gap-x-2 gap-y-1 px-3";
// Controls that stay out of the way until you point at, or tab into, the row (always on for touch).
const REVEAL = "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity";

function PlanItemRow({ item, handle, baseSymbol, busy, onSaved, onBought, onLogged, onUndo, onEdit, onDelete }: {
  item: PlanItem; handle?: React.ReactNode; baseSymbol: string; busy: boolean;
  onSaved: () => void; onBought: () => void; onLogged: () => void; onUndo: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const fade = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (fade.current) clearTimeout(fade.current); }, []);

  async function save(patch: Parameters<typeof updatePlannerItem>[1]) {
    setState("saving");
    const result = await updatePlannerItem(item.id, patch);
    if (!result.success) {
      setState("error");
      toast.error(result.error ?? "Couldn't save");
      return;
    }
    setState("saved");
    if (fade.current) clearTimeout(fade.current);
    fade.current = setTimeout(() => setState("idle"), 1500);
    onSaved();
  }

  const bought = item.status === "PAID";
  const skipped = item.status === "SKIPPED";
  const diff = item.actualCost !== null && item.estimatedCost > 0 ? item.actualCost - item.estimatedCost : 0;

  return (
    <div
      className={cn("group py-2 hover:bg-muted/40 transition-colors", ROW_GRID, skipped && "opacity-50")}
      onKeyDown={(e) => { if (e.altKey && e.key === "Enter" && !bought) { e.preventDefault(); onLogged(); } }}
    >
      <div className={cn("pt-1", REVEAL)}>{handle}</div>

      <button
        type="button"
        onClick={bought ? onUndo : onBought}
        disabled={busy}
        aria-label={bought ? "Mark not bought" : "Mark bought"}
        title={bought ? "Bought - click to undo" : "Mark bought (no expense logged)"}
        className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        {bought ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <InlineText
            ariaLabel="Item name"
            value={item.name}
            onSave={(name) => save({ name })}
            className={cn("flex-1 min-w-0 text-sm font-medium text-foreground", bought && "line-through decoration-muted-foreground/40 text-muted-foreground")}
          />
          {skipped && <span className="text-[11px] text-muted-foreground">Skipped</span>}
        </div>
        <button type="button" onClick={onEdit} className="mt-0.5 flex items-center gap-x-2 gap-y-0.5 flex-wrap text-left text-xs text-muted-foreground hover:text-foreground">
          {item.dueDate && <DueChip date={item.dueDate} />}
          {item.notes && <span className="truncate max-w-[16rem] italic">{item.notes}</span>}
          {!item.dueDate && !item.notes && <span className={REVEAL}>+ date / note</span>}
        </button>
      </div>

      {/* Money: on phones the two amounts sit on their own line; from sm up they become the columns */}
      <div className="col-span-full flex gap-3 pl-[1.75rem] sm:pl-0 sm:contents">
        <div className="flex-1 sm:flex-none">
          <span className="sm:hidden text-[11px] text-muted-foreground">Estimate</span>
          <InlineAmount variant="bare" label="Estimate" symbol={baseSymbol} valuePaisas={item.estimatedCost} onSave={(v) => save({ estimatedCost: v ?? 0 })} />
        </div>
        <div className="flex-1 sm:flex-none">
          <span className="sm:hidden text-[11px] text-muted-foreground">Actual</span>
          <InlineAmount variant="bare" label="Actual cost" symbol={baseSymbol} valuePaisas={item.actualCost} optional onSave={(v) => save({ actualCost: v })} />
          {diff !== 0 && (
            <p className={cn("text-[11px] tabular-nums text-right pr-2 -mt-0.5", diff > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
              {diff > 0 ? "+" : "−"}{baseSymbol} {(Math.abs(diff) / 100).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 pt-0.5 sm:order-last">
        <span className="w-4 shrink-0" aria-live="polite">
          {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {state === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          {state === "error" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        </span>
        {!bought && (
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={onLogged} title="Mark bought and book a real expense (Alt+Enter)" aria-label="Log expense">
            <Receipt className="h-3.5 w-3.5" /><span className="hidden sm:inline">Log expense</span>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground shrink-0" aria-label="Item actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" />Edit details</DropdownMenuItem>
            {!bought && <DropdownMenuItem onClick={onBought}><CheckCircle2 className="h-3.5 w-3.5 mr-2" />Mark bought (no expense)</DropdownMenuItem>}
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Group title with the Estimate / Actual column labels. */
function GroupHeader({ title, boughtCount, count, icon }: { title: string; boughtCount: number; count: number; icon?: React.ReactNode }) {
  return (
    <div className={cn("py-2 border-b border-border/60 bg-muted/20 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 items-center", ROW_GRID)}>
      <div className="col-span-4 sm:col-span-3 flex items-center gap-1.5 min-w-0">
        {icon}<span className="truncate">{title}</span>
        <span className="font-normal normal-case tracking-normal text-muted-foreground">· {boughtCount}/{count} bought</span>
      </div>
      <div className="hidden sm:block text-right pr-2">Estimate</div>
      <div className="hidden sm:block text-right pr-2">Actual</div>
      <div className="hidden sm:block" />
    </div>
  );
}

function GroupFooter({ items, baseSymbol }: { items: PlanItem[]; baseSymbol: string }) {
  const est = items.reduce((s, i) => s + i.estimatedCost, 0);
  const actualItems = items.filter((i) => i.actualCost !== null);
  const act = actualItems.reduce((s, i) => s + (i.actualCost ?? 0), 0);
  const money = (n: number) => `${baseSymbol} ${(n / 100).toLocaleString()}`;
  return (
    <div className={cn("py-2 border-t border-border/60 text-xs font-semibold tabular-nums items-center", ROW_GRID)}>
      <div className="col-span-4 sm:col-span-3 text-muted-foreground font-medium">
        Total <span className="sm:hidden">· est {money(est)}{actualItems.length > 0 ? ` · actual ${money(act)}` : ""}</span>
      </div>
      <div className="hidden sm:block text-right pr-2">{money(est)}</div>
      <div className="hidden sm:block text-right pr-2 text-muted-foreground">{actualItems.length > 0 ? money(act) : "—"}</div>
      <div className="hidden sm:block" />
    </div>
  );
}

export function PlanDetailClient({ plan, financialPosition, baseSymbol = "Rs" }: { plan: Plan; financialPosition: FinancialPosition; baseSymbol?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({
    name: "", estimatedCost: "", dueDate: "", notes: "", eventGroup: "",
  });
  const [draft, setDraft] = useState({ dueDate: "", eventGroup: "", notes: "" });

  // Estimates are planning only; a bought item is worth its actual cost.
  const totals = planTotals(plan.items);
  const totalEstimated = totals.estimated;
  const totalActual = totals.paid;
  const stillToPay = totals.remaining;
  const quotedCount = plan.items.filter((i) => i.status !== "PAID" && i.actualCost !== null).length;
  const paidCount = plan.items.filter((i) => i.status === "PAID").length;
  const pct = plan.items.length > 0 ? Math.round((paidCount / plan.items.length) * 100) : 0;

  // Drag-reorder shows instantly; the server order replaces it after the refresh.
  // It only applies to the items array it was made for, so fresh server data wins.
  const [override, setOverride] = useState<{ base: PlanItem[]; ids: string[] } | null>(null);
  const displayItems = override && override.base === plan.items
    ? [...plan.items].sort((a, b) => override.ids.indexOf(a.id) - override.ids.indexOf(b.id))
    : plan.items;

  // Group items by eventGroup
  const grouped: Record<string, PlanItem[]> = {};
  const ungrouped: PlanItem[] = [];
  for (const item of displayItems) {
    if (item.eventGroup) {
      if (!grouped[item.eventGroup]) grouped[item.eventGroup] = [];
      grouped[item.eventGroup].push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const suggestedGroups = GENERIC_GROUPS;

  async function handleAddItem() {
    if (!newItem.name) return;
    startTransition(async () => {
      const result = await createPlannerItem(plan.id, {
        name: newItem.name,
        estimatedCost: parseFloat(newItem.estimatedCost) || 0,
        dueDate: newItem.dueDate || undefined,
        notes: newItem.notes || undefined,
        eventGroup: newItem.eventGroup || undefined,
      });
      if (result.success) {
        toast.success("Item added");
        setAddOpen(false);
        setNewItem({ name: "", estimatedCost: "", dueDate: "", notes: "", eventGroup: "" });
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  async function handleStatusChange(itemId: string, status: string) {
    startTransition(async () => {
      await updatePlannerItem(itemId, { status });
      toast.success("Status updated");
      router.refresh();
    });
  }

  // One-tap: mark bought + book a real expense for this item.
  async function handleLogExpense(itemId: string) {
    startTransition(async () => {
      const result = await logPlanItemExpense(itemId);
      if (result.success) toast.success("Bought — expense logged");
      else toast.error(result.error ?? "Failed to log expense");
      router.refresh();
    });
  }

  // Bought, without booking an expense.
  async function handleMarkBought(itemId: string) {
    startTransition(async () => {
      const result = await markPlanItemBought(itemId);
      if (result.success) toast.success("Marked as bought", { action: { label: "Undo", onClick: () => handleStatusChange(itemId, "PENDING") } });
      else toast.error(result.error ?? "Failed");
      router.refresh();
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
    router.refresh();
  }

  async function handleDeleteItem() {
    if (!deleteItemId) return;
    await deletePlannerItem(deleteItemId);
    toast.success("Item deleted");
    setDeleteItemId(null);
    router.refresh();
  }

  async function handlePlanStatus(status: string) {
    startTransition(async () => {
      const result = await updatePlannerStatus(plan.id, status);
      if (result.success) {
        toast.success(`Plan marked as ${PLANNER_STATUS_LABELS[status]}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  async function handleDeletePlan() {
    await deletePlanner(plan.id);
    toast.success("Plan deleted");
    router.push("/plans");
  }

  function openEdit(item: PlanItem) {
    setDraft({
      dueDate: item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "",
      eventGroup: item.eventGroup ?? "",
      notes: item.notes ?? "",
    });
    setEditItem(item);
  }

  async function handleSaveDetails() {
    if (!editItem) return;
    startTransition(async () => {
      const result = await updatePlannerItem(editItem.id, {
        dueDate: draft.dueDate || null,
        eventGroup: draft.eventGroup.trim() || null,
        notes: draft.notes.trim() || null,
      });
      if (result.success) { toast.success("Item updated"); setEditItem(null); router.refresh(); }
      else toast.error(result.error ?? "Failed");
    });
  }

  const renderRow = (item: PlanItem, handle: React.ReactNode) => (
    <PlanItemRow
      item={item}
      handle={handle}
      baseSymbol={baseSymbol}
      busy={isPending}
      onSaved={() => router.refresh()}
      onBought={() => handleMarkBought(item.id)}
      onLogged={() => handleLogExpense(item.id)}
      onUndo={() => handleStatusChange(item.id, "PENDING")}
      onEdit={() => openEdit(item)}
      onDelete={() => setDeleteItemId(item.id)}
    />
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/plans">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="h-3 w-1 rounded-full" style={{ backgroundColor: plan.coverColor }} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
          {plan.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
        </div>
        <Badge className={cn("text-xs", {
          "bg-blue-100 text-blue-700": plan.status === "PLANNING",
          "bg-amber-100 text-amber-700": plan.status === "IN_PROGRESS",
          "bg-emerald-100 text-emerald-700": plan.status === "COMPLETED",
          "bg-slate-100 text-slate-500": plan.status === "CANCELLED",
        })}>{PLANNER_STATUS_LABELS[plan.status]}</Badge>
      </div>

      {/* Status actions */}
      {plan.status !== "COMPLETED" && plan.status !== "CANCELLED" && (
        <div className="flex gap-2 flex-wrap">
          {plan.status === "PLANNING" && (
            <Button size="sm" variant="outline" onClick={() => handlePlanStatus("IN_PROGRESS")} disabled={isPending}>
              Mark In Progress
            </Button>
          )}
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handlePlanStatus("COMPLETED")} disabled={isPending}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete Plan
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handlePlanStatus("CANCELLED")} disabled={isPending}>
            Cancel Plan
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500 ml-auto" onClick={() => setDeletePlanId(plan.id)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
          </Button>
        </div>
      )}
      {plan.completedAt && (
        <p className="text-xs text-muted-foreground">Completed on {format(new Date(plan.completedAt), "d MMMM yyyy")}</p>
      )}

      {/* Cost summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Estimated Total</div>
          <div className="text-xl font-bold text-foreground">{baseSymbol} {(totalEstimated / 100).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Actually Paid</div>
          <div className="text-xl font-bold text-emerald-600">{baseSymbol} {(totalActual / 100).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="text-xl font-bold text-primary">{pct}%</div>
          <div className="text-xs text-muted-foreground">{paidCount}/{plan.items.length} items</div>
        </div>
      </div>

      {/* Affordability Panel */}
      {totalEstimated > 0 && (() => {
        const remaining = stillToPay;
        const canAfford = financialPosition.liquidAvailable >= remaining;
        // Clamp to 0-100: you can't cover a negative share (liquid in the red = 0% covered).
        const coveragePct = remaining > 0
          ? Math.max(0, Math.min(100, Math.round((financialPosition.liquidAvailable / remaining) * 100)))
          : 100;
        return (
          <div className={cn("rounded-xl border p-5",
            canAfford
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
              : coveragePct >= 50
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
          )}>
            <div className="flex items-center gap-2 mb-3">
              {canAfford
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <AlertTriangle className={cn("h-4 w-4", coveragePct >= 50 ? "text-amber-600" : "text-red-500")} />
              }
              <span className="font-semibold text-foreground text-sm">
                {totalActual > 0
                  ? canAfford
                    ? "You can cover the remaining balance"
                    : `${Math.min(coveragePct, 100)}% of remaining cost is covered`
                  : canAfford
                    ? "You can afford this plan right now"
                    : `You can cover ${Math.min(coveragePct, 100)}% of this plan`
                }
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <div className="text-xs text-muted-foreground">Still to pay{quotedCount > 0 ? ` (${quotedCount} quoted)` : ""}</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(remaining / 100).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Available (liquid)</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(financialPosition.liquidAvailable / 100).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Investments</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(financialPosition.investmentsTotal / 100).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Net worth</div>
                <div className="text-base font-bold text-foreground">{baseSymbol} {(financialPosition.netWorth / 100).toLocaleString()}</div>
              </div>
            </div>
            {!canAfford && remaining > financialPosition.liquidAvailable && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Shortfall: {baseSymbol} {((remaining - financialPosition.liquidAvailable) / 100).toLocaleString()}.
                  {financialPosition.investmentsTotal >= (remaining - financialPosition.liquidAvailable)
                    ? " Your investments can cover the gap if liquidated."
                    : " Build your savings before committing to this expense."}
                </span>
              </div>
            )}
            {canAfford && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 border-t border-emerald-200 dark:border-emerald-800 pt-3">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Your savings can fund this plan without touching investments.
              </div>
            )}
          </div>
        );
      })()}

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Items &amp; Checklist</h3>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" />Add Item</Button>
        </div>

        {plan.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 bg-card border border-dashed border-border rounded-xl">No items yet. Add your first expense item!</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="bg-card border border-border rounded-xl overflow-hidden">
                <GroupHeader title={group} icon={<Tag className="h-3 w-3 shrink-0" />} count={items.length} boughtCount={items.filter((i) => i.status === "PAID").length} />
                <SortableItems items={items} onReorder={handleReorder} renderItem={renderRow} />
                <GroupFooter items={items} baseSymbol={baseSymbol} />
              </div>
            ))}

            {ungrouped.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <GroupHeader title={Object.keys(grouped).length > 0 ? "Other" : "Items"} count={ungrouped.length} boughtCount={ungrouped.filter((i) => i.status === "PAID").length} />
                <SortableItems items={ungrouped} onReorder={handleReorder} renderItem={renderRow} />
                <GroupFooter items={ungrouped} baseSymbol={baseSymbol} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Book wedding hall" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estimated Cost ({baseSymbol})</Label>
                <Input type="number" value={newItem.estimatedCost} onChange={(e) => setNewItem((p) => ({ ...p, estimatedCost: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Due Date (optional)</Label>
                <Input type="date" value={newItem.dueDate} onChange={(e) => setNewItem((p) => ({ ...p, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Event Group (optional)</Label>
              <Input
                list={`groups-${plan.id}`}
                value={newItem.eventGroup}
                onChange={(e) => setNewItem((p) => ({ ...p, eventGroup: e.target.value }))}
                placeholder="e.g. Phase 1"
              />
              <datalist id={`groups-${plan.id}`}>
                {suggestedGroups.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={newItem.notes} onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))} placeholder="Any extra details, quotation comparison..." />
            </div>
            <Button className="w-full" onClick={handleAddItem} disabled={isPending}>
              {isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit details: everything that isn't the name or a price (those edit on the tile) */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit details{editItem ? ` · ${editItem.name}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due date</Label>
                <Input type="date" value={draft.dueDate} onChange={(e) => setDraft((p) => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <Label>Event group</Label>
                <Input
                  list={`groups-${plan.id}`}
                  value={draft.eventGroup}
                  onChange={(e) => setDraft((p) => ({ ...p, eventGroup: e.target.value }))}
                  placeholder="e.g. Phase 1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="Quotation comparison, who to call..." />
            </div>
            <Button className="w-full" onClick={handleSaveDetails} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItemId} onOpenChange={(o) => !o && setDeleteItemId(null)} title="Delete this item?" description="This cannot be undone." onConfirm={handleDeleteItem} />
      <ConfirmDialog open={!!deletePlanId} onOpenChange={(o) => !o && setDeletePlanId(null)} title="Delete this plan?" description="All items will be permanently deleted." onConfirm={handleDeletePlan} />
    </div>
  );
}
