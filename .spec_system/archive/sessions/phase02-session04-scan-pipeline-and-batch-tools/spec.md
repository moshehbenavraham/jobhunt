# Session Specification

**Session ID**: `phase02-session04-scan-pipeline-and-batch-tools`
**Phase**: 02 - Typed Tools and Agent Orchestration
**Status**: Not Started
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 02 Session 03 delivered the first typed evaluation, PDF, report, and
tracker surfaces, but the longer-lived repo workflows still sit outside the app
runtime. Portal scanning still depends on `scripts/scan.mjs`, liveness checks
still depend on Playwright-only script entrypoints, `data/pipeline.md`
processing remains a manual mode flow, and batch execution is still described
by `batch/README-batch.md` plus repo-owned runner semantics rather than
app-owned orchestration.

This session adds the async workflow bridge in `apps/api`. The backend should
gain typed tools that can start or inspect scan, pipeline, and batch work, plus
durable executor definitions that reuse the Phase 01 approval, checkpoint,
retry, and observability runtime instead of requiring shell-first operator
entrypoints. Liveness verification stays typed and short-lived, while the
longer scan, pipeline, and batch flows move behind durable job boundaries.

This is the correct next session because Session 05 explicitly depends on these
async workflow primitives before the router and specialist topology can compose
them. The deterministic project state also shows Session 04 as the first
unfinished candidate in Phase 02, while Session 05 is blocked until this
session lands.

---

## 2. Objectives

1. Expose typed backend tools for liveness checks plus durable-job enqueue
   surfaces for scan, pipeline-processing, and batch-evaluation workflows.
2. Add shared async workflow payload and result contracts that preserve repo
   semantics for progress, warnings, retries, and partial failures.
3. Register default durable job executors for scan, pipeline, and batch work
   so the API runtime can resume long-running workflows through the Phase 01
   job runner.
4. Validate checkpoint resume, partial-failure handling, and default runtime
   registration so Session 05 can compose these workflows without reintroducing
   shell-first orchestration.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session04-durable-job-runner` - provides queueing, claims,
      checkpoints, retries, and resumable execution for async work.
- [x] `phase01-session05-approval-and-observability-contract` - provides
      approval pauses and metadata-only runtime event recording for long-lived
      jobs.
- [x] `phase02-session01-tool-registry-and-execution-policy` - provides typed
      tool registration, permission enforcement, and script-dispatch policy.
- [x] `phase02-session02-workspace-and-startup-tool-suite` - provides workspace
      summaries and the default tool-suite wiring pattern this session extends.
- [x] `phase02-session03-evaluation-pdf-and-tracker-tools` - provides the
      typed evaluation, PDF, report, and tracker helpers that pipeline and
      batch orchestration will reuse.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for ESM, deterministic CLI behavior, and test
  expectations
- `.spec_system/CONSIDERATIONS.md` for registry-first contracts, workspace
  boundary reuse, and validator-first closeout
- `modes/scan.md` and `modes/pipeline.md` for the live scan and pipeline
  behavior contracts
- `scripts/scan.mjs`, `scripts/check-liveness.mjs`, and
  `scripts/cv-sync-check.mjs` as the existing deterministic async helpers
- `batch/README-batch.md` for batch status semantics, retry behavior, and
  closeout expectations
- `docs/WORKFLOW_CHECKLIST.md` and `docs/SCRIPTS.md` for repo-owned flow and
  maintenance expectations

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- Playwright Chromium available through the repo dependency stack for liveness
  verification
- `apps/api` build, tools, job-runner, and runtime tests runnable from the repo
  root
- Fixture-friendly temp workspaces available for `data/pipeline.md`,
  `data/scan-history.tsv`, tracker additions, and batch-input state simulation

---

## 4. Scope

### In Scope (MVP)

- Backend tools can run typed liveness checks against one or more job URLs and
  return deterministic `active`, `expired`, or `uncertain` summaries.
- Backend tools can enqueue durable scan, pipeline-processing, and
  batch-evaluation jobs without exposing raw shell entrypoints to later phases.
- Durable scan, pipeline, and batch executors can checkpoint progress, resume
  from saved state, and classify warnings or partial failures deterministically.
- Pipeline and batch executors can reuse Session 03 evaluation, PDF, and
  tracker helpers instead of duplicating artifact or tracker logic.
- The shared API service container exposes the Session 04 tools, scripts, and
  default workflow executors by default.

### Out of Scope (Deferred)

- Scan review, batch dashboards, or operator-facing workflow UI - _Reason:
  later UX phases own those surfaces._
- Router or specialist-agent workflow selection - _Reason: Session 05 owns the
  orchestration layer above these primitives._
- Rewriting `scripts/scan.mjs`, `scripts/check-liveness.mjs`, or the batch
  worker prompt from scratch - _Reason: this session wraps existing repo-owned
  behavior instead of replacing it._
- Full parity for every specialist workflow beyond the shared async primitives
  needed by later phases - _Reason: those workflows remain in later phases._

---

## 5. Technical Approach

### Architecture

Add a shared async workflow contract in `apps/api` that defines payloads and
result envelopes for `scan-portals`, `process-pipeline`, and
`batch-evaluation` jobs. Extend the tool execution service so selected tools
can enqueue durable jobs through the existing Phase 01 runner while keeping the
tool permission model, observability, and duplicate-invocation protection
intact.

Create short-lived liveness tools that wrap the checked-in Playwright script
through the allowlisted script adapter. For longer workflows, create typed
enqueue tools rather than direct script-dispatch tools. The scan tool should
enqueue a durable scan job. The pipeline tool should normalize queue-selection
input and enqueue a durable pipeline-processing job that reuses Session 03
evaluation, PDF, and tracker helpers. The batch tool should preserve the batch
status model from `batch/README-batch.md`, but implement it on top of durable
job checkpoints and structured per-item summaries rather than reusing
`batch-runner.sh` as the app runtime.

Default workflow executors should live in the job-runner package and be
registered by the shared service container. Use lazy dependency injection so
tools can obtain the durable job runner while workflow executors can resolve
the shared tool service at execution time without creating an eager startup
cycle. Scan jobs may wrap `scripts/scan.mjs` directly, but pipeline and batch
executors should checkpoint progress after each logical unit of work and record
metadata-only summaries instead of persisting raw prompt or report contents.

### Design Patterns

- Enqueue-not-execute tools: long-running workflows expose typed enqueue
  surfaces, while durable executors own the real work.
- Lazy cross-service resolution: resolve tool and job-runner dependencies only
  when a job executes so the service container stays acyclic.
- Contract reuse over duplicate logic: reuse Session 03 tool helpers and the
  existing batch status contract instead of inventing parallel artifact flows.
- Checkpointed cursors: scan, pipeline, and batch jobs persist cursor and
  completed-step state after each durable unit of progress.
- Metadata-only observability: warnings, result summaries, and failure
  categories are persisted without storing raw JD, prompt, or report contents.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing `zod` dependency for tool, payload, and result schemas
- Existing durable job runner, approval runtime, and observability services
- Existing workspace adapter and Session 03 tool surfaces
- Existing repo-owned `scripts/scan.mjs`, `scripts/check-liveness.mjs`, and
  `scripts/cv-sync-check.mjs`

---

## 6. Deliverables

### Files to Create

| File                                                     | Purpose                                                                              | Est. Lines |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| `apps/api/src/job-runner/workflow-job-contract.ts`       | Define shared payload and result schemas for scan, pipeline, and batch durable jobs  | ~180       |
| `apps/api/src/job-runner/workflow-job-executors.ts`      | Define default durable executors for scan, pipeline, and batch workflows             | ~340       |
| `apps/api/src/job-runner/workflow-job-executors.test.ts` | Cover checkpoint resume, partial failures, and status mapping for workflow executors | ~280       |
| `apps/api/src/tools/liveness-check-tools.ts`             | Define typed liveness-check tools backed by the Playwright script adapter            | ~160       |
| `apps/api/src/tools/liveness-check-tools.test.ts`        | Cover typed liveness summaries, validation, and script error mapping                 | ~160       |
| `apps/api/src/tools/scan-workflow-tools.ts`              | Define scan-job enqueue tools and scan request normalization                         | ~180       |
| `apps/api/src/tools/scan-workflow-tools.test.ts`         | Cover scan enqueue, duplicate protection, and request validation                     | ~170       |
| `apps/api/src/tools/pipeline-processing-tools.ts`        | Define pipeline-processing enqueue tools and queue-selection normalization           | ~200       |
| `apps/api/src/tools/pipeline-processing-tools.test.ts`   | Cover pipeline enqueue input validation and queue-selection behavior                 | ~180       |
| `apps/api/src/tools/batch-workflow-tools.ts`             | Define batch-orchestration enqueue tools and status-policy normalization             | ~220       |
| `apps/api/src/tools/batch-workflow-tools.test.ts`        | Cover batch dry-run, retry selection, and deterministic status mapping               | ~200       |

### Files to Modify

| File                                             | Changes                                                                                                    | Est. Lines |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/tools/tool-contract.ts`            | Add durable-job enqueue support to the tool execution context and result typing                            | ~80        |
| `apps/api/src/tools/tool-execution-service.ts`   | Wire durable-job enqueue behavior, correlation reuse, and async workflow observability into tool execution | ~160       |
| `apps/api/src/tools/default-tool-scripts.ts`     | Add allowlisted scan, liveness, and pipeline-support script definitions                                    | ~60        |
| `apps/api/src/tools/default-tool-suite.ts`       | Register Session 04 tool modules and provide durable-job enqueue dependencies                              | ~40        |
| `apps/api/src/tools/index.ts`                    | Export Session 04 tool modules                                                                             | ~20        |
| `apps/api/src/tools/test-utils.ts`               | Extend tool harness support for durable-job-aware tool tests                                               | ~60        |
| `apps/api/src/job-runner/index.ts`               | Export Session 04 workflow job contracts and executors                                                     | ~20        |
| `apps/api/src/runtime/service-container.ts`      | Merge default workflow executors into the shared job runner and pass runner access into tools              | ~100       |
| `apps/api/src/runtime/service-container.test.ts` | Verify default Session 04 tool and executor registration plus lazy dependency reuse                        | ~150       |
| `apps/api/README_api.md`                         | Document async workflow tools, executor boundaries, and validation commands                                | ~80        |
| `scripts/test-all.mjs`                           | Add Session 04 file coverage to the repo quick suite and ASCII guardrails                                  | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Backend tools can return typed liveness summaries for one or more job
      URLs without exposing raw Playwright script output.
- [ ] Backend tools can enqueue durable scan, pipeline-processing, and
      batch-evaluation jobs with deterministic payload validation.
- [ ] Durable scan, pipeline, and batch executors can checkpoint progress and
      resume from saved cursor state.
- [ ] Pipeline and batch execution preserve report, PDF, tracker, warning, and
      partial-failure semantics expected by the repo contract.
- [ ] The shared API runtime exposes the Session 04 tool catalog and default
      workflow executors without custom container wiring.

### Testing Requirements

- [ ] Tool tests cover liveness validation, scan enqueue, pipeline queue
      selection, and batch dry-run or retry argument handling.
- [ ] Job-runner tests cover checkpoint resume, duplicate execution
      protection, partial failures, and deterministic result status mapping for
      scan, pipeline, and batch jobs.
- [ ] Runtime tests verify the default Session 04 tools and default workflow
      executors are available through the shared service container.
- [ ] `npm run app:api:test:tools`, `npm run app:api:test:job-runner`,
      `npm run app:api:test:runtime`, `npm run app:api:build`,
      `npm run app:boot:test`, and `node scripts/test-all.mjs --quick` pass
      after integration.

### Non-Functional Requirements

- [ ] Async workflow tools do not allow arbitrary script execution or
      unrestricted repo mutation.
- [ ] Long-running workflow state remains resumable and free of duplicate
      job-enqueue drift.
- [ ] Observability remains metadata-only and does not persist raw prompt,
      report, or JD content.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] All new tool and executor modules have direct test coverage
- [ ] `scripts/test-all.mjs --quick` covers the new Session 04 files

---

## 8. Implementation Notes

### Key Considerations

- `batch/README-batch.md` is the live batch contract path in this repo; do not
  plan against the stale `batch/README.md` path.
- `scripts/check-liveness.mjs` is intentionally sequential because Playwright
  should not run in parallel here; any batched liveness tool or executor should
  preserve that constraint.
- Pipeline processing must keep the repo rule that tracker writes happen via
  staged TSV additions plus explicit merge and verify closeout.
- The shared service container currently creates tools and the job runner
  independently; Session 04 must avoid an eager cycle while still letting tools
  enqueue jobs and executors reuse typed workflow helpers.

### Potential Challenges

- Tool and job-runner dependency loop: mitigate with lazy getters and factory
  injection instead of direct eager construction.
- Partial workflow failures leaving mixed repo state: mitigate with staged
  tracker writes, reservation-aware report handling, and per-item checkpoints.
- Duplicate async launches for the same queue or batch scope: mitigate with
  deterministic job ids plus in-flight correlation checks.

### Relevant Considerations

- [P00-apps/api] **Workspace registry coupling**: Scan, pipeline, and tracker
  paths should continue to resolve through the existing workspace contract
  instead of ad hoc path logic.
- [P00] **Canonical live surface**: Reuse the checked-in scripts, modes, and
  batch contract as the source of truth for runtime behavior.
- [P00] **Contract reuse over parallel bootstrap logic**: Extend the shared
  tool and job runner surfaces rather than creating a second async runtime.
- [P00] **Validator-first closeout**: Session 04 should land with direct tests
  and quick-suite coverage, not follow-up validation drift.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Duplicate enqueue attempts start the same long-running workflow twice and
  create conflicting downstream artifacts.
- Partial scan, pipeline, or batch failures leave the job state resumable but
  the user-layer artifacts inconsistent.
- Liveness checks misclassify uncertain or hydration-delayed pages and cause
  premature rejection of live roles.

---

## 9. Testing Strategy

### Unit Tests

- Validate liveness tool input, script result mapping, and deterministic
  `active`, `expired`, or `uncertain` envelopes.
- Validate scan, pipeline, and batch enqueue tools for schema errors, duplicate
  request protection, and normalized payload generation.
- Validate workflow executor status mapping for `completed`, `partial`,
  `failed`, `skipped`, and retryable infrastructure cases.

### Integration Tests

- Verify the service container exposes the default Session 04 tools and default
  workflow executors in one shared runtime.
- Verify workflow executors persist checkpoints and resume from stored cursor
  state across drain cycles.
- Verify pipeline and batch executors reuse Session 03 artifact and tracker
  flows without bypassing the repo-owned closeout contract.

### Manual Testing

- Enqueue a scan job in a fixture workspace and confirm checkpointed summary
  output plus `data/pipeline.md` refresh behavior.
- Run a typed liveness check against active and inactive fixture URLs and
  inspect the summarized result envelope.
- Enqueue pipeline and batch jobs in a fixture workspace, force a mid-run
  interruption, then confirm resume behavior and structured status summaries.

### Edge Cases

- Empty `data/pipeline.md` or empty `batch/batch-input.tsv`
- Unsupported or login-gated job URLs during liveness or pipeline processing
- Retryable infrastructure failures inside batch-style per-item execution
- Pre-existing pending tracker TSVs or report reservations during resume

---

## 10. Dependencies

### External Libraries

- `zod` - existing schema validation dependency used for tool and job payloads
- Playwright - existing repo dependency used indirectly through
  `scripts/check-liveness.mjs`

### Other Sessions

- **Depends on**: `phase01-session04-durable-job-runner`,
  `phase01-session05-approval-and-observability-contract`,
  `phase02-session01-tool-registry-and-execution-policy`,
  `phase02-session02-workspace-and-startup-tool-suite`,
  `phase02-session03-evaluation-pdf-and-tracker-tools`
- **Depended by**: `phase02-session05-router-and-specialist-agent-topology`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
