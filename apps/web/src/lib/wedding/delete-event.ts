import { prisma } from "@/lib/prisma";

export type EventRemoval = { moveTo?: string; deleteExpenses?: boolean };
export type EventRemovalResult = "ok" | "not_found" | "bad_target" | "has_expenses";

/**
 * Delete an event of a wedding. Its expenses must go somewhere first: move them to
 * another event of the same wedding, or delete them with it. With neither choice and
 * expenses present nothing is touched and "has_expenses" comes back.
 */
export async function removeWeddingEvent(planId: string, eventId: string, userId: string, how: EventRemoval): Promise<EventRemovalResult> {
  return prisma.$transaction(async (tx) => {
    const event = await tx.weddingEvent.findFirst({ where: { id: eventId, weddingPlanId: planId, weddingPlan: { userId } }, select: { id: true } });
    if (!event) return "not_found";
    const count = await tx.weddingExpense.count({ where: { eventId } });
    if (count > 0) {
      if (how.moveTo) {
        if (how.moveTo === eventId) return "bad_target";
        const target = await tx.weddingEvent.findFirst({ where: { id: how.moveTo, weddingPlanId: planId }, select: { id: true } });
        if (!target) return "bad_target";
        await tx.weddingExpense.updateMany({ where: { eventId }, data: { eventId: how.moveTo } });
      } else if (how.deleteExpenses) {
        await tx.weddingExpense.deleteMany({ where: { eventId } });
      } else {
        return "has_expenses";
      }
    }
    await tx.weddingEvent.delete({ where: { id: eventId } });
    return "ok";
  });
}
