"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateProjectTask, deleteProjectTask } from "@/actions/projects";
import {
  PROJECT_TASK_STATUSES, PROJECT_TASK_STATUS_LABELS,
  PROJECT_TASK_PRIORITIES, PROJECT_TASK_PRIORITY_LABELS,
} from "@/lib/constants";
import type { ProjectTaskData } from "@/components/projects/project-task-card";
import { DueDateChips } from "@/components/shared/due-date-chips";
import { TagPicker, type TagOption } from "@/components/projects/tag-picker";

export function ProjectTaskDialog({
  task, open, onOpenChange, onSaved, allTags = [], onTagsChanged = () => {},
}: {
  task: ProjectTaskData;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  allTags?: TagOption[];
  onTagsChanged?: (tags: TagOption[]) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState<string | null>(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null
  );
  const [tagIds, setTagIds] = useState<string[]>(task.tags?.map((t) => t.id) ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initialDue = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null;
  const initialTagIds = task.tags?.map((t) => t.id) ?? [];
  const dirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    status !== task.status ||
    priority !== task.priority ||
    dueDate !== initialDue ||
    tagIds.length !== initialTagIds.length ||
    tagIds.some((id) => !initialTagIds.includes(id));

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProjectTask(task.id);
    setDeleting(false);
    if (result.success) {
      toast.success("Task deleted");
      setConfirmOpen(false);
      onOpenChange(false);
      onSaved();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const result = await updateProjectTask(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate || null,
      tagIds,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Task saved");
      onOpenChange(false);
      onSaved();
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => { if (dirty) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (dirty) e.preventDefault(); }}
        onInteractOutside={(e) => { if (dirty) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="min-w-0 space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1">
            <Label>Details (optional)</Label>
            <Textarea
              rows={3}
              placeholder="Notes, acceptance criteria, links…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{PROJECT_TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} >{PROJECT_TASK_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Due date</Label>
            <DueDateChips value={dueDate} onChange={setDueDate} />
          </div>

          <div className="space-y-1">
            <Label>Tags</Label>
            <TagPicker allTags={allTags} selectedIds={tagIds} onChange={setTagIds} onTagsChanged={onTagsChanged} />
          </div>

          <Button type="submit" className="w-full" disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-red-600 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
            onClick={() => setConfirmOpen(true)}
            disabled={saving}
          >
            Delete task
          </Button>
        </form>
      </DialogContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete task?"
        description="This cannot be undone."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </Dialog>
  );
}
