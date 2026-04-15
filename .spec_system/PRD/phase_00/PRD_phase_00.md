# PRD Phase 00: Contract and Drift Cleanup

**Status**: In Progress
**Sessions**: 4
**Estimated Duration**: 4-8 days

**Progress**: 1/4 sessions (25%)

---

## Overview

Phase 00 establishes the canonical Codex instruction contract, removes
missing-file and version-path drift that breaks validation or updater
behavior, and aligns repo metadata with the actual checked-in `.codex`
surface. This phase is intentionally limited to contract cleanup and tooling
integrity; it does not yet perform the public docs and entrypoint rewrite
planned for Phase 01.

---

## Progress Tracker

| Session | Name | Status | Est. Tasks | Validated |
|---------|------|--------|------------|-----------|
| 01 | Canonical instruction surface | Complete | ~12-16 | PASS |
| 02 | Version ownership normalization | Not Started | ~12-16 | - |
| 03 | Codex metadata alignment | Not Started | ~12-16 | - |
| 04 | Validation drift closeout | Not Started | ~12-18 | - |

---

## Completed Sessions

- Session 01: Canonical instruction surface

---

## Upcoming Sessions

- Session 02: Version ownership normalization

---

## Objectives

1. Make `AGENTS.md` plus `.codex/skills/` the unambiguous instruction surface.
2. Restore a single canonical version source shared by updater and validation
   paths.
3. Remove blocking `.claude` and missing-file metadata drift from repo-owned
   tooling and core system docs.

---

## Prerequisites

- `.spec_system` initialized and the master PRD accepted as the migration
  source of truth
- Current working-tree edits touching phase-00 files reviewed before
  implementation begins

---

## Technical Considerations

### Architecture

Keep the existing job-search business logic, data contract, and runtime flow
intact. Restrict this phase to system-layer instruction files, validation
scripts, updater behavior, and metadata references that define the canonical
Codex contract.

### Technologies

- Node.js ESM scripts for updater and validation flows
- Markdown, YAML, and JSON files for instructions, metadata, and repo policy
- Git-based verification of tracked-file drift and version ownership

### Risks

- Existing local edits already touch some phase-00 files, so implementation
  must reconcile rather than overwrite concurrent work.
- Removing legacy file references can expose hidden assumptions in validation
  or updater flows that are not obvious from the PRD alone.
- Metadata cleanup can miss indirect `.claude` references unless each session
  includes targeted search and verification steps.

---

## Success Criteria

Phase complete when:
- [ ] All 4 sessions completed
- [x] `.codex/skills/career-ops/SKILL.md` no longer depends on missing
      `docs/CODEX.md` or `docs/CLAUDE.md`
- [ ] Root `VERSION`, `package.json`, updater logic, and repo validation agree
  on one canonical version source
- [ ] Blocking repo metadata points at `.codex` instead of `.claude`
- [x] Validation and updater flows are no longer broken by missing-file or
      legacy-path drift

---

## Dependencies

### Depends On

- None; this is the first implementation phase after spec setup

### Enables

- Phase 01: Docs and Entrypoints
