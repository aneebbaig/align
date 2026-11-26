"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createCategory, updateCategory, deleteCategory } from "@/actions/settings";
import { Plus, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { Category } from "@/components/settings/settings-types";

export function CategoriesTab({ categories }: { categories: Category[] }) {
  // Categories state
  const [deleteCatData, setDeleteCatData] = useState<{ id: string; name: string; isDefault: boolean } | null>(null);
  const [newCat, setNewCat] = useState({ name: "", icon: "Tag", color: "#6366f1", type: "EXPENSE" });
  const [addingCat, setAddingCat] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string; color: string } | null>(null);
  const [savingEditCat, setSavingEditCat] = useState(false);
  async function handleAddCategory() {
    if (!newCat.name) return;
    setAddingCat(true);
    const result = await createCategory(newCat);
    if (result.success) {
      toast.success("Category added!");
      setNewCat({ name: "", icon: "Tag", color: "#6366f1", type: "EXPENSE" });
    } else {
      toast.error(result.error ?? "Failed");
    }
    setAddingCat(false);
  }

  async function handleDeleteCategory(id: string) {
    const result = await deleteCategory(id);
    if (result.success) toast.success("Category deleted");
    else toast.error(result.error ?? "Failed to delete category");
    setDeleteCatData(null);
  }

  async function handleSaveEditCategory() {
    if (!editCat || !editCat.name.trim()) return;
    setSavingEditCat(true);
    const result = await updateCategory(editCat.id, { name: editCat.name.trim(), color: editCat.color });
    if (result.success) {
      toast.success("Category updated!");
      setEditCat(null);
    } else {
      toast.error(result.error ?? "Failed to update category");
    }
    setSavingEditCat(false);
  }

  const customCategories = categories.filter((c) => !c.isDefault);

  return (
    <>
      <TabsContent forceMount value="categories" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Category</CardTitle>
            <CardDescription>Create expense or income categories specific to your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
              <div className="col-span-2 sm:col-span-1">
                <Label>Name</Label>
                <Input value={newCat.name} onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Fuel" onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} />
              </div>
              <div>
                <Label>Type</Label>
                <Select onValueChange={(v) => setNewCat((p) => ({ ...p, type: v }))} defaultValue="EXPENSE">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <input type="color" value={newCat.color} onChange={(e) => setNewCat((p) => ({ ...p, color: e.target.value }))} className="h-9 w-full cursor-pointer rounded border border-input block" />
              </div>
              <Button className="w-full" onClick={handleAddCategory} disabled={addingCat}>
                <Plus className="h-4 w-4" />{addingCat ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {[
          { type: "EXPENSE", label: "Expense" },
          { type: "INCOME", label: "Income" },
          { type: "BOTH", label: "Both (Expense & Income)" },
        ].map(({ type, label }) => {
          const typeCats = categories.filter((c) => c.type === type);
          if (!typeCats.length) return null;
          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  <Badge variant="outline" className="text-xs font-normal">{typeCats.length}</Badge>
                </div>
                <CardDescription className="text-xs">
                  {type === "EXPENSE" ? "Used when logging expenses" : type === "INCOME" ? "Used when logging income" : "Available for both expense and income"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {typeCats.map((cat) => (
                    <div
                      key={cat.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border text-sm transition-colors",
                        cat.isDefault
                          ? "pl-2.5 pr-2.5 py-1 bg-muted/40 border-border/60 text-muted-foreground"
                          : "pl-2.5 pr-1 py-1 bg-card hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="leading-none">{cat.name}</span>
                      <button
                        onClick={() => setEditCat({ id: cat.id, name: cat.name, color: cat.color })}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full ml-0.5"
                        title="Edit category"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setDeleteCatData({ id: cat.id, name: cat.name, isDefault: cat.isDefault })}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 rounded-full"
                        title="Delete category"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      <ConfirmDialog
        open={!!deleteCatData}
        onOpenChange={(o) => !o && setDeleteCatData(null)}
        title={deleteCatData?.isDefault ? `Delete default category "${deleteCatData.name}"?` : "Delete category?"}
        description={
          deleteCatData?.isDefault
            ? "This is a built-in category shared by the whole household. Deleting it removes it everywhere, not just for you. Transactions using it will keep it as a reference."
            : "Transactions using this category will keep it as a reference."
        }
        onConfirm={() => handleDeleteCategory(deleteCatData!.id)}
      />

      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label>Name</Label>
              <Input
                value={editCat?.name ?? ""}
                onChange={(e) => setEditCat((p) => (p ? { ...p, name: e.target.value } : p))}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEditCategory()}
              />
            </div>
            <div>
              <Label>Color</Label>
              <input
                type="color"
                value={editCat?.color ?? "#6366f1"}
                onChange={(e) => setEditCat((p) => (p ? { ...p, color: e.target.value } : p))}
                className="h-9 w-14 cursor-pointer rounded border border-input block"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCat(null)} disabled={savingEditCat}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditCategory} disabled={savingEditCat || !editCat?.name.trim()}>
              {savingEditCat ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
