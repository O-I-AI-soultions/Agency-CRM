import { describe, it, expect } from "vitest";
import { applyFilters, getUniqueCities, getUniqueNiches, DEFAULT_FILTERS } from "@/lib/filters";
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

describe("applyFilters", () => {
  const leads: LeadRecord[] = [
    makeLead({
      id: "1",
      businessName: "Pizza Place",
      city: "תל אביב",
      niche: "מסעדות",
      status: "New Lead",
      googleRating: 4.8,
    }),
    makeLead({
      id: "2",
      businessName: "Hair Salon",
      city: "כפר סבא",
      niche: "מספרות",
      status: "Contacted",
      googleRating: 4.2,
    }),
    makeLead({
      id: "3",
      businessName: "Pizza Express",
      city: "ירושלים",
      niche: "מסעדות",
      status: "Pitch Sent",
      googleRating: 3.0,
    }),
    makeLead({
      id: "4",
      businessName: "No City Shop",
      city: null,
      niche: null,
      status: null,
      googleRating: null,
    }),
  ];

  it("returns all leads when no filters are active", () => {
    expect(applyFilters(leads, DEFAULT_FILTERS)).toHaveLength(4);
  });

  it("filters by search (case-insensitive, substring match on businessName)", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, search: "pizza" });
    expect(result.map((l) => l.id)).toEqual(["1", "3"]);
  });

  it("filters by city (case-insensitive substring)", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, city: "תל אביב" });
    expect(result.map((l) => l.id)).toEqual(["1"]);
  });

  it("excludes leads with null city when a city filter is active", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, city: "סבא" });
    expect(result.map((l) => l.id)).toEqual(["2"]);
  });

  it("filters by niche (case-insensitive substring)", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, niche: "מסעדות" });
    expect(result.map((l) => l.id)).toEqual(["1", "3"]);
  });

  it("filters by exact status match", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, status: "Contacted" });
    expect(result.map((l) => l.id)).toEqual(["2"]);
  });

  it("filters by minRating (inclusive lower bound)", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, minRating: 4.0 });
    expect(result.map((l) => l.id)).toEqual(["1", "2"]);
  });

  it("treats null googleRating as 0 for minRating filter", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, minRating: 1 });
    expect(result.map((l) => l.id)).toEqual(["1", "2", "3"]);
  });

  it("combines multiple filters with AND semantics", () => {
    const result = applyFilters(leads, {
      ...DEFAULT_FILTERS,
      search: "pizza",
      city: "ירושלים",
    });
    expect(result.map((l) => l.id)).toEqual(["3"]);
  });

  it("returns an empty array when nothing matches", () => {
    const result = applyFilters(leads, { ...DEFAULT_FILTERS, search: "nonexistent-xyz" });
    expect(result).toEqual([]);
  });
});

describe("getUniqueCities", () => {
  it("returns deduplicated, sorted, non-null cities", () => {
    const leads: LeadRecord[] = [
      makeLead({ city: "תל אביב" }),
      makeLead({ city: "ירושלים" }),
      makeLead({ city: "תל אביב" }),
      makeLead({ city: null }),
      makeLead({ city: "אשדוד" }),
    ];

    const result = getUniqueCities(leads);
    expect(result).toEqual(["אשדוד", "ירושלים", "תל אביב"]);
  });

  it("returns an empty array when there are no cities", () => {
    const leads: LeadRecord[] = [makeLead({ city: null }), makeLead({ city: null })];
    expect(getUniqueCities(leads)).toEqual([]);
  });
});

describe("getUniqueNiches", () => {
  it("returns deduplicated (case-insensitive) niches preserving first-seen casing, sorted", () => {
    const leads: LeadRecord[] = [
      makeLead({ niche: "מסעדות" }),
      makeLead({ niche: "מספרות" }),
      makeLead({ niche: "מסעדות" }),
      makeLead({ niche: null }),
      makeLead({ niche: "  " }),
      makeLead({ niche: "קליניקות" }),
    ];

    const result = getUniqueNiches(leads);
    expect(result).toEqual(["מסעדות", "מספרות", "קליניקות"]);
  });

  it("trims whitespace and ignores blank niches", () => {
    const leads: LeadRecord[] = [
      makeLead({ niche: "  מסעדות  " }),
      makeLead({ niche: "" }),
      makeLead({ niche: "   " }),
    ];

    const result = getUniqueNiches(leads);
    expect(result).toEqual(["מסעדות"]);
  });

  it("deduplicates case-insensitively (e.g. English niches)", () => {
    const leads: LeadRecord[] = [makeLead({ niche: "Restaurants" }), makeLead({ niche: "restaurants" })];
    const result = getUniqueNiches(leads);
    expect(result).toEqual(["Restaurants"]);
  });
});
