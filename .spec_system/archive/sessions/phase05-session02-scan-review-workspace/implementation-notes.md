# Implementation Notes

**Session ID**: `phase05-session02-scan-review-workspace`
**Package**: `apps/web`
**Started**: 2026-04-22 11:43
**Last Updated**: 2026-04-22 12:19

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 19 / 19 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

### Task T001 - Create strict scan-review payload parsers and enums

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Added the browser-owned scan-review contract module with strict parser helpers for summary, action, and API error payloads.
- Kept enum parsing fail-closed so scan bucket, warning, selection, action, and run-state drift surfaces immediately.

**Files Changed**:

- `apps/web/src/scan/scan-review-types.ts` - Added strict scan-review payload types and parser helpers for bounded browser consumption.

---

### Task T003 - Register the scan shell surface and placeholder seams

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Added `scan` to the shell registry so navigation, hash parsing, and surface lookup stay exhaustive before the real workspace mounts.
- Updated navigation copy and badges to acknowledge scan readiness and live scan workflow activity without widening the shell summary contract.

**Files Changed**:

- `apps/web/src/shell/shell-types.ts` - Registered the scan surface in the canonical shell definition list.
- `apps/web/src/shell/navigation-rail.tsx` - Added scan badge handling and updated shell copy for the new workspace.
- `apps/web/src/shell/surface-placeholder.tsx` - Added the scan placeholder branch to keep shell rendering exhaustive.

---

### Task T002 - Create scan-review client scaffolding and shared chat focus helpers

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Added scan-review focus parsing and sync helpers, bounded summary fetching, action POST handling, and shared orchestration launch wrapping in a dedicated browser client module.
- Moved chat session URL focus reads and writes into `chat-console-client.ts`, then updated the chat hook to consume the shared helper and react to external focus events.

**Files Changed**:

- `apps/web/src/scan/scan-review-client.ts` - Added scan-review endpoint, action, orchestration, and URL-focus helpers with retry-aware summary fetching.
- `apps/web/src/chat/chat-console-client.ts` - Exported reusable chat-session focus helpers for cross-surface handoff.
- `apps/web/src/chat/use-chat-console.ts` - Reused the shared focus helpers and listened for external chat focus changes.

---

### Task T004 - Create the scan-review state hook

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Added the scan workspace hook with summary loading, polling, focus-event handling, action notices, and in-flight request guards.
- Built stale-selection recovery into the hook so invalid selected URLs are cleared from the query state instead of persisting hidden client-only state.

**Files Changed**:

- `apps/web/src/scan/use-scan-review.ts` - Added the scan workspace state machine and action handlers.

**BQC Fixes**:

- `Resource cleanup`: Aborted in-flight fetches and cleared polling listeners or timers on scope exit (`apps/web/src/scan/use-scan-review.ts`).
- `Duplicate action prevention`: Guarded scan launch, ignore or restore, evaluate, and batch actions while a request is in flight (`apps/web/src/scan/use-scan-review.ts`).
- `State freshness on re-entry`: Re-read URL focus on external focus changes and cleared missing selections back to canonical URL state (`apps/web/src/scan/use-scan-review.ts`).

---

### Task T005 - Create the launch panel

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Added a dedicated launch and run-status panel with launcher readiness, bounded run counters, session-scope controls, and explicit loading or offline states.
- Kept degraded and approval-paused runs visually explicit so later handoff work can build on the same run-state surface.

**Files Changed**:

- `apps/web/src/scan/scan-review-launch-panel.tsx` - Added the launcher readiness and active-run presentation surface.

---

### Task T006 - Create shortlist card rendering

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Added shortlist metrics, bucket filters, ignored visibility toggle, pagination controls, and accessible card selection states.
- Kept duplicate hints, pending overlap, and warning chips explicit on each candidate card.

**Files Changed**:

- `apps/web/src/scan/scan-review-shortlist.tsx` - Added the shortlist review grid and filter controls.

**BQC Fixes**:

- `Accessibility and platform compliance`: Used native buttons with `aria-pressed` states for filters and shortlist-card selection (`apps/web/src/scan/scan-review-shortlist.tsx`).

---

### Task T007 - Create the selected-detail action shelf

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Added the selected-role shelf with warning presentation, ignore or restore affordances, and evaluation or batch launch buttons.
- Kept the ignore or restore action disabled until the selected row is anchored to a concrete scan session, which preserves the backend-owned mutation boundary.

**Files Changed**:

- `apps/web/src/scan/scan-review-action-shelf.tsx` - Added selected-detail rendering, notices, and follow-through action controls.

**BQC Fixes**:

- `State freshness on re-entry`: The shelf falls back to explicit empty or unavailable copy when no selected row is present instead of carrying stale detail forward (`apps/web/src/scan/scan-review-action-shelf.tsx`).

---

### Task T008 - Compose the scan surface and mount it in the shell

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:43
**Duration**: 0 minutes

**Notes**:

- Composed the scan workspace from the launcher, shortlist, and action shelf, and exposed an explicit shell callback for scan-to-chat handoff.
- Mounted the new surface inside `operator-shell.tsx` using the same shell-routing seam the other workspaces already use.

**Files Changed**:

- `apps/web/src/scan/scan-review-surface.tsx` - Added the composed scan workspace surface and shell-facing chat callback seam.
- `apps/web/src/shell/operator-shell.tsx` - Mounted the scan workspace and wired scan-to-chat focus handoff.

**BQC Fixes**:

- `Failure path completeness`: The composed surface keeps offline and parse-failure warnings visible even when the last scan snapshot remains on screen (`apps/web/src/scan/scan-review-surface.tsx`).

---

### Task T009 - Implement URL-backed scan focus

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:44
**Duration**: 1 minute

**Notes**:

- Added canonical query parsing and sync for scan bucket, include-ignored state, page offset, selected URL, and optional session scope.
- Kept URL normalization bounded so invalid offsets or malformed URLs fail closed back to safe defaults.

**Files Changed**:

- `apps/web/src/scan/scan-review-client.ts` - Added scan focus parsing, validation, and URL synchronization helpers.

---

### Task T010 - Implement summary loading and stale-selection recovery

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:44
**Duration**: 1 minute

**Notes**:

- Added summary loading with refresh and online recovery plus missing-selection cleanup back to canonical query state.
- Preserved the last successful payload during refresh so the scan workspace stays readable while a new summary is loading.

**Files Changed**:

- `apps/web/src/scan/use-scan-review.ts` - Added summary loading, refresh recovery, and missing-selection reconciliation.

**BQC Fixes**:

- `Failure path completeness`: Offline and parse failures stay visible in state instead of silently dropping the last summary (`apps/web/src/scan/use-scan-review.ts`).

---

### Task T011 - Implement shared scan launch handling

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:44
**Duration**: 1 minute

**Notes**:

- Wired scan launch through the shared orchestration route rather than introducing a scan-only launcher contract.
- Re-scoped the scan workspace to the launched or resumed scan session after a successful launch so review state stays deterministic.

**Files Changed**:

- `apps/web/src/scan/scan-review-client.ts` - Wrapped shared orchestration launches for the scan surface.
- `apps/web/src/scan/use-scan-review.ts` - Added scan launch action handling and scope updates.
- `apps/web/src/scan/scan-review-launch-panel.tsx` - Added the scan launch button and guarded states.

**BQC Fixes**:

- `Duplicate action prevention`: Blocked repeated scan launches while a launch request or refresh is already in flight (`apps/web/src/scan/use-scan-review.ts`).

---

### Task T012 - Implement ignore or restore mutations and notices

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:44
**Duration**: 1 minute

**Notes**:

- Wired ignore or restore mutations through the backend action route and surfaced explicit success notices in the selected-detail rail.
- Cleared selection when an ignored row would fall out of the active view, which keeps the workspace from holding hidden selection state.

**Files Changed**:

- `apps/web/src/scan/scan-review-client.ts` - Added scan action POST handling.
- `apps/web/src/scan/use-scan-review.ts` - Added ignore or restore execution, notices, and revalidation logic.
- `apps/web/src/scan/scan-review-shortlist.tsx` - Added shortlist affordances and visibility cues.
- `apps/web/src/scan/scan-review-action-shelf.tsx` - Added ignore or restore controls and notice rendering.

**BQC Fixes**:

- `Duplicate action prevention`: Guarded ignore or restore actions while another mutation is already running (`apps/web/src/scan/use-scan-review.ts`).
- `State freshness on re-entry`: Cleared hidden selected URLs after ignore actions when the current view excludes ignored rows (`apps/web/src/scan/use-scan-review.ts`).

---

### Task T013 - Implement warning and dedup presentation

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:44
**Duration**: 1 minute

**Notes**:

- Rendered duplicate-heavy, pending-overlap, already-ignored, approval-paused, degraded, and stale-selection states as explicit UI labels instead of browser inference.
- Kept run-state warnings separated from shortlist warnings so the operator can distinguish scan-run issues from candidate-level issues.

**Files Changed**:

- `apps/web/src/scan/scan-review-launch-panel.tsx` - Added run-state warning presentation and degraded-state styling.
- `apps/web/src/scan/scan-review-shortlist.tsx` - Added candidate warning chips and duplicate context rendering.
- `apps/web/src/scan/scan-review-action-shelf.tsx` - Added selected-role warning badges and duplicate context detail.

---

### Task T014 - Implement single-evaluation handoff

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:44
**Duration**: 1 minute

**Notes**:

- Reused the backend-provided evaluate context from the scan contract and launched the next workflow through the shared orchestration route.
- Routed successful launches back into the chat surface through the shared shell callback so the operator lands on the launched session instead of a scan-local pseudo-workflow.

**Files Changed**:

- `apps/web/src/scan/scan-review-client.ts` - Reused the shared orchestration client for evaluation handoff.
- `apps/web/src/scan/use-scan-review.ts` - Added evaluation launch handling with in-flight guards.
- `apps/web/src/shell/operator-shell.tsx` - Added the scan-to-chat shell handoff seam.

**BQC Fixes**:

- `Duplicate action prevention`: Blocked repeated evaluation launches while any scan action is active (`apps/web/src/scan/use-scan-review.ts`).

---

### Task T015 - Implement batch-seed handoff

**Started**: 2026-04-22 11:43
**Completed**: 2026-04-22 11:44
**Duration**: 1 minute

**Notes**:

- Passed the backend-owned batch-seed payload through the shared orchestration route instead of creating a browser-owned batch-launch contract.
- Returned successful batch launches to chat so the scan surface remains a launcher and review workspace, not a temporary batch supervisor.

**Files Changed**:

- `apps/web/src/scan/scan-review-client.ts` - Reused the shared orchestration path for batch-evaluation launch.
- `apps/web/src/scan/use-scan-review.ts` - Added batch-seed launch handling with in-flight guards.
- `apps/web/src/scan/scan-review-action-shelf.tsx` - Added the batch-seed action control.
- `apps/web/src/shell/operator-shell.tsx` - Reused the shared chat handoff seam for batch launches.

**BQC Fixes**:

- `Duplicate action prevention`: Blocked repeated batch-seed launches while another scan action is still in flight (`apps/web/src/scan/use-scan-review.ts`).

---

### Task T016 - Create dedicated scan smoke coverage

**Started**: 2026-04-22 11:44
**Completed**: 2026-04-22 12:19
**Duration**: 35 minutes

**Notes**:

- Added a dedicated browser smoke harness for the shell-mounted scan workspace covering ready, loading, empty, warning, ignore or restore, evaluation handoff, batch handoff, offline, and error states.
- Kept the fake API bounded to the same scan-review and orchestration shapes used by the browser contract so the smoke test exercises the typed client seams.

**Files Changed**:

- `scripts/test-app-scan-review.mjs` - Added the dedicated scan review smoke harness.

---

### Task T017 - Extend shell smoke coverage for scan navigation and chat handoff

**Started**: 2026-04-22 11:44
**Completed**: 2026-04-22 12:19
**Duration**: 35 minutes

**Notes**:

- Extended the shell smoke harness with a scan navigation leg and a scan-to-chat evaluation handoff assertion.
- Added minimal scan and orchestration fixtures so the shell test now covers the new workspace without duplicating the dedicated scan smoke breadth.

**Files Changed**:

- `scripts/test-app-shell.mjs` - Added scan workspace fixtures plus scan navigation and chat handoff assertions.

---

### Task T018 - Update quick regression and ASCII coverage

**Started**: 2026-04-22 11:44
**Completed**: 2026-04-22 12:19
**Duration**: 35 minutes

**Notes**:

- Added the dedicated scan smoke script to the quick regression suite.
- Extended the ASCII allowlist to cover the new scan workspace modules and smoke harness.

**Files Changed**:

- `scripts/test-all.mjs` - Added scan smoke execution and ASCII coverage entries for the new deliverables.

---

### Task T019 - Run required validation commands

**Started**: 2026-04-22 11:44
**Completed**: 2026-04-22 12:19
**Duration**: 35 minutes

**Notes**:

- Required validation set completed cleanly after tightening chat-focus event dispatch to avoid self-induced regression churn.
- Final command set: `npm run app:web:check`, `npm run app:web:build`, `node scripts/test-app-scan-review.mjs`, `node scripts/test-app-shell.mjs`, and `node scripts/test-all.mjs --quick`.

**Files Changed**:

- `apps/web/src/chat/chat-console-client.ts` - Limited chat focus event dispatch to actual URL changes so existing smoke suites stay stable alongside the new scan handoffs.

**BQC Fixes**:

- `State freshness on re-entry`: Avoided redundant chat-focus events when the session URL did not change, which eliminated spurious reload behavior across existing shell surfaces (`apps/web/src/chat/chat-console-client.ts`).

---

## Task Log

### [2026-04-22] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---
