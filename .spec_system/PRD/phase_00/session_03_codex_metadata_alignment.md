# Session 03: Codex Metadata Alignment

**Session ID**: `phase00-session03-codex-metadata-alignment`
**Status**: Not Started
**Estimated Tasks**: ~12-16
**Estimated Duration**: 2-4 hours

---

## Objective

Align blocking repo metadata and core system docs with `.codex` as the active
checked-in skill surface.

---

## Scope

### In Scope (MVP)

- Update repo metadata that still points at `.claude` instead of `.codex`
- Correct core system docs whose path references affect updater, validation,
  or contributor tooling behavior
- Capture any remaining non-blocking legacy references for later phases rather
  than leaving them implicit

### Out of Scope

- Full public docs refresh for Codex-primary onboarding
- Prompt and mode language normalization across `modes/` and `batch/`

---

## Prerequisites

- [ ] Session 01 completed
- [ ] Session 02 completed

---

## Deliverables

1. Updated metadata and system-doc path references for the `.codex` layout.
2. Explicit list of residual non-blocking legacy references, if any.

---

## Success Criteria

- [ ] Blocking metadata points at `.codex` rather than `.claude`
- [ ] Core system docs reflect the actual checked-in skill surface
- [ ] Residual legacy references are explicit and phase-scoped
