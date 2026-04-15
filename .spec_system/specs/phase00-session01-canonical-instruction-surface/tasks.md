# Task Checklist

**Session ID**: `phase00-session01-canonical-instruction-surface`
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
| Setup | 3 | 0 | 3 |
| Foundation | 4 | 0 | 4 |
| Implementation | 5 | 0 | 5 |
| Testing | 4 | 0 | 4 |
| **Total** | **16** | **0** | **16** |

---

## Setup (3 tasks)

Initial review and scope confirmation for the canonical contract surface.

- [x] T001 [S0001] Review active working-tree edits that touch contract
      validation before editing `scripts/test-all.mjs` (`scripts/test-all.mjs`)
- [x] T002 [S0001] Inspect live legacy instruction-doc references on the
      active contract path (`.`)
- [x] T003 [S0001] Confirm Session 01 boundaries against the PRD and session
      stub before changing files
      (`.spec_system/PRD/phase_00/session_01_canonical_instruction_surface.md`)

---

## Foundation (4 tasks)

Align the canonical skill and validation baseline to the real repo contract.

- [x] T004 [S0001] [P] Rewrite the skill read order around `AGENTS.md` and
      existing checked-in docs (`.codex/skills/career-ops/SKILL.md`)
- [x] T005 [S0001] [P] Align skill bootstrap and setup rules with the current
      `AGENTS.md` startup contract (`.codex/skills/career-ops/SKILL.md`)
- [x] T006 [S0001] [P] Replace legacy-doc instruction-surface checks with
      canonical file checks (`scripts/test-all.mjs`)
- [x] T007 [S0001] Add content assertions and output messaging for the real
      instruction surface (`scripts/test-all.mjs`)

---

## Implementation (5 tasks)

Remove blocking missing-doc dependencies from active workflow files.

- [x] T008 [S0001] [P] Remove the missing `docs/CLAUDE.md` dependency from
      shared workflow guidance (`modes/_shared.md`)
- [x] T009 [S0001] Normalize any remaining required legacy-doc wording in the
      `career-ops` skill (`.codex/skills/career-ops/SKILL.md`)
- [x] T010 [S0001] Reconcile contract-surface changes with the existing local
      diff without reverting unrelated edits (`scripts/test-all.mjs`)
- [x] T011 [S0001] Search for remaining required `docs/CODEX.md` or
      `docs/CLAUDE.md` references in active contract files and patch any
      blockers found (`.`)
- [x] T012 [S0001] Refresh validation labels or inline comments so the quick
      suite names the Codex-primary contract clearly (`scripts/test-all.mjs`)

---

## Testing (4 tasks)

Verification that the canonical instruction surface is now the live contract.

- [x] T013 [S0001] [P] Run `node --check` for the updated validator
      (`scripts/test-all.mjs`)
- [x] T014 [S0001] [P] Run `node scripts/test-all.mjs --quick` and inspect the
      instruction-surface results (`scripts/test-all.mjs`)
- [x] T015 [S0001] [P] Re-scan the active contract path for legacy instruction
      dependencies and record any deferred drift (`.`)
- [x] T016 [S0001] Validate ASCII-only encoding and LF endings on touched
      session files (`.codex/skills/career-ops/SKILL.md`)

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

Run the implement workflow step to begin AI-led implementation.
