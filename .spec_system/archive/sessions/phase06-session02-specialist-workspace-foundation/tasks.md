# Task Checklist

**Session ID**: `phase06-session02-specialist-workspace-foundation`
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

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 7      | 7      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **19** | **19** | **0**     |

---

## Setup (3 tasks)

Define the browser contract, focus helpers, and shell registration before
building the specialist workspace UI.

### apps/web

- [x] T001 [S0602] [P] Create strict specialist-workspace payload parsers,
      mode enums, query-param helpers, and action-response types with types
      matching declared contract and exhaustive enum handling
      (`apps/web/src/workflows/specialist-workspace-types.ts`)
- [x] T002 [S0602] Create specialist-workspace client scaffolding for summary
      fetches, launch or resume actions, timeout or retry behavior, and
      URL-backed focus sync with timeout, retry/backoff, and failure-path
      handling (`apps/web/src/workflows/specialist-workspace-client.ts`)
- [x] T003 [S0602] [P] Register the workflows shell surface, navigation copy,
      and placeholder exhaustiveness with platform-appropriate accessibility
      labels, focus management, and input support
      (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/surface-placeholder.tsx`)

---

## Foundation (5 tasks)

Build the shared workspace state model and presentation seams on top of the
new specialist browser contract.

### apps/web

- [x] T004 [S0602] Create specialist-workspace hook state for selection sync,
      refresh cycles, action notices, polling eligibility, and stale-selection
      recovery with cleanup on scope exit for all acquired resources
      (`apps/web/src/workflows/use-specialist-workspace.ts`)
- [x] T005 [S0602] [P] Create the workflow inventory and launch panel for mode
      cards, intake guidance, support-state messaging, and launch controls
      with explicit loading, empty, error, and offline states
      (`apps/web/src/workflows/specialist-workspace-launch-panel.tsx`)
- [x] T006 [S0602] [P] Create the selected-state panel for run summary, result
      availability, warning chips, and resume affordances with explicit
      loading, empty, error, and offline states
      (`apps/web/src/workflows/specialist-workspace-state-panel.tsx`)
- [x] T007 [S0602] [P] Create the detail and handoff rail for dedicated-detail
      surfaces, approvals, chat, and review guidance with state reset or
      revalidation on re-entry
      (`apps/web/src/workflows/specialist-workspace-detail-rail.tsx`)
- [x] T008 [S0602] Create the specialist workspace surface composition and
      shell-facing callbacks with explicit loading, empty, error, and offline
      states (`apps/web/src/workflows/specialist-workspace-surface.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Implementation (7 tasks)

Keep specialist selection, run-state review, and launch or resume behavior
explicit, bounded, and aligned with the backend-owned contract.

### apps/web

- [x] T009 [S0602] Implement focus query parsing and sync for selected mode,
      selected session, and open-surface behavior with bounded pagination,
      validated filters, and deterministic ordering
      (`apps/web/src/workflows/specialist-workspace-client.ts`)
- [x] T010 [S0602] Implement summary loading, run-state polling, offline
      recovery, and stale-selection reconciliation with cleanup on scope exit
      for all acquired resources
      (`apps/web/src/workflows/use-specialist-workspace.ts`)
- [x] T011 [S0602] Implement launch handling through the specialist-workspace
      action route so supported modes can start from the shared workspace with
      duplicate-trigger prevention while in-flight
      (`apps/web/src/workflows/specialist-workspace-client.ts`,
      `apps/web/src/workflows/use-specialist-workspace.ts`,
      `apps/web/src/workflows/specialist-workspace-launch-panel.tsx`)
- [x] T012 [S0602] Implement resume handling for selected sessions with
      explicit blocked, degraded, missing-session, and accepted notices with
      state reset or revalidation on re-entry
      (`apps/web/src/workflows/specialist-workspace-client.ts`,
      `apps/web/src/workflows/use-specialist-workspace.ts`,
      `apps/web/src/workflows/specialist-workspace-state-panel.tsx`)
- [x] T013 [S0602] Implement dedicated-detail, approval, and chat handoffs
      from backend-provided workspace metadata so the browser never infers
      routes from repo artifacts with platform-appropriate accessibility
      labels, focus management, and input support
      (`apps/web/src/workflows/specialist-workspace-detail-rail.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)
- [x] T014 [S0602] Implement workflow-card selection, support-state grouping,
      and warning presentation for ready, tooling-gap, running, waiting,
      degraded, and completed specialist modes with types matching declared
      contract and exhaustive enum handling
      (`apps/web/src/workflows/specialist-workspace-launch-panel.tsx`,
      `apps/web/src/workflows/specialist-workspace-state-panel.tsx`,
      `apps/web/src/workflows/specialist-workspace-detail-rail.tsx`)
- [x] T015 [S0602] Implement workflows navigation badge behavior and shell
      selection copy so the operator can enter or re-enter specialist work
      without losing context with platform-appropriate accessibility labels,
      focus management, and input support
      (`apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Testing (4 tasks)

Verify shell navigation, specialist launch or resume behavior, and cross-surface
handoffs before the session moves to implementation.

### repo root

- [x] T016 [S0602] [P] Create browser smoke coverage for ready, tooling-gap,
      running or waiting, dedicated-detail, approval-handoff, and stale-
      selection specialist workspace flows with explicit loading, empty, error,
      and offline states (`scripts/test-app-specialist-workspace.mjs`)
- [x] T017 [S0602] [P] Extend shell smoke coverage for workflows navigation,
      deep-linked mode or session focus, and specialist-to-chat or
      application-help handoffs with explicit loading, empty, error, and
      offline states (`scripts/test-app-shell.mjs`)
- [x] T018 [S0602] [P] Update quick regression and ASCII coverage for the
      specialist workspace files and new smoke script with deterministic
      ordering (`scripts/test-all.mjs`)
- [x] T019 [S0602] Run web checks or builds, specialist workspace smoke
      coverage, shell smoke coverage, and quick regressions for the new
      workflows surface (`apps/web/src/workflows/`, `apps/web/src/shell/`,
      `scripts/test-app-specialist-workspace.mjs`,
      `scripts/test-app-shell.mjs`, `scripts/test-all.mjs`)

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

Run the `implement` workflow step to begin AI-led implementation. After a
successful `plansession` run, `implement` is always the next workflow command.
