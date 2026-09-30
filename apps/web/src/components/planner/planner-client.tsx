"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import type { SerializedPlanner } from "@/lib/planner/store";
import {
  plannerAddGoal, plannerAddLine, plannerDeleteGoal, plannerDeleteLine, plannerRemoveOverride,
  plannerReorderLines, plannerSetCell, plannerUpdateGoal, plannerUpdateLine, plannerUpdateSettings,
} from "@/actions/planner";

type Line = SerializedPlanner["lines"][number];
type Row = SerializedPlanner["rows"][number];
type Goal = Row["goals"][number];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: number, y: number) => `${MONTHS[m - 1]} ${y}`;
const rs = (paisas: number) => (paisas / 100).toLocaleString();
const toUnits = (s: string) => Math.round(parseFloat(s) * 100); // rupees/dollars -> paisas/cents
const monthInput = (m: number, y: number) => `${y}-${String(m).padStart(2, "0")}`;
const parseMonthInput = (s: string) => {
  const [y, m] = s.split("-").map(Number);
  return { month: m, year: y };
};

async function report(p: Promise<{ success: boolean; error?: string }>, ok?: string) {
  const r = await p;
  if (!r.success) toast.error(r.error ?? "Failed");
  else if (ok) toast.success(ok);
  return r.success;
}

// One line cell: shows the amount; click to set it for this month or onward.
function LineCell({ line, row }: { line: Line; row: Row }) {
  const cell = row.cells.find((c) => c.lineId === line.id);
  const native = cell?.native ?? 0;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(scope: "FROM_HERE" | "THIS_MONTH") {
    if (value.trim() === "" || Number.isNaN(parseFloat(value)) || parseFloat(value) < 0) return;
    setBusy(true);
    const ok = await report(plannerSetCell(line.id, { month: row.month, year: row.year, amount: toUnits(value), scope }));
    setBusy(false);
    if (ok) setOpen(false);
  }

  async function clearOverride() {
    setBusy(true);
    const ok = await report(plannerRemoveOverride(line.id, { month: row.month, year: row.year }));
    setBusy(false);
    if (ok) setOpen(false);
  }

  const shown = cell && cell.pkr !== 0
    ? `${line.direction === "OUT" ? "-" : ""}${rs(cell.pkr)}${line.currency === "USD" ? ` ($${rs(native)})` : ""}`
    : "–";

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setValue(String(native / 100)); }}>
      <PopoverTrigger asChild>
        <button className="w-full text-right tabnum px-3 py-2 hover:bg-muted/60 relative">
          {shown}
          {cell?.isOverride && <span className="absolute top-1.5 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" title="This month only" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <div className="text-sm font-medium">{line.name} · {monthLabel(row.month, row.year)}</div>
        <div className="space-y-1.5">
          <Label>Amount ({line.currency === "USD" ? "$" : "Rs"})</Label>
          <Input autoFocus type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => save("THIS_MONTH")}>Just this month</Button>
          <Button size="sm" disabled={busy} onClick={() => save("FROM_HERE")}>From this month on</Button>
        </div>
        {cell?.isOverride && (
          <Button size="sm" variant="ghost" className="w-full text-muted-foreground" disabled={busy} onClick={clearOverride}>
            Remove this month&apos;s change
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Goals cell: lists the month's goals; click to add/edit/delete.
function GoalsCell({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", note: "" });
  const [busy, setBusy] = useState(false);

  function startEdit(g: Goal | null) {
    setEditing(g);
    setForm(g ? { name: g.name, amount: String(g.amountPaisas / 100), note: g.note ?? "" } : { name: "", amount: "", note: "" });
  }

  async function save() {
    if (!form.name.trim() || !(parseFloat(form.amount) > 0)) return;
    setBusy(true);
    const payload = { name: form.name, month: row.month, year: row.year, amountPaisas: toUnits(form.amount), note: form.note.trim() || null };
    const ok = await report(editing ? plannerUpdateGoal(editing.id, payload) : plannerAddGoal(payload));
    setBusy(false);
    if (ok) startEdit(null);
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) startEdit(null); }}>
      <PopoverTrigger asChild>
        <button className="w-full text-left px-3 py-2 hover:bg-muted/60 min-h-[2.25rem]">
          {row.goals.map((g) => (
            <div key={g.id} className="text-xs font-semibold text-amber-700 dark:text-amber-400 leading-snug">
              {g.name} −{rs(g.amountPaisas)}{g.note ? <span className="font-normal italic"> · {g.note}</span> : null}
            </div>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="start">
        <div className="text-sm font-medium">Goals · {monthLabel(row.month, row.year)}</div>
        {row.goals.map((g) => (
          <div key={g.id} className="flex items-center justify-between text-sm gap-2">
            <button className="text-left truncate hover:underline" onClick={() => startEdit(g)}>{g.name} −{rs(g.amountPaisas)}</button>
            <button className="text-muted-foreground hover:text-destructive" aria-label="Delete goal"
              onClick={() => report(plannerDeleteGoal(g.id), "Goal deleted")}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="space-y-2 border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">{editing ? `Edit "${editing.name}"` : "Add a goal"}</div>
          <Input placeholder="Name (e.g. Engine Swap)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input type="number" min="0" placeholder="Amount (Rs)" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input placeholder="Note (optional, e.g. reserved)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <div className="flex gap-2">
            {editing && <Button size="sm" variant="ghost" onClick={() => startEdit(null)}>Cancel</Button>}
            <Button size="sm" className="flex-1" disabled={busy} onClick={save}>{editing ? "Save" : "Add goal"}</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LineDialog({ line, open, onClose }: { line: Line | null; open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", direction: "IN", currency: "PKR" });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    const ok = await report(line ? plannerUpdateLine(line.id, form) : plannerAddLine(form), line ? "Line updated" : "Line added");
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (o) setForm(line ? { name: line.name, direction: line.direction, currency: line.currency } : { name: "", direction: "IN", currency: "PKR" });
      else onClose();
    }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{line ? "Edit line" : "Add a line"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input autoFocus placeholder="e.g. Base Savings, Car Loan" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Money</Label>
              <Select value={form.direction} onValueChange={(v) => setForm((f) => ({ ...f, direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Coming in (+)</SelectItem>
                  <SelectItem value="OUT">Going out (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entered in</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">Rupees</SelectItem>
                  <SelectItem value="USD">Dollars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" disabled={busy} onClick={save}>{line ? "Save" : "Add line"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ settings, open, onClose }: { settings: SerializedPlanner["settings"]; open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ start: "", months: "", startingCash: "", usdRate: "" });
  const [busy, setBusy] = useState(false);

  async function save() {
    const { month, year } = parseMonthInput(form.start);
    setBusy(true);
    const ok = await report(plannerUpdateSettings({
      startMonth: month,
      startYear: year,
      months: parseInt(form.months, 10),
      startingCashPaisas: toUnits(form.startingCash || "0"),
      usdRate: parseFloat(form.usdRate),
    }), "Planner updated");
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (o) setForm({
        start: monthInput(settings.startMonth, settings.startYear),
        months: String(settings.months),
        startingCash: String(settings.startingCashPaisas / 100),
        usdRate: String(settings.usdRate),
      });
      else onClose();
    }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Planner settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start month</Label><Input type="month" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Months</Label><Input type="number" min="1" max="120" value={form.months} onChange={(e) => setForm((f) => ({ ...f, months: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Starting cash (Rs)</Label><Input type="number" value={form.startingCash} onChange={(e) => setForm((f) => ({ ...f, startingCash: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>USD rate (Rs per $)</Label><Input type="number" min="0" step="0.01" value={form.usdRate} onChange={(e) => setForm((f) => ({ ...f, usdRate: e.target.value }))} /></div>
          </div>
          <p className="text-xs text-muted-foreground">The planner&apos;s own rate - it doesn&apos;t change the real one in Settings.</p>
          <Button className="w-full" disabled={busy} onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PlannerClient({ planner }: { planner: SerializedPlanner }) {
  const { settings, lines, rows } = planner;
  const [lineDialog, setLineDialog] = useState<{ open: boolean; line: Line | null }>({ open: false, line: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteLine, setDeleteLine] = useState<Line | null>(null);
  const last = rows[rows.length - 1];

  function move(line: Line, dir: -1 | 1) {
    const ids = lines.map((l) => l.id);
    const i = ids.indexOf(line.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    report(plannerReorderLines({ ids }));
  }

  return (
    <>
      <PageHeader
        section="Planning"
        title="Planner"
        description={`Starting cash Rs ${rs(settings.startingCashPaisas)} · USD rate ${settings.usdRate} · ${monthLabel(settings.startMonth, settings.startYear)} → ${last ? monthLabel(last.month, last.year) : ""} (${settings.months} months)`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSettingsOpen(true)}><Settings2 className="h-4 w-4" />Settings</Button>
            <Button onClick={() => setLineDialog({ open: true, line: null })}><Plus className="h-4 w-4" />Line</Button>
          </div>
        }
      />

      {lines.length === 0 && rows.every((r) => r.goals.length === 0) ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add a line for each regular amount - savings, a fee, a loan instalment, freelance income. Click any month to change it for
            that month or from then on. Add one-off goals in the Goals column. Net and Available update themselves.
          </p>
          <Button onClick={() => setLineDialog({ open: true, line: null })}><Plus className="h-4 w-4" />Add your first line</Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-border overflow-x-auto mt-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left whitespace-nowrap">Month</th>
              {lines.map((line, i) => (
                <th key={line.id} className="px-1 py-1 text-right whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-muted">
                        {line.name}
                        <span className="font-normal opacity-60">{line.direction === "IN" ? "+" : "−"}{line.currency === "USD" ? " $" : ""}</span>
                        <MoreHorizontal className="h-3 w-3 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLineDialog({ open: true, line })}>Edit line</DropdownMenuItem>
                      <DropdownMenuItem disabled={i === 0} onClick={() => move(line, -1)}><ArrowLeft className="h-3.5 w-3.5" />Move left</DropdownMenuItem>
                      <DropdownMenuItem disabled={i === lines.length - 1} onClick={() => move(line, 1)}><ArrowRight className="h-3.5 w-3.5" />Move right</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteLine(line)}>
                        <Trash2 className="h-3.5 w-3.5" />Delete line
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </th>
              ))}
              <th className="px-3 py-2 text-left">Goals</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="sticky right-0 z-10 bg-muted px-3 py-2 text-right">Available</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasGoals = row.goals.length > 0;
              return (
                <tr key={`${row.year}-${row.month}`} className={cn("border-t border-border", hasGoals ? "bg-amber-50 dark:bg-amber-950/30" : "bg-card")}>
                  <td className={cn("sticky left-0 z-10 px-3 py-2 font-semibold whitespace-nowrap", hasGoals ? "bg-amber-50 dark:bg-amber-950/30 italic" : "bg-card")}>
                    {monthLabel(row.month, row.year)}
                  </td>
                  {lines.map((line) => (
                    <td key={line.id} className="p-0 whitespace-nowrap"><LineCell line={line} row={row} /></td>
                  ))}
                  <td className="p-0 min-w-[14rem]"><GoalsCell row={row} /></td>
                  <td className={cn("px-3 py-2 text-right tabnum whitespace-nowrap", row.net < 0 ? "text-red-500 font-semibold" : "text-emerald-600 dark:text-emerald-400")}>
                    {rs(row.net)}
                  </td>
                  <td className={cn("sticky right-0 z-10 px-3 py-2 text-right tabnum font-bold whitespace-nowrap",
                    hasGoals ? "bg-amber-50 dark:bg-amber-950/30" : "bg-card", row.available < 0 && "text-red-500")}>
                    {rs(row.available)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LineDialog line={lineDialog.line} open={lineDialog.open} onClose={() => setLineDialog({ open: false, line: null })} />
      <SettingsDialog settings={settings} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog
        open={!!deleteLine}
        onOpenChange={(o) => !o && setDeleteLine(null)}
        title={`Delete "${deleteLine?.name}"?`}
        description="Removes this line and every amount you set for it. Goals are not affected."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteLine) await report(plannerDeleteLine(deleteLine.id), "Line deleted");
          setDeleteLine(null);
        }}
      />
    </>
  );
}
