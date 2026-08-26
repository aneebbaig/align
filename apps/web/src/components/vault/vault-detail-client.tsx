"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSurpriseItem, updateSurpriseItem, updateSurprise, deleteSurprise, deleteSurpriseItem } from "@/actions/vault";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";

interface SurpriseItem {
  id: string; surpriseId: string; name: string; description: string | null;
  estimatedCost: number; actualCost: number | null; status: string; purchaseLink: string | null; notes: string | null;
}
interface Surprise {
  id: string; name: string; forWhom: string; occasion: string | null; targetDate: Date | null;
  estimatedBudget: number; actualSpent: number; status: string; description: string | null;
  items: SurpriseItem[];
}

const ITEM_STATUS_COLORS: Record<string, string> = {
  IDEA: "bg-slate-100 text-slate-600", SHORTLISTED: "bg-blue-100 text-blue-700",
  BOUGHT: "bg-emerald-100 text-emerald-700", WRAPPED: "bg-rose-100 text-rose-700",
};

const EMPTY_NEW_ITEM = { name: "", estimatedCost: "", purchaseLink: "", notes: "" };

export function VaultDetailClient({ surprise, baseSymbol = "Rs" }: { surprise: Surprise; baseSymbol?: string }) {
  const router = useRouter();

  // Add item dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_NEW_ITEM);

  // Edit item dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<{
    id: string; name: string; estimatedCost: string; actualCost: string; purchaseLink: string; notes: string;
  } | null>(null);

  // Delete item confirm
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Delete surprise confirm
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(surprise.status);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleAddItem() {
    if (!newItem.name) return;
    setLoading(true);
    const result = await createSurpriseItem(surprise.id, {
      name: newItem.name,
      estimatedCost: parseFloat(newItem.estimatedCost) || 0,
      purchaseLink: newItem.purchaseLink || undefined,
      notes: newItem.notes || undefined,
    });
    if (result.success) {
      toast.success("Item added!");
      setAddOpen(false);
      setNewItem(EMPTY_NEW_ITEM);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  function openEdit(item: SurpriseItem) {
    setEditItem({
      id: item.id,
      name: item.name,
      estimatedCost: (item.estimatedCost / 100).toString(),
      actualCost: item.actualCost != null ? (item.actualCost / 100).toString() : "",
      purchaseLink: item.purchaseLink ?? "",
      notes: item.notes ?? "",
    });
    setEditOpen(true);
  }

  async function handleEditItem() {
    if (!editItem || !editItem.name) return;
    setLoading(true);
    const result = await updateSurpriseItem(surprise.id, editItem.id, {
      name: editItem.name,
      estimatedCost: parseFloat(editItem.estimatedCost) || 0,
      actualCost: editItem.actualCost !== "" ? parseFloat(editItem.actualCost) : undefined,
      purchaseLink: editItem.purchaseLink || undefined,
      notes: editItem.notes || undefined,
    });
    if (result.success) {
      toast.success("Item updated!");
      setEditOpen(false);
      setEditItem(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed");
    }
    setLoading(false);
  }

  async function handleItemStatus(itemId: string, itemStatus: string) {
    await updateSurpriseItem(surprise.id, itemId, { status: itemStatus });
    router.refresh();
    toast.success("Updated!");
  }

  async function handleDeleteItem() {
    if (!deleteItemId) return;
    const result = await deleteSurpriseItem(surprise.id, deleteItemId);
    if (result.success) { toast.success("Item removed"); router.refresh(); }
    else toast.error("Failed to delete item");
    setDeleteItemId(null);
  }

  async function handleStatusChange(newStatus: string) {
    await updateSurprise(surprise.id, { status: newStatus });
    setStatus(newStatus);
    toast.success("Status updated");
  }

  async function handleDelete() {
    const result = await deleteSurprise(surprise.id);
    if (result.success) { toast.success("Deleted"); router.push("/vault"); }
    else toast.error("Failed");
  }

  // ─── Derived stats ─────────────────────────────────────────────────────────

  // Sum of estimatedCost across all items (committed planned spend)
  const totalItemsEstimated = surprise.items.reduce((s, i) => s + i.estimatedCost, 0);
  // actualSpent comes from the server (sum of actualCost ?? estimatedCost per item)
  const spentPct = totalItemsEstimated > 0
    ? Math.min(100, Math.round((surprise.actualSpent / totalItemsEstimated) * 100))
    : 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/vault"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{surprise.name} 🎁</h1>
          <p className="text-sm text-rose-500">For: {surprise.forWhom}{surprise.occasion ? ` · ${surprise.occasion}` : ""}</p>
        </div>
        <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button>
      </div>

      {/* Status & budget */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-rose-100 dark:border-rose-900 rounded-xl p-4">
          <Label className="text-xs">Status</Label>
          <Select onValueChange={handleStatusChange} defaultValue={status}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["IDEA", "PLANNING", "BUYING", "READY", "DELIVERED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="bg-card border border-rose-100 dark:border-rose-900 rounded-xl p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Budget</div>
          <div className="text-lg font-bold text-foreground">{baseSymbol} {(surprise.estimatedBudget / 100).toLocaleString()}</div>
          <div className="text-xs text-rose-500 font-medium">
            {baseSymbol} {(surprise.actualSpent / 100).toLocaleString()} spent
          </div>
          {surprise.items.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {baseSymbol} {(totalItemsEstimated / 100).toLocaleString()} in items
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Gift Items ({surprise.items.length})</h3>
          <Button size="sm" className="bg-rose-500 hover:bg-rose-600" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Add Item
          </Button>
        </div>
        <div className="space-y-2">
          {surprise.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border group">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {baseSymbol} {(item.estimatedCost / 100).toLocaleString()} est.
                  {item.actualCost != null ? ` · ${baseSymbol} ${(item.actualCost / 100).toLocaleString()} actual` : ""}
                </div>
                {item.purchaseLink && (
                  <a href={item.purchaseLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                    <ExternalLink className="h-3 w-3" />View product
                  </a>
                )}
                {item.notes && <div className="text-xs text-muted-foreground mt-0.5 italic">{item.notes}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select onValueChange={(v) => handleItemStatus(item.id, v)} defaultValue={item.status}>
                  <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["IDEA", "SHORTLISTED", "BOUGHT", "WRAPPED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500"
                  onClick={() => setDeleteItemId(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {surprise.items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No items yet - add your first gift idea!</p>
          )}
        </div>
      </div>

      {/* Add item dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Gift Item 🎁</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Item Name</Label><Input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Perfume, Book, Flowers" /></div>
            <div><Label>Estimated Cost ({baseSymbol})</Label><Input type="number" value={newItem.estimatedCost} onChange={(e) => setNewItem((p) => ({ ...p, estimatedCost: e.target.value }))} placeholder="0" /></div>
            <div><Label>Product Link (optional)</Label><Input value={newItem.purchaseLink} onChange={(e) => setNewItem((p) => ({ ...p, purchaseLink: e.target.value }))} placeholder="https://..." /></div>
            <div><Label>Notes (optional)</Label><Input value={newItem.notes} onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))} placeholder="Size, colour, etc." /></div>
            <Button className="w-full bg-rose-500 hover:bg-rose-600" onClick={handleAddItem} disabled={loading || !newItem.name}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Gift Item ✏️</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div><Label>Item Name</Label><Input value={editItem.name} onChange={(e) => setEditItem((p) => p ? { ...p, name: e.target.value } : p)} placeholder="e.g. Perfume" /></div>
              <div><Label>Estimated Cost ({baseSymbol})</Label><Input type="number" value={editItem.estimatedCost} onChange={(e) => setEditItem((p) => p ? { ...p, estimatedCost: e.target.value } : p)} placeholder="0" /></div>
              <div>
                <Label>Actual Cost ({baseSymbol}) <span className="text-muted-foreground text-xs font-normal">- fill once bought</span></Label>
                <Input type="number" value={editItem.actualCost} onChange={(e) => setEditItem((p) => p ? { ...p, actualCost: e.target.value } : p)} placeholder="Leave blank if not purchased yet" />
              </div>
              <div><Label>Product Link (optional)</Label><Input value={editItem.purchaseLink} onChange={(e) => setEditItem((p) => p ? { ...p, purchaseLink: e.target.value } : p)} placeholder="https://..." /></div>
              <div><Label>Notes (optional)</Label><Input value={editItem.notes} onChange={(e) => setEditItem((p) => p ? { ...p, notes: e.target.value } : p)} placeholder="Size, colour, etc." /></div>
              <Button className="w-full bg-rose-500 hover:bg-rose-600" onClick={handleEditItem} disabled={loading || !editItem.name}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete item confirm */}
      <ConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(o) => { if (!o) setDeleteItemId(null); }}
        title="Remove this item?"
        description="This will remove the item and recalculate the spent amount."
        onConfirm={handleDeleteItem}
      />

      {/* Delete surprise confirm */}
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete surprise?" description="This cannot be undone." onConfirm={handleDelete} />
    </div>
  );
}
