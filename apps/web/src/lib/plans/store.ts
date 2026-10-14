import { prisma } from "@/lib/prisma";
import { assignOrders } from "./order";

/** Next free `order` slot for a new item in a plan. */
export async function nextItemOrder(planId: string): Promise<number> {
  const max = await prisma.planItem.aggregate({ where: { planId }, _max: { order: true } });
  return (max._max.order ?? 0) + 1;
}

/**
 * Applies a drag-reorder of some of a plan's items (a group, or the ungrouped
 * ones). `ids` is the new sequence. Returns false if the plan isn't the user's
 * or the ids aren't exactly items of that plan.
 */
export async function reorderPlanItems(userId: string, planId: string, ids: string[]): Promise<boolean> {
  const items = await prisma.planItem.findMany({
    where: { id: { in: ids }, planId, plan: { userId } },
    select: { id: true, order: true },
  });
  let updates;
  try {
    updates = assignOrders(items, ids);
  } catch {
    return false;
  }
  await prisma.$transaction(updates.map((u) => prisma.planItem.update({ where: { id: u.id }, data: { order: u.order } })));
  return true;
}
