# Session Specification

**Session ID**: `phase01-session01-public-quick-start-alignment`
**Phase**: 01 - Docs and Entrypoints
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

This session starts Phase 01 by aligning the repo's public first-run path with
the setup validator that already defines what a usable local checkout requires.
`README.md` and `docs/SETUP.md` are already Codex-primary in broad wording, but
their command order still tells a new user to run `npm run doctor` before
creating `cv.md`, `config/profile.yml`, and `portals.yml`. The live
`scripts/doctor.mjs` validator checks for those files, so the public quick
start is still out of sync with the real prerequisite contract.

The work stays intentionally narrow. It does not touch contributor support
docs, policy and customization copy, batch runtime docs, or prompt surfaces.
Instead, it defines one canonical onboarding sequence from clone to `codex`,
uses `README.md` as the concise entrypoint, uses `docs/SETUP.md` as the
detailed walkthrough, and records the verified command matrix in the session
notes for the follow-up `implement` step.

This is the correct next session because Phase 00 is complete, Session 01 is
the only unblocked candidate in Phase 01, and Sessions 02 through 04 all
depend on Session 01 settling the public onboarding wording and command order.

---

## 2. Objectives

1. Define one canonical first-run command sequence for clone, install,
   configure, validate, and launch.
2. Align `README.md` and `docs/SETUP.md` with the actual prerequisites enforced
   by `scripts/doctor.mjs`.
3. Keep the public onboarding path explicitly Codex-primary without widening
   into contributor, policy, or batch docs.
4. Record the validated onboarding command matrix and phase boundaries in
   session-local notes.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session04-validation-drift-closeout` - confirms the validator
      surface and Phase 00 runtime contract are stable before public docs work

### Required Tools/Knowledge

- Familiarity with the Phase 01 PRD, Session 01 stub, and Phase 00 residual
  legacy inventory
- Working knowledge of `package.json` scripts and the checks in
  `scripts/doctor.mjs`
- `node`, `npm`, `rg`, and Bash

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Ability to run `npm run doctor` and `node scripts/test-all.mjs --quick`
- Read access to `README.md`, `docs/SETUP.md`, `package.json`, and
  `scripts/doctor.mjs`

---

## 4. Scope

### In Scope (MVP)

- New user can follow `README.md` from clone through `codex` using repo-owned
  commands in the same order enforced by the validator.
- New user can use `docs/SETUP.md` to create `config/profile.yml`,
  `portals.yml`, and `cv.md` before `npm run doctor`.
- Maintainer can verify public onboarding wording against `package.json` and
  `scripts/doctor.mjs` instead of relying on remembered setup steps.
- Reader sees `codex` as the public entrypoint with no alternate-runtime
  guidance in the main first-run path.

### Out of Scope (Deferred)

- Contributor and support doc cleanup in `CONTRIBUTING.md`,
  `docs/CONTRIBUTING.md`, and `docs/SUPPORT.md` - Reason: Session 02 owns
  contributor-facing and support-facing docs.
- Customization and policy cleanup in `docs/CUSTOMIZATION.md` and
  `docs/LEGAL_DISCLAIMER.md` - Reason: Session 03 owns those user-facing policy
  surfaces.
- Batch runtime and mode cleanup in `batch/`, `batch/README-batch.md`,
  `modes/batch.md`, and `docs/ARCHITECTURE.md` - Reason: Phase 02 owns the
  `codex exec` migration and related docs.
- Final docs-surface sweep and cross-link closeout - Reason: Session 04 owns
  the broader validation pass once Sessions 01 through 03 land.

---

## 5. Technical Approach

### Architecture

Treat the setup validator as the source of truth for prerequisite order, then
project that contract into the two public onboarding surfaces with different
levels of detail. `README.md` should present a minimal but correct quick-start
path, while `docs/SETUP.md` should expand the same sequence with file-creation
details and post-setup checks. Use the session notes to capture the validated
command matrix and any deferred findings so later Phase 01 sessions can reuse
the same public onboarding contract.

### Design Patterns

- Validator-anchored docs: derive onboarding order from live repo checks
  instead of informal memory
- Thin entrypoint, detailed walkthrough: keep `README.md` brief and let
  `docs/SETUP.md` carry the setup detail without changing the sequence
- Explicit scope boundaries: reuse the Phase 00 residual inventory for later
  phases instead of broadening this session

### Technology Stack

- Markdown docs in `README.md` and `docs/`
- Node.js validation scripts in `scripts/`
- Codex CLI as the primary interactive runtime

---

## 6. Deliverables

### Files to Create

| File                                                                                        | Purpose                                                                                         | Est. Lines |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| `.spec_system/specs/phase01-session01-public-quick-start-alignment/implementation-notes.md` | Capture the verified command matrix, doc decisions, and deferred findings during implementation | ~40        |

### Files to Modify

| File            | Changes                                                                                                                             | Est. Lines |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `README.md`     | Reorder the public quick start and entrypoint wording so it matches validator prerequisites and the Codex launch path               | ~20        |
| `docs/SETUP.md` | Reorder setup steps, separate initial setup from follow-up verification, and mirror the same public command sequence as `README.md` | ~35        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `README.md` presents a clone-to-`codex` path that does not ask the user
      to run `npm run doctor` before required user-layer files exist
- [ ] `docs/SETUP.md` mirrors the same command order and clearly places
      profile, portals, and CV creation ahead of setup validation
- [ ] Public onboarding copy names `codex` and repo-owned commands only in the
      main first-run path
- [ ] Session notes capture the final command matrix plus any remaining
      explicitly deferred follow-up items

### Testing Requirements

- [ ] `npm run doctor` passes and matches the documented onboarding validation
      step
- [ ] `node scripts/test-all.mjs --quick` passes after the docs edits
- [ ] Targeted `rg` checks show no stale alternate-runtime wording in
      `README.md` or `docs/SETUP.md`
- [ ] Manual read-through confirms `README.md` and `docs/SETUP.md` describe the
      same first-run sequence

### Non-Functional Requirements

- [ ] Changes stay limited to public onboarding docs and session-local notes
- [ ] Public quick-start wording remains concise in `README.md` and more
      detailed in `docs/SETUP.md` without conflicting steps
- [ ] The updated docs preserve the repo's local-first, no-telemetry posture

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- The current live mismatch is sequencing, not the primary runtime label:
  `README.md` and `docs/SETUP.md` already use `codex`, but both still place
  `npm run doctor` before files that `scripts/doctor.mjs` requires.
- `README.md` should remain the short entrypoint, so detailed explanation of
  file creation and optional verification should stay in `docs/SETUP.md`.
- The Phase 00 residual inventory should be treated as an ownership map, not
  as proof that the current README and setup wording are unchanged.

### Potential Challenges

- Over-correcting `README.md` into a long setup document instead of a concise
  quick start
- Reordering steps in `docs/SETUP.md` without making post-setup validation
  commands look mandatory before the first `codex` launch
- Accidentally widening scope into Session 02, Session 03, or Phase 02 docs

### Relevant Considerations

- [P00] **Residual legacy references**: Use the Session 03 residual inventory
  to preserve phase ownership boundaries, but re-read live docs before
  assuming any deferred wording is still present.
- [P00] **Validator surface drift**: Keep onboarding copy anchored to
  `scripts/doctor.mjs`, `scripts/test-all.mjs`, and `package.json` so command
  order matches the live repo contract.
- [P00] **No data collection surface**: Preserve the no-PII, local-first
  posture in public onboarding wording.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  `docs/` as authoritative and avoid introducing `.claude` or alternate-runtime
  fallbacks.

---

## 9. Testing Strategy

### Unit Tests

- No new unit tests are expected; validate the command surface by reusing the
  repo-owned scripts that already enforce the onboarding contract.

### Integration Tests

- Run `npm run doctor` and confirm the documented validation step still matches
  live behavior.
- Run `node scripts/test-all.mjs --quick` and confirm the docs changes do not
  regress the repo gate.

### Manual Testing

- Read `README.md` and `docs/SETUP.md` in order as if starting from a clean
  clone and confirm the same first-run sequence appears in both places.
- Confirm the README quick start stays short while `docs/SETUP.md` provides the
  detailed file-creation instructions.

### Edge Cases

- Fresh clone with no `cv.md`, `config/profile.yml`, or `portals.yml` yet
- User has copied config files but has not installed Playwright Chromium
- User already has required files and wants the fastest path to `codex`

---

## 10. Dependencies

### External Libraries

- None

### Other Sessions

- **Depends on**: `phase00-session04-validation-drift-closeout`
- **Depended by**: `phase01-session02-contributor-support-docs-alignment`,
  `phase01-session03-customization-and-policy-runtime-cleanup`,
  `phase01-session04-docs-surface-validation-and-phase-closeout`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
