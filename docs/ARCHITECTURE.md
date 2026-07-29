# Architecture

## System Overview

```text
Codex CLI / React operator app
  -> AGENTS.md
  -> .codex/skills/career-ops/SKILL.md
  -> modes/*.md
  -> batch/batch-runner.sh
     -> batch/batch-prompt.md
     -> batch/worker-result.schema.json
     -> batch/logs/*.result.json
     -> scripts/merge-tracker.mjs
     -> scripts/verify-pipeline.mjs
  -> scripts/*.mjs
  -> apps/api (local HTTP API, durable jobs, sessions, approvals)
  -> apps/web (React operator workbench)
  -> reports / output / batch tracker files / data/applications.md
```

The repository is organized around a Codex-first agent contract, repo-owned
scripts, and tracker discipline. A tracked local TypeScript API and React
workbench expose the same contracts without replacing the CLI or inventing a
second data model.

## Main Components

### Agent surface

- `AGENTS.md` is the canonical instruction entry point.
- `.codex/skills/career-ops/SKILL.md` is the checked-in skill surface.
- `modes/` contains the task-specific workflow files used by the repo.

### Local operator app

- `apps/api/` owns the local HTTP API, SQLite operational store, durable job
  runner, workflow sessions, approval pauses, structured logs, and guarded
  tool execution.
- `apps/web/` owns the responsive React workbench for Today, Evaluate,
  Pipeline, Tracker, Scan, Batch, Apply Help, Specialists, Artifacts,
  Approvals, onboarding, and settings.
- `.jobhunt-app/` is ignored user-layer runtime state. It can contain the local
  database, logs, and backups and is never auto-updated.
- `npm run app:validate` type-checks the app, runs API tests, and proves a clean
  local bootstrap. `npm run app:build` produces local production bundles.

### Job evaluation pipeline

- User input starts as a JD URL or JD text.
- `scripts/` handles extraction, scoring, evidence-backed PDF generation,
  tracker validation, and update checks.
- Reports are written to `reports/`.
- PDFs and their canonical JSON/HTML/manifest sidecars are written to
  `output/`.
- Tracker data is merged into `data/applications.md`.

### Deterministic PDF pipeline

```text
candidate sources + JD
  -> requirement/evidence matrix
  -> cv-build.json (Zod contract)
  -> evidence and unsupported-term validation
  -> deterministic semantic HTML
  -> Playwright tagged/outlined PDF
  -> qpdf + Poppler + PDF.js (+ Tika in CI) + DOM gate
  -> atomic PDF publication + manifest
  -> tracker/dashboard freshness status
```

- `scripts/cv-build-core.mjs` owns the schema, evidence checks, requirement
  coverage, escaping, and deterministic HTML renderer.
- `scripts/build-cv.mjs` owns artifact and manifest creation.
- `scripts/generate-pdf.mjs` owns Chromium rendering and atomic publication.
- `scripts/pdf-validation-core.mjs` and `scripts/validate-pdf.mjs` validate the
  finished file, not merely the source HTML.
- A manifest becomes stale when the structured build, JD, source files,
  template, rendered HTML, pipeline version, or PDF changes.

### Deterministic cover-letter pipeline

```text
candidate sources + JD + form trigger
  -> evidence-linked cover-letter-build.json
  -> exact-source and quantity validation
  -> editable Markdown + deterministic semantic HTML
  -> optional one-page tagged/outlined PDF
  -> sibling freshness manifest + human-review gate
```

- `scripts/cover-letter-core.mjs` owns the Zod contract, evidence validation,
  deterministic naming, escaping, and Markdown/HTML rendering.
- `scripts/build-cover-letter.mjs` stages and publishes a collision-resistant
  artifact set under `output/`. Existing human-editable drafts are never
  overwritten without `--force`.
- `scripts/validate-cover-letter.mjs` checks the structured build, profile
  sources, template, Markdown, HTML, optional PDF, version, and manifest hashes.
- `modes/cover-letter.md` owns trigger, report, tracker-note, and mandatory
  human-review behavior.

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
- It resolves PDF manifests and labels each tracker PDF as fresh, stale,
  legacy/unverified, invalid, or missing.
- Dashboard and Node tracker writers contend on one canonical
  `jobhunt-tracker-{path-hash}.lock`, replace the tracker atomically, validate
  status labels from `templates/states.yml`, and journal transitions before
  appending `data/status-log.tsv`.

### OpenAI account runtime

- Repo-owned OpenAI runtime paths use stored OpenAI account credentials, not
  `OPENAI_API_KEY`.
- `scripts/openai-account-auth.mjs` owns first-run login, refresh, reauth, and
  logout behavior.
- `scripts/lib/openai-account-auth/codex-transport.mjs` owns the authenticated
  SSE transport to `chatgpt.com/backend-api/codex/responses`.
- `scripts/lib/openai-account-auth/agents-provider.mjs` adapts that transport
  into the `@openai/agents` provider surface.
- The stable operator and maintenance reference for this subsystem lives in
  [OPENAI_ACCOUNT_AUTH.md](OPENAI_ACCOUNT_AUTH.md).

### Optional model providers

- `scripts/model-provider-runner.mjs` is the only Gemini/Ollama/OpenRouter
  evaluation surface. All three providers receive the same canonical context,
  report schema, output-language policy, and human-review/no-action rules.
- Provider calls are bounded, credentials are never placed in URLs or logs,
  Ollama is loopback-only, and mutable provider prices are not hardcoded.
- Output is read-only by default. An explicit save transactionally publishes
  only a validated `reports/*.md` draft and usage manifest; tracker, PDF,
  send, and application-submission flows remain separate guarded commands.

### Localization

- EN/DE/FR/JA use one canonical mode graph with runtime `language.output`
  selection, preventing translated copies from drifting behind safety and
  lifecycle features.
- `market.ruleset` remains independent. Machine keys, enums, tracker values,
  paths, and commands are never translated.
- The Go dashboard has complete typed EN/DE/FR/JA chrome catalogs selected by
  `--lang` or `JOBHUNT_LANG`. See [LOCALIZATION.md](LOCALIZATION.md).

### Reproducible container

- `Dockerfile` pins Node 24.14.0 and Go 1.25.0 and installs the Chromium build
  matching the locked Playwright 1.62.0 package plus the PDF validation tools.
- `.dockerignore` excludes every user-layer surface from image builds.
  `docker-compose.yml` bind-mounts the checkout so user data remains on the
  host and keeps Linux `node_modules` in a named volume.
- `scripts/container-smoke.sh` runs setup doctor, deterministic scan fixtures,
  and the browser-backed PDF contract inside the built image.

### App runtime data flow

```text
apps/web
  -> localhost apps/api routes
  -> startup diagnostics + prompt mode registry
  -> durable sessions/jobs/approvals in .jobhunt-app/
  -> guarded repo tools and scripts
  -> existing user-layer artifacts and tracker flow
```

The API never submits applications or sends outbound messages. Mutating
workflows retain the repo approval and human-review gates.

## Integrity Scripts

| Script                              | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `scripts/test-all.mjs`              | Quick repo validation gate              |
| `scripts/verify-pipeline.mjs`       | Check tracker integrity                 |
| `scripts/merge-tracker.mjs`         | Merge batch TSV additions               |
| `scripts/dedup-tracker.mjs`         | Remove duplicate tracker rows           |
| `scripts/normalize-statuses.mjs`    | Normalize status aliases                |
| `scripts/set-status.mjs`            | Serialize and audit status transitions  |
| `scripts/reserve-report-ids.mjs`    | Reserve IDs across concurrent workflows |
| `scripts/reconcile-pipeline.mjs`    | Prove inbox outcomes before moving URLs |
| `scripts/tracker-parse.mjs`         | Parse customized tracker headers/links  |
| `scripts/tracker-utils.mjs`         | Lock, sanitize, and atomically replace  |
| `scripts/cv-sync-check.mjs`         | Validate setup consistency              |
| `scripts/update-system.mjs`         | Check and apply repo updates            |
| `scripts/build-cv.mjs`              | Build deterministic CV output           |
| `scripts/build-cover-letter.mjs`    | Build deterministic letter artifacts    |
| `scripts/validate-cover-letter.mjs` | Validate letter artifacts and freshness |
| `scripts/validate-pdf.mjs`          | Validate PDF and freshness              |

## Data Flow

```text
profile/cv.md
profile/article-digest.md
config/profile.yml
config/portals.yml
data/openai-account-auth.json
  -> evaluation and scan workflows
  -> scripts/openai-account-auth.mjs
  -> scripts/lib/openai-account-auth/codex-transport.mjs
     -> chatgpt.com/backend-api/codex/responses
  -> scripts/lib/openai-account-auth/agents-provider.mjs
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
