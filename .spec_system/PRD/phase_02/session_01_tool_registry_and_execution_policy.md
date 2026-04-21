# Session 01: Tool Registry and Execution Policy

**Session ID**: `phase02-session01-tool-registry-and-execution-policy`
**Package**: apps/api
**Status**: Complete
**Estimated Tasks**: ~15
**Estimated Duration**: 2-4 hours

---

## Objective

Create one backend-owned tool execution contract that can validate inputs,
dispatch repo-safe actions, map failures, and emit observability events
without exposing raw shell semantics to agent prompt space.

---

## Scope

### In Scope (MVP)

- Define the shared tool registry, invocation contract, result envelope, and
  error-code taxonomy in `apps/api`
- Introduce constrained script-execution and workspace-mutation adapters that
  future workflow tools can reuse
- Reuse the Phase 01 job-runner, approval-runtime, and observability services
  instead of adding parallel execution paths
- Add baseline validation coverage for tool registration, schema validation,
  permission checks, and deterministic error mapping

### Out of Scope

- Workflow-specific tool implementations
- Router or specialist agent definitions
- Chat or operator-facing UI work

---

## Prerequisites

- [ ] Phase 01 completed and archived
- [ ] Approval and observability contracts from Phase 01 reviewed

---

## Deliverables

1. Typed tool registry and execution contract for `apps/api`
2. Constrained script and workspace adapters that preserve repo safety rules
3. Validation and observability hooks that later tool sessions can inherit

---

## Success Criteria

- [ ] Tool registration is explicit, typed, and duplicate-safe
- [ ] Invalid inputs, permission denials, and subprocess failures map to
      deterministic backend error shapes
- [ ] Later sessions can add workflow tools without re-implementing execution,
      approval, or observability plumbing
