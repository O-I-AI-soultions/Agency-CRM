import { describe, it, expect } from "vitest";
import { computeYieldRate } from "@/lib/types";

describe("computeYieldRate", () => {
  it("returns 100 when leadsFound equals limit", () => {
    expect(computeYieldRate(50, 50)).toBe(100);
  });

  it("returns 0 when no leads were found", () => {
    expect(computeYieldRate(0, 50)).toBe(0);
  });

  it("returns a fractional percentage for a partial yield", () => {
    expect(computeYieldRate(25, 50)).toBe(50);
    expect(computeYieldRate(10, 50)).toBe(20);
  });

  it("can exceed 100 when leadsFound is greater than limit", () => {
    expect(computeYieldRate(60, 50)).toBe(120);
  });

  it("returns 0 when limit is 0 (avoids division by zero)", () => {
    expect(computeYieldRate(10, 0)).toBe(0);
  });

  it("returns 0 when limit is negative", () => {
    expect(computeYieldRate(10, -5)).toBe(0);
  });
});
