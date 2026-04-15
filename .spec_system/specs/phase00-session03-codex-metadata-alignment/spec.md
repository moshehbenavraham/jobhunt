# Session Specification

**Session ID**: `phase00-session03-codex-metadata-alignment`
**Phase**: 00 - Contract and Drift Cleanup
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

This session aligns the remaining blocking metadata and system-doc path
references with the repo's real Codex-first layout. Session 01 established
`AGENTS.md` and `.codex/skills/career-ops/SKILL.md` as the canonical
instruction surface, and Session 02 normalized version ownership around root
`VERSION`. The live repo still carries drift in metadata and contributor
surfaces that point at `.claude/skills/`, `CLAUDE.md`, or root-level doc
paths that do not exist.

The work stays deliberately narrow. It does not rewrite public onboarding or
batch runtime language. Instead, it fixes the path owners that affect updater
behavior, system/user layer ownership, PR labeling, and contributor-facing
GitHub templates and workflows. That closes the last metadata blockers before
Phase 00 validation closeout.

This session is next because Session 04 depends on contract, version, and
metadata cleanup already being complete. Validation closeout should not start
while repo-owned metadata still references the wrong skill directory or dead
documentation paths.

---

## 2. Objectives

1. Replace blocking `.claude` path ownership with `.codex` in repo metadata
   and system-layer definitions.
2. Correct contributor metadata that still links to missing root-level docs
   instead of the live `docs/` paths.
3. Add validation coverage so metadata-path drift is caught before later
   phases.
4. Produce an explicit inventory of remaining non-blocking legacy references
   and defer them to the appropriate later phases.

---

## 3. Prerequisites

### Required Sessions
- [x] `phase00-session01-canonical-instruction-surface` - establishes the
  canonical Codex instruction contract
- [x] `phase00-session02-version-ownership-normalization` - stabilizes version
  ownership before metadata cleanup

### Required Tools/Knowledge
- Familiarity with repo metadata and contributor surfaces in `.github/`,
  `docs/`, and `scripts/`
- Working knowledge of the Phase 00 PRD and Session 03 success criteria
- `node`, `git`, `rg`, and Bash

### Environment Requirements
- Repo root checkout with `.spec_system/` initialized
- Ability to run repo validation commands from the project root
- Review of the current `.claude` and dead-path references before editing

---

## 4. Scope

### In Scope (MVP)
- Maintainer can update system-layer ownership to the active Codex skill
  surface - replace `.claude/skills/` with `.codex/skills/` in updater and
  data-contract definitions.
- Contributor tooling can classify and review the correct files - repair
  GitHub labeler globs and template/workflow links so they point at live repo
  paths.
- Validation can detect metadata drift in the canonical instruction surface -
  extend repo checks to cover blocking metadata and doc-path assumptions.
- Maintainer can review remaining legacy references explicitly - capture
  deferred Claude-first wording and non-blocking references in a session-local
  inventory.

### Out of Scope (Deferred)
- Public onboarding rewrite in `README.md`, `docs/SETUP.md`, and
  `docs/CONTRIBUTING.md` - Reason: Phase 01 owns the user-facing Codex-primary
  documentation refresh.
- Batch runtime migration from `claude -p` to `codex exec` in `batch/` and
  related docs - Reason: Phase 02 owns batch execution changes.
- Broad wording cleanup for every remaining `Claude Code`, `claude`, or
  `OpenCode` mention across the repo - Reason: this session fixes blocking
  metadata and records the rest for later phases.

---

## 5. Technical Approach

### Architecture
Treat `.codex/skills/` and `docs/` as the live metadata targets everywhere
repo-owned tooling or contributor automation depends on file paths. Align the
updater's system-layer ownership, the data contract, GitHub labeler rules, and
GitHub contributor templates to those canonical locations. Then add validation
assertions that fail if those blocking metadata paths regress.

### Design Patterns
- Canonical path ownership: one live path for skills and docs, reused across
  updater, docs, and metadata.
- Fail-fast metadata validation: repo tests should report exactly which path
  reference drifted.
- Narrow deferral ledger: explicitly record non-blocking legacy references
  instead of widening this session into a full docs migration.

### Technology Stack
- Node.js ESM scripts in `scripts/`
- YAML and Markdown metadata in `.github/` and `docs/`
- Markdown session artifacts in `.spec_system/`

---

## 6. Deliverables

### Files to Create
| File | Purpose | Est. Lines |
|------|---------|------------|
| `.spec_system/specs/phase00-session03-codex-metadata-alignment/residual-legacy-references.md` | Track deferred non-blocking legacy references by file and owning phase | ~40 |

### Files to Modify
| File | Changes | Est. Lines |
|------|---------|------------|
| `scripts/update-system.mjs` | Replace `.claude/skills/` with `.codex/skills/` in system-layer ownership | ~2 |
| `docs/DATA_CONTRACT.md` | Align the system-layer skills path with the live `.codex` directory | ~2 |
| `.github/labeler.yml` | Point labeler globs at live instruction and docs paths | ~10 |
| `.github/PULL_REQUEST_TEMPLATE.md` | Fix contributor links to the live docs paths | ~2 |
| `.github/workflows/welcome.yml` | Fix onboarding links to the live docs paths | ~4 |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Fix Code of Conduct link to the live docs path | ~1 |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | Fix Code of Conduct link to the live docs path | ~1 |
| `scripts/test-all.mjs` | Add assertions that blocking metadata references use live Codex and docs paths | ~35 |

---

## 7. Success Criteria

### Functional Requirements
- [ ] `scripts/update-system.mjs` and `docs/DATA_CONTRACT.md` reference
      `.codex/skills/` as the active checked-in skill surface.
- [ ] `.github/labeler.yml` tracks `AGENTS.md`, `docs/DATA_CONTRACT.md`,
      `.codex/skills/**`, and the live `docs/` paths instead of dead root
      paths.
- [ ] Contributor-facing GitHub templates and workflows link to live docs
      rather than missing root-level files.
- [ ] A session-local residual inventory lists remaining non-blocking legacy
      references and the phase that should own them.

### Testing Requirements
- [ ] `node --check scripts/update-system.mjs` passes
- [ ] `node --check scripts/test-all.mjs` passes
- [ ] `node scripts/test-all.mjs --quick` passes with the new metadata-path
      assertions
- [ ] Targeted `rg` checks confirm no blocking `.claude/skills/`, `CLAUDE.md`,
      or dead root-doc references remain in the updated metadata surface

### Non-Functional Requirements
- [ ] Blocking metadata cleanup remains scoped to Phase 00 and does not become
      a full public docs rewrite
- [ ] Validation failures identify the exact mismatched metadata file or path
- [ ] Deferred references are explicit enough to guide Phase 01 and Phase 02
      work without re-auditing the repo

### Quality Gates
- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations
- The live repo still contains broader Claude-first wording in `README.md`,
  `docs/SETUP.md`, `batch/`, and `modes/batch.md`; those should be inventoried
  here, not rewritten in this session.
- GitHub metadata mixes filesystem globs and full blob URLs, so path fixes
  must preserve the intent of each file rather than applying one blind
  replacement.
- The local project copy of `scripts/analyze-project.sh` lags the current
  `apex-spec` contract; if that remains outside this session's path-alignment
  scope, capture it as residual drift for Session 04.

### Potential Challenges
- Metadata spread: path drift is distributed across docs, scripts, YAML, and
  GitHub workflow templates, which makes omission easy without a deliberate
  inventory.
- Scope creep: broad Claude wording cleanup is visible nearby but belongs to
  later phases.
- Validation precision: new checks should target blocking metadata only, not
  turn Phase 00 into a repo-wide language lint.

### Relevant Considerations
- No active concerns or lessons learned are currently recorded in
  `.spec_system/CONSIDERATIONS.md`.
- `.spec_system/SECURITY-COMPLIANCE.md` is clean; this session is metadata
  alignment work with no open security findings expanding scope.

---

## 9. Testing Strategy

### Unit Tests
- Extend `scripts/test-all.mjs` so it asserts canonical skill-path and
  contributor-metadata references for the files touched in this session.

### Integration Tests
- Run `node scripts/test-all.mjs --quick` after metadata cleanup to verify the
  repo-level gate catches and then accepts the corrected paths.
- Run targeted `rg` checks across `.github/`, `docs/`, and `scripts/` to
  confirm blocking path references are removed from the scoped surface.

### Manual Testing
- Review the updated GitHub template and workflow links to confirm they point
  at the live `docs/` files.
- Review the residual legacy inventory to ensure every deferred reference has
  a clear owner phase or rationale.

### Edge Cases
- Root doc names such as `CONTRIBUTING.md` may appear legitimately inside
  relative links from files already under `docs/`; do not treat those as dead
  root-path references when the target resolves correctly.
- Validation should distinguish `.claude` path drift from acceptable
  historical mentions captured in PRD or session artifacts.
- Metadata checks should fail on dead root paths even when the linked file
  name exists under `docs/`.

---

## 10. Dependencies

### External Libraries
- None

### Internal Dependencies
- `scripts/update-system.mjs` - updater ownership list must reflect the live
  skill surface
- `docs/DATA_CONTRACT.md` - system/user layer contract must name the live
  skills directory
- `.github/labeler.yml` - contributor metadata must classify the live files
- `.github/PULL_REQUEST_TEMPLATE.md`,
  `.github/workflows/welcome.yml`,
  `.github/ISSUE_TEMPLATE/bug_report.yml`, and
  `.github/ISSUE_TEMPLATE/feature_request.yml` - contributor-facing metadata
  must link to live docs
- `scripts/test-all.mjs` - validation gate that should prevent metadata drift
- `.spec_system/PRD/PRD.md` and
  `.spec_system/PRD/phase_00/session_03_codex_metadata_alignment.md` -
  migration goals and session stub constraints
- `.spec_system/CONVENTIONS.md` - canonical path, validation, and doc-alignment
  conventions

### Other Sessions
- Depends on: `phase00-session01-canonical-instruction-surface`,
  `phase00-session02-version-ownership-normalization`
- Depended by: `phase00-session04-validation-drift-closeout`

---

## 11. Notes

This session should end with a clean handoff to `implement`. If broader docs
or batch-runtime cleanup is discovered during implementation, record it in the
residual legacy inventory and keep Session 03 focused on blocking metadata
alignment.
