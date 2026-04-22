# Task Checklist

**Session ID**: `phase06-session05-specialist-review-surfaces`
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
| Setup          | 4      | 4      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 6      | 6      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **19** | **19** | **0**     |

---

## Setup (4 tasks)

Define the detail contracts, clients, and shared review hook before composing
family-specific specialist panels.

### apps/web

- [x] T001 [S0605] [P] Create tracker-specialist review payload parsers, mode
      guards, and handoff helpers with types matching declared contract and
      exhaustive enum handling
      (`apps/web/src/workflows/tracker-specialist-review-types.ts`)
- [x] T002 [S0605] [P] Create research-specialist review payload parsers,
      narrative packet helpers, and manual-send boundary types with types
      matching declared contract and exhaustive enum handling
      (`apps/web/src/workflows/research-specialist-review-types.ts`)
- [x] T003 [S0605] [P] Create tracker-specialist and research-specialist
      review clients for focus-aware GET requests with schema-validated input
      and explicit error mapping
      (`apps/web/src/workflows/tracker-specialist-review-client.ts`,
      `apps/web/src/workflows/research-specialist-review-client.ts`)
- [x] T004 [S0605] Create shared specialist review hook scaffolding for family
      selection, abortable detail fetches, and offline snapshot handling with
      cleanup on scope exit for all acquired resources
      (`apps/web/src/workflows/use-specialist-review.ts`)

---

## Foundation (5 tasks)

Build the family resolution, parser coverage, and focus-sync behavior the
review surface depends on.

### apps/web

- [x] T005 [S0605] Implement tracker-specialist parsing coverage for
      compare-offers, follow-up-cadence, and rejection-pattern detail packets
      with types matching declared contract and exhaustive enum handling
      (`apps/web/src/workflows/tracker-specialist-review-types.ts`)
- [x] T006 [S0605] Implement research-specialist parsing coverage for deep
      research, linkedin-outreach, interview-prep, training-review, and
      project-review packets plus manual-send guardrails with types matching
      declared contract and exhaustive enum handling
      (`apps/web/src/workflows/research-specialist-review-types.ts`)
- [x] T007 [S0605] Implement review-family resolution from specialist
      workspace summary metadata, selected mode, and session focus with types
      matching declared contract and exhaustive enum handling
      (`apps/web/src/workflows/use-specialist-review.ts`,
      `apps/web/src/workflows/specialist-workspace-types.ts`)
- [x] T008 [S0605] Implement detail fetch lifecycle for selection changes,
      refresh, resume, and stale-selection recovery with cleanup on scope exit
      for all acquired resources
      (`apps/web/src/workflows/use-specialist-review.ts`,
      `apps/web/src/workflows/use-specialist-workspace.ts`)
- [x] T009 [S0605] Implement focus-sync helpers so detail handoffs and
      re-entry revalidate the selected workflow with state reset or
      revalidation on re-entry
      (`apps/web/src/workflows/specialist-workspace-client.ts`,
      `apps/web/src/shell/operator-shell.tsx`)

---

## Implementation (6 tasks)

Render family-specific specialist review content and keep shell handoffs
explicit inside the workflows surface.

### apps/web

- [x] T010 [S0605] [P] Create tracker-specialist review panel for planning
      summaries, recommendations, warnings, and next actions with explicit
      loading, empty, error, and offline states
      (`apps/web/src/workflows/tracker-specialist-review-panel.tsx`)
- [x] T011 [S0605] [P] Create research-specialist review panel for bounded
      narrative packets, source context, draft guidance, and review boundaries
      with explicit loading, empty, error, and offline states
      (`apps/web/src/workflows/research-specialist-review-panel.tsx`)
- [x] T012 [S0605] [P] Create specialist workspace review rail for approvals,
      chat, tracker, pipeline, and artifact handoffs with platform-
      appropriate accessibility labels, focus management, and input support
      (`apps/web/src/workflows/specialist-workspace-review-rail.tsx`)
- [x] T013 [S0605] Integrate the shared review hook, family panels, and
      review rail into the specialist workspace surface with explicit loading,
      empty, error, and offline states
      (`apps/web/src/workflows/specialist-workspace-surface.tsx`)
- [x] T014 [S0605] Update selected workflow state and generic detail messaging
      to cooperate with ready review surfaces instead of dedicated-detail
      placeholders with explicit loading, empty, error, and offline states
      (`apps/web/src/workflows/specialist-workspace-state-panel.tsx`,
      `apps/web/src/workflows/specialist-workspace-detail-rail.tsx`,
      `apps/web/src/workflows/specialist-workspace-launch-panel.tsx`)
- [x] T015 [S0605] Wire specialist detail handoffs, focus sync, and shell-
      facing openers so review stays inside the workflows surface unless
      another surface is explicitly requested with state reset or
      revalidation on re-entry
      (`apps/web/src/shell/operator-shell.tsx`,
      `apps/web/src/workflows/specialist-workspace-client.ts`,
      `apps/web/src/workflows/use-specialist-workspace.ts`)

---

## Testing (4 tasks)

Lock the workflows review behavior before Session 06 depends on it for
cutover work.

### repo root

- [x] T016 [S0605] [P] Extend specialist-workspace smoke coverage for
      tracker-specialist review states, approval pauses, and tracker or
      pipeline handoffs with explicit loading, empty, error, and offline
      states (`scripts/test-app-specialist-workspace.mjs`)
- [x] T017 [S0605] [P] Extend specialist-workspace smoke coverage for
      research-specialist review states, manual-send guardrails, and stale-
      selection recovery with state reset or revalidation on re-entry
      (`scripts/test-app-specialist-workspace.mjs`)
- [x] T018 [S0605] [P] Extend shell smoke and quick-regression coverage for
      workflows deep links, detail reopening, and ASCII-tracked files with
      deterministic ordering
      (`scripts/test-app-shell.mjs`, `scripts/test-all.mjs`)
- [x] T019 [S0605] Run web checks, web build, specialist workspace smoke,
      shell smoke, and the repo quick regression gate
      (`apps/web/src/workflows/specialist-workspace-surface.tsx`,
      `apps/web/src/workflows/use-specialist-review.ts`,
      `scripts/test-app-specialist-workspace.mjs`,
      `scripts/test-app-shell.mjs`, `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] `implementation-notes.md` updated
- [x] Ready for the `implement` workflow step

---

## Next Steps

Session complete. Ready for summary handoff or follow-on validation work.
