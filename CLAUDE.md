# O-I — AI-Powered Web Agency & Lead Pipeline

## What this project is

O-I is a two-person business with two connected tracks:

1. **Lead pipeline** (current focus): an automated pipeline — Apify (Google Maps scraper) → Make.com → Airtable (CRM) — that finds local businesses that have a phone number but **no website**. These are the agency's sales leads. Full plan: [docs/data-pipeline-plan.md](docs/data-pipeline-plan.md), working checklist: [pipeline/README.md](pipeline/README.md).
2. **Web agency**: a studio selling template-based websites to small businesses, built fast with Claude Code, with a monthly hosting/maintenance plan for recurring revenue. Full plan: [docs/business-plan.md](docs/business-plan.md), templates: [templates/README.md](templates/README.md).

The tracks feed each other: the pipeline finds businesses without websites; the agency sells them one.

Market: **Israel**. Pricing in NIS (₪). Suggested starting prices: basic site ₪1,500–₪3,000; monthly plan ₪150–₪300.

## Conventions

- Project docs and code are in **English**. Client-facing content may be in Hebrew.
- Two partners collaborate via GitHub — pull before working, commit with clear messages.
- Future client sites: **one repo per client** under the GitHub organization.
- Available MCP connectors in Claude sessions: Apify, Make, Airtable (plus Notion, Gmail, Calendar) — use them directly when working on the pipeline.

## Session log rule (important)

**At the end of every working session, append a dated entry to [PROJECT_LOG.md](PROJECT_LOG.md)** with:
- What was done
- Decisions made
- Open questions / next steps

Also update the status checkboxes in [pipeline/README.md](pipeline/README.md) (and other track READMEs) when steps are completed. This keeps both partners and future Claude sessions in sync.

## Repository layout

```
CLAUDE.md          — this file
README.md          — project overview
PROJECT_LOG.md     — running session journal (append every session)
docs/              — source plans converted from Word
pipeline/          — lead-pipeline track: configs, checklist
templates/         — web-agency site templates (later phase)
```
