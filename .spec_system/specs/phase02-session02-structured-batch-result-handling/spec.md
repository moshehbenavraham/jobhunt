# Session Specification

**Session ID**: `phase02-session02-structured-batch-result-handling`
**Phase**: 02 - Batch Runtime Conversion
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

This session makes the structured worker result the authoritative source of
truth for batch-state behavior. Session 01 already converted the worker
boundary to `codex exec`, added a checked-in result schema, and proved the
runner can capture deterministic result artifacts. The remaining gap is that
the runner still treats every zero-exit worker run as `completed`, even when
the structured result explicitly says `partial` or `failed`.

The work here is to settle the state matrix for `completed`, `partial`,
semantic `failed`, and infrastructure failures without reopening the runner
invocation surface from Session 01. That includes final-state persistence,
retry gating, operator-facing summaries, warning and error recording, and any
downstream consumer paths that still assume only `completed` rows can carry a
usable report reference.

This session stays tightly scoped to runtime semantics and validation. It does
not absorb the batch-owned docs rewrite from Session 03 or the end-to-end
validation closeout from Session 04. The goal is a runner whose state file,
fixtures, tests, and report consumers all agree on what a structured result
means.

---

## 2. Objectives

1. Map structured worker outcomes into explicit runner state transitions,
   retry rules, and summary behavior.
2. Record degraded artifacts, warnings, and failure summaries
   deterministically without depending on free-form logs.
3. Keep report-bearing `partial` outcomes usable by downstream consumers
   without reopening unrelated docs or metadata scope.
4. Add regression coverage that locks in the settled state semantics before
   Session 03 documents them.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session01-codex-exec-worker-contract` - provides the stable
      `codex exec` invocation path, checked-in schema surface, fixtures, and
      contract harness that this session builds on

### Required Tools/Knowledge

- Familiarity with the Phase 02 PRD, Session 02 stub, and Session 01
  implementation handoff
- Working knowledge of `batch/batch-runner.sh`,
  `batch/worker-result.schema.json`, `batch/batch-prompt.md`, and
  `scripts/test-batch-runner-contract.mjs`
- Awareness of downstream `batch-state.tsv` consumers such as
  `dashboard/internal/data/career.go`
- `codex`, `node`, `npm`, `bash`, `jq`, and `rg`

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Phase 02 session stubs present under `.spec_system/PRD/phase_02/`
- Ability to run `bash -n batch/batch-runner.sh` and
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Batch runner can persist `completed`, `partial`, semantic `failed`, and
  infrastructure-failed outcomes with explicit, testable behavior.
- Batch operator can rerun the runner without silently reprocessing terminal
  `partial` or semantic-failed rows during normal flows.
- Degraded artifacts and warning summaries are recorded consistently in the
  structured result contract and reflected in runner-owned state semantics.
- Report-bearing `partial` outcomes remain discoverable to downstream
  consumers that resolve URLs or report references from batch state.
- Regression coverage proves the new state matrix without requiring live
  postings or remote Codex calls.

### Out of Scope (Deferred)

- Batch-owned runtime docs alignment in `batch/README-batch.md` and
  `docs/ARCHITECTURE.md` - Reason: Session 03 owns documentation alignment
- Controlled end-to-end validation, tracker-merge closeout, and residual
  phase handoff evidence - Reason: Session 04 owns validation and closeout
- Broad prompt-language cleanup outside the minimum contract edits needed for
  settled warning and failure semantics - Reason: Phase 03 owns prompt
  normalization
- Release, version, or metadata work outside the batch runtime path - Reason:
  later workflow stages own release-path cleanup

---

## 5. Technical Approach

### Architecture

Preserve the Session 01 worker boundary exactly: `batch/batch-runner.sh`
still launches `codex exec`, writes per-offer result artifacts under
`batch/logs/`, and validates the final JSON result against the checked-in
schema. Session 02 should layer explicit state-semantic helpers on top of
that stable boundary rather than redesigning the invocation path.

Centralize outcome handling inside the runner. A structured-result classifier
should distinguish four cases: `completed`, `partial`, semantic `failed`
result, and infrastructure failure such as non-zero `codex exec`, missing
result file, or contract-invalid JSON. The runner should persist terminal
state, retry counters, score handling, and operator-visible summaries from
that single decision point instead of scattering the logic across exit-code
checks and summary routines.

Keep the existing `batch-state.tsv` shape unless a narrow contract adjustment
is required. Warning details should live in the structured result contract and
be normalized into concise state-file summaries where operators need quick
visibility. If the session introduces `partial` as a first-class terminal
state in `batch-state.tsv`, any downstream consumer that assumes only
`completed` rows can reference a report must be updated in the same session.

### Design Patterns

- Structured-result authority: treat the checked-in JSON result as the source
  of truth for semantic outcome handling
- Explicit state matrix: define terminal versus retryable paths in one place
  with exhaustive status handling
- Stable file contract: preserve the Session 01 result-file surface while
  narrowing any field changes to warnings and failure summaries only
- Consumer-surface audit: update batch-state readers when terminal-state
  semantics expand beyond `completed`
- Layered regression coverage: keep contract tests and state-semantic tests
  distinct but both wired into the repo gate

### Technology Stack

- Bash orchestration in `batch/batch-runner.sh`
- Structured worker results via `batch/worker-result.schema.json`
- Batch prompt contract in `batch/batch-prompt.md`
- Node.js regression harnesses under `scripts/`
- Go dashboard data helpers in `dashboard/internal/data/career.go`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `scripts/test-batch-runner-state-semantics.mjs` | Deterministic harness for rerun gating, retry counters, and summary behavior | ~220 |
| `.spec_system/specs/phase02-session02-structured-batch-result-handling/implementation-notes.md` | State-matrix decisions, downstream consumer audit, and validation evidence | ~90 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `batch/batch-runner.sh` | Make structured outcomes authoritative for state persistence, retry gating, and summaries | ~170 |
| `batch/worker-result.schema.json` | Tighten the warning and failure fields required by settled state semantics | ~40 |
| `batch/batch-prompt.md` | Align partial and failed result instructions with the settled schema fields | ~30 |
| `batch/test-fixtures/worker-result-completed.json` | Keep the completed fixture aligned with the settled result contract | ~20 |
| `batch/test-fixtures/worker-result-partial.json` | Represent degraded-artifact behavior with the settled warning semantics | ~20 |
| `batch/test-fixtures/worker-result-failed.json` | Represent semantic failure behavior under the settled contract | ~20 |
| `scripts/test-batch-runner-contract.mjs` | Update contract assertions for the new runner state expectations | ~80 |
| `scripts/test-all.mjs` | Add the new state-semantics harness to the quick regression surface | ~20 |
| `dashboard/internal/data/career.go` | Keep report-number URL fallback aligned with report-bearing partial outcomes | ~20 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `batch/batch-runner.sh` records `completed`, `partial`, semantic
      `failed`, and infrastructure-failed paths with explicit, deterministic
      behavior derived from the structured result contract
- [ ] Zero-exit semantic `failed` results no longer collapse to
      `completed`
- [ ] Terminal `partial` outcomes are not silently reprocessed during normal
      batch reruns
- [ ] Warning and error semantics are explicit in the checked-in contract and
      reflected in operator-visible batch state
- [ ] Report-bearing `partial` rows remain usable for downstream URL and
      report lookup flows
- [ ] Session notes capture the settled state matrix and any remaining
      Session 03 documentation follow-up

### Testing Requirements

- [ ] `bash -n batch/batch-runner.sh` passes after the state-semantic edits
- [ ] Contract tests cover completed, partial, semantic failed, and
      infrastructure-failed cases against the settled schema
- [ ] A dedicated state-semantics harness verifies rerun gating, retry
      counters, and summary output deterministically
- [ ] `node scripts/test-all.mjs --quick` passes with both batch harnesses
      enabled
- [ ] Manual stub runs confirm the expected state transitions for partial,
      semantic failed, and infrastructure failure scenarios

### Non-Functional Requirements

- [ ] Session 01 invocation behavior remains intact while only state semantics
      change
- [ ] State-file behavior stays deterministic under sequential and rerun flows
- [ ] No new PII, secrets, or telemetry surfaces are introduced in result
      files, warnings, logs, or dashboard lookups

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Session 01 already validates the result artifact and writes it to disk, so
  this session should not redesign the `codex exec` launch contract.
- `batch/batch-runner.sh` currently persists every zero-exit structured result
  as `completed`, even when the result status is `partial` or `failed`.
- `batch-state.tsv` has a fixed column shape, so warning and failure
  classification should fit the existing row contract unless a narrow,
  justified adjustment is required.
- `dashboard/internal/data/career.go` still assumes only `completed` rows can
  provide report-number URL fallbacks; a new terminal `partial` state would
  otherwise become a hidden downstream regression.

### Potential Challenges

- Distinguishing semantic failure from infrastructure failure without creating
  ambiguous retry behavior
- Preserving report visibility and score aggregation for `partial` outcomes
  without letting them masquerade as full success
- Keeping the prompt, schema, fixtures, contract harness, and runner logic in
  lockstep once warning semantics are settled

### Relevant Considerations

- [P00] **Residual legacy references**: Keep broader batch-runtime wording
  cleanup out of this session unless it directly blocks the settled state
  semantics.
- [P00] **Validator surface drift**: Recheck runner changes against both batch
  harnesses and the repo quick gate as soon as the state logic changes.
- [P01] **Deferred runtime-reference cleanup**: Leave broad prompt and docs
  cleanup to later phases after the state matrix is settled.
- [P00] **No data collection surface**: Preserve the current no-PII,
  no-secrets baseline in warnings, errors, result files, and dashboard lookup
  behavior.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  the checked-in batch assets as the live runtime contract.
- [P00] **Validator-first closeout**: Pair every state-semantic change with
  deterministic regression evidence instead of relying on manual reasoning
  alone.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- A semantic `failed` result is still stored as `completed` because the runner
  only trusts exit code
- A `partial` result keeps its report but becomes invisible to summaries or
  downstream URL resolution after the state transition changes
- Retry logic keeps reprocessing terminal semantic failures or partial rows
  and hides genuine infrastructure failures in the same bucket

---

## 9. Testing Strategy

### Unit Tests

- Validate the settled completed, partial, and failed fixtures against the
  updated schema fields
- Assert deterministic warning and failure-summary normalization through the
  batch harness assertions

### Integration Tests

- Run the contract harness against completed, partial, semantic failed, and
  non-zero `codex exec` scenarios
- Run the state-semantics harness against rerun gating, retry counters, and
  summary reporting flows
- Run `bash -n batch/batch-runner.sh`
- Run `node scripts/test-all.mjs --quick`

### Manual Testing

- Execute stubbed single-offer runs that produce partial, semantic failed, and
  infrastructure-failed outcomes and confirm the stored state row plus summary
  output matches the planned matrix
- Re-run the batch runner after each terminal-state scenario and confirm only
  infrastructure-failed rows remain retryable during normal runs
- Review a report-bearing partial row through the dashboard URL fallback path
  if the session changes that consumer behavior

### Edge Cases

- Worker returns `partial` with a report and score but missing PDF and tracker
- Worker returns semantic `failed` with a report path present and a zero CLI
  exit code
- `codex exec` exits non-zero after writing no result file
- Contract-valid results and rerun logic disagree on whether a failed row is
  terminal or retryable

---

## 10. Dependencies

### External Libraries

- None new; use existing Bash, Node.js, Go, and Codex CLI capabilities

### Other Sessions

- **Depends on**:
  `phase02-session01-codex-exec-worker-contract`
- **Depended by**:
  `phase02-session03-batch-runtime-docs-alignment` directly, with
  `phase02-session04-batch-flow-validation-and-closeout` relying on the same
  settled state semantics transitively

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
