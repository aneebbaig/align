import { describe, expect, it } from "vitest";
import { assignOrders } from "./order";

describe("assignOrders", () => {
  it("hands the existing slots to the items in their new sequence", () => {
    // a and c are in one group, b sits between them in another.
    const items = [{ id: "a", order: 1 }, { id: "c", order: 3 }];
    expect(assignOrders(items, ["c", "a"])).toEqual([{ id: "c", order: 1 }, { id: "a", order: 3 }]);
  });

  it("leaves everything alone when the sequence is unchanged", () => {
    const items = [{ id: "a", order: 4 }, { id: "b", order: 9 }];
    expect(assignOrders(items, ["a", "b"])).toEqual([{ id: "a", order: 4 }, { id: "b", order: 9 }]);
  });

  it("rejects a sequence that is not exactly the same items", () => {
    const items = [{ id: "a", order: 1 }, { id: "b", order: 2 }];
    expect(() => assignOrders(items, ["a"])).toThrow();
    expect(() => assignOrders(items, ["a", "x"])).toThrow();
    expect(() => assignOrders(items, ["a", "a"])).toThrow();
  });
});
