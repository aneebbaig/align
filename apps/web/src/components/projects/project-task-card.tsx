"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Pencil, Trash2, CalendarClock, Copy, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProjectTaskDialog } from "@/components/projects/project-task-dialog";
import type { TagOption } from "@/components/projects/tag-picker";
import { deleteProjectTask } from "@/actions/projects";
import { toast } from "sonner";
import { cn, isOverdue } from "@/lib/utils";

export interface ProjectTaskData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  order: number;
  tags?: TagOption[];
}

// Hex accents so the left priority bar can be a real gradient-free solid color.
const PRIORITY_ACCENT: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

export function ProjectTaskCard({
  task, onChange, dragging = false,
  selected = false, selectionMode = false, onToggleSelect,
  allTags = [], onTagsChanged = () => {},
}: {
  task: ProjectTaskData;
  onChange: () => void;
  dragging?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  allTags?: TagOption[];
  onTagsChanged?: (tags: TagOption[]) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  // Drag is disabled while selecting, so a tap is unambiguously a selection.
  const draggable = !dragging && !selectionMode;

  const done = task.status === "DONE";
  const overdue = isOverdue(task.dueDate) && !done;

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProjectTask(task.id);
    if (result.success) { toast.success("Task deleted"); onChange(); }
    else toast.error("Failed to delete");
    setDeleting(false);
    setDeleteOpen(false);
  }

  function handleCardClick() {
    if (dragging) return;
    if (selectionMode) onToggleSelect?.();
    else setEditOpen(true);
  }

  function copyTitle(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(task.title).then(
      () => toast.success("Title copied"),
      () => toast.error("Couldn't copy"),
    );
  }

  return (
    <>
      <div
        ref={dragging ? undefined : setNodeRef}
        style={dragging ? undefined : style}
        {...(draggable ? attributes : {})}
        {...(draggable ? listeners : {})}
        onClick={handleCardClick}
        className={cn(
          "group relative bg-card border border-border rounded-lg overflow-hidden transition-colors",
          draggable && "cursor-grab active:cursor-grabbing hover:border-foreground/25",
          selectionMode && !dragging && "cursor-pointer",
          selected && "ring-2 ring-primary border-primary",
          dragging && "shadow-xl ring-1 ring-border rotate-[1.5deg] cursor-grabbing",
        )}
      >
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: PRIORITY_ACCENT[task.priority] ?? PRIORITY_ACCENT.MEDIUM }}
          aria-hidden
        />
        <div className="pl-3.5 pr-1.5 py-2.5">
          <div className="flex items-start gap-1.5">
            {!dragging && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
                aria-label={selected ? "Deselect task" : "Select task"}
                className={cn(
                  "shrink-0 mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-all",
                  selected
                    ? "bg-primary border-primary text-primary-foreground opacity-100"
                    : "border-muted-foreground/40 hover:border-foreground",
                  selected || selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                {selected && <Check className="h-3 w-3" />}
              </button>
            )}
            <p className={cn(
              "flex-1 text-sm leading-snug line-clamp-3",
              done ? "text-muted-foreground line-through" : "text-foreground",
            )}>
              {task.title}
            </p>
            {!dragging && (
              <div className="flex items-center shrink-0 -mr-0.5 mt-[-2px]">
                <button
                  onClick={copyTitle}
                  aria-label="Copy title"
                  className="rounded p-1 text-muted-foreground/50 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-foreground hover:bg-muted transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="rounded p-1 text-muted-foreground/50 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 hover:text-foreground hover:bg-muted transition-all"
                      aria-label="Task actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={copyTitleFromMenu}>
                      <Copy className="h-3.5 w-3.5" /> Copy title
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setDeleteOpen(true)}
                      className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {(task.dueDate || (task.tags && task.tags.length > 0)) && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {task.dueDate && (
                <div className={cn(
                  "inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5",
                  overdue
                    ? "text-red-600 bg-red-500/10 dark:text-red-400 font-medium"
                    : "text-muted-foreground bg-muted",
                )}>
                  <CalendarClock className="h-3 w-3" />
                  {format(new Date(task.dueDate), "d MMM")}
                </div>
              )}
              {task.tags?.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: `${t.color}22`, color: t.color }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!dragging && (
        <>
          <ProjectTaskDialog
            task={task}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={onChange}
            allTags={allTags}
            onTagsChanged={onTagsChanged}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete task?"
            description="This cannot be undone."
            onConfirm={handleDelete}
            loading={deleting}
          />
        </>
      )}
    </>
  );

  function copyTitleFromMenu() {
    navigator.clipboard.writeText(task.title).then(
      () => toast.success("Title copied"),
      () => toast.error("Couldn't copy"),
    );
  }
}
