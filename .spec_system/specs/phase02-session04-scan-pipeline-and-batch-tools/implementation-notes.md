# Implementation Notes

**Session ID**: `phase02-session04-scan-pipeline-and-batch-tools`
**Package**: `apps/api`
**Started**: 2026-04-21 16:30
**Last Updated**: 2026-04-21 17:11

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 15 / 15 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### 2026-04-21 - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T001 - Extend tool execution with durable-job enqueue contracts

**Started**: 2026-04-21 16:30
**Completed**: 2026-04-21 16:40
**Duration**: 10 minutes

**Notes**:

- Added a shared workflow-job contract module covering scan, pipeline, batch,
  and worker-result schemas so later tools and executors share one typed
  surface.
- Extended the tool execution context with durable-job enqueue support,
  per-tool durable-job permissions, and job-catalog metadata for future
  registry consumers.
- Updated the direct tool-test contexts to keep the stricter execution
  contract type-safe under API compile checks.

**Files Changed**:

- `apps/api/src/job-runner/workflow-job-contract.ts` - added Session 04
  payload and result schemas for async workflow jobs
- `apps/api/src/tools/tool-contract.ts` - added durable-job enqueue request,
  result, and permission types
- `apps/api/src/tools/tool-execution-service.ts` - wired durable-job enqueue
  into the tool execution context with permission checks
- `apps/api/src/tools/tool-registry.ts` - published declared durable job types
  in the tool catalog
- `apps/api/src/tools/tool-registry.test.ts` - covered deterministic job-type
  catalog output
- `apps/api/src/tools/evaluation-workflow-tools.test.ts` - aligned direct test
  contexts with the stricter tool contract
- `apps/api/src/tools/onboarding-repair-tools.test.ts` - aligned direct test
  contexts with the stricter tool contract
- `apps/api/src/tools/startup-inspection-tools.test.ts` - aligned direct test
  contexts with the stricter tool contract
- `apps/api/src/tools/workspace-discovery-tools.test.ts` - aligned direct test
  contexts with the stricter tool contract

**BQC Fixes**:

- Trust boundary enforcement: tools can now enqueue only the durable job types
  they explicitly declare in policy (`apps/api/src/tools/tool-execution-service.ts`)
- Contract alignment: scan, pipeline, batch, and worker results now share
  explicit enums and schema validation in one contract module
  (`apps/api/src/job-runner/workflow-job-contract.ts`)

### Task T002 - Expand the Session 04 script allowlist and tool harness

**Started**: 2026-04-21 16:40
**Completed**: 2026-04-21 16:44
**Duration**: 4 minutes

**Notes**:

- Added allowlisted script definitions for liveness, portal scan, and CV sync
  checks on top of the existing Session 03 maintenance scripts.
- Extended the script adapter to treat configured non-zero exit codes as
  successful, which is required for liveness checks that intentionally exit `1`
  when a URL is expired or uncertain.
- Expanded the tool harness and adapter tests so retryable exits, bounded
  timeouts, and non-zero success exits are all covered directly.

**Files Changed**:

- `apps/api/src/tools/default-tool-scripts.ts` - added Session 04 script
  definitions and cloned optional exit-code policies safely
- `apps/api/src/tools/script-execution-adapter.ts` - added configurable
  non-zero success exit handling
- `apps/api/src/tools/script-execution-adapter.test.ts` - covered non-zero
  success exits and retryable subprocess retries
- `apps/api/src/tools/test-utils.ts` - preserved richer script definition
  fields in the tool harness

**BQC Fixes**:

- External dependency resilience: script dispatch now distinguishes expected
  domain exits from genuine subprocess failures, which keeps liveness checks
  deterministic without suppressing real crashes
  (`apps/api/src/tools/script-execution-adapter.ts`)
- Failure path completeness: adapter tests now cover timeout, retry, failed,
  and non-zero-success paths explicitly
  (`apps/api/src/tools/script-execution-adapter.test.ts`)

### Tasks T003, T011, and T015 - Runtime wiring, docs, and validation closeout

**Started**: 2026-04-21 16:44
**Completed**: 2026-04-21 17:11
**Duration**: 27 minutes

**Notes**:

- Registered the Session 04 tool modules in the default tool suite, exported
  the new tool and workflow modules, and wired the shared service container so
  tools can lazily access the durable job runner while the job runner lazily
  resolves the shared tool execution service.
- Added runtime coverage proving the service container now exposes the Session
  04 tool catalog and default scan executor surface.
- Updated the API package guide and repo quick-suite ASCII coverage for the
  new async workflow contracts, tools, executors, and tests.
- Ran the requested validation gates successfully:
  `npm run app:api:test:tools`,
  `npm run app:api:test:job-runner`,
  `npm run app:api:test:runtime`,
  `npm run app:api:build`,
  `npm run app:boot:test`,
  and `node scripts/test-all.mjs --quick`.

**Files Changed**:

- `apps/api/src/tools/default-tool-suite.ts` - registered liveness, scan,
  pipeline, and batch workflow tools in the default catalog
- `apps/api/src/tools/index.ts` - exported Session 04 tool modules and the
  workflow enqueue helper
- `apps/api/src/job-runner/index.ts` - exported workflow contracts and default
  workflow executors
- `apps/api/src/runtime/service-container.ts` - merged default workflow
  executors into the durable runner and passed runner access into tool
  execution
- `apps/api/src/runtime/service-container.test.ts` - covered Session 04 tool
  availability and default scan executor registration
- `apps/api/README_api.md` - documented the async workflow tool and executor
  surface
- `scripts/test-all.mjs` - expanded quick-suite ASCII coverage for Session 04
  files

**BQC Fixes**:

- Dependency-cycle containment: the service container now uses lazy function
  injection in both directions so tools can enqueue jobs and executors can
  reuse typed tool closeout helpers without eager startup cycles
  (`apps/api/src/runtime/service-container.ts`)
- Coverage completeness: runtime and repo quick-suite checks now account for
  the Session 04 async workflow surface
  (`apps/api/src/runtime/service-container.test.ts`, `scripts/test-all.mjs`)

### Tasks T004-T010 and T012-T014 - Async tools, durable executors, and tests

**Started**: 2026-04-21 16:44
**Completed**: 2026-04-21 17:11
**Duration**: 27 minutes

**Notes**:

- Completed the liveness, scan, pipeline, and batch tool modules with durable
  enqueue behavior, queue normalization, duplicate-trigger handling, and
  typed script output mapping.
- Added the default scan, pipeline, and batch workflow executors plus direct
  job-runner tests for checkpoint resume, structured warning propagation,
  retryable infrastructure failures, and partial-result semantics.
- Fixed a re-entry bug in the pipeline and batch executors: after a saved
  checkpoint, the source queue has already been mutated, so replay must start
  from the remaining selection rather than reuse the old array index cursor.
- Reserved checkpointed report numbers during resume so reruns do not reuse a
  partially consumed report id.

**Files Changed**:

- `apps/api/src/tools/liveness-check-tools.ts` and
  `apps/api/src/tools/liveness-check-tools.test.ts` - added typed liveness
  tools and explicit ready or empty or offline or error coverage
- `apps/api/src/tools/scan-workflow-tools.ts` and
  `apps/api/src/tools/scan-workflow-tools.test.ts` - added durable scan enqueue
  tools with duplicate and rerun protections
- `apps/api/src/tools/pipeline-processing-tools.ts` and
  `apps/api/src/tools/pipeline-processing-tools.test.ts` - added queue
  normalization and durable pipeline enqueue coverage
- `apps/api/src/tools/batch-workflow-tools.ts` and
  `apps/api/src/tools/batch-workflow-tools.test.ts` - added durable batch run,
  retry, and dry-run entrypoints plus typed payload coverage
- `apps/api/src/tools/workflow-enqueue.ts` - added shared stable job-id and
  rerun enqueue helper behavior
- `apps/api/src/job-runner/workflow-job-executors.ts` - implemented the scan,
  pipeline, and batch durable executors with resume-safe cursor handling
- `apps/api/src/job-runner/workflow-job-executors.test.ts` - covered checkpoint
  resume, structured warnings, partial results, and retryable failures
- `apps/api/src/job-runner/test-utils.ts` - allowed executor factories to bind
  to the temp repo root during tests

**BQC Fixes**:

- Resume correctness: pipeline and batch execution now continue from the
  remaining queue after checkpointed re-entry instead of skipping work because
  the source list has already been mutated
  (`apps/api/src/job-runner/workflow-job-executors.ts`)
- Idempotent artifact allocation: checkpointed report numbers are now reserved
  across re-entry so partially consumed report ids are not reused
  (`apps/api/src/job-runner/workflow-job-executors.ts`)
