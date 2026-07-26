---
name: jobhunt
description: Route Job-Hunt job-search tasks in this repository to the correct checked-in mode files and scripts. Use when Codex needs to evaluate a job URL or JD, run the full pipeline, scan portals, generate ATS PDFs, process inbox URLs, review tracker status, compare offers, draft application help, run deep company research, prepare interviews, analyze rejection patterns, or manage follow-up cadence inside this project.
---

# Job Hunt

Route work into the existing Job-Hunt modes and scripts. Do not create a parallel workflow when the repository already contains a mode, script, or template for the task.

## Read Order

Read these files in this order when you need project context beyond the immediate mode:

1. `AGENTS.md` for the startup checklist, onboarding rules, tracker integrity, and operating boundaries.
2. `docs/DATA_CONTRACT.md` when a change touches user data, reports, tracker entries, or update-safe boundaries.
3. `modes/_shared.md` for shared workflow rules, then `modes/_profile.md` for user-specific overrides when the selected mode depends on them.

Read only the mode files needed for the current request.
Use `docs/ARCHITECTURE.md`, `docs/SCRIPTS.md`, and `batch/README.md` only when the task needs repo mechanics.

## Bootstrap

On first use in a session, follow the `AGENTS.md` startup checklist and silently run:

```bash
node scripts/update-system.mjs check
```

If an update is available, tell the user the exact local and remote versions and ask before applying it.

Before substantial Job-Hunt work, verify these files:

- `profile/cv.md` (legacy root `cv.md` also accepted during migration)
- `config/profile.yml`
- `modes/_profile.md`
- `config/portals.yml`

If `modes/_profile.md` is missing, copy `modes/_profile.template.md` into place silently.

If any required file is missing, stop normal job-search work and onboard first. Do not run evaluations, scans, PDFs, or pipeline processing until onboarding is complete.

During onboarding, bootstrap from `config/profile.example.yml` and `config/portals.example.yml`, and create `data/applications.md` from the standard tracker header if it is missing.

If required files are missing for the requested task, report the exact blockers instead of faking a personalized result.

## Data Contract

Keep user-specific changes in these files only:

- `profile/cv.md`
- `config/profile.yml`
- `modes/_profile.md`
- `profile/article-digest.md`
- `config/portals.yml`
- `data/*`
- `reports/*`
- `output/*`
- `interview-prep/*`

Treat these as system files unless the user explicitly wants to change shared defaults:

- `modes/_shared.md`
- mode files other than `modes/_profile.md`
- `scripts/*.mjs`
- `templates/*`
- `dashboard/*`
- `batch/*`

Never put personalization in `modes/_shared.md`.

## Routing

Map the user request to the smallest matching mode set.

- Raw job URL or JD text: read `modes/_shared.md` and `modes/auto-pipeline.md`.
- Single-offer evaluation only: read `modes/_shared.md` and `modes/oferta.md`.
- Compare multiple offers: read `modes/_shared.md` and `modes/ofertas.md`.
- Portal scan: read `modes/_shared.md` and `modes/scan.md`.
- ATS PDF generation: read `modes/_shared.md` and `modes/pdf.md`.
- Cover-letter generation: read `modes/_shared.md` and
  `modes/cover-letter.md`.
- Formal application-email drafting: read `modes/_shared.md` and
  `modes/email.md`.
- Live application assistance: read `modes/_shared.md` and `modes/apply.md`.
- Durable inbound work queue: read `modes/agent-inbox.md`.
- Pipeline inbox processing: read `modes/_shared.md` and `modes/pipeline.md`.
- LinkedIn outreach: read `modes/_shared.md` and `modes/contacto.md`.
- Tracker status or tracker review: read `modes/tracker.md`.
- Deep company research: read `modes/deep.md`.
- Training or certification review: read `modes/training.md`.
- Portfolio project evaluation: read `modes/project.md`.
- Interview preparation: read `modes/interview-prep.md`.
- Time-blocked interview planning: read `modes/interview/plan.md`.
- Mock interview practice: read `modes/interview/practice.md`.
- Completed-interview debrief: read `modes/interview/debrief.md`.
- Interview/company risk review: read `modes/interview-redflag.md`.
- Offer and negotiation preparation: read `modes/offer-prep.md`.
- Skill-gap aggregation or single-JD learning priorities: read
  `modes/upskill.md`.
- Funnel, stage-velocity, ATS, or intermediary analytics: read
  `modes/analytics.md`.
- Rejection-pattern analysis: read `modes/patterns.md`.
- Follow-up cadence or draft generation: read `modes/followup.md`.
- No concrete task: show a short command/menu summary and ask what the user wants to run.

Treat unrecognized free text as `auto-pipeline` when it looks like a job description or job posting URL.

## Language Variants

Always use the canonical files under `modes/`; do not route to copied locale
directories. Resolve human-facing prose from `config/profile.yml ->
language.output` or the user's explicit request. EN, DE, FR, and JA parity is
verified by `npm run locales:test`.

Keep output language independent from `market.ruleset` and the JD language.
Machine Summary keys, enum values, tracker statuses, paths, and commands remain
canonical in every language. See `docs/LOCALIZATION.md`.

## Execution Rules

- Read the selected mode files before acting.
- Prefer the checked-in scripts over rewriting their logic in prose.
- Never auto-submit an application.
- Never add rows directly to `data/applications.md`; use the batch TSV flow and `scripts/merge-tracker.mjs`.
- Use the Playwright-based liveness flow for job checks when available; do not replace it with a generic fetch.
- Save new personalization or lessons learned to `config/profile.yml`, `modes/_profile.md`, or `profile/article-digest.md`.
- Append interview stories to `interview-prep/story-bank.md` only when the relevant mode calls for it.
- Delegate multi-item work only when the runtime supports it and the user explicitly allows delegation.

## Useful Commands

Use the repo's existing commands for validation and maintenance:

```bash
npm run doctor
npm run verify
node scripts/cv-sync-check.mjs
node scripts/verify-pipeline.mjs
node scripts/update-system.mjs check
node scripts/update-system.mjs apply
node scripts/update-system.mjs rollback
```

Use the dashboard only when the environment has Go installed:

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..
```
