# Job-Hunt Agent Guide

Use the checked-in Job-Hunt modes, scripts, templates, and tracker flow. Do not invent a parallel workflow.

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
   - `profile/cv.md` (legacy root `cv.md` also accepted during migration)
   - `config/profile.yml`
   - `modes/_profile.md`
   - `config/portals.yml`

3. If `modes/_profile.md` is missing, copy `modes/_profile.template.md` to `modes/_profile.md` silently.

4. If any required file is missing, stop normal job-search work and onboard first.

## Onboarding Mode

If setup is incomplete, do not run evaluations, scans, PDFs, or pipeline processing until the basics exist.

1. `profile/cv.md` (legacy root `cv.md` also accepted during migration)
   - Ask the user to either paste a CV, share a LinkedIn URL, or describe their experience.
   - Create clean markdown with standard sections: Summary, Experience, Projects, Education, Skills.

2. `config/profile.yml`
   - Copy `config/profile.example.yml` if needed.
   - Collect: full name, email, location, timezone, target roles, salary target.
   - Store identity, targets, narrative, and constraints here.

3. `config/portals.yml`
   - Copy `config/portals.example.yml` if needed.
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
   - Save user-specific material in `config/profile.yml`, `modes/_profile.md`, or `profile/article-digest.md`.

6. After onboarding
   - Confirm they can now paste a JD/URL, scan portals, or generate a tailored PDF.
   - If they want recurring scans and no scheduling skill exists, suggest cron or periodic manual scans.

## Data Contract

Read `docs/DATA_CONTRACT.md`.

- User layer: `profile/cv.md`, legacy root `cv.md`, `profile/article-digest.md`, `config/profile.yml`, `config/portals.yml`, `modes/_profile.md`, `data/*`, `reports/*`, `output/*`, `interview-prep/*`, `jds/*`
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
- `profile/cv.md` (legacy root `cv.md` also accepted during migration)
- `profile/article-digest.md` if present (legacy root `article-digest.md` also accepted)

Rules:

- Never invent experience or metrics.
- If `profile/article-digest.md` conflicts with `profile/cv.md` on proof-point metrics, prefer `profile/article-digest.md`.
- Learn from user feedback after evaluations by updating `config/profile.yml`, `modes/_profile.md`, or `profile/article-digest.md`.

## Routing

Treat a pasted JD or job URL as full auto-pipeline unless the user explicitly asks for evaluation only.

Always read `modes/_shared.md` first, then `modes/_profile.md`, then the relevant mode:

| User intent                       | Mode file                     |
| --------------------------------- | ----------------------------- |
| Raw JD text or job URL            | `modes/auto-pipeline.md`      |
| Single evaluation only            | `modes/oferta.md`             |
| Compare offers                    | `modes/ofertas.md`            |
| Scan portals                      | `modes/scan.md`               |
| Generate ATS PDF                  | `modes/pdf.md`                |
| Generate cover letter             | `modes/cover-letter.md`       |
| Live application help             | `modes/apply.md`              |
| Formal application email          | `modes/email.md`              |
| Durable inbound review queue      | `modes/agent-inbox.md`        |
| Process `data/pipeline.md`        | `modes/pipeline.md`           |
| Tracker status                    | `modes/tracker.md`            |
| Deep company research             | `modes/deep.md`               |
| LinkedIn outreach                 | `modes/contacto.md`           |
| Interview prep                    | `modes/interview-prep.md`     |
| Interview plan                    | `modes/interview/plan.md`     |
| Interview practice                | `modes/interview/practice.md` |
| Interview debrief                 | `modes/interview/debrief.md`  |
| Interview risk review             | `modes/interview-redflag.md`  |
| Offer and negotiation prep        | `modes/offer-prep.md`         |
| Skill-gap/upskill report          | `modes/upskill.md`            |
| Funnel/velocity/channel analytics | `modes/analytics.md`          |
| Training or certification review  | `modes/training.md`           |
| Project idea review               | `modes/project.md`            |
| Batch evaluation                  | `modes/batch.md`              |
| Rejection pattern analysis        | `modes/patterns.md`           |
| Follow-up cadence                 | `modes/followup.md`           |

## Operating Rules

- Never submit an application for the user.
- Strongly discourage low-fit applications. Below `4.0/5`, recommend against applying unless the user explicitly overrides.
- Resolve `language.output` and `market.ruleset` independently through
  `scripts/evaluation-policy.mjs`. The configured output language wins; market
  rules never select report language.
- Use `npm run doctor` for setup validation when needed.
- Use `docs/ARCHITECTURE.md`, `docs/SCRIPTS.md`, and `batch/README-batch.md` for repo mechanics instead of copying their contents into new instructions.

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
- Update existing tracker statuses with `node scripts/set-status.mjs`; it
  validates `templates/states.yml`, serializes the write, and records
  `data/status-log.tsv`. Use direct maintenance scripts only for normalization
  or deduplication.
- Status values must come from `templates/states.yml`.
- Every report must include `**URL:**` and `**Legitimacy:**` in the header.
- Every new evaluation report must pass
  `node scripts/evaluation-summary.mjs <report>` and include the versioned
  Machine Summary plus fixed-order, source-attributed Risk Summary.
- Default tailored PDFs must be built with `scripts/build-cv.mjs`. Mark a
  tracker PDF as present only when its sibling manifest exists, is fresh, and
  has `validation.valid: true`.
- After batch work or whenever pending TSVs exist, run:

  ```bash
  node scripts/merge-tracker.mjs
  node scripts/verify-pipeline.mjs
  ```

- After batch processing also run
  `node scripts/reconcile-pipeline.mjs`; it removes pending inbox entries only
  when batch state, report, and tracker evidence agree.

- Use `node scripts/normalize-statuses.mjs` or `node scripts/dedup-tracker.mjs` when cleanup is needed.

## Personalization Rules

Common user-specific changes belong here:

- archetypes, narrative, negotiation, location policy, scoring preference: `modes/_profile.md` or `config/profile.yml`
- target companies and queries: `config/portals.yml`
- proof points and public metrics: `profile/article-digest.md`
- CV content: `profile/cv.md`

Do not modify `modes/_shared.md` for user-specific customization.

## Useful Files

- `docs/DATA_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/SCRIPTS.md`
- `templates/states.yml`
- `templates/cv-build.schema.json`
- `templates/cv-template.html`
- `scripts/build-cv.mjs`
- `scripts/validate-pdf.mjs`
- `batch/README.md`
