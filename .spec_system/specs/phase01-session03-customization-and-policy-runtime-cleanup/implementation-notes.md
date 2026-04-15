# Implementation Notes

**Session ID**: `phase01-session03-customization-and-policy-runtime-cleanup`
**Started**: 2026-04-15 09:57
**Last Updated**: 2026-04-15 10:03

---

## Session Progress

| Metric | Value |
|--------|-------|
| Tasks Completed | 21 / 21 |
| Estimated Remaining | 2-3 hours |
| Blockers | 0 |

---

## Environment Verified

- [x] Prerequisites confirmed via `check-prereqs.sh --json --env`
- [x] Required tools confirmed: `node`, `npm`, `rg`, `bash`, `jq`, `git`
- [x] Current session resolved via `analyze-project.sh --json`
- [x] Session directory present with `spec.md` and `tasks.md`

---

## Baseline Drift Inventory

### Customization Doc

- `docs/CUSTOMIZATION.md` sends user-specific negotiation changes into
  `modes/_shared.md`, which conflicts with `AGENTS.md` and
  `docs/DATA_CONTRACT.md`
- `docs/CUSTOMIZATION.md` documents optional Claude Code hooks in
  `.claude/settings.json`, but `.claude/settings.json` is not present and is
  not part of the live Codex-primary repo contract
- `docs/CUSTOMIZATION.md` needs a clearer source-of-truth split between
  user-layer files (`config/profile.yml`, `modes/_profile.md`, `portals.yml`,
  `cv.md`, `article-digest.md`) and shared system files

### Legal Disclaimer

- `docs/LEGAL_DISCLAIMER.md` is mostly aligned on local execution and
  no-telemetry posture, but its provider/runtime wording should avoid
  re-centering stale multi-runtime defaults
- `docs/LEGAL_DISCLAIMER.md` contains a docs-local license link
  (`[LICENSE](LICENSE)`) that resolves incorrectly from inside `docs/`
- `docs/LEGAL_DISCLAIMER.md` should keep user-chosen provider responsibility
  and human review requirements explicit without implying a hosted maintainer
  service

### Deferred Follow-Up Boundaries

- Batch runtime wording in `batch/`, `batch/README-batch.md`, and
  `modes/batch.md` remains deferred to Phase 02
- Metadata normalization outside the touched docs remains deferred to later
  phases

## Final Wording Decisions

- `docs/CUSTOMIZATION.md` now treats `config/profile.yml`,
  `modes/_profile.md`, `cv.md`, `article-digest.md`, `portals.yml`, and
  `interview-prep/story-bank.md` as the primary user-layer customization
  surfaces
- `docs/CUSTOMIZATION.md` now treats `modes/_shared.md`,
  `templates/cv-template.html`, `templates/states.yml`,
  `scripts/normalize-statuses.mjs`, `docs/*`, `AGENTS.md`, and
  `.codex/skills/*` as shared system-layer surfaces
- `docs/LEGAL_DISCLAIMER.md` now frames the project as local software with
  Codex-primary checked-in docs, while keeping provider choice and operating
  responsibility on the user
- Policy wording preserves the repo's no-telemetry, no-hosted-service, and
  human-in-the-loop posture without re-centering stale runtime defaults

## Removed Stale References

- Removed the old customization section for inactive hook integration
- Removed the incorrect instruction to place negotiation scripts in
  `modes/_shared.md`
- Removed docs-local links that assumed `LICENSE` and `CONTRIBUTING.md` lived
  inside `docs/`
- Removed policy wording that foregrounded older multi-runtime defaults

## Validation Summary

- Targeted drift grep returned no matches for stale hook guidance or bad
  docs-local link patterns
- Relative links from the touched docs resolve for `../AGENTS.md`,
  `DATA_CONTRACT.md`, `../CONTRIBUTING.md`, and `../LICENSE`
- `node scripts/test-all.mjs --quick` passed with 74 checks passed, 0 failed,
  and 0 warnings
- `file` reports all touched files as ASCII text
- Carriage-return scan found no CRLF line endings in the touched files

---

## Contract Sources Reviewed

- `.spec_system/PRD/phase_01/PRD_phase_01.md`
- `.spec_system/PRD/phase_01/session_03_customization_and_policy_runtime_cleanup.md`
- `.spec_system/specs/phase01-session03-customization-and-policy-runtime-cleanup/spec.md`
- `.spec_system/CONVENTIONS.md`
- `AGENTS.md`
- `docs/DATA_CONTRACT.md`
- `.codex/skills/career-ops/SKILL.md`
- `docs/CUSTOMIZATION.md`
- `docs/LEGAL_DISCLAIMER.md`

---

## Task Log

### 2026-04-15 - Session Start

**Environment verified**:
- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

### Task T001 - Review the Phase 01 goals and Session 03 scope boundaries

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Reviewed the Phase 01 PRD, the Session 03 stub, and the full session spec to
confirm the session stays limited to customization and policy docs and does
not absorb Phase 02 batch-runtime or later metadata cleanup.

### Task T002 - Capture the live doc baseline and drift inventory

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Captured the current `docs/CUSTOMIZATION.md` and `docs/LEGAL_DISCLAIMER.md`
baseline plus the initial drift inventory above, including stale `.claude`
hooks, misplaced personalization guidance, and the docs-local license link.

### Task T003 - Create the session notes scaffold

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Created this session-local implementation notes file with progress metrics,
environment verification, baseline drift inventory, and task-log structure.

### Task T004 - Verify runtime ownership and startup rules

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Verified in `AGENTS.md` that the repo's persistent instruction surface is
Codex-primary, startup checks must run from the repo root, and shared runtime
behavior belongs in system-layer files.

### Task T005 - Verify user-layer versus system-layer ownership

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Verified in `docs/DATA_CONTRACT.md` that personalization belongs in
`cv.md`, `config/profile.yml`, `modes/_profile.md`, `article-digest.md`,
`portals.yml`, and other user-layer outputs, while `modes/_shared.md`,
`docs/*`, and shared scripts remain update-safe system files.

### Task T006 - Verify checked-in skill bootstrap and runtime wording

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Verified in `.codex/skills/career-ops/SKILL.md` that the active checked-in
runtime surface is `AGENTS.md`, `docs/DATA_CONTRACT.md`, and the selected
mode files, not `.claude` hooks or alternate required companion docs.

### Task T007 - Map customization doc drift

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Mapped stale `.claude` references, incorrect shared-file personalization
guidance, and runtime-surface drift inside `docs/CUSTOMIZATION.md`.

### Task T008 - Map legal disclaimer drift

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 09:57
**Duration**: 0 minutes

Mapped the provider wording, runtime wording, and docs-local link drift in
`docs/LEGAL_DISCLAIMER.md` against the current local-first contract.

### Task T009 - Rewrite the customization doc introduction

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 10:00
**Duration**: 3 minutes

Rewrote the introduction around the user-layer versus system-layer split and
linked the doc directly to `AGENTS.md` and `docs/DATA_CONTRACT.md` as the live
sources of truth.

### Task T010 - Replace stale hook and runtime guidance

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 10:00
**Duration**: 3 minutes

Removed the stale `.claude/settings.json` hook section and replaced it with
the active runtime surfaces: `AGENTS.md`, `.codex/skills/career-ops/SKILL.md`,
and the repo validation scripts.

### Task T011 - Correct negotiation and personalization guidance

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 10:00
**Duration**: 3 minutes

Moved negotiation, archetype, and targeting guidance into the documented
user-layer files and made the "do not personalize `modes/_shared.md`" rule
explicit.

### Task T012 - Refresh customization examples and file references

**Started**: 2026-04-15 09:57
**Completed**: 2026-04-15 10:00
**Duration**: 3 minutes

Refreshed the examples and file references for `config/profile.yml`,
`portals.yml`, `templates/cv-template.html`, `templates/states.yml`, and
`scripts/normalize-statuses.mjs` so they match the checked-in repo.

### Task T013 - Rewrite the legal disclaimer introduction

**Started**: 2026-04-15 10:00
**Completed**: 2026-04-15 10:01
**Duration**: 1 minute

Reframed the introduction and privacy sections around local execution,
Codex-primary docs, no maintainer-hosted backend, and user-chosen provider
responsibility.

### Task T014 - Refresh AI model behavior and acceptable-use wording

**Started**: 2026-04-15 10:00
**Completed**: 2026-04-15 10:01
**Duration**: 1 minute

Updated the human-review, model-fallibility, Terms-of-Service, and acceptable-
use language so the policy stays aligned with the repo's no-auto-submit
boundary.

### Task T015 - Fix docs-local links and stale runtime references

**Started**: 2026-04-15 10:00
**Completed**: 2026-04-15 10:01
**Duration**: 1 minute

Corrected the docs-local links to `../CONTRIBUTING.md` and `../LICENSE` and
removed wording that implied alternate runtimes were the default maintained
path.

### Task T016 - Record final wording decisions and deferred follow-up items

**Started**: 2026-04-15 10:01
**Completed**: 2026-04-15 10:03
**Duration**: 2 minutes

Recorded the final wording decisions, removed stale references, validation
results, and explicit Phase 02 and later deferrals in this notes file.

### Task T017 - Run targeted drift checks

**Started**: 2026-04-15 10:01
**Completed**: 2026-04-15 10:02
**Duration**: 1 minute

Ran targeted `rg` checks against the touched docs to confirm the stale hook
patterns and bad docs-local link patterns are gone.

### Task T018 - Run the quick validation gate

**Started**: 2026-04-15 10:01
**Completed**: 2026-04-15 10:03
**Duration**: 2 minutes

Ran `node scripts/test-all.mjs --quick` twice on the final doc state. The
final run passed with 74 checks passed, 0 failed, and 0 warnings.

### Task T019 - Manually review customization doc against the live contract

**Started**: 2026-04-15 10:02
**Completed**: 2026-04-15 10:03
**Duration**: 1 minute

Manually reviewed `docs/CUSTOMIZATION.md` against `AGENTS.md`,
`docs/DATA_CONTRACT.md`, and `.codex/skills/career-ops/SKILL.md` to confirm
the user/system boundary and active runtime surfaces match the checked-in
contract.

### Task T020 - Manually review legal disclaimer

**Started**: 2026-04-15 10:02
**Completed**: 2026-04-15 10:03
**Duration**: 1 minute

Manually reviewed `docs/LEGAL_DISCLAIMER.md` for local execution, provider
responsibility, privacy posture, acceptable-use boundaries, and docs-local
link correctness.

### Task T021 - Validate ASCII and LF formatting

**Started**: 2026-04-15 10:01
**Completed**: 2026-04-15 10:03
**Duration**: 2 minutes

Validated the touched docs and session notes as ASCII text with no CRLF line
endings.
