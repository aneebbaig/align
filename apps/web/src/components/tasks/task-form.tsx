"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask, updateTask } from "@/actions/tasks";
import { TASK_CATEGORIES } from "@/lib/constants";

interface FormValues {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  dueTime: string;
  category: string;
}

interface ExistingTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  dueDate: Date | null;
  dueTime: string | null;
  category: string | null;
}

interface Props {
  defaultType?: "DAILY" | "ONE_TIME";
  task?: ExistingTask;
  onSuccess: () => void;
}

export function TaskForm({ defaultType = "ONE_TIME", task, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState(task?.type ?? defaultType);
  const [priority, setPriority] = useState(task?.priority ?? "MEDIUM");
  const [category, setCategory] = useState(task?.category ?? "");

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "MEDIUM",
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      dueTime: task?.dueTime ?? "",
      category: task?.category ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        type: taskType,
        priority,
        dueDate: data.dueDate || undefined,
        dueTime: data.dueTime || undefined,
        category: category || undefined,
      };

      const result = task
        ? await updateTask(task.id, payload)
        : await createTask(payload);

      if (result.success) {
        toast.success(task ? "Task updated!" : "Task added!");
        onSuccess();
      } else {
        toast.error(result.error ?? "Failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type selector - show when creating, or always show when editing */}
      <div className="space-y-1">
        <Label>Task Type</Label>
        <Select onValueChange={setTaskType} defaultValue={taskType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ONE_TIME">One-Time - single task to complete</SelectItem>
            <SelectItem value="DAILY">Daily - repeats every day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Task</Label>
        <Input placeholder="What needs to be done?" {...register("title", { required: true })} />
      </div>

      <div className="space-y-1">
        <Label>Details (optional)</Label>
        <Textarea rows={2} placeholder="Additional info..." {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Priority</Label>
          <Select onValueChange={setPriority} defaultValue={priority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select onValueChange={setCategory} defaultValue={category}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {taskType !== "DAILY" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Due Date</Label>
            <Input type="date" {...register("dueDate")} />
          </div>
          <div className="space-y-1">
            <Label>Due Time</Label>
            <Input type="time" {...register("dueTime")} />
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : task ? "Save Changes" : "Add Task"}
      </Button>
    </form>
  );
}
