# Task Checklist

**Session ID**: `phase05-session01-scan-shortlist-contract`
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

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 6      | 6      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **18** | **18** | **0**     |

---

## Setup (3 tasks)

Define the bounded scan-review contract and route seams before wiring runtime
state and shortlist parsing.

### apps/api

- [x] T001 [S0501] [P] Create typed scan-review payloads for launcher state,
      run status, shortlist candidate previews, selected detail, warnings, and
      evaluate or batch-seed handoff metadata with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/server/scan-review-contract.ts`)
- [x] T002 [S0501] [P] Create scan-review summary scaffolding for shortlist
      parsing, scan-history loading, bounded selection, and runtime overlay
      inputs with bounded pagination, validated filters, and deterministic
      ordering (`apps/api/src/server/scan-review-summary.ts`)
- [x] T003 [S0501] Create GET and POST scan-review route scaffolding plus
      deterministic registry wiring with schema-validated input and explicit
      error mapping
      (`apps/api/src/server/routes/scan-review-route.ts`,
      `apps/api/src/server/routes/scan-review-action-route.ts`,
      `apps/api/src/server/routes/index.ts`)

---

## Foundation (5 tasks)

Build the server-owned shortlist model, duplicate context, and backend action
paths that Session 02 will consume.

### apps/api

- [x] T004 [S0501] Implement `data/pipeline.md` shortlist parsing for campaign
      guidance, bucket counts, ranked candidate previews, and selected-url
      focus with bounded pagination, validated filters, and deterministic
      ordering (`apps/api/src/server/scan-review-summary.ts`)
- [x] T005 [S0501] Implement `data/scan-history.tsv` joins for first-seen
      freshness, duplicate density, prior-seen notes, and pending-queue overlap
      with bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/scan-review-summary.ts`)
- [x] T006 [S0501] Implement scan runtime-state summarization for idle, queued,
      running, approval-paused, completed, and degraded states by reading the
      operational store and typed scan results with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/server/scan-review-summary.ts`)
- [x] T007 [S0501] Implement session-scoped ignore or restore persistence for
      shortlist candidate URLs so review state stays backend-owned without
      mutating user-layer files, with idempotency protection, transaction
      boundaries, and compensation on failure
      (`apps/api/src/server/routes/scan-review-action-route.ts`,
      `apps/api/src/server/scan-review-summary.ts`)
- [x] T008 [S0501] Implement explicit evaluate and batch-seed handoff metadata
      plus ignore or restore capability on each candidate with types matching
      declared contract and exhaustive enum handling
      (`apps/api/src/server/scan-review-contract.ts`,
      `apps/api/src/server/scan-review-summary.ts`)

---

## Implementation (6 tasks)

Compose the bounded review payload and make the new route behavior explicit for
real scan states.

### apps/api

- [x] T009 [S0501] Implement shortlist payload composition for empty files,
      missing shortlist sections, selected-detail fallbacks, and hidden-
      candidate filtering with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/server/scan-review-summary.ts`)
- [x] T010 [S0501] Implement warning classification for duplicate-heavy,
      already-pending, stale-selection, approval-paused, and degraded-result
      cases with types matching declared contract and exhaustive enum handling
      (`apps/api/src/server/scan-review-summary.ts`,
      `apps/api/src/server/scan-review-contract.ts`)
- [x] T011 [S0501] Implement GET route query handling for session focus,
      bucket filtering, selected URL, limit, offset, and include-ignored flags
      with schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/scan-review-route.ts`)
- [x] T012 [S0501] Implement POST action handling for ignore and restore
      intents, duplicate submissions, and updated candidate visibility with
      duplicate-trigger prevention while in-flight
      (`apps/api/src/server/routes/scan-review-action-route.ts`)
- [x] T013 [S0501] Reconcile launcher state with active job payloads, completed
      scan summaries, and compare-clean or company-filtered runs so the review
      route exposes the right last-run context with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/server/scan-review-summary.ts`)
- [x] T014 [S0501] Reconcile selected candidate detail, dedup notes, and
      evaluate or batch-seed follow-through so the browser never needs to infer
      next steps from raw repo files with bounded pagination, validated filters,
      and deterministic ordering
      (`apps/api/src/server/scan-review-summary.ts`)

---

## Testing (4 tasks)

Lock the route contract and repo-level validation gates before Session 02 uses
the new API surface.

### apps/api

- [x] T015 [S0501] [P] Create summary tests for shortlist parsing, dedup
      signals, ignore filtering, selected-url detail, and runtime-state
      composition with schema-validated input and explicit error mapping
      (`apps/api/src/server/scan-review-summary.test.ts`)
- [x] T016 [S0501] [P] Extend HTTP runtime coverage for GET and POST scan-
      review routes across empty, duplicate-heavy, approval-paused, degraded,
      and invalid-input cases with schema-validated input and explicit error
      mapping (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T017 [S0501] [P] Update quick regression and ASCII coverage for the new
      scan-review route, summary, and tests with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T018 [S0501] Run API checks or builds, runtime tests, quick regressions,
      and ASCII validation for the new scan-review deliverables
      (`apps/api/src/server/scan-review-contract.ts`,
      `apps/api/src/server/scan-review-summary.ts`,
      `apps/api/src/server/routes/scan-review-route.ts`,
      `apps/api/src/server/routes/scan-review-action-route.ts`,
      `apps/api/src/server/scan-review-summary.test.ts`,
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
