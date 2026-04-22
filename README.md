# Job-Hunt

AI-powered job search pipeline driven by `AGENTS.md`, checked-in Codex skills,
repo-owned scripts, and the app surface under `apps/`, including the review
surfaces for evaluation, reports, pipeline, tracker, and application-help
workflows.

It also includes a Go-based terminal dashboard for browsing and updating the
job-search pipeline.

## Please Do Not Delete This Line. This is a fork of: https://github.com/santifer/career-ops/

## Quick Start

```bash
npm install
npx playwright install chromium
cp config/profile.example.yml config/profile.yml
cp config/portals.example.yml config/portals.yml
cp profile/cv.example.md profile/cv.md
npm run doctor
npm run auth:openai -- login
npm run app:validate
```

Before `npm run doctor`, copy `profile/cv.example.md` to `profile/cv.md` and
edit it with your experience.

If you have public proof points, optionally copy `profile/article-digest.example.md` to `profile/article-digest.md` too.

See the [Setup Guide](docs/SETUP.md) for the detailed walkthrough.

`npm run doctor` validates Node.js, installed dependencies, Playwright Chromium, `profile/cv.md`, `config/profile.yml`, and `config/portals.yml`, then shows the current OpenAI account auth state and the next command to run.

After it passes, you have two normal next steps:

- if you want repo-owned OpenAI runtime flows, run `npm run auth:openai -- login` once from the repo root
- if you want the app surface, run `npm run app:validate`, then `npm run app:web:dev` and `npm run app:api:serve`
- if you already have a job URL or JD and want the legacy CLI workflow, launch `codex` from the repo root and paste it
- if you need discovery first, run `npm run scan`, then review `data/pipeline.md -> ## Shortlist` and start with the top 3 roles

The standard user-layer inputs are:

- `profile/cv.md`
- `config/profile.yml`
- `config/portals.yml`
- `modes/_profile.md`
- `profile/article-digest.md` if you have proof points

## Core Commands

- `npm run doctor` - validate local prerequisites
- `npm run auth:openai -- login` - log in with your OpenAI account for repo-owned Codex runtime flows
- `npm run auth:openai -- status` - inspect whether stored account auth is present or expired
- `npm run auth:openai -- reauth` - replace stored credentials with a fresh login
- `npm run cron:install` - install the repo-managed daily scan cron entry
- `npm run sync-check` - validate CV/profile consistency
- `npm run verify` - check tracker integrity
- `npm run merge` - merge batch tracker additions
- `npm run pdf` - generate an ATS-friendly PDF
- `npm run latex` - validate and compile an optional LaTeX / Overleaf CV
- `npm run dashboard` - build and launch the Go dashboard
- `npm run app:validate` - run the app workspace checks plus the boot smoke test
- `npm run app:boot:test` - verify the live API boot surface from the repo root
- `npm run app:api:serve` - start the long-lived API boot server
- `npm run app:web:dev` - start the web bootstrap shell
- `npm run scan` - scan portals for roles
- `npm run scan-state -- --archive-pipeline` - archive or reset scan artifacts
- `npm run codex:smoke -- --json` - validate the raw Codex transport with stored account auth
- `npm run agents:codex:smoke -- --json` - validate the `@openai/agents` runtime path with stored account auth
- `npm run coverage` - measure Node script and dashboard coverage
- `npm run update:check` - check for updater changes

`npm run pdf` remains the default ATS-first resume export. Use
`npm run latex` only when you explicitly want a LaTeX / Overleaf path and have
`pdflatex` available locally, or when you want to hand off the generated `.tex`
file to Overleaf.

## App Surface

The app surface under `apps/` is the preferred local runtime path. It now
covers startup diagnostics, onboarding repair, approval review, settings,
report viewing, pipeline review, tracker workspace, application-help, and the
long-lived API boot server instead of only the initial scaffold.

- `npm run app:web:dev` - start the React shell with Vite
- `npm run app:web:build` - build the web scaffold into `apps/web/dist`
- `npm run app:api:dev` - run the diagnostics entrypoint with `tsx`
- `npm run app:api:serve` - run the long-lived API boot server with `tsx`
- `npm run app:api:build` - compile the API scaffold into `apps/api/dist`
- `npm run app:check` - run TypeScript checks for both app packages from the repo root
- `npm run app:boot:test` - run the repo boot smoke harness
- `npm run app:validate` - run the app checks and boot smoke together

The surface owns only `apps/web`, `apps/api`, and the repo-root
`.jobhunt-app/` runtime directory. App commands must not create or mutate
user-layer files under `profile/`, `config/`, `data/`, `reports/`, `output/`,
`interview-prep/`, or `jds/`.

The API package exposes the startup, onboarding, approval inbox, settings,
report-viewer, pipeline-review, tracker-workspace, application-help, and
workflow bootstrap routes used by the web shell. The web package renders those
operator surfaces and keeps them read-first against the repo-owned contract.

`npm run scan` is currently an API-first scanner. It uses
`tracked_companies`, `title_filter.positive`, and `title_filter.negative` from
`config/portals.yml`, plus optional scan-time discovery constraints from
`config/profile.yml -> discovery`, to scan supported Greenhouse, Ashby, and
Lever boards directly. It does not execute `search_queries`. It also refreshes
`data/pipeline.md -> ## Shortlist` with bucket counts, campaign guidance, and a
top-10 ranking so discovery does not stop at a raw URL dump.

Use `npm run scan -- --compare-clean` when retuning. That preview ignores old
dedup state from `data/scan-history.tsv`, `data/pipeline.md`, and the tracker so
you can see what the current config would surface from a clean baseline before
refreshing the live shortlist with plain `npm run scan`.

Use `npm run scan-state` only when you intentionally want to archive or reset
`data/pipeline.md` and/or `data/scan-history.tsv`. Normal day-to-day usage
should keep scan history intact and prefer `--compare-clean` for retuning.

If you want discovery refreshed automatically on a machine that holds your user
layer files, run `npm run cron:install`. That installs a daily `npm run scan`
cron entry at `06:00` local host time, calling the checked-in
`scripts/run-scheduled-scan.sh` runner and logging to `tmp/cron/scan.log`.

To launch the dashboard from the repo root, run `npm run dashboard`. It wraps
`./scripts/ux.sh`, builds `dashboard/career-dashboard`, and defaults `--path`
to the repo root so the TUI can read the current tracker and reports
immediately.

## Repository Layout

```text
.
|-- AGENTS.md
|-- config/
|-- profile/
|-- modes/
|-- templates/
|-- scripts/
|-- batch/
|-- dashboard/
|-- docs/
|-- data/
|-- reports/
|-- output/
\-- .spec_system/
```

## Documentation

- [Setup Guide](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Scripts Reference](docs/SCRIPTS.md)
- [Contributing](CONTRIBUTING.md)
- [Docs Index](docs/README-docs.md)
- [API Package README](apps/api/README_api.md)
- [Web Package README](apps/web/README_web.md)

* more in `docs/`

Each significant folder has a `README_<folder-name>.md` with its own documentation.

## Tech Stack

- Node.js - core scripts and pipelines
- Go - dashboard TUI
- Playwright - posting checks and PDF rendering
- Markdown/YAML - prompts, modes, profiles, and tracker metadata
