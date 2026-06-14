import { describe, it, expect } from "vitest";
import { computePriority } from "@/lib/priority";
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

describe("computePriority", () => {
  describe("rating component", () => {
    it("adds +3 for rating >= 4.5", () => {
      const lead = makeLead({ googleRating: 4.5, status: "Not Interested", followUpCount: 2, createdTime: daysAgo(30) });
      expect(computePriority(lead).score).toBe(3);
    });

    it("adds +3 for rating above 4.5", () => {
      const lead = makeLead({ googleRating: 5, status: "Not Interested", followUpCount: 2, createdTime: daysAgo(30) });
      expect(computePriority(lead).score).toBe(3);
    });

    it("adds +2 for rating >= 4.0 and < 4.5", () => {
      const lead = makeLead({ googleRating: 4.0, status: "Not Interested", followUpCount: 2, createdTime: daysAgo(30) });
      expect(computePriority(lead).score).toBe(2);
    });

    it("adds +1 for rating >= 3.5 and < 4.0", () => {
      const lead = makeLead({ googleRating: 3.5, status: "Not Interested", followUpCount: 2, createdTime: daysAgo(30) });
      expect(computePriority(lead).score).toBe(1);
    });

    it("adds +0 for rating < 3.5", () => {
      const lead = makeLead({ googleRating: 3.4, status: "Not Interested", followUpCount: 2, createdTime: daysAgo(30) });
      expect(computePriority(lead).score).toBe(0);
    });

    it("adds +0 for null rating", () => {
      const lead = makeLead({ googleRating: null, status: "Not Interested", followUpCount: 2, createdTime: daysAgo(30) });
      expect(computePriority(lead).score).toBe(0);
    });
  });

  describe("status component", () => {
    const base = { googleRating: null, followUpCount: 2, createdTime: daysAgo(30) } as const;

    it("adds +3 for status 'New Lead'", () => {
      const lead = makeLead({ ...base, status: "New Lead" });
      expect(computePriority(lead).score).toBe(3);
    });

    it("adds +3 for null status", () => {
      const lead = makeLead({ ...base, status: null });
      expect(computePriority(lead).score).toBe(3);
    });

    it("adds +2 for status 'Contacted'", () => {
      const lead = makeLead({ ...base, status: "Contacted" });
      expect(computePriority(lead).score).toBe(2);
    });

    it("adds +1 for status 'Pitch Sent'", () => {
      const lead = makeLead({ ...base, status: "Pitch Sent" });
      expect(computePriority(lead).score).toBe(1);
    });

    it("adds +0 for other statuses (e.g. 'Not Interested')", () => {
      const lead = makeLead({ ...base, status: "Not Interested" });
      expect(computePriority(lead).score).toBe(0);
    });
  });

  describe("follow-up count component", () => {
    const base = { googleRating: null, status: "Not Interested", createdTime: daysAgo(30) } as const;

    it("adds +2 for 0 follow-ups", () => {
      const lead = makeLead({ ...base, followUpCount: 0 });
      expect(computePriority(lead).score).toBe(2);
    });

    it("adds +2 for null follow-up count (treated as 0)", () => {
      const lead = makeLead({ ...base, followUpCount: null });
      expect(computePriority(lead).score).toBe(2);
    });

    it("adds +1 for 1 follow-up", () => {
      const lead = makeLead({ ...base, followUpCount: 1 });
      expect(computePriority(lead).score).toBe(1);
    });

    it("adds +0 for 2 or more follow-ups", () => {
      const lead = makeLead({ ...base, followUpCount: 2 });
      expect(computePriority(lead).score).toBe(0);

      const lead2 = makeLead({ ...base, followUpCount: 10 });
      expect(computePriority(lead2).score).toBe(0);
    });
  });

  describe("recency component", () => {
    const base = { googleRating: null, status: "Not Interested", followUpCount: 2 } as const;

    it("adds +2 for createdTime <= 7 days ago", () => {
      const lead = makeLead({ ...base, createdTime: daysAgo(7) });
      expect(computePriority(lead).score).toBe(2);

      const leadToday = makeLead({ ...base, createdTime: daysAgo(0) });
      expect(computePriority(leadToday).score).toBe(2);
    });

    it("adds +1 for createdTime between 7 and 14 days ago", () => {
      const lead = makeLead({ ...base, createdTime: daysAgo(14) });
      expect(computePriority(lead).score).toBe(1);

      const lead2 = makeLead({ ...base, createdTime: daysAgo(10) });
      expect(computePriority(lead2).score).toBe(1);
    });

    it("adds +0 for createdTime older than 14 days", () => {
      const lead = makeLead({ ...base, createdTime: daysAgo(15) });
      expect(computePriority(lead).score).toBe(0);

      const lead2 = makeLead({ ...base, createdTime: daysAgo(100) });
      expect(computePriority(lead2).score).toBe(0);
    });
  });

  describe("level boundaries", () => {
    it("returns 'High' for score >= 7", () => {
      // rating 4.5 (+3), status New Lead/null (+3), followUps 0 (+2), recency old (+0) = 8
      const lead = makeLead({
        googleRating: 4.5,
        status: "New Lead",
        followUpCount: 0,
        createdTime: daysAgo(30),
      });
      const result = computePriority(lead);
      expect(result.score).toBe(8);
      expect(result.level).toBe("High");
    });

    it("returns 'High' at exactly score 7", () => {
      // rating 4.0 (+2), status New Lead (+3), followUps 0 (+2), recency old (+0) = 7
      const lead = makeLead({
        googleRating: 4.0,
        status: "New Lead",
        followUpCount: 0,
        createdTime: daysAgo(30),
      });
      const result = computePriority(lead);
      expect(result.score).toBe(7);
      expect(result.level).toBe("High");
    });

    it("returns 'Medium' for score between 4 and 6 (inclusive)", () => {
      // rating 3.5 (+1), status Contacted (+2), followUps 1 (+1), recency old (+0) = 4
      const lead = makeLead({
        googleRating: 3.5,
        status: "Contacted",
        followUpCount: 1,
        createdTime: daysAgo(30),
      });
      const result = computePriority(lead);
      expect(result.score).toBe(4);
      expect(result.level).toBe("Medium");
    });

    it("returns 'Medium' at exactly score 6", () => {
      // rating 4.0 (+2), status Contacted (+2), followUps 0 (+2), recency old (+0) = 6
      const lead = makeLead({
        googleRating: 4.0,
        status: "Contacted",
        followUpCount: 0,
        createdTime: daysAgo(30),
      });
      const result = computePriority(lead);
      expect(result.score).toBe(6);
      expect(result.level).toBe("Medium");
    });

    it("returns 'Low' for score < 4", () => {
      // rating null (+0), status Not Interested (+0), followUps 2 (+0), recency old (+0) = 0
      const lead = makeLead({
        googleRating: null,
        status: "Not Interested",
        followUpCount: 2,
        createdTime: daysAgo(30),
      });
      const result = computePriority(lead);
      expect(result.score).toBe(0);
      expect(result.level).toBe("Low");
    });

    it("returns 'Low' at exactly score 3", () => {
      // rating 3.5 (+1), status Pitch Sent (+1), followUps 1 (+1), recency old (+0) = 3
      const lead = makeLead({
        googleRating: 3.5,
        status: "Pitch Sent",
        followUpCount: 1,
        createdTime: daysAgo(30),
      });
      const result = computePriority(lead);
      expect(result.score).toBe(3);
      expect(result.level).toBe("Low");
    });

    it("returns the maximum score of 10 for a maximally urgent lead", () => {
      // rating 4.5 (+3), status New Lead (+3), followUps 0 (+2), recency <=7 days (+2) = 10
      const lead = makeLead({
        googleRating: 5,
        status: "New Lead",
        followUpCount: 0,
        createdTime: daysAgo(1),
      });
      const result = computePriority(lead);
      expect(result.score).toBe(10);
      expect(result.level).toBe("High");
    });
  });
});
