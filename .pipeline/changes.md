# Changes — 8-Task Backlog Closeout

Summary of code changes across all 8 tasks of this autonomous backlog-closeout run. Each task is on its own branch, stacked sequentially (`task-2` off `task-1`, ... `task-8` off `task-7`), each with its own PR against `main`. **Nothing has been merged or deployed.**

## Task 1 — Fix toolchain lint error, confirm Sprint 3 fixes
- Branch: (pre-existing commits on `main` lineage) — PR #1
- Fixed a lint error blocking the toolchain.
- Confirmed Sprint 3 bug fixes (Kanban drag-and-drop, dashboard top-5, scrape error surfacing) were intact.

## Task 2 — Notes defensive error handling
- PR #2
- Added a defensive `getPartnerNoteSafe` wrapper around the dashboard notes panel so a malformed/missing Notes record doesn't crash the dashboard.

## Task 3 — Converted lead status
- PR #3
- Added a regression test covering the `convertLeadToClient` Status-update failure path (client created but lead status update to "Converted" fails independently — verified the partial-success result shape `{ clientCreated: true, leadStatusUpdated: false }`).

## Task 4 — PROJECT_LOG.md backfill
- PR #4
- Backfilled missing session entries in the parent O-I repo's `PROJECT_LOG.md` and reconciled tracker READMEs. No Agency-CRM application code changed.

## Task 5 — REVIEW.md low-severity fixes
- PR #5
- Fixed 3 outstanding low-severity issues from the full-depth code review (see root `REVIEW.md`).

## Task 6 — Repo hygiene + NEEDS_HUMAN.md
- PR #6
- Deleted a confirmed-merged local feature branch (`feature/lead-pipeline-kanban-dashboard`).
- Created `NEEDS_HUMAN.md` to track follow-ups that need a human with web-UI/account access (duplicate GitHub repo deletion, Google OAuth test user, etc).

## Task 7 — Lead staleness + outreach tracking
- PR #7
- Added `lib/staleness.ts` (`computeStaleness`) — derives a fresh/aging/stale level from `lastContacted` (falling back to `createdTime`).
- Added `lib/staleness-labels.ts` and `components/StalenessBadge.tsx`, wired into `LeadCard.tsx`.
- Documented the staleness indicator in `pipeline/README.md` (parent repo).

## Task 8 — Client churn/renewal tracking + scrape-run yield logging (this task)
- PR #8 — **stacked on PR #7, last in the stack**

### Part A — Client churn/renewal tracking
- `lib/types.ts`: extended `ClientRecord` with `renewalDate: string | null`; added `isRenewalDueSoon(client): boolean` (renewal today, overdue, or within 30 days — reuses existing `status: "Active" | "Inactive"` for churn state, no new Airtable select option).
- `lib/airtable.ts`: `mapClientRecord` now reads the `"Renewal Date"` field; added `updateClientRenewalDate(recordId, renewalDate)`.
- `app/api/clients/[id]/route.ts`: PATCH handler now accepts `status` and/or `renewalDate` independently (previously `status`-only).
- Airtable schema: added a `Renewal Date` (date, ISO format) field to the `Clients` table via the Airtable MCP — confirmed it did not already exist before adding.
- `components/RenewalDateEditor.tsx` (new): inline-editable renewal date with a "חידוש בקרוב" (renewal due soon) amber tag, reusing the `.tag`/`PriorityBadge`-style coloring convention.
- `components/ClientsTable.tsx`: added a "תאריך חידוש" (renewal date) column using `RenewalDateEditor`.
- Tests: `lib/__tests__/clients.test.ts` covers `isRenewalDueSoon` (null, invalid date, today, overdue, within window, beyond window).

### Part B — Scrape-run yield logging
- `lib/types.ts`: added pure helper `computeYieldRate(leadsFound, limit): number` (percentage, guards against zero/negative `limit`). No new Airtable field — Apify run cost/usage data isn't part of the current integration's API calls in `app/api/scrape/start` / `app/api/scrape/complete`, so cost tracking was intentionally skipped (flagged as a future item, not blocking).
- `components/ScrapeHistory.tsx`: added a "תפוקה" (yield) column showing `leadsFound / limit` as a rounded percentage, color-coded green (≥50%), amber (20-50%), red (<20%) — thresholds documented in a code comment.
- `components/settings/PipelineTab.tsx`: added a rollup card showing the average yield rate over the last 10 scrape runs (`listScrapeHistory` already returns newest-first).
- `app/settings/page.tsx` / `components/settings/SettingsClient.tsx`: threaded `scrapeHistory` (from `listScrapeHistory()`) down to `PipelineTab`.
- Tests: `lib/__tests__/scrape-yield.test.ts` covers `computeYieldRate` (full yield, zero yield, partial yield, over-100% yield, zero/negative limit guards).

### Final wrap-up (after all 8 tasks)
- Ran `npm run lint`, `npm run build`, `npx vitest run` on the full stacked branch (tip = `task-8-churn-yield`) — all green, no regressions.
- `REVIEW.md` (root) required no changes — its findings already reflect Task 5's fixes and the `app/api/clients/[id]/route.ts` auth-check finding remains addressed (PATCH handler still calls `getPartnerFromSession`).
- Regenerated this file and `.pipeline/test-results.md`.
- Added a closing entry to the parent O-I repo's `PROJECT_LOG.md` summarizing the full 8-task run.
