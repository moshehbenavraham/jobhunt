# Career-Ops

AI-powered job search pipeline driven by `AGENTS.md` and checked-in Codex skills.

## Quick Start

```bash
npm install
npx playwright install chromium
npm run doctor
codex
```

Open the repo root in `codex`, then paste a job URL or JD text. The standard user-layer inputs are:

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

## Tech Stack

- Node.js - core scripts and pipelines
- Go - dashboard TUI
- Playwright - posting checks and PDF rendering
- Markdown/YAML - prompts, modes, profiles, and tracker metadata

## Project Status

See [.spec_system/PRD/PRD.md](.spec_system/PRD/PRD.md) for the current migration roadmap and remaining phases.
