# PRD Phase 03: Chat, Onboarding, and Approvals UX

**Status**: In Progress
**Sessions**: 5
**Estimated Duration**: 4-6 days

**Progress**: 4/5 sessions (80%)

---

## Overview

Build the first operator-facing app experience on top of the Phase 02 runtime,
typed tools, and orchestration contracts. This phase turns the current
bootstrap-only shell into a usable local app surface for startup checks, chat,
onboarding repair, approval handling, and essential settings without
duplicating repo logic in the browser.

The goal is not full workflow parity yet. The goal is to make the app usable
as the primary entry point for startup and interactive runs by keeping the UI
thin, resumable, and fully backed by the existing API-owned runtime, tools,
and durable state contracts.

---

## Progress Tracker

| Session | Name | Status | Est. Tasks | Validated |
|---------|------|--------|------------|-----------|
| 01 | Operator Shell and Navigation Foundation | Complete | ~14 | 2026-04-21 |
| 02 | Chat Console and Session Resume | Complete | ~15 | 2026-04-21 |
| 03 | Startup Checklist and Onboarding Wizard | Complete | ~14 | 2026-04-22 |
| 04 | Approval Inbox and Human Review Flow | Complete | ~19 | 2026-04-22 |
| 05 | Settings and Maintenance Surface | Not Started | ~13 | - |

---

## Completed Sessions

Session 01: Operator Shell and Navigation Foundation
Session 02: Chat Console and Session Resume
Session 03: Startup Checklist and Onboarding Wizard
Session 04: Approval Inbox and Human Review Flow

---

## Upcoming Sessions

- Session 05: Settings and Maintenance Surface

Progress update: 4/5 sessions complete.

---

## Objectives

1. Establish a navigable operator shell that exposes startup, chat,
   onboarding, approvals, and settings as first-class app surfaces.
2. Reuse the Phase 02 orchestration, approval, and tool contracts instead of
   recreating repo logic in frontend-only state.
3. Make startup repair and interrupted-run handling visible and resumable
   without requiring manual `codex` use.

---

## Prerequisites

- Phase 02 completed and archived
- `apps/api` orchestration, approval, job-runner, workspace, and tool surfaces
  treated as canonical
- `apps/web` remains thin and read-first until a user explicitly approves a
  mutation or onboarding repair

---

## Technical Considerations

### Architecture

Keep view composition, navigation state, and user interaction in `apps/web`,
but continue to source startup, workflow, approval, and maintenance state from
`apps/api`. Chat launch and resume flows should call backend-owned
orchestration contracts. Onboarding repair should reuse the typed inspection
and repair tools instead of re-implementing filesystem rules in the browser.

### Technologies

- React 19 and Vite in `apps/web`
- Node.js and TypeScript in `apps/api`
- Existing orchestration, approval-runtime, job-runner, and startup services
- Existing typed backend tools for startup inspection and onboarding repair
- Existing observability and operational-store contracts

### Risks

- UI contract drift: frontend view models can fork from live backend tool and
  runtime contracts if they normalize too aggressively
- Hidden writes: onboarding or approval actions must not bypass the existing
  approval-aware mutation boundaries
- Scope creep: artifact review, tracker parity, and broader workflow coverage
  belong to later phases and should not bleed into this phase

### Relevant Considerations

- [P00] **Repo-bound startup freshness**: keep required-file checks and
  onboarding messaging aligned with the live repo contract
- [P00] **Read-first boot surface**: startup and diagnostics must stay
  metadata-only until the user explicitly triggers a repair
- [P00] **Live contract payload size**: keep boot and settings payloads narrow
  so the UI stays fast and deterministic
- [P02-apps/api] **Tool catalog drift**: keep new UX surfaces aligned with the
  checked-in tool registry and scoped visibility rules
- [P02-apps/api] **Durable workflow fan-out**: resume, approval, and run
  status UX must preserve the single enqueue and executor contract
- [P02-apps/api] **Catalog-driven routing**: workflow launch and resume should
  stay deterministic and checked-in

---

## Success Criteria

Phase complete when:

- [ ] All 5 sessions completed
- [ ] A user can launch the app, inspect readiness, and repair missing startup
      prerequisites without leaving the browser
- [ ] A user can start or resume interactive workflow runs through a chat-first
      surface backed by the existing orchestration runtime
- [ ] Pending approvals and interrupted runs are visible and actionable without
      direct store or CLI inspection
- [ ] Settings basics expose auth, startup, and maintenance state without
      duplicating repo logic in frontend-only code

---

## Dependencies

### Depends On

- Phase 02: Typed Tools and Agent Orchestration

### Enables

- Phase 04: Evaluation, Artifacts, and Tracker Parity
- Phase 05: Scan, Batch, and Application-Help Parity
- Phase 06: Specialist Workflows, Dashboard Replacement, and Cutover
