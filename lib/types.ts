export const KANBAN_STATUSES = [
  "New Lead",
  "Contacted",
  "Pitch Sent",
  "Not Interested",
] as const;

export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export type LeadStatus = KanbanStatus | "New" | "Qualified";

export type Priority = "High" | "Medium" | "Low";

export interface LeadRecord {
  id: string;
  businessName: string;
  phoneNumber: string | null;
  city: string | null;
  googleRating: number | null;
  websiteUrl: string | null;
  googleMapsLink: string | null;
  status: LeadStatus | null;
  notes: string | null;
  lastContacted: string | null;
  nextAction: string | null;
  leadSource: string | null;
  priority: Priority | null;
  assignedTo: string | null;
  followUpCount: number | null;
  createdTime: string;
  email: string | null;
  address: string | null;
  niche: string | null;
}

export type ClientStatus = "Active" | "Inactive";

export interface ClientRecord {
  id: string;
  clientName: string;
  setupFee: number | null;
  monthlyRetainer: number | null;
  status: ClientStatus | null;
}
