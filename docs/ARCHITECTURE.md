# Architecture

## System Overview

```text
Codex CLI
  -> AGENTS.md
  -> .codex/skills/jobhunt/SKILL.md
  -> modes/*.md
  -> batch/batch-runner.sh
     -> batch/batch-prompt.md
     -> batch/worker-result.schema.json
     -> batch/logs/*.result.json
     -> scripts/merge-tracker.mjs
     -> scripts/verify-pipeline.mjs
  -> scripts/*.mjs
  -> reports / output / batch tracker files / data/applications.md
```

The repository is organized around a Codex-first agent contract, repo-owned scripts, and tracker discipline. The durable product value lives in prompts, modes, templates, and deterministic scripts rather than in a large application server.

## Main Components

### Agent surface

- `AGENTS.md` is the canonical instruction entry point.
- `.codex/skills/jobhunt/SKILL.md` is the checked-in skill surface.
- `modes/` contains the task-specific workflow files used by the repo.

### Job evaluation pipeline

- User input starts as a JD URL or JD text.
- `scripts/` handles extraction, scoring, PDF generation, tracker validation, and update checks.
- Reports are written to `reports/`.
- PDFs are written to `output/`.
- Tracker data is merged into `data/applications.md`.

### Batch processing

- `batch/batch-runner.sh` is the standalone orchestrator for batch evaluation.
- The runner launches workers through `codex exec`, not the legacy worker path.
- `batch/batch-prompt.md` defines the worker prompt, and
  `batch/worker-result.schema.json` defines the structured result contract.
- The authoritative per-offer artifact is the structured result file written to
  `batch/logs/{report_num}-{id}.result.json`.
- Batch outputs still land in the usual repo-owned surfaces:
  `reports/`, `output/`, `batch/tracker-additions/`, and
  `data/applications.md`.
- The operator guide for this flow lives in
  [`batch/README-batch.md`](../batch/README-batch.md).

### Dashboard

- `dashboard/` contains the Go TUI for browsing the pipeline.
- It reads the same tracker and report artifacts as the rest of the repo,
  including report-bearing partial outcomes.

## Integrity Scripts

| Script                           | Purpose                       |
| -------------------------------- | ----------------------------- |
| `scripts/test-all.mjs`           | Quick repo validation gate    |
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
  -> batch/batch-input.tsv
  -> batch/batch-runner.sh
     -> batch/batch-state.tsv
     -> batch/logs/*.result.json
  -> reports/
  -> output/
  -> batch/tracker-additions/
  -> scripts/merge-tracker.mjs
  -> scripts/verify-pipeline.mjs
  -> data/applications.md
```

In batch mode, the runner persists `processing`, `completed`, `partial`,
`failed`, and `skipped` rows in `batch/batch-state.tsv`. The summary shown to
operators derives retryable infrastructure failures from `failed` rows whose
error field starts with `infrastructure:` and whose retry budget is not yet
exhausted.
