import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import UrgentLeadsCard from "@/components/dashboard/UrgentLeadsCard";
import type { LeadRecord } from "@/lib/types";

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "rec1",
    businessName: "Business",
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

describe("UrgentLeadsCard - top urgent leads selection/sort", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders an empty state when there are no non-Converted leads", () => {
    const leads: LeadRecord[] = [
      makeLead({ id: "1", businessName: "Converted Co", status: "Converted" }),
    ];

    render(<UrgentLeadsCard leads={leads} partner="איתי" />);

    expect(screen.getByText("כל הכבוד! אין לידים דחופים כרגע")).toBeInTheDocument();
    expect(screen.queryByText("Converted Co")).not.toBeInTheDocument();
  });

  it("excludes leads with status 'Converted'", () => {
    const leads: LeadRecord[] = [
      makeLead({
        id: "1",
        businessName: "Converted Co",
        status: "Converted",
        googleRating: 5,
        createdTime: daysAgo(1),
        followUpCount: 0,
      }),
      makeLead({
        id: "2",
        businessName: "Active Co",
        status: "New Lead",
        googleRating: 3,
        createdTime: daysAgo(30),
        followUpCount: 5,
      }),
    ];

    render(<UrgentLeadsCard leads={leads} partner="איתי" />);

    expect(screen.queryByText("Converted Co")).not.toBeInTheDocument();
    expect(screen.getByText("Active Co")).toBeInTheDocument();
  });

  it("sorts leads descending by computePriority score", () => {
    // Low score: rating null (+0), Not Interested (+0), followUps 2 (+0), old (+0) = 0
    const low = makeLead({
      id: "low",
      businessName: "Low Priority Biz",
      status: "Not Interested",
      googleRating: null,
      followUpCount: 2,
      createdTime: daysAgo(30),
    });
    // High score: rating 5 (+3), New Lead (+3), followUps 0 (+2), recent (+2) = 10
    const high = makeLead({
      id: "high",
      businessName: "High Priority Biz",
      status: "New Lead",
      googleRating: 5,
      followUpCount: 0,
      createdTime: daysAgo(1),
    });
    // Medium score: rating 4.0 (+2), Contacted (+2), followUps 1 (+1), old (+0) = 5
    const medium = makeLead({
      id: "medium",
      businessName: "Medium Priority Biz",
      status: "Contacted",
      googleRating: 4.0,
      followUpCount: 1,
      createdTime: daysAgo(30),
    });

    render(<UrgentLeadsCard leads={[low, medium, high]} partner="איתי" />);

    const names = screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
    expect(names).toEqual(["High Priority Biz", "Medium Priority Biz", "Low Priority Biz"]);
  });

  it("limits the rendered list to the top 5 leads", () => {
    const leads: LeadRecord[] = Array.from({ length: 8 }, (_, i) =>
      makeLead({
        id: `lead-${i}`,
        businessName: `Business ${i}`,
        status: "New Lead",
        googleRating: 4.5,
        followUpCount: 0,
        // Vary recency so scores are distinct and ordering is deterministic.
        createdTime: daysAgo(i),
      })
    );

    render(<UrgentLeadsCard leads={leads} partner="איתי" />);

    const names = screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
    expect(names).toHaveLength(5);
    // The most recently created leads (lowest index) score highest (recency
    // bucket: <=7 days => +2), so the first 5 (indices 0-4, all <=7 days) win.
    expect(names).toEqual(["Business 0", "Business 1", "Business 2", "Business 3", "Business 4"]);
  });

  it("renders fewer than 5 cards when fewer than 5 non-Converted leads exist", () => {
    const leads: LeadRecord[] = [
      makeLead({ id: "1", businessName: "Only Business", status: "New Lead" }),
      makeLead({ id: "2", businessName: "Converted Co", status: "Converted" }),
    ];

    render(<UrgentLeadsCard leads={leads} partner="איתי" />);

    const names = screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
    expect(names).toEqual(["Only Business"]);
  });

  it("handles ties in score by preserving a stable relative order", () => {
    // Both leads have identical score components -> same score.
    const a = makeLead({
      id: "a",
      businessName: "Tie A",
      status: "New Lead",
      googleRating: 4.5,
      followUpCount: 0,
      createdTime: daysAgo(1),
    });
    const b = makeLead({
      id: "b",
      businessName: "Tie B",
      status: "New Lead",
      googleRating: 4.5,
      followUpCount: 0,
      createdTime: daysAgo(1),
    });

    render(<UrgentLeadsCard leads={[a, b]} partner="איתי" />);

    const names = screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
    // Array.prototype.sort is stable in modern JS engines — original order
    // ([a, b]) should be preserved for equal scores.
    expect(names).toEqual(["Tie A", "Tie B"]);
  });
});
