# Spec: Lead Pipeline Bug Fixes + Kanban Drag-and-Drop + Dashboard Improvements

Branch: `feature/lead-pipeline-kanban-dashboard`

## Context / Files Read

- `app/page.tsx`, `app/leads/page.tsx`
- `components/KanbanBoard.tsx`, `components/KanbanColumn.tsx`, `components/LeadCard.tsx`
- `components/StatusActionButtons.tsx`, `components/StatusToggle.tsx`
- `components/LeadDrawer.tsx`
- `components/ScrapeForm.tsx`, `components/ScrapeHistory.tsx`
- `app/api/scrape/start/route.ts`, `app/api/scrape/status/route.ts`, `app/api/scrape/complete/route.ts`, `app/api/scrape/lead-count/route.ts`
- `app/api/leads/[id]/route.ts`, `app/api/leads/[id]/convert/route.ts`
- `lib/airtable.ts`, `lib/types.ts`, `lib/priority.ts`, `lib/filters.ts`, `lib/auth.ts`
- `components/dashboard/RightPanel.tsx`, `RecentContactsCard.tsx`, `OpenTasksCard.tsx`, `SalesPerformanceCard.tsx`, `TopHeader.tsx`

---

## 1. Lead Pipeline Bug Fixes

### BUG 1 (HIGH — primary suspect for "something is broken"): Kanban board doesn't reflect status changes without a full page reload

**File:** `components/KanbanBoard.tsx`

`KanbanBoard` is a client component that receives `leads` (server-fetched) as `initialLeads` and does:

```tsx
const [leads, setLeads] = useState(initialLeads);
```

`useState(initialLeads)` only seeds state on first mount — it does **not** re-sync when the parent re-renders with new `leads` after `router.refresh()`.

`StatusActionButtons` (used inside `LeadCard`, e.g. "סומן כ'נוצר קשר'", "לא מעוניין", "נשלחה הצעה") updates Airtable via `PATCH /api/leads/[id]` and then calls `router.refresh()`. The server re-fetches `listLeads()` and passes a fresh `leads` array into `<KanbanBoard leads={leads} ... />`, but `KanbanBoard`'s internal `leads` state **stays the old array** — so the card the user just updated does not move to its new column. The Kanban board visually looks "broken"/stuck until a hard browser refresh.

(By contrast, edits made through `LeadDrawer` *do* show up immediately, because `LeadDrawer` calls `onUpdate()` → `KanbanBoard.handleUpdate()`, which mutates the local `leads` state directly — `router.refresh()` there is redundant but harmless.)

**Fix:**
- Add a `useEffect` in `KanbanBoard` that re-syncs local `leads` state whenever the `initialLeads` prop changes (e.g. `useEffect(() => setLeads(initialLeads), [initialLeads])`), OR
- Make `StatusActionButtons`' status update go through the same `onUpdate`/local-state-mutation path as `LeadDrawer` instead of relying on `router.refresh()`.

Given this same local-state-sync mechanism is required for the new drag-and-drop feature (section 2), the chosen fix should be: **`StatusActionButtons` accepts an optional `onStatusChange` callback that the card/board can use to update local state immediately (optimistic update), and `KanbanBoard` also re-syncs from `initialLeads` via `useEffect` as a safety net for cross-tab/cross-component changes.** This guarantees the board reflects status changes from cards, drag-and-drop, and the drawer consistently.

### BUG 2 (HIGH — silent failure, no feedback): "המר ללקוח" (convert-to-client) can fail silently

**Files:** `components/LeadDrawer.tsx` (`handleConvertConfirm`), `app/api/leads/[id]/convert/route.ts`, `lib/airtable.ts` (`convertLeadToClient`)

- `convertLeadToClient` writes `Status: "Converted"` directly to the Lead Tracker "Status" field via `base(LEAD_TRACKER_TABLE).update(leadId, { Status: "Converted" })`. `"Converted"` is part of the `LeadStatus` union in `lib/types.ts` but is **not** part of `KANBAN_STATUSES` (`New Lead`, `Contacted`, `Pitch Sent`, `Not Interested`) — the set of values normally written to this field by `updateLeadStatus`. If the Airtable "Status" single-select field does not have a `"Converted"` option configured, Airtable's API rejects the update (422 `INVALID_VALUE_FOR_COLUMN` / similar) and the whole `convertLeadToClient` call throws.
- The API route's catch-all returns `Response.json({ error: "Failed to convert lead" }, { status: 500 })` — but `LeadDrawer.handleConvertConfirm` does:
  ```tsx
  if (!res.ok) return;
  ```
  It silently returns. No toast, no error state. From the user's point of view, clicking "אשר" in the convert modal **does nothing visible** — the modal doesn't close, no success/fail message appears, and `setConvertSaving` resets in the `finally` block so the button just stops spinning.

**Fix:**
1. In `convertLeadToClient` (`lib/airtable.ts`), don't assume `"Converted"` is a valid Status select option. Verify/ensure the Lead Tracker "Status" field includes `"Converted"` as a select choice (this is an Airtable schema concern — document it), AND make the function resilient: if updating the Lead Tracker status fails, the client record should still have been created (current order: client created first, then lead updated — keep this order, but catch/log the second failure separately so a partial success doesn't look like a total failure).
2. In `app/api/leads/[id]/convert/route.ts`, return a more specific error message in the JSON body (e.g. `{ error: "Failed to update lead status in Airtable", clientCreated: true/false }`) so the UI can react appropriately.
3. In `LeadDrawer.handleConvertConfirm`, replace the silent `if (!res.ok) return;` with proper error handling: show an error toast (reuse the existing `showToast` mechanism with a new "error" toast variant, e.g. red background) so the user gets feedback like "שגיאה בהמרת הליד ללקוח, נסה שוב" instead of nothing happening.

### BUG 3 (MEDIUM — scrape polling can hang forever with no error shown)

**Files:** `components/ScrapeForm.tsx`, `app/api/scrape/status/route.ts`

- `ScrapeForm`'s polling `setInterval` calls `GET /api/scrape/status?runId=...` every 5s. If that endpoint returns a non-OK response (e.g. 500/502 because `APIFY_API_TOKEN` is missing/invalid, or the Apify run id is bad, or a transient network error), the code does:
  ```tsx
  if (!statusRes.ok) return;
  ```
  ...and **keeps polling indefinitely**. There is no maximum retry count, no overall timeout, and no error surfaced to the user. The UI stays on "הסריקה פועלת... (עשויה לקחת 1-3 דקות)" forever — `status` never transitions to `"failed"`, so the user can't even click "נסה שוב" because that button only appears in the `failed` state.
- Separately, the 10-second `setTimeout` after `SUCCEEDED` (waiting for the Airtable sync from the external scraping automation to land) has no fallback if `fetchLeadCountDiff`/`PATCH /api/scrape/complete` itself fails for a reason other than a thrown exception (e.g., returns non-OK but doesn't throw) — actually this *is* wrapped in try/catch so it does set `"failed"`. That part is OK.

**Fix:**
1. Track consecutive failed/non-OK status polls and/or overall elapsed time in `ScrapeForm`. After a reasonable threshold (e.g. 5 consecutive failed polls, or ~3 minutes total elapsed), stop polling, set `status` to `"failed"`, and surface a specific error message (e.g. "לא ניתן היה לבדוק את סטטוס הסריקה. ייתכן שהסריקה עדיין רצה ברקע ב-Apify.").
2. Add a top-level safety timeout (e.g. 5 minutes) that stops polling and marks the run as failed regardless, so the UI never gets stuck indefinitely.
3. When marking failed due to a polling/timeout issue (not an explicit Apify `FAILED`/`ABORTED`/`TIMED-OUT`), still call `PATCH /api/scrape/complete` with `{ historyRecordId, failed: true }` so `ScrapeHistory` reflects the failure (currently this path already does this for explicit Apify failures — extend the same call for the new timeout/error paths).

### BUG 4 (LOW — type/field naming inconsistency, latent risk)

**File:** `lib/types.ts`, `lib/airtable.ts`

- `LeadStatus` includes `"New"` and `"Qualified"`, which are referenced in `StatusActionButtons.tsx`'s condition (`currentStatus === "New" || currentStatus === "Qualified"`) but are **never written anywhere** in `lib/airtable.ts` (only `"New Lead"`, `"Contacted"`, `"Pitch Sent"`, `"Not Interested"`, `null`, and `"Converted"` are ever set). This is dead/defensive code that suggests a prior schema migration left stale status values in the type system. Not actively breaking anything today, but worth a comment or cleanup so future maintainers aren't confused about which statuses are "live". **No functional change required**, but the coder should add a short code comment in `lib/types.ts` near `LeadStatus` noting `"New"`/`"Qualified"` are legacy/unused values kept for backward compatibility with old records, to avoid future bugs when someone "cleans up" `StatusActionButtons` and breaks handling of legacy records.

---

## 2. Movable Lead Cards (Drag-and-Drop Kanban)

### Approach

Use **native HTML5 Drag and Drop API** (`draggable`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`) for desktop, plus a **pointer-events-based fallback/enhancement for touch** — because HTML5 DnD has poor mobile/touch support. Given this project has **zero existing drag-and-drop dependencies** (checked `package.json` — only `airtable`, `bcryptjs`, `lucide-react`, `next`, `react`, `react-dom`, `server-only`), and adding a new dependency increases scope/risk for this pipeline run, the default decision is:

> **Implement drag-and-drop with native Pointer Events (`onPointerDown`/`onPointerMove`/`onPointerUp`) rather than the HTML5 DnD API or a new library.** Pointer Events unify mouse, touch, and pen input in a single API, work well in React without extra deps, and avoid HTML5 DnD's notoriously bad mobile support and drag-image quirks. This keeps the change self-contained to `components/KanbanBoard.tsx`, `components/KanbanColumn.tsx`, and `components/LeadCard.tsx`.

### Behavior

1. **`components/LeadCard.tsx`**:
   - Add pointer-event handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) to make the card draggable.
   - Use a small drag threshold (e.g. 6-8px movement) before initiating a drag, so normal taps/clicks (which open `LeadDrawer` via `onSelect`) still work — i.e., a quick tap opens the drawer; a press-and-move initiates a drag.
   - While dragging: apply a visual "lifted" style (e.g. reduced opacity, shadow, slight scale via a CSS class) and follow the pointer (using `position: fixed` + transform, or a drag-preview element) so the card visibly tracks the cursor/finger.
   - On drop: determine the target column under the pointer (via `document.elementFromPoint` + a `data-column-status` attribute on each column's drop zone) and notify `KanbanBoard` of `{ leadId, newStatus }`.
   - Add `touch-action: none` (or similar) on the draggable handle to prevent the browser's native scroll/zoom gestures from competing with the drag on touch devices.
   - Preserve existing keyboard/click accessibility (`role="button"`, `tabIndex`, `onKeyDown` for Enter/Space to open the drawer) — drag-and-drop is an *additional* interaction, not a replacement. Add `aria-grabbed`/`aria-roledescription="draggable"` or similar for screen-reader users, and keep `StatusActionButtons` as the accessible/non-pointer alternative for moving cards between statuses.

2. **`components/KanbanColumn.tsx`**:
   - Mark the column's lead-list container as a drop zone: add a `data-column-status={status}` attribute (use the `KanbanStatus` value, or a special marker for the "אחר"/Other column which should likely **not** be a valid drop target since it doesn't map to a single `KanbanStatus` — dragging onto "אחר" should be a no-op/rejected drop).
   - Add a visual "drop target highlight" state (e.g. border/background change) while a card is being dragged over the column. This requires the column to know whether a drag is currently in progress and whether it's the active hover target — pass this down from `KanbanBoard` (which owns the drag state) via props, e.g. `isDropTarget: boolean`.

3. **`components/KanbanBoard.tsx`**:
   - Own the drag state: `draggedLeadId: string | null`, `dropTargetStatus: KanbanStatus | null` (or similar).
   - On successful drop onto a valid `KanbanStatus` column (different from the card's current status):
     - Optimistically update local `leads` state immediately (move the card to the new column) for instant visual feedback.
     - Call the **same status-update logic used by `StatusActionButtons`**: `PATCH /api/leads/[id]` with `{ status: newStatus }`. Extract this into a small shared helper (e.g. `lib/api-client.ts` or a hook `useUpdateLeadStatus`) so both `StatusActionButtons` and the new drag-and-drop code call the same function — avoiding duplicated fetch logic and ensuring the "Contacted" special-casing (Last Contacted timestamp + Follow-up Count increment, handled server-side in `updateLeadStatus` in `lib/airtable.ts`) is respected uniformly.
     - On API failure, roll back the optimistic update (move the card back to its original column) and surface an error (e.g. a small toast or inline message near the board — reuse/extend the toast pattern from `LeadDrawer` if convenient, or a simple local error banner).
   - Dropping onto the "אחר" (Other) pseudo-column, or dropping back onto the same column the card came from, should be a no-op (card snaps back, no API call).
   - Dropping a card whose current `status` is `"Converted"` should not be possible since converted leads are already filtered out of the board (`filteredLeads.filter((lead) => lead.status !== "Converted")`), so no special-casing needed there.

### Shared status-update logic

Create a small shared utility (suggested location: `lib/leads-client.ts`, a `"use client"`-safe module with no `server-only` import) exporting something like:

```ts
export async function updateLeadStatusClient(leadId: string, status: KanbanStatus): Promise<boolean> {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.ok;
}
```

Refactor `StatusActionButtons.tsx` to use this helper, and have the new drag-and-drop drop handler in `KanbanBoard.tsx` use it too. This satisfies the requirement to "reuse/extend the existing status-update logic."

### Desktop + touch support

- Pointer Events natively unify mouse and touch (and pen) input, so the same handlers cover both. Test on:
  - Desktop: mouse drag from one column to another.
  - Touch/mobile: the horizontally-scrollable column row (`kanban-scroll` on small screens, per `KanbanBoard.tsx`'s existing responsive classes) must still allow horizontal scroll when *not* dragging a card, but allow card drag once the drag threshold is exceeded. Use `touch-action: pan-x` on the column container and `touch-action: none` on an actively-dragged card to avoid the scroll/drag gesture conflict.

---

## 3. Dashboard Improvements

### 3a. Show only the 5 most urgent leads on the main dashboard

**File:** `app/page.tsx`, `components/KanbanBoard.tsx` (or a new dedicated component)

Currently `app/page.tsx` renders the full `KanbanBoard` (all non-converted leads, across all 5 columns) on the main dashboard — described by the user as "a big mess." The spec calls for showing only the **5 most urgent leads**, ranked via `lib/priority.ts`'s `computePriority()` (same logic already used for the "רשימת שיחות להיום" call list on `/leads`).

**Decision (default, no open question):** Replace the full `KanbanBoard` on the main dashboard (`app/page.tsx`) with a new compact component, **`components/dashboard/UrgentLeadsCard.tsx`** (or similar name), that:
- Takes the full `leads` array (excluding `status === "Converted"`).
- Maps each lead through `computePriority(lead)` to get `{ score, level }`.
- Sorts descending by `score`.
- Takes the top 5.
- Renders each as a compact card/row (reuse `LeadCard` if it fits visually in a vertical list, or a new simpler row component) with at least: business name, priority badge (`PriorityBadge`), city/rating, and quick actions (`StatusActionButtons` so users can act directly from the dashboard).
- Clicking a lead opens `LeadDrawer` (the dashboard page already has the infrastructure for this via `KanbanBoard`'s drawer — either lift `LeadDrawer` + selection state into a shared place, or keep a minimal local version in the new component).
- The full drag-and-drop Kanban board (section 2) remains on `/leads` (`app/leads/page.tsx`, "kanban" tab) — the *main* dashboard (`app/page.tsx`) gets the new "5 most urgent leads" summary instead of the full board. This declutters the dashboard per the user's "big mess" complaint while keeping full Kanban management on the dedicated Leads page.

**Layout:** Place `UrgentLeadsCard` in the main content area of `app/page.tsx` (where `KanbanBoard` currently is), and keep `RightPanel` (Sales Performance / Recent Contacts / Open Tasks) as-is in the sidebar. The new Notes panel (3b) goes in the main content area alongside/below `UrgentLeadsCard`.

### 3b. Notes panel inside the main dashboard

**Files:** `app/page.tsx`, new component `components/dashboard/NotesPanel.tsx`, `lib/airtable.ts`, `lib/types.ts`, new API route `app/api/notes/route.ts`

**Persistence approach (default decision):** Add a new **`Notes` table** to the Airtable base, scoped **per partner** (simplest model that fits the existing schema — the app already has a `Partners` table and a `Partner` type (`"איתי" | "עמרי"`) used throughout, e.g. `TaskRecord.owner`, `getPartnerPasswordHash`). Rationale for per-partner-scoped free text over per-lead notes:
- Per-lead notes already exist (`LeadRecord.notes`, editable in `LeadDrawer`) — duplicating that would be confusing.
- The dashboard notes panel is described as "a place for free-text notes, visible without leaving the dashboard" — this reads as a general scratchpad/sticky-note feature for the logged-in partner, not lead-specific.
- A single `Notes` table with one row per partner (or a free-form list of note entries per partner) is simple, requires minimal new Airtable schema, and fits the existing per-partner auth model (`getCurrentPartner()` is already available in `app/page.tsx`).

**Airtable schema addition** (document for whoever provisions the base — the coder should add a constant and mapping function but the actual table/field creation in Airtable is an infra step outside the codebase):
- New table: `Notes`
- Fields: `Partner` (single line text or single select matching `"איתי" | "עמרי"`), `Content` (long text), `Updated At` (date/time, auto or set on write).
- Simplest model: **one record per partner** (upsert pattern — find-or-create), holding a single free-text blob. This avoids needing a list UI with add/delete/reorder for v1, keeping it "simple" per the spec's instruction.

**`lib/types.ts` addition:**
```ts
export interface NoteRecord {
  id: string;
  partner: Partner;
  content: string;
  updatedAt: string;
}
```

**`lib/airtable.ts` additions:**
- `export const NOTES_TABLE = "Notes";`
- `mapNoteRecord(record): NoteRecord`
- `getPartnerNote(partner: Partner): Promise<NoteRecord | null>` — `select({ filterByFormula: \`{Partner} = "${escapeFormulaValue(partner)}"\`, maxRecords: 1 })`
- `upsertPartnerNote(partner: Partner, content: string): Promise<NoteRecord>` — find existing record for partner; `update` if found, `create` if not (mirrors the existing `setPartnerPasswordHash` find-or-create pattern in the same file).

**New API route `app/api/notes/route.ts`:**
- `GET` — returns the current partner's note (`getPartnerFromSession` for auth, like other routes). Returns `{ content: string, updatedAt: string | null }` (empty/`null` content if no record yet).
- `PATCH` (or `PUT`) — body `{ content: string }`, calls `upsertPartnerNote(partner, content)`, returns `{ ok: true, updatedAt }`.

**`components/dashboard/NotesPanel.tsx`** (client component):
- Receives initial `content`/`updatedAt` as props from `app/page.tsx` (server-fetched via a new `getPartnerNote(partner)` call alongside the existing `listLeads`/`listClients`/`listTasks`).
- A `<textarea>` (similar styling to `LeadDrawer`'s notes textarea) with autosave on blur (same debounce-free "save on blur" pattern as `LeadDrawer.handleNotesBlur`) — call `PATCH /api/notes`, show a small "נשמר" confirmation (reuse toast pattern or a simple inline "✓ נשמר" text that fades after ~2s).
- Placed in the main content column of `app/page.tsx`, e.g. below `UrgentLeadsCard`.

**`app/page.tsx` changes:**
- Fetch the partner's note alongside other data: `const [leads, clients, tasks, note] = await Promise.all([listLeads(), listClients(), listTasks(), getPartnerNote(partner)]);`
- Render `<UrgentLeadsCard leads={leads} partner={partner} />` and `<NotesPanel initialContent={note?.content ?? ""} />` in the main column, replacing the current `<KanbanBoard leads={leads} partner={partner} />`.

---

## 4. Testing Requirements (for tester stage)

The tester must cover:

### Calculations / priority & urgency sorting (`lib/priority.ts`)
- Unit tests for `computePriority()`:
  - Verify score components individually: rating thresholds (≥4.5 → +3, ≥4.0 → +2, ≥3.5 → +1, <3.5 or null → +0), status thresholds (`"New Lead"`/`null` → +3, `"Contacted"` → +2, `"Pitch Sent"` → +1, other → +0), follow-up count (0 → +2, 1 → +1, ≥2 → +0), recency (`createdTime` ≤7 days → +2, ≤14 days → +1, older → +0).
  - Verify `level` boundaries: score ≥7 → `"High"`, 4-6 → `"Medium"`, <4 → `"Low"`.
- Integration test for the **"5 most urgent leads"** logic in `app/page.tsx` / `UrgentLeadsCard`:
  - Given a list of leads with varying scores (including ties), verify the output is sorted descending by `computePriority(lead).score` and limited to exactly 5 items (or fewer if <5 non-converted leads exist).
  - Verify `status === "Converted"` leads are excluded from the ranking.

### Filters (`lib/filters.ts`, `FilterBar` + `KanbanBoard`)
- Existing `applyFilters` behavior must continue to work correctly after the `KanbanBoard` state-sync fix (Bug 1) and drag-and-drop changes — i.e., filtering by city/niche/status/search/minRating still produces correct column groupings, and a card moved via drag-and-drop respects the currently active filters (e.g., if a card no longer matches the active status filter after being moved, it should disappear from view, or filters should be considered when determining valid drop targets — tester should confirm the chosen behavior is consistent and not jarring).
- Test `getUniqueCities`/`getUniqueNiches` still produce correct deduplicated, sorted lists (no regression expected, but include as regression coverage since `KanbanBoard` is being modified).

### Live / interactive behaviors
- **Drag-and-drop status updates:**
  - Simulate a pointer-based drag of a `LeadCard` from one `KanbanColumn` to another (mouse-like pointer events) and verify: (a) the card visually moves to the target column immediately (optimistic update), (b) `PATCH /api/leads/[id]` is called with the correct `{ status }`, (c) on API failure, the card reverts to its original column and an error is shown.
  - Simulate touch-based drag (pointer events with `pointerType: "touch"`) achieving the same result.
  - Verify dropping on an invalid target (the "אחר"/Other column, or the same column) is a no-op — no API call, card stays in place.
  - Verify clicking/tapping a card (without dragging past the threshold) still opens `LeadDrawer`.
  - Verify the "Contacted" status transition still sets `lastContacted`/increments `followUpCount` when triggered via drag-and-drop (server-side logic in `updateLeadStatus`).
  - **Regression test for Bug 1**: after a status update via `StatusActionButtons` (or drag-and-drop), confirm the card appears in its new column without requiring a full page reload (i.e., `KanbanBoard`'s rendered state reflects the change immediately).
- **Notes persistence:**
  - Typing in `NotesPanel`, blurring the textarea, verify `PATCH /api/notes` is called with the entered content and a save confirmation is shown.
  - Verify `GET /api/notes` (or the server-rendered initial content in `app/page.tsx`) returns the previously saved content for the correct partner — i.e., notes are scoped per-partner and partner A's notes are not visible to/overwritten by partner B.
  - Verify unauthenticated requests to `/api/notes` return 401 (consistent with other API routes' `getPartnerFromSession` checks).
- **Scrape flow (`/scrape` tab on `/leads`):**
  - Test `ScrapeForm`'s polling loop: mock `/api/scrape/status` to return `RUNNING` a few times then `SUCCEEDED`, verify the 10s post-success flow calls `/api/scrape/lead-count` and `/api/scrape/complete` with the correct `leadsFound` diff, and `status` becomes `"succeeded"`.
  - Test the failure path: mock `/api/scrape/status` returning `FAILED`/`ABORTED`/`TIMED-OUT`, verify `status` becomes `"failed"` and `/api/scrape/complete` is called with `{ failed: true }`.
  - **New test for Bug 3 fix**: mock `/api/scrape/status` to repeatedly return a non-OK response (e.g. 500), verify polling eventually stops (within the configured retry/timeout threshold), `status` becomes `"failed"`, an error message is shown, and `/api/scrape/complete` is called with `{ failed: true }`.
- **Convert-to-client flow (`LeadDrawer`):**
  - Test the happy path: `POST /api/leads/[id]/convert` returns `ok: true`, verify lead status becomes `"Converted"`, a success toast appears, and the drawer closes after the delay.
  - **New test for Bug 2 fix**: mock `POST /api/leads/[id]/convert` returning a non-OK response, verify an error message/toast is shown to the user (not a silent no-op), `convertSaving` resets, and the modal remains open so the user can retry.

---

## OPEN QUESTIONS

NONE

All design decisions above (native Pointer Events for DnD instead of a new dependency; per-partner Notes table with one record per partner; replacing the full Kanban board with a top-5 urgent leads card on the main dashboard while keeping the full board on `/leads`; reusing `StatusActionButtons`' update logic via a new shared `lib/leads-client.ts` helper; toast-based error surfacing for convert/scrape failures) are documented as reasonable defaults the coder should follow. If the coder discovers during implementation that the Airtable "Status" field in Lead Tracker genuinely lacks a `"Converted"` option (confirming Bug 2's root cause), they should add the option via the Airtable API/UI if credentials allow, or fall back to a documented workaround (e.g. use a separate boolean/checkbox field `"Converted"` instead of overloading `Status`) — but default to assuming the option exists and focus the fix on error-surfacing, since schema changes are higher-risk than UI error handling.
