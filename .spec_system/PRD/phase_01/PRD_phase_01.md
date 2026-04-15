# PRD Phase 01: Docs and Entrypoints

**Status**: In Progress
**Sessions**: 4
**Estimated Duration**: 4-6 days

**Progress**: 2/4 sessions (50%)

---

## Overview

Phase 01 converts the repo's public and contributor-facing documentation into a
fully Codex-primary surface. The main goal is to make the first-run path,
support guidance, and policy/customization docs all describe the same runtime
contract that Phase 00 established in `AGENTS.md`, `.codex/skills/`, and the
validator surface.

This phase stays intentionally narrow. It does not rewrite batch runtime docs,
prompt language inside modes, or metadata surfaces such as issue templates.
Those remain owned by later phases so this work can focus on docs and
entrypoints only.

---

## Progress Tracker

| Session | Name | Status | Est. Tasks | Validated |
|---------|------|--------|------------|-----------|
| 01 | Public Quick Start Alignment | Complete | ~12-25 | 2026-04-15 |
| 02 | Contributor and Support Docs Alignment | Complete | ~12-25 | 2026-04-15 |
| 03 | Customization and Policy Runtime Cleanup | Not Started | ~12-25 | - |
| 04 | Docs Surface Validation and Phase Closeout | Not Started | ~12-25 | - |

---

## Completed Sessions

- `phase01-session01-public-quick-start-alignment`
- `phase01-session02-contributor-support-docs-alignment`

---

## Upcoming Sessions

- Session 03: Customization and Policy Runtime Cleanup
- Session 04: Docs Surface Validation and Phase Closeout

---

## Objectives

1. Make public onboarding docs point to `codex` and the live repo scripts
   only.
2. Align contributor, support, and help surfaces with the canonical Codex
   contract from Phase 00.
3. Remove stale multi-CLI and `.claude` guidance from user-facing docs without
   pulling Phase 02 or Phase 03 work into scope.

---

## Prerequisites

- Phase 00 completed
- `AGENTS.md`, `.codex/skills/`, and `docs/` remain the canonical live
  instruction surface
- Batch runtime migration stays deferred to Phase 02

---

## Technical Considerations

### Architecture

Documentation changes in this phase should point to repo-owned commands and
live files that already exist. Do not change job-search business logic, batch
orchestration behavior, or prompt semantics here.

### Technologies

- Markdown documentation
- Codex CLI entrypoints
- Existing repo validation commands such as `npm run doctor` and
  `node scripts/test-all.mjs --quick`

### Risks

- Scope creep into Phase 02 batch docs or Phase 03 metadata cleanup:
  mitigate by leaving `batch/`, `modes/batch.md`, and issue-template metadata
  out of this phase unless a docs blocker is undeniable
- Documentation churn from concurrent repo edits: mitigate by keeping each
  session bounded to a small set of docs surfaces and re-reading the live files
  before edits
- Validator mismatch after wording changes: mitigate by checking repo commands
  and keeping onboarding docs anchored to current scripts rather than memory

### Relevant Considerations

- [P00] **Residual legacy references**: Keep batch `claude -p` docs out of
  Phase 01 and leave those references for Phase 02.
- [P00] **Validator surface drift**: Recheck any onboarding command changes
  against `scripts/test-all.mjs`, `scripts/doctor.mjs`, and `VERSION`.
- [P00] **No data collection surface**: Preserve the clean no-PII, no-telemetry
  posture in updated user-facing docs.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  `docs/` as authoritative and avoid reintroducing `.claude` aliases.

---

## Success Criteria

Phase complete when:
- [ ] All 4 sessions completed
- [ ] `README.md`, setup docs, contributing docs, and support docs no longer
      position Claude or OpenCode as the default runtime
- [ ] Customization and policy docs reflect the active `.codex` surface and
      local-execution model
- [ ] Remaining batch, prompt, and metadata drift is explicitly deferred to
      Phase 02 or Phase 03 rather than mixed into docs work

---

## Dependencies

### Depends On

- Phase 00: Contract and Drift Cleanup

### Enables

- Phase 02: Batch Runtime Conversion
