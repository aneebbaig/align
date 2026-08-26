import { Metadata } from "next";
import { getProjects } from "@/actions/projects";
import { ProjectsClient } from "@/components/projects/projects-client";
import { ProjectCardData } from "@/components/projects/project-card";

export const metadata: Metadata = { title: "Work" };

export default async function ProjectsPage() {
  const projects = await getProjects();

  const cards: ProjectCardData[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    client: p.client,
    color: p.color,
    status: p.status,
    dueDate: p.dueDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    taskCount: p.tasks.length,
    doneCount: p.tasks.filter((t) => t.status === "DONE").length,
    recentTasks: [...p.tasks]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 3)
      .map((t) => ({ id: t.id, title: t.title, status: t.status })),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <ProjectsClient projects={cards} />
    </div>
  );
}
