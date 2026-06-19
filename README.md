# O-I CRM

Internal lead & client management dashboard for **O-I** — a small web agency in Israel.
Hebrew (RTL) interface, built with Next.js and backed entirely by Airtable (no separate
database).

## What it does

- **ניהול לידים (Lead Pipeline)** — a Kanban board of leads pulled from the "Lead
  Tracker" Airtable table, grouped by status (New Lead, Contacted, Pitch Sent, Not
  Interested, plus an "Other" column for stray statuses). Each card shows the business
  name, city, Google rating, phone/website/maps links and notes, with action buttons
  to advance the lead through the pipeline — updates write straight back to Airtable.
- **לקוחות משלמים (Active Clients & Billing)** — a table of converted clients (Client
  Name, Setup Fee, Monthly Retainer, Active/Inactive status), backed by a "Clients"
  table in the same Airtable base. Status can be toggled directly from the table.

Authentication is a single shared password (no user accounts), stored as a signed
session cookie.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- [`airtable`](https://www.npmjs.com/package/airtable) npm package as the data layer

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

### Environment variables

Copy `.env.local.example` to `.env.local` and fill in the real values:

```
AIRTABLE_API_KEY=         # Airtable Personal Access Token with read/write access to the base
AIRTABLE_BASE_ID=         # Airtable base ID (the "O-I-AI-soultions" base)
ITAY_PASSWORD=            # Itay's login password
OMRI_PASSWORD=            # Omri's login password
AUTH_SECRET=              # long random string used to sign session cookies
```

`.env.local` is gitignored and must never be committed.

## Airtable tables used

- **Lead Tracker** — source of truth for the leads Kanban board (`Status` field drives
  the columns).
- **Clients** — Client Name, Setup Fee, Monthly Retainer, Status (Active/Inactive).

## Deployment (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select `O-I-AI-soultions/Agency--CRM`
3. Add all variables from `.env.example` with real values:
   - `AIRTABLE_API_KEY` — Airtable personal access token (Settings → Developer Hub)
   - `AIRTABLE_BASE_ID` — `appecLcxk0qS8mNGV`
   - `ITAY_PASSWORD` / `OMRI_PASSWORD` — each partner's own login password
   - `AUTH_SECRET` — any random 32+ character string used to sign session cookies
   - `APIFY_API_TOKEN` — Apify API token (apify.com → Settings → Integrations)
4. Click Deploy
5. Optional: set a custom domain (e.g. `crm.o-i.co.il`)

Both partners use the same deployed URL and log in with their own name + password.

## Notes

- The Apify → Make → Airtable lead-scraping pipeline that feeds the "Lead Tracker"
  table lives **in this repo**, not in a separate project. The scraping trigger and
  history live under `app/api/scrape/` (`components/ScrapeForm.tsx`,
  `components/ScrapeHistory.tsx`), and pipeline configuration (Apify token, target
  Airtable base, etc.) is managed via the Settings → Pipeline tab
  (`components/settings/PipelineTab.tsx`, `app/api/settings/pipeline/route.ts`).
  There is no separate scraping repo to look for.
