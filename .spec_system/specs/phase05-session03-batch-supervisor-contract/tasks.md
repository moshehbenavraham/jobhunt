# Task Checklist

**Session ID**: `phase05-session03-batch-supervisor-contract`
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

Define the bounded batch-supervisor contract and route seams before wiring
batch files, runtime overlays, and action controls.

### apps/api

- [x] T001 [S0503] [P] Create typed batch-supervisor payloads for workflow
      states, item-matrix rows, selected item detail, warning codes, action
      availability, and action-result envelopes with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/server/batch-supervisor-contract.ts`)
- [x] T002 [S0503] [P] Create batch-supervisor summary scaffolding for batch
      input and state parsing, result-sidecar enrichment, runtime overlays,
      and bounded selection with bounded pagination, validated filters, and
      deterministic ordering
      (`apps/api/src/server/batch-supervisor-summary.ts`)
- [x] T003 [S0503] Create GET and POST batch-supervisor route scaffolding plus
      deterministic registry wiring with schema-validated input and explicit
      error mapping
      (`apps/api/src/server/routes/batch-supervisor-route.ts`,
      `apps/api/src/server/routes/batch-supervisor-action-route.ts`,
      `apps/api/src/server/routes/index.ts`)

---

## Foundation (5 tasks)

Build the server-owned batch read model, runtime overlays, and closeout
readiness the browser will rely on.

### apps/api

- [x] T004 [S0503] Implement `batch/batch-input.tsv` parsing for draft counts,
      per-item composition detail, and start-from filtering with bounded
      pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/batch-supervisor-summary.ts`)
- [x] T005 [S0503] Implement `batch/batch-state.tsv` parsing plus retry
      eligibility derivation that mirrors executor semantics with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/batch-supervisor-summary.ts`)
- [x] T006 [S0503] Implement `batch/logs/*.result.json` enrichment for
      per-item warnings, report or PDF artifacts, tracker paths, legitimacy,
      and company or role detail with types matching declared contract and
      exhaustive enum handling
      (`apps/api/src/server/batch-supervisor-summary.ts`)
- [x] T007 [S0503] Implement active session, job, checkpoint, and approval
      overlays for queued, running, waiting, failed, and completed batch
      states with types matching declared contract and exhaustive enum
      handling (`apps/api/src/server/batch-supervisor-summary.ts`)
- [x] T008 [S0503] Implement closeout readiness, merge-blocked warnings, and
      explicit action availability for run-pending resume, retry-failed,
      merge, and verify controls with types matching declared contract and
      exhaustive enum handling
      (`apps/api/src/server/batch-supervisor-summary.ts`)

---

## Implementation (6 tasks)

Compose the bounded supervisor payload and make route behavior explicit for
real batch draft, run, and closeout states.

### apps/api

- [x] T009 [S0503] Implement bounded item-matrix composition for draft-only,
      stale selection, selected-item, and recent-run fallback behavior with
      bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/batch-supervisor-summary.ts`)
- [x] T010 [S0503] Implement top-level summary messaging and warning
      classification for empty input, partial results, retryable
      infrastructure failures, approval pauses, and closeout drift with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/batch-supervisor-summary.ts`)
- [x] T011 [S0503] Implement GET route query handling for `itemId`, `limit`,
      `offset`, and `status` filters with schema-validated input and explicit
      error mapping (`apps/api/src/server/routes/batch-supervisor-route.ts`)
- [x] T012 [S0503] Implement POST action handling for run-pending resume,
      retry-failed, merge, and verify commands with duplicate-trigger
      prevention while in-flight
      (`apps/api/src/server/routes/batch-supervisor-action-route.ts`)
- [x] T013 [S0503] Implement route-owned tool execution mapping to batch
      workflow and tracker integrity tools, surfacing accepted, already-
      queued, warning, and conflict outcomes with explicit error mapping
      (`apps/api/src/server/routes/batch-supervisor-action-route.ts`)
- [x] T014 [S0503] Implement post-action response envelopes that preserve
      action feedback, selected-item focus, and revalidation hints on repeated
      or revisited batch controls with state reset or revalidation on re-entry
      (`apps/api/src/server/batch-supervisor-contract.ts`,
      `apps/api/src/server/routes/batch-supervisor-action-route.ts`)

---

## Testing (4 tasks)

Lock the route contract and repo-level validation gates before Session 04
builds the `/batch` workspace on this API surface.

### apps/api

- [x] T015 [S0503] [P] Create summary tests for draft parsing, state overlays,
      result-sidecar enrichment, action availability, and warning
      classification with schema-validated input and explicit error mapping
      (`apps/api/src/server/batch-supervisor-summary.test.ts`)
- [x] T016 [S0503] [P] Extend HTTP runtime coverage for GET and POST
      batch-supervisor routes across draft, running, approval-paused,
      retryable-failed, merge-warning, and invalid-input cases with schema-
      validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T017 [S0503] [P] Update quick regression and ASCII coverage for the new
      batch-supervisor server files with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T018 [S0503] Run API checks or builds, runtime tests, quick
      regressions, and ASCII validation for the new batch-supervisor
      deliverables
      (`apps/api/src/server/batch-supervisor-contract.ts`,
      `apps/api/src/server/batch-supervisor-summary.ts`,
      `apps/api/src/server/routes/batch-supervisor-route.ts`,
      `apps/api/src/server/routes/batch-supervisor-action-route.ts`,
      `apps/api/src/server/batch-supervisor-summary.test.ts`,
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
