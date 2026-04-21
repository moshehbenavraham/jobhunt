# Session 02: Chat Console and Session Resume

**Session ID**: `phase03-session02-chat-console-and-session-resume`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~15
**Estimated Duration**: 2-4 hours

---

## Objective

Deliver the primary operator console for launching supported workflow requests,
viewing structured run progress, and resuming recent or interrupted sessions.

---

## Scope

### In Scope (MVP)

- Build the chat composer, transcript or event timeline, and run-status panel
- Expose backend launch and resume contracts that reuse the existing
  orchestration service and specialist routing
- Show deterministic workflow states such as ready, auth-required,
  tooling-gap, waiting-for-approval, running, and failed
- Add validation coverage for session launch, resume, and structured error
  presentation

### Out of Scope

- Onboarding repair UX
- Approval queue and approve or reject actions
- Report viewer or artifact review surfaces

---

## Prerequisites

- [ ] Session 01 operator shell and navigation foundation completed

---

## Deliverables

1. Chat-first operator console with launch and resume controls
2. API contract for recent-session summaries and orchestration handoff results
3. Coverage for launch, resume, waiting, and failure states

---

## Success Criteria

- [ ] Users can start a supported workflow request from the app UI
- [ ] Users can reopen recent or interrupted sessions without manual CLI work
- [ ] Run status remains deterministic and derived from backend-owned runtime
      state
