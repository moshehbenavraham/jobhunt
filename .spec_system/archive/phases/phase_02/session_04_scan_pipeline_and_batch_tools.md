# Session 04: Scan, Pipeline, and Batch Tools

**Session ID**: `phase02-session04-scan-pipeline-and-batch-tools`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~15
**Estimated Duration**: 2-4 hours

---

## Objective

Wrap the async scan, pipeline-processing, and batch-execution flows as durable
typed tools and job executors so the app can run long-lived workflow work
through the Phase 01 runtime instead of legacy shell-heavy entrypoints.

---

## Scope

### In Scope (MVP)

- Add typed tools for portal scan, pipeline processing, liveness-aware URL
  checks, and batch-evaluation orchestration
- Register durable job executors and result shapes for scan and batch work that
  can emit structured progress, warnings, and failure summaries
- Reuse approval, checkpoint, retry, and observability services from Phase 01
  instead of inventing separate async behavior
- Add validation coverage for partial failures, retry-safe resumability, and
  deterministic batch or scan output contracts

### Out of Scope

- Scan review or batch operator UI
- Specialist workflows beyond the shared primitives needed by later phases
- End-user conversation or routing logic

---

## Prerequisites

- [ ] Session 01 tool registry and execution policy completed
- [ ] Session 03 evaluation, PDF, and tracker tools completed

---

## Deliverables

1. Typed scan, pipeline, and batch tool wrappers with durable job integration
2. Async result and progress contracts aligned with approval and observability
   surfaces
3. Validation coverage for resumable scan and batch execution paths

---

## Success Criteria

- [ ] Long-running scan and batch actions can be launched through typed backend
      tools and durable executors
- [ ] Retries, approvals, and structured diagnostics remain aligned with the
      existing runtime contracts
- [ ] Later async UX work can consume these flows without reintroducing
      shell-first orchestration
