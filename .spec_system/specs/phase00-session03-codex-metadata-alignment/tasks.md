# Task Checklist

**Session ID**: `phase00-session03-codex-metadata-alignment`
**Total Tasks**: 16
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
| Implementation | 5 | 5 | 0 |
| Testing | 4 | 4 | 0 |
| **Total** | **16** | **16** | **0** |

---

## Setup (3 tasks)

Confirm scope, capture the blocking metadata surface, and prepare the residual
inventory artifact.

- [x] T001 [S0003] Review Session 03 scope, prerequisites, and success
      criteria against the PRD and session stub
      (`.spec_system/PRD/phase_00/session_03_codex_metadata_alignment.md`)
- [x] T002 [S0003] Capture the current blocking `.claude` and dead root-doc
      metadata references in updater, docs, and GitHub surfaces (`.`)
- [x] T003 [S0003] Create the residual legacy reference inventory scaffold for
      deferred non-blocking cleanup
      (`.spec_system/specs/phase00-session03-codex-metadata-alignment/residual-legacy-references.md`)

---

## Foundation (4 tasks)

Align the canonical path owners and contributor metadata foundations with the
live Codex-first layout.

- [x] T004 [S0003] Replace the updater system-layer skill path with
      `.codex/skills/` (`scripts/update-system.mjs`)
- [x] T005 [S0003] [P] Align the data-contract system-layer skills entry with
      `.codex/skills/*` (`docs/DATA_CONTRACT.md`)
- [x] T006 [S0003] [P] Update labeler globs to target `AGENTS.md`,
      `docs/DATA_CONTRACT.md`, `.codex/skills/**`, and live docs paths
      (`.github/labeler.yml`)
- [x] T007 [S0003] [P] Fix PR template contributor links to the live docs
      paths (`.github/PULL_REQUEST_TEMPLATE.md`)

---

## Implementation (5 tasks)

Repair the remaining contributor metadata links and add drift-prevention
coverage.

- [x] T008 [S0003] [P] Fix welcome workflow links to the live docs paths
      (`.github/workflows/welcome.yml`)
- [x] T009 [S0003] [P] Fix the bug-report Code of Conduct link to the live
      docs path (`.github/ISSUE_TEMPLATE/bug_report.yml`)
- [x] T010 [S0003] [P] Fix the feature-request Code of Conduct link to the
      live docs path (`.github/ISSUE_TEMPLATE/feature_request.yml`)
- [x] T011 [S0003] Add metadata drift assertions for canonical skill paths and
      contributor doc links (`scripts/test-all.mjs`)
- [x] T012 [S0003] Populate the residual legacy inventory with file, reason,
      and owning phase for each deferred non-blocking reference
      (`.spec_system/specs/phase00-session03-codex-metadata-alignment/residual-legacy-references.md`)

---

## Testing (4 tasks)

Verify the corrected metadata surface and the new guardrails.

- [x] T013 [S0003] [P] Run `node --check` on the updated updater script
      (`scripts/update-system.mjs`)
- [x] T014 [S0003] [P] Run `node --check` on the strengthened repo validator
      (`scripts/test-all.mjs`)
- [x] T015 [S0003] [P] Run targeted `rg` checks to confirm blocking `.claude`,
      `CLAUDE.md`, and dead root-doc references are removed from the scoped
      metadata surface (`.`)
- [x] T016 [S0003] [P] Run `node scripts/test-all.mjs --quick` and confirm
      the new metadata-path assertions pass (`scripts/test-all.mjs`)

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

Run the validate workflow step to verify the completed session.
