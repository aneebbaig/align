"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateInvestment } from "@/actions/investments";
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { CustomFieldsForm } from "./custom-fields";
import { parseCustomFields, type CustomFields, type Investment } from "./investment-types";

/** Only changes what an investment is worth today - no money in or out. */
export function UpdateValueDialog({ item, onClose, baseSymbol }: { item: Investment | null; onClose: () => void; baseSymbol: string }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {item && <UpdateForm key={item.id} item={item} onClose={onClose} baseSymbol={baseSymbol} />}
      </DialogContent>
    </Dialog>
  );
}

function UpdateForm({ item, onClose, baseSymbol }: { item: Investment; onClose: () => void; baseSymbol: string }) {
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<CustomFields>(() => parseCustomFields(item.customFields ?? null));
  const [form, setForm] = useState({
    currentValue: String(item.currentValue / 100),
    units: item.units ? String(item.units) : "",
    notes: item.notes ?? "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const result = await updateInvestment(item.id, {
      currentValue: parseMoney(form.currentValue) || item.currentValue / 100,
      units: form.units ? parseFloat(form.units) : undefined,
      customFields: Object.keys(fields).length > 0 ? JSON.stringify(fields) : undefined,
      notes: form.notes || undefined,
    });
    if (result.success) {
      toast.success("Updated!");
      onClose();
    } else {
      toast.error(result.error ?? "Failed");
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader><DialogTitle>Update value — {item.name}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground -mt-2">
        Only changes what it&apos;s worth today. Doesn&apos;t record money in or out - use Add money or Withdraw for that.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Current Value ({baseSymbol})</Label>
            <MoneyInput autoFocus onFocus={(e) => e.currentTarget.select()} value={form.currentValue} onChange={(e) => setForm((f) => ({ ...f, currentValue: e.target.value }))} />
          </div>
          {(item.type === "MUTUAL_FUND" || item.type === "STOCKS") && (
            <div className="space-y-1.5">
              <Label>Units / Shares</Label>
              <Input type="number" value={form.units} onChange={(e) => setForm((f) => ({ ...f, units: e.target.value }))} />
            </div>
          )}
        </div>
        <CustomFieldsForm type={item.type} fields={fields} onChange={setFields} baseSymbol={baseSymbol} />
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <Button type="submit" disabled={pending} className="w-full">Save Changes</Button>
      </form>
    </>
  );
}
