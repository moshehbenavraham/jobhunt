# Task Checklist

**Session ID**: `phase00-session04-validation-drift-closeout`
**Total Tasks**: 17
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
| Setup | 3 | 0 | 3 |
| Foundation | 4 | 0 | 4 |
| Implementation | 5 | 0 | 5 |
| Testing | 5 | 0 | 5 |
| **Total** | **17** | **0** | **17** |

---

## Setup (3 tasks)

Confirm closeout scope, capture the live baseline, and prepare the exit report
artifact.

- [x] T001 [S0004] Review Phase 00 goals, Session 04 scope, and prerequisite
      session outputs against the PRD
      (`.spec_system/PRD/phase_00/session_04_validation_drift_closeout.md`)
- [x] T002 [S0004] Capture baseline outputs for `node scripts/update-system.mjs check`,
      `node scripts/test-all.mjs --quick`, and `npm run doctor` (`.`)
- [x] T003 [S0004] Create the Phase 00 exit report scaffold for validation
      evidence and residual-gap decisions
      (`.spec_system/specs/phase00-session04-validation-drift-closeout/phase00-exit-report.md`)

---

## Foundation (4 tasks)

Identify the exact Phase 00-owned drift and map it to the closeout report.

- [x] T004 [S0004] [P] Audit the doctor success path and isolate the remaining
      legacy runtime hint (`scripts/doctor.mjs`)
- [x] T005 [S0004] [P] Audit repo validation coverage for setup-validator
      runtime drift and closeout evidence gaps (`scripts/test-all.mjs`)
- [x] T006 [S0004] Reconcile the Session 03 residual inventory with the
      current repo scan so Phase 00 blockers are separated from later-phase
      deferrals
      (`.spec_system/specs/phase00-session03-codex-metadata-alignment/residual-legacy-references.md`)
- [x] T007 [S0004] Map Phase 00 success criteria to concrete validator
      commands and exit-report sections
      (`.spec_system/specs/phase00-session04-validation-drift-closeout/phase00-exit-report.md`)

---

## Implementation (5 tasks)

Align the validator surfaces and capture the phase-exit evidence.

- [x] T008 [S0004] Replace the doctor success footer with Codex-primary launch
      guidance while preserving the existing setup checks (`scripts/doctor.mjs`)
- [x] T009 [S0004] Add repo validation coverage for the doctor success output
      and validator-surface runtime contract (`scripts/test-all.mjs`)
- [x] T010 [S0004] Record the validation baseline results and updater status
      in the Phase 00 exit report
      (`.spec_system/specs/phase00-session04-validation-drift-closeout/phase00-exit-report.md`)
- [x] T011 [S0004] Record confirmed Phase 01 and Phase 02 residual deferrals
      plus any remaining Phase 00 blockers in the exit report
      (`.spec_system/specs/phase00-session04-validation-drift-closeout/phase00-exit-report.md`)
- [x] T012 [S0004] Summarize the recommended Phase 00 handoff state and next
      decision points for `validate` and `updateprd`
      (`.spec_system/specs/phase00-session04-validation-drift-closeout/phase00-exit-report.md`)

---

## Testing (5 tasks)

Verify the updated validator contract and the captured closeout evidence.

- [x] T013 [S0004] [P] Run `node --check` on the updated doctor validator
      (`scripts/doctor.mjs`)
- [x] T014 [S0004] [P] Run `node --check` on the updated repo test suite
      (`scripts/test-all.mjs`)
- [x] T015 [S0004] [P] Run `npm run doctor` and verify the success footer
      points to `codex` (`scripts/doctor.mjs`)
- [x] T016 [S0004] [P] Run `node scripts/test-all.mjs --quick` and confirm
      the strengthened validator checks pass (`scripts/test-all.mjs`)
- [x] T017 [S0004] [P] Run targeted `rg` checks across validator surfaces to
      confirm no Phase 00-owned legacy runtime hint remains (`.`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the validate workflow step

---

## Next Steps

Session complete. The phase closeout artifacts are ready for the next
workflow step.
