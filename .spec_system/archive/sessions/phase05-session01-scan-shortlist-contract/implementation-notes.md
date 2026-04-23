# Implementation Notes

**Session ID**: `phase05-session01-scan-shortlist-contract`
**Package**: `apps/api`
**Started**: 2026-04-22 10:47
**Last Updated**: 2026-04-22 11:22

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 18 / 18 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### Task T018 - Final verification pass

**Started**: 2026-04-22 11:18
**Completed**: 2026-04-22 11:22
**Duration**: 4 minutes

**Notes**:

- Ran the full session verification stack end to end: `npm run app:api:check`,
  `npm run app:api:test:runtime`, `npm run app:api:build`, and
  `node scripts/test-all.mjs --quick`.
- Confirmed the new scan-review runtime path passes in the API suite and the
  repo quick gate finished with `415 passed, 0 failed, 0 warnings`, including
  ASCII validation for the new scan-review files.

**Files Changed**:

- `.spec_system/specs/phase05-session01-scan-shortlist-contract/tasks.md` -
  marked the session complete after verification
- `.spec_system/specs/phase05-session01-scan-shortlist-contract/implementation-notes.md` -
  recorded the completed verification pass

### Task T017 - Quick regression and ASCII coverage

**Started**: 2026-04-22 11:16
**Completed**: 2026-04-22 11:18
**Duration**: 2 minutes

**Notes**:

- Added the new scan-review server files to the quick-suite ASCII validation
  list so the session deliverables are checked with the rest of the operator
  app surfaces.
- Increased the aggregate quick-suite bootstrap smoke timeout to 60 seconds
  after the repo-level run exposed timeout sensitivity under full test load;
  the standalone bootstrap smoke behavior remained unchanged.

**Files Changed**:

- `scripts/test-all.mjs` - added scan-review ASCII coverage and stabilized the
  bootstrap smoke timeout under the aggregate quick suite

**Out-of-Scope Files**:

- `scripts/test-all.mjs` - repo-level regression coverage is required even
  though the declared package is `apps/api`

### Task T016 - HTTP runtime-contract coverage

**Started**: 2026-04-22 11:12
**Completed**: 2026-04-22 11:16
**Duration**: 4 minutes

**Notes**:

- Extended the HTTP runtime suite to cover empty summaries, ignore or restore
  mutations, approval-paused runs, degraded runs, and invalid GET or POST
  input handling.
- Kept the route assertions pinned to the public payload shape so the API
  contract stays stable for Session 02 browser work.

**Files Changed**:

- `apps/api/src/server/http-server.test.ts` - added end-to-end scan-review
  route coverage across empty, active, paused, degraded, and invalid states

### Task T015 - Summary parsing and runtime composition tests

**Started**: 2026-04-22 11:12
**Completed**: 2026-04-22 11:16
**Duration**: 4 minutes

**Notes**:

- Added summary tests for missing shortlist data, scan-history joins,
  ignored-candidate filtering, selected-detail resolution, approval-paused
  state, and degraded result handling.
- Widened the API runtime test glob so the server summary suite runs inside
  `npm run app:api:test:runtime` instead of relying on ad hoc invocation.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.test.ts` - added summary coverage
  for shortlist parsing, dedup signals, ignore filtering, and runtime states
- `apps/api/package.json` - expanded the runtime-contract test glob to include
  all server test files

### Task T014 - Selected-detail and follow-through reconciliation

**Started**: 2026-04-22 11:06
**Completed**: 2026-04-22 11:10
**Duration**: 4 minutes

**Notes**:

- Reconciled selected candidate detail so visible, ignored, missing, and
  stale selections return explicit states instead of forcing the browser to
  infer what happened from raw shortlist text.
- Attached evaluate and batch-seed handoff metadata directly to the selected
  and preview candidate shapes so later browser flows can route follow-through
  work without re-parsing repo files.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - completed selected-detail,
  stale-selection, and follow-through payload composition

### Task T013 - Launcher and run-state reconciliation

**Started**: 2026-04-22 11:06
**Completed**: 2026-04-22 11:10
**Duration**: 4 minutes

**Notes**:

- Reconciled startup diagnostics with the latest or selected `scan-portals`
  session, active jobs, approvals, and completed results so launcher state and
  last-run context stay backend-owned.
- Preserved company filters, `compareClean`, dry-run flags, summary counts,
  and degraded-result messages from the typed scan workflow payload or result.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - mapped launcher readiness and
  scan runtime state into the public scan-review payload

### Task T012 - POST ignore or restore actions

**Started**: 2026-04-22 11:07
**Completed**: 2026-04-22 11:14
**Duration**: 7 minutes

**Notes**:

- Implemented POST handling for ignore or restore intents with JSON-body
  validation, selected-candidate existence checks, session validation, and
  idempotent visibility updates.
- Added explicit `409 scan-review-action-in-flight` handling to prevent
  duplicate submissions against the same session plus URL while a mutation is
  already running.

**Files Changed**:

- `apps/api/src/server/routes/scan-review-action-route.ts` - implemented the
  mutation route, in-flight protection, session persistence, and explicit
  error mapping

**BQC Fixes**:

- Duplicate action prevention: guarded session-plus-URL mutations with an
  in-flight action set and deterministic cleanup in `finally`
  (`apps/api/src/server/routes/scan-review-action-route.ts`)
- Trust boundary enforcement: validated POST request bodies with `zod` and
  rejected missing or invalid scan-session targets before writing state
  (`apps/api/src/server/routes/scan-review-action-route.ts`)

### Task T011 - GET scan-review query handling

**Started**: 2026-04-22 11:00
**Completed**: 2026-04-22 11:02
**Duration**: 2 minutes

**Notes**:

- Implemented bounded query parsing for session focus, bucket filters,
  selected URL, pagination, and ignored-candidate visibility flags.
- Mapped summary input failures into the explicit
  `invalid-scan-review-query` error contract instead of leaking parser or
  store details through generic failures.

**Files Changed**:

- `apps/api/src/server/routes/scan-review-route.ts` - implemented GET query
  validation and summary error mapping

### Task T010 - Warning classification

**Started**: 2026-04-22 11:10
**Completed**: 2026-04-22 11:14
**Duration**: 4 minutes

**Notes**:

- Classified shortlist warnings for duplicate-heavy companies,
  already-pending URLs, already-ignored candidates, stale selections,
  approval-paused runs, and degraded scan results.
- Split run warnings from shortlist warnings in the contract so typed scan
  workflow result warnings can flow through without collapsing them into the
  shortlist-only warning enum.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - added shortlist and run
  warning classification
- `apps/api/src/server/scan-review-contract.ts` - widened run-warning typing
  while keeping shortlist warnings exhaustive

### Task T009 - Bounded shortlist payload composition

**Started**: 2026-04-22 11:10
**Completed**: 2026-04-22 11:12
**Duration**: 2 minutes

**Notes**:

- Implemented empty-state handling for missing shortlist files or sections,
  bounded preview pagination, include-ignored filtering, and deterministic
  selected-detail fallback behavior.
- Kept the response browser-ready by returning list-plus-detail state and
  summary messaging instead of raw markdown excerpts.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - completed empty-state,
  visibility-filter, pagination, and summary-message handling

### Task T008 - Evaluate and batch-seed handoff metadata

**Started**: 2026-04-22 11:02
**Completed**: 2026-04-22 11:10
**Duration**: 8 minutes

**Notes**:

- Added explicit evaluate and batch-seed handoff payloads plus ignore or
  restore action metadata to the scan-review contract so later app surfaces
  can launch follow-through work without rebuilding candidate state.
- Threaded the handoff metadata through every shortlist preview and selected
  candidate record generated by the summary builder.

**Files Changed**:

- `apps/api/src/server/scan-review-contract.ts` - added follow-through and
  ignore-action payload types
- `apps/api/src/server/scan-review-summary.ts` - populated evaluate,
  batch-seed, and ignore-action metadata per candidate

### Task T007 - Session-scoped ignore or restore persistence

**Started**: 2026-04-22 11:07
**Completed**: 2026-04-22 11:12
**Duration**: 5 minutes

**Notes**:

- Added shared helpers to read and write ignored shortlist URLs under a
  namespaced `scanReview` session-context key so review state stays in the
  operational store instead of mutating user-layer files.
- Kept ignore or restore behavior idempotent by preserving already-hidden and
  already-visible responses while still returning the canonical action result
  payload.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - added session-context helpers
  for ignored shortlist URLs
- `apps/api/src/server/routes/scan-review-action-route.ts` - persisted ignored
  URL state in the scan session context

### Task T006 - Scan runtime-state summarization

**Started**: 2026-04-22 11:02
**Completed**: 2026-04-22 11:10
**Duration**: 8 minutes

**Notes**:

- Implemented runtime-state summarization for idle, queued, running,
  approval-paused, completed, and degraded scan states by reading sessions,
  jobs, approvals, and typed scan results from the operational store.
- Exposed active job IDs, approval IDs, timestamps, run counts, filters, and
  last-run messaging through one stable summary payload.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - mapped operational-store scan
  state into the public run summary

### Task T005 - Scan-history joins

**Started**: 2026-04-22 11:02
**Completed**: 2026-04-22 11:08
**Duration**: 6 minutes

**Notes**:

- Parsed `data/scan-history.tsv` into exact-URL and company-level indexes to
  surface first-seen freshness, duplicate density, prior-seen context, and
  pending-queue overlap for shortlist candidates.
- Kept duplicate hints deterministic by normalizing URLs and company keys
  before joining shortlist candidates to history rows.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - added scan-history parsing,
  indexing, freshness classification, and duplicate-hint composition

### Task T004 - Pipeline shortlist parsing

**Started**: 2026-04-22 11:02
**Completed**: 2026-04-22 11:08
**Duration**: 6 minutes

**Notes**:

- Implemented parsing for the `## Shortlist` and `## Pending` sections of
  `data/pipeline.md`, including campaign guidance, last-refreshed metadata,
  bucket counts, ranked candidate previews, and pending queue overlap inputs.
- Kept parsing bounded and deterministic by normalizing markdown sections,
  rejecting malformed candidate rows, and preserving canonical shortlist order.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - added shortlist and pending
  section parsing plus canonical shortlist metadata extraction

### 2026-04-22 - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T001 - Create typed scan-review payloads

**Started**: 2026-04-22 10:47
**Completed**: 2026-04-22 10:54
**Duration**: 7 minutes

**Notes**:

- Added the canonical scan-review enums and payload types for launcher, run
  state, shortlist candidates, selected detail, warnings, and ignore or
  restore actions.
- Kept evaluate and batch-seed handoff data backend-owned so later browser
  work can route actions without parsing repo files or inventing ad hoc
  payloads.

**Files Changed**:

- `apps/api/src/server/scan-review-contract.ts` - Added the typed scan-review
  contract used by the summary builder, routes, and tests.

### Task T002 - Create scan-review summary scaffolding

**Started**: 2026-04-22 10:54
**Completed**: 2026-04-22 11:02
**Duration**: 8 minutes

**Notes**:

- Added the scan-review summary module with bounded filters, shortlist parsing,
  scan-history indexing, candidate warning classification, selected-detail
  handling, and scan-session runtime composition.
- Exported session-context helpers for reading and writing ignored shortlist
  URLs so the mutation route can share one backend-owned context shape.

**Files Changed**:

- `apps/api/src/server/scan-review-summary.ts` - Added the scan-review summary
  builder, shortlist and scan-history parsers, candidate mappers, and session
  context helpers.

### Task T003 - Create GET and POST scan-review routes

**Started**: 2026-04-22 11:00
**Completed**: 2026-04-22 11:02
**Duration**: 2 minutes

**Notes**:

- Added the GET route with query validation and explicit summary-input error
  mapping, plus the POST route for backend-owned ignore or restore actions.
- Registered the new routes in deterministic order and guarded scan-review
  mutations against duplicate in-flight submissions on the same session plus
  candidate URL.

**Files Changed**:

- `apps/api/src/server/routes/scan-review-route.ts` - Added the GET scan-review
  route and query validation.
- `apps/api/src/server/routes/scan-review-action-route.ts` - Added the POST
  ignore or restore route with in-flight protection and session-context writes.
- `apps/api/src/server/routes/index.ts` - Registered the scan-review routes.
