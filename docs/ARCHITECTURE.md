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
     -> apps/web/src/main.tsx          (React + RouterProvider entry)
     -> apps/web/src/shell/root-layout.tsx  (three-zone shell chrome)
     -> apps/web/src/routes.tsx         (route tree, 18 routes + 404)
     -> apps/web/src/styles/            (tokens.css, base.css, layout.css)
  -> reports / output / data / tracker files
  -> .jobhunt-app/ (app-owned runtime state only)
```

Job-Hunt is a local-first repo that keeps its durable business data in checked-
in files and its operational app state in `.jobhunt-app/`. The app surface
covers startup diagnostics, onboarding repair, evaluation console, report
viewing, pipeline review, tracker workspace, scan review, batch workspace,
specialist workspace, approval inbox, settings, application-help, and workflow
bootstrapping through explicit packages, diagnostics, and boot surfaces. All
operator surfaces use the design token layer and three-zone layout from Phase
01, with dense rows, context rails, and deep-linkable detail routes added in
Phase 02.

## Main Components

### Agent and workflow surface

- `AGENTS.md` is the canonical instruction entry point.
- `.codex/skills/` contains the checked-in skill surface.
- `modes/` contains the task-specific workflow files used by the repo.

### App surface

- `apps/api` owns the diagnostics entrypoint, onboarding summary and repair
  routes, approval inbox routes, settings routes, report-viewer routes,
  pipeline-review routes, tracker-workspace routes, application-help routes,
  workflow bootstrap helpers, and the long-lived boot server.
- `apps/web` owns the React operator shell with:
  - **Design token layer** (`src/styles/tokens.css`, `base.css`, `layout.css`)
    providing the mineral paper palette, Space Grotesk / IBM Plex typography,
    spacing scale, and CSS custom properties for the entire shell.
  - **Three-zone layout** (left navigation rail, center canvas, right evidence
    rail) composed via CSS Grid in `layout.css` with responsive breakpoints
    for desktop (>= 1200px), tablet (768-1199px), and mobile (< 768px).
  - **React Router** (`src/routes.tsx`) with 18 deep-linkable routes (13
    base surfaces plus detail routes for runs, reports, workflows, batches,
    and scans), legacy hash-URL redirect, and a catch-all 404 page.
  - **Shell chrome** (`src/shell/root-layout.tsx`) using `<Outlet />` for
    the center canvas, `ShellContext` for cross-surface navigation callbacks,
    and `useResponsiveLayout` for breakpoint-driven drawer and bottom-nav
    behavior.
  - **Command palette** (`src/shell/command-palette.tsx`) bound to Cmd/Ctrl+K
    with fuzzy search, keyboard navigation, and ARIA-compliant dialog roles.
  - **Responsive components**: `Drawer`, `BottomNav`, and `EvidenceRail`
    adapting across desktop, tablet, and mobile breakpoints.
  - **19 page components** (`src/pages/`) wrapping surface components with
    router-aware props via outlet context and shell context, including detail
    pages for runs, reports, workflows, batches, and scans.
- Package-level docs live in `apps/api/README_api.md` and
  `apps/web/README_web.md`.
- `scripts/test-app-bootstrap.mjs` verifies the live app boot contract from the
  repo root.
- `scripts/test-app-chat-console.mjs`, `scripts/test-app-report-viewer.mjs`,
  `scripts/test-app-pipeline-review.mjs`,
  `scripts/test-app-tracker-workspace.mjs`,
  `scripts/test-app-scan-review.mjs`, `scripts/test-app-batch-workspace.mjs`,
  `scripts/test-app-specialist-workspace.mjs`,
  `scripts/test-app-approval-inbox.mjs`,
  `scripts/test-app-application-help.mjs`,
  `scripts/test-app-settings.mjs`, `scripts/test-app-onboarding.mjs`,
  `scripts/test-app-shell.mjs`, and
  `scripts/test-app-auto-pipeline-parity.mjs` keep the shell surfaces
  aligned with the repo gate.
- `scripts/check-app-ui-copy.mjs` enforces a banned-terms list to prevent
  internal jargon from reaching operator-facing UI strings.

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

The app contract keeps the runtime read-first:

1. `apps/api/src/index.ts` emits one-shot diagnostics for repo readiness.
2. `apps/api/src/server/index.ts` serves `/health`, `/startup`, onboarding,
   approval inbox, settings, report-viewer, pipeline-review, tracker-workspace,
   application-help, and workflow routes for the live boot surface.
3. `apps/web/src/main.tsx` mounts `RouterProvider` with the route tree defined
   in `src/routes.tsx`. The shell chrome lives in `src/shell/root-layout.tsx`
   and renders the three-zone layout, navigation rail, evidence rail, command
   palette, and responsive drawers around the router `<Outlet />`.

The server and web shell inspect the existing repo contract, but they do not
create or mutate user-layer files outside explicit repair actions.

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
  -> reports/ review artifacts
  -> output/ PDFs
  -> batch/tracker-additions/ TSV additions
  -> data/applications.md tracker
```

In batch mode, the runner persists `processing`, `completed`, `partial`,
`failed`, and `skipped` rows in `batch/batch-state.tsv`. The summary shown to
operators derives retryable infrastructure failures from `failed` rows whose
error field starts with `infrastructure:` and whose retry budget is not yet
exhausted.

## Integrity Scripts

| Script                                      | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `scripts/test-all.mjs`                      | Quick repo validation gate                |
| `scripts/test-app-bootstrap.mjs`            | Live app boot smoke test                  |
| `scripts/test-app-chat-console.mjs`         | Chat console and evaluation handoff smoke |
| `scripts/test-app-report-viewer.mjs`        | Report viewer smoke test                  |
| `scripts/test-app-pipeline-review.mjs`      | Pipeline review smoke test                |
| `scripts/test-app-tracker-workspace.mjs`    | Tracker workspace smoke test              |
| `scripts/test-app-scan-review.mjs`          | Scan review smoke test                    |
| `scripts/test-app-batch-workspace.mjs`      | Batch workspace smoke test                |
| `scripts/test-app-specialist-workspace.mjs` | Specialist workspace smoke test           |
| `scripts/test-app-approval-inbox.mjs`       | Approval inbox smoke test                 |
| `scripts/test-app-application-help.mjs`     | Application help smoke test               |
| `scripts/test-app-settings.mjs`             | Settings surface smoke test               |
| `scripts/test-app-onboarding.mjs`           | Onboarding surface smoke test             |
| `scripts/test-app-shell.mjs`                | Shell chrome smoke test                   |
| `scripts/test-app-auto-pipeline-parity.mjs` | Auto-pipeline parity smoke test           |
| `node scripts/test-all.mjs --quick`         | Baseline quick regression gate            |
| `scripts/verify-pipeline.mjs`               | Check tracker integrity                   |
| `scripts/merge-tracker.mjs`                 | Merge batch TSV additions                 |
| `scripts/dedup-tracker.mjs`                 | Remove duplicate tracker rows             |
| `scripts/normalize-statuses.mjs`            | Normalize status aliases                  |
| `scripts/cv-sync-check.mjs`                 | Validate setup consistency                |
| `scripts/update-system.mjs`                 | Check and apply repo updates              |

## Key Decisions

- Keep the repo-owned file contract as the source of truth for domain data.
- Keep app-owned runtime state in `.jobhunt-app/` only.
- Keep the app surface read-first so the web shell and boot server do not
  mutate user-layer files during startup.
- Preserve the current CLI and batch workflows while the app parity effort
  grows.
