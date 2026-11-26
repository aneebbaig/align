import { describe, it, expect } from "vitest";
import { parseHiddenSections, isHrefHidden, SECTION_KEYS } from "./hidden-sections";

describe("parseHiddenSections", () => {
  it("accepts known keys and dedupes", () => {
    expect(parseHiddenSections(["tasks", "budget", "tasks"])).toEqual(["budget", "tasks"]);
  });
  it("accepts an empty list", () => expect(parseHiddenSections([])).toEqual([]));
  it("rejects unknown keys, expenses and settings", () => {
    expect(parseHiddenSections(["nope"])).toBeNull();
    expect(parseHiddenSections(["expenses"])).toBeNull();
    expect(parseHiddenSections(["settings"])).toBeNull();
  });
  it("rejects non-arrays and non-strings", () => {
    expect(parseHiddenSections("tasks")).toBeNull();
    expect(parseHiddenSections([1])).toBeNull();
    expect(parseHiddenSections(undefined)).toBeNull();
  });
  it("has the 15 shared keys", () => expect(SECTION_KEYS).toHaveLength(15));
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
