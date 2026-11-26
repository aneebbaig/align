"use client";

import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCustomFields, type CustomFields } from "./investment-types";

export function CustomFieldsForm({ type, fields, onChange, baseSymbol }: {
  type: string;
  fields: CustomFields;
  onChange: (f: CustomFields) => void;
  baseSymbol: string;
}) {
  const set = (key: keyof CustomFields, value: string) => onChange({ ...fields, [key]: value });

  if (type === "MUTUAL_FUND") return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-muted/30">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mutual Fund Details</div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Fund House</Label><Input placeholder="e.g. Meezan" value={fields.fundHouse ?? ""} onChange={(e) => set("fundHouse", e.target.value)} /></div>
        <div><Label className="text-xs">Folio Number</Label><Input placeholder="Optional" value={fields.folioNumber ?? ""} onChange={(e) => set("folioNumber", e.target.value)} /></div>
        <div><Label className="text-xs">NAV ({baseSymbol})</Label><Input type="number" placeholder="0.00" value={fields.nav ?? ""} onChange={(e) => set("nav", e.target.value)} /></div>
        <div><Label className="text-xs">Units</Label><Input type="number" placeholder="0.00" value={fields.mfUnits ?? ""} onChange={(e) => set("mfUnits", e.target.value)} /></div>
      </div>
    </div>
  );

  if (type === "STOCKS") return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-muted/30">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Details</div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Ticker</Label><Input placeholder="e.g. LUCK" value={fields.ticker ?? ""} onChange={(e) => set("ticker", e.target.value)} /></div>
        <div><Label className="text-xs">Exchange</Label><Input placeholder="e.g. PSX" value={fields.exchange ?? ""} onChange={(e) => set("exchange", e.target.value)} /></div>
        <div><Label className="text-xs">Shares</Label><Input type="number" placeholder="0" value={fields.shares ?? ""} onChange={(e) => set("shares", e.target.value)} /></div>
        <div><Label className="text-xs">Price/Share ({baseSymbol})</Label><Input type="number" placeholder="0.00" value={fields.pricePerShare ?? ""} onChange={(e) => set("pricePerShare", e.target.value)} /></div>
      </div>
    </div>
  );

  if (type === "GOLD") return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-muted/30">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gold Details</div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Weight (grams)</Label><Input type="number" placeholder="0.00" value={fields.weightGrams ?? ""} onChange={(e) => set("weightGrams", e.target.value)} /></div>
        <div><Label className="text-xs">Purity</Label>
          <Select value={fields.purity ?? "24K"} onValueChange={(v) => set("purity", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["24K", "22K", "21K", "18K"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label className="text-xs">Storage Location</Label><Input placeholder="e.g. Bank locker, Home" value={fields.storageLocation ?? ""} onChange={(e) => set("storageLocation", e.target.value)} /></div>
      </div>
    </div>
  );

  if (type === "FIXED_DEPOSIT") return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-muted/30">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fixed Deposit Details</div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Bank</Label><Input placeholder="e.g. HBL" value={fields.bank ?? ""} onChange={(e) => set("bank", e.target.value)} /></div>
        <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" placeholder="0.00" value={fields.interestRate ?? ""} onChange={(e) => set("interestRate", e.target.value)} /></div>
        <div className="col-span-2"><Label className="text-xs">Maturity Date</Label><Input type="date" value={fields.maturityDate ?? ""} onChange={(e) => set("maturityDate", e.target.value)} /></div>
      </div>
    </div>
  );

  return null;
}

export function CustomFieldsSummary({ type, raw, baseSymbol }: { type: string; raw: string | null; baseSymbol: string }) {
  const f = parseCustomFields(raw);
  if (type === "MUTUAL_FUND") return (
    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
      {f.fundHouse && <span>Fund: {f.fundHouse}</span>}
      {f.nav && <span>NAV: {baseSymbol} {f.nav}</span>}
      {f.mfUnits && <span>Units: {f.mfUnits}</span>}
      {f.folioNumber && <span>Folio: {f.folioNumber}</span>}
    </div>
  );
  if (type === "STOCKS") return (
    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
      {f.ticker && <span className="font-mono">{f.ticker}</span>}
      {f.exchange && <span>{f.exchange}</span>}
      {f.shares && <span>{f.shares} shares</span>}
      {f.pricePerShare && <span>@{baseSymbol} {f.pricePerShare}</span>}
    </div>
  );
  if (type === "GOLD") return (
    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
      {f.weightGrams && <span>{f.weightGrams}g</span>}
      {f.purity && <span>{f.purity}</span>}
      {f.storageLocation && <span>{f.storageLocation}</span>}
    </div>
  );
  if (type === "FIXED_DEPOSIT") return (
    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
      {f.bank && <span>{f.bank}</span>}
      {f.interestRate && <span>{f.interestRate}% p.a.</span>}
      {f.maturityDate && <span>Matures {format(new Date(f.maturityDate), "dd MMM yyyy")}</span>}
    </div>
  );
  return null;
}
