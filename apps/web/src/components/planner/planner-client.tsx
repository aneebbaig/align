"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, MoreHorizontal, Minus, Plus, Settings2, Trash2 } from "lucide-react";
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
import { MoneyInput, parseMoney } from "@/components/shared/money-input";
import { useAddShortcut } from "@/lib/use-add-shortcut";
import { cn } from "@/lib/utils";
import type { SerializedPlanner } from "@/lib/planner/store";
import {
  addMonthAfter, addMonthBefore, removeFirstMonth, removeLastMonth, type MonthRange,
} from "@/lib/planner/months";
import { lineForm, settingsForm } from "@/lib/planner/forms";
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
const toUnits = (n: number) => Math.round(n * 100); // major units -> minor units
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

const EDGE_BTN = "h-5 w-5 rounded-full border border-border bg-background text-muted-foreground flex items-center justify-center shrink-0 hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-opacity opacity-100 sm:opacity-0 group-hover/table:opacity-100 focus-visible:opacity-100";

function EdgeButton({ kind, label, disabled, onClick }: { kind: "add" | "remove"; label: string; disabled: boolean; onClick: () => void }) {
  const Icon = kind === "add" ? Plus : Minus;
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={EDGE_BTN}>
      <Icon className="h-3 w-3" />
    </button>
  );
}

// One line cell: shows the amount; click to set it for this month or onward.
function LineCell({ line, row, baseSymbol }: { line: Line; row: Row; baseSymbol: string }) {
  const cell = row.cells.find((c) => c.lineId === line.id);
  const native = cell?.native ?? 0;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(scope: "FROM_HERE" | "THIS_MONTH") {
    const amount = parseMoney(value);
    if (amount == null || amount < 0 || busy) return;
    setBusy(true);
    const ok = await report(plannerSetCell(line.id, { month: row.month, year: row.year, amount: toUnits(amount), scope }));
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
          <Label>Amount ({line.currency === "USD" ? "$" : baseSymbol})</Label>
          <MoneyInput
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              save(e.shiftKey ? "FROM_HERE" : "THIS_MONTH");
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => save("THIS_MONTH")} className="h-auto flex-col gap-0 py-1.5">
            Just this month<span className="text-[10px] font-normal text-muted-foreground">Enter</span>
          </Button>
          <Button size="sm" disabled={busy} onClick={() => save("FROM_HERE")} className="h-auto flex-col gap-0 py-1.5">
            From this month on<span className="text-[10px] font-normal opacity-70">Shift+Enter</span>
          </Button>
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
function GoalsCell({ row, baseSymbol }: { row: Row; baseSymbol: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const thisMonth = monthInput(row.month, row.year);
  const [form, setForm] = useState({ name: "", amount: "", note: "", month: thisMonth });
  const [busy, setBusy] = useState(false);

  function startEdit(g: Goal | null) {
    setEditing(g);
    setForm(g
      ? { name: g.name, amount: String(g.amountPaisas / 100), note: g.note ?? "", month: thisMonth }
      : { name: "", amount: "", note: "", month: thisMonth });
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    const amount = parseMoney(form.amount);
    if (!form.name.trim() || !(amount != null && amount > 0) || !form.month || busy) return;
    setBusy(true);
    // The month can be changed to move a goal; the table recalculates from there.
    const payload = { name: form.name, ...parseMonthInput(form.month), amountPaisas: toUnits(amount), note: form.note.trim() || null };
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
        <form onSubmit={save} className="space-y-2 border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">{editing ? `Edit "${editing.name}"` : "Add a goal"}</div>
          <Input autoFocus placeholder="Name (e.g. Engine Swap)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <MoneyInput placeholder={`Amount (${baseSymbol})`} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input placeholder="Note (optional, e.g. reserved)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Month</Label>
            <Input type="month" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            {editing && <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(null)}>Cancel</Button>}
            <Button type="submit" size="sm" className="flex-1" disabled={busy}>{editing ? "Save" : "Add goal"}</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function LineDialog({ line, open, onClose }: { line: Line | null; open: boolean; onClose: () => void }) {
  // Remounted on every open (see the key where it is rendered), so this is always the current line.
  const [form, setForm] = useState(() => lineForm(line));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || busy) return;
    setBusy(true);
    const ok = await report(line ? plannerUpdateLine(line.id, form) : plannerAddLine(form), line ? "Line updated" : "Line added");
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{line ? "Edit line" : "Add a line"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={busy}>{line ? "Save" : "Add line"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ settings, open, onClose, baseSymbol }: { settings: SerializedPlanner["settings"]; open: boolean; onClose: () => void; baseSymbol: string }) {
  // Remounted on every open (see the key where it is rendered), so this is always the current settings.
  const [form, setForm] = useState(() => settingsForm(settings));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const { month, year } = parseMonthInput(form.start);
    setBusy(true);
    const ok = await report(plannerUpdateSettings({
      startMonth: month,
      startYear: year,
      months: parseInt(form.months, 10),
      startingCashPaisas: toUnits(parseMoney(form.startingCash) ?? 0),
      usdRate: parseFloat(form.usdRate),
    }), "Forecast updated");
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Forecast settings</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start month</Label><Input type="month" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Months</Label><Input type="number" min="1" max="120" value={form.months} onChange={(e) => setForm((f) => ({ ...f, months: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Starting cash ({baseSymbol})</Label><MoneyInput value={form.startingCash} onChange={(e) => setForm((f) => ({ ...f, startingCash: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>USD rate ({baseSymbol} per $)</Label><Input type="number" min="0" step="0.01" value={form.usdRate} onChange={(e) => setForm((f) => ({ ...f, usdRate: e.target.value }))} /></div>
          </div>
          <p className="text-xs text-muted-foreground">The forecast&apos;s own rate - it doesn&apos;t change the real one in Settings.</p>
          <Button type="submit" className="w-full" disabled={busy}>Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PlannerClient({ planner, baseSymbol }: { planner: SerializedPlanner; baseSymbol: string }) {
  const { settings, lines, rows } = planner;
  const [lineDialog, setLineDialog] = useState<{ open: boolean; line: Line | null }>({ open: false, line: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteLine, setDeleteLine] = useState<Line | null>(null);
  const last = rows[rows.length - 1];
  useAddShortcut(lineDialog.open || settingsOpen, () => setLineDialog({ open: true, line: null }));

  const range: MonthRange = { startMonth: settings.startMonth, startYear: settings.startYear, months: settings.months };

  async function changeRange(next: MonthRange | null, dropped?: Row) {
    if (!next) return;
    const ok = await report(plannerUpdateSettings(next));
    if (ok && dropped && (dropped.goals.length > 0 || dropped.cells.some((c) => c.isOverride))) {
      toast(`Removed ${monthLabel(dropped.month, dropped.year)}`, {
        description: "Its changes and goals are kept if you undo.",
        action: { label: "Undo", onClick: () => { void report(plannerUpdateSettings(range)); } },
      });
    }
  }

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
        title="Forecast"
        description="Your cash month by month – separate from your real money."
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

      <p className="mt-4 mb-2 text-xs text-muted-foreground">
        {`Starting cash ${baseSymbol} ${rs(settings.startingCashPaisas)} · USD rate ${settings.usdRate} · ${monthLabel(settings.startMonth, settings.startYear)} → ${last ? monthLabel(last.month, last.year) : ""} (${settings.months} months)`}
      </p>
      <div className="group/table rounded-xl border border-border overflow-x-auto">
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
            {rows.map((row, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === rows.length - 1;
              const hasGoals = row.goals.length > 0;
              return (
                <tr key={`${row.year}-${row.month}`} className={cn("border-t border-border", hasGoals ? "bg-amber-50 dark:bg-amber-950/30" : "bg-card")}>
                  <td className={cn("sticky left-0 z-10 px-3 py-2 font-semibold whitespace-nowrap", hasGoals ? "bg-amber-50 dark:bg-amber-950/30 italic" : "bg-card")}>
                    <div className="flex items-center gap-2">
                      <span>{monthLabel(row.month, row.year)}</span>
                      {(isFirst || isLast) && (
                        <span className="flex items-center gap-1">
                          {isFirst && (<>
                            <EdgeButton kind="add" label={`Add month before ${monthLabel(row.month, row.year)}`} disabled={!addMonthBefore(range)} onClick={() => changeRange(addMonthBefore(range))} />
                            <EdgeButton kind="remove" label={`Remove ${monthLabel(row.month, row.year)}`} disabled={!removeFirstMonth(range)} onClick={() => changeRange(removeFirstMonth(range), row)} />
                          </>)}
                          {isLast && (<>
                            <EdgeButton kind="add" label={`Add month after ${monthLabel(row.month, row.year)}`} disabled={!addMonthAfter(range)} onClick={() => changeRange(addMonthAfter(range))} />
                            <EdgeButton kind="remove" label={`Remove ${monthLabel(row.month, row.year)}`} disabled={!removeLastMonth(range)} onClick={() => changeRange(removeLastMonth(range), row)} />
                          </>)}
                        </span>
                      )}
                    </div>
                  </td>
                  {lines.map((line) => (
                    <td key={line.id} className="p-0 whitespace-nowrap"><LineCell line={line} row={row} baseSymbol={baseSymbol} /></td>
                  ))}
                  <td className="p-0 min-w-[14rem]"><GoalsCell row={row} baseSymbol={baseSymbol} /></td>
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

      <LineDialog
        key={lineDialog.open ? `line-${lineDialog.line?.id ?? "new"}` : "line-closed"}
        line={lineDialog.line}
        open={lineDialog.open}
        onClose={() => setLineDialog({ open: false, line: null })}
      />
      <SettingsDialog key={settingsOpen ? "settings-open" : "settings-closed"} baseSymbol={baseSymbol} settings={settings} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
