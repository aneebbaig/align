"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
  DndContext, DragOverlay, closestCorners, DragEndEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectTaskCard, ProjectTaskData } from "@/components/projects/project-task-card";
import { ProjectNotesDrawer, ProjectLink } from "@/components/projects/project-notes-drawer";
import { ProjectDetailHeader } from "@/components/projects/project-detail-header";
import { ProjectBulkBar } from "@/components/projects/project-bulk-bar";
import { KanbanColumn, bucket, findColumn, type Columns } from "@/components/projects/project-kanban";
import type { TagOption } from "@/components/projects/tag-picker";
import {
  createProjectTask, updateProject, deleteProject, reorderProjectTasks,
  bulkUpdateProjectTasks, bulkDeleteProjectTasks,
} from "@/actions/projects";
import { PROJECT_TASK_STATUSES } from "@/lib/constants";

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

  function copyTitles() {
    const titles = PROJECT_TASK_STATUSES.flatMap((s) => columns[s])
      .filter((t) => selectedIds.has(t.id))
      .map((t) => t.title);
    navigator.clipboard.writeText(titles.join("\n")).then(
      () => toast.success(`Copied ${titles.length} title${titles.length === 1 ? "" : "s"}`),
      () => toast.error("Could not copy"),
    );
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

  // Re-sync from the server data when it changes (adjust state during render, not in an effect).
  const [seenProject, setSeenProject] = useState(project);
  if (seenProject !== project) {
    setSeenProject(project);
    setColumns(bucket(project.tasks));
    setStatus(project.status);
  }

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
    <div className="max-w-7xl mx-auto">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Work
      </Link>

      <ProjectDetailHeader
        project={project}
        status={status}
        onStatusChange={changeStatus}
        onShowDetails={() => setDetailsOpen(true)}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => handleDragStart(String(e.active.id))}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 items-start lg:grid lg:grid-cols-5 lg:overflow-x-visible">
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
          <DialogHeader><DialogTitle>Edit project</DialogTitle></DialogHeader>
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

      {selectionMode && (
        <ProjectBulkBar onCopyTitles={copyTitles} count={selectedIds.size} onClear={clearSelection} onMove={bulkMove} onPriority={bulkPriority} onDelete={bulkDelete} />
      )}
    </div>
  );
}
