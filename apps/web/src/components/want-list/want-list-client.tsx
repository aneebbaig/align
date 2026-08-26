"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShoppingCart, Plus, Clock, Bell, CheckCircle2, XCircle, AlarmClock,
  ExternalLink, Trash2, History, ChevronDown, ChevronUp, ShoppingBag,
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
import { addToWantList, dismissWantListItem, buyWantListItem, snoozeWantListItem, deleteWantListItem } from "@/actions/want-list";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";

interface WantListItem {
  id: string;
  name: string;
  description: string | null;
  estimatedCost: number | null;
  url: string | null;
  categoryHint: string | null;
  status: string;
  addedAt: Date;
  remindAt: Date;
  boughtAt: Date | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  cooling: WantListItem[];
  resurface: WantListItem[];
  history: WantListItem[];
  categories: Category[];
  hideHeader?: boolean;
  baseSymbol?: string;
}

function fmtWith(n: number, symbol: string) {
  return symbol + " " + (n / 100).toLocaleString("en-PK", { minimumFractionDigits: 0 });
}

export function WantListClient({ cooling, resurface, history, categories, hideHeader, baseSymbol = "Rs" }: Props) {
  const fmt = (n: number) => fmtWith(n, baseSymbol);
  const [addOpen, setAddOpen] = useState(false);
  const [buyItem, setBuyItem] = useState<WantListItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", estimatedCost: "", url: "", categoryHint: "", coolingHours: "48",
  });

  const [buyForm, setBuyForm] = useState({
    categoryId: "", actualAmount: "", date: format(new Date(), "yyyy-MM-dd"),
  });

  async function handleAdd() {
    if (!form.name.trim()) return;
    setLoading(true);
    const result = await addToWantList({
      name: form.name,
      description: form.description || undefined,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      url: form.url || undefined,
      categoryHint: form.categoryHint || undefined,
      coolingHours: parseInt(form.coolingHours),
    });
    if (result.success) {
      toast.success("Added to Want List - come back in " + form.coolingHours + "h to decide");
      setAddOpen(false);
      setForm({ name: "", description: "", estimatedCost: "", url: "", categoryHint: "", coolingHours: "48" });
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleBuy() {
    if (!buyItem || !buyForm.categoryId) return;
    setLoading(true);
    const result = await buyWantListItem(buyItem.id, {
      categoryId: buyForm.categoryId,
      actualAmount: buyForm.actualAmount ? parseFloat(buyForm.actualAmount) : undefined,
      date: buyForm.date,
    });
    if (result.success) {
      toast.success("Marked as bought - expense recorded!");
      setBuyItem(null);
    } else toast.error(result.error ?? "Failed");
    setLoading(false);
  }

  async function handleDismiss(id: string) {
    const result = await dismissWantListItem(id);
    if (result.success) toast.success("Dismissed - good call!");
    else toast.error(result.error ?? "Failed");
  }

  async function handleSnooze(id: string, hours: number) {
    const result = await snoozeWantListItem(id, hours);
    if (result.success) toast.success(`Snoozed for ${hours}h`);
    else toast.error(result.error ?? "Failed");
  }

  async function handleDelete() {
    if (!deleteId) return;
    const result = await deleteWantListItem(deleteId);
    if (result.success) toast.success("Deleted");
    else toast.error(result.error ?? "Failed");
    setDeleteId(null);
  }

  const openBuy = (item: WantListItem) => {
    setBuyItem(item);
    const matchedCat = categories.find((c) => c.name.toLowerCase() === item.categoryHint?.toLowerCase());
    setBuyForm({
      categoryId: matchedCat?.id ?? "",
      actualAmount: item.estimatedCost ? String(item.estimatedCost / 100) : "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  return (
    <>
      {!hideHeader && (
        <PageHeader
          section="Planning"
          title="Want List"
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Park a Want</Button>}
        />
      )}

      {/* Resurface section - items past cooling period */}
      {resurface.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-foreground">Still want this?</h2>
            <Badge className="bg-amber-100 text-amber-700 text-xs">{resurface.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground -mt-1">
            These cooled off. Time to decide: buy intentionally or let go?
          </p>
          <div className="space-y-3">
            {resurface.map((item) => (
              <ResurfaceCard
                key={item.id}
                item={item}
                onBuy={() => openBuy(item)}
                onDismiss={() => handleDismiss(item.id)}
                onSnooze={(h) => handleSnooze(item.id, h)}
                baseSymbol={baseSymbol}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cooling section */}
      {cooling.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <h2 className="font-semibold text-foreground">Cooling Off</h2>
            <Badge className="bg-blue-100 text-blue-700 text-xs">{cooling.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground -mt-1">
            These are parked. Wait it out - the urge usually passes.
          </p>
          <div className="space-y-2">
            {cooling.map((item) => (
              <CoolingCard
                key={item.id}
                item={item}
                onDelete={() => setDeleteId(item.id)}
                baseSymbol={baseSymbol}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {cooling.length === 0 && resurface.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="Nothing parked yet"
          description="Next time you feel the urge to buy something, park it here instead. Wait 48h. Then decide."
        />
      )}

      {/* History toggle */}
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
            <DialogTitle>Park a Want</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Add it here instead of buying right now. You can decide later with a clearer head.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>What do you want?</Label>
              <Input
                placeholder="e.g. Noise-cancelling headphones"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Why do you want it? <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Write it out - helps you think it through"
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
                <Label>Cooling period</Label>
                <Select value={form.coolingHours} onValueChange={(v) => setForm((f) => ({ ...f, coolingHours: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
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
              Park It - Come Back Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buy dialog */}
      <Dialog open={!!buyItem} onOpenChange={(o) => !o && setBuyItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Now - {buyItem?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create an expense transaction and mark the item as bought.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={buyForm.categoryId} onValueChange={(v) => setBuyForm((f) => ({ ...f, categoryId: v }))}>
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
                  Actual amount ({baseSymbol})
                  {buyItem?.estimatedCost && (
                    <span className="text-muted-foreground ml-1 font-normal">
                      est. {fmt(buyItem.estimatedCost)}
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  placeholder={buyItem?.estimatedCost ? String(buyItem.estimatedCost / 100) : "0"}
                  value={buyForm.actualAmount}
                  onChange={(e) => setBuyForm((f) => ({ ...f, actualAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={buyForm.date}
                  onChange={(e) => setBuyForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={handleBuy} disabled={loading || !buyForm.categoryId} className="w-full">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Confirm Purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete item"
        description="This will permanently remove the item from your list."
        onConfirm={handleDelete}
      />
    </>
  );
}

function ResurfaceCard({ item, onBuy, onDismiss, onSnooze, baseSymbol }: {
  item: WantListItem;
  onBuy: () => void;
  onDismiss: () => void;
  onSnooze: (hours: number) => void;
  baseSymbol: string;
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  return (
    <div className="border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{item.name}</div>
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            {item.estimatedCost && (
              <span className="text-sm font-medium text-foreground">{baseSymbol} {(item.estimatedCost / 100).toLocaleString()}</span>
            )}
            <span className="text-xs text-muted-foreground">Added {formatDistanceToNow(item.addedAt)} ago</span>
          </div>
        </div>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
        Cooled off {formatDistanceToNow(item.remindAt)} ago. Do you still want it?
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={onBuy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Yes, Buy It
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss} className="text-muted-foreground">
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Nope, Let It Go
        </Button>
        <div className="relative">
          <Button size="sm" variant="ghost" onClick={() => setSnoozeOpen((v) => !v)} className="text-muted-foreground">
            <AlarmClock className="h-3.5 w-3.5 mr-1.5" />
            Snooze
          </Button>
          {snoozeOpen && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-md z-10 py-1 min-w-[130px]">
              {[24, 48, 72, 168].map((h) => (
                <button
                  key={h}
                  onClick={() => { onSnooze(h); setSnoozeOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  {h < 48 ? `${h}h` : h === 168 ? "1 week" : `${h}h`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CoolingCard({ item, onDelete, baseSymbol }: { item: WantListItem; onDelete: () => void; baseSymbol: string; }) {
  const timeLeft = formatDistanceToNow(item.remindAt, { addSuffix: true });
  const totalMs = item.remindAt.getTime() - item.addedAt.getTime();
  const elapsedMs = Date.now() - item.addedAt.getTime();
  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  return (
    <div className="border border-border bg-card rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="font-medium text-foreground truncate">{item.name}</div>
          {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.estimatedCost && (
            <span className="text-sm font-medium text-foreground">{baseSymbol} {(item.estimatedCost / 100).toLocaleString()}</span>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Resurfaces {timeLeft}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ item, onDelete, baseSymbol }: { item: WantListItem; onDelete: () => void; baseSymbol: string; }) {
  const isBought = item.status === "BOUGHT";
  return (
    <div className={cn(
      "border rounded-xl p-3 flex items-center gap-3",
      isBought ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10" : "border-border bg-muted/30"
    )}>
      <div className={cn("shrink-0", isBought ? "text-emerald-500" : "text-muted-foreground")}>
        {isBought ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          {isBought ? `Bought ${item.boughtAt ? formatDistanceToNow(item.boughtAt) + " ago" : ""}` : "Dismissed"} · Added {format(item.addedAt, "dd MMM yyyy")}
        </div>
      </div>
      {item.estimatedCost && (
        <span className="text-sm text-muted-foreground shrink-0">{baseSymbol} {(item.estimatedCost / 100).toLocaleString()}</span>
      )}
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
