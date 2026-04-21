# Task Checklist

**Session ID**: `phase02-session04-scan-pipeline-and-batch-tools`
**Total Tasks**: 15
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-21

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 3 | 3 | 0 |
| Foundation | 4 | 4 | 0 |
| Implementation | 4 | 4 | 0 |
| Testing | 4 | 4 | 0 |
| **Total** | **15** | **15** | **0** |

---

## Setup (3 tasks)

Async workflow tools need shared contracts, durable-job enqueue plumbing, and
default runtime registration before the concrete tool handlers can land.

### apps/api

- [x] T001 [S0204] Extend the tool execution contract with durable-job enqueue
      support and shared async workflow payload or result schemas with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/tools/tool-contract.ts`,
      `apps/api/src/tools/tool-execution-service.ts`,
      `apps/api/src/job-runner/workflow-job-contract.ts`)
- [x] T002 [S0204] Expand the default Session 04 script allowlist and tool-test
      harness for scan, liveness, and pipeline-support commands with timeout,
      retry/backoff, and failure-path handling
      (`apps/api/src/tools/default-tool-scripts.ts`,
      `apps/api/src/tools/test-utils.ts`)
- [x] T003 [S0204] Wire the Session 04 tool modules and default workflow
      executors into the shared runtime with cleanup on scope exit for all
      acquired resources (`apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/index.ts`, `apps/api/src/job-runner/index.ts`,
      `apps/api/src/runtime/service-container.ts`)

---

## Foundation (4 tasks)

Typed tool definitions for liveness, scan, pipeline, and batch entrypoints.

### apps/api

- [x] T004 [S0204] [P] Create liveness-check tools for single and batched URL
      verification with explicit loading, empty, error, and offline states
      (`apps/api/src/tools/liveness-check-tools.ts`)
- [x] T005 [S0204] Create scan workflow tools that enqueue durable portal-scan
      jobs with duplicate-trigger prevention while in-flight
      (`apps/api/src/tools/scan-workflow-tools.ts`)
- [x] T006 [S0204] Create pipeline-processing tools that normalize queue
      selection and enqueue durable processing jobs with schema-validated input
      and explicit error mapping
      (`apps/api/src/tools/pipeline-processing-tools.ts`)
- [x] T007 [S0204] Create batch-workflow tools for start, retry, and dry-run
      orchestration with idempotency protection, transaction boundaries, and
      compensation on failure (`apps/api/src/tools/batch-workflow-tools.ts`)

---

## Implementation (4 tasks)

Durable workflow executors and runtime integration for scan, pipeline, and
batch work.

### apps/api

- [x] T008 [S0204] Implement the scan workflow executor with checkpointed
      progress summaries and failure classification that preserves repo-owned
      scan outputs (`apps/api/src/job-runner/workflow-job-executors.ts`)
- [x] T009 [S0204] Implement the pipeline-processing executor that walks
      `data/pipeline.md` in deterministic order and reuses typed evaluation,
      PDF, and tracker helpers with authorization enforced at the boundary
      closest to the resource
      (`apps/api/src/job-runner/workflow-job-executors.ts`)
- [x] T010 [S0204] Implement the batch-evaluation executor that preserves
      `completed`, `partial`, `failed`, `skipped`, and retryable infrastructure
      semantics with state reset or revalidation on re-entry
      (`apps/api/src/job-runner/workflow-job-executors.ts`)
- [x] T011 [S0204] Update the API package guide and runtime-container coverage
      for the Session 04 async tool and executor surface
      (`apps/api/README_api.md`,
      `apps/api/src/runtime/service-container.test.ts`)

---

## Testing (4 tasks)

Verification and regression coverage for the new async workflow surfaces.

### apps/api

- [x] T012 [S0204] [P] Add liveness and scan tool tests for input validation,
      enqueue guardrails, and typed liveness summaries
      (`apps/api/src/tools/liveness-check-tools.test.ts`,
      `apps/api/src/tools/scan-workflow-tools.test.ts`)
- [x] T013 [S0204] [P] Add pipeline and batch tool tests for queue selection,
      dry-run behavior, and retry-safe job arguments with denied or restricted
      handling and fallback behavior
      (`apps/api/src/tools/pipeline-processing-tools.test.ts`,
      `apps/api/src/tools/batch-workflow-tools.test.ts`)
- [x] T014 [S0204] [P] Add durable workflow executor tests covering checkpoint
      resume, partial failures, and structured warning mapping with
      duplicate-trigger prevention while in-flight
      (`apps/api/src/job-runner/workflow-job-executors.test.ts`)

### repo root

- [x] T015 [S0204] Update quick-suite coverage and run tools, job-runner,
      runtime, build, and boot validation gates for the Session 04 deliverables
      (`scripts/test-all.mjs`, `apps/api/src/tools/`,
      `apps/api/src/job-runner/`,
      `apps/api/src/runtime/service-container.test.ts`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation. After a
successful `plansession` run, `implement` is always the next workflow command.
