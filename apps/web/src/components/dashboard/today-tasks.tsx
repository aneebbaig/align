"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, Circle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/actions/tasks";
import { isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  status: string;
  type: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:    "bg-muted-foreground/30",
  MEDIUM: "bg-blue-400/70",
  HIGH:   "bg-amber-400/80",
  URGENT: "bg-red-500",
};

export function TodayTasks({ tasks }: { tasks: Task[] }) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  async function handleComplete(taskId: string) {
    setCompleting(taskId);
    const result = await updateTaskStatus(taskId, "DONE");
    if (result.success) {
      setDoneIds((prev) => new Set([...prev, taskId]));
      toast.success("Task completed!");
    } else {
      toast.error("Failed to complete task");
    }
    setCompleting(null);
  }

  const visibleTasks = tasks.filter((t) => !doneIds.has(t.id));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">Today&apos;s Tasks</h3>
        <Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all →
        </Link>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10">
          All caught up ✓
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {visibleTasks.map((task) => {
            const overdue = isOverdue(task.dueDate) && task.type === "ONE_TIME";
            return (
              <div key={task.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completing === task.id}
                  className="text-muted-foreground/70 hover:text-emerald-500 transition-colors shrink-0"
                  aria-label="Complete task"
                >
                  {completing === task.id ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <Circle className="h-[18px] w-[18px]" />
                  )}
                </button>
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_COLOR[task.priority])} />
                <span className={cn(
                  "flex-1 text-sm text-foreground/85 truncate",
                  overdue && "text-red-500"
                )}>
                  {task.title}
                </span>
                {overdue && <AlertCircle className="h-3.5 w-3.5 text-red-500/70 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
