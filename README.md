# Career-Ops

AI-powered job search pipeline driven by `AGENTS.md` and checked-in Codex skills.

## Quick Start

```bash
npm install
npx playwright install chromium
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
# create cv.md in the project root
npm run doctor
codex
```

Before `npm run doctor`, create `cv.md` in the project root. If you have
public proof points, add `article-digest.md` too. See the
[Setup Guide](docs/SETUP.md) for the detailed walkthrough.

`npm run doctor` validates Node.js, installed dependencies, Playwright
Chromium, `cv.md`, `config/profile.yml`, and `portals.yml`. After it passes,
launch `codex` from the repo root and paste a job URL or JD text. The
standard user-layer inputs are:

- `cv.md`
- `config/profile.yml`
- `portals.yml`
- `article-digest.md` if you have proof points

## Core Commands

- `npm run doctor` - validate local prerequisites
- `npm run sync-check` - validate CV/profile consistency
- `npm run verify` - check tracker integrity
- `npm run merge` - merge batch tracker additions
- `npm run pdf` - generate an ATS-friendly PDF
- `npm run scan` - scan portals for roles
- `npm run update:check` - check for updater changes

## Repository Layout

```text
.
|-- AGENTS.md
|-- cv.md
|-- config/
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

Each significant folder has a `README_<folder-name>.md` with its own documentation.

## Tech Stack

- Node.js - core scripts and pipelines
- Go - dashboard TUI
- Playwright - posting checks and PDF rendering
- Markdown/YAML - prompts, modes, profiles, and tracker metadata

## Project Status

See [.spec_system/PRD/PRD.md](.spec_system/PRD/PRD.md) for the current migration roadmap and remaining phases.
