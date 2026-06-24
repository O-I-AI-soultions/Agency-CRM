# Needs Itay (manual follow-ups)

Items the autonomous backlog-closeout run (tasks 1-8) could not complete and need a human with web-UI/account access.

- **Delete the duplicate GitHub repo.** The local `origin` remote in this repo points to `O-I-AI-soultions/Agency--CRM` (double-dash). GitHub now redirects pushes/fetches from `Agency--CRM` to the canonical `O-I-AI-soultions/Agency-CRM` (single dash), confirmed by the `remote: This repository moved. Please use the new location...` message seen during this run's pushes. The duplicate/old repo named `Agency--CRM` still exists (confirmed via `gh repo view O-I-AI-soultions/Agency--CRM`, read-only) and should be deleted:
  1. Go to `github.com/O-I-AI-soultions/Agency--CRM` → Settings → scroll to "Delete this repository" → follow the confirmation steps.
     (The `gh` CLI token used in this session has scopes `gist`, `read:org`, `repo` — no `delete_repo` scope — so this could not be automated; confirmed by successfully reading the repo but not attempting any delete call.)
  2. After deleting, update the local git remote so future pushes go to the canonical repo directly:
     ```
     git remote set-url origin https://github.com/O-I-AI-soultions/Agency-CRM.git
     ```

- **Add Omri as a Google OAuth test user** in Google Cloud Console (OAuth consent screen → Test users). Required before Omri can use the Google Connect flow in Settings → Integrations.

- **Mark "first leads reviewed and contacted"** in `pipeline/README.md` (parent O-I repo). This is a sales action — actually calling/messaging the scraped leads — not a code task, and is intentionally left unchecked here.

- **Airtable schema items are already fine — no action needed:**
  - The `Notes` table (Partner / Content / Updated At fields) was already correctly configured (verified in Task 2).
  - The Lead Tracker `Status` field already had "Converted" as a valid select option (verified in Task 3).

- **Branch cleanup status:** `feature/lead-pipeline-kanban-dashboard` was confirmed fully merged into `main` (all its commits are reachable from `main`; `git log main..feature/lead-pipeline-kanban-dashboard` and `git cherry main feature/lead-pipeline-kanban-dashboard` were both empty) and has been **deleted** locally as part of this hygiene pass. No manual action needed.
