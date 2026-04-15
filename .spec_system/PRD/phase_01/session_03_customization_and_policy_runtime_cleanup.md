# Session 03: Customization and Policy Runtime Cleanup

**Session ID**: `phase01-session03-customization-and-policy-runtime-cleanup`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours

---

## Objective

Rewrite the remaining user-facing customization and policy docs so they match
the active `.codex` runtime surface and the repo's local-execution model.

---

## Scope

### In Scope (MVP)

- Update `docs/CUSTOMIZATION.md` to remove stale `.claude` hook guidance and
  explain only the live customization surfaces
- Refresh `docs/LEGAL_DISCLAIMER.md` so runtime and provider wording is
  accurate without implying maintainers operate a hosted AI service
- Keep policy wording aligned with Phase 00's clean privacy and data-handling
  posture

### Out of Scope

- Batch runtime conversion and worker contracts
- Issue templates, labeler rules, and other metadata normalization
- Repo-wide mode or prompt wording changes

---

## Prerequisites

- [ ] Session 01 completed
- [ ] Canonical runtime wording established for user-facing docs

---

## Deliverables

1. Updated customization guidance anchored to the live `.codex` surface
2. Updated legal and acceptable-use wording that matches local execution
3. A clear boundary between docs cleanup in Phase 01 and metadata cleanup in
   Phase 03

---

## Success Criteria

- [ ] `docs/CUSTOMIZATION.md` no longer points users at `.claude` settings or
      other inactive runtime surfaces
- [ ] `docs/LEGAL_DISCLAIMER.md` describes provider responsibility without
      presenting Claude or OpenCode as required defaults
- [ ] Phase 01 policy docs preserve the repo's no-telemetry, local-first
      contract

