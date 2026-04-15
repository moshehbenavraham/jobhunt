# Task Checklist

**Session ID**: `phase02-session02-structured-batch-result-handling`
**Total Tasks**: 25
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-15

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 2 | 2 | 0 |
| Foundation | 5 | 5 | 0 |
| Implementation | 14 | 14 | 0 |
| Testing | 4 | 4 | 0 |
| **Total** | **25** | **25** | **0** |

---

## Setup (2 tasks)

Confirm the state-semantics scope, capture the current gap, and prepare the
session notes artifact.

- [x] T001 [S0202] Review the Phase 02 goals, Session 02 stub, and Session 01
      handoff boundaries for structured result handling
      (`.spec_system/PRD/phase_02/session_02_structured_batch_result_handling.md`)
- [x] T002 [S0202] Capture the current zero-exit-to-completed baseline,
      retry rules, summary gaps, and session-notes scaffold
      (`.spec_system/specs/phase02-session02-structured-batch-result-handling/implementation-notes.md`)

---

## Foundation (5 tasks)

Verify the governing rules and map the exact state-semantic surface before
editing runtime behavior.

- [x] T003 [S0202] [P] Verify the master PRD contract and Session 02 scope,
      including warning and failure-classification requirements
      (`.spec_system/PRD/PRD.md`)
- [x] T004 [S0202] [P] Verify conventions, active concerns, and validator
      coupling for batch-state edits (`.spec_system/CONVENTIONS.md`)
- [x] T005 [S0202] [P] Audit the runner's current state transitions, retry
      gating, and summary math (`batch/batch-runner.sh`)
- [x] T006 [S0202] [P] Audit the checked-in worker schema, prompt, fixtures,
      and contract harness against the needed state semantics
      (`batch/worker-result.schema.json`)
- [x] T007 [S0202] Audit downstream batch-state consumers that assume only
      completed rows carry report-backed outcomes
      (`dashboard/internal/data/career.go`)

---

## Implementation (14 tasks)

Make structured results authoritative for runner state while keeping the
Session 01 invocation contract stable.

- [x] T008 [S0202] Refactor worker outcome classification into explicit
      helpers for completed, partial, semantic failed, and infrastructure
      failure paths, with exhaustive status handling (`batch/batch-runner.sh`)
- [x] T009 [S0202] Add warning and error normalization helpers so degraded
      artifacts and failure summaries are recorded deterministically without
      reopening the state file format (`batch/batch-runner.sh`)
- [x] T010 [S0202] Update zero-exit handling so `partial` persists as
      `partial` and semantic `failed` persists as `failed` instead of
      collapsing to `completed`, with duplicate-trigger prevention while
      in-flight (`batch/batch-runner.sh`)
- [x] T011 [S0202] Update failed-row retry selection so normal batch runs
      skip terminal partial and semantic-failed rows while infrastructure
      failures remain retryable up to the configured limit
      (`batch/batch-runner.sh`)
- [x] T012 [S0202] Update summary output and score aggregation to report
      completed, partial, failed, retryable-failed, skipped, and pending
      counts deterministically (`batch/batch-runner.sh`)
- [x] T013 [S0202] Apply the settled warning and error contract to the
      checked-in schema while keeping the Session 01 result-file surface
      stable, with exhaustive enum handling (`batch/worker-result.schema.json`)
- [x] T014 [S0202] Update the batch worker prompt so partial outcomes emit the
      settled warning and artifact semantics and failed outcomes remain aligned
      with the schema (`batch/batch-prompt.md`)
- [x] T015 [S0202] [P] Update the completed-result fixture to match the
      settled warning and artifact contract
      (`batch/test-fixtures/worker-result-completed.json`)
- [x] T016 [S0202] [P] Update the partial-result fixture to match the settled
      degraded-artifact and warning semantics
      (`batch/test-fixtures/worker-result-partial.json`)
- [x] T017 [S0202] [P] Update the failed-result fixture to match the settled
      semantic-failure contract (`batch/test-fixtures/worker-result-failed.json`)
- [x] T018 [S0202] Create the batch state-semantics harness that exercises
      rerun gating, retry counters, and summary output across completed,
      partial, semantic failed, and infrastructure-failure cases
      (`scripts/test-batch-runner-state-semantics.mjs`)
- [x] T019 [S0202] Update the existing contract harness so structured-result
      scenarios assert the settled state transitions and warning fields
      (`scripts/test-batch-runner-contract.mjs`)
- [x] T020 [S0202] Integrate the new batch state-semantics harness into the
      quick regression entrypoint (`scripts/test-all.mjs`)
- [x] T021 [S0202] Update the dashboard batch URL fallback so report-bearing
      partial outcomes remain discoverable after the state change
      (`dashboard/internal/data/career.go`)

---

## Testing (4 tasks)

Verify the settled state matrix locally before handing off to docs alignment
and closeout work.

- [x] T022 [S0202] [P] Run `bash -n` plus the contract and state-semantics
      harnesses to verify runner syntax, state transitions, warning fields,
      and summary output (`batch/batch-runner.sh`)
- [x] T023 [S0202] [P] Run `node scripts/test-all.mjs --quick` and confirm
      the batch-runtime regression surface remains green (`scripts/test-all.mjs`)
- [x] T024 [S0202] [P] Manual stub runs confirm partial, semantic-failed, and
      infrastructure-failed outcomes land in the expected state rows and rerun
      behavior (`batch/batch-runner.sh`)
- [x] T025 [S0202] [P] Validate ASCII encoding and Unix LF line endings across
      the touched batch assets, fixtures, tests, dashboard code, and session
      notes (`.`)

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

Run the `updateprd` workflow step to sync the completed session into the PRD
and tracker.
