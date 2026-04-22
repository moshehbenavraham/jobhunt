# Implementation Notes

**Session ID**: `phase06-session05-specialist-review-surfaces`
**Package**: `apps/web`
**Started**: 2026-04-22 20:16
**Last Updated**: 2026-04-22 20:59

---

## Session Progress

| Metric              | Value     |
| ------------------- | --------- |
| Tasks Completed     | 19 / 19   |
| Estimated Remaining | 0.0 hours |
| Blockers            | 0         |

---

### Task T001 - Tracker-specialist review payload parsers

**Started**: 2026-04-22 20:16
**Completed**: 2026-04-22 20:26
**Duration**: 10 minutes

Added `tracker-specialist-review-types.ts` with fail-closed parsing for the
tracker-specialist summary payload, exhaustive enum guards, and handoff helper
resolvers for report, tracker, and pipeline targets.

### Task T002 - Research-specialist review payload parsers

**Started**: 2026-04-22 20:16
**Completed**: 2026-04-22 20:26
**Duration**: 10 minutes

Added `research-specialist-review-types.ts` with fail-closed parsing for the
research-specialist summary payload, bounded packet parsers for every
narrative workflow, and manual-send boundary parsing for outreach review.

### Task T003 - Specialist review clients

**Started**: 2026-04-22 20:22
**Completed**: 2026-04-22 20:26
**Duration**: 4 minutes

Added dedicated GET clients for `/tracker-specialist` and
`/research-specialist` with validated focus input, retry-on-offline behavior,
explicit timeout handling, and fail-closed error mapping.

### Task T005 - Tracker-specialist packet coverage

**Started**: 2026-04-22 20:16
**Completed**: 2026-04-22 20:26
**Duration**: 10 minutes

Covered compare-offers, follow-up-cadence, and rejection-pattern packets in
the tracker review parser with exhaustive mode switching and per-packet helper
types for downstream rendering.

### Task T006 - Research-specialist packet coverage

**Started**: 2026-04-22 20:16
**Completed**: 2026-04-22 20:26
**Duration**: 10 minutes

Covered deep-company-research, linkedin-outreach, interview-prep,
training-review, and project-review packets in the research review parser with
explicit review-boundary parsing and report-context recovery.

### Task T004 - Shared specialist review hook scaffolding

**Started**: 2026-04-22 20:26
**Completed**: 2026-04-22 20:28
**Duration**: 2 minutes

Added `use-specialist-review.ts` with family-aware selection resolution,
abortable detail fetches, per-selection offline snapshots, and cleanup for
re-entry or scope exit.

### Task T007 - Review-family resolution

**Started**: 2026-04-22 20:26
**Completed**: 2026-04-22 20:28
**Duration**: 2 minutes

Extended `specialist-workspace-types.ts` with inline-review family helpers and
detail-route resolution so the shared review hook can choose tracker vs.
research review without browser-side guessing from repo files.

### Task T008 - Review fetch lifecycle

**Started**: 2026-04-22 20:26
**Completed**: 2026-04-22 20:37
**Duration**: 11 minutes

Hooked selection-change, refresh, and stale-selection revalidation through
`use-specialist-review.ts`, then updated `use-specialist-workspace.ts` so mode
changes trigger immediate detail reloads instead of waiting for stale shell
state to settle.

### Task T009 - Focus-sync helpers

**Started**: 2026-04-22 20:31
**Completed**: 2026-04-22 20:37
**Duration**: 6 minutes

Added `openSpecialistWorkspaceSurface()` plus shell routing updates so
tracker-specialist and research-specialist detail handoffs re-enter the shared
workflows surface instead of bouncing to a non-existent dedicated route.

### Task T010 - Tracker-specialist review panel

**Started**: 2026-04-22 20:29
**Completed**: 2026-04-22 20:37
**Duration**: 8 minutes

Added the planner review panel with explicit empty, loading, offline, and
error states, plus bounded compare-offers, follow-up, and rejection-pattern
rendering.

### Task T011 - Research-specialist review panel

**Started**: 2026-04-22 20:31
**Completed**: 2026-04-22 20:37
**Duration**: 6 minutes

Added the narrative review panel with bounded packet rendering for deep
research, outreach, interview prep, training review, and project review,
including manual-send boundary messaging.

### Task T012 - Shared review rail

**Started**: 2026-04-22 20:33
**Completed**: 2026-04-22 20:37
**Duration**: 4 minutes

Added a shared review rail that resolves approvals, chat, tracker, pipeline,
and artifact handoffs from the typed review payloads instead of browser-side
repo inference.

### Task T013 - Workflows surface integration

**Started**: 2026-04-22 20:34
**Completed**: 2026-04-22 20:37
**Duration**: 3 minutes

Integrated the shared review hook, tracker/research panels, and shared review
rail into `specialist-workspace-surface.tsx` while preserving the existing
application-help dedicated-detail fallback path.

### Task T014 - Inline review messaging

**Started**: 2026-04-22 20:35
**Completed**: 2026-04-22 20:37
**Duration**: 2 minutes

Updated the launch panel, selected-state panel, and dedicated-detail rail copy
so inline tracker/research review reads as part of the workflows shell instead
of a placeholder for another surface.

### Task T015 - Shell-facing review handoffs

**Started**: 2026-04-22 20:31
**Completed**: 2026-04-22 20:37
**Duration**: 6 minutes

Wired the operator shell and tracker handoff helpers so explicit report,
pipeline, tracker, approval, chat, and application-help routes continue to
work while inline tracker/research review stays in the workflows surface.

### Task T016 - Tracker-specialist smoke coverage

**Started**: 2026-04-22 20:38
**Completed**: 2026-04-22 20:56
**Duration**: 18 minutes

Extended `scripts/test-app-specialist-workspace.mjs` with inline compare-
offers coverage, explicit tracker handoff assertions, and selectors that
match the new workflows-surface rendering instead of the former dedicated-
detail placeholder flow.

### Task T017 - Research-specialist smoke coverage

**Started**: 2026-04-22 20:38
**Completed**: 2026-04-22 20:56
**Duration**: 18 minutes

Extended `scripts/test-app-specialist-workspace.mjs` with LinkedIn outreach
manual-send assertions, deep-research review checks, stale-selection
recovery, and workflow-mode fixtures that match the new inline narrative
review routes.

### Task T018 - Shell smoke and quick-regression coverage

**Started**: 2026-04-22 20:42
**Completed**: 2026-04-22 20:57
**Duration**: 15 minutes

Updated `scripts/test-app-shell.mjs` to align compare-offers shell fixtures
with the typed specialist-workspace contract and extended `scripts/test-
all.mjs` so the new inline review files participate in ASCII validation and
quick-regression coverage.

### Task T019 - Validation gate

**Started**: 2026-04-22 20:49
**Completed**: 2026-04-22 20:59
**Duration**: 10 minutes

Ran `npm run app:web:check`, `npm run app:web:build`, `node
scripts/test-app-specialist-workspace.mjs`, `node scripts/test-app-shell.mjs`,
and `node scripts/test-all.mjs --quick`; all passed after fixing the
`use-specialist-review.ts` effect dependency loop that caused a React
maximum-update-depth failure on the workflows surface.

## Task Log

### [2026-04-22] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

**Notes**:

- Local `.spec_system/scripts/` copies were absent, so the session used the bundled `apex-spec` fallback scripts for deterministic state and prereq checks.

---
