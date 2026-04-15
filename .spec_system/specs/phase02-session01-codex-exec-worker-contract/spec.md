# Session Specification

**Session ID**: `phase02-session01-codex-exec-worker-contract`
**Phase**: 02 - Batch Runtime Conversion
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

This session starts Phase 02 by replacing the batch runner's `claude -p`
launch path with a Codex-native `codex exec` contract while preserving the
existing batch business logic. The current runner already owns queueing, lock
management, report numbering, state tracking, and tracker merging, but its
worker boundary still depends on Claude-specific flags and free-form log
scraping. The objective here is to convert only that contract boundary so
later sessions can build on a stable runtime surface.

The main output is a runner that launches each offer from the repo root via
`codex exec`, passes the worker an explicit result-file path, and validates
the final worker result against a checked-in schema. The session also adds
contract-focused fixtures and regression coverage so the new invocation path
can be tested without requiring live postings or real Codex calls in every
test run.

This session intentionally stops short of making structured worker results the
authoritative source of batch state semantics. Session 02 owns the downstream
mapping of `completed`, `partial`, and `failed` outcomes into state, score,
artifact, and retry behavior. Session 01 only needs to wire the contract
cleanly enough that Session 02 can replace log scraping without reopening the
runner invocation surface.

---

## 2. Objectives

1. Replace the batch runner's `claude -p` worker launch path with a
   repo-root `codex exec` invocation.
2. Define the worker result contract as a checked-in, schema-backed batch
   asset instead of an implied stdout convention.
3. Thread result-file plumbing through the runner and worker prompt without
   broad prompt cleanup or docs rewrites.
4. Add regression coverage that can stub `codex exec` and verify the contract
   boundary deterministically.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session04-docs-surface-validation-and-phase-closeout` -
      closes the Phase 01 docs and entrypoint work so Phase 02 can focus on
      batch runtime conversion

### Required Tools/Knowledge

- Familiarity with the Phase 02 PRD, Session 01 stub, and current batch
  orchestration flow
- Working knowledge of `batch/batch-runner.sh`, `batch/batch-prompt.md`, and
  `scripts/test-all.mjs`
- `codex`, `node`, `npm`, `bash`, and `rg`

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Phase 02 session stubs present under `.spec_system/PRD/phase_02/`
- Ability to run `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Batch operator can launch per-offer workers through `codex exec` from the
  repo root while preserving the current runner flow.
- Batch runner resolves prompt placeholders for a per-offer result file and
  keeps existing log, tracker, and report-number conventions intact.
- Repo contains a checked-in worker result schema, fixtures, and regression
  harness that make the contract explicit and reusable.
- Runner no longer depends on `claude -p` anywhere in its execution path.

### Out of Scope (Deferred)

- Structured interpretation of `completed`, `partial`, and `failed` results
  into authoritative batch state behavior - Reason: Session 02 owns result
  handling semantics
- Batch-owned docs and architecture rewrites - Reason: Session 03 owns runtime
  docs alignment
- Broad prompt and mode wording cleanup outside the minimum contract edits -
  Reason: Phase 03 owns prompt normalization
- Controlled end-to-end batch closeout validation - Reason: Session 04 owns
  validation and closeout evidence

---

## 5. Technical Approach

### Architecture

Keep the existing runner-owned orchestration model: input TSV parsing, PID and
state locking, retry gating, report-number reservation, tracker merge, and
summary output all remain in `batch/batch-runner.sh`. Replace only the worker
boundary so the runner prepares a resolved prompt, a per-offer result-file
path, and any event-log paths before launching `codex exec -C "$PROJECT_DIR"`.

Define the worker result contract in a checked-in JSON schema under `batch/`.
The worker prompt writes its final JSON result to `{{RESULT_FILE}}`, and the
runner uses Codex CLI output options to keep the contract explicit and
machine-readable. Session 01 validates the existence and shape of that result
surface but leaves full status-to-state mapping to Session 02.

Back the contract with a stubbed regression harness so the repo can assert the
exact CLI arguments, repo-root execution, schema wiring, and result-file
behavior without relying on live remote services. This keeps the new runtime
boundary deterministic and easy to revalidate as later sessions touch it.

### Design Patterns

- Contract-first integration: define the worker result schema before depending
  on downstream parsing behavior
- Repo-root execution anchoring: run all workers with `-C "$PROJECT_DIR"` to
  keep path resolution stable
- Explicit artifact paths: pass resolved result, prompt, and log paths instead
  of inferring outcomes from stdout scraping
- Stubbed CLI regression: use a local fake `codex` executable plus fixtures to
  verify invocation behavior deterministically
- Narrow phase boundaries: keep result semantics, docs alignment, and broad
  prompt cleanup out of this session

### Technology Stack

- Bash orchestration in `batch/batch-runner.sh`
- Codex CLI non-interactive execution via `codex exec`
- JSON schema contract under `batch/`
- Node.js regression harness integrated into `scripts/test-all.mjs`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `batch/worker-result.schema.json` | Canonical worker result schema for completed, partial, and failed outcomes | ~80 |
| `batch/test-fixtures/mock-codex-exec.sh` | Stub Codex executable for deterministic runner contract tests | ~60 |
| `batch/test-fixtures/worker-result-completed.json` | Fixture for full success contract validation | ~20 |
| `batch/test-fixtures/worker-result-partial.json` | Fixture for degraded-artifact contract validation | ~20 |
| `batch/test-fixtures/worker-result-failed.json` | Fixture for semantic failure contract validation | ~20 |
| `scripts/test-batch-runner-contract.mjs` | Regression harness for CLI args, schema wiring, and result-file behavior | ~180 |
| `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` | Contract decisions, test evidence, and Session 02 handoff notes | ~80 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `batch/batch-runner.sh` | Replace Claude worker invocation with Codex contract plumbing, explicit result paths, and prerequisite checks | ~140 |
| `batch/batch-prompt.md` | Add minimal result-file contract instructions and placeholder usage for the worker | ~40 |
| `scripts/test-all.mjs` | Add the batch runner contract harness to the quick regression surface | ~20 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `batch/batch-runner.sh` invokes `codex exec` with repo-root execution,
      result-file handoff, and no remaining `claude -p` dependency
- [ ] `batch/batch-prompt.md` accepts a result-file placeholder and instructs
      the worker to produce schema-conformant final JSON
- [ ] `batch/worker-result.schema.json` defines the required fields and status
      enum for `completed`, `partial`, and `failed` outcomes
- [ ] A checked-in regression harness can stub `codex exec` and assert CLI
      arguments, schema wiring, and result-file capture behavior
- [ ] Session notes capture the contract decisions and the exact Session 02
      follow-up needed to make structured results authoritative

### Testing Requirements

- [ ] `bash -n batch/batch-runner.sh` passes after the runner edits
- [ ] Contract tests cover completed, partial, failed, and non-zero `codex`
      exit cases with local fixtures
- [ ] `node scripts/test-all.mjs --quick` passes with the new batch contract
      coverage
- [ ] Manual dry-run with a stub `codex` executable confirms lock, temp-file,
      log, and result-file behavior

### Non-Functional Requirements

- [ ] Existing lock, retry, report-number, and tracker-merge behavior remains
      intact while only the worker contract boundary changes
- [ ] Contract assets stay batch-owned and reusable by Session 02 and
      Session 03
- [ ] No new PII, secrets, or telemetry surfaces are introduced in logs,
      schema files, or fixtures

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- `batch/batch-runner.sh` currently reserves report numbers, updates state,
  and merges tracker additions correctly; the migration should not disturb that
  orchestration logic.
- The current runner extracts `score` by regex from worker logs. Session 01
  should define and plumb the structured result contract without collapsing
  Session 02's state-mapping scope into this implementation.
- `batch/batch-prompt.md` already emits a final JSON summary to stdout. That
  behavior should be adapted into an explicit result-file contract rather than
  rewritten broadly.
- Batch docs and architecture updates are deferred, so any wording edits here
  must stay strictly tied to implementation needs.

### Potential Challenges

- Avoiding scope creep from contract wiring into full downstream result
  interpretation
- Keeping per-offer temp, prompt, log, and result paths collision-safe under
  retry and parallel execution
- Preventing drift between the prompt instructions, checked-in schema, and
  regression harness expectations

### Relevant Considerations

- [P00] **Residual legacy references**: Keep broader batch-runtime wording
  cleanup out of this session unless it blocks the worker contract.
- [P00] **Validator surface drift**: Recheck contract changes against the
  repo's regression surface as soon as the runner path changes.
- [P01] **Deferred runtime-reference cleanup**: Limit this work to the batch
  runtime boundary and leave general wording cleanup for later phases.
- [P00] **No data collection surface**: Preserve the current no-PII,
  no-secrets baseline in logs, fixtures, and result schema content.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  live docs as the authoritative runtime sources while implementing the batch
  contract.
- [P00] **Explicit deferral ledger**: Record any remaining result-handling
  gaps in session notes so Session 02 starts with a clean handoff.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Runner records success after a zero exit code even when the result file is
  missing, empty, or schema-invalid
- Parallel or retried offers reuse stale temp, prompt, or result paths and
  cross-contaminate artifacts
- Prompt, schema, and harness expectations drift so later sessions cannot rely
  on the contract boundary that Session 01 establishes

---

## 9. Testing Strategy

### Unit Tests

- Validate completed, partial, and failed worker-result fixtures against the
  checked-in schema through the contract harness
- Assert runner argument construction and repo-root path resolution with a
  stubbed `codex` executable

### Integration Tests

- Run the batch contract harness against success, degraded-artifact, semantic
  failure, and non-zero CLI exit cases
- Run `bash -n batch/batch-runner.sh`
- Run `node scripts/test-all.mjs --quick`

### Manual Testing

- Execute a dry-run plus a stubbed single-offer worker flow from the repo root
  and confirm logs, result files, and resolved prompts land in the expected
  per-offer paths
- Review the session notes and confirm the remaining state-mapping work is
  explicitly handed to Session 02 rather than implemented implicitly here

### Edge Cases

- `codex exec` exits `0` but the expected result file is missing or empty
- Worker returns `partial` or `failed` with missing secondary artifacts
- Parallel workers create overlapping temp filenames or reuse stale resolved
  prompts
- `codex` is missing from `PATH` and the runner must fail fast with a precise
  prerequisite error

---

## 10. Dependencies

### External Libraries

- None new; use existing Bash, Node.js, and Codex CLI capabilities

### Other Sessions

- **Depends on**:
  `phase01-session04-docs-surface-validation-and-phase-closeout`
- **Depended by**:
  `phase02-session02-structured-batch-result-handling` directly, with
  `phase02-session03-batch-runtime-docs-alignment` and
  `phase02-session04-batch-flow-validation-and-closeout` relying on the same
  contract surface transitively

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
