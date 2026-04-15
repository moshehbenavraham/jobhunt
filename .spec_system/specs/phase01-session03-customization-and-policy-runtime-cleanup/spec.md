# Session Specification

**Session ID**: `phase01-session03-customization-and-policy-runtime-cleanup`
**Phase**: 01 - Docs and Entrypoints
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

This session cleans up the remaining Phase 01 user-facing docs that still
describe the wrong runtime or the wrong customization surface. Session 01
already aligned public onboarding, and Session 02 aligned contributor and
support guidance. The next gap is that `docs/CUSTOMIZATION.md` and
`docs/LEGAL_DISCLAIMER.md` still describe stale behavior that no longer
matches the repo's Codex-primary contract.

The customization guide currently points users at inactive `.claude` hooks and
even tells them to place personal negotiation content in `modes/_shared.md`,
which conflicts with `AGENTS.md` and `docs/DATA_CONTRACT.md`. The legal
disclaimer already gets the local-first posture mostly right, but it still
uses broader multi-runtime wording and carries at least one docs-local link
that should be checked from the perspective of a file inside `docs/`.

This is the correct next session because Session 04 depends on all Phase 01
docs surfaces being internally coherent before the final validation sweep.
Session 03 resolves the remaining customization and policy drift now, while
keeping batch runtime migration, prompt cleanup, and metadata normalization
explicitly deferred to later phases.

---

## 2. Objectives

1. Rewrite `docs/CUSTOMIZATION.md` so it points only to live customization
   surfaces and respects the repo's user-layer versus system-layer boundary.
2. Refresh `docs/LEGAL_DISCLAIMER.md` so local execution, provider
   responsibility, and acceptable-use language stay accurate without implying
   a hosted maintainer service or obsolete default runtimes.
3. Preserve the repo's no-telemetry, local-first, human-in-the-loop posture
   across both docs.
4. Capture any remaining non-Phase-01 runtime drift as explicit deferrals
   rather than widening the session scope.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-public-quick-start-alignment` - established the
      public Codex-primary runtime wording that these docs must now match
- [x] `phase01-session02-contributor-support-docs-alignment` - aligned the
      contributor and support docs that bound this remaining cleanup surface

### Required Tools/Knowledge

- Familiarity with the Phase 01 PRD, Session 03 stub, and Phase 00/01
  considerations
- Working knowledge of `AGENTS.md`, `docs/DATA_CONTRACT.md`, and
  `.codex/skills/career-ops/SKILL.md`
- `node`, `npm`, `rg`, and Bash

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Read access to `docs/CUSTOMIZATION.md`, `docs/LEGAL_DISCLAIMER.md`,
  `AGENTS.md`, `docs/DATA_CONTRACT.md`, and
  `.codex/skills/career-ops/SKILL.md`
- Ability to run `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- User can customize identity, targeting, and narrative through the live
  user-layer files documented by `AGENTS.md` and `docs/DATA_CONTRACT.md`.
- User can read `docs/CUSTOMIZATION.md` and understand which repo files are
  safe to personalize versus which shared system files should stay generic.
- User can read `docs/LEGAL_DISCLAIMER.md` and understand the local-execution
  model, the absence of maintainer telemetry, and their responsibility for the
  AI provider and platform usage they choose.
- Remaining runtime drift found during this doc cleanup is classified into the
  right later phase instead of being silently mixed into Phase 01.

### Out of Scope (Deferred)

- `batch/`, `batch/README-batch.md`, `modes/batch.md`, and batch worker
  runtime wording - Reason: Phase 02 owns batch runtime conversion
- Issue templates, labeler rules, and other metadata normalization - Reason:
  later phases own metadata cleanup
- Repo-wide mode or batch-prompt wording changes - Reason: prompt cleanup
  belongs outside this docs-only session
- Reworking setup, contributor, or support docs already aligned in Sessions 01
  and 02 - Reason: those surfaces are inputs to this session, not reopened
  scope

---

## 5. Technical Approach

### Architecture

Treat `AGENTS.md`, `.codex/skills/career-ops/SKILL.md`, and
`docs/DATA_CONTRACT.md` as the live contract for runtime behavior and file
ownership. Update `docs/CUSTOMIZATION.md` so every recommendation points to a
real repo surface that exists today and follows the user/system boundary.
Update `docs/LEGAL_DISCLAIMER.md` so it frames local execution and third-party
provider responsibility accurately without promoting stale alternate runtimes
as the primary path.

### Design Patterns

- Live-surface anchoring: cite the checked-in files and commands that actually
  exist today
- User/system boundary by ownership: keep personalization in user-layer files
  and shared defaults in system-layer files
- Local-execution disclaimer framing: make it explicit that maintainers do not
  host models, collect telemetry, or operate a managed service
- Explicit deferral ledger: record residual drift for later phases instead of
  broadening Session 03

### Technology Stack

- Markdown docs under `docs/`
- Repo contract files: `AGENTS.md`, `docs/DATA_CONTRACT.md`, and
  `.codex/skills/career-ops/SKILL.md`
- Existing repo validation command: `node scripts/test-all.mjs --quick`

---

## 6. Deliverables

### Files to Create

| File                                                                                                    | Purpose                                                                                                                  | Est. Lines |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `.spec_system/specs/phase01-session03-customization-and-policy-runtime-cleanup/implementation-notes.md` | Capture the drift audit, wording decisions, removed stale references, and deferred follow-up items during implementation | ~45        |

### Files to Modify

| File                       | Changes                                                                                                        | Est. Lines |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| `docs/CUSTOMIZATION.md`    | Replace stale `.claude` and shared-file guidance with the live customization surfaces and ownership boundaries | ~45        |
| `docs/LEGAL_DISCLAIMER.md` | Refresh runtime, provider, privacy, and acceptable-use wording plus fix docs-local cross-links                 | ~35        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `docs/CUSTOMIZATION.md` no longer points users at `.claude` settings,
      inactive hooks, or personalization in `modes/_shared.md`
- [ ] `docs/CUSTOMIZATION.md` clearly names the live user-layer files and
      shared system files that own each kind of customization
- [ ] `docs/LEGAL_DISCLAIMER.md` accurately describes local execution,
      provider responsibility, no telemetry, and human review requirements
- [ ] Docs-local links in the touched files resolve correctly from within the
      `docs/` directory
- [ ] Session notes capture the final wording decisions, removed stale
      references, and explicitly deferred follow-up items

### Testing Requirements

- [ ] Targeted `rg` checks across the touched docs show no stale `.claude`
      hook guidance or contradictory personalization instructions
- [ ] `node scripts/test-all.mjs --quick` passes after the docs edits
- [ ] Manual read-through confirms both docs match `AGENTS.md`,
      `docs/DATA_CONTRACT.md`, and the checked-in career-ops skill

### Non-Functional Requirements

- [ ] Changes stay limited to customization and policy docs plus session-local
      notes
- [ ] Updated wording preserves the repo's local-first, no-telemetry posture
- [ ] User/system ownership remains consistent with the documented data
      contract

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- `docs/CUSTOMIZATION.md` currently conflicts with the data contract by
  telling users to place personal negotiation scripts in `modes/_shared.md`.
- The same customization doc still documents `.claude` hooks even though the
  live checked-in runtime surface is `AGENTS.md` plus `.codex/skills/`.
- `docs/LEGAL_DISCLAIMER.md` should preserve local execution and provider
  responsibility language while avoiding wording that reintroduces stale
  alternate runtimes as the default path.

### Potential Challenges

- Rewriting customization guidance without inventing a new hook or extension
  system that the repo does not actually ship
- Tightening legal wording without drifting into repo-hosted-service language
  or implying legal guarantees the project cannot make
- Keeping Phase 01 scope narrow while still documenting any residual runtime
  drift discovered during the sweep

### Relevant Considerations

- [P00] **Residual legacy references**: Keep Phase 02 batch-runtime and later
  metadata cleanup out of this docs-only session.
- [P00] **Validator surface drift**: Recheck wording against the live repo
  contract and the existing validation gate.
- [P00] **No data collection surface**: Preserve the clean no-telemetry,
  no-PII posture in policy and customization docs.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  `docs/` as authoritative and avoid reintroducing `.claude` aliases.

---

## 9. Testing Strategy

### Unit Tests

- No new unit tests are expected; this is a docs-only session.

### Integration Tests

- Run targeted `rg` checks for stale `.claude` references and contradictory
  personalization guidance in the touched docs.
- Run `node scripts/test-all.mjs --quick` and confirm the repo gate still
  passes after the wording changes.

### Manual Testing

- Read `docs/CUSTOMIZATION.md` beside `AGENTS.md`, `docs/DATA_CONTRACT.md`,
  and `.codex/skills/career-ops/SKILL.md` and confirm the customization
  surfaces align.
- Read `docs/LEGAL_DISCLAIMER.md` and verify the local-execution, provider,
  privacy, and acceptable-use wording is consistent and internally linked
  correctly.

### Edge Cases

- User wants to personalize scoring or negotiation guidance without editing
  shared system files
- User runs the repo with their own local AI provider configuration and must
  still understand maintainer versus provider responsibility
- A docs-local link such as the license reference is resolved from inside
  `docs/` rather than from the repo root

---

## 10. Dependencies

### External Libraries

- None new; docs-only session

### Other Sessions

- **Depends on**:
  `phase01-session01-public-quick-start-alignment`,
  `phase01-session02-contributor-support-docs-alignment`
- **Depended by**:
  `phase01-session04-docs-surface-validation-and-phase-closeout`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
