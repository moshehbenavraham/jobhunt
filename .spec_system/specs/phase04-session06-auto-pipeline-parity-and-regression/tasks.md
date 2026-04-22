# Task Checklist

**Session ID**: `phase04-session06-auto-pipeline-parity-and-regression`
**Total Tasks**: 19
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

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 6      | 6      | 0         |
| Testing        | 5      | 5      | 0         |
| **Total**      | **19** | **19** | **0**     |

---

## Setup (3 tasks)

Lock the parity contracts for sanitized launch metadata and cross-surface
review focus before wiring runtime behavior.

### apps/api

- [x] T001 [S0406] [P] Create evaluation launch-context normalization helpers
      for raw JD versus live job-URL input, canonical URL metadata, and prompt
      redaction with schema-validated input and explicit error mapping
      (`apps/api/src/orchestration/evaluation-launch-context.ts`)
- [x] T002 [S0406] [P] Extend evaluation-result and tracker-workspace contract
      types with input provenance, verification summary, review-focus, and
      report-number handoff fields with types matching declared contract and
      exhaustive enum handling
      (`apps/api/src/server/evaluation-result-contract.ts`,
      `apps/api/src/server/tracker-workspace-contract.ts`)

### apps/web

- [x] T003 [S0406] [P] Extend chat and tracker browser parser types for the new
      parity fields with types matching declared contract and exhaustive enum
      handling (`apps/web/src/chat/evaluation-result-types.ts`,
      `apps/web/src/tracker/tracker-workspace-types.ts`)

---

## Foundation (5 tasks)

Build the backend-owned parity helpers and focus plumbing that the report,
pipeline, and tracker surfaces will reuse.

### apps/api

- [x] T004 [S0406] Persist sanitized evaluation launch metadata in the session
      lifecycle so raw JD text never becomes durable context while live URL
      metadata remains available for review focus with idempotency protection,
      transaction boundaries, and compensation on failure
      (`apps/api/src/orchestration/orchestration-contract.ts`,
      `apps/api/src/orchestration/session-lifecycle.ts`)
- [x] T005 [S0406] Create the evaluation review-focus helper for verification
      state plus report, pipeline, and tracker handoff targets with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/evaluation-review-focus.ts`)
- [x] T006 [S0406] Extend tracker-workspace summary and route query parsing for
      report-number handoff and pending TSV focus with schema-validated input
      and explicit error mapping
      (`apps/api/src/server/tracker-workspace-summary.ts`,
      `apps/api/src/server/routes/tracker-workspace-route.ts`)

### apps/web

- [x] T007 [S0406] [P] Implement tracker workspace client focus helpers for
      report-number handoff and URL-backed shell state with cleanup on scope
      exit for all acquired resources
      (`apps/web/src/tracker/tracker-workspace-client.ts`)
- [x] T008 [S0406] [P] Wire chat and shell surfaces to open tracker review from
      backend-owned handoff data with state reset or revalidation on re-entry
      (`apps/web/src/chat/chat-console-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Implementation (6 tasks)

Make auto-pipeline closeout parity explicit and deterministic across evaluation,
report, pipeline, and tracker review surfaces.

### apps/api

- [x] T009 [S0406] Implement evaluation-result summary enrichment for input
      provenance, verification status, and backend-owned report, pipeline, and
      tracker review focus with types matching declared contract and exhaustive
      enum handling
      (`apps/api/src/server/evaluation-result-summary.ts`,
      `apps/api/src/server/evaluation-review-focus.ts`)
- [x] T010 [S0406] Implement tracker report-number focus matching against
      existing rows and pending TSV additions so staged closeout can be reviewed
      before merge with bounded pagination, validated filters, and
      deterministic ordering
      (`apps/api/src/server/tracker-workspace-summary.ts`,
      `apps/api/src/server/tracker-workspace-contract.ts`)

### apps/web

- [x] T011 [S0406] Implement artifact-rail verification copy and tracker
      handoff intents from backend review-focus data without browser-side
      prompt or path inference with explicit loading, empty, error, and
      offline states (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T012 [S0406] Implement tracker workspace report-number focus and refresh
      reconciliation with cleanup on scope exit for all acquired resources
      (`apps/web/src/tracker/use-tracker-workspace.ts`)
- [x] T013 [S0406] Implement tracker workspace surface updates for staged TSV
      focus, report-number context, and explicit closeout attention messaging
      with explicit loading, empty, error, and offline states
      (`apps/web/src/tracker/tracker-workspace-surface.tsx`)
- [x] T014 [S0406] Reconcile report, pipeline, and tracker handoff affordances
      so the chat surface uses backend-owned review focus instead of local
      inference with state reset or revalidation on re-entry
      (`apps/web/src/chat/evaluation-artifact-rail.tsx`,
      `apps/web/src/chat/chat-console-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Testing (5 tasks)

Lock the parity slice with API, orchestration, browser, and repo-level
regression coverage.

### apps/api

- [x] T015 [S0406] [P] Extend session-lifecycle and orchestration-service tests
      for raw-JD redaction, canonical URL persistence, and unchanged
      non-evaluation workflow behavior with schema-validated input and explicit
      error mapping
      (`apps/api/src/orchestration/session-lifecycle.test.ts`,
      `apps/api/src/orchestration/orchestration-service.test.ts`)
- [x] T016 [S0406] [P] Extend evaluation-result, tracker-workspace, and
      liveness-tool tests for raw JD and live-URL parity, degraded closeout,
      report-number focus, and verification states with schema-validated input
      and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`,
      `apps/api/src/tools/liveness-check-tools.test.ts`)

### repo root

- [x] T017 [S0406] [P] Add browser smoke coverage for raw JD and live-URL
      auto-pipeline handoff across report, pipeline, and tracker surfaces with
      explicit loading, empty, error, and offline states
      (`scripts/test-app-auto-pipeline-parity.mjs`,
      `scripts/test-app-chat-console.mjs`,
      `scripts/test-app-shell.mjs`)
- [x] T018 [S0406] [P] Update the quick regression suite and ASCII coverage
      for Session 06 parity contracts, focus helpers, and smoke scripts with
      deterministic ordering (`scripts/test-all.mjs`)
- [x] T019 [S0406] Run API and web checks or builds, auto-pipeline parity
      smoke coverage, and quick regressions, then verify ASCII-only session
      deliverables
      (`apps/api/src/orchestration/evaluation-launch-context.ts`,
      `apps/api/src/server/evaluation-review-focus.ts`,
      `apps/web/src/chat/evaluation-artifact-rail.tsx`,
      `apps/web/src/tracker/`,
      `scripts/test-app-auto-pipeline-parity.mjs`,
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

Run the `implement` workflow step to begin AI-led implementation.
