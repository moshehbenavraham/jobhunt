# Session 03: Agent Runtime Bootstrap

**Session ID**: `phase01-session03-agent-runtime-bootstrap`
**Package**: apps/api
**Status**: Complete
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Integrate the repo-owned OpenAI account auth stack and build the backend-owned
agent runtime bootstrap that later tool and job orchestration can reuse.

---

## Scope

### In Scope (MVP)

- Wire the OpenAI account auth flow from `scripts/lib/openai-account-auth/`
- Define the runtime factory and provider configuration for backend-owned agent
  execution
- Reuse checked-in prompt sources and the Phase 00 prompt contract instead of
  introducing opaque runtime-only prompts
- Add deterministic startup checks for authenticated runtime readiness

### Out of Scope

- Workflow-specific typed tools
- Full chat routing
- Batch fan-out semantics

---

## Prerequisites

- [ ] Session 01 API runtime completed
- [ ] Session 02 SQLite operational store completed
- [ ] Existing auth documentation and provider assumptions reviewed

---

## Deliverables

1. Agent runtime bootstrap module for `apps/api`
2. Provider and model configuration path based on repo-owned account auth
3. Smoke-test coverage for authenticated runtime startup and prompt loading

---

## Success Criteria

- [ ] The backend can create an authenticated runtime without an
      `OPENAI_API_KEY`-only path
- [ ] Prompt composition continues to resolve checked-in repo sources in the
      expected order
- [ ] Runtime bootstrap failures surface clear setup diagnostics
