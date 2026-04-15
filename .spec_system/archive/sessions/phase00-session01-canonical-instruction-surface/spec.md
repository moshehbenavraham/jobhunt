# Session Specification

**Session ID**: `phase00-session01-canonical-instruction-surface`
**Phase**: 00 - Contract and Drift Cleanup
**Status**: Not Started
**Created**: 2026-04-15

---

## 1. Session Overview

This session establishes the canonical instruction surface that the rest of
the Codex-primary migration depends on. The repo already treats `AGENTS.md`
as the real persistent contract, but the checked-in `jobhunt` skill and
repo validation still imply that missing legacy docs remain required. That
drift blocks clean onboarding, makes validation less trustworthy, and muddies
the migration sequence described in the PRD.

The work stays intentionally narrow. It focuses on the contract files that are
already on the active operator path: `.codex/skills/jobhunt/SKILL.md`,
`scripts/test-all.mjs`, and any repo-owned mode text that still points to
missing instruction docs during normal execution. Public onboarding, version
ownership, updater path cleanup, and broader `.claude` metadata alignment are
explicitly deferred to later sessions.

This session comes first because Sessions 02-04 all assume a stable source of
truth. Version normalization and metadata cleanup should not proceed until the
repo can clearly answer which instruction files are authoritative and which
legacy references are no longer required.

---

## 2. Objectives

1. Make `.codex/skills/jobhunt/SKILL.md` start from `AGENTS.md` and other
   checked-in, existing repo sources only.
2. Make `scripts/test-all.mjs` validate the real instruction surface instead
   of implying `docs/CODEX.md` or `docs/CLAUDE.md` are required.
3. Remove required legacy instruction-doc references from active runtime
   contract files used in normal repo workflows.
4. Produce validation evidence that the canonical contract is now rooted in
   `AGENTS.md` plus `.codex/skills/` without expanding into Session 02 or
   Session 03 scope.

---

## 3. Prerequisites

### Required Sessions

- [x] None - Phase 00 starts with canonical contract cleanup.

### Required Tools/Knowledge

- Familiarity with the current instruction surfaces in `AGENTS.md`,
  `.codex/skills/jobhunt/SKILL.md`, `modes/_shared.md`, and
  `scripts/test-all.mjs`
- Working knowledge of the Phase 00 PRD and session stub sequencing
- `node`, `git`, and `rg`

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Review of active working-tree edits touching contract files, especially
  `scripts/test-all.mjs`
- Ability to run repo validation from the project root

---

## 4. Scope

### In Scope (MVP)

- Contributor can read the `jobhunt` skill and follow a valid bootstrap
  path without missing `docs/CODEX.md` or `docs/CLAUDE.md` dependencies -
  rewrite the checked-in skill read order and setup guidance.
- Repo validation can confirm the real instruction surface - update
  `scripts/test-all.mjs` to check `AGENTS.md` and the checked-in Codex skill
  instead of missing legacy docs.
- Interactive mode guidance no longer points operators at missing instruction
  docs during active workflows - remove blocking legacy references from
  contract-owned mode text on the primary path.

### Out of Scope (Deferred)

- Public onboarding and docs positioning changes in `README.md`,
  `docs/SETUP.md`, and `docs/CONTRIBUTING.md` - Reason: Phase 01 owns public
  Codex-primary positioning work.
- Root `VERSION` ownership and updater normalization - Reason: Session 02 owns
  canonical version-path cleanup.
- `.claude` to `.codex` metadata and path alignment across docs and updater
  surfaces - Reason: Session 03 owns blocking metadata cleanup.
- Batch worker runtime conversion - Reason: later phase workstream.

---

## 5. Technical Approach

### Architecture

Treat `AGENTS.md` as the canonical persistent contract and
`.codex/skills/jobhunt/SKILL.md` as the checked-in routing bootstrap that
must point back to that contract. Keep validation deterministic by updating
`scripts/test-all.mjs` to assert the real files and expected content directly,
while limiting scope to repo-owned files on the active instruction path.

### Design Patterns

- Canonical source anchoring: make every required instruction path resolve to
  live checked-in files.
- Deterministic validation: express contract expectations in the existing
  quick validation script instead of relying on tribal knowledge.
- Narrow drift removal: fix blocking legacy-doc references now and defer
  broader metadata cleanup to the later phase session that owns it.

### Technology Stack

- Node.js ESM scripts in `scripts/`
- Markdown instruction surfaces in `AGENTS.md`, `.codex/skills/`, and
  `modes/`
- `git` and `rg` for targeted contract verification

---

## 6. Deliverables

### Files to Create

| File | Purpose                                          | Est. Lines |
| ---- | ------------------------------------------------ | ---------- |
| None | Session 01 modifies existing contract files only | 0          |

### Files to Modify

| File                                | Changes                                                                                  | Est. Lines |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ---------- |
| `.codex/skills/jobhunt/SKILL.md` | Replace missing-doc read order and bootstrap guidance with canonical repo sources        | ~20        |
| `scripts/test-all.mjs`              | Align instruction-surface checks with `AGENTS.md` and checked-in Codex skills            | ~40        |
| `modes/_shared.md`                  | Remove required pointer to missing legacy instruction docs from active workflow guidance | ~5         |

---

## 7. Success Criteria

### Functional Requirements

- [ ] The `jobhunt` skill read order starts with `AGENTS.md` and existing
      repo sources only.
- [ ] `scripts/test-all.mjs` validates the live instruction surface rather
      than relying on `docs/CODEX.md` or `docs/CLAUDE.md`.
- [ ] No required workflow step in the active contract path depends on
      missing legacy instruction docs.

### Testing Requirements

- [ ] `node --check scripts/test-all.mjs` passes
- [ ] `node scripts/test-all.mjs --quick` passes
- [ ] Targeted `rg` checks confirm no required `docs/CODEX.md` or
      `docs/CLAUDE.md` references remain in active contract files
- [ ] Manual diff review confirms unrelated working-tree edits remain intact

### Non-Functional Requirements

- [ ] Contract validation remains deterministic on a clean checkout
- [ ] Session output stays within the existing system-layer ownership model
- [ ] No Session 02 or Session 03 scope is pulled forward unnecessarily

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- `scripts/test-all.mjs` already has local edits in the working tree, so the
  implementation must integrate changes without reverting unrelated work.
- The repo still contains broader `.claude` and version-path drift, but this
  session should only fix the legacy references that block the canonical
  instruction contract today.
- The validation script should check real contract facts, not add a new
  parallel validator.

### Potential Challenges

- Dirty diff in `scripts/test-all.mjs`: reconcile contract checks carefully
  instead of overwriting nearby edits.
- Legacy references outside the active contract path: document them for later
  sessions rather than expanding scope mid-session.
- Missing-doc wording embedded in mode prose: replace only the blocking
  dependency language and preserve existing business rules.

### Relevant Considerations

- No active concerns or lessons learned are currently recorded in
  `.spec_system/CONSIDERATIONS.md`.

---

## 9. Testing Strategy

### Unit Tests

- Extend `scripts/test-all.mjs` checks so the instruction-surface section
  explicitly validates `AGENTS.md` and `.codex/skills/jobhunt/SKILL.md`.

### Integration Tests

- Run `node scripts/test-all.mjs --quick` after the contract changes to verify
  the repo-level gate still passes.

### Manual Testing

- Read the updated skill bootstrap and confirm it points to live files only.
- Inspect the shared mode guidance to confirm no missing-doc dependency
  remains in the active workflow path.

### Edge Cases

- Existing legacy docs may be absent and should not fail validation.
- Unrelated dirty worktree edits must remain untouched.
- Contract validation should not depend on user-layer files being present.

---

## 10. Dependencies

### External Libraries

- None

### Internal Dependencies

- `AGENTS.md` - canonical repo contract to anchor validation and routing
- `.spec_system/PRD/PRD.md` - migration goals and session sequencing
- `.spec_system/PRD/phase_00/session_01_canonical_instruction_surface.md` -
  session stub and success criteria
- `.spec_system/CONVENTIONS.md` - file ownership, validation, and runtime
  wording conventions

### Other Sessions

- Depends on: none
- Depended by: `phase00-session02-version-ownership-normalization`,
  `phase00-session03-codex-metadata-alignment`,
  `phase00-session04-validation-drift-closeout`

---

## 11. Notes

This session should end with a clean handoff to `implement`. If new drift is
discovered outside the canonical instruction surface, capture it as deferred
follow-up rather than widening Session 01 past its PRD boundary.
