import { describe, it, expect } from "vitest";
import { parseHiddenSections, isHrefHidden, SECTION_KEYS } from "./hidden-sections";

describe("parseHiddenSections", () => {
  it("accepts known keys and dedupes", () => {
    expect(parseHiddenSections(["tasks", "budget", "tasks"])).toEqual(["budget", "tasks"]);
  });
  it("accepts an empty list", () => expect(parseHiddenSections([])).toEqual([]));
  it("silently drops unknown keys, expenses, settings and the removed calendar", () => {
    expect(parseHiddenSections(["nope"])).toEqual([]);
    expect(parseHiddenSections(["expenses", "settings", "calendar", "tasks"])).toEqual(["tasks"]);
  });
  it("rejects non-arrays and non-strings", () => {
    expect(parseHiddenSections("tasks")).toBeNull();
    expect(parseHiddenSections([1])).toBeNull();
    expect(parseHiddenSections(undefined)).toBeNull();
  });
  it("has the 15 shared keys incl. wedding", () => expect(SECTION_KEYS).toHaveLength(15));
  it("includes wedding and not calendar", () => {
    expect(SECTION_KEYS).toContain("wedding");
    expect(SECTION_KEYS).not.toContain("calendar");
  });
});

describe("isHrefHidden", () => {
  it("hides matching hrefs only", () => {
    expect(isHrefHidden("/projects", ["work"])).toBe(true);
    expect(isHrefHidden("/want-list", ["lists"])).toBe(true);
    expect(isHrefHidden("/tasks", ["work"])).toBe(false);
    expect(isHrefHidden("/expenses", SECTION_KEYS)).toBe(false);
    expect(isHrefHidden("/settings", SECTION_KEYS)).toBe(false);
  });
});
