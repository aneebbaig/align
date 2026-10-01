import { describe, expect, it } from "vitest";
import { lineForm, settingsForm } from "./forms";

describe("lineForm", () => {
  it("starts a new line as rupees coming in, with no name", () => {
    expect(lineForm(null)).toEqual({ name: "", direction: "IN", currency: "PKR" });
  });

  it("loads an existing line exactly, so a rename can't flip direction or currency", () => {
    expect(lineForm({ name: "Freelance", direction: "OUT", currency: "USD" })).toEqual({ name: "Freelance", direction: "OUT", currency: "USD" });
  });
});

describe("settingsForm", () => {
  it("loads the current settings as input strings", () => {
    expect(settingsForm({ startMonth: 9, startYear: 2026, months: 24, startingCashPaisas: -150050, usdRate: 278.5 })).toEqual({
      start: "2026-09",
      months: "24",
      startingCash: "-1500.5",
      usdRate: "278.5",
    });
  });
});
