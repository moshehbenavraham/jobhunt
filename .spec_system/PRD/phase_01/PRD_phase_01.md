# PRD Phase 01: Backend Runtime and Job Infrastructure

**Status**: In Progress
**Sessions**: 5
**Estimated Duration**: 4-6 days

**Progress**: 4/5 sessions (80%)

---

## Overview

Build the first real backend runtime for the local app so later phases can run
typed tools and user-facing workflows on top of stable infrastructure. This
phase turns the Phase 00 scaffold into an explicit Node.js and TypeScript API
with app-owned operational state, resumable jobs, approval pause points, and
structured observability.

The goal is not workflow parity yet. The goal is to make long-running work
start, persist, resume, and fail in a controlled way while preserving the
repo-owned data contract and the checked-in prompt and workspace rules.

---

## Progress Tracker

| Session | Name | Status | Est. Tasks | Validated |
|---------|------|--------|------------|-----------|
| 01 | API Service Runtime | Completed | ~14 | 2026-04-21 |
| 02 | SQLite Operational Store | Completed | ~15 | 2026-04-21 |
| 03 | Agent Runtime Bootstrap | Completed | ~14 | 2026-04-21 |
| 04 | Durable Job Runner | Completed | ~16 | 2026-04-21 |
| 05 | Approval and Observability Contract | Not Started | ~13 | - |

---

## Completed Sessions

- Session 01: API Service Runtime - Completed 2026-04-21
- Session 02: SQLite Operational Store - Completed 2026-04-21
- Session 03: Agent Runtime Bootstrap - Completed 2026-04-21
- Session 04: Durable Job Runner - Completed 2026-04-21

---

## Upcoming Sessions

- Session 05: Approval and Observability Contract

---

## Objectives

1. Establish the local API runtime and shared backend service boundaries in
   `apps/api`.
2. Persist sessions, jobs, approvals, and resume metadata in SQLite without
   moving domain artifacts out of repo files.
3. Make long-running app work start, pause, resume, and fail with structured
   logs and traces.

---

## Prerequisites

- Phase 00 completed and archived
- Workspace adapter, prompt contract, and startup diagnostics from Phase 00
  treated as canonical
- Repo-owned OpenAI account auth and validation scripts available for reuse

---

## Technical Considerations

### Architecture

Phase 01 should keep the runtime centered in `apps/api`. The package needs a
real API process, a small service container, SQLite-backed operational state,
agent-runtime bootstrap code, a background job runner, approval state
transitions, and structured diagnostics. The backend must continue to rely on
the checked-in workspace adapter and prompt-loading contract instead of
duplicating repo logic in new runtime-only helpers.

### Technologies

- Node.js and TypeScript in `apps/api` for the local API and runtime services
- SQLite under `.jobhunt-app/` for app-owned sessions, jobs, approvals, and
  run metadata
- Repo-owned OpenAI account auth from `scripts/lib/openai-account-auth/`
- Existing workspace adapter and prompt-loading modules from Phase 00
- Repo validation commands such as `npm run doctor` and
  `node scripts/test-all.mjs --quick`

### Risks

- Runtime drift: new API services can fork behavior if they bypass registry and
  prompt contracts from Phase 00
- Persistence coupling: schema or repository shortcuts can make resume and
  approval semantics brittle later
- Recovery gaps: long-running jobs need enough durable state to resume cleanly
  without repeating side effects

### Relevant Considerations

- [P00-apps/api] **Workspace registry coupling**: runtime services should keep
  repo reads and writes behind registry-driven helpers instead of ad hoc path
  checks
- [P00] **Repo-bound startup freshness**: API startup and background workers
  must keep required-file checks aligned with the live repo contract
- [P00] **Read-first boot surface**: diagnostics and health paths must remain
  metadata-only and avoid hidden writes
- [P00] **Registry-first contracts**: routing, prompt composition, and
  workspace ownership should reuse checked-in registries rather than duplicate
  path logic

---

## Success Criteria

Phase complete when:

- [ ] All 5 sessions completed
- [ ] The local API can boot with structured health and startup diagnostics
- [ ] SQLite persists sessions, jobs, approvals, and resume metadata under
      `.jobhunt-app/`
- [ ] Background jobs can start, persist, resume, and fail in a structured way
- [ ] Repo-owned OpenAI account auth and runtime bootstrap work without
      `OPENAI_API_KEY`-only assumptions
- [ ] Logs and traces make job and approval failures inspectable without
      stdout scraping

---

## Dependencies

### Depends On

- Phase 00: Foundation and Repo Contract

### Enables

- Phase 02: Typed Tools and Agent Orchestration
