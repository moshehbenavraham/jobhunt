# Career-Ops Agent Guide

Use the checked-in Career-Ops modes, scripts, templates, and tracker flow. Do not invent a parallel workflow.

## Startup Checklist (every session)

1. Run the update check silently:

   ```bash
   node scripts/update-system.mjs check
   ```

   Parse the JSON:
   - `update-available`: tell the user `jobhunt update available (v{local} → v{remote}). Your data (CV, profile, tracker, reports) will NOT be touched. Want me to update?`
     - If yes: `node scripts/update-system.mjs apply`
     - If no: `node scripts/update-system.mjs dismiss`
   - `up-to-date`, `dismissed`, `offline`: say nothing
   - If the user explicitly asks to check for updates, run the check again.
   - Roll back with `node scripts/update-system.mjs rollback` if requested.

2. Check setup silently:
   - `cv.md`
   - `config/profile.yml`
   - `modes/_profile.md`
   - `portals.yml`

3. If `modes/_profile.md` is missing, copy `modes/_profile.template.md` to `modes/_profile.md` silently.

4. If any required file is missing, stop normal job-search work and onboard first.

## Onboarding Mode

If setup is incomplete, do not run evaluations, scans, PDFs, or pipeline processing until the basics exist.

1. `cv.md`
   - Ask the user to either paste a CV, share a LinkedIn URL, or describe their experience.
   - Create clean markdown with standard sections: Summary, Experience, Projects, Education, Skills.

2. `config/profile.yml`
   - Copy `config/profile.example.yml` if needed.
   - Collect: full name, email, location, timezone, target roles, salary target.
   - Store identity, targets, narrative, and constraints here.

3. `portals.yml`
   - Copy `templates/portals.example.yml` if needed.
   - Tailor `title_filter.positive` to the user’s target roles.

4. `data/applications.md`
   - If missing, create:

   ```markdown
   # Applications Tracker

   | #   | Date | Company | Role | Score | Status | PDF | Report | Notes |
   | --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |
   ```

5. Learn the user
   - Ask about superpowers, energizers/drains, deal-breakers, best achievement, and public proof points.
   - Save user-specific material in `config/profile.yml`, `modes/_profile.md`, or `article-digest.md`.

6. After onboarding
   - Confirm they can now paste a JD/URL, scan portals, or generate a tailored PDF.
   - If they want recurring scans and no scheduling skill exists, suggest cron or periodic manual scans.

## Data Contract

Read `docs/DATA_CONTRACT.md`.

- User layer: `cv.md`, `config/profile.yml`, `modes/_profile.md`, `article-digest.md`, `portals.yml`, `data/*`, `reports/*`, `output/*`, `interview-prep/*`, `jds/*`
- System layer: `modes/_shared.md`, `modes/**`, `scripts/**`, `templates/**`, `batch/**`, `dashboard/**`, `docs/**`, `AGENTS.md`

Rule:

- Put personalization only in the user layer.
- Do not put user-specific archetypes, targeting, proof points, comp policy, or negotiation scripts into `modes/_shared.md`.
- If changing shared defaults for everyone, update the system-layer files that implement them, including `batch/batch-prompt.md` when relevant.

## Sources Of Truth

Read these before evaluation work:

- `modes/_shared.md`
- `modes/_profile.md`
- `config/profile.yml`
- `cv.md`
- `article-digest.md` if present

Rules:

- Never invent experience or metrics.
- If `article-digest.md` conflicts with `cv.md` on proof-point metrics, prefer `article-digest.md`.
- Learn from user feedback after evaluations by updating `config/profile.yml`, `modes/_profile.md`, or `article-digest.md`.

## Routing

Treat a pasted JD or job URL as full auto-pipeline unless the user explicitly asks for evaluation only.

Always read `modes/_shared.md` first, then `modes/_profile.md`, then the relevant mode:

| User intent                      | Mode file                 |
| -------------------------------- | ------------------------- |
| Raw JD text or job URL           | `modes/auto-pipeline.md`  |
| Single evaluation only           | `modes/oferta.md`         |
| Compare offers                   | `modes/ofertas.md`        |
| Scan portals                     | `modes/scan.md`           |
| Generate ATS PDF                 | `modes/pdf.md`            |
| Live application help            | `modes/apply.md`          |
| Process `data/pipeline.md`       | `modes/pipeline.md`       |
| Tracker status                   | `modes/tracker.md`        |
| Deep company research            | `modes/deep.md`           |
| LinkedIn outreach                | `modes/contacto.md`       |
| Interview prep                   | `modes/interview-prep.md` |
| Training or certification review | `modes/training.md`       |
| Project idea review              | `modes/project.md`        |
| Batch evaluation                 | `modes/batch.md`          |
| Rejection pattern analysis       | `modes/patterns.md`       |
| Follow-up cadence                | `modes/followup.md`       |

## Operating Rules

- Never submit an application for the user.
- Strongly discourage low-fit applications. Below `4.0/5`, recommend against applying unless the user explicitly overrides.
- Keep output in the JD language or the user’s requested language.
- Use `npm run doctor` for setup validation when needed.
- Use `docs/ARCHITECTURE.md`, `docs/SCRIPTS.md`, and `batch/README.md` for repo mechanics instead of copying their contents into new instructions.

## Job Verification

Do not trust generic search or fetch alone to decide whether a posting is still active when Playwright/Chromium is available.

Preferred order:

1. Browser automation / Playwright on the live posting
2. `npm run liveness -- <url>` if you need a local scripted check
3. Batch-mode fallback only when Playwright is unavailable

Rules:

- A live posting needs real JD content, not just a navbar/footer shell.
- In batch/headless workflows where Playwright is unavailable, add `**Verification:** unconfirmed (batch mode)` to the report header.

## Tracker And Report Integrity

- Never add a new tracker row directly to `data/applications.md`.
- For each new evaluation, write one TSV file to `batch/tracker-additions/{num}-{company-slug}.tsv`.
- TSV column order is:
  `num	date	company	role	status	score	pdf	report	notes`
- Do not create duplicate company+role entries. Update the existing row if the company and role already exist.
- You may edit existing tracker rows to update status or notes.
- Status values must come from `templates/states.yml`.
- Every report must include `**URL:**` and `**Legitimacy:**` in the header.
- After batch work or whenever pending TSVs exist, run:

  ```bash
  node scripts/merge-tracker.mjs
  node scripts/verify-pipeline.mjs
  ```

- Use `node scripts/normalize-statuses.mjs` or `node scripts/dedup-tracker.mjs` when cleanup is needed.

## Personalization Rules

Common user-specific changes belong here:

- archetypes, narrative, negotiation, location policy, scoring preference: `modes/_profile.md` or `config/profile.yml`
- target companies and queries: `portals.yml`
- proof points and public metrics: `article-digest.md`
- CV content: `cv.md`

Do not modify `modes/_shared.md` for user-specific customization.

## Useful Files

- `docs/DATA_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/SCRIPTS.md`
- `templates/states.yml`
- `templates/cv-template.html`
- `batch/README.md`
