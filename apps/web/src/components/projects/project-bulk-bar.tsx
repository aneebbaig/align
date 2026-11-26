"use client";

import { Copy, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  PROJECT_TASK_STATUSES, PROJECT_TASK_STATUS_LABELS, PROJECT_TASK_PRIORITIES, PROJECT_TASK_PRIORITY_LABELS,
} from "@/lib/constants";

export function ProjectBulkBar({ count, onCopyTitles, onClear, onMove, onPriority, onDelete }: {
  count: number;
  onCopyTitles: () => void;
  onClear: () => void;
  onMove: (status: string) => void;
  onPriority: (priority: string) => void;
  onDelete: () => void;
}) {
  return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex max-w-[calc(100vw-1rem)] flex-wrap justify-center items-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
          <button onClick={onClear} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Clear selection">
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium px-1">{count} selected</span>
          <div className="h-5 w-px bg-border mx-1" />

          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onCopyTitles}>
            <Copy className="h-3.5 w-3.5" /> Copy titles
          </Button>

          <Select onValueChange={onMove}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">Move to</SelectTrigger>
            <SelectContent>
              {PROJECT_TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{PROJECT_TASK_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={onPriority}>
            <SelectTrigger className="h-8 w-auto gap-1.5 text-sm">Priority</SelectTrigger>
            <SelectContent>
              {PROJECT_TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} >{PROJECT_TASK_PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-red-600 hover:text-red-600 dark:text-red-400" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
  );
}
