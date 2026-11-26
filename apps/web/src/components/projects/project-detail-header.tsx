"use client";

import { format } from "date-fns";
import { Pencil, Trash2, CalendarClock, MoreHorizontal, User, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { ProjectDetailData } from "@/components/projects/project-detail-client";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/constants";
import { cn, isOverdue } from "@/lib/utils";

export function ProjectDetailHeader({ project, status, onStatusChange, onShowDetails, onEdit, onDelete }: {
  project: ProjectDetailData;
  status: string;
  onStatusChange: (status: string) => void;
  onShowDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(project.dueDate) && status === "ACTIVE";
  return (
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
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onShowDetails()}>
            <PanelRight className="h-3.5 w-3.5" />
            Details
            {project.links.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{project.links.length}</span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit()}>
                <Pencil className="h-3.5 w-3.5" /> Edit project
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDelete()}
                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <Select value={status} onValueChange={onStatusChange}>
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
  );
}
