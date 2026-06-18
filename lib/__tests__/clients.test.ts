import { describe, it, expect } from "vitest";
import { isRenewalDueSoon } from "@/lib/types";
import type { ClientRecord } from "@/lib/types";

function makeClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "rec1",
    clientName: "Test Client",
    setupFee: null,
    monthlyRetainer: null,
    status: null,
    renewalDate: null,
    ...overrides,
  };
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

describe("isRenewalDueSoon", () => {
  it("is false when renewalDate is null", () => {
    const client = makeClient({ renewalDate: null });
    expect(isRenewalDueSoon(client)).toBe(false);
  });

  it("is false when renewalDate is an invalid date string", () => {
    const client = makeClient({ renewalDate: "not-a-date" });
    expect(isRenewalDueSoon(client)).toBe(false);
  });

  it("is true when renewalDate is today", () => {
    const client = makeClient({ renewalDate: daysFromNow(0) });
    expect(isRenewalDueSoon(client)).toBe(true);
  });

  it("is true when renewalDate is in the past (overdue)", () => {
    const client = makeClient({ renewalDate: daysFromNow(-10) });
    expect(isRenewalDueSoon(client)).toBe(true);
  });

  it("is true when renewalDate is well within the 30-day window", () => {
    const client = makeClient({ renewalDate: daysFromNow(25) });
    expect(isRenewalDueSoon(client)).toBe(true);
  });

  it("is false when renewalDate is well beyond the 30-day window", () => {
    const client = makeClient({ renewalDate: daysFromNow(40) });
    expect(isRenewalDueSoon(client)).toBe(false);
  });

  it("is false for a renewal date far in the future", () => {
    const client = makeClient({ renewalDate: daysFromNow(365) });
    expect(isRenewalDueSoon(client)).toBe(false);
  });
});
