import { describe, expect, it } from "vitest";
import {
  applyLoanEntry, isLoanClosed, loanStatusFor, normalizePersonName, offersWriteOffExpense, reverseLoanEntry,
} from "./balance";

describe("loanStatusFor", () => {
  it("is ACTIVE when nothing is repaid", () => expect(loanStatusFor(100, 100)).toBe("ACTIVE"));
  it("is PARTIALLY_PAID in between", () => expect(loanStatusFor(40, 100)).toBe("PARTIALLY_PAID"));
  it("is PAID at zero with no write-off", () => expect(loanStatusFor(0, 100)).toBe("PAID"));
  it("is WRITTEN_OFF at zero when any write-off exists", () => expect(loanStatusFor(0, 100, true)).toBe("WRITTEN_OFF"));
  it("ignores write-offs while money is still owed", () => expect(loanStatusFor(10, 100, true)).toBe("PARTIALLY_PAID"));
});

describe("isLoanClosed", () => {
  it("treats PAID and WRITTEN_OFF as closed", () => {
    expect(isLoanClosed("PAID")).toBe(true);
    expect(isLoanClosed("WRITTEN_OFF")).toBe(true);
    expect(isLoanClosed("ACTIVE")).toBe(false);
    expect(isLoanClosed("PARTIALLY_PAID")).toBe(false);
  });
});

describe("offersWriteOffExpense", () => {
  it("only for a lent loan created track-only", () => {
    expect(offersWriteOffExpense({ type: "GIVEN", transactionId: null })).toBe(true);
    expect(offersWriteOffExpense({ type: "GIVEN", transactionId: "t1" })).toBe(false);
    expect(offersWriteOffExpense({ type: "RECEIVED", transactionId: null })).toBe(false);
  });
});

describe("applyLoanEntry", () => {
  const b = { principalAmount: 100_000, remainingAmount: 60_000 };
  it("a top-up raises principal and remaining", () =>
    expect(applyLoanEntry(b, { kind: "TOP_UP", amount: 20_000 })).toEqual({ principalAmount: 120_000, remainingAmount: 80_000 }));
  it("a payment lowers remaining", () =>
    expect(applyLoanEntry(b, { kind: "PAYMENT", amount: 10_000 })).toEqual({ principalAmount: 100_000, remainingAmount: 50_000 }));
  it("a write-off lowers remaining", () =>
    expect(applyLoanEntry(b, { kind: "WRITE_OFF", amount: 60_000 })).toEqual({ principalAmount: 100_000, remainingAmount: 0 }));
  it("refuses more than what's left", () =>
    expect(applyLoanEntry(b, { kind: "WRITE_OFF", amount: 60_001 })).toEqual({ error: "That's more than what's left on this loan" }));
  it("refuses zero or fractional amounts", () => {
    expect(applyLoanEntry(b, { kind: "TOP_UP", amount: 0 })).toEqual({ error: "Amount must be greater than zero" });
    expect(applyLoanEntry(b, { kind: "TOP_UP", amount: 2.5 })).toEqual({ error: "Amount must be greater than zero" });
  });
});

describe("reverseLoanEntry", () => {
  it("undoes a top-up", () =>
    expect(reverseLoanEntry({ principalAmount: 120_000, remainingAmount: 80_000 }, { kind: "TOP_UP", amount: 20_000 }))
      .toEqual({ principalAmount: 100_000, remainingAmount: 60_000 }));
  it("refuses to undo a top-up when more than that has been repaid", () =>
    expect(reverseLoanEntry({ principalAmount: 120_000, remainingAmount: 10_000 }, { kind: "TOP_UP", amount: 20_000 }))
      .toEqual({ error: "Can't remove this - more than that has already been repaid or written off" }));
  it("undoes a payment or write-off, never above principal", () => {
    expect(reverseLoanEntry({ principalAmount: 100_000, remainingAmount: 0 }, { kind: "WRITE_OFF", amount: 30_000 }))
      .toEqual({ principalAmount: 100_000, remainingAmount: 30_000 });
    expect(reverseLoanEntry({ principalAmount: 100_000, remainingAmount: 90_000 }, { kind: "PAYMENT", amount: 30_000 }))
      .toEqual({ principalAmount: 100_000, remainingAmount: 100_000 });
  });
});

describe("normalizePersonName", () => {
  it("ignores case and extra spaces", () => {
    expect(normalizePersonName("  Ahmed   Khan ")).toBe("ahmed khan");
    expect(normalizePersonName("ahmed khan")).toBe(normalizePersonName("AHMED KHAN"));
  });
});
