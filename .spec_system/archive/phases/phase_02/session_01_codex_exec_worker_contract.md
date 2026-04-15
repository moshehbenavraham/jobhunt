# Session 01: Codex Exec Worker Contract

**Session ID**: `phase02-session01-codex-exec-worker-contract`
**Status**: Complete
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours

---

## Objective

Replace the batch runner's worker-launch path with a Codex-native
`codex exec` contract that is ready for downstream result handling.

---

## Scope

### In Scope (MVP)

- Update `batch/batch-runner.sh` to require `codex` instead of `claude`
- Define the runner-side `codex exec` invocation, including repo root
  execution, prompt plumbing, and structured result-file output
- Create any batch-owned schema or helper assets needed to make the worker
  contract explicit and reusable

### Out of Scope

- Downstream batch-state interpretation of semantic worker outcomes
- Broad docs rewrites beyond the minimum needed to support implementation
- General prompt and mode wording cleanup owned by Phase 03

---

## Prerequisites

- [x] Phase 01 completed
- [x] Phase 02 session stubs reviewed and accepted

---

## Deliverables

1. Updated batch worker invocation path in `batch/batch-runner.sh`
2. Explicit structured output contract assets for batch workers
3. A runner foundation that can hand structured results to downstream logic

---

## Success Criteria

- [x] The standalone runner invokes `codex exec` with the required repo-root
      and result-file options
- [x] The worker output contract is defined in a checked-in, batch-owned
      artifact rather than being implied by logs
- [x] No `claude -p` dependency remains in the runner's execution path
