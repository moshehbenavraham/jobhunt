# Session Specification

**Session ID**: `phase05-session04-batch-jobs-workspace-and-run-detail`
**Phase**: 05 - Scan, Batch, and Application-Help Parity
**Status**: Completed
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 05 Session 03 established the backend-owned batch-supervisor contract,
but the operator shell still has no dedicated way to supervise batch work.
Today batch draft state, run progress, failed items, closeout readiness, and
approval pauses all exist behind the API, yet the browser cannot review or act
on them from one stable surface. That leaves a major parity gap in the app's
highest-value async workflow.

This session adds the missing batch workspace in `apps/web`. The browser
should consume the bounded `/batch-supervisor` summary, render draft and
run-state context, show a filterable item matrix, and keep one selected-item
detail rail visible for warnings, artifacts, and next actions. The workspace
must stay thin: it reads typed API payloads, syncs focus in the URL, and calls
explicit backend actions instead of inferring workflow state or touching repo
files directly.

The action path matters as much as the presentation. Resume, retry, merge, and
verify controls should remain backend-owned, while the browser handles clear
feedback, in-flight guards, and handoff to the existing artifact, tracker,
approval, and chat surfaces. Once this session lands, Phase 05 can finish
application-help on top of a complete scan-plus-batch operator shell instead
of falling back to legacy review paths.

---

## 2. Objectives

1. Add a typed batch workspace that renders draft readiness, run status,
   bounded item-matrix data, selected-item detail, closeout guidance, and
   action availability from the Session 03 API contract.
2. Add URL-backed batch focus, polling, and stale-selection recovery so item
   selection, status filters, and re-entry stay deterministic across refreshes
   and shell navigation.
3. Keep resume, retry, merge, and verify controls explicit in the browser
   while preserving backend ownership, duplicate-submit guards, and warning
   feedback from the action route.
4. Add browser smoke coverage for approval-paused, retryable-failed,
   merge-blocked, completed, and offline batch supervision flows so later
   specialist sessions build on a stable shell surface.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell registry and navigation frame this workspace must extend.
- [x] `phase03-session02-chat-console-and-session-resume` - provides the
      chat handoff path for active or resumed batch sessions.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      approval surface this workspace should target when batch runs pause.
- [x] `phase04-session03-report-viewer-and-artifact-browser` - provides the
      artifact viewer handoff path for report and PDF review.
- [x] `phase04-session05-tracker-workspace-and-integrity-actions` - provides
      the tracker closeout surface and action vocabulary this workspace should
      reuse.
- [x] `phase05-session03-batch-supervisor-contract` - provides the canonical
      summary and action contract this session must consume without changing
      ownership.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic browser contracts,
  no-new-dependency expectations, and repo-level validation gates
- `.spec_system/CONSIDERATIONS.md` for bounded payloads, thin-browser rules,
  URL-backed focus cleanup, and shared handoff-routing expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  requirement to keep repo reads and sensitive actions backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_05/PRD_phase_05.md` for Phase 05 batch-management
  requirements and the operator flow for supervising many items
- `apps/api/src/server/batch-supervisor-contract.ts`,
  `apps/api/src/server/batch-supervisor-summary.ts`, and the
  `/batch-supervisor` routes for the bounded batch payload and action shapes
- `apps/web/src/scan/`, `apps/web/src/tracker/`, `apps/web/src/reports/`,
  `apps/web/src/approvals/`, and `apps/web/src/shell/` for browser parsing,
  URL focus, handoff seams, and surface composition patterns already used
- `scripts/test-app-shell.mjs` and the existing Playwright smoke harness for
  browser-level regression coverage

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- Playwright Chromium available for `scripts/test-app-batch-workspace.mjs`
  and `scripts/test-app-shell.mjs`
- Existing quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add a dedicated batch workspace inside the operator shell with draft
  readiness, run summary, item-matrix review, selected-detail context, and
  explicit resume, retry, merge, and verify controls.
- Consume the bounded `/batch-supervisor` GET payload and action route through
  strict browser parsers, URL-backed item focus, and polling behavior tied to
  queued, running, and approval-paused states.
- Surface retryable failures, partial results, missing artifacts, closeout
  warnings, and approval-paused runs without browser-side repo parsing or
  workflow inference.
- Reuse existing shell handoffs so operators can open approvals, report
  artifacts, tracker closeout, or chat run context directly from batch review.
- Add browser smoke coverage for ready, approval-paused, retryable-failed,
  merge-blocked, completed, and offline batch-workspace flows.

### Out of Scope (Deferred)

- Editing or composing new `batch/batch-input.tsv` rows in the browser -
  _Reason: this session supervises the canonical draft and run state, not
  draft authoring._
- Changes to the batch-supervisor server contract beyond browser-consumption
  needs - _Reason: Session 03 already owns the backend contract._
- Direct browser writes to batch files, tracker files, or other repo artifacts -
  _Reason: repo mutations remain backend-owned and fail closed._
- Application-help launch or review UX -
  _Reason: Sessions 05 and 06 own that workflow._
- Dashboard replacement or generic specialist routing -
  _Reason: those are Phase 06 concerns._

---

## 5. Technical Approach

### Architecture

Create a new `apps/web/src/batch/` package that mirrors the scan and tracker
workspace structure: one strict contract parser, one browser client, one
state hook, and a composed surface with smaller presentation panels. The
client should fetch the bounded batch summary, parse only declared fields, and
keep selection in the URL through batch-specific query parameters for
selected item, status filter, and offset. Polling should remain active only
while the run is queued, running, or approval-paused, or when an action
response requests short revalidation.

The workspace should present three coordinated areas. A run panel shows draft
readiness, run progress, closeout status, and top-level actions. An item
matrix shows bounded rows, status filters, retryable or warning state, and
selection. A detail rail shows the selected batch item, artifact links,
warning context, and next-step controls without widening the browser trust
boundary.

Workflow ownership stays shared with the rest of the shell. The batch
workspace should not invent a new orchestration path or browser-owned repo
mutation layer. Instead it should call the batch-supervisor action route,
apply in-flight guards, honor revalidation hints, and reuse existing shell
callbacks to open report review, tracker closeout, approval context, or chat
session focus when the operator needs deeper follow-through.

### Design Patterns

- Strict browser parsing: treat the batch-supervisor contract as the only
  source of item, warning, and action truth
- URL-backed list-plus-detail focus: keep item selection and filters
  recoverable across refresh, re-entry, and shell navigation
- Thin browser surface: keep resume, retry, merge, verify, and repo access
  behind backend routes
- Shared shell handoff path: reuse existing artifact, tracker, approval, and
  chat navigation seams instead of duplicating review flows
- Responsive matrix-plus-detail composition: keep warnings and action context
  visible without hiding selected-item state on narrower screens

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing browser fetch helpers, `AbortController`, and URL focus patterns
- Existing shell registry and cross-surface focus helpers
- Existing Playwright smoke-test harness
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                 | Purpose                                                                                            | Est. Lines |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/batch/batch-workspace-types.ts`        | Define strict parser helpers and typed batch-workspace payloads for the browser                    | ~340       |
| `apps/web/src/batch/batch-workspace-client.ts`       | Fetch batch summaries, submit action requests, apply revalidation hints, and sync URL-backed focus | ~360       |
| `apps/web/src/batch/use-batch-workspace.ts`          | Coordinate batch refresh, polling, selection, action notices, and stale-selection recovery         | ~340       |
| `apps/web/src/batch/batch-workspace-run-panel.tsx`   | Render draft readiness, run state, closeout warnings, and top-level batch actions                  | ~260       |
| `apps/web/src/batch/batch-workspace-item-matrix.tsx` | Render status filters, bounded batch rows, warning badges, selection, and pagination               | ~320       |
| `apps/web/src/batch/batch-workspace-detail-rail.tsx` | Render selected item detail, artifact links, warning context, and cross-surface handoff controls   | ~320       |
| `apps/web/src/batch/batch-workspace-surface.tsx`     | Compose the full batch workspace layout and shell-facing interaction seams                         | ~280       |
| `scripts/test-app-batch-workspace.mjs`               | Browser smoke coverage for batch review, action controls, and cross-surface handoffs               | ~360       |

### Files to Modify

| File                                         | Changes                                                                                  | Est. Lines |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/shell/shell-types.ts`          | Register the batch surface in the shell registry and keep surface parsing exhaustive     | ~40        |
| `apps/web/src/shell/navigation-rail.tsx`     | Add batch navigation copy and a readiness-aware badge                                    | ~50        |
| `apps/web/src/shell/surface-placeholder.tsx` | Keep placeholder handling exhaustive after the batch surface is added                    | ~40        |
| `apps/web/src/shell/operator-shell.tsx`      | Mount the batch workspace and wire report, tracker, approval, and chat handoff callbacks | ~120       |
| `scripts/test-app-shell.mjs`                 | Extend shell smoke coverage for batch navigation and batch-to-shell handoff paths        | ~220       |
| `scripts/test-all.mjs`                       | Add batch-workspace smoke and ASCII coverage to the quick regression suite               | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operators can open a dedicated batch workspace in the shell, review the
      current draft and latest run state, and supervise batch items without
      opening raw repo artifacts.
- [ ] Retryable failures, partial results, missing artifacts, approval-paused
      runs, and merge-blocked closeout states remain explicit and actionable
      in the browser.
- [ ] Resume, retry, merge, and verify controls stay backend-owned, surface
      clear action feedback, and prevent duplicate submissions while requests
      are in flight.
- [ ] Operators can move from batch review into report viewer, tracker
      workspace, approvals, or chat context without losing item focus or
      workflow clarity.

### Testing Requirements

- [ ] Browser smoke coverage covers ready, approval-paused, retryable-failed,
      merge-blocked, completed, and offline batch-workspace flows.
- [ ] Shell smoke coverage covers batch navigation plus report, tracker,
      approvals, and chat handoffs from the batch surface.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `node scripts/test-app-batch-workspace.mjs`,
      `node scripts/test-app-shell.mjs`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Browser code never reads `batch/` files directly for batch supervision.
- [ ] Batch payloads remain bounded by API-provided limits and one selected
      detail record rather than full draft dumps or raw log reads.
- [ ] URL-backed item focus survives refresh and re-entry with stale-selection
      recovery instead of hidden browser-only state.
- [ ] Action controls reset or revalidate correctly after repeated entry into
      the same selected item or after a new batch summary arrives.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Session 03 already exposes action availability and revalidation hints. The
  browser should consume those values directly instead of rebuilding action
  policy from run state or item warnings.
- The shell already owns stable handoff seams for chat, approvals, reports,
  and tracker review. Batch should reuse those seams instead of inventing
  surface-specific navigation logic.
- Batch item detail can reflect missing report, PDF, or tracker artifacts
  even for completed rows. Keep those warnings visible rather than collapsing
  them into generic completed state.

### Potential Challenges

- Polling and action revalidation can race on fast state changes:
  centralize fetch and in-flight guard logic in the batch hook and honor
  server-provided revalidation timing.
- Selected items can become stale after filters change or new results arrive:
  show explicit stale-selection messaging and recover to a safe URL focus.
- Dense warning and artifact context can overcrowd smaller layouts:
  keep the detail rail responsive while preserving the selected item, notices,
  and next-action controls.

### Relevant Considerations

- [P04] **Review-focus contract drift**: Keep item detail, action feedback,
  and selection state derived from the backend-owned contract instead of
  multiple browser-owned sources.
- [P04-apps/web] **URL-backed focus sync**: Preserve cleanup, refresh, and
  re-entry handling when batch adds another URL-driven review surface.
- [P04] **Bounded parity payloads**: Keep item previews capped and rely on
  one selected-detail payload instead of broader browser-side state.
- [P04] **Read-only browser boundary**: Keep repo reads, merge, and verify
  actions behind backend routes.
- [P04] **Thin browser surfaces**: Continue keeping workflow inference in API
  contracts rather than React state or ad hoc client parsing.
- [P04] **Smoke suite coverage**: Extend browser smoke coverage whenever new
  batch actions or shell handoff paths land.
- [P04] **Strict browser parsing**: Fail closed when the batch-supervisor
  payload drifts from the declared contract.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Duplicate resume, retry, merge, or verify actions while the workspace is
  already refreshing or an action is still in flight
- Stale selected-item state after filter changes, action-triggered refreshes,
  or a newly active run replaces the previously selected batch item
- Cross-surface confusion when report, tracker, approval, or chat handoffs do
  not preserve the batch context the operator was reviewing

---

## 9. Testing Strategy

### Unit Tests

- Validate batch-workspace payload parsing, focus query encoding, and action-
  response handling through deterministic fixture assertions in the browser
  smoke harness plus TypeScript exhaustiveness checks.

### Integration Tests

- Verify shell navigation, batch summary rendering, status filtering,
  selected-item recovery, action submission, and report or tracker or approval
  or chat handoffs against mocked API responses in
  `scripts/test-app-batch-workspace.mjs` and `scripts/test-app-shell.mjs`.

### Manual Testing

- Launch the app, open the batch surface, review the current draft, resume a
  pending batch, retry a retryable failure, inspect a selected item with
  missing artifacts or warnings, run merge and verify, and confirm the shell
  can open the related report, tracker row, approval, or chat context.

### Edge Cases

- Empty draft and idle runtime state
- Approval-paused runs with selected-item focus
- Retryable failures mixed with completed, partial, and skipped items
- Merge-blocked closeout with pending tracker additions
- Offline API during refresh or action submission
- Double-clicked batch controls while a prior request is still pending

---

## 10. Dependencies

### External Libraries

- `react`: existing app dependency for shell surface composition
- `typescript`: existing workspace dependency for strict parser and hook typing
- `playwright`: existing smoke-test dependency for browser regression coverage

### Other Sessions

- **Depends on**:
  `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase03-session02-chat-console-and-session-resume`,
  `phase03-session04-approval-inbox-and-human-review-flow`,
  `phase04-session03-report-viewer-and-artifact-browser`,
  `phase04-session05-tracker-workspace-and-integrity-actions`,
  `phase05-session03-batch-supervisor-contract`
- **Depended by**:
  `phase05-session05-application-help-draft-contract` indirectly, because
  Phase 05 should enter the final application-help work with scan and batch
  parity already stable

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
