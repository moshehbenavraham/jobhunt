# Session Specification

**Session ID**: `phase02-session01-tool-registry-and-execution-policy`
**Phase**: 02 - Typed Tools and Agent Orchestration
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 01 finished the backend runtime, SQLite store, approval lifecycle, and
observability surfaces that later parity work depends on. Phase 02 starts by
turning that runtime into one backend-owned tool surface that can validate
inputs, enforce execution policy, and call repo logic without leaking raw
shell semantics into prompt space or future UI code.

This session creates the foundational `apps/api/src/tools/` package, a
duplicate-safe registry, a deterministic execution envelope, and the first
shared adapters for constrained script dispatch and guarded workspace
mutation. The design should reuse the existing workspace boundary,
approval-runtime, observability, and service-container contracts instead of
introducing another execution path or hidden filesystem access rules.

This is the correct next session because the authoritative analyzer reports
Phase 02 Session 01 as the first incomplete candidate in the current phase,
and every later Phase 02 stub explicitly depends on the shared tool registry
and execution policy being in place first.

---

## 2. Objectives

1. Define a typed tool contract, registry, result envelope, and error-code
   taxonomy for backend-owned tool execution in `apps/api`.
2. Create constrained script-execution and workspace-mutation adapters that
   future workflow tools can reuse without bypassing repo safety rules.
3. Add a tool execution service that validates input, applies permission and
   approval policy, emits observability events, and returns deterministic
   success or failure shapes.
4. Add package-local validation coverage, service-container wiring, and docs
   for the new backend tool surface.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session02-workspace-adapter-contract` - provides the repo
      boundary, workspace surface catalog, and guarded path classification the
      tool layer must reuse.
- [x] `phase01-session04-durable-job-runner` - provides the durable execution
      contract that later async tools will sit on top of instead of replacing.
- [x] `phase01-session05-approval-and-observability-contract` - provides the
      approval and metadata-only event services the tool layer must compose
      through.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for TypeScript structure, deterministic CLI
  behavior, and validation expectations
- `.spec_system/CONSIDERATIONS.md` for single-boundary runtime guidance and
  best-effort observability rules
- Existing runtime modules in `apps/api/src/runtime/`,
  `apps/api/src/workspace/`, `apps/api/src/approval-runtime/`, and
  `apps/api/src/observability/`
- Existing repo validation entrypoints such as `npm run app:api:build` and
  `node scripts/test-all.mjs --quick`

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- Repo scripts available under `scripts/` for allowlisted tool execution
- Local workspace access bounded to repo-relative paths and existing data
  contract rules
- Temp fixture directories available for adapter and service tests

---

## 4. Scope

### In Scope (MVP)

- Backend code can register tools with explicit names, descriptions, schemas,
  permission requirements, and handler metadata through one typed registry.
- Backend code can invoke allowlisted repo scripts through a constrained
  adapter with bounded cwd, timeout handling, and deterministic stdout or
  stderr mapping.
- Backend code can request guarded workspace mutations through a reusable
  adapter that classifies paths, enforces explicit mutation policy, and writes
  atomically.
- Tool execution can emit structured observability events and request approval
  when a tool policy requires human review before a side effect proceeds.

### Out of Scope (Deferred)

- Workflow-specific startup, evaluation, PDF, tracker, scan, or batch tools -
  _Reason: Sessions 02-04 own those tool suites._
- Router or specialist-agent orchestration - _Reason: Session 05 owns routing
  and bounded specialist topology._
- Operator-facing chat, settings, or approvals UX - _Reason: Phase 03 owns
  user-facing interaction surfaces._

---

## 5. Technical Approach

### Architecture

Add a package-local `tools` boundary under `apps/api/src/tools/`. The
boundary should expose four core pieces: a typed tool contract, a duplicate-
safe registry, a tool execution service, and reusable adapters for script
execution plus workspace mutation. Tool handlers should receive a narrow
runtime context instead of process-global helpers so later sessions can add
workflow tools without re-implementing policy, approval, or observability
plumbing.

The script adapter should wrap Node subprocess APIs behind a repo-safe
execution contract: explicit command allowlists, normalized args, repo-root
cwd, bounded environment inheritance, timeout handling, and deterministic
result mapping. The workspace mutation adapter should reuse workspace path
classification and atomic-write primitives while adding tool-oriented policy
checks for explicit mutation targets, approval hints, and conflict behavior.

The service container should lazily construct one shared tools surface,
injecting workspace, approval-runtime, and observability services. Tool
execution should record metadata-only lifecycle events, return structured
error envelopes, and avoid leaking raw shell commands or unrestricted stderr
back into callers.

### Design Patterns

- Registry-backed tool catalog: centralize tool registration, duplicate checks,
  and catalog ordering in one place.
- Boundary adapters: isolate script and workspace side effects behind typed
  contracts rather than open-coded `child_process` or filesystem calls.
- Policy-first execution: describe read, script, mutation, and approval needs
  declaratively in tool definitions.
- Deterministic error envelopes: map schema failures, denied actions, timeout
  exits, and subprocess failures onto stable backend error codes.
- Best-effort observability: record tool lifecycle metadata without blocking
  tool completion or approval handling.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing `zod` dependency for tool input validation
- Node standard library `child_process` and `fs/promises` for bounded adapter
  execution
- Existing workspace, approval-runtime, observability, and service-container
  modules in `apps/api`

---

## 6. Deliverables

### Files to Create

| File                                                   | Purpose                                                                  | Est. Lines |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | ---------- |
| `apps/api/src/tools/tool-contract.ts`                  | Define tool metadata, invocation input, result envelopes, and policy     | ~180       |
| `apps/api/src/tools/tool-errors.ts`                    | Define typed tool error classes and deterministic error-code mapping      | ~120       |
| `apps/api/src/tools/tool-registry.ts`                  | Register tools, prevent duplicates, and expose catalog helpers           | ~150       |
| `apps/api/src/tools/tool-execution-service.ts`         | Validate inputs, enforce policy, dispatch handlers, and emit events      | ~240       |
| `apps/api/src/tools/script-execution-adapter.ts`       | Wrap allowlisted subprocess execution with timeout and result mapping    | ~190       |
| `apps/api/src/tools/workspace-mutation-adapter.ts`     | Apply guarded repo-relative writes with atomic behavior and policy checks | ~190       |
| `apps/api/src/tools/index.ts`                          | Export the tools boundary                                                | ~30        |
| `apps/api/src/tools/test-utils.ts`                     | Provide shared fixtures for tool, workspace, approval, and event tests   | ~120       |
| `apps/api/src/tools/tool-registry.test.ts`             | Cover duplicate registration and catalog ordering                        | ~120       |
| `apps/api/src/tools/tool-execution-service.test.ts`    | Cover validation, permission, approval, and observability behavior      | ~220       |
| `apps/api/src/tools/script-execution-adapter.test.ts`  | Cover allowlisted subprocess behavior, timeout, and failure mapping      | ~170       |
| `apps/api/src/tools/workspace-mutation-adapter.test.ts` | Cover protected-path denial, atomic writes, and conflict handling       | ~170       |

### Files to Modify

| File                                        | Changes                                                                    | Est. Lines |
| ------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| `apps/api/src/workspace/workspace-types.ts` | Add tool-facing mutation policy and adapter input or result types          | ~80        |
| `apps/api/src/workspace/workspace-errors.ts` | Add deterministic mutation-policy denial and adapter-safe error detail    | ~70        |
| `apps/api/src/workspace/workspace-contract.ts` | Extend surface metadata and explicit mutation targets for future tools   | ~90        |
| `apps/api/src/workspace/workspace-boundary.ts` | Reuse boundary classification for tool mutation authorization checks     | ~80        |
| `apps/api/src/workspace/workspace-write.ts` | Expose reusable atomic write helpers without relaxing existing defaults    | ~90        |
| `apps/api/src/store/store-contract.ts`      | Extend runtime event typing for tool execution lifecycle events            | ~50        |
| `apps/api/src/runtime/service-container.ts` | Lazily compose the tools surface with workspace, approval, and events      | ~120       |
| `apps/api/src/runtime/service-container.test.ts` | Verify tool-service reuse, wiring, and cleanup behavior                | ~120       |
| `apps/api/package.json`                     | Add tool test and validation aliases                                       | ~20        |
| `apps/api/README_api.md`                    | Document the tools boundary, adapters, and validation path                 | ~50        |
| `package.json`                              | Add repo-root aliases for tool validation                                  | ~20        |
| `scripts/test-all.mjs`                      | Add the tool validation path to the repo quick suite                       | ~30        |

---

## 7. Success Criteria

### Functional Requirements

- [x] Tool registration is explicit, typed, duplicate-safe, and produces a
      deterministic catalog ordering.
- [x] Tool execution validates input before side effects and returns stable
      result or error envelopes for invalid input, denied actions, approval
      requirements, and subprocess failures.
- [x] Constrained adapters can run allowlisted scripts and guarded workspace
      mutations without exposing raw shell access or bypassing repo boundary
      rules.
- [x] Tool lifecycle events are observable through the existing metadata-only
      observability path.

### Testing Requirements

- [x] Package tests cover duplicate registration, schema validation,
      permission denials, approval-required flows, subprocess timeout
      handling, and guarded mutation behavior.
- [x] `npm run app:api:test:tools`, `npm run app:api:test:runtime`, and
      `npm run app:api:build` pass after integration.
- [x] `node scripts/test-all.mjs --quick` remains green after the new tool
      validation path is added.

### Non-Functional Requirements

- [x] Tool results do not expose raw shell command strings, unrestricted
      stderr, or prompt-space escape hatches.
- [x] Workspace mutations remain repo-relative, atomic, and explicitly
      authorized by policy.
- [x] Observability remains metadata-only and must not block tool execution or
      approval state transitions.

### Quality Gates

- [x] All files ASCII-encoded
- [x] Unix LF line endings
- [x] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Keep tool execution inside the existing backend runtime boundary; later
  sessions should call one shared tools surface rather than invent their own
  script or filesystem helpers.
- Preserve the current read-first workspace and startup behavior while adding
  reusable mutation primitives for later approved workflows.
- Design policy and result envelopes so future workflow tools can express
  warnings, required approvals, and deterministic failures without custom
  one-off shapes.

### Potential Challenges

- Policy drift: the tool registry, workspace mutation rules, and docs can
  diverge if policy is duplicated across helpers instead of centralized.
- Partial mutations: guarded writes must not leave temp files or half-written
  state after a timeout, rejection, or conflict path.
- Subprocess normalization: tool callers need actionable failures without
  depending on raw shell semantics or unbounded stderr passthrough.

### Relevant Considerations

- [P01] **Single runtime boundary**: keep tool selection and execution on one
  backend-owned path through the existing container.
- [P01] **Best-effort observability**: tool lifecycle events should stay
  metadata-only and must not block durable runtime work.
- [P01-apps/api] **Duplicate execution guardrails**: execution policy should
  make repeated invocations, approval retries, and in-flight duplicates safe.
- [P01] **Registry-backed routing**: explicit registries have already kept
  route and prompt behavior auditable; apply the same pattern to tools.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Duplicate tool execution while an approval or subprocess-backed mutation is
  already in flight
- Script execution escaping command, cwd, or timeout boundaries and leaking
  raw failure details into callers
- Workspace mutation flows leaving stale temp files or partially written
  content after rejection or failure

---

## 9. Testing Strategy

### Unit Tests

- Tool definition parsing, duplicate registration guards, and catalog sorting
- Tool execution result shaping for invalid input, denied actions, and
  approval-required responses
- Script adapter timeout, exit-code, and stderr normalization behavior

### Integration Tests

- Service-container composition of the tools surface with approval-runtime and
  observability services
- Workspace mutation adapter behavior against fixture repos with protected,
  allowed, and conflicting paths
- Tool lifecycle event emission and correlation through the existing
  observability service

### Manual Testing

- Register a fixture-backed read-only tool and invoke it with valid and
  invalid payloads to confirm deterministic result envelopes.
- Register a fixture-backed mutation tool that targets an allowed path, then
  verify atomic write behavior and conflict handling.
- Trigger an approval-required mutation path and verify the tool response plus
  emitted lifecycle events without hidden direct writes.

### Edge Cases

- Duplicate tool name registration at startup
- Tool input that fails schema validation before handler execution
- Allowlisted script definitions with non-zero exit codes or timeouts
- Mutation requests targeting protected, unknown, or conflicting paths
- Repeated approval-required invocations for the same pending side effect

---

## 10. Dependencies

### External Libraries

- `zod` - validate tool input payloads and return structured issue details
- Node standard library `child_process` and `fs/promises` - implement bounded
  subprocess and atomic write behavior without new runtime dependencies

### Internal Dependencies

- Workspace boundary and adapter helpers in `apps/api/src/workspace/`
- Approval-runtime and observability services in
  `apps/api/src/approval-runtime/` and `apps/api/src/observability/`
- Service-container composition in `apps/api/src/runtime/`

### Other Sessions

- **Depends on**: `phase00-session02-workspace-adapter-contract`,
  `phase01-session04-durable-job-runner`,
  `phase01-session05-approval-and-observability-contract`
- **Depended by**: `phase02-session02-workspace-and-startup-tool-suite`,
  `phase02-session03-evaluation-pdf-and-tracker-tools`,
  `phase02-session04-scan-pipeline-and-batch-tools`,
  `phase02-session05-router-and-specialist-agent-topology`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
