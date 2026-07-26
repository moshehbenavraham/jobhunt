# Job-Hunt

AI-powered job search pipeline driven by `AGENTS.md`, checked-in Codex skills, and the repo-owned scripts.

It also includes a Go terminal dashboard and a tracked local React operator app
for browsing and running the same guarded job-search workflows.

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
codex
```

Before `npm run doctor`, copy `profile/cv.example.md` to `profile/cv.md` and edit it with your experience.

If you have public proof points, optionally copy `profile/article-digest.example.md` to `profile/article-digest.md` too.

See the [Setup Guide](docs/SETUP.md) for the detailed walkthrough.

`npm run doctor` validates Node.js, installed dependencies, Playwright Chromium, `profile/cv.md`, `config/profile.yml`, and `config/portals.yml`, then shows the current OpenAI account auth state and the next command to run.

After it passes, you have two normal next steps:

- if you want repo-owned OpenAI runtime flows, run `npm run auth:openai -- login` once from the repo root
- if you already have a job URL or JD, launch `codex` from the repo root and paste it
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
- `npm run cv:build` - generate and validate an evidence-backed ATS PDF
- `npm run cover-letter` - generate an evidence-backed editable cover-letter draft
- `npm run cover-letter:validate` - validate a cover-letter artifact set and freshness
- `npm run pdf:validate` - validate a finished PDF and freshness manifest
- `npm run pdf` - low-level validated HTML-to-PDF rendering
- `npm run latex` - validate and compile an optional LaTeX / Overleaf CV
- `npm run dashboard` - build and launch the Go dashboard
- `npm run app:api:dev` - start the local TypeScript API in watch mode
- `npm run app:web:dev` - start the React operator workbench
- `npm run app:validate` - type-check, test, and bootstrap-check the app
- `npm run app:build` - build the API and web production bundles
- `npm run model:evaluate -- <provider> ...` - run a guarded Gemini, Ollama, or OpenRouter evaluation draft
- `npm run locales:test` - verify canonical EN/DE/FR/JA workflow parity
- `npm run container:test` - verify the pinned container contract
- `npm run backup:run` - back up the ignored local operational store
- `npm run scan` - scan portals for roles
- `npm run scan-state -- --archive-pipeline` - archive or reset scan artifacts
- `npm run codex:smoke -- --json` - validate the raw Codex transport with stored account auth
- `npm run agents:codex:smoke -- --json` - validate the `@openai/agents` runtime path with stored account auth
- `npm run coverage` - measure Node script and dashboard coverage
- `npm run update:check` - check for updater changes

`npm run cv:build` is the default ATS-first resume export. Use
`npm run latex` only when you explicitly want a LaTeX / Overleaf path and have
`pdflatex` available locally, or when you want to hand off the generated `.tex`
file to Overleaf.

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
immediately. Add `-- --lang de`, `fr`, or `ja` to localize the operator chrome
without translating tracker values or report content.

Optional Gemini, Ollama, and OpenRouter evaluation runs share one guarded
adapter and the same Machine Summary/Risk Summary validator:

```bash
npm run model:evaluate -- gemini \
  --model=<model-id> \
  --jd-file=jds/posting.txt \
  --url=https://jobs.example.com/role \
  --report-id=042 \
  --output=reports/042-company-role.md
```

Use the matching `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or local Ollama
configuration. Model IDs are explicit rather than stale hardcoded defaults.
Without `--output`, the validated draft is printed only. With `--output`, the
runner writes a report plus measured-usage manifest under `reports/`; it never
touches the tracker, builds a PDF, sends a message, or submits an application.

For a pinned Node/Go/Chromium environment:

```bash
docker compose build
docker compose up -d workspace
docker compose exec workspace npm run doctor
docker compose --profile smoke run --rm smoke
```

The image build excludes user-layer files. Compose bind-mounts the current
checkout so CV, profile, tracker, reports, output, and local app state remain
on the host.

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
|-- apps/
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
- [Localization](docs/LOCALIZATION.md)
- [Contributing](CONTRIBUTING.md)
- [Docs Index](docs/README-docs.md)

* more in `docs/`

Each significant folder has a `README_<folder-name>.md` with its own documentation.

## Tech Stack

- Node.js - core scripts and pipelines
- Go - dashboard TUI
- TypeScript, React, Vite - local operator app
- Playwright - posting checks and PDF rendering
- Markdown/YAML - prompts, modes, profiles, and tracker metadata
