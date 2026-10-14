import { describe, expect, it } from "vitest";
import { evaluateAmount } from "./amount-expr";

const ok = (input: string) => {
  const r = evaluateAmount(input);
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r;
};
const err = (input: string) => {
  const r = evaluateAmount(input);
  if (r.ok) throw new Error(`expected an error, got ${r.value}`);
  return r.error;
};

describe("evaluateAmount", () => {
  it("passes a plain number straight through", () => {
    expect(ok("250")).toEqual({ ok: true, value: 250, isExpression: false });
    expect(ok("12.5").value).toBe(12.5);
    expect(ok(".5").value).toBe(0.5);
    expect(ok(" 99 ").value).toBe(99);
  });

  it("adds and subtracts, with or without spaces", () => {
    expect(ok("35+67")).toEqual({ ok: true, value: 102, isExpression: true });
    expect(ok("100-40")).toEqual({ ok: true, value: 60, isExpression: true });
    expect(ok("1000 + 250 - 50").value).toBe(1200);
    expect(ok("10-3-2").value).toBe(5);
  });

  it("is exact with decimals (no 0.1 + 0.2 float noise)", () => {
    expect(ok("0.1+0.2").value).toBe(0.3);
    expect(ok("19.99+0.01").value).toBe(20);
  });

  it("rejects results that are negative", () => {
    expect(err("67-90")).toMatch(/negative/i);
    expect(err("5-10+2")).toMatch(/negative/i);
  });

  it("rejects a leading minus", () => {
    expect(err("-5")).toMatch(/negative/i);
  });

  it("rejects zero", () => {
    expect(err("0")).toMatch(/greater than zero/i);
    expect(err("50-50")).toMatch(/greater than zero/i);
  });

  it("rejects empty input", () => {
    expect(err("")).toMatch(/required/i);
    expect(err("   ")).toMatch(/required/i);
  });

  it("rejects malformed expressions", () => {
    for (const bad of ["5+", "+5", "5++3", "5+-3", "1.2.3", "abc", "5*3", "5/2", "(5)", "5 5", "1,000", "1e3", "--5"]) {
      expect(evaluateAmount(bad).ok, bad).toBe(false);
    }
  });

  it("rejects more than two decimal places", () => {
    expect(err("1.234")).toMatch(/2 decimal/i);
    expect(err("1+0.005")).toMatch(/2 decimal/i);
  });

  it("rejects amounts too large to store", () => {
    expect(err("99999999999")).toMatch(/too large/i);
    expect(err("20000000+20000000")).toMatch(/too large/i);
    expect(ok("21474836").value).toBe(21474836);
  });
});
