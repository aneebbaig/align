"use server";

import { revalidatePath } from "next/cache";
import { getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/types";

export async function getCalendarEvents(month: number, year: number) {
  const userId = await getUserId();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  return prisma.calendarEvent.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
}

export async function getTodaysEvents() {
  const userId = await getUserId();
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end = new Date(today.setHours(23, 59, 59, 999));

  return prisma.calendarEvent.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { startTime: "asc" },
  });
}

export async function createCalendarEvent(data: {
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: string;
  color?: string;
  isAllDay: boolean;
  reminder: string;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.calendarEvent.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId,
      },
    });
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[createCalendarEvent]", e);
    return { success: false, error: "Failed to create event" };
  }
}

export async function deleteCalendarEvent(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.calendarEvent.deleteMany({ where: { id, userId } });
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteCalendarEvent]", e);
    return { success: false, error: "Failed to delete event" };
  }
}

export async function getEventsForDay(date: Date) {
  const userId = await getUserId();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return prisma.calendarEvent.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { startTime: "asc" },
  });
}
