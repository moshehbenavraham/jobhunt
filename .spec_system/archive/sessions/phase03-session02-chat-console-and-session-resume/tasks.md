# Task Checklist

**Session ID**: `phase03-session02-chat-console-and-session-resume`
**Total Tasks**: 20
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-21

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done  | Remaining |
| -------------- | ------ | ----- | --------- |
| Setup          | 4      | 0     | 4         |
| Foundation     | 4      | 0     | 4         |
| Implementation | 8      | 0     | 8         |
| Testing        | 4      | 0     | 4         |
| **Total**      | **20** | **0** | **20**    |

---

## Setup (4 tasks)

Define the console contract and the bounded recent-session query before wiring
HTTP or UI behavior.

### apps/web

- [x] T001 [S0302] [P] Create typed chat-console payloads, workflow options,
      and deterministic UI-state enums with types matching declared contract
      and exhaustive enum handling (`apps/web/src/chat/chat-console-types.ts`)

### apps/api

- [x] T002 [S0302] Extend the store contract with a bounded recent-session
      listing surface with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/store/store-contract.ts`)
- [x] T003 [S0302] Implement the recent-session repository query with bounded
      pagination, validated filters, and deterministic ordering
      (`apps/api/src/store/session-repository.ts`)
- [x] T004 [S0302] Add repository coverage for recent-session ordering and
      bounded limit behavior with deterministic ordering
      (`apps/api/src/store/repositories.test.ts`)

---

## Foundation (4 tasks)

Add the backend read and command routes that the Chat surface will consume.

### apps/api

- [x] T005 [S0302] Create the bounded chat-console summary helper that combines
      workflow support, recent sessions, job state, and pending approvals with
      bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/chat-console-summary.ts`)
- [x] T006 [S0302] Create the GET-only chat-console route with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/chat-console-route.ts`)
- [x] T007 [S0302] Create the POST orchestration route for launch or resume
      requests with schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/orchestration-route.ts`)
- [x] T008 [S0302] Register the chat-console and orchestration routes in the
      shared route registry with deterministic ordering
      (`apps/api/src/server/routes/index.ts`)

---

## Implementation (8 tasks)

Build the run console UI, wire it to the backend contracts, and replace the
Chat placeholder inside the operator shell.

### apps/web

- [x] T009 [S0302] Create the chat-console client for summary fetches and
      launch or resume requests with timeout, retry-backoff, and failure-path
      handling (`apps/web/src/chat/chat-console-client.ts`)
- [x] T010 [S0302] Implement the chat-console hook for polling, draft state,
      selected-session state, and launch or resume locking with cleanup on
      scope exit for all acquired resources
      (`apps/web/src/chat/use-chat-console.ts`)
- [x] T011 [S0302] [P] Create the workflow composer with preflight workflow
      copy, duplicate-trigger prevention while in-flight, and
      platform-appropriate accessibility labels, focus management, and input
      support (`apps/web/src/chat/workflow-composer.tsx`)
- [x] T012 [S0302] [P] Create the recent-session list with explicit loading,
      empty, error, and offline states (`apps/web/src/chat/recent-session-list.tsx`)
- [x] T013 [S0302] [P] Create the run-status panel for ready, auth-required,
      tooling-gap, waiting-for-approval, running, and failed states with types
      matching declared contract and exhaustive enum handling
      (`apps/web/src/chat/run-status-panel.tsx`)
- [x] T014 [S0302] [P] Create the run timeline with explicit loading, empty,
      error, and offline states (`apps/web/src/chat/run-timeline.tsx`)
- [x] T015 [S0302] Implement the Chat surface composition for the workflow
      composer, recent sessions, status panel, and timeline with state reset
      or revalidation on re-entry (`apps/web/src/chat/chat-console-surface.tsx`)
- [x] T016 [S0302] Replace the Chat placeholder in the operator shell with the
      live chat console surface with state reset or revalidation on re-entry
      (`apps/web/src/shell/operator-shell.tsx`)

---

## Testing (4 tasks)

Verify repository behavior, HTTP contracts, browser rendering, and repo-level
regression coverage.

### apps/api

- [x] T017 [S0302] [P] Extend the HTTP server contract tests for chat-console
      summary and orchestration launch or resume envelopes, including blocked
      and missing-session cases, with schema-validated input and explicit
      error mapping (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T018 [S0302] [P] Create browser smoke coverage for launch, resume,
      auth-blocked, tooling-gap, and duplicate-submit behavior with explicit
      loading, empty, error, and offline states
      (`scripts/test-app-chat-console.mjs`)
- [x] T019 [S0302] [P] Update the quick regression suite and ASCII coverage
      for the new chat-console files and smoke script with deterministic
      ordering (`scripts/test-all.mjs`)
- [x] T020 [S0302] Run web typecheck, web build, API runtime tests,
      orchestration tests, chat-console smoke coverage, and quick regressions,
      then verify ASCII-only session deliverables with duplicate-trigger
      prevention while in-flight (`apps/web/src/chat/`,
      `apps/api/src/server/`, `apps/api/src/store/`,
      `scripts/test-app-chat-console.mjs`, `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [ ] All tasks marked `[x]`
- [ ] All tests passing
- [ ] All files ASCII-encoded
- [ ] implementation-notes.md updated
- [ ] Ready for the `validate` workflow step

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation. After a
successful `plansession` run, `implement` is always the next workflow command.
