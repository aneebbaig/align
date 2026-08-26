"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ClipboardList, Plus, CheckCircle2, XCircle, Trash2,
  History, ChevronDown, ChevronUp, ExternalLink, ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { addToNeedList, doneNeedListItem, skipNeedListItem, deleteNeedListItem } from "@/actions/need-list";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";

interface NeedListItem {
  id: string;
  name: string;
  description: string | null;
  estimatedCost: number | null;
  url: string | null;
  categoryHint: string | null;
  priority: string;
  status: string;
  addedAt: Date;
  doneAt: Date | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  items: NeedListItem[];
  history: NeedListItem[];
  categories: Category[];
  hideHeader?: boolean;
  baseSymbol?: string;
}

const PRIORITY_ORDER = ["HIGH", "MEDIUM", "LOW"];

const PRIORITY_CONFIG: Record<string, { label: string; badge: string; border: string }> = {
  HIGH: {
    label: "High",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  MEDIUM: {
    label: "Medium",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    border: "border-border",
  },
  LOW: {
    label: "Low",
    badge: "bg-muted text-muted-foreground",
    border: "border-border",
  },
};

function fmtWith(n: number, symbol: string) {
  return symbol + " " + (n / 100).toLocaleString("en-PK", { minimumFractionDigits: 0 });
}

export function NeedListClient({ items, history, categories, hideHeader, baseSymbol = "Rs" }: Props) {
  const fmt = (n: number) => fmtWith(n, baseSymbol);
  const [addOpen, setAddOpen] = useState(false);
  const [doneItem, setDoneItem] = useState<NeedListItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", estimatedCost: "", url: "", categoryHint: "", priority: "MEDIUM",
  });

  const [doneForm, setDoneForm] = useState({
    categoryId: "", actualAmount: "", date: format(new Date(), "yyyy-MM-dd"), logExpense: false,
  });

  async function handleAdd() {
    if (!form.name.trim()) return;
    setLoading(true);
    const result = await addToNeedList({
      name: form.name,
      description: form.description || undefined,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      url: form.url || undefined,
      categoryHint: form.categoryHint || undefined,
      priority: form.priority,
    });
    if (result.success) {
      toast.success("Added to Need List");
      setAddOpen(false);
      setForm({ name: "", description: "", estimatedCost: "", url: "", categoryHint: "", priority: "MEDIUM" });
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleDone() {
    if (!doneItem) return;
    setLoading(true);
    const result = await doneNeedListItem(
      doneItem.id,
      doneForm.logExpense && doneForm.categoryId
        ? { categoryId: doneForm.categoryId, actualAmount: doneForm.actualAmount ? parseFloat(doneForm.actualAmount) : undefined, date: doneForm.date }
        : undefined,
    );
    if (result.success) {
      toast.success(doneForm.logExpense ? "Done - expense logged!" : "Done!");
      setDoneItem(null);
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleSkip(id: string) {
    const result = await skipNeedListItem(id);
    if (result.success) toast.success("Skipped");
    else toast.error(result.error ?? "Failed");
  }

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteNeedListItem(deleteId);
    if (result.success) toast.success("Deleted");
    else toast.error(result.error ?? "Failed");
    setDeleteId(null);
  }

  const openDone = (item: NeedListItem) => {
    setDoneItem(item);
    const matchedCat = categories.find((c) => c.name.toLowerCase() === item.categoryHint?.toLowerCase());
    setDoneForm({
      categoryId: matchedCat?.id ?? "",
      actualAmount: item.estimatedCost ? String(item.estimatedCost / 100) : "",
      date: format(new Date(), "yyyy-MM-dd"),
      logExpense: false,
    });
  };

  const grouped = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: items.filter((i) => i.priority === p),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {!hideHeader && (
        <PageHeader
          section="Planning"
          title="Need List"
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Need</Button>}
        />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="All clear"
          description="No needs tracked. Add things you actually have to take care of."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(({ priority, items: group }) => {
            const cfg = PRIORITY_CONFIG[priority];
            return (
              <div key={priority} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Badge className={cn("text-xs", cfg.badge)}>{cfg.label}</Badge>
                  <span className="text-xs text-muted-foreground">{group.length}</span>
                </div>
                <div className="space-y-2">
                  {group.map((item) => (
                    <NeedCard
                      key={item.id}
                      item={item}
                      cfg={cfg}
                      onDone={() => openDone(item)}
                      onSkip={() => handleSkip(item.id)}
                      onDelete={() => setDeleteId(item.id)}
                      baseSymbol={baseSymbol}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-4 w-4" />
            History ({history.length})
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.map((item) => (
                <HistoryCard key={item.id} item={item} onDelete={() => setDeleteId(item.id)} baseSymbol={baseSymbol} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Need</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Something you actually have to take care of - not a want.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>What do you need?</Label>
              <Input
                placeholder="e.g. Refill prescription"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Any details..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estimated cost ({baseSymbol})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.estimatedCost}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Link <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <Button onClick={handleAdd} disabled={loading || !form.name.trim()} className="w-full">
              Add to Need List
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Done dialog */}
      <Dialog open={!!doneItem} onOpenChange={(o) => !o && setDoneItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Done - {doneItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
              <input
                type="checkbox"
                id="logExpense"
                checked={doneForm.logExpense}
                onChange={(e) => setDoneForm((f) => ({ ...f, logExpense: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="logExpense" className="text-sm font-medium cursor-pointer">
                Log as expense
              </label>
            </div>

            {doneForm.logExpense && (
              <>
                <div className="space-y-1.5">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select value={doneForm.categoryId} onValueChange={(v) => setDoneForm((f) => ({ ...f, categoryId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>
                      Amount ({baseSymbol})
                      {doneItem?.estimatedCost && (
                        <span className="text-muted-foreground ml-1 font-normal">est. {fmt(doneItem.estimatedCost)}</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      placeholder={doneItem?.estimatedCost ? String(doneItem.estimatedCost / 100) : "0"}
                      value={doneForm.actualAmount}
                      onChange={(e) => setDoneForm((f) => ({ ...f, actualAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={doneForm.date}
                      onChange={(e) => setDoneForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={handleDone}
              disabled={loading || (doneForm.logExpense && !doneForm.categoryId)}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {doneForm.logExpense ? "Done - Log Expense" : "Mark as Done"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete item"
        description="This will permanently remove the item."
        onConfirm={handleDelete}
      />
    </>
  );
}

function NeedCard({ item, cfg, onDone, onSkip, onDelete, baseSymbol }: {
  item: NeedListItem;
  cfg: { label: string; badge: string; border: string };
  onDone: () => void;
  onSkip: () => void;
  onDelete: () => void;
  baseSymbol: string;
}) {
  const fmt = (n: number) => fmtWith(n, baseSymbol);
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3 rounded-xl border bg-card", cfg.border)}>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{item.name}</span>
          {item.estimatedCost && (
            <span className="text-xs text-muted-foreground shrink-0">{fmt(item.estimatedCost)}</span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Link
          </a>
        )}
        <div className="flex gap-2 pt-0.5">
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onDone}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Done
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground" onClick={onSkip}>
            <XCircle className="h-3 w-3 mr-1" />
            Skip
          </Button>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-muted shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function HistoryCard({ item, onDelete, baseSymbol }: { item: NeedListItem; onDelete: () => void; baseSymbol: string }) {
  const fmt = (n: number) => fmtWith(n, baseSymbol);
  const isDone = item.status === "DONE";
  return (
    <div className={cn(
      "border rounded-xl p-3 flex items-center gap-3",
      isDone
        ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10"
        : "border-border bg-muted/30"
    )}>
      <div className={cn("shrink-0", isDone ? "text-emerald-500" : "text-muted-foreground")}>
        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          {isDone
            ? `Done ${item.doneAt ? formatDistanceToNow(item.doneAt) + " ago" : ""}`
            : "Skipped"
          } · Added {format(item.addedAt, "dd MMM yyyy")}
        </div>
      </div>
      {item.estimatedCost && (
        <span className="text-sm text-muted-foreground shrink-0">{fmt(item.estimatedCost)}</span>
      )}
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
