# Task Checklist

**Session ID**: `phase04-session03-report-viewer-and-artifact-browser`
**Total Tasks**: 18
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-22

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other `[P]` tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 3 | 3 | 0 |
| Foundation | 5 | 5 | 0 |
| Implementation | 6 | 6 | 0 |
| Testing | 4 | 4 | 0 |
| **Total** | **18** | **18** | **0** |

---

## Setup (3 tasks)

Define the report-viewer contract and browser-facing parsing boundary before
wiring the new shell surface.

### apps/api

- [x] T001 [S0403] [P] Create typed report-viewer payloads, selected-report
      metadata, and recent-artifact item shapes with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/server/report-viewer-contract.ts`)

### apps/web

- [x] T002 [S0403] [P] Create browser report-viewer payload types and parser
      helpers with types matching declared contract and exhaustive enum
      handling (`apps/web/src/reports/report-viewer-types.ts`)
- [x] T003 [S0403] Create the report-viewer client and URL-backed focus helpers
      with timeout, retry-backoff, and failure-path handling
      (`apps/web/src/reports/report-viewer-client.ts`)

---

## Foundation (5 tasks)

Build the bounded list-plus-detail read model and attach it to a real shell
surface.

### apps/api

- [x] T004 [S0403] Create the report-viewer summary scaffolding for allowlisted
      selected-report reads, bounded recent-artifact listing, and explicit
      empty-state handling with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/server/report-viewer-summary.ts`)
- [x] T005 [S0403] Create the GET-only report-viewer route and register it in
      the shared route registry with schema-validated input and explicit error
      mapping (`apps/api/src/server/routes/report-viewer-route.ts`,
      `apps/api/src/server/routes/index.ts`)

### apps/web

- [x] T006 [S0403] [P] Create the report-viewer hook for selected-report
      refresh, latest-report fallback, and request cleanup on scope exit for
      all acquired resources (`apps/web/src/reports/use-report-viewer.ts`)
- [x] T007 [S0403] [P] Create the artifact-review surface for recent artifact
      browsing, report metadata, and markdown review with explicit loading,
      empty, error, and offline states
      (`apps/web/src/reports/report-viewer-surface.tsx`)
- [x] T008 [S0403] Register the artifact-review shell surface and navigation
      affordance with platform-appropriate accessibility labels, focus
      management, and input support (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/navigation-rail.tsx`)

---

## Implementation (6 tasks)

Keep the report viewer read-only, deterministic, and aligned with Session 02
handoff behavior.

### apps/api

- [x] T009 [S0403] Implement allowlisted report-path validation and explicit
      missing-artifact mapping so only canonical `reports/` markdown is
      readable with authorization enforced at the boundary closest to the
      resource (`apps/api/src/server/report-viewer-summary.ts`,
      `apps/api/src/server/routes/report-viewer-route.ts`)
- [x] T010 [S0403] Implement recent report and PDF artifact browsing with
      bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/report-viewer-summary.ts`)
- [x] T011 [S0403] Implement report header extraction and markdown document
      normalization without exposing raw filesystem internals with explicit
      error mapping (`apps/api/src/server/report-viewer-summary.ts`)

### apps/web

- [x] T012 [S0403] Wire the artifact-review shell surface into the existing
      frame with state reset or revalidation on re-entry
      (`apps/web/src/shell/operator-shell.tsx`)
- [x] T013 [S0403] Wire selected-report state to URL-backed focus, latest-report
      fallback, and recent-artifact selection with state reset or revalidation
      on re-entry (`apps/web/src/reports/use-report-viewer.ts`,
      `apps/web/src/reports/report-viewer-client.ts`)
- [x] T014 [S0403] Update the evaluation artifact rail so report-ready handoff
      opens the new artifact-review surface and unavailable or stale states
      stay explicit with denied, unavailable, or deferred handling and fallback
      behavior (`apps/web/src/chat/evaluation-artifact-rail.tsx`,
      `apps/web/src/reports/report-viewer-client.ts`)

---

## Testing (4 tasks)

Verify the route contract, shell handoff behavior, and repo-level regression
gates.

### apps/api

- [x] T015 [S0403] [P] Extend HTTP runtime-contract coverage for selected
      report reads, latest-report fallback, invalid path rejection, missing
      artifact states, and bounded recent-artifact listing with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T016 [S0403] [P] Add browser smoke coverage for report handoff, recent
      artifact browsing, stale selected-report states, and offline refresh
      behavior with explicit loading, empty, error, and offline states
      (`scripts/test-app-report-viewer.mjs`)
- [x] T017 [S0403] [P] Update the quick regression suite and ASCII coverage for
      the report-viewer files and smoke script with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T018 [S0403] Run API and web checks or builds, report-viewer smoke
      coverage, and quick regressions, then verify ASCII-only session
      deliverables (`apps/api/src/server/report-viewer-contract.ts`,
      `apps/api/src/server/report-viewer-summary.ts`,
      `apps/api/src/server/routes/report-viewer-route.ts`,
      `apps/web/src/reports/`, `scripts/test-app-report-viewer.mjs`,
      `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `implement` workflow step next. After a successful `plansession` run,
`implement` is always the next workflow command.
