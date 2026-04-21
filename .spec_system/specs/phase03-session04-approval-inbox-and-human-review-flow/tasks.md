# Task Checklist

**Session ID**: `phase03-session04-approval-inbox-and-human-review-flow`
**Total Tasks**: 19
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-22

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 4 | 4 | 0 |
| Foundation | 5 | 5 | 0 |
| Implementation | 6 | 6 | 0 |
| Testing | 4 | 4 | 0 |
| **Total** | **19** | **19** | **0** |

---

## Setup (4 tasks)

Establish the approval-inbox read and decision contracts before wiring browser
state.

### apps/api

- [x] T001 [S0304] Create the bounded approval-inbox summary helper that
      combines pending approvals, selected approval context, interrupted
      sessions, and timeline metadata with bounded pagination, validated
      filters, and deterministic ordering
      (`apps/api/src/server/approval-inbox-summary.ts`)
- [x] T002 [S0304] Create the GET-only approval-inbox route with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/approval-inbox-route.ts`)
- [x] T003 [S0304] Create the POST approval-resolution route for approve or
      reject actions with idempotency protection, transaction boundaries, and
      compensation on failure
      (`apps/api/src/server/routes/approval-resolution-route.ts`)
- [x] T004 [S0304] Register the approval-inbox and approval-resolution routes
      in the shared route registry with deterministic ordering
      (`apps/api/src/server/routes/index.ts`)

---

## Foundation (5 tasks)

Define client-side contracts and reusable review primitives for the Approvals
surface.

### apps/web

- [x] T005 [S0304] [P] Create typed approval-inbox payloads, decision enums,
      and review-state contracts with types matching declared contract and
      exhaustive enum handling
      (`apps/web/src/approvals/approval-inbox-types.ts`)
- [x] T006 [S0304] [P] Create the approval-inbox client for summary fetches,
      approval resolution, and resume handoff requests with timeout,
      retry-backoff, and failure-path handling
      (`apps/web/src/approvals/approval-inbox-client.ts`)
- [x] T007 [S0304] Implement the approval-inbox hook for polling, selection,
      decision locking, and resume handoff state with cleanup on scope exit for
      all acquired resources (`apps/web/src/approvals/use-approval-inbox.ts`)
- [x] T008 [S0304] [P] Create the approval queue list with explicit loading,
      empty, error, and offline states
      (`apps/web/src/approvals/approval-queue-list.tsx`)
- [x] T009 [S0304] [P] Create the approval context panel for request details,
      session or job metadata, and trace context with types matching declared
      contract and exhaustive enum handling
      (`apps/web/src/approvals/approval-context-panel.tsx`)

---

## Implementation (6 tasks)

Compose the inbox UI, wire shell handoff, and reuse the existing resume path
for interrupted work.

### apps/web

- [x] T010 [S0304] [P] Create approval decision controls for approve or reject
      flows with duplicate-trigger prevention while in-flight and
      platform-appropriate accessibility labels, focus management, and input
      support (`apps/web/src/approvals/approval-decision-bar.tsx`)
- [x] T011 [S0304] [P] Create the interrupted-run panel for resumable waiting
      or failed sessions with explicit loading, empty, error, and offline
      states (`apps/web/src/approvals/interrupted-run-panel.tsx`)
- [x] T012 [S0304] Implement the approval inbox surface that composes queue,
      context, decision controls, and interrupted-run review with state reset
      or revalidation on re-entry
      (`apps/web/src/approvals/approval-inbox-surface.tsx`)
- [x] T013 [S0304] Replace the Approvals placeholder in the operator shell
      with the live approval inbox surface with state reset or revalidation on
      re-entry (`apps/web/src/shell/operator-shell.tsx`)
- [x] T014 [S0304] Adapt the chat run-status panel to route waiting-for-
      approval and interrupted-run review affordances into the Approvals
      surface with platform-appropriate accessibility labels, focus management,
      and input support (`apps/web/src/chat/run-status-panel.tsx`)
- [x] T015 [S0304] Adapt the shell status strip to reflect resolution and
      resume handoff copy without duplicating backend approval state with types
      matching declared contract and exhaustive enum handling
      (`apps/web/src/shell/status-strip.tsx`)

---

## Testing (4 tasks)

Verify route behavior, browser flows, and repo-level regression gates.

### apps/api

- [x] T016 [S0304] [P] Extend the HTTP server contract tests for
      approval-inbox summary and approval-resolution flows, including stale,
      already-resolved, rejected, and session-filter cases, with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T017 [S0304] [P] Create browser smoke coverage for queue rendering,
      context inspection, approve, reject, stale-resolution, and resume-
      handoff behavior with explicit loading, empty, error, and offline states
      (`scripts/test-app-approval-inbox.mjs`)
- [x] T018 [S0304] [P] Update the quick regression suite and ASCII coverage
      for the new approval-inbox files and smoke script with deterministic
      ordering (`scripts/test-all.mjs`)
- [x] T019 [S0304] Run web typecheck, web build, API runtime plus approval-
      runtime and orchestration tests, approval-inbox smoke coverage, doctor,
      and quick regressions, then verify ASCII-only session deliverables with
      duplicate-trigger prevention while in-flight (`apps/web/src/approvals/`,
      `apps/web/src/shell/`, `apps/web/src/chat/`, `apps/api/src/server/`,
      `scripts/test-app-approval-inbox.mjs`, `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `validate` workflow step to confirm the completed approval-inbox
session against the checked-in spec and validation evidence.
