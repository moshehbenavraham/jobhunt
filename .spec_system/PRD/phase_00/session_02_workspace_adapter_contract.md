# Session 02: Workspace Adapter Contract

**Session ID**: `phase00-session02-workspace-adapter-contract`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~15
**Estimated Duration**: 2-4 hours

---

## Objective

Define the backend-owned workspace adapter that resolves canonical repo paths,
protects the user-versus-system boundary, and gives later tools a typed place
to read and write files safely.

---

## Scope

### In Scope (MVP)

- Establish canonical path resolution for repo roots and owned directories
- Encode the data-contract boundary between user-layer and system-layer files
- Add read and write helpers with guardrails suitable for app-owned tools
- Document how the adapter handles missing optional versus required files

### Out of Scope

- Workflow-specific business logic
- Agent routing
- Background job persistence

---

## Prerequisites

- [ ] Session 01 package scaffold completed
- [ ] `docs/DATA_CONTRACT.md` and `AGENTS.md` mapped into adapter requirements

---

## Deliverables

1. Workspace adapter module design for `apps/api`
2. Canonical path map for repo-owned surfaces the app will touch
3. Guardrail rules for safe reads, writes, and bootstrap-time checks

---

## Success Criteria

- [ ] The adapter can resolve canonical repo surfaces deterministically
- [ ] User-layer files remain protected from accidental bootstrap writes
- [ ] Missing-file behavior is explicit for onboarding versus normal runtime

