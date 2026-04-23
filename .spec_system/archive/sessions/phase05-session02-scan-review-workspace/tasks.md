# Task Checklist

**Session ID**: `phase05-session02-scan-review-workspace`
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

| Category       | Total  | Done  | Remaining |
| -------------- | ------ | ----- | --------- |
| Setup          | 3      | 0     | 3         |
| Foundation     | 5      | 0     | 5         |
| Implementation | 7      | 0     | 7         |
| Testing        | 4      | 0     | 4         |
| **Total**      | **19** | **0** | **19**    |

---

## Setup (3 tasks)

Define the browser contract, shared handoff seam, and shell registry before
building the scan workspace UI.

### apps/web

- [x] T001 [S0502] [P] Create strict scan-review payload parsers, filter
      enums, and action-response types with types matching declared contract
      and exhaustive enum handling
      (`apps/web/src/scan/scan-review-types.ts`)
- [x] T002 [S0502] Create scan-review client scaffolding for summary fetches,
      ignore or restore mutations, shared orchestration launches, and URL-
      backed focus helpers with timeout, retry/backoff, and failure-path
      handling (`apps/web/src/scan/scan-review-client.ts`,
      `apps/web/src/chat/chat-console-client.ts`,
      `apps/web/src/chat/use-chat-console.ts`)
- [x] T003 [S0502] Register the scan shell surface, navigation copy, and
      placeholder exhaustiveness with platform-appropriate accessibility
      labels, focus management, and input support
      (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/surface-placeholder.tsx`)

---

## Foundation (5 tasks)

Build the scan workspace state model and presentation seams on top of the new
browser contract.

### apps/web

- [x] T004 [S0502] Create scan-review hook state for focus sync, refresh
      cycles, action notices, and selected-candidate recovery with cleanup on
      scope exit for all acquired resources
      (`apps/web/src/scan/use-scan-review.ts`)
- [x] T005 [S0502] [P] Create the scan launcher and run-status panel for
      launcher readiness, active run progress, degraded warnings, and retry
      messaging with explicit loading, empty, error, and offline states
      (`apps/web/src/scan/scan-review-launch-panel.tsx`)
- [x] T006 [S0502] [P] Create shortlist card rendering for bucket filters,
      duplicate hints, ignored visibility, and candidate selection with
      platform-appropriate accessibility labels, focus management, and input
      support (`apps/web/src/scan/scan-review-shortlist.tsx`)
- [x] T007 [S0502] [P] Create the selected-detail action shelf for warning
      presentation, evaluation handoff, batch handoff, and ignore or restore
      controls with state reset or revalidation on re-entry
      (`apps/web/src/scan/scan-review-action-shelf.tsx`)
- [x] T008 [S0502] Create the scan workspace surface composition, responsive
      layout, and shell handoff seams with explicit loading, empty, error, and
      offline states (`apps/web/src/scan/scan-review-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Implementation (7 tasks)

Keep scan review, candidate visibility, and orchestration handoffs explicit,
bounded, and aligned with the backend-owned contract.

### apps/web

- [x] T009 [S0502] Implement focus query parsing and sync for bucket, offset,
      selected URL, include-ignored, and session scope with bounded
      pagination, validated filters, and deterministic ordering
      (`apps/web/src/scan/scan-review-client.ts`)
- [x] T010 [S0502] Implement summary loading, stale-selection reconciliation,
      and refresh or online recovery in the scan hook with cleanup on scope
      exit for all acquired resources
      (`apps/web/src/scan/use-scan-review.ts`)
- [x] T011 [S0502] Implement scan launch handling through the shared
      orchestration route so `/scan` can start `scan-portals` runs without
      duplicating workflow logic, with duplicate-trigger prevention while
      in-flight (`apps/web/src/scan/scan-review-client.ts`,
      `apps/web/src/scan/use-scan-review.ts`,
      `apps/web/src/scan/scan-review-launch-panel.tsx`)
- [x] T012 [S0502] Implement ignore or restore mutations, notice messaging,
      and selected-detail revalidation after visibility changes with
      duplicate-trigger prevention while in-flight
      (`apps/web/src/scan/scan-review-client.ts`,
      `apps/web/src/scan/use-scan-review.ts`,
      `apps/web/src/scan/scan-review-shortlist.tsx`,
      `apps/web/src/scan/scan-review-action-shelf.tsx`)
- [x] T013 [S0502] Implement shortlist warning, dedup, pending-overlap, and
      degraded-run presentation so scan review stays explicit instead of
      inferring from raw text, with types matching declared contract and
      exhaustive enum handling
      (`apps/web/src/scan/scan-review-launch-panel.tsx`,
      `apps/web/src/scan/scan-review-shortlist.tsx`,
      `apps/web/src/scan/scan-review-action-shelf.tsx`)
- [x] T014 [S0502] Implement single-evaluation handoff using backend-provided
      evaluate context plus shared chat focus sync so selected candidates open
      the chat surface on the launched session, with duplicate-trigger
      prevention while in-flight
      (`apps/web/src/scan/scan-review-client.ts`,
      `apps/web/src/scan/use-scan-review.ts`,
      `apps/web/src/shell/operator-shell.tsx`)
- [x] T015 [S0502] Implement batch-seed handoff using backend-provided
      selection metadata and the existing `batch-evaluation` orchestration
      route, then return focus to chat without inventing a new batch workspace,
      with duplicate-trigger prevention while in-flight
      (`apps/web/src/scan/scan-review-client.ts`,
      `apps/web/src/scan/use-scan-review.ts`,
      `apps/web/src/scan/scan-review-action-shelf.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Testing (4 tasks)

Verify shell navigation, shortlist behavior, and scan handoff flows before the
session moves to implementation.

### repo root

- [x] T016 [S0502] [P] Create browser smoke coverage for ready, empty, warning,
      ignore or restore, evaluation-handoff, and batch-seed handoff scan
      flows with explicit loading, empty, error, and offline states
      (`scripts/test-app-scan-review.mjs`)
- [x] T017 [S0502] [P] Extend shell smoke coverage for scan navigation,
      surface rendering, and scan-to-chat handoff focus with explicit loading,
      empty, error, and offline states (`scripts/test-app-shell.mjs`)
- [x] T018 [S0502] [P] Update quick regression and ASCII coverage for the
      scan workspace files, shared chat focus helpers, and smoke script with
      deterministic ordering (`scripts/test-all.mjs`)
- [x] T019 [S0502] Run web checks or builds, scan and shell smoke coverage,
      quick regressions, and ASCII validation for the new scan-review
      deliverables (`apps/web/src/scan/`,
      `apps/web/src/chat/chat-console-client.ts`,
      `apps/web/src/chat/use-chat-console.ts`,
      `apps/web/src/shell/`,
      `scripts/test-app-scan-review.mjs`,
      `scripts/test-app-shell.mjs`,
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
