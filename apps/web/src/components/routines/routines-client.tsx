"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flame, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { addDays } from "@/lib/routines/schedule";
import { addRoutine, editRoutine, removeRoutine, tickRoutine, untickRoutine, type RoutinesPage } from "@/actions/routines";

type Routine = RoutinesPage["routines"][number];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const describe = (r: Routine) =>
  r.date ? `Once · ${r.date}` : r.days.length === 7 ? "Every day" : r.days.map((d) => WEEKDAYS[d - 1]).join(", ");
const delta = (m: number) => `${m > 0 ? "+" : m < 0 ? "−" : "±"}${Math.abs(m) >= 60 ? `${Math.floor(Math.abs(m) / 60)}h${Math.abs(m) % 60 ? `${Math.abs(m) % 60}m` : ""}` : `${Math.abs(m)}m`}`;

async function report(p: Promise<{ success: boolean; error?: string }>, ok?: string) {
  const r = await p;
  if (!r.success) toast.error(r.error ?? "Failed");
  else if (ok) toast.success(ok);
  return r.success;
}

export function RoutinesClient({ data }: { data: RoutinesPage }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Routine | "new" | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);

  const done = data.day.filter((i) => i.done).length;
  const goTo = (date: string) => router.push(date === data.today ? "/routines" : `/routines?date=${date}`);
  const refresh = () => startTransition(() => router.refresh());

  async function toggle(id: string, isDone: boolean) {
    const ok = await report(isDone ? untickRoutine(id, data.date) : tickRoutine(id, data.date));
    if (ok) refresh();
  }

  return (
    <div>
      <PageHeader
        section="Life"
        title="Routines"
        description="Tick off your day. Reminders for these are sent by the phone app."
        action={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4 mr-1" />Add routine</Button>}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => goTo(addDays(data.date, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium w-32 text-center">{data.date === data.today ? "Today" : data.date}</span>
          <Button variant="ghost" size="icon" aria-label="Next day" onClick={() => goTo(addDays(data.date, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground"><Flame className="h-4 w-4" />{data.currentStreak} day streak · best {data.bestStreak}</span>
          <span className="font-semibold tabular-nums">{done}/{data.day.length} done</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-6" aria-label="Last 7 days">
        {data.week.map((d) => (
          <button
            key={d.date}
            onClick={() => goTo(d.date)}
            className={cn(
              "rounded-md border px-1 py-2 text-center text-[11px] leading-tight",
              d.date === data.date && "border-foreground",
              d.scheduled > 0 && d.done === d.scheduled && "bg-emerald-500/15",
            )}
          >
            <div className="text-muted-foreground">{d.date.slice(5)}</div>
            <div className="font-semibold tabular-nums">{d.scheduled === 0 ? "–" : `${d.done}/${d.scheduled}`}</div>
          </button>
        ))}
      </div>

      <div className="divide-y rounded-lg border">
        {data.day.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">Nothing scheduled for this day.</p>}
        {data.day.map((item) => (
          <label key={item.routineId} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
            <Checkbox checked={item.done} onCheckedChange={() => toggle(item.routineId, item.done)} />
            <span className="w-14 text-sm tabular-nums text-muted-foreground">{item.time}</span>
            <span className={cn("flex-1 text-sm", item.done && "line-through text-muted-foreground")}>{item.title}</span>
            {item.deltaMinutes !== null && (
              <span className={cn("text-xs tabular-nums", item.deltaMinutes > 0 ? "text-amber-500" : "text-emerald-500")}>{delta(item.deltaMinutes)}</span>
            )}
          </label>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold">All routines</h2>
      <div className="divide-y rounded-lg border">
        {data.routines.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">No routines yet. Add one to get started.</p>}
        {data.routines.map((r) => (
          <div key={r.id} className={cn("flex items-center gap-3 px-4 py-3", !r.active && "opacity-50")}>
            <span className="w-14 text-sm tabular-nums text-muted-foreground">{r.time}</span>
            <div className="flex-1">
              <div className="text-sm">{r.title}</div>
              <div className="text-xs text-muted-foreground">{describe(r)}{!r.active && " · paused"}</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Routine options"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleting(r)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {editing && (
        <RoutineDialog
          key={editing === "new" ? "new" : editing.id}
          routine={editing === "new" ? null : editing}
          defaultDate={data.date}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete routine?"
        description={deleting ? `"${deleting.title}" and its history will be removed.` : ""}
        onConfirm={async () => {
          if (deleting && (await report(removeRoutine(deleting.id), "Routine deleted"))) { setDeleting(null); refresh(); }
        }}
      />
    </div>
  );
}

function RoutineDialog({ routine, defaultDate, onClose, onSaved }: {
  routine: Routine | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(routine?.title ?? "");
  const [time, setTime] = useState(routine?.time ?? "06:00");
  const [once, setOnce] = useState(!!routine?.date);
  const [days, setDays] = useState<number[]>(routine ? routine.days : ALL_DAYS);
  const [date, setDate] = useState(routine?.date ?? defaultDate);
  const [active, setActive] = useState(routine?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const body = { title, time, days: once ? [] : days, date: once ? date : null, active };
    const ok = await report(routine ? editRoutine(routine.id, body) : addRoutine(body), routine ? "Routine updated" : "Routine added");
    setSaving(false);
    if (ok) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{routine ? "Edit routine" : "Add routine"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="r-title">Title</Label>
            <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Learn Japanese" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-time">Time</Label>
            <Input id="r-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="r-once">Only once, on a date</Label>
            <Switch id="r-once" checked={once} onCheckedChange={setOnce} />
          </div>
          {once ? (
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((label, i) => {
                const d = i + 1;
                const on = days.includes(d);
                return (
                  <Button key={d} type="button" size="sm" variant={on ? "default" : "outline"}
                    onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}>{label}</Button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="r-active">Active (reminders on)</Label>
            <Switch id="r-active" checked={active} onCheckedChange={setActive} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
