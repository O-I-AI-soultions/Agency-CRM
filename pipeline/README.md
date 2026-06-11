# Lead Pipeline — Apify → Make → Airtable

Finds local businesses with a phone number but **no website**, and drops them into an Airtable CRM as sales leads.

Full plan: [docs/data-pipeline-plan.md](../docs/data-pipeline-plan.md)

## Status checklist

Update these checkboxes as steps complete (see session log rule in [CLAUDE.md](../CLAUDE.md)).

### Step 1 — Account setup
- [ ] Apify free account created
- [ ] Make.com free account created
- [ ] Airtable free account created
- [ ] Airtable base created with columns: Business Name, Phone Number, Rating, Address, Category, Website (empty = lead), Status, Notes, Date Added

### Step 2 — Apify (the Finder)
- [ ] Google Maps scraper actor selected and configured
- [ ] First niche + city chosen for the test run: ______
- [ ] Filter: has phone number, NO website

### Step 3 — Make.com (the Bridge)
- [ ] Scenario created
- [ ] Trigger: Apify run finished / dataset webhook
- [ ] Filter step: drop results that have a website

### Step 4 — Airtable (the CRM)
- [ ] Make output mapped to Airtable columns
- [ ] Deduplication handled (don't re-add same business)

### Step 5 — Test & action
- [ ] Test scrape ran end-to-end
- [ ] Data verified in Airtable
- [ ] First leads reviewed and contacted

## Notes

- Claude sessions have direct MCP connectors for **Apify**, **Make**, and **Airtable** — much of this can be built/verified from inside a Claude session.
- `config/` will hold scraper input configs and field mappings as they stabilize.
