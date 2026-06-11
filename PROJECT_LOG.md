# Project Log

A running journal of every working session. Newest entries at the top.
Each entry: what was done, decisions made, next steps.

---

## 2026-06-11 — Project kickoff

**Done:**
- Read the two planning docs (Data Pipeline Building Plan, Web Agency Business Plan) and converted them to markdown in `docs/`.
- Created project structure: CLAUDE.md, README.md, PROJECT_LOG.md, `pipeline/`, `templates/`.
- Set up Claude's persistent memory for this project.
- Installed GitHub CLI (portable, in `%LOCALAPPDATA%\GitHubCLI\bin\gh.exe`), logged in as `sfadiaitay-bit`.
- Found GitHub organization: **O-I-AI-soultions**.
- Created private repo **O-I-AI-soultions/Leads-Pipeline**, pushed initial commit (`main` branch, remote `origin`).

**Decisions:**
- Business name: **O-I**.
- Project docs in English; client-facing content may be Hebrew.
- First focus: the **lead pipeline** (Apify → Make → Airtable).
- One repo per future client site under the GitHub organization.
- Git commit identity: Itay Sfadia <sfadiaitay@gmail.com>.

**Open items:**
- An empty duplicate repo `O-I-AI-soultions/O-I` was accidentally created and could not be deleted (gh token lacks `delete_repo` scope, and `gh auth refresh` kept hanging). Safe to delete manually from github.com Settings whenever convenient.

**Next steps:**
- Pipeline Step 1: confirm free accounts on Apify, Make, Airtable exist.
- Design the Airtable base (Business Name, Phone, Rating, Address, Category, Status, Notes).
- Configure the Apify Google Maps scraper for a first test niche + city.
