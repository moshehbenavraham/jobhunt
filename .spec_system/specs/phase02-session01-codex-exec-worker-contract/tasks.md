# Task Checklist

**Session ID**: `phase02-session01-codex-exec-worker-contract`
**Total Tasks**: 23
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

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 6      | 6      | 0         |
| Implementation | 10     | 10     | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **23** | **23** | **0**     |

---

## Setup (3 tasks)

Confirm scope, capture the baseline, and prepare the session notes artifact.

- [x] T001 [S0201] Review the Phase 02 goals, Session 01 stub, and current
      batch-runtime boundaries
      (`.spec_system/PRD/phase_02/session_01_codex_exec_worker_contract.md`)
- [x] T002 [S0201] Capture the current worker-launch, placeholder, and
      log-scrape baseline in session notes
      (`.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md`)
- [x] T003 [S0201] Create the session notes scaffold for contract decisions,
      test evidence, and Session 02 handoff
      (`.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md`)

---

## Foundation (6 tasks)

Verify the governing rules and define the reusable contract assets before
editing the runtime path.

- [x] T004 [S0201] [P] Verify the `codex exec` contract requirements and
      phase boundaries against the master PRD (`.spec_system/PRD/PRD.md`)
- [x] T005 [S0201] [P] Verify conventions, validator expectations, and active
      concerns governing batch-runtime edits (`.spec_system/CONVENTIONS.md`)
- [x] T006 [S0201] [P] Audit the current `claude -p` runner launch path,
      temp files, and state touchpoints (`batch/batch-runner.sh`)
- [x] T007 [S0201] [P] Audit the worker prompt placeholders and stdout JSON
      contract that must be minimally adapted (`batch/batch-prompt.md`)
- [x] T008 [S0201] [P] Define the checked-in worker result schema for
      `completed`, `partial`, and `failed` outcomes
      (`batch/worker-result.schema.json`)
- [x] T009 [S0201] [P] Create the stub `codex` executable used by contract
      regression tests (`batch/test-fixtures/mock-codex-exec.sh`)

---

## Implementation (10 tasks)

Replace the worker contract boundary, add reusable fixtures, and wire the new
runtime path into repo validation.

- [x] T010 [S0201] Add result-file, last-message, and event-log path helpers
      plus `codex` prerequisite checks to the runner
      (`batch/batch-runner.sh`)
- [x] T011 [S0201] Thread `{{RESULT_FILE}}` through resolved prompt generation
      without breaking the existing batch placeholders
      (`batch/batch-runner.sh`)
- [x] T012 [S0201] Replace the `claude -p` launch path with
      `codex exec -C "$PROJECT_DIR"` plus schema and last-message output
      flags, with explicit exit-code capture and failure-path handling
      (`batch/batch-runner.sh`)
- [x] T013 [S0201] Update the worker prompt so the final structured JSON
      result is written to `{{RESULT_FILE}}` and remains aligned with the
      checked-in schema (`batch/batch-prompt.md`)
- [x] T014 [S0201] [P] Create a completed-result fixture that represents the
      full report, PDF, and tracker success path
      (`batch/test-fixtures/worker-result-completed.json`)
- [x] T015 [S0201] [P] Create a partial-result fixture that represents
      degraded secondary artifacts without losing the primary evaluation
      (`batch/test-fixtures/worker-result-partial.json`)
- [x] T016 [S0201] [P] Create a failed-result fixture that represents
      semantic worker failure with a required error summary
      (`batch/test-fixtures/worker-result-failed.json`)
- [x] T017 [S0201] Create the Codex contract harness that validates CLI
      arguments, repo-root execution, schema wiring, and fixture-backed result
      capture (`scripts/test-batch-runner-contract.mjs`)
- [x] T018 [S0201] Integrate the batch contract harness into the quick
      regression suite (`scripts/test-all.mjs`)
- [x] T019 [S0201] Record contract decisions, residual Session 02 state
      mapping work, and implementation evidence in session notes
      (`.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md`)

---

## Testing (4 tasks)

Verify the new contract boundary locally before handing off to `implement`.

- [x] T020 [S0201] [P] Run `bash -n` and the contract harness to verify runner
      syntax, CLI arguments, schema validation, and result-file creation paths
      (`batch/batch-runner.sh`)
- [x] T021 [S0201] [P] Run `node scripts/test-all.mjs --quick` and confirm
      the new batch contract coverage passes (`scripts/test-all.mjs`)
- [x] T022 [S0201] [P] Manual dry-run the runner against the stub `codex`
      executable to verify lock, temp-file, and cleanup behavior
      (`batch/batch-runner.sh`)
- [x] T023 [S0201] [P] Validate ASCII encoding and Unix LF line endings across
      touched batch assets, fixtures, and session notes (`.`)

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
