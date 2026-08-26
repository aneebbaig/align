"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject, updateProject } from "@/actions/projects";
import { PROJECT_COLORS, PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FormValues {
  name: string;
  client: string;
  description: string;
  dueDate: string;
}

interface ExistingProject {
  id: string;
  name: string;
  client: string | null;
  description: string | null;
  color: string;
  status: string;
  dueDate: Date | null;
}

interface Props {
  project?: ExistingProject;
  onSuccess: () => void;
}

export function ProjectForm({ project, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [status, setStatus] = useState(project?.status ?? "ACTIVE");

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: project?.name ?? "",
      client: project?.client ?? "",
      description: project?.description ?? "",
      dueDate: project?.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : "",
    },
  });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        client: data.client || undefined,
        description: data.description || undefined,
        color,
        status,
        dueDate: data.dueDate || undefined,
      };

      const result = project
        ? await updateProject(project.id, { ...payload, dueDate: data.dueDate || null })
        : await createProject(payload);

      if (result.success) {
        toast.success(project ? "Project updated!" : "Project created!");
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
      <div className="space-y-1">
        <Label>Project Name</Label>
        <Input placeholder="e.g. Acme website redesign" {...register("name", { required: true })} />
      </div>

      <div className="space-y-1">
        <Label>Client (optional)</Label>
        <Input placeholder="Who is this for?" {...register("client")} />
      </div>

      <div className="space-y-1">
        <Label>Accent Color</Label>
        <div className="flex flex-wrap gap-2 pt-1">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-transform",
                color === c ? "ring-2 ring-offset-2 ring-offset-background scale-110" : "hover:scale-105",
              )}
              style={{ backgroundColor: c, ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
              aria-label={`Select color ${c}`}
            >
              {color === c && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select onValueChange={setStatus} defaultValue={status}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Due Date</Label>
          <Input type="date" {...register("dueDate")} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Description (optional)</Label>
        <Textarea rows={2} placeholder="Scope, notes, links..." {...register("description")} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : project ? "Save Changes" : "Create Project"}
      </Button>
    </form>
  );
}
