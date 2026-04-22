# Task Checklist

**Session ID**: `phase05-session04-batch-jobs-workspace-and-run-detail`
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
| Implementation | 7      | 7      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **19** | **19** | **0**     |

---

## Setup (3 tasks)

Define the browser contract, action seam, and shell registry before building
the batch workspace UI.

### apps/web

- [x] T001 [S0504] [P] Create strict batch-workspace payload parsers, status
      filters, focus helpers, and action-response types with types matching
      declared contract and exhaustive enum handling
      (`apps/web/src/batch/batch-workspace-types.ts`)
- [x] T002 [S0504] Create batch-workspace client scaffolding for summary
      fetches, action submissions, revalidation hints, and URL-backed focus
      helpers with timeout, retry/backoff, and failure-path handling
      (`apps/web/src/batch/batch-workspace-client.ts`)
- [x] T003 [S0504] Register the batch shell surface, navigation badge,
      placeholder exhaustiveness, and mount seam with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/surface-placeholder.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Foundation (5 tasks)

Build the batch workspace state model and presentation seams on top of the new
browser contract.

### apps/web

- [x] T004 [S0504] Create batch-workspace hook state for item focus, status
      filters, polling cycles, action notices, and stale-selection recovery
      with cleanup on scope exit for all acquired resources
      (`apps/web/src/batch/use-batch-workspace.ts`)
- [x] T005 [S0504] [P] Create the batch run panel for draft readiness,
      active-run summary, approval-paused messaging, closeout warnings, and
      top-level controls with explicit loading, empty, error, and offline
      states (`apps/web/src/batch/batch-workspace-run-panel.tsx`)
- [x] T006 [S0504] [P] Create item-matrix rendering for status filters,
      bounded batch rows, selection, and warning badges with platform-
      appropriate accessibility labels, focus management, and input support
      (`apps/web/src/batch/batch-workspace-item-matrix.tsx`)
- [x] T007 [S0504] [P] Create the detail rail for selected item warnings,
      artifact links, and next-action context with state reset or revalidation
      on re-entry (`apps/web/src/batch/batch-workspace-detail-rail.tsx`)
- [x] T008 [S0504] Create the batch workspace surface composition, responsive
      layout, and shell handoff seams with explicit loading, empty, error, and
      offline states (`apps/web/src/batch/batch-workspace-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Implementation (7 tasks)

Keep batch review, action controls, and cross-surface handoffs explicit,
bounded, and aligned with the backend-owned contract.

### apps/web

- [x] T009 [S0504] Implement focus query parsing and sync for `itemId`,
      `status`, and `offset` with bounded pagination, validated filters, and
      deterministic ordering (`apps/web/src/batch/batch-workspace-client.ts`)
- [x] T010 [S0504] Implement summary loading, polling, action-result
      revalidation, and stale-item recovery in the batch hook with cleanup on
      scope exit for all acquired resources
      (`apps/web/src/batch/use-batch-workspace.ts`)
- [x] T011 [S0504] Implement draft, run, approval, and closeout summary
      presentation so queued, running, approval-paused, failed, and completed
      states stay explicit with types matching declared contract and
      exhaustive enum handling
      (`apps/web/src/batch/batch-workspace-run-panel.tsx`,
      `apps/web/src/batch/batch-workspace-surface.tsx`)
- [x] T012 [S0504] Implement item-matrix filters, retryable and partial
      warning badges, selection persistence, and page navigation with bounded
      pagination, validated filters, and deterministic ordering
      (`apps/web/src/batch/batch-workspace-item-matrix.tsx`,
      `apps/web/src/batch/use-batch-workspace.ts`)
- [x] T013 [S0504] Implement `resume-run-pending` and `retry-failed` actions
      using backend revalidation hints with duplicate-trigger prevention while
      in-flight (`apps/web/src/batch/batch-workspace-client.ts`,
      `apps/web/src/batch/use-batch-workspace.ts`,
      `apps/web/src/batch/batch-workspace-run-panel.tsx`)
- [x] T014 [S0504] Implement `merge-tracker-additions` and
      `verify-tracker-pipeline` controls plus explicit merge-blocked and
      warning feedback with duplicate-trigger prevention while in-flight
      (`apps/web/src/batch/batch-workspace-client.ts`,
      `apps/web/src/batch/use-batch-workspace.ts`,
      `apps/web/src/batch/batch-workspace-run-panel.tsx`)
- [x] T015 [S0504] Implement report, tracker, approvals, and chat handoff
      controls from selected item and active run context with state reset or
      revalidation on re-entry (`apps/web/src/batch/batch-workspace-detail-rail.tsx`,
      `apps/web/src/batch/batch-workspace-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Testing (4 tasks)

Verify shell navigation, batch review, and action flows before the session
moves to implementation.

### repo root

- [x] T016 [S0504] [P] Create browser smoke coverage for ready,
      approval-paused, retryable-failed, merge-blocked, completed, and
      offline batch-workspace flows with explicit loading, empty, error, and
      offline states (`scripts/test-app-batch-workspace.mjs`)
- [x] T017 [S0504] [P] Extend shell smoke coverage for batch navigation plus
      report, tracker, approvals, and chat handoffs from the batch surface
      with explicit loading, empty, error, and offline states
      (`scripts/test-app-shell.mjs`)
- [x] T018 [S0504] [P] Update quick regression and ASCII coverage for the
      batch workspace files and smoke script with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T019 [S0504] Run web checks or builds, batch workspace and shell smoke
      coverage, quick regressions, and ASCII validation for the new batch
      deliverables (`apps/web/src/batch/`, `apps/web/src/shell/`,
      `scripts/test-app-batch-workspace.mjs`, `scripts/test-app-shell.mjs`,
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

Run the `implement` workflow step to begin AI-led implementation. After a
successful `plansession` run, `implement` is always the next workflow command.
