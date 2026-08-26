"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/types";

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects(filter?: { status?: string }) {
  const userId = await getUserId();
  const where: { userId: string; status?: string } = { userId };
  if (filter?.status) where.status = filter.status;

  return prisma.project.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { id: true, title: true, status: true, updatedAt: true } },
    },
  });
}

export async function getProject(id: string) {
  const userId = await getUserId();
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      tasks: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { tags: { include: { tag: true } } },
      },
    },
  });
  if (!project) return null;
  return {
    ...project,
    tasks: project.tasks.map((t) => ({ ...t, tags: t.tags.map((pt) => pt.tag) })),
  };
}

export async function createProject(data: {
  name: string;
  description?: string;
  client?: string;
  color?: string;
  status?: string;
  dueDate?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId();
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        client: data.client || null,
        color: data.color || "#6366F1",
        status: data.status || "ACTIVE",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        userId,
      },
      select: { id: true },
    });
    revalidatePath("/projects");
    return { success: true, data: { id: project.id } };
  } catch (e) {
    console.error("[createProject]", e);
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(id: string, data: {
  name?: string;
  description?: string;
  client?: string;
  color?: string;
  status?: string;
  dueDate?: string | null;
  notes?: string | null;
  links?: { id: string; label: string; url: string }[];
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) return { success: false, error: "Not found" };

    await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.client !== undefined && { client: data.client || null }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.links !== undefined && { links: JSON.stringify(data.links) }),
      },
    });
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return { success: true };
  } catch (e) {
    console.error("[updateProject]", e);
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.project.deleteMany({ where: { id, userId } });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    console.error("[deleteProject]", e);
    return { success: false, error: "Failed to delete project" };
  }
}

// ─── Project tasks ───────────────────────────────────────────────────────────

/** Verify the project belongs to the current user before touching its tasks. */
async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  return project !== null;
}

/** Verify every tag id belongs to the current user before attaching it to a task. */
async function assertTagsOwnedByUser(tagIds: string[], userId: string): Promise<boolean> {
  if (tagIds.length === 0) return true;
  const count = await prisma.tag.count({ where: { id: { in: tagIds }, userId } });
  return count === tagIds.length;
}

export async function createProjectTask(projectId: string, data: {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  status?: string;
  tagIds?: string[];
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    if (!(await assertProjectOwner(projectId, userId))) return { success: false, error: "Not found" };
    if (data.tagIds && !(await assertTagsOwnedByUser(data.tagIds, userId))) {
      return { success: false, error: "Invalid tag" };
    }

    const maxOrder = await prisma.projectTask.aggregate({ where: { projectId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? 0) + 1;

    await prisma.projectTask.create({
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority || "MEDIUM",
        status: data.status || "TODO",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        order,
        projectId,
        ...(data.tagIds?.length ? { tags: { create: data.tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
    });
    await prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (e) {
    console.error("[createProjectTask]", e);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateProjectTask(id: string, data: {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  order?: number;
  tagIds?: string[];
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const existing = await prisma.projectTask.findFirst({
      where: { id, project: { userId } },
      select: { id: true, projectId: true },
    });
    if (!existing) return { success: false, error: "Not found" };
    if (data.tagIds && !(await assertTagsOwnedByUser(data.tagIds, userId))) {
      return { success: false, error: "Invalid tag" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectTask.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description || null }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
          ...(data.order !== undefined && { order: data.order }),
        },
      });
      if (data.tagIds !== undefined) {
        await tx.projectTaskTag.deleteMany({ where: { taskId: id } });
        if (data.tagIds.length > 0) {
          await tx.projectTaskTag.createMany({ data: data.tagIds.map((tagId) => ({ taskId: id, tagId })) });
        }
      }
    });
    await prisma.project.update({ where: { id: existing.projectId }, data: { updatedAt: new Date() } });
    revalidatePath(`/projects/${existing.projectId}`);
    return { success: true };
  } catch (e) {
    console.error("[updateProjectTask]", e);
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteProjectTask(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const existing = await prisma.projectTask.findFirst({
      where: { id, project: { userId } },
      select: { projectId: true },
    });
    if (!existing) return { success: false, error: "Not found" };
    await prisma.projectTask.delete({ where: { id } });
    await prisma.project.update({ where: { id: existing.projectId }, data: { updatedAt: new Date() } });
    return { success: true };
  } catch (e) {
    console.error("[deleteProjectTask]", e);
    return { success: false, error: "Failed to delete task" };
  }
}

export async function reorderProjectTasks(
  updates: { id: string; order: number; status?: string }[]
): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const projectIds = await prisma.projectTask.findMany({
      where: { id: { in: updates.map((u) => u.id) }, project: { userId } },
      select: { projectId: true },
      distinct: ["projectId"],
    });

    await prisma.$transaction([
      ...updates.map(({ id, order, status }) =>
        prisma.projectTask.updateMany({
          where: { id, project: { userId } },
          data: { order, ...(status !== undefined && { status }) },
        })
      ),
      ...projectIds.map(({ projectId }) =>
        prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
      ),
    ]);
    return { success: true };
  } catch (e) {
    console.error("[reorderProjectTasks]", e);
    return { success: false, error: "Failed to reorder tasks" };
  }
}

/** Apply a status and/or priority change to several tasks at once. */
export async function bulkUpdateProjectTasks(
  ids: string[],
  data: { status?: string; priority?: string }
): Promise<ActionResult> {
  try {
    if (ids.length === 0) return { success: true };
    const userId = await getUserId();
    const projectIds = await prisma.projectTask.findMany({
      where: { id: { in: ids }, project: { userId } },
      select: { projectId: true },
      distinct: ["projectId"],
    });

    await prisma.$transaction([
      prisma.projectTask.updateMany({
        where: { id: { in: ids }, project: { userId } },
        data: {
          ...(data.status !== undefined && { status: data.status }),
          ...(data.priority !== undefined && { priority: data.priority }),
        },
      }),
      ...projectIds.map(({ projectId }) =>
        prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
      ),
    ]);
    return { success: true };
  } catch (e) {
    console.error("[bulkUpdateProjectTasks]", e);
    return { success: false, error: "Failed to update tasks" };
  }
}

export async function bulkDeleteProjectTasks(ids: string[]): Promise<ActionResult> {
  try {
    if (ids.length === 0) return { success: true };
    const userId = await getUserId();
    const projectIds = await prisma.projectTask.findMany({
      where: { id: { in: ids }, project: { userId } },
      select: { projectId: true },
      distinct: ["projectId"],
    });

    await prisma.$transaction([
      prisma.projectTask.deleteMany({ where: { id: { in: ids }, project: { userId } } }),
      ...projectIds.map(({ projectId }) =>
        prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
      ),
    ]);
    return { success: true };
  } catch (e) {
    console.error("[bulkDeleteProjectTasks]", e);
    return { success: false, error: "Failed to delete tasks" };
  }
}

// ─── Tags (dynamic task labels: Urgent, Nice to have, Feature, Bug, ...) ──────

export async function getTags() {
  const userId = await getUserId();
  return prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

export async function createTag(data: { name: string; color?: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getUserId();
    const name = data.name.trim();
    if (!name) return { success: false, error: "Tag name is required" };
    const existing = await prisma.tag.findUnique({ where: { userId_name: { userId, name } } });
    if (existing) return { success: false, error: "A tag with this name already exists" };
    const tag = await prisma.tag.create({
      data: { name, color: data.color || "#6366f1", userId },
      select: { id: true },
    });
    revalidatePath("/projects");
    return { success: true, data: { id: tag.id } };
  } catch (e) {
    console.error("[createTag]", e);
    return { success: false, error: "Failed to create tag" };
  }
}

export async function updateTag(id: string, data: { name?: string; color?: string }): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const name = data.name?.trim();
    if (data.name !== undefined && !name) return { success: false, error: "Tag name is required" };
    if (name) {
      const dupe = await prisma.tag.findFirst({ where: { userId, name, NOT: { id } } });
      if (dupe) return { success: false, error: "A tag with this name already exists" };
    }
    const { count } = await prisma.tag.updateMany({
      where: { id, userId },
      data: { ...(name !== undefined && { name }), ...(data.color !== undefined && { color: data.color }) },
    });
    if (count === 0) return { success: false, error: "Tag not found" };
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    console.error("[updateTag]", e);
    return { success: false, error: "Failed to update tag" };
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const { count } = await prisma.tag.deleteMany({ where: { id, userId } });
    if (count === 0) return { success: false, error: "Tag not found" };
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    console.error("[deleteTag]", e);
    return { success: false, error: "Failed to delete tag" };
  }
}
