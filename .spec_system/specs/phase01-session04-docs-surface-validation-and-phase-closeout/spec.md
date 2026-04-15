# Session Specification

**Session ID**: `phase01-session04-docs-surface-validation-and-phase-closeout`
**Phase**: 01 - Docs and Entrypoints
**Status**: Not Started
**Created**: 2026-04-15

---

## 1. Session Overview

This session is the Phase 01 closeout sweep. Sessions 01 through 03 already
aligned the primary public onboarding docs, contributor/support guidance, and
customization/policy docs with the repo's Codex-primary contract. The
remaining gap is that the secondary docs surface still has drift: the docs
index does not expose the final Phase 01 pages cleanly, and `docs/onboarding.md`
still tells users to run `npm run doctor` before the required user-layer files
exist.

The goal here is not another broad wording rewrite. The goal is to validate
the full Phase 01-owned docs surface together, apply only the minimal
index and cross-link adjustments needed for consistency, and capture a
durable residual inventory of the runtime drift that still belongs to later
phases.

By the end of this session, the docs entrypoints should route readers to the
right setup, support, customization, and policy pages, and the repo should
have explicit file-level deferrals for the remaining Phase 02 batch-runtime
work and Phase 03 prompt/metadata cleanup.

---

## 2. Objectives

1. Audit the remaining Phase 01-owned docs surfaces against the live
   Codex-primary contract established by Sessions 01 through 03.
2. Fix the remaining docs-index and cross-link drift in secondary docs
   surfaces without reopening already aligned pages for broad rewrites.
3. Produce an explicit residual runtime-reference inventory tagged to
   Phase 02 or Phase 03 ownership.
4. Leave Phase 01 ready for the `validate` and `updateprd` workflow steps
   with closeout evidence captured in session notes.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-public-quick-start-alignment` - established the
      canonical install, configure, validate, and launch sequence for public
      onboarding
- [x] `phase01-session02-contributor-support-docs-alignment` - aligned the
      contributor and support surfaces that this closeout sweep must now link
      and route to consistently
- [x] `phase01-session03-customization-and-policy-runtime-cleanup` - aligned
      customization and policy docs that the docs index and secondary pages
      must now expose correctly

### Required Tools/Knowledge

- Familiarity with the Phase 01 PRD, Session 04 stub, and prior-session
  handoff notes
- Working knowledge of `AGENTS.md`, `docs/SETUP.md`, `docs/CONTRIBUTING.md`,
  `docs/SUPPORT.md`, `docs/CUSTOMIZATION.md`, and `docs/LEGAL_DISCLAIMER.md`
- `node`, `npm`, `rg`, and Bash

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Read access to the Phase 01 docs surfaces under `docs/`
- Ability to run `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Reader can discover the final Phase 01 docs set from a single docs index,
  including setup, contributing, support, customization, and policy pages.
- Reader can use `docs/onboarding.md` without hitting a setup-order mismatch
  against `README.md` and `docs/SETUP.md`.
- Contributor can use secondary docs such as `docs/development.md` and land on
  the correct support and customization surfaces instead of partial guidance.
- Remaining runtime drift outside the Phase 01 docs surface is captured as an
  explicit handoff to Phase 02 or Phase 03.

### Out of Scope (Deferred)

- `batch/`, `batch/README-batch.md`, `batch/batch-prompt.md`, and
  `modes/batch.md` runtime conversion work - Reason: Phase 02 owns batch
  runtime migration
- Mode-file and batch-prompt tool-name cleanup such as `WebSearch`,
  `WebFetch`, `browser_navigate`, and `/jobhunt` workflow wording -
  Reason: Phase 03 owns prompt normalization
- Issue templates, GitHub metadata, and other non-doc repo metadata cleanup -
  Reason: Phase 03 owns metadata normalization
- Broad rewrites of already aligned Phase 01 docs - Reason: this session is a
  closeout sweep, not a second pass on the same content

---

## 5. Technical Approach

### Architecture

Treat the already aligned Phase 01 docs as the canonical reference surface:
`README.md`, `docs/SETUP.md`, `docs/CONTRIBUTING.md`, `docs/SUPPORT.md`,
`docs/CUSTOMIZATION.md`, and `docs/LEGAL_DISCLAIMER.md`. Audit the secondary
docs entrypoints and lightweight helper pages against those references, then
apply only the smallest set of edits needed to make the docs surface
internally consistent.

Use `docs/README-docs.md` as the primary docs index and `docs/onboarding.md`
plus `docs/development.md` as the secondary routing surfaces that need final
alignment. Capture the repo-wide residual runtime-reference scan in the
session notes, with file-level ownership assigned to Phase 02 or Phase 03
instead of broadening this session into implementation cleanup.

### Design Patterns

- Reference-surface anchoring: reuse the live docs already aligned in Sessions
  01 through 03 as the source of truth
- Minimal closeout edits: make only index and routing corrections required to
  finish Phase 01
- Explicit deferral ledger: record residual batch, prompt, and metadata drift
  without fixing it in this session
- Docs-local link hygiene: keep relative links correct from the perspective of
  each file's directory

### Technology Stack

- Markdown docs under `docs/`
- Repo contract files: `AGENTS.md`, `.spec_system/PRD/PRD.md`, and
  `.spec_system/PRD/phase_01/PRD_phase_01.md`
- Existing repo validation command: `node scripts/test-all.mjs --quick`

---

## 6. Deliverables

### Files to Create

| File                                                                                                      | Purpose                                                                                                              | Est. Lines |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` | Capture the closeout audit, corrected docs routes, residual Phase 02 and Phase 03 inventory, and validation evidence | ~70        |

### Files to Modify

| File                  | Changes                                                                                                                          | Est. Lines |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `docs/README-docs.md` | Expand the docs index so the final Phase 01 surfaces are discoverable from one entrypoint                                        | ~30        |
| `docs/onboarding.md`  | Fix the setup order and route readers to the authoritative setup, data-contract, and customization docs                          | ~20        |
| `docs/development.md` | Refresh contributor-oriented references so secondary docs route to the current contributing, support, and customization surfaces | ~20        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `docs/README-docs.md` exposes the final Phase 01 docs map, including
      setup, contributing, support, customization, and legal/policy pages
- [ ] `docs/onboarding.md` matches the validated setup sequence from
      `README.md` and `docs/SETUP.md`
- [ ] `docs/development.md` routes contributors to the current docs surfaces
      without reintroducing stale or partial guidance
- [ ] Session notes capture the residual runtime-reference inventory with
      explicit Phase 02 versus Phase 03 ownership
- [ ] Session notes capture the final closeout rationale needed for the
      `validate` and `updateprd` handoff

### Testing Requirements

- [ ] Targeted `rg` checks confirm touched docs no longer instruct users to
      run `npm run doctor` before creating required files
- [ ] Local markdown-link validation passes for the touched README/docs
      surfaces
- [ ] `node scripts/test-all.mjs --quick` passes after the docs edits
- [ ] Manual review confirms the touched docs align with the established
      Phase 01 reference surfaces

### Non-Functional Requirements

- [ ] Changes stay limited to docs index and secondary docs routing surfaces
      plus session-local notes
- [ ] Residual drift is classified without pulling Phase 02 batch work or
      Phase 03 prompt/metadata work into implementation scope
- [ ] Updated docs preserve the repo's local-first, no-telemetry,
      human-in-the-loop posture

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- `docs/onboarding.md` currently tells users to run `npm run doctor` before
  creating `cv.md`, `config/profile.yml`, and `portals.yml`, which conflicts
  with `README.md`, `docs/SETUP.md`, and the validator contract.
- `docs/README-docs.md` does not yet surface the docs pages updated in
  Sessions 02 and 03, which weakens the final discoverability of the aligned
  support, customization, and policy surfaces.
- A repo-wide drift scan still finds batch-runtime, prompt, and metadata
  references outside the Phase 01 docs surface. Those findings must be tagged
  for Phase 02 or Phase 03 rather than fixed here.

### Potential Challenges

- Distinguishing true Phase 01 docs-closeout fixes from later-phase prompt or
  metadata cleanup
- Avoiding another broad rewrite of docs already aligned in Sessions 01
  through 03
- Making the residual inventory concrete enough to hand off cleanly without
  widening the session scope

### Relevant Considerations

- [P00] **Residual legacy references**: Keep Phase 02 batch-runtime and later
  metadata cleanup out of this docs-closeout session.
- [P00] **Validator surface drift**: Recheck the final docs routes against the
  live validator contract before declaring the phase ready for validation.
- [P00] **No data collection surface**: Preserve the clean no-telemetry,
  no-PII posture in any closeout wording.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  the live `docs/` files as authoritative and avoid reintroducing inactive
  aliases or wrapper logic.
- [P00] **Explicit deferral ledger**: Keep residual work visible and tagged to
  the owning later phase instead of blurring phase boundaries during closeout.

---

## 9. Testing Strategy

### Unit Tests

- No new unit tests are expected; this is a docs-only session.

### Integration Tests

- Run targeted `rg` checks for stale onboarding order and other Phase 01 docs
  drift in the touched files.
- Run a local markdown-link existence check across the touched README/docs
  surfaces.
- Run `node scripts/test-all.mjs --quick` and confirm the repo gate still
  passes after the closeout edits.

### Manual Testing

- Read `docs/README-docs.md`, `docs/onboarding.md`, and `docs/development.md`
  beside `README.md`, `docs/SETUP.md`, `docs/CONTRIBUTING.md`,
  `docs/SUPPORT.md`, `docs/CUSTOMIZATION.md`, and `docs/LEGAL_DISCLAIMER.md`
  to confirm the routes and wording align.
- Review the residual inventory in session notes and confirm every remaining
  drift item is tagged to Phase 02 or Phase 03 with a file-level reference.

### Edge Cases

- A new user reads `docs/onboarding.md` without opening `README.md` first
- A contributor lands on `docs/development.md` and needs the correct support
  or customization page without guessing
- The residual drift scan returns mixed docs, batch, prompt, and metadata
  findings that must be split cleanly by phase ownership

---

## 10. Dependencies

### External Libraries

- None new; docs-only session

### Other Sessions

- **Depends on**:
  `phase01-session01-public-quick-start-alignment`,
  `phase01-session02-contributor-support-docs-alignment`,
  `phase01-session03-customization-and-policy-runtime-cleanup`
- **Depended by**:
  None within Phase 01; completion unlocks `validate` and `updateprd` for
  phase closeout

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
