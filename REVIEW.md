# Agency-CRM Code Review — Full-Depth Pass

Scope: full-depth review of ~50 source files (Next.js 16 App Router, TypeScript, Tailwind CSS v4, Hebrew/RTL UI, Airtable backend). Carried out in parallel with "Workstream B" (mobile/responsive fixes) on the same files — this pass intentionally avoided touching responsive breakpoint classes (`sm:`/`md:`/`lg:`), mobile nav, and the 5 excluded files' styling (`app/layout.tsx`, `components/Sidebar.tsx`, `components/dashboard/TopHeader.tsx`, `components/TasksTabs.tsx`, `components/LeadsTabs.tsx`).

## Executive Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Medium | 7 |
| 🔵 Low | 6 |

**Files changed: 14**
- `app/api/clients/[id]/route.ts`
- `app/api/leads/[id]/route.ts`
- `app/api/leads/[id]/convert/route.ts`
- `app/api/scrape/complete/route.ts`
- `app/api/scrape/start/route.ts`
- `app/page.tsx`
- `app/leads/page.tsx`
- `app/tasks/page.tsx`
- `app/clients/page.tsx`
- `app/settings/page.tsx`
- `components/LeadCard.tsx`
- `components/RoadmapCard.tsx`
- `components/TaskCard.tsx`
- `lib/airtable.ts`

No `## CRITICAL SECURITY ISSUES` were found. The project already enforces auth project-wide via `proxy.ts` (Next.js 16's middleware-equivalent), which redirects any unauthenticated request — including all `/api/*` routes — to `/login` (matcher excludes only static assets, favicon, and dot-extension paths). All findings below related to "missing auth checks" are therefore **defense-in-depth / consistency fixes**, not exploitable vulnerabilities, and are rated 🟡 Medium rather than 🔴/🟠.

`npm run lint` and `npm run build` both **pass** (see Build/Lint Verification at the bottom).

---

## 🟡 Medium

### `app/api/clients/[id]/route.ts` — PATCH had no explicit auth check
- **Problem**: The mutating PATCH handler (toggles client Active/Inactive) relied solely on `proxy.ts` for auth, unlike sibling routes (`app/api/tasks/[id]/route.ts`, `app/api/roadmap/[id]/route.ts`, etc.) which all call `getPartnerFromSession` explicitly as defense-in-depth.
- **Fix applied**: Added `import { getPartnerFromSession } from "@/lib/auth";` and, at the top of the PATCH handler:
  ```ts
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```

### `app/api/leads/[id]/route.ts` — PATCH had no explicit auth check
- **Problem**: Same inconsistency as above — PATCH updates lead `status`/`notes`/`nextAction` with no explicit session check.
- **Fix applied**: Same pattern — import + auth check before `const { id } = await params;`.

### `app/api/leads/[id]/convert/route.ts` — POST had no explicit auth check
- **Problem**: POST creates a new `Clients` record and marks the source lead "Converted" — a significant data mutation with no explicit session check.
- **Fix applied**: Same pattern — import + auth check.

### `app/api/scrape/complete/route.ts` — PATCH had no explicit auth check
- **Problem**: PATCH marks scrape-history records `Completed`/`Failed` with no explicit session check.
- **Fix applied**: Same pattern — import + auth check.

### `app/api/scrape/start/route.ts` — auth check was implicit/incidental, not a gate
- **Problem**: `getPartnerFromSession(request)` was called only to populate the `triggeredBy` field (`?? "Unknown"`), not as an authorization gate. This route triggers a **paid Apify run**, so an explicit, fail-closed auth check is appropriate.
- **Fix applied**:
  ```ts
  const sessionPartner = getPartnerFromSession(request);
  if (!sessionPartner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
  Removed the now-redundant `const triggeredBy = getPartnerFromSession(request) ?? "Unknown";` and changed `createScrapeHistoryRecord({ ..., triggeredBy, })` to `triggeredBy: sessionPartner`.

### Multiple pages used `(await getCurrentPartner()) ?? "איתי"` fallback instead of redirecting
- **Files**: `app/page.tsx` (Dashboard), `app/leads/page.tsx`, `app/tasks/page.tsx`, `app/settings/page.tsx`.
- **Problem**: If `getCurrentPartner()` returns `null` (e.g. session cookie expired/invalid in a way `proxy.ts` somehow let through, or during local dev without `proxy.ts`), these pages silently fell back to hardcoding the partner name `"איתי"` — meaning a page could render as if the wrong person were logged in, instead of failing safe.
- **Fix applied** (all four files): replaced the `?? "איתי"` fallback with a fail-safe redirect:
  ```ts
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login");
  }
  ```
  Added `import { redirect } from "next/navigation";` where missing. In `app/leads/page.tsx` and `app/tasks/page.tsx`, this check was moved to the top of the function (before `searchParams`/data fetching) for an earlier fail-fast.

### `app/clients/page.tsx` — page had no auth-awareness at all
- **Problem**: Unlike every other page, this page never called `getCurrentPartner()` — it relied entirely on `proxy.ts`. While not exploitable (proxy.ts covers it), it was inconsistent with the rest of the app and would silently render for `partner = undefined` if proxy.ts were ever bypassed or changed.
- **Fix applied**: Added `getCurrentPartner()` + redirect-to-login guard, matching the other pages:
  ```ts
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login");
  }
  ```

---

## 🔵 Low

### `components/LeadCard.tsx` — click-only card not keyboard accessible
- **Problem**: The entire lead card was a `<div onClick={() => onSelect(lead)}>` with no `role`, `tabIndex`, or keyboard handler — keyboard/screen-reader users could not open a lead's detail drawer.
- **Fix applied**: Added `role="button"`, `tabIndex={0}`, `onKeyDown` handler (Enter/Space → `onSelect(lead)` with `preventDefault`), `aria-label={\`פתח פרטי ליד: ${lead.businessName}\`}`, and a `focus:outline-none focus:ring-2 focus:ring-accent/40` focus-visible ring appended to the existing className. Nested interactive elements (`tel:`/website/maps links, `StatusActionButtons`) already use `e.stopPropagation()` on their wrapping `<div>`s and were left unchanged.

### `components/RoadmapCard.tsx` — same click-only card issue
- **Problem**: Same pattern — `<div onClick={() => onSelect(item)}>` with no keyboard support.
- **Fix applied**: Same fix pattern — `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), `aria-label={\`פתח יעד: ${item.title}\`}`, focus ring.

### `components/TaskCard.tsx` — same click-only card issue
- **Problem**: Same pattern — `<div onClick={() => onSelect(task)}>` with no keyboard support.
- **Fix applied**: Same fix pattern — `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), `aria-label={\`פתח משימה: ${task.title}\`}`, focus ring.

### `lib/airtable.ts` — Airtable `filterByFormula` string interpolation (formula-injection risk)
- **Lines**: ~375 (`listTaskComments`: `` `{Task ID} = "${taskId}"` ``), ~676 and ~688 (`getPartnerPasswordHash`/`setPartnerPasswordHash`: `` `{Name} = "${partner}"` ``).
- **Problem**: `taskId` and `partner` were interpolated directly into Airtable formula strings without escaping. `taskId` originates from a user-controlled URL param (`app/api/tasks/[id]/comments/route.ts`). A value containing `"` could alter the formula's filter logic (Airtable formula injection — not classic SQL injection, but could allow querying unintended records within the same table/base).
- **Fix applied**: Added an `escapeFormulaValue()` helper (escapes `\` and `"`) and applied it at all three interpolation sites.

### `components/ScrapeForm.tsx` — uncancelled `setTimeout` inside polling `setInterval`
- **Lines**: ~59-87 (`pollRef.current = setInterval(...)`, with a nested `setTimeout(async () => {...}, 10000)` on `SUCCEEDED`).
- **Problem**: When the poll succeeds, `stopPolling()` clears the interval, but the subsequent 10-second `setTimeout` that fetches the final lead count is not tracked/cleared. If the user navigates away during that 10-second window, the component may call `setState` after unmount.
- **Status**: **Documented only — not fixed in this pass.** Tightly coupled to the scrape polling/cleanup flow (`pollRef`, `useEffect` cleanup at lines ~20-23); fixing requires adding a second ref and cleanup branch, with care not to disrupt the existing polling UX. Low real-world impact (React 18+ just warns; no crash), but worth addressing alongside any future refactor of `ScrapeForm`.

### Duplicated `PRIORITY_LABELS` / `PRIORITY_CLASSES` / `PRIORITY_ICONS` constants
- **Files**: `components/CallListTable.tsx` (lines 9, 15, 21), `components/PriorityBadge.tsx` (lines 5, 11, 17), `components/dashboard/OpenTasksCard.tsx` (lines 7, 13), `components/TaskCard.tsx` (lines 10-26, exported and reused by `components/TaskDrawer.tsx`).
- **Problem**: Four independent copies of essentially the same `Priority → label/class/icon` maps exist across the codebase. Any future change to priority labels/colors (e.g. adding a 4th priority level, or restyling) requires editing 4 files and risks them drifting out of sync.
- **Status**: **Documented only — not fixed in this pass.** `TaskCard.tsx`'s exported versions are already the "canonical" copy (reused by `TaskDrawer.tsx`). Consolidating the other three into a shared `lib/priority-labels.ts` (mirroring the existing `lib/roadmap-labels.ts` pattern) would be a clean, low-risk follow-up but touches 4 files' imports — out of scope for a same-pass fix given the parallel mobile workstream.

### `lib/whatsapp.ts` — `toWhatsAppNumber` edge case for non-Israeli-formatted numbers
- **Lines**: 1-5.
  ```ts
  export function toWhatsAppNumber(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) return "972" + digits.slice(1);
    return digits;
  }
  ```
- **Problem**: If a phone number is stored without a leading `0` and without a `972` country code (e.g. a raw 9-digit number, or a non-Israeli number), the function returns it unchanged, which would produce an invalid `wa.me` link.
- **Status**: **Documented only — not fixed in this pass.** All current lead data is Israeli numbers in local `0XX-XXXXXXX` format (the upstream Apify scraper normalizes to this), so this is a theoretical edge case. A fix would need a policy decision (assume `972` prefix for any non-`0`-starting number? validate length?) — better decided with the business owner than guessed.

### `components/KanbanBoard.tsx` — `groups` record recomputed every render without memoization
- **Problem**: The lead-grouping-by-status `groups` object is rebuilt on every render from `leads` with no `useMemo`. For the current small CRM dataset (tens of leads) this is negligible, but is worth noting if the lead volume grows significantly.
- **Status**: **Documented only — not fixed in this pass.** Premature optimization for current data volume; revisit if lead counts grow into the hundreds+.

---

## Pre-existing, Verified-OK (no action needed)

- **`proxy.ts`** (Next.js 16 middleware-equivalent): redirects any unauthenticated request (no/invalid session cookie) to `/login` for all paths except `/login`, `/api/login`, static assets, favicon, and dot-extension paths. This covers all `/api/*` routes already — the auth-check additions above are consistency/defense-in-depth, not closing an actual hole.
- **`app/api/login/route.ts`, `app/api/logout/route.ts`, `app/api/change-password/route.ts`**: bcrypt password compare, HMAC-signed session tokens (`lib/auth.ts`, `timingSafeEqual` for MAC comparison), `httpOnly`/`secure`/`sameSite` cookie flags — correctly implemented.
- **`app/api/roadmap-tasks/[id]/route.ts`, `app/api/roadmap-tasks/route.ts`, `app/api/roadmap/[id]/route.ts`, `app/api/roadmap/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/tasks/route.ts`**: already have explicit `getPartnerFromSession` checks — these were the reference pattern used for the fixes above. `app/api/tasks/[id]/route.ts` PATCH/DELETE additionally enforces `owner !== partner → 403` (intentional ownership rule, left unchanged).
- **`app/api/scrape/lead-count/route.ts`, `app/api/scrape/status/route.ts`**: GET-only, read-only, no explicit auth check — acceptable given `proxy.ts` coverage and low sensitivity of the data returned.
- **No secrets exposed to client bundle**: `lib/airtable.ts` is marked `"server-only"`; `lib/auth.ts`'s `AUTH_SECRET` is only read inside server-side function bodies; client components only import `type { Partner }` from `lib/auth` (type-only imports erase at compile time). Confirmed via project-wide grep for `dangerouslySetInnerHTML` and `process.env`.
- **`LeadDrawer.tsx`, `RoadmapDrawer.tsx`, `TaskDrawer.tsx`**: all use the "adjust state during render" pattern (`if (currentKey !== openKey) { setOpenKey(...); ...resets... }`) to reset form state when switching records — this is a valid, intentional React 18+/19 pattern, not a bug.
- **`components/TaskDrawer.tsx` line 91** — `react-hooks/exhaustive-deps` warning (`useEffect` comment-fetch effect is missing `task` in deps, uses `task?.id` instead): this is the **same intentional pattern** used to avoid refetching comments every time the `task` object reference changes (only refetch when switching to a different task `id`). Pre-existing, not introduced by this review, and does not affect build/lint pass/fail status (warning only). Left unchanged — fixing the dependency array risks introducing a refetch-loop regression.

---

## Mobile Issues Found (for Workstream B)

> Note: Workstream B completed its pass concurrently and already addressed most items below (see their `REVIEW_MOBILE.md`). Listed here per the task's required format for completeness/cross-reference.

- **`components/KanbanBoard.tsx`** — kanban columns container (`kanban-scroll ... overflow-x-auto ... lg:grid lg:grid-cols-5 ... lg:overflow-visible`): horizontal-scroll-on-mobile / grid-on-desktop pattern — confirmed already handled.
- **`components/RoadmapTimeline.tsx`** — roadmap items container (`kanban-scroll flex gap-4 overflow-x-auto pb-2`): same horizontal-scroll pattern — confirmed already handled (each `RoadmapCard` is `w-72 shrink-0`).
- **`app/page.tsx` / `components/dashboard/RightPanel.tsx`** — dashboard layout (Kanban + right panel side-by-side): Workstream B changed the container to `flex flex-col gap-4 lg:flex-row` and `RightPanel` to `w-full ... lg:w-[300px] lg:shrink-0` to prevent horizontal overflow on narrow screens — already applied.
- **`components/dashboard/TopHeader.tsx`** — single-row header with title/search/bell/avatar/new-button: Workstream B added `flex flex-wrap`/`sm:flex-nowrap`, `min-w-0`/`truncate` for title, and made the search bar `order-last w-full` on mobile — already applied.
- **`app/layout.tsx`** — missing `viewport` export (Next.js 16 `Metadata`/`Viewport` split): Workstream B added `export const viewport: Viewport = { width: "device-width", initialScale: 1 }` — already applied.
- **Touch targets** (`components/StatusActionButtons.tsx`, `components/StatusToggle.tsx`, `components/CallListTable.tsx`, `components/LeadCard.tsx`, drawer close buttons in `LeadDrawer.tsx`/`TaskDrawer.tsx`/`RoadmapDrawer.tsx`): bumped from `py-1`/`h-8 w-8` to `py-2`/`h-11 w-11` (~44px) — already applied by Workstream B.

No additional unaddressed mobile/responsive issues were found during this pass.

---

# Mobile Usability Audit (Workstream B)

## Mobile Fixes Applied

### `app/layout.tsx`
- **Issue**: No `viewport` export — Next.js 16 metadata didn't set `width=device-width, initial-scale=1`, so mobile browsers could render the page at desktop width and force zoom-to-fit.
- **Fix**: Added `export const viewport: Viewport = { width: "device-width", initialScale: 1 }` alongside the existing `metadata` export.
- Sidebar/hamburger drawer and `main` padding (`pt-20`, `md:pl-[17rem]`) were already correctly implemented for mobile — left unchanged.

### `app/page.tsx` (dashboard)
- **Issue**: The dashboard body was `flex gap-4` with the Kanban board (`flex-1`) and `RightPanel` side-by-side with no wrap. Combined with `RightPanel`'s hardcoded `w-[300px]`, this forced a minimum content width of roughly `kanban-min + 300px`, causing horizontal overflow / squeeze on phones.
- **Fix**: Changed the container to `flex flex-col gap-4 lg:flex-row` so the Kanban board and right panel stack vertically on mobile/tablet and sit side-by-side only at `lg:` and up. Also added `min-w-0` to the Kanban wrapper so it can shrink inside the flex row at `lg:`.

### `components/dashboard/RightPanel.tsx`
- **Issue**: `w-[300px] shrink-0` is a hardcoded width that doesn't collapse on narrow viewports — combined with the dashboard's non-wrapping flex row, this was the main source of dashboard horizontal overflow on mobile.
- **Fix**: Changed to `w-full flex-col gap-4 lg:w-[300px] lg:shrink-0` — full width and stacked below the Kanban board on mobile/tablet, fixed 300px sidebar at `lg:` and up (desktop behavior unchanged).

### `components/dashboard/TopHeader.tsx`
- **Issue**: Fixed `h-16` single row crammed in: title+subtitle, a search bar (`max-w-[340px]`), notification bell, avatar, and a "חדש" (New) button, all with `px-7`. On narrow screens this caused horizontal overflow / clipped elements — there was no breakpoint behavior at all.
- **Fix**:
  - Header is now `flex flex-wrap` on mobile (`sm:flex-nowrap sm:h-16` restores the original single-row desktop layout), with reduced `px-4 py-3` on mobile vs `sm:px-7`.
  - Title block gets `min-w-0 flex-1` + `truncate` on both the title and subtitle so long Hebrew titles don't force overflow.
  - The search bar wrapper is `order-last w-full` on mobile (drops to its own full-width row below the title/icons row) and reverts to `sm:flex sm:flex-1 sm:justify-center` with `sm:max-w-[340px]` at `sm:` and up — desktop layout is pixel-identical to before.

## Pre-existing mobile-friendly patterns verified (no changes needed)
- `components/Sidebar.tsx` + `app/layout.tsx`: hamburger button (`md:hidden`, `fixed top-4 left-4`) + slide-in drawer (`-translate-x-full` / `translate-x-0`, `md:translate-x-0`) were already implemented correctly; desktop sidebar at `md:`/`lg:` unchanged.
- `components/CallListTable.tsx`, `components/ClientsTable.tsx`, `components/ScrapeHistory.tsx`: all tables already wrapped in `overflow-x-auto` containers, so they scroll horizontally instead of breaking layout on narrow screens.
- `components/KanbanBoard.tsx` / `KanbanColumn.tsx`: kanban columns (`w-72 shrink-0`) already scroll horizontally via `kanban-scroll overflow-x-auto` on mobile and switch to a 5-column CSS grid at `lg:`.
- `components/LeadDrawer.tsx`, `components/TaskDrawer.tsx`, `components/RoadmapDrawer.tsx`: side drawers already use `w-full max-w-md`, i.e. full-width on mobile and capped at `max-w-md` on larger screens.
- `components/TasksTabs.tsx`, `components/LeadsTabs.tsx`: small pill tab groups (`flex w-fit gap-1`), only 2-3 items each — no overflow risk on narrow screens.
- `components/FilterBar.tsx`, `components/RoadmapTimeline.tsx` filter row: already `flex flex-wrap`.
- `app/login/page.tsx`, `components/ChangePasswordForm.tsx`: centered `max-w-sm` cards with `px-4` page padding — already mobile-friendly.

## Touch target fixes (≥ ~40px tap area)
- `components/StatusActionButtons.tsx`: lead status action pills (e.g. "סומן כ'נוצר קשר'", "לא מעוניין") bumped from `py-1` to `py-2`.
- `components/StatusToggle.tsx`: client active/inactive toggle bumped from `py-1` to `py-2`.
- `components/CallListTable.tsx`: call-list row actions (חייג / וואטסאפ / סומן כ'צור קשר') bumped from `py-1` to `py-2`.
- `components/LeadCard.tsx`: quick-link pills (phone / website / maps) bumped from `py-1` to `py-2`.
- `components/LeadDrawer.tsx`, `components/TaskDrawer.tsx`, `components/RoadmapDrawer.tsx`: drawer close (X) button bumped from `h-8 w-8` (32px) to `h-11 w-11` (44px).

---

# Pass 2 — Deeper UI/UX/A11y/Mobile Audit (follow-up)

Follow-up pass covering all remaining pages/components, split into two parallel sub-passes by file ownership.

## Pass 2A — Dashboard / Leads / Clients

Scope: `app/page.tsx`, `app/leads/page.tsx`, `app/clients/page.tsx`, `components/CallListTable.tsx`, `components/ClientsTable.tsx`, `components/LeadCard.tsx`, `components/LeadDrawer.tsx`, `components/LeadsTabs.tsx`, `components/FilterBar.tsx`, `components/PriorityBadge.tsx`, `components/StatusToggle.tsx`, `components/StatusActionButtons.tsx`, `components/LinkedRecordSearch.tsx`, `components/CommentThread.tsx`, `components/dashboard/*`.

| File | Issue | Severity | Status |
|---|---|---|---|
| `components/CallListTable.tsx` | Table `<th>` cells had no `scope="col"` — screen readers can't associate header/data cells | medium | fixed |
| `components/ClientsTable.tsx` | Same — `<th>` cells missing `scope="col"` | medium | fixed |
| `components/StatusToggle.tsx` | Error message used raw Tailwind color `text-red-600` instead of semantic `text-warn` token | medium | fixed |
| `components/StatusToggle.tsx` | Error message not announced to screen readers | medium | fixed (added `role="alert"`) |
| `components/StatusToggle.tsx` | Toggle button had no visible focus ring | critical | fixed (`focus:ring-2 focus:ring-accent/40`) |
| `components/StatusActionButtons.tsx` | Error message used raw `text-red-600` instead of `text-warn` | medium | fixed |
| `components/StatusActionButtons.tsx` | Error message not announced to screen readers | medium | fixed (added `role="alert"`) |
| `components/StatusActionButtons.tsx` | All three status-action buttons had no visible focus ring | critical | fixed (`focus:ring-2`) |
| `components/LeadDrawer.tsx` | Status / "next action" `<select>` elements had no focus ring | critical | fixed |
| `components/LeadDrawer.tsx` | Status/next-action selects and notes textarea used `text-sm` (14px) → iOS zoom-on-focus | high | fixed (`text-base`) |
| `components/LeadDrawer.tsx` | Convert-to-client modal: ₪ amount inputs used `text-sm` (14px) → iOS zoom risk | high | fixed (`text-base`) |
| `components/LeadDrawer.tsx` | Copy bug: field showing `lastContacted` was labeled "נוצר לאחרונה ב" (lit. "last created at"), confusing next to "תאריך יצירה" | medium | fixed → "יצירת קשר אחרונה" |
| `components/LeadDrawer.tsx` | Save/update toast not announced to assistive tech | medium | fixed (`role="status" aria-live="polite"`) |
| `components/LeadDrawer.tsx` | Drawer and convert-modal `role="dialog"` had no accessible name | high | fixed (`aria-labelledby`) |
| `components/LeadDrawer.tsx` | Close button and quick-action pills had no visible focus ring | critical | fixed |
| `components/LeadDrawer.tsx` | Save/confirm buttons showed only `opacity-50` while saving, no text feedback | medium | fixed (button text → "שומר...") |
| `components/LeadDrawer.tsx` | Convert modal Cancel/Confirm buttons had no focus ring | critical | fixed |
| `components/LeadDrawer.tsx` | Convert modal field rows could overflow on narrow screens (long label next to fixed-width input) | medium | fixed (`min-w-0` / `shrink-0`) |
| `components/FilterBar.tsx` | Search/city/niche inputs and selects used `text-sm` (14px) → iOS zoom-on-focus | high | fixed (`text-base`) |
| `components/FilterBar.tsx` | Filter controls had no `aria-label` | high | fixed |
| `components/FilterBar.tsx` | "נקה" (clear filters) button had no focus ring | critical | fixed |
| `components/CommentThread.tsx` | Comment input used `text-sm` (iOS zoom) and had no `aria-label` | high | fixed |
| `components/CommentThread.tsx` | "שלח" send button had no focus ring | critical | fixed |
| `components/LinkedRecordSearch.tsx` | Search input `text-sm` (iOS zoom); no ARIA combobox semantics | high | fixed (`role="combobox"`/`listbox`/`option` wiring) |
| `components/LinkedRecordSearch.tsx` | "הסר קישור" remove button was 14px, far below touch target minimum, no focus ring | critical | fixed (32×32px + focus ring) |
| `components/dashboard/OpenTasksCard.tsx` | "Mark task complete" button was 16×16px, far below touch target minimum | critical | fixed (36×36px hit area via negative margin, visual dot unchanged) |
| `components/dashboard/OpenTasksCard.tsx`, `RecentContactsCard.tsx`, `SalesPerformanceCard.tsx` | `<h3>` used with no `<h2>` ancestor — heading hierarchy skip | medium | fixed (`<h3>`→`<h2>`) |
| `components/dashboard/TopHeader.tsx` | Header search input `text-sm` + no `aria-label` | high | fixed |
| `components/dashboard/TopHeader.tsx` | Notifications bell and "חדש" link had no focus ring | critical | fixed |
| `components/LeadsTabs.tsx` | Tab links had no focus ring and `py-1.5` (~32px) touch target | critical/medium | fixed (focus ring + `py-2`) |

## Pass 2B — Tasks / Roadmap / Auth / Sidebar / Scrape

Scope: `app/tasks/page.tsx`, `app/settings/page.tsx`, `app/login/page.tsx`, `app/layout.tsx`, `components/TaskCard.tsx`, `components/TaskDrawer.tsx`, `components/TasksBoard.tsx`, `components/TasksTabs.tsx`, `components/KanbanBoard.tsx`, `components/KanbanColumn.tsx`, `components/RoadmapCard.tsx`, `components/RoadmapDrawer.tsx`, `components/RoadmapTimeline.tsx`, `components/ChangePasswordForm.tsx`, `components/Sidebar.tsx`, `components/ScrapeForm.tsx`, `components/ScrapeHistory.tsx`.

| File | Issue | Severity | Status |
|---|---|---|---|
| `components/TaskCard.tsx` | "Medium" priority badge (`bg-amber-soft text-amber`) contrast ~1.93:1 | critical | fixed |
| `components/ScrapeForm.tsx` | "Running" scrape status banner same ~1.93:1 contrast failure | critical | fixed (text → `text-foreground`, spinner keeps amber accent) |
| `components/TaskDrawer.tsx`, `components/RoadmapDrawer.tsx` | Status/priority/category/owner/color/date fields had no visible focus ring | critical | fixed |
| `components/RoadmapDrawer.tsx` | Color-swatch picker buttons 24px (below 44px target), 6px gap, no focus ring, English-only `aria-label` | high | fixed (32px, 8px gap, focus ring, `aria-pressed`, Hebrew `COLOR_LABELS_HE`) |
| `components/RoadmapDrawer.tsx` | Subtask row controls had no focus rings and `py-0.5` touch targets | high | fixed |
| `components/Sidebar.tsx` | No focus-visible styling anywhere; mobile menu had no Escape-to-close | high | fixed (focus rings, `aria-current="page"`, 44×44px menu button, Escape handler) |
| `app/login/page.tsx` | No password show/hide toggle; error not announced | high | fixed (Eye/EyeOff toggle, `role="alert" aria-live="assertive"`) |
| `components/ChangePasswordForm.tsx` | No show/hide toggle for 3 password fields; error/success not announced | high | fixed ("הצג סיסמאות" checkbox, `role="alert"`/`role="status"`) |
| `components/RoadmapTimeline.tsx` | Filter pills/"יעד חדש" had no focus ring, no `aria-pressed`, no empty state | medium | fixed |
| `components/TasksTabs.tsx` | Tab links had no focus ring / `aria-current` | medium | fixed |
| `components/TasksBoard.tsx` | "+ משימה חדשה" button had no focus ring | medium | fixed |
| `components/TaskDrawer.tsx`, `components/RoadmapDrawer.tsx` | Disabled fields used `disabled:opacity-50` only, no `disabled:cursor-not-allowed` | low | fixed |
| `components/TaskDrawer.tsx`, `components/RoadmapDrawer.tsx` | Drawer close/delete buttons had no focus ring | medium | fixed |
| `components/RoadmapCard.tsx` | `<h3>` with no `<h2>` ancestor — heading hierarchy skip | medium | fixed (`<h2>`) |
| `components/RoadmapCard.tsx` | Status emoji dot relied on `title` only, not exposed to screen readers | low | fixed (`role="img"` + `aria-label`) |
| `components/ScrapeHistory.tsx` | History table `<th>` missing `scope="col"` | low | fixed |
| `app/layout.tsx` | No skip-link to bypass sidebar nav | low | fixed (`#main-content` skip link) |

## Cross-cutting fixes (applied after both sub-passes, in `app/globals.css` + badge/status components)

Both sub-passes independently flagged the same WCAG AA contrast failures in the shared color tokens (`app/globals.css`), used for priority badges and status text across the whole app:

- `text-amber` on `bg-amber-soft` (Medium priority badge) ≈ **1.93:1**
- `text-warn` on `bg-warn-soft` (High priority badge) ≈ **3.08:1**
- `text-accent-strong` on `bg-accent-soft` (Low priority / "Done"/"Completed" badges) ≈ **4.24:1**
- `text-amber` for Google rating display on white surface ≈ **2.15:1**
- Active tab text (white on `bg-accent`) ≈ **3.68:1**

**Fix applied** — added two new text tokens for use on `-soft` backgrounds, and darkened one existing token:
- `app/globals.css`: added `--color-warn-strong: #b91c1c` and `--color-amber-strong: #b45309`; changed `--color-accent-strong` from `#2563eb` to `#1d4ed8` (still blue, now meets 4.5:1 on `accent-soft` and as button hover background).
- Applied `text-warn-strong` / `text-amber-strong` to all "High"/"Medium" priority badges (`PriorityBadge.tsx`, `CallListTable.tsx`, `TaskCard.tsx`, `dashboard/OpenTasksCard.tsx`) and overdue-date indicators (`TaskCard.tsx`, `dashboard/OpenTasksCard.tsx`).
- Applied `text-amber-strong` to Google rating displays (`CallListTable.tsx`, `LeadCard.tsx`, `LeadDrawer.tsx`) and `ScrapeHistory.tsx`'s "Running"/"Failed" status text (`text-amber-strong`/`text-warn-strong`).
- `components/LeadsTabs.tsx`: active tab background changed `bg-accent` → `bg-accent-strong` for sufficient contrast with white text.
- "Low"/"Completed"/"Done" badges using `text-accent-strong` automatically pass now via the darkened token — no per-file changes needed beyond the ones above.

**Remaining documented-only (need a wider design-system decision)**:
- `text-muted` on `bg-sky-soft` (inactive tab, ≈4.29:1) and `text-muted` on `bg-border`/`bg-background` (≈3.94/4.47:1) are borderline-under 4.5:1. `text-muted` is a very widely-used secondary-text token; rebalancing it is a global palette change best done as its own pass, not piecemeal.
- `components/dashboard/TopHeader.tsx`: header search input and notification bell have no handlers — render as live controls but do nothing. Feature/business-logic decision, not a markup fix.

Also applied for consistency: bumped remaining `text-sm` (14px) form inputs/selects in `components/TaskDrawer.tsx` and `components/RoadmapDrawer.tsx` to `text-base` (16px), matching the iOS-zoom fix already applied to Pass 2A's drawers/forms.

---

## Build / Lint Verification

Run from `C:\Users\itays\Dropbox\איתי\O-I\Agency-CRM`:

- **`npm run lint`** — ✅ Passes. 1 pre-existing warning (not introduced by this review): `react-hooks/exhaustive-deps` in `components/TaskDrawer.tsx:91` (see "Pre-existing, Verified-OK" above).
- **`npm run build`** — ✅ Passes. Next.js 16.2.9 (Turbopack) production build compiles successfully, TypeScript checks pass, all 14 routes (including `/`, `/clients`, `/leads`, `/tasks`, `/settings`, `/login`, and all `/api/*` routes) build successfully.
