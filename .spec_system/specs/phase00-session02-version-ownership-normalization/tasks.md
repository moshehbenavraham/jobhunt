# Task Checklist

**Session ID**: `phase00-session02-version-ownership-normalization`
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

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 4      | 4      | 0         |
| Implementation | 5      | 5      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **16** | **16** | **0**     |

---

## Setup (3 tasks)

Audit the live version surfaces and confirm session boundaries before editing.

- [x] T001 [S0002] Review current semver values in the canonical and mirrored
      version files (`VERSION`)
- [x] T002 [S0002] Inspect updater version-resolution and legacy-path handling
      (`scripts/update-system.mjs`)
- [x] T003 [S0002] Confirm Session 02 scope and success criteria against the
      PRD and session stub
      (`.spec_system/PRD/phase_00/session_02_version_ownership_normalization.md`)

---

## Foundation (4 tasks)

Establish the canonical version target and align base metadata surfaces.

- [x] T004 [S0002] Normalize the retained canonical semver in the root source
      of truth (`VERSION`)
- [x] T005 [S0002] [P] Align package manifest version metadata with the
      canonical root version (`package.json`)
- [x] T006 [S0002] [P] Align lockfile package version metadata with the
      canonical root version (`package-lock.json`)
- [x] T007 [S0002] Refactor updater helpers to resolve local version state
      from root `VERSION` as the sole authoritative path
      (`scripts/update-system.mjs`)

---

## Implementation (5 tasks)

Remove residual legacy handling and tighten validation around version drift.

- [x] T008 [S0002] Remove legacy `docs/VERSION` constants and cleanup branches
      from updater configuration (`scripts/update-system.mjs`)
- [x] T009 [S0002] Update git-ref version lookups to stop probing deprecated
      version paths (`scripts/update-system.mjs`)
- [x] T010 [S0002] Add explicit version consistency checks across `VERSION`,
      `package.json`, and `package-lock.json` (`scripts/test-all.mjs`)
- [x] T011 [S0002] Improve validation output so version drift identifies the
      mismatched file and expected canonical value (`scripts/test-all.mjs`)
- [x] T012 [S0002] Search repo-owned runtime files for lingering secondary
      version-source assumptions and patch any blockers found (`.`)

---

## Testing (4 tasks)

Verify that canonical version ownership and drift detection now work end to end.

- [x] T013 [S0002] [P] Run `node --check` on the updated updater script
      (`scripts/update-system.mjs`)
- [x] T014 [S0002] [P] Run `node --check` on the strengthened repo validator
      (`scripts/test-all.mjs`)
- [x] T015 [S0002] [P] Run `node scripts/update-system.mjs check` and confirm
      the reported local version matches root `VERSION`
      (`scripts/update-system.mjs`)
- [x] T016 [S0002] [P] Run `node scripts/test-all.mjs --quick` and validate
      ASCII-only, LF, and version-consistency results on touched files
      (`scripts/test-all.mjs`)

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
