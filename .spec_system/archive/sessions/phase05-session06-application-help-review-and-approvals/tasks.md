# Task Checklist

**Session ID**: `phase05-session06-application-help-review-and-approvals`
**Total Tasks**: 19
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

| Category       | Total  | Done  | Remaining |
| -------------- | ------ | ----- | --------- |
| Setup          | 3      | 0     | 3         |
| Foundation     | 5      | 0     | 5         |
| Implementation | 7      | 0     | 7         |
| Testing        | 4      | 0     | 4         |
| **Total**      | **19** | **0** | **19**    |

---

## Setup (3 tasks)

Define the browser contract, command seam, and shell registration before
building the application-help workspace UI.

### apps/web

- [x] T001 [S0506] Create strict application-help payload parsers,
      review-state helpers, warning items, and focus helpers with types
      matching declared contract and exhaustive enum handling
      (`apps/web/src/application-help/application-help-types.ts`)
- [x] T002 [S0506] Create application-help client scaffolding for summary
      fetches, timeout or retry behavior, URL-backed session focus, and
      chat-command launch or resume submission seams with timeout,
      retry/backoff, and failure-path handling
      (`apps/web/src/application-help/application-help-client.ts`)
- [x] T003 [S0506] Register the application-help shell surface, navigation
      badge, placeholder exhaustiveness, and mount seam with platform-
      appropriate accessibility labels, focus management, and input support
      (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/surface-placeholder.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Foundation (5 tasks)

Build the application-help state model and presentation seams on top of the new
browser contract.

### apps/web

- [x] T004 [S0506] Create application-help hook state for session focus,
      summary polling, launch or resume notices, and stale-session recovery
      with cleanup on scope exit for all acquired resources
      (`apps/web/src/application-help/use-application-help.ts`)
- [x] T005 [S0506] [P] Create the launch panel for request input, latest-
      session summary, explicit no-submit boundary, and refresh controls with
      explicit loading, empty, error, and offline states
      (`apps/web/src/application-help/application-help-launch-panel.tsx`)
- [x] T006 [S0506] [P] Create the draft review panel for structured answers,
      review notes, warning chips, and next-step messaging with platform-
      appropriate accessibility labels, focus management, and input support
      (`apps/web/src/application-help/application-help-draft-panel.tsx`)
- [x] T007 [S0506] [P] Create the context rail for matched report metadata,
      PDF artifact state, approval details, and failure or rejection summaries
      with state reset or revalidation on re-entry
      (`apps/web/src/application-help/application-help-context-rail.tsx`)
- [x] T008 [S0506] Create the application-help workspace composition,
      responsive layout, and shell callback seams with explicit loading, empty,
      error, and offline states
      (`apps/web/src/application-help/application-help-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Implementation (7 tasks)

Keep application-help review, launch or resume controls, and cross-surface
handoffs explicit, bounded, and aligned with the backend-owned contract.

### apps/web

- [x] T009 [S0506] Implement `applicationHelpSessionId` query parsing and URL
      sync for selected or latest application-help review with state reset or
      revalidation on re-entry
      (`apps/web/src/application-help/application-help-client.ts`)
- [x] T010 [S0506] Implement summary loading, polling, latest-session
      fallback, and stale-session recovery in the application-help hook with
      cleanup on scope exit for all acquired resources
      (`apps/web/src/application-help/use-application-help.ts`)
- [x] T011 [S0506] Implement launch and resume actions through the existing
      chat command route with duplicate-trigger prevention while in-flight
      (`apps/web/src/application-help/application-help-client.ts`,
      `apps/web/src/application-help/use-application-help.ts`,
      `apps/web/src/application-help/application-help-launch-panel.tsx`)
- [x] T012 [S0506] Implement missing-context, no-draft-yet, draft-ready,
      approval-paused, rejected, resumed, and completed review-state
      presentation with types matching declared contract and exhaustive enum
      handling (`apps/web/src/application-help/application-help-draft-panel.tsx`,
      `apps/web/src/application-help/application-help-surface.tsx`)
- [x] T013 [S0506] Implement matched report, PDF artifact, warning, and
      next-review guidance presentation with explicit loading, empty, error,
      and offline states
      (`apps/web/src/application-help/application-help-context-rail.tsx`,
      `apps/web/src/application-help/application-help-surface.tsx`)
- [x] T014 [S0506] Implement approval-inbox handoff and interrupted-run return
      path for application-help sessions with state reset or revalidation on
      re-entry (`apps/web/src/approvals/approval-inbox-surface.tsx`,
      `apps/web/src/approvals/interrupted-run-panel.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)
- [x] T015 [S0506] Implement report-viewer, approvals, and chat-console
      handoff controls from application-help review with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/application-help/application-help-context-rail.tsx`,
      `apps/web/src/application-help/application-help-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Testing (4 tasks)

Verify shell navigation, application-help review, and approval-aware handoffs
before the session moves to implementation.

### repo root

- [x] T016 [S0506] [P] Create browser smoke coverage for draft-ready,
      approval-paused, rejected, resumed, completed, and latest-fallback
      application-help flows with explicit loading, empty, error, and offline
      states (`scripts/test-app-application-help.mjs`)
- [x] T017 [S0506] [P] Extend shell smoke coverage for application-help
      navigation plus artifact, approval, and chat handoffs from the new
      surface with explicit loading, empty, error, and offline states
      (`scripts/test-app-shell.mjs`)
- [x] T018 [S0506] [P] Update quick regression and ASCII coverage for the
      application-help workspace files and smoke script with deterministic
      ordering (`scripts/test-all.mjs`)
- [x] T019 [S0506] Run web checks or builds, application-help and shell smoke
      coverage, quick regressions, and ASCII validation for the new
      deliverables (`apps/web/src/application-help/`,
      `apps/web/src/approvals/`, `apps/web/src/shell/`,
      `scripts/test-app-application-help.mjs`,
      `scripts/test-app-shell.mjs`, `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] `implementation-notes.md` updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation. After a
successful `plansession` run, `implement` is always the next workflow command.
