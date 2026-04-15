# Task Checklist

**Session ID**: `phase02-session03-batch-runtime-docs-alignment`
**Total Tasks**: 21
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
| Foundation     | 7      | 0     | 7         |
| Implementation | 8      | 0     | 8         |
| Testing        | 4      | 0     | 4         |
| **Total**      | **21** | **0** | **21**    |

---

## Setup (2 tasks)

Confirm the docs-alignment boundary, capture the stale runtime surface, and
prepare the session notes artifact.

- [x] T001 [S0203] Review the Phase 02 goals, Session 03 stub, and Session 02
      handoff boundaries for batch runtime docs alignment
      (`.spec_system/PRD/phase_02/session_03_batch_runtime_docs_alignment.md`)
- [x] T002 [S0203] Capture the stale runtime-doc inventory, operator questions,
      and Phase 03 deferral boundary in the session notes
      (`.spec_system/specs/phase02-session03-batch-runtime-docs-alignment/implementation-notes.md`)

---

## Foundation (7 tasks)

Verify the governing rules and audit the live runtime surfaces before editing
the docs.

- [x] T003 [S0203] [P] Verify the master PRD and Phase 02 success criteria for
      batch-owned docs (`.spec_system/PRD/PRD.md`)
- [x] T004 [S0203] [P] Verify conventions, active concerns, validator coupling,
      and docs-local link rules for this session (`.spec_system/CONVENTIONS.md`)
- [x] T005 [S0203] Audit the live worker launch path, flags, artifact
      locations, and merge or verify flow that the docs must describe
      (`batch/batch-runner.sh`)
- [x] T006 [S0203] [P] Audit the structured result schema and fixtures for
      operator-visible status, warning, and error semantics
      (`batch/worker-result.schema.json`)
- [x] T007 [S0203] [P] Audit the standalone batch operator guide for stale
      runtime instructions and missing validation guidance
      (`batch/README-batch.md`)
- [x] T008 [S0203] [P] Audit the repo architecture summary for missing
      `codex exec` and structured-result details (`docs/ARCHITECTURE.md`)
- [x] T009 [S0203] [P] Audit the routed batch mode instructions and decide the
      minimum runtime-only corrections needed before Session 04 validation
      (`modes/batch.md`)

---

## Implementation (8 tasks)

Rewrite the session-owned docs so operators and contributors see the live
batch runtime instead of the pre-conversion design.

- [x] T010 [S0203] Rewrite the batch README overview, quick start, and
      prerequisites around the live `codex exec` runtime
      (`batch/README-batch.md`)
- [x] T011 [S0203] Update batch README options, directory layout, and
      log or result artifact descriptions to match the current runner
      contract (`batch/README-batch.md`)
- [x] T012 [S0203] Document batch README state semantics, retry behavior,
      resumability, and merge or verify steps for operators
      (`batch/README-batch.md`)
- [x] T013 [S0203] Add batch README validation and troubleshooting guidance
      anchored to the current repo scripts and closeout flow
      (`batch/README-batch.md`)
- [x] T014 [S0203] Update the architecture batch-processing section to
      describe `codex exec`, the structured result contract, and the repo-owned
      merge and verification flow (`docs/ARCHITECTURE.md`)
- [x] T015 [S0203] Update architecture data-flow and integrity notes so batch
      artifacts and operator docs point to the live runtime contract
      (`docs/ARCHITECTURE.md`)
- [x] T016 [S0203] Apply only the batch-runtime corrections needed in
      `modes/batch.md` to remove stale `claude -p` execution guidance without
      reopening broader Phase 03 cleanup (`modes/batch.md`)
- [x] T017 [S0203] Capture the final Phase 03 deferral ledger and docs-to-code
      evidence in the session implementation notes
      (`.spec_system/specs/phase02-session03-batch-runtime-docs-alignment/implementation-notes.md`)

---

## Testing (4 tasks)

Verify that the rewritten docs match the live runtime and preserve the repo
validation surface.

- [x] T018 [S0203] [P] Run a docs-to-code audit against runner flags, state
      values, structured-result semantics, and merge or verify commands to
      confirm the rewritten docs match live behavior (`batch/README-batch.md`)
- [x] T019 [S0203] [P] Scan the session-owned doc surfaces to confirm
      `codex exec` is the documented runtime and stale `claude -p` guidance is
      removed or explicitly deferred (`.`)
- [x] T020 [S0203] [P] Run `node scripts/test-all.mjs --quick` to confirm the
      repo-drift validation surface stays green after the docs changes
      (`scripts/test-all.mjs`)
- [x] T021 [S0203] [P] Validate ASCII encoding and Unix LF line endings across
      the touched docs and session notes (`.`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] `implementation-notes.md` updated
- [x] Ready for the `implement` workflow step

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
