# Task Checklist

**Session ID**: `phase01-session03-customization-and-policy-runtime-cleanup`
**Total Tasks**: 21
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
| Implementation | 8      | 8      | 0         |
| Testing        | 5      | 5      | 0         |
| **Total**      | **21** | **21** | **0**     |

---

## Setup (3 tasks)

Confirm the phase boundary, capture the live docs baseline, and prepare the
session notes artifact.

- [x] T001 [S0103] Review the Phase 01 goals, Session 03 stub, and scope
      boundaries for customization and policy cleanup
      (`.spec_system/PRD/phase_01/session_03_customization_and_policy_runtime_cleanup.md`)
- [x] T002 [S0103] Capture the live customization and legal docs baseline plus
      drift inventory in session notes
      (`.spec_system/specs/phase01-session03-customization-and-policy-runtime-cleanup/implementation-notes.md`)
- [x] T003 [S0103] Create the session notes scaffold for wording decisions,
      removed references, and deferred follow-up items
      (`.spec_system/specs/phase01-session03-customization-and-policy-runtime-cleanup/implementation-notes.md`)

---

## Foundation (5 tasks)

Verify the live contract surfaces and map the exact docs drift before editing.

- [x] T004 [S0103] [P] Verify runtime ownership and startup rules against the
      canonical repo contract (`AGENTS.md`)
- [x] T005 [S0103] [P] Verify the user-layer versus system-layer ownership
      rules that customization docs must follow (`docs/DATA_CONTRACT.md`)
- [x] T006 [S0103] [P] Verify the active checked-in skill bootstrap and
      runtime wording that user-facing docs must match
      (`.codex/skills/jobhunt/SKILL.md`)
- [x] T007 [S0103] Map stale `.claude`, personalization, and search-guidance
      drift inside the customization doc (`docs/CUSTOMIZATION.md`)
- [x] T008 [S0103] Map local-execution, provider, and docs-local link drift in
      the legal disclaimer (`docs/LEGAL_DISCLAIMER.md`)

---

## Implementation (8 tasks)

Update the customization and policy docs while preserving the established
Phase 01 runtime contract.

- [x] T009 [S0103] Rewrite the customization doc introduction and source-of-
      truth sections around the live user-layer files (`docs/CUSTOMIZATION.md`)
- [x] T010 [S0103] Replace stale hook and runtime guidance with the repo's
      current checked-in customization surfaces (`docs/CUSTOMIZATION.md`)
- [x] T011 [S0103] Correct negotiation and personalization guidance so
      user-specific changes stay out of shared system files
      (`docs/CUSTOMIZATION.md`)
- [x] T012 [S0103] Refresh customization examples and file references so
      templates, targeting, and states guidance matches the live repo
      (`docs/CUSTOMIZATION.md`)
- [x] T013 [S0103] Rewrite the legal disclaimer introduction and data-privacy
      sections around local execution and user-chosen provider responsibility
      (`docs/LEGAL_DISCLAIMER.md`)
- [x] T014 [S0103] Refresh AI model behavior, platform, and acceptable-use
      wording to preserve the human-in-the-loop and Terms-of-Service boundary
      (`docs/LEGAL_DISCLAIMER.md`)
- [x] T015 [S0103] Fix docs-local links and stale runtime references in the
      legal disclaimer, including the repo license path
      (`docs/LEGAL_DISCLAIMER.md`)
- [x] T016 [S0103] Record the final wording decisions, removed references, and
      deferred follow-up items in session notes
      (`.spec_system/specs/phase01-session03-customization-and-policy-runtime-cleanup/implementation-notes.md`)

---

## Testing (5 tasks)

Verify the updated docs against the live repo contract and validation gate.

- [x] T017 [S0103] [P] Run targeted `rg` checks across the touched docs for
      stale `.claude` references and contradictory personalization guidance
      (`.`)
- [x] T018 [S0103] [P] Run `node scripts/test-all.mjs --quick` and confirm the
      docs updates do not regress the repo gate (`scripts/test-all.mjs`)
- [x] T019 [S0103] [P] Manually review `docs/CUSTOMIZATION.md` against
      `AGENTS.md`, `docs/DATA_CONTRACT.md`, and the checked-in skill contract
      (`docs/CUSTOMIZATION.md`)
- [x] T020 [S0103] [P] Manually review `docs/LEGAL_DISCLAIMER.md` for
      local-execution, privacy, acceptable-use, and link correctness
      (`docs/LEGAL_DISCLAIMER.md`)
- [x] T021 [S0103] [P] Validate ASCII encoding and Unix LF line endings across
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

Run the `implement` workflow step to begin AI-led implementation.
