# Task Checklist

**Session ID**: `phase01-session02-contributor-support-docs-alignment`
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

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 3 | 3 | 0 |
| Foundation | 4 | 4 | 0 |
| Implementation | 8 | 8 | 0 |
| Testing | 5 | 5 | 0 |
| **Total** | **20** | **20** | **0** |

---

## Setup (3 tasks)

Confirm the phase boundary, capture the live contributor/support baseline, and
prepare the session notes artifact.

- [x] T001 [S0102] Review the Phase 01 goals, Session 02 stub, Session 01
      handoff, and phase ownership boundaries
      (`.spec_system/PRD/phase_01/session_02_contributor_support_docs_alignment.md`)
- [x] T002 [S0102] Capture the live contributor and support docs baseline plus
      drift inventory from root and `docs/` surfaces
      (`.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md`)
- [x] T003 [S0102] Create the session notes scaffold for contributor/support
      wording decisions, corrected links, and deferred findings
      (`.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md`)

---

## Foundation (4 tasks)

Verify the source-of-truth command surface and map each docs target before
editing.

- [x] T004 [S0102] [P] Verify the live validation command surface and command
      names exposed through `package.json` (`package.json`)
- [x] T005 [S0102] [P] Verify the current setup, scripts, architecture, and
      security docs targets that contributor/support pages should link to
      (`docs/SETUP.md`)
- [x] T006 [S0102] Map the root contributor entrypoint to the detailed guide
      and the intended support escalation path (`CONTRIBUTING.md`)
- [x] T007 [S0102] Map contributor and support wording drift, including stale
      runtime language and broken docs-local relative links (`docs/SUPPORT.md`)

---

## Implementation (8 tasks)

Update the contributor and support surfaces while preserving the Session 01
onboarding contract.

- [x] T008 [S0102] Refresh the root contributor entrypoint so it stays concise,
      Codex-primary, and consistent with the docs guide (`CONTRIBUTING.md`)
- [x] T009 [S0102] Rewrite the `docs/CONTRIBUTING.md` introduction and
      pre-submit guidance around the live Codex workflow
      (`docs/CONTRIBUTING.md`)
- [x] T010 [S0102] Update contributor validation guidance with the current repo
      checks and when contributors should run them (`docs/CONTRIBUTING.md`)
- [x] T011 [S0102] Tighten contributor cross-links to setup, architecture, and
      scripts docs from the correct relative paths (`docs/CONTRIBUTING.md`)
- [x] T012 [S0102] Rewrite `docs/SUPPORT.md` help-routing table and pre-issue
      checklist to match the Codex-primary runtime (`docs/SUPPORT.md`)
- [x] T013 [S0102] Update `docs/SUPPORT.md` requested diagnostics so setup and
      bug reports ask for actionable environment details (`docs/SUPPORT.md`)
- [x] T014 [S0102] Fix `docs/SUPPORT.md` docs-local links for setup and
      security help from the perspective of the `docs/` directory
      (`docs/SUPPORT.md`)

- [x] T015 [S0102] Record the final wording decisions, corrected link map, and
      deferred follow-up items in session notes
      (`.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md`)

---

## Testing (5 tasks)

Verify the updated contributor/support path against the live repo command
surface and docs topology.

- [x] T016 [S0102] [P] Run targeted `rg` checks across touched docs for stale
      alternate-runtime wording and broken internal link targets (`.`)
- [x] T017 [S0102] [P] Run `npm run doctor` and confirm the support/setup
      guidance still matches live behavior (`scripts/doctor.mjs`)
- [x] T018 [S0102] [P] Run `node scripts/test-all.mjs --quick` and confirm the
      docs updates do not regress the repo gate (`scripts/test-all.mjs`)
- [x] T019 [S0102] [P] Manually review the path from onboarding to
      contributing to support and confirm the cross-links and escalation
      guidance are consistent (`docs/SUPPORT.md`)
- [x] T020 [S0102] [P] Validate ASCII encoding and Unix LF line endings across
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

Run the `validate` workflow step to verify the completed session.
