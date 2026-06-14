# Changes: Lead Pipeline Bug Fixes + Kanban Drag-and-Drop + Dashboard Improvements

Branch: `feature/lead-pipeline-kanban-dashboard`

No open questions — all spec defaults were followed as written. One Airtable
schema addition is required (see "Airtable schema addition" below) before the
Notes panel will persist data; until then `GET /api/notes` returns empty
content and `PATCH /api/notes` will fail (the route returns 500, the UI
silently skips the "נשמר" confirmation).

---

## Files changed

### Bug fixes

- **`lib/types.ts`**
  - Bug 4: Added a comment above `LeadStatus` explaining that `"New"` and
    `"Qualified"` are legacy/unused values kept for backward compatibility
    with old records, referenced defensively in `StatusActionButtons`.
  - Added `NoteRecord` type (`{ id, partner, content, updatedAt }`) for the
    new Notes feature (3b).

- **`lib/airtable.ts`**
  - Bug 2: `convertLeadToClient` now returns `ConvertLeadResult` (`{
    clientCreated, leadStatusUpdated }`) instead of `void`. The client record
    is still created first (order preserved); the subsequent Lead Tracker
    `Status: "Converted"` update is now wrapped in its own try/catch so a
    failure there (e.g. missing "Converted" option on the Status
    single-select) is logged and reported separately rather than throwing
    and masking the fact that the client *was* created.
  - Added Notes table support: `NOTES_TABLE = "Notes"` constant,
    `mapNoteRecord`, `getPartnerNote(partner)`, and
    `upsertPartnerNote(partner, content)` (find-or-create, mirrors the
    existing `setPartnerPasswordHash` pattern).

- **`app/api/leads/[id]/convert/route.ts`**
  - Bug 2: Now inspects the `ConvertLeadResult`. If `leadStatusUpdated` is
    `false`, returns `502` with `{ error: "Failed to update lead status in
    Airtable", clientCreated: true }` so the UI can distinguish "partial
    success" from "total failure". On full success returns `{ ok: true,
    clientCreated: true }`. The catch-all now also includes `clientCreated:
    false`.

- **`components/LeadDrawer.tsx`**
  - Bug 2: `handleConvertConfirm` no longer silently `return`s on `!res.ok`.
    It now shows a red error toast ("שגיאה בהמרת הליד ללקוח, נסה שוב") via a
    new `variant: "error"` on the existing toast mechanism, leaves the modal
    open so the user can retry, and still resets `convertSaving` in
    `finally`. Added a try/catch around the `fetch` so network errors also
    surface the same error toast instead of throwing.
  - Added `AlertTriangle` icon import and `ToastContent.variant` (`"success"
    | "error"`). The toast renders with `bg-warn` for errors (red) vs
    `bg-accent` (blue) for success, and error toasts stay visible 3s instead
    of 2s.

- **`components/ScrapeForm.tsx`**
  - Bug 3:
    - Added constants `POLL_INTERVAL_MS` (5000), `MAX_CONSECUTIVE_POLL_FAILURES`
      (5), `MAX_TOTAL_POLL_DURATION_MS` (5 minutes).
    - Added `safetyTimeoutRef` — a top-level `setTimeout` started alongside
      the poll interval that, regardless of poll outcomes, stops polling and
      marks the run failed after 5 minutes via a new `markRunFailed` helper.
    - `markRunFailed(historyRecordId, message)`: stops polling/timeout, sets
      `error` + `status: "failed"`, and calls `PATCH /api/scrape/complete`
      with `{ historyRecordId, failed: true }` (best-effort, wrapped in
      try/catch), then `router.refresh()`.
    - The poll loop now tracks `consecutiveFailures` for both non-OK HTTP
      responses and thrown errors; after `MAX_CONSECUTIVE_POLL_FAILURES`
      (5) it calls `markRunFailed` with the message "לא ניתן היה לבדוק את
      סטטוס הסריקה. ייתכן שהסריקה עדיין רצה ברקע ב-Apify."
    - The "failed" status banner now renders `{error ?? "הסריקה נכשלה. נסה
      שוב."}` so the specific Bug-3 messages are shown to the user.

### Drag-and-drop Kanban (section 2)

- **`lib/leads-client.ts`** (new)
  - `updateLeadStatusClient(leadId, status)`: shared `PATCH
    /api/leads/[id]` helper (returns `boolean`, wrapped in try/catch). Used
    by both `StatusActionButtons` and `KanbanBoard`'s drop handler so the
    "Contacted" special-casing in `updateLeadStatus` (server-side) is
    triggered uniformly.

- **`components/StatusActionButtons.tsx`**
  - Refactored to call `updateLeadStatusClient` instead of inline `fetch`.
  - Added optional `onStatusChange?: (status: KanbanStatus) => void` prop —
    called immediately on success (before `router.refresh()`) so the parent
    (`LeadCard` → `KanbanColumn` → `KanbanBoard`/`UrgentLeadsCard`) can apply
    an optimistic local-state update. This is the primary Bug 1 fix path.

- **`components/KanbanBoard.tsx`** (rewritten)
  - Bug 1: Re-syncs local `leads` state from the `initialLeads` prop using
    the "adjust state during render" pattern (comparing against a
    `prevInitialLeads` state value) rather than `useEffect` — avoids the
    `react-hooks/set-state-in-effect` lint error while still re-syncing
    whenever the server gives a fresh `leads` array (cross-tab/cross-
    component safety net).
  - Owns drag state: `draggedLeadId`, `dropTargetStatus`, plus a `dragError`
    banner (auto-clears after 3s).
  - `applyOptimisticStatus(leadId, newStatus)`: shared local-state mutation
    used by both `handleStatusChange` (from `StatusActionButtons` via
    `LeadCard`) and `handleDrop` (drag-and-drop). Mirrors `LeadDrawer`'s
    "Contacted" special-casing (sets `lastContacted` + increments
    `followUpCount` client-side for instant feedback; server is still source
    of truth via `updateLeadStatus`). Returns the previous record for
    rollback.
  - `handleDrop(leadId, newStatus)`: no-ops if the lead's current status
    already equals `newStatus` (covers "same column" and "אחר" drops, since
    "אחר" never appears as a `KanbanStatus`). Otherwise applies the
    optimistic update, calls `updateLeadStatusClient`, and on failure rolls
    back to the previous record and shows the `dragError` banner ("עדכון
    הסטטוס נכשל. נסה שוב.").
  - Each column now receives `status: KanbanStatus | null` (null for "אחר"),
    `isDropTarget`, `draggedLeadId`, `dropTargetStatus`,
    `onDragStateChange`, and `onDrop`.
  - Added `touchAction: "pan-x"` on the scrollable column row container.

- **`components/KanbanColumn.tsx`** (rewritten)
  - Added `data-column-status={status ?? "other"}` on the drop-zone `div`
    (the lead-list container) — `"other"` for the "אחר" column, which
    `LeadCard`'s drop handler treats as an invalid/no-op target.
  - Added `isDropTarget` visual state: when true, the drop-zone gets
    `border-accent bg-accent-soft` instead of the default
    `border-border bg-black/[0.02]`.
  - Passes through `onStatusChange`, `draggedLeadId`, `dropTargetStatus`,
    `onDragStateChange`, `onDrop` to each `LeadCard`.

- **`components/LeadCard.tsx`** (rewritten)
  - Added Pointer Event handlers (`onPointerDown`, `onPointerMove`,
    `onPointerUp`, `onPointerCancel`) implementing the drag-and-drop
    interaction:
    - `DRAG_THRESHOLD = 7px` — movement below this is treated as a
      tap/click (opens `LeadDrawer` via `onSelect`); movement past it
      initiates a drag (`setPointerCapture`, `preventDefault`).
    - While dragging: the card follows the pointer via `transform:
      translate(dx, dy) scale(1.03)` + elevated shadow/opacity (`position:
      relative`, `zIndex: 50`), and `touch-action: none` is applied (vs.
      `pan-x` when idle) to prevent scroll/drag gesture conflicts on touch.
    - On move: `document.elementFromPoint(x, y)` + `.closest("[data-column-
      status]")` determines the hover target; `onDragStateChange(leadId,
      hoverStatus)` is called continuously (hoverStatus is `null` for
      "אחר"/no target, enabling the column highlight in `KanbanColumn`).
    - On pointer up: same lookup determines the drop target; calls
      `onDrop(leadId, target)` if `target` is a real `KanbanStatus` (not
      `"other"`/null). On pointer cancel, the drag is aborted without
      calling `onDrop`.
  - Drag handlers are no-ops (`isDraggable = false`) when
    `onDragStateChange`/`onDrop` aren't supplied — this lets `LeadCard` be
    reused in `UrgentLeadsCard` (dashboard) without drag-and-drop.
  - Preserved `role="button"`, `tabIndex`, `onKeyDown` (Enter/Space → 
    `onSelect`), and added `aria-roledescription="draggable"` +
    `aria-grabbed={dragging}`.
  - `StatusActionButtons` now receives `onStatusChange={(status) =>
    onStatusChange(lead.id, status)}` when the card's parent supplies
    `onStatusChange` — wires the accessible/non-pointer alternative for
    moving cards into the same optimistic-update path as drag-and-drop.

### Dashboard (section 3)

- **`components/dashboard/UrgentLeadsCard.tsx`** (new)
  - Client component. Takes `leads` (full array) + `partner`.
  - `getTopUrgentLeads`: filters out `status === "Converted"`, maps through
    `computePriority(lead)`, sorts descending by `score`, takes top 5.
  - Renders each as a full `LeadCard` (business name, `PriorityBadge`,
    city/rating, contact links, `StatusActionButtons`) in a vertical list.
  - Owns its own `selectedLead` state + `LeadDrawer` (mirrors
    `KanbanBoard`'s pattern) so clicking a card opens the drawer; `onUpdate`
    and `onStatusChange` both update local `leads` state optimistically
    (same "Contacted" special-casing as `KanbanBoard`).
  - Re-syncs from `initialLeads` prop via the same render-time pattern as
    `KanbanBoard` (avoids `set-state-in-effect` lint error).
  - Empty state: "כל הכבוד! אין לידים דחופים כרגע" with `PartyPopper` icon.

- **`components/dashboard/NotesPanel.tsx`** (new)
  - Client component. Receives `initialContent: string`.
  - A `<textarea>` styled like `LeadDrawer`'s notes field
    (`suppressHydrationWarning` included).
  - `handleBlur`: if content changed since last save, `PATCH /api/notes`
    with `{ content }`; on success shows an inline "✓ נשמר" badge (bottom-
    left of the textarea) that fades after 2s — reuses the
    `setTimeout`-based fade pattern from `LeadDrawer.showToast`.

- **`app/api/notes/route.ts`** (new)
  - `GET`: auth via `getPartnerFromSession`; returns `{ content, updatedAt }`
    for the current partner's note (`content: ""`, `updatedAt: null` if no
    record exists yet). 401 if unauthenticated.
  - `PATCH`: auth via `getPartnerFromSession`; body `{ content: string }`
    (400 if not a string); calls `upsertPartnerNote(partner, content)`;
    returns `{ ok: true, updatedAt }`. 401 if unauthenticated, 500 on
    Airtable error.

- **`app/page.tsx`**
  - Replaced `<KanbanBoard leads={leads} partner={partner} />` with
    `<UrgentLeadsCard leads={leads} partner={partner} />` followed by
    `<NotesPanel initialContent={note?.content ?? ""} />` in the main
    content column.
  - Fetches `getPartnerNote(partner)` alongside `listLeads`/`listClients`/
    `listTasks` via `Promise.all`.
  - `RightPanel` (Sales Performance / Recent Contacts / Open Tasks) is
    unchanged in the sidebar.
  - The full drag-and-drop Kanban board remains on `/leads` (`app/leads
    /page.tsx`, "kanban" tab) — unchanged, still renders `<KanbanBoard
    leads={leads} partner={partner} />`.

---

## Airtable schema addition required

A new table must be added to the Airtable base for the Notes panel (3b) to
persist data:

- **Table name:** `Notes`
- **Fields:**
  - `Partner` — single line text or single select with options `"איתי"` /
    `"עמרי"` (must exactly match the `Partner` type values used elsewhere,
    e.g. `Partners` table's `Name` field).
  - `Content` — long text.
  - `Updated At` — date/time field (the app sets this explicitly on every
    write via ISO string; an Airtable "last modified time" automation field
    would also work but isn't required since the app sets it).
- **Record model:** one record per partner (find-or-create / upsert — see
  `upsertPartnerNote` in `lib/airtable.ts`, which filters by
  `{Partner} = "<partner>"`).

Until this table exists, `GET /api/notes` returns `{ content: "", updatedAt:
null }` (the `select()` call against a non-existent table will throw inside
`getPartnerNote`/`getPartnerNote` — **note**: if the `Notes` table doesn't
exist at all, Airtable's API returns a 404/`NOT_FOUND` for the table, which
will cause `getPartnerNote`/`upsertPartnerNote` to throw. `app/page.tsx`
calls `getPartnerNote` directly (not wrapped in try/catch) as part of the
`Promise.all`, so **the `Notes` table must exist (even empty) before
deploying**, or the dashboard page itself will fail to render. This mirrors
how `listClients`/`listTasks`/etc. already assume their tables exist.

## Bug 2 — Airtable "Converted" status option

Per the spec's default, no schema change was made for the Lead Tracker
"Status" field — the fix focuses on error-surfacing/resilience
(`convertLeadToClient` now tolerates the Lead Tracker update failing
independently of the Clients record creation). If `"Converted"` is indeed
missing from the Status single-select's choices, conversions will now
report `{ error: "Failed to update lead status in Airtable", clientCreated:
true }` (502) instead of a generic 500/silent failure — the client record
will still be created. Whoever provisions the base should verify/add
`"Converted"` as a Status option in the Lead Tracker table to make
conversions fully succeed end-to-end.

---

## Lint / Build results

- `npm run lint`: **0 errors**, 1 pre-existing warning unrelated to this
  change (`components/TaskDrawer.tsx:91` — `react-hooks/exhaustive-deps`,
  missing `task` dependency; not touched by this pipeline run).
- `npm run build`: **succeeded** (Next.js 16.2.9, Turbopack). All routes
  compiled, including the new `/api/notes` route. The
  `experimental.staleTimes.static` config warning in `next.config.ts` is
  pre-existing and unrelated.
