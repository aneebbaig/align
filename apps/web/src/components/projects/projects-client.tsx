"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectCard, ProjectCardData } from "@/components/projects/project-card";
import { ProjectForm } from "@/components/projects/project-form";

type Filter = "ALL" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
type SortMode = "updated" | "created";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
];

export function ProjectsClient({ projects }: { projects: ProjectCardData[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [sort, setSort] = useState<SortMode>("updated");

  const visible = useMemo(
    () => (filter === "ALL" ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter],
  );

  const sorted = useMemo(() => {
    return [...visible].sort((a, b) => {
      const av = new Date(sort === "updated" ? a.updatedAt : a.createdAt).getTime();
      const bv = new Date(sort === "updated" ? b.updatedAt : b.createdAt).getTime();
      return bv - av;
    });
  }, [visible, sort]);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        section="Life"
        title="Work"
        description="Freelance and client work - projects with their own tasks, statuses, and due dates."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="h-9 w-auto gap-2 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="created">Newest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={projects.length === 0 ? "No projects yet" : "Nothing here"}
          description={
            projects.length === 0
              ? "Create a project to manage client or freelance work separately from your personal tasks."
              : "No projects match this filter."
          }
          action={projects.length === 0 ? { label: "New project", onClick: () => setOpen(true) } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <ProjectForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
