"use client";

import { useState } from "react";
import { CheckCircle, Circle, Trash2, AlertCircle, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { updateTaskStatus, deleteTask } from "@/actions/tasks";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TaskForm } from "@/components/tasks/task-form";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  dueDate: Date | null;
  dueTime: string | null;
  category: string | null;
  order?: number;
}

export function TaskCard({ task, onDeleted }: { task: Task; onDeleted?: () => void }) {
  const [done, setDone] = useState(task.status === "DONE");
  const [completing, setCompleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const overdue = isOverdue(task.dueDate) && task.type === "ONE_TIME" && !done;

  async function handleToggle() {
    setCompleting(true);
    const newStatus = done ? "PENDING" : "DONE";
    const result = await updateTaskStatus(task.id, newStatus);
    if (result.success) {
      setDone(!done);
      toast.success(done ? "Task reopened" : "Task completed!");
    } else {
      toast.error("Failed to update task");
    }
    setCompleting(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteTask(task.id);
    if (result.success) {
      toast.success("Task deleted");
      onDeleted?.();
    } else {
      toast.error("Failed to delete");
    }
    setDeleting(false);
    setDeleteOpen(false);
  }

  return (
    <>
      <div className={cn(
        "border-b border-border/40 last:border-0 transition-all group",
        overdue && "bg-red-50/20 dark:bg-red-950/10 -mx-1 px-1 rounded-lg"
      )}>
        <div className={cn("flex items-start gap-3 py-3.5", done && "opacity-55")}>
          <button onClick={handleToggle} disabled={completing} className="mt-0.5 shrink-0 p-0.5 -ml-0.5">
            {completing ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : done ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-emerald-500 transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <span className={cn("text-sm font-medium", done && "line-through text-muted-foreground", overdue && "text-red-700 dark:text-red-300")}>
                {task.title}
              </span>
              {overdue && <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
              {task.category && <Badge variant="secondary" className="text-xs">{task.category}</Badge>}
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
            )}
            {task.dueDate && (
              <div className={cn("text-xs mt-1", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                {overdue ? "OVERDUE · " : "Due: "}
                {format(new Date(task.dueDate), "d MMM yyyy")}
                {task.dueTime && ` at ${task.dueTime}`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={task}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task?"
        description="This cannot be undone."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
