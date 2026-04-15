# Session Specification

**Session ID**: `phase02-session04-batch-flow-validation-and-closeout`
**Phase**: 02 - Batch Runtime Conversion
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

Sessions 01 and 02 converted the batch runtime to `codex exec` and made the
structured result contract authoritative for state handling. Session 03 then
aligned the operator-facing batch docs with that live runtime. Phase 02 still
lacks the last piece needed for a clean handoff: controlled validation
evidence that the converted runner, closeout scripts, and quick repo gate
behave correctly together.

This session focuses on evidence, not another rewrite. The repo already has
contract and state-semantics harnesses, but Phase 02 closeout still needs
deterministic confirmation of dry-run behavior, retry gating, report-number
reservation, merge and verify sequencing, and residual drift classification.
The work should stay inside temporary sandboxes and repo-owned fixtures so the
validation does not mutate real user data.

This is the natural next session because Phase 02 cannot move to `validate`
and `updateprd` until the converted batch path has controlled-flow proof.
The session should fix only the runtime or closeout gaps that the evidence
actually uncovers and defer broader wording or metadata cleanup to Phase 03.

---

## 2. Objectives

1. Validate the converted batch runtime with deterministic dry-run, rerun,
   report-number, and closeout scenarios.
2. Tighten `batch/batch-runner.sh`, `scripts/merge-tracker.mjs`, or
   `scripts/verify-pipeline.mjs` only where controlled validation exposes real
   drift.
3. Extend the quick repo gate so Phase 02 closeout evidence is reproducible on
   a clean checkout.
4. Capture residual Phase 03 cleanup items and Phase 02 closeout inputs in the
   session notes.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session01-codex-exec-worker-contract` - provides the stable
      `codex exec` worker-launch path and batch runner contract
- [x] `phase02-session02-structured-batch-result-handling` - provides the
      settled worker-result schema, status semantics, and retry behavior
- [x] `phase02-session03-batch-runtime-docs-alignment` - provides operator and
      architecture docs aligned to the live runtime before validation

### Required Tools/Knowledge

- Familiarity with the Phase 02 PRD and Session 04 stub
- Working knowledge of `batch/batch-runner.sh`,
  `batch/worker-result.schema.json`, `scripts/merge-tracker.mjs`,
  `scripts/verify-pipeline.mjs`, and `scripts/test-all.mjs`
- Familiarity with the existing batch harnesses in
  `scripts/test-batch-runner-contract.mjs` and
  `scripts/test-batch-runner-state-semantics.mjs`
- `bash`, `node`, `jq`, and `codex`

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Phase 02 session stubs present under `.spec_system/PRD/phase_02/`
- Ability to run deterministic temp-sandbox tests without touching real user
  tracker data

---

## 4. Scope

### In Scope (MVP)

- Controlled validation for dry-run behavior, retry gating, resumability,
  report-number reservation, and structured worker result handling using
  repo-owned fixtures and temp sandboxes.
- Controlled closeout validation that exercises the runner together with
  `scripts/merge-tracker.mjs` and `scripts/verify-pipeline.mjs`.
- Targeted runtime or closeout-script fixes only where the controlled evidence
  exposes a mismatch with the settled Phase 02 contract.
- Quick-gate updates and session notes that preserve reproducible evidence and
  hand Phase 03 only the residual wording or metadata cleanup.

### Out of Scope (Deferred)

- Broad prompt or mode language cleanup outside the runtime facts already
  settled in Phase 02
  - Reason: Phase 03 owns repo-wide wording and metadata normalization
- Release tasks, version bumps, archival work, or PR publication
  - Reason: later workflow stages own release and archive actions
- Live production batch runs against real user offers
  - Reason: this session needs deterministic validation, not live data churn
- New batch features beyond validating the converted runtime and closeout flow
  - Reason: Phase 02 scope is runtime conversion and validation only

---

## 5. Technical Approach

### Architecture

Use the existing sandbox-test pattern as the primary validation method. The
new closeout coverage should copy the batch runner, prompt template, schema,
and supporting scripts into a temp directory, seed a minimal `applications.md`
and tracker-addition set, run the runner through the mock `codex` fixture, and
assert the resulting `batch-state.tsv`, report numbering, merge behavior, and
verification output. This keeps validation deterministic and isolates it from
real user data.

Treat existing harnesses as building blocks, not dead weight. The current
contract and state-semantics tests already prove core worker invocation and
state mapping. Session 04 should extend that coverage where closeout evidence
is still missing, then wire the resulting harness into `node scripts/test-all.mjs --quick`
so the Phase 02 handoff can be reproduced from the normal repo gate.

Fixes must be evidence-driven. If controlled validation uncovers a real gap in
report-number reservation, rerun gating, merge sequencing, or pipeline
verification, patch the owning runtime file directly and keep the scope narrow.
If no gap exists, capture the proof in implementation notes and do not invent
extra runtime churn.

### Design Patterns

- Deterministic sandbox integration testing: validate batch flows in temp
  directories with mock `codex` workers and fixture data
- Validator-first closeout: pair runtime validation with the quick repo gate so
  Phase 02 handoff stays reproducible
- Minimal-fix remediation: change only the runtime surface directly implicated
  by failing evidence
- Explicit deferral: record Phase 03 cleanup items instead of absorbing
  non-validation work into Phase 02

### Technology Stack

- Bash batch orchestration in `batch/batch-runner.sh`
- Node.js test harnesses in `scripts/`
- Structured worker result fixtures in `batch/test-fixtures/`
- Repo-owned merge and verification scripts
- Quick validation gate in `node scripts/test-all.mjs --quick`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `.spec_system/specs/phase02-session04-batch-flow-validation-and-closeout/implementation-notes.md` | Record validation evidence, residual drift, and Phase 02 closeout handoff notes | ~100 |
| `scripts/test-batch-runner-closeout.mjs` | Deterministic closeout harness for runner, merge, and verify behavior in a temp sandbox | ~220 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `scripts/test-batch-runner-state-semantics.mjs` | Extend rerun, retry-budget, and report-number coverage needed for closeout | ~90 |
| `scripts/test-all.mjs` | Add the closeout harness to the quick regression gate | ~20 |
| `batch/batch-runner.sh` | Tighten closeout sequencing or failure reporting if controlled validation exposes drift | ~40 |
| `scripts/merge-tracker.mjs` | Fix merge-path behavior only if closeout validation reveals tracker-merge drift | ~40 |
| `scripts/verify-pipeline.mjs` | Tighten validation assertions only if closeout evidence reveals a contract gap | ~30 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Controlled validation proves the runner reserves deterministic report
      numbers and applies rerun or retry gating correctly
- [ ] Controlled closeout validation proves merge and verify still behave
      correctly after the `codex exec` runtime conversion
- [ ] Any runtime drift found during validation is fixed in the owning batch
      or repo script without broadening session scope
- [ ] Session notes capture residual Phase 03 cleanup items and the closeout
      inputs needed for `validate` and `updateprd`

### Testing Requirements

- [ ] `node scripts/test-batch-runner-closeout.mjs` passes
- [ ] `node scripts/test-batch-runner-contract.mjs` and
      `node scripts/test-batch-runner-state-semantics.mjs` pass after any
      fixes
- [ ] `node scripts/test-all.mjs --quick` passes
- [ ] Manual sandbox walkthrough confirms the operator-facing `--dry-run` and
      `--retry-failed` flows match the validated behavior

### Non-Functional Requirements

- [ ] Validation stays deterministic, fixture-based, and isolated from real
      user-layer data
- [ ] No new PII, secrets, or telemetry surfaces are introduced in fixtures,
      logs, or session notes
- [ ] Session scope remains limited to Phase 02 runtime validation and closeout
      preparation

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions and keeps repo-owned validation
      surfaces aligned

---

## 8. Implementation Notes

### Key Considerations

- Session 03 already aligned the batch docs to the live runtime, so Session 04
  should focus on validation evidence rather than another docs pass.
- The existing contract and state-semantics harnesses already cover the core
  worker invocation and state model; closeout coverage should reuse that
  sandbox pattern instead of inventing a separate test style.
- Merge and verify scripts should be exercised inside temp sandboxes before
  Phase 02 closeout so the validation does not mutate real tracker data.

### Potential Challenges

- Keeping the quick test suite fast while adding closeout evidence
- Avoiding false confidence from tests that bypass the real runner or closeout
  path too aggressively
- Classifying residual Phase 03 cleanup cleanly so Phase 02 can close without
  reopening deferred scope

### Relevant Considerations

- [P00] **Residual legacy references**: Keep non-validation cleanup out of
  this session unless it directly blocks the converted batch path.
- [P00] **Validator surface drift**: Recheck any runtime or test change
  against `scripts/test-all.mjs`, `scripts/doctor.mjs`, and the canonical
  `VERSION` contract.
- [P01] **Deferred runtime-reference cleanup**: Record broader wording cleanup
  for Phase 03 instead of absorbing it into the validation session.
- [P00] **No data collection surface**: Preserve the no-PII baseline in
  fixtures, temp logs, and implementation notes.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  live docs as the authoritative runtime surfaces while validating behavior.
- [P00] **Validator-first closeout**: Pair runtime validation evidence with the
  quick repo gate so Phase 02 does not close on manual inspection alone.

---

## 9. Testing Strategy

### Unit Tests

- Extend the existing batch harnesses so state transitions, retry budgets, and
  report numbering are asserted deterministically

### Integration Tests

- Run the new closeout harness that exercises runner plus merge and verify
  behavior in a temp sandbox
- Re-run `node scripts/test-all.mjs --quick` after any fixes

### Manual Testing

- Walk a temp-sandbox batch run through `--dry-run`, a normal run, and
  `--retry-failed` to confirm the operator-facing flow matches the test
  evidence

### Edge Cases

- Retryable infrastructure failures that reach `--max-retries`
- Partial results where PDF or tracker artifacts are intentionally missing
- Skipped rows that should not produce downstream tracker or PDF work
- Pre-existing reports or state rows that affect the next reserved report
  number

---

## 10. Dependencies

### External Libraries

- None expected beyond the current repo toolchain

### Other Sessions

- **Depends on**: `phase02-session01-codex-exec-worker-contract`,
  `phase02-session02-structured-batch-result-handling`,
  `phase02-session03-batch-runtime-docs-alignment`
- **Depended by**: `validate`, `updateprd`, and Phase 02 closeout

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
