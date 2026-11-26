"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProjectTaskData } from "@/components/projects/project-task-card";
import { PROJECT_TASK_STATUSES, PROJECT_TASK_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type Columns = Record<string, ProjectTaskData[]>;

export function bucket(tasks: ProjectTaskData[]): Columns {
  const cols: Columns = Object.fromEntries(PROJECT_TASK_STATUSES.map((s) => [s, []]));
  for (const t of tasks) (cols[t.status] ?? cols.TODO).push(t);
  return cols;
}

export function findColumn(columns: Columns, id: string): string | undefined {
  return Object.keys(columns).find((s) => columns[s].some((t) => t.id === id));
}

// A quiet inline "add card" that expands into a title input at the bottom of a column.
function AddCard({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const title = value.trim();
    if (!title) { setOpen(false); return; }
    setBusy(true);
    await onAdd(title);
    setBusy(false);
    setValue("");
    inputRef.current?.focus();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground/80 hover:bg-card hover:text-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <textarea
        ref={inputRef}
        autoFocus
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (!value.trim() && !busy) { setOpen(false); setValue(""); } }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") { setOpen(false); setValue(""); }
        }}
        placeholder="What needs doing?"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <Button size="sm" className="h-7" onClick={submit} disabled={busy || !value.trim()}>Add</Button>
        <button onClick={() => { setOpen(false); setValue(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

export function KanbanColumn({
  status, count, tasks, onAdd, allSelected, onToggleSelectAll, children,
}: {
  status: string;
  count: number;
  tasks: ProjectTaskData[];
  onAdd: (title: string) => Promise<void>;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col lg:w-auto lg:min-w-0">
      <div className="mb-2 flex items-center gap-2 px-1">
        {tasks.length > 0 && (
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label={`Select all in ${PROJECT_TASK_STATUS_LABELS[status]}`}
          />
        )}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {PROJECT_TASK_STATUS_LABELS[status]}
        </h2>
        <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl border p-1.5 transition-colors",
          isOver ? "border-primary/40 bg-primary/5" : "border-transparent bg-muted/40",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">{children}</div>
        </SortableContext>
        <div className="pt-1">
          <AddCard onAdd={onAdd} />
        </div>
      </div>
    </div>
  );
}
