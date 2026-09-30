import { describe, expect, it } from "vitest";
import { applyMovement, investmentGain, reverseMovement, withdrawnTotal } from "./investment-math";

describe("applyMovement", () => {
  it("a deposit raises both invested and current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "DEPOSIT", amount: 50_000 }))
      .toEqual({ investedAmount: 150_000, currentValue: 170_000 });
  });

  it("a withdrawal lowers only the current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "WITHDRAWAL", amount: 20_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 100_000 });
  });

  it("refuses to withdraw more than the current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "WITHDRAWAL", amount: 120_001 }))
      .toEqual({ error: "You can't withdraw more than the current value" });
  });

  it("allows withdrawing exactly the current value", () => {
    expect(applyMovement({ investedAmount: 100_000, currentValue: 120_000 }, { type: "WITHDRAWAL", amount: 120_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 0 });
  });

  it("refuses zero, negative and fractional amounts", () => {
    const t = { investedAmount: 0, currentValue: 0 };
    expect(applyMovement(t, { type: "DEPOSIT", amount: 0 })).toEqual({ error: "Amount must be greater than zero" });
    expect(applyMovement(t, { type: "DEPOSIT", amount: -5 })).toEqual({ error: "Amount must be greater than zero" });
    expect(applyMovement(t, { type: "DEPOSIT", amount: 1.5 })).toEqual({ error: "Amount must be greater than zero" });
  });
});

describe("reverseMovement", () => {
  it("undoes a deposit", () => {
    expect(reverseMovement({ investedAmount: 150_000, currentValue: 170_000 }, { type: "DEPOSIT", amount: 50_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 120_000 });
  });

  it("clamps at zero when the value was marked down below the deposit", () => {
    expect(reverseMovement({ investedAmount: 50_000, currentValue: 30_000 }, { type: "DEPOSIT", amount: 50_000 }))
      .toEqual({ investedAmount: 0, currentValue: 0 });
  });

  it("undoes a withdrawal", () => {
    expect(reverseMovement({ investedAmount: 100_000, currentValue: 100_000 }, { type: "WITHDRAWAL", amount: 20_000 }))
      .toEqual({ investedAmount: 100_000, currentValue: 120_000 });
  });
});

describe("withdrawnTotal", () => {
  it("sums only withdrawals", () => {
    expect(withdrawnTotal([
      { type: "DEPOSIT", amount: 100 },
      { type: "WITHDRAWAL", amount: 30 },
      { type: "WITHDRAWAL", amount: 20 },
    ])).toBe(50);
  });
});

describe("investmentGain", () => {
  it("counts money already withdrawn as part of the return", () => {
    // Put in 100k, took out 30k, now worth 80k -> 10k gain.
    expect(investmentGain({ investedAmount: 100_000, currentValue: 80_000 }, 30_000))
      .toEqual({ gain: 10_000, gainPct: 10 });
  });

  it("is zero percent when nothing was invested", () => {
    expect(investmentGain({ investedAmount: 0, currentValue: 0 }, 0)).toEqual({ gain: 0, gainPct: 0 });
  });

  it("reports a loss", () => {
    expect(investmentGain({ investedAmount: 100_000, currentValue: 90_000 }, 0))
      .toEqual({ gain: -10_000, gainPct: -10 });
  });
});
