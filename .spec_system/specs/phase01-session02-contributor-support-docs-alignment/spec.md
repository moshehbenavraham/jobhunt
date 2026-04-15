# Session Specification

**Session ID**: `phase01-session02-contributor-support-docs-alignment`
**Phase**: 01 - Docs and Entrypoints
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

This session extends Phase 01 from public onboarding into the contributor and
support surfaces that come immediately after a successful first run. Session 01
already settled the clone-to-`codex` path in `README.md` and `docs/SETUP.md`.
The next gap is that contributor-facing and help-facing docs still do not
present one clean Codex-primary workflow end to end.

The current live docs are close, but they still leave avoidable drift. Root
`CONTRIBUTING.md` is only a thin pointer, `docs/CONTRIBUTING.md` lists checks
without clearly framing the active validation path, and `docs/SUPPORT.md`
still asks reporters to name a generic CLI while also carrying broken
docs-local links to setup and security pages. This session fixes those
surfaces without widening into batch docs, customization docs, or repo
metadata.

This is the correct next session because Session 01 is already complete in the
phase PRD and session artifacts, and the Phase 01 PRD explicitly names Session
02 as the next upcoming unit of work. Session 03 and Session 04 can wait;
contributor and support guidance should be aligned before the broader docs
cleanup and phase closeout sweep.

---

## 2. Objectives

1. Align `CONTRIBUTING.md` and `docs/CONTRIBUTING.md` with the live
   Codex-primary runtime and contributor workflow.
2. Update `docs/SUPPORT.md` so setup help, bug reports, and security guidance
   request the right diagnostics and link to the correct docs.
3. Keep cross-links between setup, contributing, support, scripts, and
   security docs coherent from their actual file locations.
4. Preserve Phase 01 scope boundaries by limiting changes to contributor and
   support docs plus session-local notes.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-public-quick-start-alignment` - establishes the
      canonical public onboarding wording and command sequence reused here

### Required Tools/Knowledge

- Familiarity with the Phase 01 PRD, Session 02 stub, and Session 01 handoff
  artifacts
- Working knowledge of `package.json` scripts and the existing repo docs under
  `docs/`
- `node`, `npm`, `rg`, and Bash

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Read access to `CONTRIBUTING.md`, `docs/CONTRIBUTING.md`,
  `docs/SUPPORT.md`, `docs/SETUP.md`, `docs/SECURITY.md`, and `package.json`
- Ability to run `npm run doctor` and `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Contributor can start at `CONTRIBUTING.md` and reach one detailed guide that
  describes the current Codex-primary workflow and validation expectations.
- Contributor can use `docs/CONTRIBUTING.md` to understand branch, commit,
  review, and validation expectations without stale runtime ambiguity.
- User seeking help can use `docs/SUPPORT.md` to choose the right channel and
  provide actionable environment details for setup or bug issues.
- Internal links from contributor and support docs resolve correctly to setup,
  scripts, architecture, and security docs from their actual locations.

### Out of Scope (Deferred)

- `docs/CUSTOMIZATION.md` and `docs/LEGAL_DISCLAIMER.md` - Reason: Session 03
  owns customization and policy cleanup.
- `batch/`, `batch/README-batch.md`, `modes/batch.md`, and
  `docs/ARCHITECTURE.md` batch-runtime wording - Reason: Phase 02 owns batch
  runtime conversion and worker-contract changes.
- Issue templates, labeler rules, and other metadata surfaces - Reason: later
  phases own metadata normalization outside the docs track.
- Public onboarding flow in `README.md` and `docs/SETUP.md` - Reason: Session
  01 already owns that wording; this session should consume it, not reopen it.

---

## 5. Technical Approach

### Architecture

Treat Session 01's public onboarding wording as the settled baseline, then
carry that same runtime contract into contributor and support docs. Keep root
`CONTRIBUTING.md` as a concise entrypoint, keep `docs/CONTRIBUTING.md` as the
full contributor guide, and make `docs/SUPPORT.md` a routing and diagnostics
document rather than a generic community page. Internal links must be written
relative to each document's actual directory so the docs surface works both in
GitHub and in local reading.

### Design Patterns

- Thin entrypoint, detailed guide: keep root `CONTRIBUTING.md` short and point
  to `docs/CONTRIBUTING.md` for the full workflow
- Validation-first guidance: describe the current repo checks by purpose, then
  point contributors to the commands that already exist in `package.json`
- Support triage by channel: separate setup, bug, feature, and security paths
  so support requests arrive with the right context
- Relative-link correctness: fix docs-local links from inside `docs/` instead
  of assuming repo-root link targets

### Technology Stack

- Markdown docs in the repo root and `docs/`
- Existing npm scripts exposed through `package.json`
- Existing public support channel in GitHub

---

## 6. Deliverables

### Files to Create

| File                                                                                              | Purpose                                                                                                    | Est. Lines |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` | Capture the docs audit, wording decisions, corrected link map, and deferred findings during implementation | ~45        |

### Files to Modify

| File                   | Changes                                                                                                 | Est. Lines |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| `CONTRIBUTING.md`      | Keep the root contributor entrypoint concise while aligning it with the live docs flow and support path | ~10        |
| `docs/CONTRIBUTING.md` | Refresh contributor workflow wording, validation expectations, and internal cross-links                 | ~35        |
| `docs/SUPPORT.md`      | Update help routing, requested diagnostics, and docs-local links for setup and security support         | ~30        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `CONTRIBUTING.md` points contributors to one authoritative guide without
      duplicating stale or conflicting workflow text
- [ ] `docs/CONTRIBUTING.md` describes Codex as the primary runtime and names
      the current validation commands with clear contributor use cases
- [ ] `docs/SUPPORT.md` stops asking for generic multi-CLI context and instead
      requests reproducible environment details relevant to the live repo
- [ ] Internal links in contributor and support docs resolve correctly to
      setup, scripts, architecture, and security references
- [ ] Session notes capture the final wording decisions, link corrections, and
      any explicitly deferred follow-up items

### Testing Requirements

- [ ] `rg` checks across the touched docs show no stale Claude-first or
      OpenCode-first wording
- [ ] `npm run doctor` still succeeds and matches the guidance cited in the
      contributor and support docs
- [ ] `node scripts/test-all.mjs --quick` passes after the docs edits
- [ ] Manual read-through confirms the path from onboarding to contributing to
      support is internally consistent

### Non-Functional Requirements

- [ ] Changes stay limited to contributor and support docs plus session-local
      notes
- [ ] Root and docs-level contributing guides remain intentionally different in
      depth but identical in runtime contract
- [ ] Updated support guidance preserves the repo's local-first, no-telemetry
      posture and avoids asking users for unnecessary sensitive data

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Root `CONTRIBUTING.md` is intentionally a short entrypoint, so the detailed
  contributor workflow should remain in `docs/CONTRIBUTING.md`.
- `docs/SUPPORT.md` currently contains stale runtime language and broken
  docs-local relative links (`docs/SETUP.md` and `SECURITY.md`) that need to
  be corrected from the perspective of a file inside `docs/`.
- The session should reuse the validation surface already named in
  `package.json` and documented elsewhere rather than inventing new helper
  commands.

### Potential Challenges

- Expanding contributor docs into a second setup guide instead of keeping setup
  depth in `docs/SETUP.md`
- Correcting internal links without accidentally breaking existing external
  GitHub reference
- Keeping validation guidance useful for contributors while not widening into
  batch or implementation-specific docs

### Relevant Considerations

- [P00] **Residual legacy references**: Keep Phase 02 batch-runtime and later
  metadata cleanup out of this docs-only session.
- [P00] **Validator surface drift**: Recheck any cited commands against
  `package.json`, `scripts/doctor.mjs`, and `scripts/test-all.mjs`.
- [P00] **No data collection surface**: Keep support guidance local-first and
  do not ask users for unnecessary secrets or private data.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  `docs/` as the live instruction surface and avoid reintroducing `.claude`
  aliases.

---

## 9. Testing Strategy

### Unit Tests

- No new unit tests are expected; validate the docs surface with the repo's
  existing command checks and targeted text scans.

### Integration Tests

- Run `npm run doctor` and confirm the cited setup validation flow still
  matches the live repo.
- Run `node scripts/test-all.mjs --quick` and confirm the documentation edits
  do not regress the repo gate.

### Manual Testing

- Read `CONTRIBUTING.md`, `docs/CONTRIBUTING.md`, and `docs/SUPPORT.md` in
  order and confirm the runtime contract, validation path, and escalation
  guidance stay coherent.
- Follow each internal docs link from the rendered markdown perspective of the
  file where it appears and confirm the targets are correct.

### Edge Cases

- Contributor cloned the repo successfully but has not run any validation yet
- User needs setup help and should be routed to `docs/SETUP.md` rather than a
  generic issue template
- User reports a security issue and must be routed to the correct security doc
  path without exposing details in a public issue

---

## 10. Dependencies

### External Libraries

- None

### Other Sessions

- **Depends on**: `phase01-session01-public-quick-start-alignment`
- **Depended by**: `phase01-session04-docs-surface-validation-and-phase-closeout`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
