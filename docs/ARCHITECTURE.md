# Architecture

## System Overview

```text
Codex CLI
  -> AGENTS.md
  -> .codex/skills/career-ops/SKILL.md
  -> modes/*.md
  -> scripts/*.mjs
  -> reports / output / batch tracker files / data/applications.md
```

The repository is organized around a Codex-first agent contract, repo-owned scripts, and tracker discipline. The durable product value lives in prompts, modes, templates, and deterministic scripts rather than in a large application server.

## Main Components

### Agent surface

- `AGENTS.md` is the canonical instruction entry point.
- `.codex/skills/career-ops/SKILL.md` is the checked-in skill surface.
- `modes/` contains the task-specific workflow files used by the repo.

### Job evaluation pipeline

- User input starts as a JD URL or JD text.
- `scripts/` handles extraction, scoring, PDF generation, tracker validation, and update checks.
- Reports are written to `reports/`.
- PDFs are written to `output/`.
- Tracker data is merged into `data/applications.md`.

### Batch processing

- `batch/batch-runner.sh` orchestrates batch runs.
- `batch/batch-prompt.md` defines the worker prompt.
- Batch outputs are merged through `scripts/merge-tracker.mjs` and checked with `scripts/verify-pipeline.mjs`.

### Dashboard

- `dashboard/` contains the Go TUI for browsing the pipeline.
- It reads the same tracker and report artifacts as the rest of the repo.

## Integrity Scripts

| Script                           | Purpose                       |
| -------------------------------- | ----------------------------- |
| `scripts/verify-pipeline.mjs`    | Check tracker integrity       |
| `scripts/merge-tracker.mjs`      | Merge batch TSV additions     |
| `scripts/dedup-tracker.mjs`      | Remove duplicate tracker rows |
| `scripts/normalize-statuses.mjs` | Normalize status aliases      |
| `scripts/cv-sync-check.mjs`      | Validate setup consistency    |
| `scripts/update-system.mjs`      | Check and apply repo updates  |

## Data Flow

```text
cv.md
article-digest.md
config/profile.yml
portals.yml
  -> evaluation and scan workflows
  -> reports/
  -> output/
  -> batch/tracker-additions/
  -> data/applications.md
```
