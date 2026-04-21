# Session 03: Prompt Loading Contract

**Session ID**: `phase00-session03-prompt-loading-contract`
**Package**: apps/api
**Status**: Complete
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Codify how the new runtime loads checked-in instructions, profile context, and
mode definitions so the app preserves the repo's existing product logic instead
of forking it into hidden prompts.

---

## Scope

### In Scope (MVP)

- Define deterministic load order for `AGENTS.md`, shared modes, profile data,
  and workflow-specific mode files
- Decide how the backend maps user intents to checked-in mode assets
- Specify caching or reload behavior for prompt assets during local use
- Clarify where user-specific narrative lives versus shared workflow logic

### Out of Scope

- Full multi-agent orchestration
- UI chat composition
- Typed wrappers around all repo scripts

---

## Prerequisites

- [x] Session 02 workspace adapter contract completed
- [x] Master PRD, UX PRD, and Job-Hunt routing rules reviewed together

---

## Deliverables

1. Prompt-loading and mode-resolution contract for `apps/api`
2. Source-order rules for shared, profile, and workflow-specific context
3. Guardrails that keep user-specific customization out of shared system files

---

## Success Criteria

- [x] The runtime has one explicit source order for checked-in instructions
- [x] Mode routing preserves the repo's existing workflow boundaries
- [x] Prompt loading stays inspectable and does not depend on hidden session
      state
