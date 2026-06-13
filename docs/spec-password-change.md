# Spec: Airtable-Backed Password Change Feature

## Context

The CRM has two partners — `"איתי"` (Itay) and `"עומרי"` (Omri). Passwords are currently stored as Vercel environment variables (`ITAY_PASSWORD`, `OMRI_PASSWORD`). The goal is to move password storage to Airtable so either partner can change their password from inside the CRM without touching Vercel.

Auth uses HMAC session tokens (see `lib/auth.ts`). Login lives in `app/api/login/route.ts`.

---

## What to build

### 1. Airtable table: `Partners`

Create a new table in the existing Airtable base (`appecLcxk0qS8mNGV`) called **`Partners`** with these fields:

| Field name     | Type   | Notes                                  |
|-----------------|--------|----------------------------------------|
| `Name`          | Text   | Primary field. Values: `"איתי"`, `"עומרי"` |
| `PasswordHash`  | Text   | bcrypt hash (~60 chars), never plaintext |

Pre-populate with two rows, one per partner:
- `"איתי"` → choose a fresh, strong password at seed time (do NOT reuse any password that has ever appeared in this repo/spec). Hash it with `bcryptjs.hashSync(password, 12)` before inserting. Communicate the plaintext to Itay out-of-band only — never write it to disk/repo.
- `"עומרי"` → leave empty (Omri keeps logging in via his existing `OMRI_PASSWORD` env var until he sets his own password via `/settings`).

Use `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` from env (already present in the codebase via `lib/airtable.ts`).

---

### 2. Update `app/api/login/route.ts`

Replace the env-var password lookup with an Airtable lookup + bcrypt compare:

```ts
// Instead of:
const PARTNER_PASSWORDS: Record<Partner, string | undefined> = {
  "איתי": process.env.ITAY_PASSWORD,
  "עומרי": process.env.OMRI_PASSWORD,
};

// Do this: fetch the partner's bcrypt hash from the Partners table
async function getPartnerPasswordHash(partner: Partner): Promise<string | null> {
  // Query Airtable Partners table, filter by Name = partner
  // Return the PasswordHash field value, or null if not found / empty
}
// Then: bcrypt.compare(password, storedHash)
```

Use the existing Airtable client pattern from `lib/airtable.ts`.

If the `Partners` table row doesn't exist or `PasswordHash` is empty, return `{ error: "סיסמה שגויה" }` with status 401 (except Omri's temporary `OMRI_PASSWORD` env-var fallback until he sets his own password).

---

### 3. New API route: `app/api/change-password/route.ts`

**POST** — requires an active session (the caller must be logged in).

Request body:
```json
{ "currentPassword": "...", "newPassword": "..." }
```

Logic:
1. Read the session cookie to identify the calling partner (use `getPartnerFromSession` from `lib/auth.ts`).
2. If no valid session → 401.
3. Fetch the current password hash for that partner from Airtable.
4. Compare `currentPassword` to the stored hash via `bcrypt.compare`. If wrong → 401 with `{ error: "סיסמה שגויה" }`.
5. Validate `newPassword`: minimum 8 characters. If invalid → 400 with `{ error: "הסיסמה חייבת להכיל לפחות 8 תווים" }`.
6. Hash `newPassword` with bcrypt (cost 12) and write to the partner's `PasswordHash` field in Airtable.
7. Return `{ ok: true }`.

Partners can only change **their own** password (enforced by reading the session — no partner field in the request body).

---

### 4. UI: Change Password page

Route: `/settings` (new page, or add a settings section accessible from the nav/header).

The page should:
- Show the currently logged-in partner's name (from session).
- Have three fields: **Current Password**, **New Password**, **Confirm New Password**.
- Validate client-side that New Password === Confirm New Password before submitting.
- On submit, call `POST /api/change-password`.
- Show a success message in Hebrew on success: `"הסיסמה שונתה בהצלחה"`.
- Show the API error message on failure.
- After a successful change, do NOT log the user out — their session remains valid.

Link to this page from the existing layout (e.g. a "הגדרות" link in the header/sidebar, visible to the logged-in partner).

---

## Files to create / modify

| File | Action |
|------|--------|
| `app/api/change-password/route.ts` | Create |
| `app/settings/page.tsx` | Create |
| `app/api/login/route.ts` | Modify — replace env-var lookup with Airtable lookup |
| `lib/airtable.ts` | Possibly modify — add a `getPartnerPassword` and `updatePartnerPassword` helper |
| `app/layout.tsx` or nav component | Modify — add "הגדרות" link |

---

## Security notes

- Passwords are stored as bcrypt hashes (cost 12) in Airtable — never plain text.
- `ITAY_PASSWORD` can be removed from Vercel once Itay's Airtable-based login is verified.
- `OMRI_PASSWORD` stays as a temporary fallback until Omri sets his own password via `/settings`, then can be removed.
- The `Partners` table should not be exposed to any public API route — only accessed server-side.
- Always verify the session before allowing a password change — never trust a partner name from the request body.
- No brute-force lockout: 2-user internal tool, bcrypt cost 12 + HMAC session cookies is sufficient.

---

## Env vars after this change

Required in both Vercel and `.env.local`:
```
AIRTABLE_API_KEY=...
AIRTABLE_BASE_ID=appecLcxk0qS8mNGV
AUTH_SECRET=...
```

Remove after migration:
```
ITAY_PASSWORD              # remove once Itay's Airtable login verified
OMRI_PASSWORD               # remove once Omri sets his own password via /settings
```

---

## Done when

- [ ] `Partners` table exists in Airtable with both rows
- [ ] Login works by reading from Airtable (not env vars)
- [ ] `POST /api/change-password` works and updates Airtable
- [ ] `/settings` page lets the logged-in partner change their password
- [ ] Old password env vars removed from Vercel
