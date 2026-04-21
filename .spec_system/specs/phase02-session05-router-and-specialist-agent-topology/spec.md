# Session Specification

**Session ID**: `phase02-session05-router-and-specialist-agent-topology`
**Phase**: 02 - Typed Tools and Agent Orchestration
**Status**: Not Started
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 02 Sessions 01 through 04 established the backend primitives the local
app needs: a typed tool registry, startup and workspace inspection surfaces,
typed evaluation and artifact tools, and durable scan, pipeline, and batch
executors. What is still missing is the backend-owned orchestration layer that
decides which workflow to run, which specialist should own it, which prompt
bundle to load, and which typed tools are visible for that specialist.

Today the API package can bootstrap prompts and execute tools, but those
surfaces are still separate. `agent-runtime-service.ts` can bootstrap any
workflow, `tool-registry.ts` can list every registered tool, and the durable
job runner can execute async workflows, yet there is no single service that
turns a new or resumed session into a deterministic specialist handoff. The
only workflow bootstrap tools currently exposed are the evaluation entrypoints,
which is not enough for the later chat, onboarding, and approvals UX work.

This session adds that missing orchestration surface in `apps/api`. The result
should be a typed router and specialist catalog that can create or resume a
runtime session, bootstrap the correct prompt bundle, return a bounded tool
catalog, and surface active job or approval state through one backend-owned
contract. That is the last missing Phase 02 layer before Phase 03 can build UI
on top of a stable backend orchestration surface.

---

## 2. Objectives

1. Define typed orchestration contracts for workflow routing, specialist
   identity, session launch or resume, and backend handoff envelopes.
2. Implement a workflow router and initial specialist catalog for evaluation,
   scan, tracker, application-help or research, and batch-supervision work.
3. Add an orchestration service that creates or resumes runtime sessions,
   bootstraps prompt bundles, filters tool visibility, and reports active job
   or approval state through one deterministic backend contract.
4. Validate routing, tool scoping, session reuse, service-container wiring,
   and deterministic tooling-gap behavior for partially implemented workflows.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session03-agent-runtime-bootstrap` - provides typed prompt and
      auth bootstrap for any supported workflow.
- [x] `phase01-session04-durable-job-runner` - provides session, job,
      checkpoint, and resume primitives for long-running work.
- [x] `phase01-session05-approval-and-observability-contract` - provides
      approval state and metadata-only runtime events for paused work.
- [x] `phase02-session01-tool-registry-and-execution-policy` - provides typed
      tool registration, policy enforcement, and deterministic catalog order.
- [x] `phase02-session02-workspace-and-startup-tool-suite` - provides the
      shared runtime-container and default tool-suite wiring pattern.
- [x] `phase02-session03-evaluation-pdf-and-tracker-tools` - provides typed
      evaluation, PDF, report, and tracker helpers for specialist routing.
- [x] `phase02-session04-scan-pipeline-and-batch-tools` - provides async
      workflow tools and durable executors the router will compose.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for ESM structure, deterministic tests, and
  runtime-neutral contracts
- `.spec_system/CONSIDERATIONS.md` for registry-first contracts and reuse over
  parallel orchestration logic
- `apps/api/src/prompt/workflow-mode-map.ts` for the supported workflow-intent
  surface the router must respect
- `apps/api/src/agent-runtime/agent-runtime-service.ts` for prompt bootstrap
  behavior and workflow readiness semantics
- `apps/api/src/tools/tool-registry.ts` and `apps/api/src/tools/tool-contract.ts`
  for deterministic tool catalog behavior
- `apps/api/src/store/session-repository.ts` plus the job and approval store
  contracts for create-or-resume session behavior
- `modes/auto-pipeline.md`, `modes/oferta.md`, `modes/scan.md`,
  `modes/tracker.md`, `modes/apply.md`, `modes/deep.md`, and `modes/batch.md`
  as the source prompt surfaces for the initial specialist boundaries

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- `apps/api` build and test commands runnable from the repo root
- Fixture-friendly operational-store workspaces available for session, job,
  and approval resume testing
- Stored OpenAI auth not required for most tests, but orchestration fixtures
  must be able to stub agent-runtime bootstrap results deterministically

---

## 4. Scope

### In Scope (MVP)

- Backend callers can request a new workflow session or resume an existing
  session and receive a typed orchestration envelope.
- Workflow routing is explicit and deterministic, based on supported workflow
  intents, stored session state, and a checked-in specialist catalog.
- Specialist definitions expose only the typed tools they are explicitly
  allowed to use, with deterministic failure when a catalog references a
  missing tool.
- Orchestration responses include prompt bootstrap metadata, bounded tool
  catalog entries, and active job or approval summaries for later UX phases.
- Workflows whose prompt bundles exist but whose typed tool paths are not ready
  can return a deterministic `tooling-gap` or equivalent blocked state rather
  than silently improvising.
- The shared API service container exposes the new orchestration service by
  default so later phases do not assemble their own router stack.

### Out of Scope (Deferred)

- Web chat transport, streaming responses, or message persistence - _Reason:
  Phase 03 owns operator-facing conversation UX._
- Full specialist parity for interview prep, training review, project review,
  follow-up, rejection patterns, or LinkedIn outreach - _Reason: those
  workflows are later-phase feature work beyond the first orchestration layer._
- Autonomous multi-agent execution or background model loops - _Reason: this
  session defines deterministic routing and handoff contracts, not free-form
  agent concurrency._
- New repo scripts or prompt rewrites - _Reason: the router must reuse the
  existing repo-owned prompts, tools, and workflow executors as source of
  truth._

---

## 5. Technical Approach

### Architecture

Create a new `apps/api/src/orchestration/` module that owns typed routing and
specialist selection. `orchestration-contract.ts` should define request and
response envelopes, specialist identifiers, route status enums, and the
session-handoff payload returned to later UX phases. `specialist-catalog.ts`
should define the initial specialist boundaries and the allowed tool names for
each specialist. `tool-scope.ts` should turn those tool-name allowlists into a
deterministic filtered tool catalog while failing fast if the catalog drifts.

`workflow-router.ts` should accept either an explicit workflow request or a
resume request, resolve the effective workflow, inspect any stored session
state, and map the request to one specialist. `session-lifecycle.ts` should
own the create-or-resume behavior against the operational store so the router
does not duplicate session persistence logic. `orchestration-service.ts`
should then compose the router, session lifecycle helper, agent runtime
bootstrap, and filtered tool catalog into a single backend-owned orchestration
surface.

The orchestration service must stay lazy and container-friendly. It should use
the existing service container for agent runtime, tool execution, approval, and
job-runner dependencies instead of creating a second boot path. Orchestration
may pass prompt bundles and tool catalogs back to the in-memory caller, but it
must not persist raw prompt text in runtime events or store records. When a
workflow is known but its typed tool surface is not yet implemented, the
service should return a deterministic blocked result instead of routing to
free-form shell behavior.

### Design Patterns

- Catalog-driven routing: specialist and workflow mappings live in checked-in
  code, not model-side prompt branching.
- Resume-first session lifecycle: reuse existing runtime sessions before
  allocating new ones, and surface active state instead of duplicating work.
- Specialist-scoped tool visibility: tool access is reduced to an allowlisted
  filtered catalog before the UX layer sees it.
- Deterministic blocked states: partially implemented workflows return typed
  `tooling-gap` style outcomes instead of ad hoc errors or hidden fallbacks.
- Lazy service composition: orchestration resolves runtime services only when
  used so the service container stays acyclic.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing `zod` dependency for route and envelope schemas
- Existing agent runtime bootstrap service and prompt loader
- Existing tool registry and tool execution contracts
- Existing operational store, approval runtime, and durable job runner

---

## 6. Deliverables

### Files to Create

| File                                                       | Purpose                                                                             | Est. Lines |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/orchestration/orchestration-contract.ts`     | Define typed specialist, route, session-launch, and handoff envelopes               | ~220       |
| `apps/api/src/orchestration/specialist-catalog.ts`         | Define the initial specialist topology and workflow-to-specialist mapping           | ~180       |
| `apps/api/src/orchestration/tool-scope.ts`                 | Filter and validate specialist-scoped tool catalogs from the shared registry        | ~120       |
| `apps/api/src/orchestration/workflow-router.ts`            | Resolve requested workflow or resume state into a deterministic route decision      | ~220       |
| `apps/api/src/orchestration/session-lifecycle.ts`          | Create or resume runtime sessions and summarize persisted state                     | ~180       |
| `apps/api/src/orchestration/orchestration-service.ts`      | Compose routing, prompt bootstrap, tool scoping, and session state into one service | ~320       |
| `apps/api/src/orchestration/index.ts`                      | Export the orchestration module surface                                             | ~40        |
| `apps/api/src/orchestration/specialist-catalog.test.ts`    | Verify specialist definitions and workflow coverage                                 | ~140       |
| `apps/api/src/orchestration/tool-scope.test.ts`            | Verify bounded tool filtering and drift detection                                   | ~140       |
| `apps/api/src/orchestration/workflow-router.test.ts`       | Verify routing, resume precedence, and blocked-state classification                 | ~220       |
| `apps/api/src/orchestration/session-lifecycle.test.ts`     | Verify session creation, reuse, and stored-state summarization                      | ~180       |
| `apps/api/src/orchestration/orchestration-service.test.ts` | Verify end-to-end orchestration envelopes and filtered specialist handoff data      | ~280       |

### Files to Modify

| File                                             | Changes                                                                                       | Est. Lines |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/runtime/service-container.ts`      | Lazily create and expose the shared orchestration service using existing runtime dependencies | ~120       |
| `apps/api/src/runtime/service-container.test.ts` | Verify default orchestration registration and reuse through the container                     | ~180       |
| `apps/api/src/tools/tool-contract.ts`            | Extend the registry contract with specialist-scoped catalog access helpers                    | ~40        |
| `apps/api/src/tools/tool-registry.ts`            | Implement deterministic catalog filtering and missing-tool validation                         | ~80        |
| `apps/api/src/tools/tool-registry.test.ts`       | Cover filtered catalog ordering and unknown-tool rejection                                    | ~100       |
| `apps/api/package.json`                          | Include orchestration tests in the API validation commands                                    | ~20        |
| `apps/api/README_api.md`                         | Document the router, specialist topology, and orchestration-service boundaries                | ~90        |
| `scripts/test-all.mjs`                           | Add Session 05 file coverage and orchestration validation to the quick suite                  | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Backend callers can start or resume a runtime session through one typed
      orchestration service instead of manually combining prompt, tool, and
      session helpers.
- [ ] Supported workflow intents map to explicit specialist ids and bounded
      tool catalogs.
- [ ] Specialist-scoped tool catalogs reject unknown tool references and
      preserve deterministic ordering.
- [ ] Resume requests surface active job, waiting approval, or completed-state
      summaries without creating duplicate sessions.
- [ ] Workflows with prompt support but missing typed tooling return a
      deterministic blocked status rather than ad hoc execution behavior.
- [ ] The shared API runtime exposes the orchestration service by default for
      later UX phases.

### Testing Requirements

- [ ] Specialist catalog and tool-scope tests cover workflow coverage, allowed
      tool filtering, and missing-tool drift.
- [ ] Router tests cover explicit workflow selection, resume precedence,
      unsupported workflow handling, and tooling-gap outcomes.
- [ ] Session lifecycle and orchestration service tests cover session creation,
      session reuse, active approval summaries, and filtered handoff envelopes.
- [ ] Runtime tests verify the service container exposes and reuses the default
      orchestration service.
- [ ] `npm run app:api:test:tools`, `npm run app:api:test:runtime`,
      `npm run app:api:build`, and `node scripts/test-all.mjs --quick` pass
      after integration.

### Non-Functional Requirements

- [ ] Orchestration decisions remain deterministic from stored state and
      explicit request input, without free-form tool discovery.
- [ ] Tool visibility stays bounded to the selected specialist definition.
- [ ] Raw prompt text is not persisted in runtime events or store records.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] All new orchestration modules have direct test coverage
- [ ] `scripts/test-all.mjs --quick` covers the new Session 05 files

---

## 8. Implementation Notes

### Key Considerations

- `agent-runtime-service.ts` already bootstraps any supported workflow; Session
  05 should reuse that surface instead of creating another prompt bootstrap
  path.
- The tool registry is already the canonical catalog source. Specialist tool
  scoping should derive from it instead of copying tool metadata into a second
  registry.
- Runtime sessions already exist in the operational store and are updated by
  the durable job runner. Orchestration should create or resume those records,
  not invent parallel session state.
- Some workflows already have prompt routes but do not yet have typed tool
  coverage. The orchestration layer must expose that gap explicitly.

### Potential Challenges

- Orchestration dependency cycles between the service container, agent runtime,
  tool registry, approval runtime, and job runner: mitigate with lazy factory
  injection and small helper modules.
- Resume requests against stale or partially complete session state: mitigate
  with session lifecycle helpers that derive state from persisted jobs and
  approvals before choosing a handoff.
- Specialist catalogs drifting from the live tool registry: mitigate with
  strict validation that fails tests when a specialist references an
  unregistered tool name.

### Relevant Considerations

- [P00-apps/api] **Workspace registry coupling**: Keep orchestration attached
  to the existing workspace, prompt, and tool contracts rather than ad hoc path
  logic.
- [P00] **Canonical live surface**: Reuse the checked-in mode files and typed
  tool surfaces as the source of truth for workflow behavior.
- [P00] **Registry-first contracts**: Tool visibility and workflow routing
  should derive from checked-in registries and catalogs, not duplicated lists.
- [P00] **Contract reuse over parallel bootstrap logic**: Extend the existing
  agent runtime and service container instead of introducing a second runtime.
- [P00] **Validator-first closeout**: Session 05 should land with direct
  orchestration tests and quick-suite coverage, not follow-up drift.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- A specialist receives tools outside its intended boundary and can trigger
  the wrong workflow side effects.
- Resume orchestration creates a duplicate session or duplicate background job
  instead of surfacing the persisted in-flight state.
- The router hides missing typed-tool support behind generic failures, causing
  later UX work to assume a workflow is supported when it is not.

---

## 9. Testing Strategy

### Unit Tests

- Validate specialist definitions, workflow coverage, and specialist-scoped
  tool filtering.
- Validate routing decisions for explicit workflow requests, resume requests,
  unsupported workflows, and deterministic blocked states.
- Validate session lifecycle behavior for new sessions, existing sessions,
  approval summaries, and active-job summarization.

### Integration Tests

- Verify the service container exposes one reusable orchestration service with
  access to the agent runtime, store, and filtered tool registry.
- Verify orchestration responses preserve deterministic tool ordering and do
  not expose unregistered tools.
- Verify a resumed waiting session returns approval and job summaries without
  allocating a second session id.

### Manual Testing

- Request new orchestration envelopes for `single-evaluation`,
  `auto-pipeline`, `scan-portals`, and `batch-evaluation` in a fixture
  workspace and inspect specialist id, prompt route, and filtered tool names.
- Resume a fixture session that is waiting on approval and confirm the
  orchestration surface returns the pending approval summary instead of a new
  session.
- Request an initial specialist route for `application-help` or
  `deep-company-research` and confirm the response is deterministic about any
  current tooling gap.

### Edge Cases

- Resume request references an unknown or mismatched session id
- Specialist catalog references a tool name that is no longer registered
- Requested workflow has a prompt route but no typed tool surface yet
- Existing session is completed or failed and should not be treated as active
- Waiting approval exists without an active running job

---

## 10. Dependencies

### External Libraries

- `zod` - existing schema validation dependency used for routing and handoff
  envelopes

### Other Sessions

- **Depends on**: `phase01-session03-agent-runtime-bootstrap`,
  `phase01-session04-durable-job-runner`,
  `phase01-session05-approval-and-observability-contract`,
  `phase02-session01-tool-registry-and-execution-policy`,
  `phase02-session02-workspace-and-startup-tool-suite`,
  `phase02-session03-evaluation-pdf-and-tracker-tools`,
  `phase02-session04-scan-pipeline-and-batch-tools`
- **Depended by**: future Phase 03 chat, onboarding, and approvals UX sessions
  that need to start or resume work through one backend-owned orchestration
  surface

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
