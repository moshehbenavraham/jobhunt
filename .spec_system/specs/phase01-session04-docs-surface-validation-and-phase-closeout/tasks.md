# Task Checklist

**Session ID**: `phase01-session04-docs-surface-validation-and-phase-closeout`
**Total Tasks**: 20
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
| Foundation     | 5      | 5      | 0         |
| Implementation | 7      | 7      | 0         |
| Testing        | 5      | 5      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (3 tasks)

Confirm the closeout scope, capture the baseline, and prepare the notes
artifact for the final Phase 01 sweep.

- [x] T001 [S0104] Review the Phase 01 goals, Session 04 stub, and prior
      session handoff boundaries for docs closeout
      (`.spec_system/PRD/phase_01/session_04_docs_surface_validation_and_phase_closeout.md`)
- [x] T002 [S0104] Capture the live secondary-docs baseline and remaining
      runtime-drift inventory in session notes
      (`.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md`)
- [x] T003 [S0104] Create the session notes scaffold for index fixes,
      residual phase handoff, and closeout evidence
      (`.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md`)

---

## Foundation (5 tasks)

Verify the closeout rules and map the exact remaining docs and residual-drift
surface before editing.

- [x] T004 [S0104] [P] Verify the Phase 01 closeout objectives and later-phase
      ownership boundaries against the master PRD (`docs/prev-prd/PRD-codex-convert.md`)
- [x] T005 [S0104] [P] Verify the conventions and considerations that govern
      docs closeout, validator alignment, and explicit deferrals
      (`docs/CONVENTIONS.md`)
- [x] T006 [S0104] [P] Audit the docs index surface for missing Phase 01 pages
      and weak routing paths (`docs/README-docs.md`)
- [x] T007 [S0104] [P] Audit secondary docs surfaces for stale onboarding
      order and incomplete routing guidance (`docs/onboarding.md`)
- [x] T008 [S0104] Audit repo-wide residual runtime references and classify
      each finding into Phase 02 or Phase 03 ownership (`.`)

---

## Implementation (7 tasks)

Apply the final docs index and routing corrections while keeping later-phase
cleanup out of scope.

- [x] T009 [S0104] Expand the docs index so the final Phase 01 surfaces are
      discoverable from one entrypoint (`docs/README-docs.md`)
- [x] T010 [S0104] Reorder the onboarding checklist so required user-layer
      files are created before `npm run doctor` (`docs/onboarding.md`)
- [x] T011 [S0104] Tighten onboarding links to the authoritative setup,
      data-contract, and customization docs (`docs/onboarding.md`)
- [x] T012 [S0104] Refresh development references so contributors can reach
      the current contributing, support, and customization surfaces
      (`docs/development.md`)
- [x] T013 [S0104] Record the final docs index map and corrected secondary-doc
      routes in session notes
      (`.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md`)
- [x] T014 [S0104] Record the residual runtime-reference inventory with
      explicit Phase 02 versus Phase 03 ownership in session notes
      (`.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md`)
- [x] T015 [S0104] Record the Phase 01 closeout notes, unresolved low-risk
      items, and validation expectations for handoff
      (`.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md`)

---

## Testing (5 tasks)

Verify the closeout edits against the live contract and repo validation gate.

- [x] T016 [S0104] [P] Run targeted `rg` checks so touched docs no longer tell
      users to run `npm run doctor` before required files exist (`.`)
- [x] T017 [S0104] [P] Run a local markdown-link existence check across the
      touched README/docs surfaces (`.`)
- [x] T018 [S0104] [P] Manually review the docs index and secondary pages
      against the established Phase 01 reference surfaces
      (`docs/README-docs.md`)
- [x] T019 [S0104] [P] Run `node scripts/test-all.mjs --quick` and confirm the
      closeout edits keep the repo validator green (`scripts/test-all.mjs`)
- [x] T020 [S0104] [P] Validate ASCII encoding and Unix LF line endings across
      the touched docs and session notes (`.`)

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

Run the `validate` workflow step to verify session completeness.
