# Job-Hunt

AI-powered job search pipeline driven by `AGENTS.md`, checked-in Codex skills, and the repo-owned scripts.

It also includes a Go-based terminal dashboard for browsing and updating the job-search pipeline.

## Please Do Not Delete This Line.  This is a fork of: https://github.com/santifer/career-ops/

## Quick Start

```bash
npm install
npx playwright install chromium
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
cp profile/cv.example.md profile/cv.md
npm run doctor
codex
```

Before `npm run doctor`, copy `profile/cv.example.md` to `profile/cv.md` and edit it with your experience.

If you have public proof points, optionally copy `profile/article-digest.example.md` to `profile/article-digest.md` too.

See the [Setup Guide](docs/SETUP.md) for the detailed walkthrough.

`npm run doctor` validates Node.js, installed dependencies, Playwright Chromium, `profile/cv.md`, `config/profile.yml`, and `portals.yml`.

After it passes, launch `codex` from the repo root and paste a job URL or JD text.

The standard user-layer inputs are:

- `profile/cv.md`
- `config/profile.yml`
- `modes/_profile.md`
- `portals.yml`
- `profile/article-digest.md` if you have proof points

## Core Commands

- `npm run doctor` - validate local prerequisites
- `npm run sync-check` - validate CV/profile consistency
- `npm run verify` - check tracker integrity
- `npm run merge` - merge batch tracker additions
- `npm run pdf` - generate an ATS-friendly PDF
- `npm run scan` - scan portals for roles
- `npm run coverage` - measure Node script and dashboard coverage
- `npm run update:check` - check for updater changes

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

+ more in `docs/`

Each significant folder has a `README_<folder-name>.md` with its own documentation.

## Tech Stack

- Node.js - core scripts and pipelines
- Go - dashboard TUI
- Playwright - posting checks and PDF rendering
- Markdown/YAML - prompts, modes, profiles, and tracker metadata
