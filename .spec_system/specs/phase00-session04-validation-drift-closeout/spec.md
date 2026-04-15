# Session Specification

**Session ID**: `phase00-session04-validation-drift-closeout`
**Phase**: 00 - Contract and Drift Cleanup
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

This session closes Phase 00 by re-validating the contract-cleanup work end to
end and correcting any remaining validator-surface drift that still contradicts
the Codex-primary runtime contract. Sessions 01 through 03 established the
canonical instruction surface, normalized version ownership, and aligned repo
metadata with the live `.codex` paths. Live validation now shows
`node scripts/test-all.mjs --quick` and `node scripts/update-system.mjs check`
passing, but `npm run doctor` still ends with a legacy `claude` launch hint.

The work stays intentionally narrow. It does not rewrite the public onboarding
docs, batch worker runtime, or broad legacy wording that the residual inventory
already defers to Phase 01 and Phase 02. Instead, it aligns the repo-owned
setup validator with the Phase 00 contract, strengthens the validation gate so
that this drift cannot silently return, and captures explicit phase-exit
evidence for the handoff into `validate` and `updateprd`.

This session is next because it is the only remaining Phase 00 candidate and
all prerequisites are complete. The phase should not be declared ready for
transition until the live validation surfaces and the recorded exit evidence
say the same thing.

---

## 2. Objectives

1. Align the remaining repo-owned validator messaging with the Codex-primary
   runtime contract.
2. Extend repo validation so setup-validator drift is caught automatically.
3. Capture Phase 00 exit evidence that maps live command results to the phase
   success criteria.
4. Confirm which remaining legacy references are true blockers versus later
   phase deferrals.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session02-version-ownership-normalization` - restores canonical
      version ownership used by updater and validation flows
- [x] `phase00-session03-codex-metadata-alignment` - removes blocking metadata
      drift and records later-phase residual legacy references

### Required Tools/Knowledge

- Familiarity with the Phase 00 PRD, Session 04 stub, and existing residual
  legacy inventory
- Working knowledge of the repo validation commands and updater behavior
- `node`, `npm`, `rg`, `git`, and Bash

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Ability to run `node scripts/test-all.mjs --quick`, `npm run doctor`, and
  `node scripts/update-system.mjs check`
- Clean review of any validator-surface drift before implementation begins

---

## 4. Scope

### In Scope (MVP)

- Operator can run `npm run doctor` and receive Codex-primary launch guidance
  from the setup validator - remove the remaining legacy runtime hint from the
  doctor success path.
- Maintainer can rely on repo validation to catch validator-surface drift -
  extend `scripts/test-all.mjs` so it asserts the doctor success output stays
  aligned with the Phase 00 contract.
- Contributor can review a session-local Phase 00 exit report - capture live
  validation evidence, updater status, and the exact mapping to phase success
  criteria.
- Maintainer can distinguish Phase 00 blockers from later-phase cleanup -
  confirm the Session 03 residual inventory still owns README/docs/batch
  references that are not part of this closeout.

### Out of Scope (Deferred)

- Public onboarding rewrite in `README.md`, `docs/SETUP.md`,
  `docs/CONTRIBUTING.md`, `docs/SUPPORT.md`, `docs/CUSTOMIZATION.md`, and
  `docs/LEGAL_DISCLAIMER.md` - Reason: Phase 01 owns the user-facing
  Codex-primary docs refresh.
- Batch worker runtime migration in `batch/`, `modes/batch.md`, and
  `docs/ARCHITECTURE.md` - Reason: Phase 02 owns the `codex exec` migration.
- Broad wording cleanup in non-validator comments or historical artifacts -
  Reason: this session fixes Phase 00-owned validation surfaces and records
  evidence; it does not perform repo-wide copy editing.

---

## 5. Technical Approach

### Architecture

Treat validation surfaces as part of the runtime contract, not as incidental
copy. Update the doctor success path so the setup validator reports the live
Codex entrypoint, then extend `scripts/test-all.mjs` to assert that contract
alongside the instruction-surface and metadata checks already added in earlier
sessions. Record the resulting command evidence in a session-local exit report
that can drive the next `validate` and `updateprd` steps without a fresh audit.

### Design Patterns

- Contract-through-validation: encode runtime expectations in repo tests
  instead of relying on manual memory
- Narrow closeout evidence: keep the phase-exit proof in one session-local
  report tied to live command outputs
- Explicit deferral boundaries: reuse the existing residual inventory for
  later-phase references instead of widening this session

### Technology Stack

- Node.js ESM scripts in `scripts/`
- Markdown artifacts in `.spec_system/specs/`
- Bash and `rg` for targeted drift scans

---

## 6. Deliverables

### Files to Create

| File                                                                                    | Purpose                                                                                                 | Est. Lines |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| `.spec_system/specs/phase00-session04-validation-drift-closeout/phase00-exit-report.md` | Capture validation evidence, success-criteria mapping, and residual-gap decisions for Phase 00 closeout | ~80        |

### Files to Modify

| File                   | Changes                                                                                                 | Est. Lines |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| `scripts/doctor.mjs`   | Replace the legacy `claude` success hint with Codex-primary launch guidance in the setup validator      | ~5         |
| `scripts/test-all.mjs` | Add assertions for the doctor success output and keep validator-surface runtime checks in the repo gate | ~25        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `npm run doctor` completes successfully and points the user at `codex`
      instead of `claude`
- [ ] `scripts/test-all.mjs` validates the doctor success output alongside the
      existing instruction-surface and metadata checks
- [ ] `phase00-exit-report.md` maps live validation commands and outputs to
      the Phase 00 success criteria
- [ ] Remaining legacy references are classified as Phase 01 or Phase 02
      deferrals rather than ambiguous Phase 00 blockers

### Testing Requirements

- [ ] `node --check scripts/doctor.mjs` passes
- [ ] `node --check scripts/test-all.mjs` passes
- [ ] `npm run doctor` passes and prints Codex-primary launch guidance
- [ ] `node scripts/test-all.mjs --quick` passes with the strengthened
      validator-surface assertions
- [ ] Targeted `rg` checks confirm no Phase 00-owned legacy runtime hint
      remains in validator surfaces

### Non-Functional Requirements

- [ ] Phase 00 closeout remains scoped to validator surfaces and evidence
      capture rather than a public docs rewrite
- [ ] Exit evidence is explicit enough to support `validate` and `updateprd`
      without another repo-wide audit
- [ ] Validation output stays deterministic and easy to inspect from the repo
      root

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Live repo evidence already shows `node scripts/test-all.mjs --quick` and
  `node scripts/update-system.mjs check` passing, so the remaining work should
  stay focused on validator-surface alignment and phase-exit evidence.
- `scripts/doctor.mjs` is a setup validator, so its success footer is part of
  the runtime contract even though broader onboarding docs are deferred.
- Session 03 already produced a residual legacy inventory; Session 04 should
  reuse it as the deferral source of truth rather than creating a parallel
  tracker.

### Potential Challenges

- Scope creep from the many legacy references already deferred to Phase 01 and
  Phase 02
- False confidence if validation checks only source text and never assert the
  live doctor output
- Phase-exit evidence drifting from the actual command results if it is not
  recorded immediately after re-validation

### Relevant Considerations

- No active concerns or lessons learned are currently recorded in
  `.spec_system/CONSIDERATIONS.md`.
- `.spec_system/SECURITY-COMPLIANCE.md` is clean; this session is validation
  and documentation closeout with no open security findings expanding scope.

---

## 9. Testing Strategy

### Unit Tests

- Run `node --check` for `scripts/doctor.mjs` and `scripts/test-all.mjs`
  after the validator updates.

### Integration Tests

- Run `npm run doctor` and verify the success footer points to `codex`.
- Run `node scripts/test-all.mjs --quick` and verify the expanded
  validator-surface checks pass.
- Re-run `node scripts/update-system.mjs check` while capturing phase-exit
  evidence to confirm updater behavior remains healthy.

### Manual Testing

- Review the doctor success output in a normal terminal run to confirm the
  message is accurate and still readable.
- Review `phase00-exit-report.md` against `PRD_phase_00.md` and the residual
  inventory to confirm Phase 00 blockers and deferrals are clearly separated.

### Edge Cases

- Doctor output should remain matchable in non-TTY environments where ANSI
  colors are disabled.
- Existing `claude` references in later-phase docs and batch files should not
  fail this narrow validator closeout.
- `update-system.mjs check` may legitimately return `up-to-date`, `dismissed`,
  or `offline`; the exit report should capture the observed state without
  treating those outcomes as drift by themselves.

---

## 10. Dependencies

### External Libraries

- None

### Internal Dependencies

- `scripts/doctor.mjs` - setup validator whose success output still carries a
  legacy runtime hint
- `scripts/test-all.mjs` - repo gate that should enforce the validator
  contract once updated
- `.spec_system/PRD/PRD.md`,
  `.spec_system/PRD/phase_00/PRD_phase_00.md`, and
  `.spec_system/PRD/phase_00/session_04_validation_drift_closeout.md` -
  source requirements and session scope
- `.spec_system/specs/phase00-session03-codex-metadata-alignment/residual-legacy-references.md`
  - existing deferral ledger for later-phase runtime cleanup
- `.spec_system/CONVENTIONS.md` - validation, path, and contract ownership
  conventions

### Other Sessions

- Depends on: `phase00-session02-version-ownership-normalization`,
  `phase00-session03-codex-metadata-alignment`
- Depended by: none inside Phase 00; completion enables `validate`,
  `updateprd`, and the Phase 01 transition workflow

---

## Next Steps

Session complete. Use the phase closeout artifacts and proceed to the next
workflow step when Phase 01 planning begins.
