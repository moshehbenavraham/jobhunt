# Architecture

## System Overview

```text
Repo instructions and scripts
  -> AGENTS.md
  -> .codex/skills/
  -> modes/*.md
  -> scripts/*.mjs
  -> batch/
  -> apps/
     -> apps/api/src/index.ts
     -> apps/api/src/server/index.ts
     -> apps/web/src/App.tsx
  -> reports / output / data / tracker files
  -> .jobhunt-app/ (app-owned runtime state only)
```

Job-Hunt is a local-first repo that keeps its durable business data in checked-
in files and its operational app state in `.jobhunt-app/`. Phase 00 introduced
the app scaffold so the runtime contract can move from process-relative CLI
behavior to explicit packages, diagnostics, and boot surfaces.

## Main Components

### Agent and workflow surface

- `AGENTS.md` is the canonical instruction entry point.
- `.codex/skills/` contains the checked-in skill surface.
- `modes/` contains the task-specific workflow files used by the repo.

### App scaffold

- `apps/api` owns the diagnostics entrypoint and the long-lived boot server.
- `apps/web` owns the React bootstrap shell that renders startup state.
- Package-level docs live in `apps/api/README_api.md` and
  `apps/web/README_web.md`.
- `scripts/test-app-bootstrap.mjs` verifies the live app boot contract from the
  repo root.
- `scripts/test-app-scaffold.mjs` keeps the scaffold and diagnostics contract
  aligned with the repo gate.

### Job evaluation pipeline

- User input starts as a JD URL or JD text.
- `scripts/` handles extraction, scoring, PDF generation, tracker validation,
  update checks, and other deterministic repo operations.
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

### Dashboard

- `dashboard/` contains the Go TUI for browsing the pipeline.
- It reads the same tracker and report artifacts as the rest of the repo.

### OpenAI account runtime

- Repo-owned OpenAI runtime paths use stored OpenAI account credentials, not
  `OPENAI_API_KEY`.
- `scripts/openai-account-auth.mjs` owns first-run login, refresh, reauth, and
  logout behavior.
- `scripts/lib/openai-account-auth/codex-transport.mjs` owns the authenticated
  SSE transport to `chatgpt.com/backend-api/codex/responses`.
- `scripts/lib/openai-account-auth/agents-provider.mjs` adapts that transport
  into the `@openai/agents` provider surface.

## App Boot Surface

The phase 00 app contract splits startup into three checks:

1. `apps/api/src/index.ts` emits one-shot diagnostics for repo readiness.
2. `apps/api/src/server/index.ts` serves `/health` and `/startup` for the live
   boot surface.
3. `apps/web/src/App.tsx` renders loading, ready, missing-prerequisites,
   offline, and runtime-error states from the startup payload.

This design keeps the runtime read-first. The server and web shell inspect the
existing repo contract, but they do not create or mutate user-layer files.

## Data Flow

```text
profile/cv.md
profile/article-digest.md
config/profile.yml
config/portals.yml
.jobhunt-app/
  -> diagnostics and app boot
  -> repo-root contract checks
  -> web shell startup state
scripts/
  -> reports/
  -> output/
  -> batch/tracker-additions/
  -> data/applications.md
```

In batch mode, the runner persists `processing`, `completed`, `partial`,
`failed`, and `skipped` rows in `batch/batch-state.tsv`. The summary shown to
operators derives retryable infrastructure failures from `failed` rows whose
error field starts with `infrastructure:` and whose retry budget is not yet
exhausted.

## Integrity Scripts

| Script | Purpose |
| ------ | ------- |
| `scripts/test-all.mjs` | Quick repo validation gate |
| `scripts/test-app-bootstrap.mjs` | Live app boot smoke test |
| `scripts/test-app-scaffold.mjs` | Scaffold and diagnostics regression check |
| `scripts/verify-pipeline.mjs` | Check tracker integrity |
| `scripts/merge-tracker.mjs` | Merge batch TSV additions |
| `scripts/dedup-tracker.mjs` | Remove duplicate tracker rows |
| `scripts/normalize-statuses.mjs` | Normalize status aliases |
| `scripts/cv-sync-check.mjs` | Validate setup consistency |
| `scripts/update-system.mjs` | Check and apply repo updates |

## Key Decisions

- Keep the repo-owned file contract as the source of truth for domain data.
- Keep app-owned runtime state in `.jobhunt-app/` only.
- Keep the app scaffold read-first so the web shell and boot server do not
  mutate user-layer files during startup.
- Preserve the current CLI and batch workflows while the app parity effort
  grows.
