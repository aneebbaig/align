export interface Ordered {
  id: string;
  order: number;
}

/**
 * Re-orders a subset of a plan's items (one group, or the ungrouped ones)
 * without disturbing the rest: the items keep the same set of `order` slots,
 * just handed out in the new sequence. `ids` must be exactly these items.
 */
export function assignOrders(items: Ordered[], ids: string[]): Ordered[] {
  const known = new Set(items.map((i) => i.id));
  if (ids.length !== items.length || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    throw new Error("Order must list each item exactly once");
  }
  const slots = items.map((i) => i.order).sort((a, b) => a - b);
  return ids.map((id, i) => ({ id, order: slots[i] }));
}
