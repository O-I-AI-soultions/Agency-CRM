import type { LeadRecord } from "@/lib/types";

export interface Filters {
  search: string;
  city: string;
  niche: string;
  status: string;
  minRating: number | null;
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  city: "",
  niche: "",
  status: "",
  minRating: null,
};

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.search !== "" ||
    filters.city !== "" ||
    filters.niche !== "" ||
    filters.status !== "" ||
    filters.minRating !== null
  );
}

export function applyFilters(leads: LeadRecord[], filters: Filters): LeadRecord[] {
  return leads.filter((lead) => {
    if (
      filters.search &&
      !lead.businessName.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (filters.city && lead.city !== filters.city) return false;
    if (filters.niche && lead.niche?.toLowerCase() !== filters.niche.toLowerCase()) return false;
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.minRating && (lead.googleRating ?? 0) < filters.minRating) return false;
    return true;
  });
}

export function getUniqueCities(leads: LeadRecord[]): string[] {
  const cities = new Set<string>();
  for (const lead of leads) {
    if (lead.city) cities.add(lead.city);
  }
  return Array.from(cities).sort((a, b) => a.localeCompare(b));
}

export function getUniqueNiches(leads: LeadRecord[]): string[] {
  const seen = new Map<string, string>();
  for (const lead of leads) {
    const niche = lead.niche?.trim();
    if (!niche) continue;
    const key = niche.toLowerCase();
    if (!seen.has(key)) seen.set(key, niche);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
