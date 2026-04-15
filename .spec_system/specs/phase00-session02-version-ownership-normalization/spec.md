# Session Specification

**Session ID**: `phase00-session02-version-ownership-normalization`
**Phase**: 00 - Contract and Drift Cleanup
**Status**: Not Started
**Created**: 2026-04-15

---

## 1. Session Overview

This session normalizes version ownership after the canonical instruction
surface was stabilized in Session 01. The Phase 00 PRD expects root `VERSION`
to be the repo's single source of truth, but the live checkout still has
split behavior: `VERSION` is `1.5.3`, `package-lock.json` also resolves to
`1.5.3`, and `package.json` is ahead at `1.5.4`. The updater currently
reports the root file correctly, but its implementation still carries
fallback and cleanup logic for legacy `docs/VERSION`.

The work stays focused on version authority, not general metadata cleanup.
The goal is to make root `VERSION` the only human-owned version file, make
package metadata match it, and make validation fail loudly if those surfaces
drift again. That keeps release behavior deterministic and removes a class of
false confidence where commands appear healthy while manifests disagree.

This session is next because Session 03 and Session 04 assume version
ownership is already settled. Metadata alignment should not proceed while the
repo still carries two semver values and updater logic for a deleted legacy
path.

---

## 2. Objectives

1. Make root `VERSION` the sole canonical version source used by repo-owned
   runtime and validation paths.
2. Align `package.json` and `package-lock.json` with the canonical root
   version so manifests cannot drift silently.
3. Remove legacy `docs/VERSION` fallback and cleanup behavior from
   `scripts/update-system.mjs`.
4. Produce validation evidence that version checks now catch mismatches
   deterministically before later Phase 00 closeout work.

---

## 3. Prerequisites

### Required Sessions
- [x] `phase00-session01-canonical-instruction-surface` - establishes the
  canonical contract that Session 02 builds on

### Required Tools/Knowledge
- Familiarity with repo version surfaces in `VERSION`, `package.json`,
  `package-lock.json`, `scripts/update-system.mjs`, and
  `scripts/test-all.mjs`
- Working knowledge of the Phase 00 PRD and Session 02 success criteria
- `node`, `npm`, `git`, and `rg`

### Environment Requirements
- Repo root checkout with `.spec_system/` initialized
- Ability to run Node-based validation commands from the project root
- Review of current version drift before modifying package metadata

---

## 4. Scope

### In Scope (MVP)
- Maintainer can treat root `VERSION` as the only authoritative repo version
  file - align package manifests and validation around that source.
- Updater logic reads and writes canonical version state without depending on
  `docs/VERSION` - remove legacy fallback arrays, constants, and cleanup
  branches tied to the deleted path.
- Validation surfaces can detect version drift between the canonical file and
  package metadata - strengthen repo checks so mismatches fail explicitly.

### Out of Scope (Deferred)
- `.claude` to `.codex` metadata cleanup across docs and repo config -
  Reason: Session 03 owns blocking metadata alignment.
- Broad validation closeout and residual drift verification beyond version
  ownership - Reason: Session 04 owns end-to-end Phase 00 verification.
- Public docs wording or onboarding refresh unrelated to version ownership -
  Reason: later phases own user-facing runtime documentation work.

---

## 5. Technical Approach

### Architecture
Treat `VERSION` as the sole human-edited source of semantic version truth.
All other version surfaces in the repo become mirrors or validations against
that file. `scripts/update-system.mjs` should resolve local and remote version
behavior from the canonical path only, while `scripts/test-all.mjs` should
assert equality between the canonical file and package metadata so drift is
caught immediately.

### Design Patterns
- Single source of truth: one canonical version file, mirrored elsewhere only
  where tooling requires it.
- Fail-fast drift detection: validation should report mismatches with the
  exact file and expected value.
- Narrow cleanup: remove only version-path compatibility code in this session
  and defer broader metadata modernization to Session 03.

### Technology Stack
- Node.js ESM scripts in `scripts/`
- JSON package manifests in `package.json` and `package-lock.json`
- Markdown PRD and session artifacts in `.spec_system/`

---

## 6. Deliverables

### Files to Create
| File | Purpose | Est. Lines |
|------|---------|------------|
| None | Session 02 modifies existing version surfaces only | 0 |

### Files to Modify
| File | Changes | Est. Lines |
|------|---------|------------|
| `VERSION` | Confirm or correct the canonical semver retained by the repo | ~1 |
| `package.json` | Align package manifest version with canonical root version | ~1 |
| `package-lock.json` | Align lockfile package version metadata with canonical version | ~2 |
| `scripts/update-system.mjs` | Remove legacy version-path handling and anchor version resolution to `VERSION` | ~35 |
| `scripts/test-all.mjs` | Add version consistency checks across canonical and mirrored manifests | ~30 |

---

## 7. Success Criteria

### Functional Requirements
- [ ] Root `VERSION` is the only repo-owned version source read by the updater
      and related release-path helpers.
- [ ] `package.json` and `package-lock.json` match the canonical root version.
- [ ] `scripts/test-all.mjs` fails when package metadata drifts from `VERSION`.
- [ ] No runtime version logic still depends on `docs/VERSION`.

### Testing Requirements
- [ ] `node --check scripts/update-system.mjs` passes
- [ ] `node --check scripts/test-all.mjs` passes
- [ ] `node scripts/update-system.mjs check` reports the canonical local
      version from root `VERSION`
- [ ] `node scripts/test-all.mjs --quick` passes with the strengthened version
      checks
- [ ] Targeted `rg` checks confirm no active runtime references to
      `docs/VERSION` remain outside PRD history

### Non-Functional Requirements
- [ ] Version ownership remains deterministic on a clean checkout
- [ ] No hardcoded fallback values hide missing or invalid version state
- [ ] Session output stays within Phase 00 version-normalization scope

### Quality Gates
- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations
- The live repo already restored root `VERSION` and removed `docs/VERSION`,
  so this session is about eliminating residual drift, not reintroducing
  deleted files.
- `package.json` is currently `1.5.4` while `VERSION` and `package-lock.json`
  are `1.5.3`; implementation must reconcile that mismatch intentionally.
- The existing quick test only validates that `VERSION` exists and is semver;
  it does not yet enforce manifest consistency.

### Potential Challenges
- Unclear intended release number: verify whether the canonical value should
  stay at `1.5.3` or whether all mirrors should move together to a deliberate
  newer semver.
- Updater compatibility code is spread across constants and helper functions:
  remove legacy path handling without breaking apply, rollback, or check flows.
- Validation noise: make failures specific enough to diagnose drift quickly
  rather than producing generic version errors.

### Relevant Considerations
- No active concerns or lessons learned are currently recorded in
  `.spec_system/CONSIDERATIONS.md`.
- `.spec_system/SECURITY-COMPLIANCE.md` is clean; no security findings expand
  the scope of this version-normalization session.

---

## 9. Testing Strategy

### Unit Tests
- Extend `scripts/test-all.mjs` so the version section validates equality
  between `VERSION`, `package.json`, and `package-lock.json`.

### Integration Tests
- Run `node scripts/update-system.mjs check` after the version cleanup to
  verify reported local version matches the canonical file.
- Run `node scripts/test-all.mjs --quick` to confirm the repo-level gate
  passes with the strengthened version assertions.

### Manual Testing
- Inspect the updated version files and confirm the chosen semver is
  consistent across all touched package surfaces.
- Review the updater diff to confirm `docs/VERSION` logic is fully removed
  from active resolution paths.

### Edge Cases
- Missing `docs/VERSION` should remain a non-issue rather than a fallback path.
- Invalid or blank `VERSION` contents should fail clearly instead of silently
  falling back to a manifest value.
- Package metadata drift should be reported even when the canonical version is
  syntactically valid.

---

## 10. Dependencies

### External Libraries
- None

### Internal Dependencies
- `VERSION` - canonical version source required by the PRD
- `package.json` and `package-lock.json` - package metadata that must mirror
  the canonical version
- `scripts/update-system.mjs` - updater logic that currently carries legacy
  version-path compatibility
- `scripts/test-all.mjs` - validation gate that must detect version drift
- `.spec_system/PRD/PRD.md` and
  `.spec_system/PRD/phase_00/session_02_version_ownership_normalization.md` -
  migration goals and session stub constraints
- `.spec_system/CONVENTIONS.md` - versioning, validation, and path-handling
  conventions

### Other Sessions
- Depends on: `phase00-session01-canonical-instruction-surface`
- Depended by: `phase00-session03-codex-metadata-alignment`,
  `phase00-session04-validation-drift-closeout`

---

## 11. Notes

This session should end with a clean handoff to `implement`. If broader
metadata drift is uncovered while removing legacy version handling, capture it
for Session 03 rather than widening Session 02 beyond version ownership.
