import { describe, it, expect } from "vitest";
import { rankRepeats, topCategoryIds, recentDescriptions, matchDescriptions } from "./quick-picks";

const row = (description: string, categoryId: string, amount = 100, extra = {}) => ({ description, categoryId, amount, ...extra });

describe("rankRepeats", () => {
  it("needs two uses, ranks by count then recency, uses the latest amount", () => {
    const rows = [row("Tea", "a", 300), row("Bus", "b", 50), row("Bus", "b", 60), row("Tea", "a", 200), row("Rare", "a"), row("", "a"), row("", "a")];
    const r = rankRepeats(rows);
    expect(r.map((x) => x.description)).toEqual(["Tea", "Bus"]);
    expect(r[0].lastAmount).toBe(300);
  });
  it("keeps funding only for single sources", () => {
    const r = rankRepeats([
      row("Gym", "a", 1, { fundingSource: "SAVINGS_POT", fundingPotId: "p", fundingCurrencyId: "c" }),
      row("Gym", "a", 1, { fundingSource: "INCOME" }),
      row("Split", "a", 1, { fundingSource: "SPLIT" }),
      row("Split", "a", 1, { fundingSource: "SPLIT" }),
    ]);
    expect(r[0]).toMatchObject({ description: "Gym", fundingSource: "SAVINGS_POT", fundingPotId: "p" });
    expect(r[1].fundingSource).toBeUndefined();
  });
});

describe("topCategoryIds", () => {
  it("orders by count", () => {
    expect(topCategoryIds([{ categoryId: "a" }, { categoryId: "b" }, { categoryId: "b" }])).toEqual(["b", "a"]);
  });
});

describe("recentDescriptions / matchDescriptions", () => {
  const list = recentDescriptions([row("Coffee beans", "a"), row("coffee beans", "b"), row("Iced coffee", "c"), row("Cab", "d"), row(" ", "e")]);
  it("dedupes case-insensitively, newest first", () => {
    expect(list.map((x) => x.description)).toEqual(["Coffee beans", "Iced coffee", "Cab"]);
    expect(list[0].categoryId).toBe("a");
  });
  it("prefix before contains", () => {
    expect(matchDescriptions(list, "coff").map((x) => x.description)).toEqual(["Coffee beans", "Iced coffee"]);
    expect(matchDescriptions(list, "")).toEqual([]);
    expect(matchDescriptions(list, "cab")).toEqual([]);
  });
});
