# Task Checklist

**Session ID**: `phase04-session02-evaluation-console-and-artifact-handoff`
**Total Tasks**: 17
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-22

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other `[P]` tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 3 | 3 | 0 |
| Foundation | 4 | 4 | 0 |
| Implementation | 6 | 6 | 0 |
| Testing | 4 | 4 | 0 |
| **Total** | **17** | **17** | **0** |

---

## Setup (3 tasks)

Define the evaluation-result companion contract before wiring it into the
existing chat console.

### apps/web

- [x] T001 [S0402] [P] Create typed evaluation-result payloads, parser helpers,
      artifact enums, and handoff intent contracts with types matching
      declared contract and exhaustive enum handling
      (`apps/web/src/chat/evaluation-result-types.ts`)
- [x] T002 [S0402] Create the evaluation-result client for summary fetches
      with timeout, retry-backoff, and failure-path handling
      (`apps/web/src/chat/evaluation-result-client.ts`)
- [x] T003 [S0402] [P] Create the evaluation artifact rail for artifact
      packet, warning preview, closeout summary, and handoff affordances with
      explicit loading, empty, error, and offline states
      (`apps/web/src/chat/evaluation-artifact-rail.tsx`)

---

## Foundation (4 tasks)

Extend the chat console state model so evaluation-result reads stay coupled to
session selection and launch or resume flow.

### apps/web

- [x] T004 [S0402] Extend the chat-console hook state with selected-session
      evaluation-result loading, polling, and request cleanup on scope exit
      for all acquired resources (`apps/web/src/chat/use-chat-console.ts`)
- [x] T005 [S0402] Implement selected-session to evaluation-summary
      synchronization with latest-session fallback, bounded preview defaults,
      and state reset or revalidation on re-entry
      (`apps/web/src/chat/use-chat-console.ts`)
- [x] T006 [S0402] Adapt the run-status panel to map evaluation-result states
      into pending, running, approval-paused, failed, completed, and degraded
      console copy with types matching declared contract and exhaustive enum
      handling (`apps/web/src/chat/run-status-panel.tsx`)
- [x] T007 [S0402] Adapt the chat console surface layout to dock the
      evaluation artifact rail beside the selected-session timeline and keep
      desktop or mobile shell behavior intact with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/chat/chat-console-surface.tsx`)

---

## Implementation (6 tasks)

Render the artifact handoff and keep its actions explicit, bounded, and safe.

### apps/web

- [x] T008 [S0402] Wire evaluation-result fetches to launched or selected
      sessions with duplicate-trigger prevention while in-flight
      (`apps/web/src/chat/use-chat-console.ts`)
- [x] T009 [S0402] Implement artifact packet cards for report, PDF, and
      tracker readiness with explicit loading, empty, error, and offline
      states (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T010 [S0402] Implement score, legitimacy, warning preview, and closeout
      summary rendering so artifact-ready and degraded outcomes are explicit at
      a glance with types matching declared contract and exhaustive enum
      handling (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T011 [S0402] Implement approval, report-viewer, PDF, and pipeline-review
      handoff affordances with denied, unavailable, or deferred handling and
      fallback behavior (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T012 [S0402] Update the run-status panel to route approval-paused states
      into the existing Approvals surface and keep failed or degraded outcomes
      explicit with state reset or revalidation on re-entry
      (`apps/web/src/chat/run-status-panel.tsx`)
- [x] T013 [S0402] Refine chat-console surface copy and selected-session
      framing for evaluation-first console behavior without duplicating backend
      workflow logic (`apps/web/src/chat/chat-console-surface.tsx`)

---

## Testing (4 tasks)

Verify the browser behavior, fixture coverage, and repo-level regression gates.

### repo root

- [x] T014 [S0402] [P] Extend browser smoke coverage for running,
      approval-paused, completed, degraded, failed, and offline
      evaluation-result states with explicit loading, empty, error, and
      offline states (`scripts/test-app-chat-console.mjs`)
- [x] T015 [S0402] [P] Extend browser smoke coverage for artifact-handoff
      actions and future-surface intent states, including duplicate-trigger
      prevention while launch or refresh is in-flight
      (`scripts/test-app-chat-console.mjs`)
- [x] T016 [S0402] [P] Update the quick regression suite and ASCII coverage
      for the evaluation-console files and smoke script with deterministic
      ordering (`scripts/test-all.mjs`)
- [x] T017 [S0402] Run web typecheck, web build, chat-console smoke coverage,
      and quick regressions, then verify ASCII-only session deliverables
      (`apps/web/src/chat/`, `scripts/test-app-chat-console.mjs`,
      `scripts/test-all.mjs`)

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

Session implementation is complete. The next workflow command is `plansession`
for the next Phase 04 session.
