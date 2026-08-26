"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, isOverdue } from "@/lib/utils";
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, PROJECT_TASK_STATUS_DOT_COLOR } from "@/lib/constants";

export interface ProjectCardData {
  id: string;
  name: string;
  client: string | null;
  color: string;
  status: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  taskCount: number;
  doneCount: number;
  recentTasks: { id: string; title: string; status: string }[];
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const { taskCount, doneCount } = project;
  const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
  const overdue = isOverdue(project.dueDate) && project.status === "ACTIVE";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative block bg-card border border-border rounded-xl p-5 overflow-hidden transition-colors hover:border-foreground/20"
    >
      {/* Color accent */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: project.color }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
          {project.client && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <User className="h-3.5 w-3.5 shrink-0" />
              {project.client}
            </p>
          )}
        </div>
        <Badge className={cn("shrink-0", PROJECT_STATUS_COLORS[project.status])}>
          {PROJECT_STATUS_LABELS[project.status]}
        </Badge>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{doneCount}/{taskCount} tasks</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: project.color }}
          />
        </div>
      </div>

      {project.recentTasks.length > 0 && (
        <ul className="mt-3 space-y-1">
          {project.recentTasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PROJECT_TASK_STATUS_DOT_COLOR[t.status])} />
              <span className={cn("truncate", t.status === "DONE" && "line-through")}>{t.title}</span>
            </li>
          ))}
        </ul>
      )}

      {project.dueDate && (
        <div className={cn(
          "mt-3 inline-flex items-center gap-1 text-xs",
          overdue ? "text-red-500 font-medium" : "text-muted-foreground",
        )}>
          <CalendarClock className="h-3.5 w-3.5" />
          {overdue ? "Overdue · " : "Due "}
          {format(new Date(project.dueDate), "d MMM yyyy")}
        </div>
      )}
    </Link>
  );
}
