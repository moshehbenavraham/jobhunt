# Task Checklist

**Session ID**: `phase01-session01-public-quick-start-alignment`
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

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 4      | 4      | 0         |
| Implementation | 6      | 6      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **17** | **17** | **0**     |

---

## Setup (3 tasks)

Confirm the phase boundary, capture the live onboarding baseline, and prepare
the session notes artifact.

- [x] T001 [S0101] Review the Phase 01 goals, Session 01 stub, and Phase 00
      deferral boundaries against the PRD
      (`.spec_system/PRD/phase_01/session_01_public_quick_start_alignment.md`)
- [x] T002 [S0101] Capture the live onboarding baseline from `README.md`,
      `docs/SETUP.md`, `package.json`, and `scripts/doctor.mjs`
      (`.spec_system/specs/phase01-session01-public-quick-start-alignment/implementation-notes.md`)
- [x] T003 [S0101] Create the session notes scaffold for the canonical
      first-run command matrix and deferred findings
      (`.spec_system/specs/phase01-session01-public-quick-start-alignment/implementation-notes.md`)

---

## Foundation (4 tasks)

Verify the source-of-truth command surface and map the two public docs to one
shared onboarding sequence.

- [x] T004 [S0101] [P] Verify the exact doctor prerequisites and fix hints that
      public onboarding docs must honor (`scripts/doctor.mjs`)
- [x] T005 [S0101] [P] Verify the live onboarding and validation command names
      exposed through npm scripts (`package.json`)
- [x] T006 [S0101] Map the README quick-start, user-layer inputs, and docs
      links to the canonical first-run sequence (`README.md`)
- [x] T007 [S0101] Map the setup guide sections to the canonical order for
      clone, configure, validate, and launch (`docs/SETUP.md`)

---

## Implementation (6 tasks)

Update the public onboarding surfaces and record the final command contract.

- [x] T008 [S0101] Rewrite the README quick-start sequence so required
      user-layer files are created before `npm run doctor` (`README.md`)
- [x] T009 [S0101] Update the README onboarding copy to explain what
      `npm run doctor` validates and when to run it (`README.md`)
- [x] T010 [S0101] Normalize the README public entrypoint wording so it names
      `codex` and repo-owned commands only (`README.md`)
- [x] T011 [S0101] Reorder `docs/SETUP.md` so profile setup, `portals.yml`, and
      `cv.md` creation happen before environment validation (`docs/SETUP.md`)
- [x] T012 [S0101] Refresh `docs/SETUP.md` so initial setup checks and
      follow-up verification commands are clearly separated (`docs/SETUP.md`)
- [x] T013 [S0101] Record the final command matrix, deferred findings, and
      implementation decisions in session notes
      (`.spec_system/specs/phase01-session01-public-quick-start-alignment/implementation-notes.md`)

---

## Testing (4 tasks)

Verify the documented onboarding path against the live repo command surface.

- [x] T014 [S0101] [P] Run `npm run doctor` and confirm the documented setup
      validation step still matches live behavior (`scripts/doctor.mjs`)
- [x] T015 [S0101] [P] Run `node scripts/test-all.mjs --quick` and confirm the
      docs changes do not regress the repo gate (`scripts/test-all.mjs`)
- [x] T016 [S0101] [P] Run targeted `rg` checks across `README.md` and
      `docs/SETUP.md` for stale alternate-runtime wording and premature
      `npm run doctor` instructions (`.`)
- [x] T017 [S0101] [P] Manually review the clone-to-`codex` path across
      `README.md` and `docs/SETUP.md` for consistent sequencing and cross-links
      (`docs/SETUP.md`)

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

Run the `validate` workflow step to verify the completed session.
