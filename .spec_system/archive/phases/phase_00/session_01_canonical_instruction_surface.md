# Session 01: Canonical Instruction Surface

**Session ID**: `phase00-session01-canonical-instruction-surface`
**Status**: Not Started
**Estimated Tasks**: ~12-16
**Estimated Duration**: 2-4 hours

---

## Objective

Make `AGENTS.md` and `.codex/skills/jobhunt/SKILL.md` the only required
instruction surface for repo operation and validation.

---

## Scope

### In Scope (MVP)

- Rewrite the `jobhunt` skill read order away from missing
  `docs/CODEX.md` and `docs/CLAUDE.md`
- Align repo-owned validation expectations with `AGENTS.md` as the source of
  truth
- Remove remaining required references that imply missing legacy instruction
  files are still part of the active contract

### Out of Scope

- Public onboarding and docs positioning changes in `README.md`,
  `docs/SETUP.md`, and `docs/CONTRIBUTING.md`
- Batch runtime conversion work

---

## Prerequisites

- [ ] Phase 00 scope confirmed
- [ ] Current working-tree edits touching contract files reviewed

---

## Deliverables

1. Updated canonical instruction references in repo-owned contract files.
2. Validation expectations aligned with `AGENTS.md` and `.codex/skills/`.

---

## Success Criteria

- [ ] The `jobhunt` skill reads `AGENTS.md` first
- [ ] No required workflow step depends on missing `docs/CODEX.md` or
      `docs/CLAUDE.md`
- [ ] Contract validation checks the real instruction surface
