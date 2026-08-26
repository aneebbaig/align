"use client";

import { useEffect, useState } from "react";
import { Loader2, Snowflake, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const OCCASION_OPTIONS = [
  { value: "DAILY_WEAR", label: "Daily wear" },
  { value: "WORK", label: "Work" },
  { value: "DATE", label: "Date" },
  { value: "FORMAL_MEETING", label: "Formal meeting" },
];

const DEFAULT_FORM = {
  name: "",
  company: "",
  category: "IMPRESSION",
  status: "WANT_TO_BUY",
  isSummer: true,
  blindBuy: false,
  basedOn: "",
  price: "",
  quantity: "",
  occasion: "DAILY_WEAR",
  notes: "",
  customOccasion: "",
};

export interface PerfumeFormData {
  name: string;
  company?: string | null;
  category: string;
  price: number;
  quantity?: number | null;
  status: string;
  isLiked: boolean;
  buyNext: boolean;
  isSummer: boolean;
  blindBuy: boolean;
  occasion?: string | null;
  notes?: string | null;
  basedOn?: string | null;
}

interface PerfumeFormPerfume {
  name: string;
  company: string | null;
  category: string;
  price: number;
  quantity: number | null;
  status: string;
  isLiked: boolean;
  isSummer: boolean;
  blindBuy: boolean;
  occasion: string | null;
  notes: string | null;
  basedOn: string | null;
}

export function PerfumeForm({
  open,
  onClose,
  onSubmit,
  perfume = null,
  baseSymbol = "Rs",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PerfumeFormData) => Promise<void>;
  perfume?: PerfumeFormPerfume | null;
  baseSymbol?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const isKnownOccasion = (v: string) => !v || OCCASION_OPTIONS.some((o) => o.value === v);
  const occasionSelectValue = isKnownOccasion(formData.occasion)
    ? formData.occasion || "DAILY_WEAR"
    : "OTHER";

  useEffect(() => {
    if (!open) return;
    if (!perfume) {
      setFormData(DEFAULT_FORM);
      return;
    }
    const knownOcc = isKnownOccasion(perfume.occasion ?? "");
    setFormData({
      name: perfume.name,
      company: perfume.company ?? "",
      category: perfume.category,
      price: (perfume.price / 100).toString(),
      quantity: perfume.quantity?.toString() ?? "",
      status: perfume.status,
      isSummer: perfume.isSummer,
      blindBuy: perfume.blindBuy,
      occasion: knownOcc ? (perfume.occasion ?? "DAILY_WEAR") : "OTHER",
      notes: perfume.notes ?? "",
      basedOn: perfume.basedOn ?? "",
      customOccasion: !knownOcc ? (perfume.occasion ?? "") : "",
    });
  }, [open, perfume]);

  async function handleSubmit() {
    if (loading) return;
    if (!formData.name.trim()) { toast.error("Name is required"); return; }
    if (!formData.company.trim()) { toast.error("House is required"); return; }

    const { customOccasion, ...rest } = formData;
    setLoading(true);
    try {
      await onSubmit({
        ...rest,
        name: formData.name.trim(),
        company: formData.company.trim(),
        basedOn: formData.category === "ORIGINAL" ? null : formData.basedOn.trim() || null,
        occasion: occasionSelectValue === "OTHER" ? customOccasion.trim() || null : occasionSelectValue,
        notes: formData.notes.trim() || null,
        price: parseFloat(formData.price) || 0,
        quantity: formData.quantity ? parseInt(formData.quantity, 10) || null : null,
        isLiked: perfume?.isLiked ?? false,
        buyNext: false,
      });
    } catch {
      // parent handles toast; keep dialog open
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{perfume ? "Edit Perfume" : "Add Perfume"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div className="space-y-1">
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sauvage"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="p-company">House</Label>
            <Input
              id="p-company"
              value={formData.company}
              onChange={(e) => setFormData((f) => ({ ...f, company: e.target.value }))}
              placeholder="Brand or seller"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData((f) => ({ ...f, category: v, basedOn: v === "ORIGINAL" ? "" : f.basedOn }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORIGINAL">Original</SelectItem>
                  <SelectItem value="IMPRESSION">Impression</SelectItem>
                  <SelectItem value="CLONE">Clone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WANT_TO_BUY">Want to Buy</SelectItem>
                  <SelectItem value="BOUGHT">Bought</SelectItem>
                  <SelectItem value="UNDECIDED">Undecided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.category !== "ORIGINAL" && (
            <div className="space-y-1">
              <Label htmlFor="p-based-on">
                Based on <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="p-based-on"
                value={formData.basedOn}
                onChange={(e) => setFormData((f) => ({ ...f, basedOn: e.target.value }))}
                placeholder="Original fragrance or DNA"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="p-price">Price ({baseSymbol})</Label>
              <Input
                id="p-price"
                type="number"
                inputMode="decimal"
                value={formData.price}
                onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-quantity">
                Qty (ml) <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="p-quantity"
                type="number"
                inputMode="numeric"
                value={formData.quantity}
                onChange={(e) => setFormData((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="e.g. 100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Season</Label>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setFormData((f) => ({ ...f, isSummer: true }))}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  formData.isSummer ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                Summer
              </button>
              <button
                type="button"
                onClick={() => setFormData((f) => ({ ...f, isSummer: false }))}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  !formData.isSummer ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                Winter
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="p-blind-buy"
              checked={formData.blindBuy}
              onCheckedChange={(v) => setFormData((f) => ({ ...f, blindBuy: !!v }))}
            />
            <Label htmlFor="p-blind-buy" className="cursor-pointer font-normal">
              Blind buy - haven&apos;t smelled it
            </Label>
          </div>

          <div className="space-y-1">
            <Label>Occasion</Label>
            <Select
              value={occasionSelectValue}
              onValueChange={(v) => setFormData((f) => ({
                ...f,
                occasion: v,
                customOccasion: v === "OTHER" ? f.customOccasion : "",
              }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OCCASION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {occasionSelectValue === "OTHER" && (
            <div className="space-y-1">
              <Label htmlFor="p-custom-occasion">Custom occasion</Label>
              <Input
                id="p-custom-occasion"
                value={formData.customOccasion}
                onChange={(e) => setFormData((f) => ({ ...f, customOccasion: e.target.value }))}
                placeholder="e.g. Gym, wedding, travel"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="p-notes">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="p-notes"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Vanilla, oud, fresh, too sweet..."
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : perfume ? "Save Changes" : "Add Perfume"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
