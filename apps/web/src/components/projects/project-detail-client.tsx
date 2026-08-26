"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, CalendarClock, User, PanelRight, X,
} from "lucide-react";
import {
  DndContext, DragOverlay, closestCorners, DragEndEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectTaskCard, ProjectTaskData } from "@/components/projects/project-task-card";
import { ProjectNotesDrawer, ProjectLink } from "@/components/projects/project-notes-drawer";
import type { TagOption } from "@/components/projects/tag-picker";
import {
  createProjectTask, updateProject, deleteProject, reorderProjectTasks,
  bulkUpdateProjectTasks, bulkDeleteProjectTasks,
} from "@/actions/projects";
import {
  PROJECT_STATUSES, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  PROJECT_TASK_STATUSES, PROJECT_TASK_STATUS_LABELS, PROJECT_TASK_PRIORITIES,
} from "@/lib/constants";
import { cn, isOverdue } from "@/lib/utils";

export interface ProjectDetailData {
  id: string;
  name: string;
  description: string | null;
  client: string | null;
  color: string;
  status: string;
  dueDate: Date | null;
  notes: string;
  links: ProjectLink[];
  tasks: ProjectTaskData[];
}

export interface ProjectDetailProps {
  project: ProjectDetailData;
  allTags: TagOption[];
}

type Columns = Record<string, ProjectTaskData[]>;

function bucket(tasks: ProjectTaskData[]): Columns {
  const cols: Columns = Object.fromEntries(PROJECT_TASK_STATUSES.map((s) => [s, []]));
  for (const t of tasks) (cols[t.status] ?? cols.TODO).push(t);
  return cols;
}

function findColumn(columns: Columns, id: string): string | undefined {
  return Object.keys(columns).find((s) => columns[s].some((t) => t.id === id));
}

// A quiet inline "add card" that expands into a title input at the bottom of a column.
function AddCard({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const title = value.trim();
    if (!title) { setOpen(false); return; }
    setBusy(true);
    await onAdd(title);
    setBusy(false);
    setValue("");
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
        autoFocus
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
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

function KanbanColumn({
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
    <div className="flex w-72 shrink-0 flex-col">
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

export function ProjectDetailClient({ project, allTags: initialTags }: ProjectDetailProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(() => bucket(project.tasks));
  const [allTags, setAllTags] = useState<TagOption[]>(initialTags);
  const [activeTask, setActiveTask] = useState<ProjectTaskData | null>(null);
  const dragSnapshot = useRef<{ status: string; columns: Columns } | null>(null);
  const [status, setStatus] = useState(project.status);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectionMode = selectedIds.size > 0;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const overdue = isOverdue(project.dueDate) && status === "ACTIVE";

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }

  function toggleSelectAllInColumn(columnStatus: string) {
    const ids = columns[columnStatus].map((t) => t.id);
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id); else next.add(id);
      }
      return next;
    });
  }

  async function bulkMove(nextStatus: string) {
    const ids = [...selectedIds];
    const result = await bulkUpdateProjectTasks(ids, { status: nextStatus });
    if (result.success) { clearSelection(); refresh(); }
    else toast.error("Failed to move tasks");
  }
  async function bulkPriority(priority: string) {
    const ids = [...selectedIds];
    const result = await bulkUpdateProjectTasks(ids, { priority });
    if (result.success) { clearSelection(); refresh(); }
    else toast.error("Failed to update tasks");
  }
  async function bulkDelete() {
    const ids = [...selectedIds];
    const result = await bulkDeleteProjectTasks(ids);
    if (result.success) { toast.success(`Deleted ${ids.length} task${ids.length > 1 ? "s" : ""}`); clearSelection(); refresh(); }
    else toast.error("Failed to delete tasks");
  }

  useEffect(() => {
    setColumns(bucket(project.tasks));
    setStatus(project.status);
  }, [project]);

  function refresh() { router.refresh(); }

  async function changeStatus(next: string) {
    setStatus(next);
    const result = await updateProject(project.id, { status: next });
    if (result.success) refresh();
    else toast.error("Failed to update status");
  }

  async function addTask(columnStatus: string, title: string) {
    const result = await createProjectTask(project.id, { title, status: columnStatus });
    if (result.success) refresh();
    else toast.error(result.error ?? "Failed to add task");
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProject(project.id);
    if (result.success) { toast.success("Project deleted"); router.push("/projects"); }
    else { toast.error("Failed to delete"); setDeleting(false); setDeleteOpen(false); }
  }

  function handleDragStart(id: string) {
    const columnStatus = findColumn(columns, id);
    if (!columnStatus) return;
    setActiveTask(columns[columnStatus].find((t) => t.id === id) ?? null);
    dragSnapshot.current = { status: columnStatus, columns };
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    setColumns((prev) => {
      const activeStatus = findColumn(prev, activeId);
      const overStatus = (PROJECT_TASK_STATUSES as readonly string[]).includes(overId)
        ? overId
        : findColumn(prev, overId);
      if (!activeStatus || !overStatus) return prev;

      const activeItems = prev[activeStatus];
      const activeIndex = activeItems.findIndex((t) => t.id === activeId);

      if (activeStatus === overStatus) {
        const overIndex = activeItems.findIndex((t) => t.id === overId);
        if (overIndex === -1 || activeIndex === overIndex) return prev;
        const reordered = [...activeItems];
        const [moved] = reordered.splice(activeIndex, 1);
        reordered.splice(overIndex, 0, moved);
        return { ...prev, [activeStatus]: reordered };
      }

      const destItems = prev[overStatus];
      const overIndex = destItems.findIndex((t) => t.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : destItems.length;
      const moved = { ...activeItems[activeIndex], status: overStatus };
      return {
        ...prev,
        [activeStatus]: activeItems.filter((t) => t.id !== activeId),
        [overStatus]: [...destItems.slice(0, insertAt), moved, ...destItems.slice(insertAt)],
      };
    });
  }

  function handleDragEnd({ active }: DragEndEvent) {
    setActiveTask(null);
    if (!active || !dragSnapshot.current) return;

    const activeId = String(active.id);
    const originalStatus = dragSnapshot.current.status;
    const finalStatus = findColumn(columns, activeId);
    if (!finalStatus) return;

    const updates: { id: string; order: number; status?: string }[] =
      columns[originalStatus].map((t, i) => ({ id: t.id, order: i + 1 }));

    if (finalStatus !== originalStatus) {
      updates.push(
        ...columns[finalStatus].map((t, i) => ({
          id: t.id,
          order: i + 1,
          ...(t.id === activeId && { status: finalStatus }),
        }))
      );
    }

    const snapshot = dragSnapshot.current.columns;
    reorderProjectTasks(updates).then((result) => {
      if (!result.success) {
        toast.error("Failed to move task");
        setColumns(snapshot);
      }
    });
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5 relative overflow-hidden">
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: project.color }} aria-hidden />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground font-display truncate">{project.name}</h1>
            {project.client && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <User className="h-3.5 w-3.5" />{project.client}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setDetailsOpen(true)}>
              <PanelRight className="h-3.5 w-3.5" />
              Details
              {project.links.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{project.links.length}</span>
              )}
            </Button>
            <button onClick={() => setEditOpen(true)} className="text-muted-foreground hover:text-foreground p-2 transition-colors" aria-label="Edit project">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setDeleteOpen(true)} className="text-muted-foreground hover:text-red-500 p-2 transition-colors" aria-label="Delete project">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Select value={status} onValueChange={changeStatus}>
            <SelectTrigger className="h-7 w-auto gap-2 border-0 p-0 focus:ring-0">
              <Badge className={cn(PROJECT_STATUS_COLORS[status])}>{PROJECT_STATUS_LABELS[status]}</Badge>
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {project.dueDate && (
            <span className={cn("inline-flex items-center gap-1 text-xs", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
              <CalendarClock className="h-3.5 w-3.5" />
              {overdue ? "Overdue · " : "Due "}{format(new Date(project.dueDate), "d MMM yyyy")}
            </span>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed whitespace-pre-wrap">{project.description}</p>
        )}
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => handleDragStart(String(e.active.id))}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 items-start">
          {PROJECT_TASK_STATUSES.map((columnStatus) => {
            const tasks = columns[columnStatus];
            const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));
            return (
              <KanbanColumn
                key={columnStatus}
                status={columnStatus}
                count={tasks.length}
                tasks={tasks}
                onAdd={(title) => addTask(columnStatus, title)}
                allSelected={allSelected}
                onToggleSelectAll={() => toggleSelectAllInColumn(columnStatus)}
              >
                {tasks.map((t) => (
                  <ProjectTaskCard
                    key={t.id}
                    task={t}
                    onChange={refresh}
                    selected={selectedIds.has(t.id)}
                    selectionMode={selectionMode}
                    onToggleSelect={() => toggleSelect(t.id)}
                    allTags={allTags}
                    onTagsChanged={setAllTags}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? <ProjectTaskCard task={activeTask} onChange={refresh} dragging allTags={allTags} /> : null}
        </DragOverlay>
      </DndContext>

      <ProjectNotesDrawer
        projectId={project.id}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        initialNotes={project.notes}
        initialLinks={project.links}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <ProjectForm
            project={project}
            onSuccess={() => { setEditOpen(false); refresh(); }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project?"
        description="This deletes the project and all its tasks. This cannot be undone."
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Bulk action bar */}
      {selectionMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
          <button onClick={clearSelection} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Clear selection">
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium px-1">{selectedIds.size} selected</span>
          <div className="h-5 w-px bg-border mx-1" />

          <Select onValueChange={bulkMove}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">Move to</SelectTrigger>
            <SelectContent>
              {PROJECT_TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{PROJECT_TASK_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={bulkPriority}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">Priority</SelectTrigger>
            <SelectContent>
              {PROJECT_TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p.toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-red-600 hover:text-red-600 dark:text-red-400" onClick={bulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}
