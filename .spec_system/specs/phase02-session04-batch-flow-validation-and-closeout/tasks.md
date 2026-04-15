# Task Checklist

**Session ID**: `phase02-session04-batch-flow-validation-and-closeout`
**Total Tasks**: 20
**Estimated Duration**: 2-4 hours
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

| Category       | Total  | Done  | Remaining |
| -------------- | ------ | ----- | --------- |
| Setup          | 2      | 0     | 2         |
| Foundation     | 5      | 0     | 5         |
| Implementation | 8      | 0     | 8         |
| Testing        | 5      | 0     | 5         |
| **Total**      | **20** | **0** | **20**    |

---

## Setup (2 tasks)

Establish the validation boundary, handoff context, and session evidence file.

- [x] T001 [S0204] Review the Phase 02 PRD, Session 04 stub, and Session 03
      validation handoff boundaries
      (`.spec_system/PRD/phase_02/session_04_batch_flow_validation_and_closeout.md`)
- [x] T002 [S0204] Create the validation matrix, fixture plan, and Phase 03
      deferral ledger for this session
      (`.spec_system/specs/phase02-session04-batch-flow-validation-and-closeout/implementation-notes.md`)

---

## Foundation (5 tasks)

Audit the live runtime and existing harnesses before adding any new closeout
coverage.

- [x] T003 [S0204] [P] Audit dry-run, retry, report-number reservation, and
      closeout sequencing in the live batch runner (`batch/batch-runner.sh`)
- [x] T004 [S0204] [P] Audit the current worker-contract harness against the
      Phase 02 closeout evidence needed for this session
      (`scripts/test-batch-runner-contract.mjs`)
- [x] T005 [S0204] [P] Audit the current state-semantics harness for rerun
      gating, skipped rows, and exhausted retry coverage
      (`scripts/test-batch-runner-state-semantics.mjs`)
- [x] T006 [S0204] [P] Audit merge and verification behavior for tracker
      additions, dedup, and pending-TSV closeout expectations
      (`scripts/merge-tracker.mjs`)
- [x] T007 [S0204] [P] Audit the quick repo gate and define the Session 04
      validation path that should run on every clean checkout
      (`scripts/test-all.mjs`)

---

## Implementation (8 tasks)

Add controlled validation coverage, then tighten the owning runtime surfaces
only where the evidence shows real drift.

- [x] T008 [S0204] Create a deterministic closeout harness that exercises the
      runner plus merge and verify behavior inside a temp sandbox
      (`scripts/test-batch-runner-closeout.mjs`)
- [x] T009 [S0204] Extend the closeout harness with deterministic report-number
      reservation assertions across reruns and pre-existing reports
      (`scripts/test-batch-runner-closeout.mjs`)
- [x] T010 [S0204] Extend the state-semantics harness with resumability and
      retry-budget edge cases needed for Phase 02 closeout
      (`scripts/test-batch-runner-state-semantics.mjs`)
- [x] T011 [S0204] Tighten batch-runner closeout sequencing, summary handling,
      or failure reporting if the controlled harness exposes runtime drift
      (`batch/batch-runner.sh`)
- [x] T012 [S0204] Tighten tracker-merge behavior if closeout validation
      exposes numbering, dedup, or archive drift (`scripts/merge-tracker.mjs`)
- [x] T013 [S0204] Tighten pipeline verification assertions if closeout
      validation exposes missing or misleading integrity checks
      (`scripts/verify-pipeline.mjs`)
- [x] T014 [S0204] Wire the Session 04 closeout harness into the quick
      regression gate (`scripts/test-all.mjs`)
- [x] T015 [S0204] Capture residual Phase 03 cleanup items, validation
      evidence, and closeout handoff notes
      (`.spec_system/specs/phase02-session04-batch-flow-validation-and-closeout/implementation-notes.md`)

---

## Testing (5 tasks)

Verify that the controlled-flow evidence is reproducible and that the repo
gate remains green.

- [x] T016 [S0204] Run the controlled closeout harness and confirm dry-run,
      resumability, report numbering, and merge or verify behavior
      (`scripts/test-batch-runner-closeout.mjs`)
- [x] T017 [S0204] Run the worker-contract and state-semantics harnesses after
      any fixes (`scripts/test-batch-runner-contract.mjs`)
- [x] T018 [S0204] Run `node scripts/test-all.mjs --quick` to keep the
      repo-drift gate green (`scripts/test-all.mjs`)
- [x] T019 [S0204] Validate ASCII encoding and Unix LF endings across touched
      files (`.`)
- [x] T020 [S0204] Walk a temp-sandbox batch run through `--dry-run`, a normal
      run, and `--retry-failed` to confirm the operator-facing flow matches
      the captured evidence (`batch/batch-runner.sh`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] `implementation-notes.md` updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
