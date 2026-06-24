import "server-only";
import Airtable from "airtable";
import {
  PRIORITIES,
  ROADMAP_COLORS,
  ROADMAP_OWNERS,
  ROADMAP_TASK_ASSIGNEES,
  TASK_STATUSES,
  type ClientRecord,
  type ClientStatus,
  type KanbanStatus,
  type LeadRecord,
  type NoteRecord,
  type PartnerSettings,
  type Priority,
  type RoadmapColor,
  type RoadmapOwner,
  type RoadmapRecord,
  type RoadmapTaskAssignee,
  type RoadmapTaskRecord,
  type ScrapeHistoryRecord,
  type ScrapeRunStatus,
  type TaskCommentRecord,
  type TaskRecord,
  type TaskStatus,
} from "@/lib/types";
import type { Partner } from "@/lib/auth";

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID env vars");
}

const base = new Airtable({ apiKey }).base(baseId);

function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export const LEAD_TRACKER_TABLE = "Lead Tracker";
export const CLIENTS_TABLE = "Clients";
export const SCRAPE_HISTORY_TABLE = "Scrape History";
export const TASKS_TABLE = "Tasks";
export const TASK_COMMENTS_TABLE = "Task Comments";
export const ROADMAP_TABLE = "Roadmap";
export const ROADMAP_TASKS_TABLE = "Roadmap Tasks";
export const PARTNERS_TABLE = "Partners";
export const NOTES_TABLE = "Notes";

function mapLeadRecord(record: Airtable.Record<Airtable.FieldSet>): LeadRecord {
  const fields = record.fields;

  const assignedTo = fields["Assigned To"] as
    | { id: string; name: string; email: string }
    | undefined;

  return {
    id: record.id,
    businessName: (fields["Business Name"] as string) ?? "",
    phoneNumber: (fields["Phone Number"] as string) ?? null,
    city: (fields["City"] as string) ?? null,
    googleRating: (fields["Google Rating"] as number) ?? null,
    websiteUrl: (fields["Website URL"] as string) ?? null,
    googleMapsLink: (fields["Google Maps Link"] as string) ?? null,
    status: (fields["Status"] as LeadRecord["status"]) ?? null,
    notes: (fields["Notes"] as string) ?? null,
    lastContacted: (fields["Last Contacted"] as string) ?? null,
    nextAction: (fields["Next Action"] as string) ?? null,
    leadSource: (fields["Lead Source"] as string) ?? null,
    priority: (fields["Priority"] as LeadRecord["priority"]) ?? null,
    assignedTo: assignedTo?.name ?? null,
    followUpCount: (fields["Follow-up Count"] as number) ?? null,
    createdTime: record._rawJson.createdTime,
    email: (fields["Email"] as string) ?? null,
    address: (fields["Address"] as string) ?? null,
    niche: (fields["Niche"] as string) ?? null,
  };
}

function mapClientRecord(record: Airtable.Record<Airtable.FieldSet>): ClientRecord {
  const fields = record.fields;

  return {
    id: record.id,
    clientName: (fields["Client Name"] as string) ?? "",
    setupFee: (fields["Setup Fee"] as number) ?? null,
    monthlyRetainer: (fields["Monthly Retainer"] as number) ?? null,
    status: (fields["Status"] as ClientStatus) ?? null,
  };
}

export async function listLeads(): Promise<LeadRecord[]> {
  const records = await base(LEAD_TRACKER_TABLE).select().all();
  return records.map(mapLeadRecord);
}

export async function getLead(recordId: string): Promise<LeadRecord> {
  const record = await base(LEAD_TRACKER_TABLE).find(recordId);
  return mapLeadRecord(record);
}

export async function updateLeadStatus(
  recordId: string,
  status: KanbanStatus
): Promise<void> {
  if (status === "Contacted") {
    const record = await base(LEAD_TRACKER_TABLE).find(recordId);
    const currentCount = (record.fields["Follow-up Count"] as number) ?? 0;

    await base(LEAD_TRACKER_TABLE).update(recordId, {
      Status: status,
      "Last Contacted": new Date().toISOString(),
      "Follow-up Count": currentCount + 1,
    });
    return;
  }

  await base(LEAD_TRACKER_TABLE).update(recordId, {
    Status: status,
  });
}

export async function updateLeadFields(
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await base(LEAD_TRACKER_TABLE).update(recordId, fields as Partial<Airtable.FieldSet>);
}

export async function deleteLead(recordId: string): Promise<void> {
  await base(LEAD_TRACKER_TABLE).destroy(recordId);
}

export async function listClients(): Promise<ClientRecord[]> {
  const records = await base(CLIENTS_TABLE).select().all();
  return records.map(mapClientRecord);
}

export async function updateClientStatus(
  recordId: string,
  status: ClientStatus
): Promise<void> {
  await base(CLIENTS_TABLE).update(recordId, {
    Status: status,
  });
}

function mapScrapeHistoryRecord(
  record: Airtable.Record<Airtable.FieldSet>
): ScrapeHistoryRecord {
  const fields = record.fields;

  return {
    id: record.id,
    runId: (fields["Run ID"] as string) ?? "",
    date: (fields["Date"] as string) ?? record._rawJson.createdTime,
    city: (fields["City"] as string) ?? "",
    niche: (fields["Niche"] as string) ?? "",
    limit: (fields["Limit"] as number) ?? 0,
    status: (fields["Status"] as ScrapeRunStatus) ?? null,
    leadsFound: (fields["Leads Found"] as number) ?? 0,
    triggeredBy: (fields["Triggered By"] as string) ?? "",
  };
}

export async function listScrapeHistory(): Promise<ScrapeHistoryRecord[]> {
  const records = await base(SCRAPE_HISTORY_TABLE)
    .select({ sort: [{ field: "Date", direction: "desc" }] })
    .all();
  return records.map(mapScrapeHistoryRecord);
}

export async function createScrapeHistoryRecord(data: {
  runId: string;
  city: string;
  niche: string;
  limit: number;
  triggeredBy: string;
}): Promise<string> {
  const record = await base(SCRAPE_HISTORY_TABLE).create({
    "Run ID": data.runId,
    Date: new Date().toISOString(),
    City: data.city,
    Niche: data.niche,
    Limit: data.limit,
    Status: "Running",
    "Leads Found": 0,
    "Triggered By": data.triggeredBy,
  });
  return record.id;
}

export async function completeScrapeHistoryRecord(
  recordId: string,
  leadsFound: number
): Promise<void> {
  await base(SCRAPE_HISTORY_TABLE).update(recordId, {
    Status: "Completed",
    "Leads Found": leadsFound,
  });
}

export async function failScrapeHistoryRecord(recordId: string): Promise<void> {
  await base(SCRAPE_HISTORY_TABLE).update(recordId, {
    Status: "Failed",
  });
}

export async function countLeadTrackerRecords(): Promise<number> {
  const records = await base(LEAD_TRACKER_TABLE)
    .select({ fields: [] })
    .all();
  return records.length;
}

export interface ConvertLeadResult {
  clientCreated: boolean;
  leadStatusUpdated: boolean;
}

export async function convertLeadToClient(
  leadId: string,
  details: { businessName: string; setupFee: number; monthlyRetainer: number }
): Promise<ConvertLeadResult> {
  // Create the client record first. If this fails, the whole operation
  // throws and nothing has changed.
  await base(CLIENTS_TABLE).create({
    "Client Name": details.businessName,
    "Setup Fee": details.setupFee,
    "Monthly Retainer": details.monthlyRetainer,
    Status: "Active",
  });

  // The client record was created successfully at this point. Updating the
  // Lead Tracker "Status" field to "Converted" can fail independently (e.g.
  // if the Airtable "Status" single-select doesn't have a "Converted" option
  // configured yet) — catch that separately so a partial success (client
  // created, lead status not updated) doesn't get reported as a total
  // failure to the caller.
  try {
    await base(LEAD_TRACKER_TABLE).update(leadId, {
      Status: "Converted",
    });
    return { clientCreated: true, leadStatusUpdated: true };
  } catch (err) {
    console.error("convertLeadToClient: failed to update lead status to Converted", err);
    return { clientCreated: true, leadStatusUpdated: false };
  }
}

function mapTaskRecord(
  record: Airtable.Record<Airtable.FieldSet>,
  commentCount = 0
): TaskRecord {
  const fields = record.fields;

  return {
    id: record.id,
    title: (fields["Title"] as string) ?? "",
    status: (fields["Status"] as TaskStatus) ?? "To Do",
    priority: (fields["Priority"] as Priority) ?? null,
    dueDate: (fields["Due Date"] as string) ?? null,
    owner: (fields["Owner"] as Partner) ?? "איתי",
    linkedLeadName: (fields["Linked Lead Name"] as string) ?? null,
    linkedLeadId: (fields["Linked Lead ID"] as string) ?? null,
    linkedClientName: (fields["Linked Client Name"] as string) ?? null,
    linkedClientId: (fields["Linked Client ID"] as string) ?? null,
    createdTime: record._rawJson.createdTime,
    commentCount,
  };
}

function mapTaskCommentRecord(record: Airtable.Record<Airtable.FieldSet>): TaskCommentRecord {
  const fields = record.fields;

  return {
    id: record.id,
    taskId: (fields["Task ID"] as string) ?? "",
    comment: (fields["Comment"] as string) ?? "",
    author: (fields["Author"] as Partner) ?? "איתי",
    date: (fields["Date"] as string) ?? record._rawJson.createdTime,
  };
}

export interface TaskFieldsInput {
  title?: string;
  status?: TaskStatus;
  priority?: Priority | null;
  dueDate?: string | null;
  linkedLeadName?: string | null;
  linkedLeadId?: string | null;
  linkedClientName?: string | null;
  linkedClientId?: string | null;
}

function buildTaskFields(input: TaskFieldsInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (input.title !== undefined) fields["Title"] = input.title;
  if (input.status !== undefined) fields["Status"] = input.status;
  if (input.priority !== undefined) fields["Priority"] = input.priority;
  if (input.dueDate !== undefined) fields["Due Date"] = input.dueDate;
  if (input.linkedLeadName !== undefined) fields["Linked Lead Name"] = input.linkedLeadName;
  if (input.linkedLeadId !== undefined) fields["Linked Lead ID"] = input.linkedLeadId;
  if (input.linkedClientName !== undefined) fields["Linked Client Name"] = input.linkedClientName;
  if (input.linkedClientId !== undefined) fields["Linked Client ID"] = input.linkedClientId;
  return fields;
}

export function parseTaskFieldsInput(body: unknown): TaskFieldsInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Invalid request body" };
  const data = body as Record<string, unknown>;
  const fields: TaskFieldsInput = {};

  if ("title" in data) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      return { error: "Invalid title" };
    }
    fields.title = data.title.trim();
  }

  if ("status" in data) {
    if (!(TASK_STATUSES as readonly string[]).includes(data.status as string)) {
      return { error: "Invalid status" };
    }
    fields.status = data.status as TaskStatus;
  }

  if ("priority" in data) {
    if (data.priority !== null && !(PRIORITIES as readonly string[]).includes(data.priority as string)) {
      return { error: "Invalid priority" };
    }
    fields.priority = data.priority as Priority | null;
  }

  if ("dueDate" in data) {
    if (data.dueDate !== null && typeof data.dueDate !== "string") {
      return { error: "Invalid dueDate" };
    }
    fields.dueDate = data.dueDate as string | null;
  }

  for (const key of [
    "linkedLeadName",
    "linkedLeadId",
    "linkedClientName",
    "linkedClientId",
  ] as const) {
    if (key in data) {
      const value = data[key];
      if (value !== null && typeof value !== "string") {
        return { error: `Invalid ${key}` };
      }
      fields[key] = value as string | null;
    }
  }

  return fields;
}

export async function listTasks(): Promise<TaskRecord[]> {
  const [taskRecords, commentRecords] = await Promise.all([
    base(TASKS_TABLE).select().all(),
    base(TASK_COMMENTS_TABLE).select({ fields: ["Task ID"] }).all(),
  ]);

  const commentCounts = new Map<string, number>();
  for (const comment of commentRecords) {
    const taskId = comment.fields["Task ID"] as string;
    if (!taskId) continue;
    commentCounts.set(taskId, (commentCounts.get(taskId) ?? 0) + 1);
  }

  return taskRecords.map((record) => mapTaskRecord(record, commentCounts.get(record.id) ?? 0));
}

export async function getTaskOwner(recordId: string): Promise<Partner | null> {
  const record = await base(TASKS_TABLE).find(recordId);
  return (record.fields["Owner"] as Partner) ?? null;
}

export async function createTask(
  input: TaskFieldsInput & { owner: Partner }
): Promise<TaskRecord> {
  const fields = buildTaskFields(input);
  fields["Owner"] = input.owner;
  if (fields["Status"] === undefined) fields["Status"] = "To Do";

  const record = await base(TASKS_TABLE).create(fields as Partial<Airtable.FieldSet>);
  return mapTaskRecord(record, 0);
}

export async function updateTask(
  recordId: string,
  input: TaskFieldsInput
): Promise<TaskRecord> {
  const fields = buildTaskFields(input);
  const record = await base(TASKS_TABLE).update(recordId, fields as Partial<Airtable.FieldSet>);
  return mapTaskRecord(record);
}

export async function deleteTask(recordId: string): Promise<void> {
  await base(TASKS_TABLE).destroy(recordId);
}

export async function listTaskComments(taskId: string): Promise<TaskCommentRecord[]> {
  const records = await base(TASK_COMMENTS_TABLE)
    .select({
      filterByFormula: `{Task ID} = "${escapeFormulaValue(taskId)}"`,
      sort: [{ field: "Date", direction: "asc" }],
    })
    .all();
  return records.map(mapTaskCommentRecord);
}

export async function createTaskComment(data: {
  taskId: string;
  comment: string;
  author: Partner;
}): Promise<TaskCommentRecord> {
  const record = await base(TASK_COMMENTS_TABLE).create({
    "Task ID": data.taskId,
    Comment: data.comment,
    Author: data.author,
    Date: new Date().toISOString(),
  });
  return mapTaskCommentRecord(record);
}

function mapRoadmapRecord(record: Airtable.Record<Airtable.FieldSet>): RoadmapRecord {
  const fields = record.fields;
  const linkedTasks = fields["Roadmap Tasks"] as string[] | undefined;

  return {
    id: record.id,
    title: (fields["Title"] as string) ?? "",
    description: (fields["Description"] as string) ?? null,
    status: (fields["Status"] as string) ?? null,
    owner: (fields["Owner"] as RoadmapOwner) ?? null,
    category: (fields["Category"] as string) ?? null,
    startDate: (fields["Start Date"] as string) ?? null,
    endDate: (fields["End Date"] as string) ?? null,
    color: (fields["Color"] as RoadmapColor) ?? null,
    taskIds: linkedTasks ?? [],
    createdTime: record._rawJson.createdTime,
  };
}

function mapRoadmapTaskRecord(record: Airtable.Record<Airtable.FieldSet>): RoadmapTaskRecord {
  const fields = record.fields;
  const milestone = fields["Milestone"] as string[] | undefined;
  const parentTask = fields["Parent Task"] as string[] | undefined;
  const subtasks = fields["From field: Parent Task"] as string[] | undefined;

  return {
    id: record.id,
    title: (fields["Title"] as string) ?? "",
    status: (fields["Status"] as TaskStatus) ?? "To Do",
    category: (fields["Category"] as string) ?? null,
    dueDate: (fields["Due Date"] as string) ?? null,
    assignedTo: (fields["Assigned To"] as RoadmapTaskAssignee) ?? null,
    notes: (fields["Notes"] as string) ?? null,
    milestoneIds: milestone ?? [],
    parentId: parentTask?.[0] ?? null,
    subtaskIds: subtasks ?? [],
  };
}

export interface RoadmapFieldsInput {
  title?: string;
  description?: string | null;
  status?: string | null;
  owner?: RoadmapOwner | null;
  category?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  color?: RoadmapColor | null;
}

const ROADMAP_STATUS_CHOICES = [
  "Not Started",
  "In Progress",
  "Done",
  "לא התחיל",
  "בתהליך",
  "הושלם",
];

const ROADMAP_CATEGORY_CHOICES = [
  "Infrastructure",
  "Ongoing Operations",
  "מכירות",
  "תפעול",
  "שיווק",
  "מוצר",
];

function buildRoadmapFields(input: RoadmapFieldsInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (input.title !== undefined) fields["Title"] = input.title;
  if (input.description !== undefined) fields["Description"] = input.description;
  if (input.status !== undefined) fields["Status"] = input.status;
  if (input.owner !== undefined) fields["Owner"] = input.owner;
  if (input.category !== undefined) fields["Category"] = input.category;
  if (input.startDate !== undefined) fields["Start Date"] = input.startDate;
  if (input.endDate !== undefined) fields["End Date"] = input.endDate;
  if (input.color !== undefined) fields["Color"] = input.color;
  return fields;
}

export function parseRoadmapFieldsInput(body: unknown): RoadmapFieldsInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Invalid request body" };
  const data = body as Record<string, unknown>;
  const fields: RoadmapFieldsInput = {};

  if ("title" in data) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      return { error: "Invalid title" };
    }
    fields.title = data.title.trim();
  }

  if ("description" in data) {
    if (data.description !== null && typeof data.description !== "string") {
      return { error: "Invalid description" };
    }
    fields.description = data.description as string | null;
  }

  if ("status" in data) {
    if (data.status !== null && !ROADMAP_STATUS_CHOICES.includes(data.status as string)) {
      return { error: "Invalid status" };
    }
    fields.status = data.status as string | null;
  }

  if ("owner" in data) {
    if (data.owner !== null && !(ROADMAP_OWNERS as readonly string[]).includes(data.owner as string)) {
      return { error: "Invalid owner" };
    }
    fields.owner = data.owner as RoadmapOwner | null;
  }

  if ("category" in data) {
    if (data.category !== null && !ROADMAP_CATEGORY_CHOICES.includes(data.category as string)) {
      return { error: "Invalid category" };
    }
    fields.category = data.category as string | null;
  }

  if ("startDate" in data) {
    if (data.startDate !== null && typeof data.startDate !== "string") {
      return { error: "Invalid startDate" };
    }
    fields.startDate = data.startDate as string | null;
  }

  if ("endDate" in data) {
    if (data.endDate !== null && typeof data.endDate !== "string") {
      return { error: "Invalid endDate" };
    }
    fields.endDate = data.endDate as string | null;
  }

  if ("color" in data) {
    if (data.color !== null && !(ROADMAP_COLORS as readonly string[]).includes(data.color as string)) {
      return { error: "Invalid color" };
    }
    fields.color = data.color as RoadmapColor | null;
  }

  return fields;
}

export async function listRoadmapItems(): Promise<RoadmapRecord[]> {
  const records = await base(ROADMAP_TABLE)
    .select({ sort: [{ field: "Start Date", direction: "asc" }] })
    .all();
  return records.map(mapRoadmapRecord);
}

export async function createRoadmapItem(input: RoadmapFieldsInput): Promise<RoadmapRecord> {
  const fields = buildRoadmapFields(input);
  if (fields["Status"] === undefined) fields["Status"] = "Not Started";

  const record = await base(ROADMAP_TABLE).create(fields as Partial<Airtable.FieldSet>);
  return mapRoadmapRecord(record);
}

export async function updateRoadmapItem(
  recordId: string,
  input: RoadmapFieldsInput
): Promise<RoadmapRecord> {
  const fields = buildRoadmapFields(input);
  const record = await base(ROADMAP_TABLE).update(recordId, fields as Partial<Airtable.FieldSet>);
  return mapRoadmapRecord(record);
}

export async function deleteRoadmapItem(recordId: string): Promise<void> {
  await base(ROADMAP_TABLE).destroy(recordId);
}

export interface RoadmapTaskFieldsInput {
  status?: TaskStatus;
  dueDate?: string | null;
  assignedTo?: RoadmapTaskAssignee | null;
  notes?: string | null;
}

function buildRoadmapTaskFields(input: RoadmapTaskFieldsInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (input.status !== undefined) fields["Status"] = input.status;
  if (input.dueDate !== undefined) fields["Due Date"] = input.dueDate;
  if (input.assignedTo !== undefined) fields["Assigned To"] = input.assignedTo;
  if (input.notes !== undefined) fields["Notes"] = input.notes;
  return fields;
}

export function parseRoadmapTaskFieldsInput(
  body: unknown
): RoadmapTaskFieldsInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Invalid request body" };
  const data = body as Record<string, unknown>;
  const fields: RoadmapTaskFieldsInput = {};

  if ("status" in data) {
    if (!(TASK_STATUSES as readonly string[]).includes(data.status as string)) {
      return { error: "Invalid status" };
    }
    fields.status = data.status as TaskStatus;
  }

  if ("dueDate" in data) {
    if (data.dueDate !== null && typeof data.dueDate !== "string") {
      return { error: "Invalid dueDate" };
    }
    fields.dueDate = data.dueDate as string | null;
  }

  if ("assignedTo" in data) {
    if (
      data.assignedTo !== null &&
      !(ROADMAP_TASK_ASSIGNEES as readonly string[]).includes(data.assignedTo as string)
    ) {
      return { error: "Invalid assignedTo" };
    }
    fields.assignedTo = data.assignedTo as RoadmapTaskAssignee | null;
  }

  if ("notes" in data) {
    if (data.notes !== null && typeof data.notes !== "string") {
      return { error: "Invalid notes" };
    }
    fields.notes = data.notes as string | null;
  }

  return fields;
}

export async function listRoadmapTasks(): Promise<RoadmapTaskRecord[]> {
  const records = await base(ROADMAP_TASKS_TABLE).select().all();
  return records.map(mapRoadmapTaskRecord);
}

export async function updateRoadmapTask(
  recordId: string,
  input: RoadmapTaskFieldsInput
): Promise<RoadmapTaskRecord> {
  const fields = buildRoadmapTaskFields(input);
  const record = await base(ROADMAP_TASKS_TABLE).update(
    recordId,
    fields as Partial<Airtable.FieldSet>
  );
  return mapRoadmapTaskRecord(record);
}

export interface RoadmapTaskCreateInput {
  title: string;
  parentId: string;
}

export function parseRoadmapTaskCreateInput(
  body: unknown
): RoadmapTaskCreateInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Invalid request body" };
  const data = body as Record<string, unknown>;

  if (typeof data.title !== "string" || !data.title.trim()) {
    return { error: "Invalid title" };
  }

  if (typeof data.parentId !== "string" || !data.parentId.trim()) {
    return { error: "Invalid parentId" };
  }

  return { title: data.title.trim(), parentId: data.parentId };
}

export async function createRoadmapTask(input: RoadmapTaskCreateInput): Promise<RoadmapTaskRecord> {
  const record = await base(ROADMAP_TASKS_TABLE).create({
    Title: input.title,
    Status: "To Do",
    "Parent Task": [input.parentId],
  } as Partial<Airtable.FieldSet>);
  return mapRoadmapTaskRecord(record);
}

export async function getPartnerPasswordHash(partner: Partner): Promise<string | null> {
  const records = await base(PARTNERS_TABLE)
    .select({ filterByFormula: `{Name} = "${escapeFormulaValue(partner)}"`, maxRecords: 1 })
    .all();

  const record = records[0];
  if (!record) return null;

  const hash = record.fields["PasswordHash"] as string | undefined;
  return hash && hash.trim() ? hash : null;
}

export async function setPartnerPasswordHash(partner: Partner, hash: string): Promise<void> {
  const records = await base(PARTNERS_TABLE)
    .select({ filterByFormula: `{Name} = "${escapeFormulaValue(partner)}"`, maxRecords: 1 })
    .all();

  const record = records[0];
  if (record) {
    await base(PARTNERS_TABLE).update(record.id, { PasswordHash: hash });
    return;
  }

  await base(PARTNERS_TABLE).create({ Name: partner, PasswordHash: hash });
}

function mapNoteRecord(record: Airtable.Record<Airtable.FieldSet>): NoteRecord {
  const fields = record.fields;

  return {
    id: record.id,
    partner: (fields["Partner"] as Partner) ?? "איתי",
    content: (fields["Content"] as string) ?? "",
    updatedAt: (fields["Updated At"] as string) ?? record._rawJson.createdTime,
  };
}

// Note: this can reject if the Notes table/fields are missing or
// misconfigured in Airtable. Callers should not assume it resolves —
// use `getPartnerNoteSafe` below for call sites that must not crash.
export async function getPartnerNote(partner: Partner): Promise<NoteRecord | null> {
  const records = await base(NOTES_TABLE)
    .select({ filterByFormula: `{Partner} = "${escapeFormulaValue(partner)}"`, maxRecords: 1 })
    .all();

  const record = records[0];
  return record ? mapNoteRecord(record) : null;
}

// Defensive wrapper around getPartnerNote: a Notes-table schema problem
// (missing table/fields) must not crash the whole dashboard page. Resolves
// to null instead of rejecting, logging the error for visibility.
export async function getPartnerNoteSafe(partner: Partner): Promise<NoteRecord | null> {
  try {
    return await getPartnerNote(partner);
  } catch (err) {
    console.error("getPartnerNoteSafe: failed to load note", err);
    return null;
  }
}

export async function getPartnerSettings(partner: Partner): Promise<PartnerSettings> {
  const records = await base(PARTNERS_TABLE)
    .select({ filterByFormula: `{Name} = "${escapeFormulaValue(partner)}"`, maxRecords: 1 })
    .all();

  const record = records[0];
  if (!record) {
    return {
      googleConnected: false,
      googleEmail: null,
      makeWebhookUrl: null,
      makeApiKey: null,
      scrapeDefaultCity: null,
      scrapeDefaultNiche: null,
      scrapeDefaultLimit: null,
    };
  }

  const fields = record.fields;
  const accessToken = (fields["Google Access Token"] as string | undefined)?.trim();

  return {
    googleConnected: !!accessToken,
    googleEmail: (fields["Google Email"] as string) ?? null,
    makeWebhookUrl: (fields["Make Webhook URL"] as string) ?? null,
    makeApiKey: (fields["Make API Key"] as string) ?? null,
    scrapeDefaultCity: (fields["Scrape Default City"] as string) ?? null,
    scrapeDefaultNiche: (fields["Scrape Default Niche"] as string) ?? null,
    scrapeDefaultLimit: (fields["Scrape Default Limit"] as number) ?? null,
  };
}

export interface PartnerSettingsUpdate {
  googleAccessToken?: string | null;
  googleRefreshToken?: string | null;
  googleTokenExpiry?: string | null;
  googleEmail?: string | null;
  makeWebhookUrl?: string | null;
  makeApiKey?: string | null;
  scrapeDefaultCity?: string | null;
  scrapeDefaultNiche?: string | null;
  scrapeDefaultLimit?: number | null;
}

export async function updatePartnerSettings(
  partner: Partner,
  updates: PartnerSettingsUpdate
): Promise<void> {
  const fields: Record<string, unknown> = {};
  if ("googleAccessToken" in updates) fields["Google Access Token"] = updates.googleAccessToken ?? "";
  if ("googleRefreshToken" in updates) fields["Google Refresh Token"] = updates.googleRefreshToken ?? "";
  if ("googleTokenExpiry" in updates) fields["Google Token Expiry"] = updates.googleTokenExpiry ?? null;
  if ("googleEmail" in updates) fields["Google Email"] = updates.googleEmail ?? "";
  if ("makeWebhookUrl" in updates) fields["Make Webhook URL"] = updates.makeWebhookUrl ?? "";
  if ("makeApiKey" in updates) fields["Make API Key"] = updates.makeApiKey ?? "";
  if ("scrapeDefaultCity" in updates) fields["Scrape Default City"] = updates.scrapeDefaultCity ?? "";
  if ("scrapeDefaultNiche" in updates) fields["Scrape Default Niche"] = updates.scrapeDefaultNiche ?? "";
  if ("scrapeDefaultLimit" in updates) fields["Scrape Default Limit"] = updates.scrapeDefaultLimit ?? null;

  const records = await base(PARTNERS_TABLE)
    .select({ filterByFormula: `{Name} = "${escapeFormulaValue(partner)}"`, maxRecords: 1 })
    .all();

  const record = records[0];
  if (record) {
    await base(PARTNERS_TABLE).update(record.id, fields as Partial<Airtable.FieldSet>);
  } else {
    await base(PARTNERS_TABLE).create({ Name: partner, ...fields } as Partial<Airtable.FieldSet>);
  }
}

export async function getPartnerGoogleTokens(
  partner: Partner
): Promise<{ accessToken: string; refreshToken: string; expiry: string | null } | null> {
  const records = await base(PARTNERS_TABLE)
    .select({ filterByFormula: `{Name} = "${escapeFormulaValue(partner)}"`, maxRecords: 1 })
    .all();

  const record = records[0];
  if (!record) return null;

  const accessToken = (record.fields["Google Access Token"] as string | undefined)?.trim();
  const refreshToken = (record.fields["Google Refresh Token"] as string | undefined)?.trim();
  if (!accessToken || !refreshToken) return null;

  return {
    accessToken,
    refreshToken,
    expiry: (record.fields["Google Token Expiry"] as string) ?? null,
  };
}

export async function upsertPartnerNote(partner: Partner, content: string): Promise<NoteRecord> {
  const records = await base(NOTES_TABLE)
    .select({ filterByFormula: `{Partner} = "${escapeFormulaValue(partner)}"`, maxRecords: 1 })
    .all();

  const updatedAt = new Date().toISOString();
  const record = records[0];

  if (record) {
    const updated = await base(NOTES_TABLE).update(record.id, {
      Content: content,
      "Updated At": updatedAt,
    });
    return mapNoteRecord(updated);
  }

  const created = await base(NOTES_TABLE).create({
    Partner: partner,
    Content: content,
    "Updated At": updatedAt,
  });
  return mapNoteRecord(created);
}
