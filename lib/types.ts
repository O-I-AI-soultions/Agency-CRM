import type { Partner } from "@/lib/auth";

export const KANBAN_STATUSES = [
  "New Lead",
  "Contacted",
  "Pitch Sent",
  "Not Interested",
] as const;

export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export type LeadStatus = KanbanStatus | "New" | "Qualified" | "Converted";

export const PRIORITIES = ["High", "Medium", "Low"] as const;

export type Priority = (typeof PRIORITIES)[number];

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

export type ScrapeRunStatus = "Running" | "Completed" | "Failed";

export interface ScrapeHistoryRecord {
  id: string;
  runId: string;
  date: string;
  city: string;
  niche: string;
  limit: number;
  status: ScrapeRunStatus | null;
  leadsFound: number;
  triggeredBy: string;
}

export const TASK_STATUSES = ["To Do", "In Progress", "Done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskRecord {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority | null;
  dueDate: string | null;
  owner: Partner;
  linkedLeadName: string | null;
  linkedLeadId: string | null;
  linkedClientName: string | null;
  linkedClientId: string | null;
  createdTime: string;
  commentCount: number;
}

export interface TaskCommentRecord {
  id: string;
  taskId: string;
  comment: string;
  author: Partner;
  date: string;
}

export interface LinkableRecord {
  id: string;
  name: string;
  type: "lead" | "client";
}

export const ROADMAP_COLORS = ["Blue", "Green", "Purple", "Orange", "Red"] as const;

export type RoadmapColor = (typeof ROADMAP_COLORS)[number];

export const ROADMAP_OWNERS = ["איתי", "עמרי", "שנינו"] as const;

export type RoadmapOwner = (typeof ROADMAP_OWNERS)[number];

export const ROADMAP_TASK_ASSIGNEES = ["Itay", "Omri"] as const;

export type RoadmapTaskAssignee = (typeof ROADMAP_TASK_ASSIGNEES)[number];

export interface RoadmapRecord {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  owner: RoadmapOwner | null;
  category: string | null;
  startDate: string | null;
  endDate: string | null;
  color: RoadmapColor | null;
  taskIds: string[];
  createdTime: string;
}

export interface RoadmapTaskRecord {
  id: string;
  title: string;
  status: TaskStatus;
  category: string | null;
  dueDate: string | null;
  assignedTo: RoadmapTaskAssignee | null;
  notes: string | null;
  milestoneIds: string[];
  parentId: string | null;
  subtaskIds: string[];
}
