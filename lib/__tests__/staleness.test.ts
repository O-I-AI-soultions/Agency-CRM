import { describe, it, expect } from "vitest";
import { computeStaleness } from "@/lib/staleness";
import type { LeadRecord } from "@/lib/types";

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "rec1",
    businessName: "Test Business",
    phoneNumber: null,
    city: null,
    googleRating: null,
    websiteUrl: null,
    googleMapsLink: null,
    status: null,
    notes: null,
    lastContacted: null,
    nextAction: null,
    leadSource: null,
    priority: null,
    assignedTo: null,
    followUpCount: null,
    createdTime: new Date().toISOString(),
    email: null,
    address: null,
    niche: null,
    ...overrides,
  };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

describe("computeStaleness", () => {
  describe("threshold boundaries", () => {
    it("is 'fresh' at 0 days", () => {
      const lead = makeLead({ lastContacted: daysAgo(0) });
      expect(computeStaleness(lead).level).toBe("fresh");
    });

    it("is 'fresh' at exactly 3 days", () => {
      const lead = makeLead({ lastContacted: daysAgo(3) });
      expect(computeStaleness(lead).level).toBe("fresh");
    });

    it("is 'aging' at 4 days", () => {
      const lead = makeLead({ lastContacted: daysAgo(4) });
      expect(computeStaleness(lead).level).toBe("aging");
    });

    it("is 'aging' at exactly 10 days", () => {
      const lead = makeLead({ lastContacted: daysAgo(10) });
      expect(computeStaleness(lead).level).toBe("aging");
    });

    it("is 'stale' at 11 days", () => {
      const lead = makeLead({ lastContacted: daysAgo(11) });
      expect(computeStaleness(lead).level).toBe("stale");
    });

    it("is 'stale' for a very old lead", () => {
      const lead = makeLead({ lastContacted: daysAgo(60) });
      expect(computeStaleness(lead).level).toBe("stale");
    });
  });

  describe("days calculation", () => {
    it("returns the floor of elapsed days", () => {
      const lead = makeLead({
        lastContacted: new Date(Date.now() - 5.9 * 86_400_000).toISOString(),
      });
      expect(computeStaleness(lead).days).toBe(5);
    });
  });

  describe("lastContacted vs createdTime fallback", () => {
    it("uses lastContacted as the reference point when set", () => {
      const lead = makeLead({
        lastContacted: daysAgo(2),
        createdTime: daysAgo(30),
      });
      const result = computeStaleness(lead);
      expect(result.days).toBe(2);
      expect(result.level).toBe("fresh");
    });

    it("falls back to createdTime when lastContacted is null", () => {
      const lead = makeLead({
        lastContacted: null,
        createdTime: daysAgo(15),
      });
      const result = computeStaleness(lead);
      expect(result.days).toBe(15);
      expect(result.level).toBe("stale");
    });

    it("treats a never-contacted, freshly-created lead as fresh", () => {
      const lead = makeLead({
        lastContacted: null,
        createdTime: daysAgo(1),
      });
      expect(computeStaleness(lead).level).toBe("fresh");
    });
  });
});
