import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, getTags } from "@/actions/projects";
import { ProjectDetailClient, ProjectDetailData } from "@/components/projects/project-detail-client";
import type { ProjectLink } from "@/components/projects/project-notes-drawer";

export const metadata: Metadata = { title: "Project" };

function parseLinks(raw: string): ProjectLink[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => l && typeof l === "object" && l.id && l.url);
  } catch {
    return [];
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, tags] = await Promise.all([getProject(id), getTags()]);
  if (!project) notFound();

  const data: ProjectDetailData = {
    id: project.id,
    name: project.name,
    description: project.description,
    client: project.client,
    color: project.color,
    status: project.status,
    dueDate: project.dueDate,
    notes: project.notes ?? "",
    links: parseLinks(project.links),
    tasks: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      order: t.order,
      tags: t.tags,
    })),
  };

  return <ProjectDetailClient project={data} allTags={tags} />;
}
