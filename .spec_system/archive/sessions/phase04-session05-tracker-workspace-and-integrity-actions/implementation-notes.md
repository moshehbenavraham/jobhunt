# Implementation Notes

**Session ID**: `phase04-session05-tracker-workspace-and-integrity-actions`
**Package**: apps/web
**Started**: 2026-04-22 07:56
**Last Updated**: 2026-04-22 08:39

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 19 / 19 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### [2026-04-22] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T001 - Create typed tracker-workspace contract

**Started**: 2026-04-22 07:56
**Completed**: 2026-04-22 07:56
**Duration**: 0 minutes

**Notes**:

- Added the server-side tracker workspace contract with bounded list/detail,
  pending-addition summary, canonical status options, and action payload types.
- Kept sort, selection, warning, and action values explicit so later routes and
  browser parsers can validate payload drift deterministically.

**Files Changed**:

- `apps/api/src/server/tracker-workspace-contract.ts` - added the tracker
  workspace summary and action contract types

**Out-of-Scope Files** (files outside declared package):

- `apps/api/src/server/tracker-workspace-contract.ts` - backend support is
  required by the session spec even though the declared package is `apps/web`

### Task T002 - Create browser tracker-workspace payload types and parsers

**Started**: 2026-04-22 07:56
**Completed**: 2026-04-22 07:56
**Duration**: 0 minutes

**Notes**:

- Added the browser-side tracker workspace types, shared constants, and strict
  summary, action, and error payload parsers.
- Mirrored the server contract so the shell can fail closed on API drift
  instead of rendering partial tracker data.

**Files Changed**:

- `apps/web/src/tracker/tracker-workspace-types.ts` - added browser contract
  types and strict payload parsing helpers

### Task T003 - Create tracker-workspace client and focus helpers

**Started**: 2026-04-22 07:56
**Completed**: 2026-04-22 08:06
**Duration**: 10 minutes

**Notes**:

- Added the tracker client with URL-backed focus state, summary fetching, POST
  action helpers, and retry or timeout failure handling.
- Kept the focus parameters shell-owned through query params so filter, sort,
  offset, and selected-row state can survive refresh and report handoffs.

**Files Changed**:

- `apps/web/src/tracker/tracker-workspace-client.ts` - added tracker summary
  and action transport helpers plus URL focus utilities

### Task T004 - Create tracker table parser and line-preserving status updater

**Started**: 2026-04-22 07:57
**Completed**: 2026-04-22 08:06
**Duration**: 9 minutes

**Notes**:

- Added a tracker markdown parser with strict header validation, deterministic
  row extraction, report-link parsing, and numeric score normalization.
- Added the line-preserving status update helper so the backend can rewrite
  only the status cell for one row instead of reserializing the entire tracker.

**Files Changed**:

- `apps/api/src/server/tracker-table.ts` - added tracker parsing and
  line-preserving status update helpers

**Out-of-Scope Files** (files outside declared package):

- `apps/api/src/server/tracker-table.ts` - backend support is required by the
  session spec even though the declared package is `apps/web`

### Task T005 - Create tracker-workspace summary scaffolding

**Started**: 2026-04-22 07:58
**Completed**: 2026-04-22 08:06
**Duration**: 8 minutes

**Notes**:

- Added the tracker summary builder with bounded list/detail payloads, pending
  TSV summary, canonical status loading, validated filters, and deterministic
  sorting and pagination.
- Kept tracker missing-state handling explicit so the route can return a stable
  read model even before rows exist.

**Files Changed**:

- `apps/api/src/server/tracker-workspace-summary.ts` - added the tracker
  workspace summary builder and input validation helpers

**Out-of-Scope Files** (files outside declared package):

- `apps/api/src/server/tracker-workspace-summary.ts` - backend support is
  required by the session spec even though the declared package is `apps/web`

### Task T009 - Implement tracker enrichment and stale-selection fallbacks

**Started**: 2026-04-22 07:59
**Completed**: 2026-04-22 08:06
**Duration**: 7 minutes

**Notes**:

- Enriched tracker rows through checked-in report headers, linked PDF metadata,
  canonical status counting, and missing-artifact warning generation.
- Added stale-selection handling so detail can remain visible even when the
  selected row falls outside the active filtered page.

**Files Changed**:

- `apps/api/src/server/tracker-table.ts` - added report-path parsing and score
  helpers used during enrichment
- `apps/api/src/server/tracker-workspace-summary.ts` - added report or PDF
  enrichment, canonical status options, and stale-selection detail behavior

**Out-of-Scope Files** (files outside declared package):

- `apps/api/src/server/tracker-table.ts` - backend support is required by the
  session spec even though the declared package is `apps/web`
- `apps/api/src/server/tracker-workspace-summary.ts` - backend support is
  required by the session spec even though the declared package is `apps/web`

### Tasks T006-T014 - Wire tracker routes, tool actions, shell surface, and handoff flow

**Started**: 2026-04-22 08:06
**Completed**: 2026-04-22 08:28
**Duration**: 22 minutes

**Notes**:

- Added the GET tracker summary route, POST tracker action route, and backend
  tool wiring for status updates plus merge, verify, normalize, and dedup
  maintenance actions.
- Added the tracker hook, surface, shell registration, navigation affordance,
  and report-viewer handoff so the shell can review rows, mutate canonical
  status, and run maintenance commands without leaving the app.
- Kept route validation, in-flight action guards, stale-selection handling,
  URL-backed focus state, and warning or notice mapping explicit so the
  backend-owned tracker contract remains deterministic.

**Files Changed**:

- `apps/api/src/server/routes/index.ts` - registered the tracker summary and
  action routes
- `apps/api/src/server/routes/tracker-workspace-route.ts` - added the bounded
  GET tracker summary route and explicit query validation
- `apps/api/src/server/routes/tracker-workspace-action-route.ts` - added the
  POST tracker action route and tool-envelope error mapping
- `apps/api/src/tools/tracker-integrity-tools.ts` - added canonical status
  mutation support for existing tracker rows
- `apps/web/src/tracker/use-tracker-workspace.ts` - added tracker state,
  refresh, action, and URL-focus orchestration
- `apps/web/src/tracker/tracker-workspace-surface.tsx` - added the tracker
  review surface, status controls, maintenance buttons, and report handoff
- `apps/web/src/shell/shell-types.ts` - registered the tracker shell surface
- `apps/web/src/shell/navigation-rail.tsx` - added tracker navigation and badge
  support
- `apps/web/src/shell/surface-placeholder.tsx` - kept shell placeholder
  handling exhaustive
- `apps/web/src/shell/operator-shell.tsx` - mounted the tracker workspace
  surface into the shell frame

**Out-of-Scope Files** (files outside declared package):

- `apps/api/src/server/routes/index.ts` - backend route registration is
  required by the session spec even though the declared package is `apps/web`
- `apps/api/src/server/routes/tracker-workspace-route.ts` - backend support is
  required by the session spec even though the declared package is `apps/web`
- `apps/api/src/server/routes/tracker-workspace-action-route.ts` - backend
  support is required by the session spec even though the declared package is
  `apps/web`
- `apps/api/src/tools/tracker-integrity-tools.ts` - backend support is required
  by the session spec even though the declared package is `apps/web`

### Tasks T015-T019 - Extend coverage, smoke flows, quick regressions, and final validation

**Started**: 2026-04-22 08:28
**Completed**: 2026-04-22 08:39
**Duration**: 11 minutes

**Notes**:

- Extended tracker integrity and HTTP runtime-contract coverage for canonical
  status updates, stale selection, missing artifacts, invalid action or query
  handling, and maintenance warning pass-through.
- Added dedicated tracker workspace smoke coverage, expanded shell smoke to
  include tracker navigation and report handoff, and updated the quick suite to
  run the new smoke plus ASCII validation on tracker files.
- Fixed the runtime-contract fixture to seed canonical tracker statuses before
  the first tracker request and normalized tracker test fixtures to ASCII-only
  tracker rows so repo-level validation stays green.

**Validation**:

- `npm run app:api:check`
- `npm run app:web:check`
- `npm run app:api:test:tools`
- `npm run app:api:test:runtime`
- `node scripts/test-app-shell.mjs`
- `node scripts/test-app-tracker-workspace.mjs`
- `npm run test:quick`

**Files Changed**:

- `apps/api/src/tools/tracker-integrity-tools.test.ts` - added canonical status
  update and conflict coverage
- `apps/api/src/server/http-server.test.ts` - added tracker route contract
  coverage and seeded canonical statuses in the runtime fixture
- `scripts/test-app-shell.mjs` - extended shell smoke through the tracker
  surface and report handoff
- `scripts/test-app-tracker-workspace.mjs` - added tracker-specific smoke
  coverage for ready, loading, empty, error, and offline flows
- `scripts/test-all.mjs` - added tracker smoke execution and tracker ASCII
  validation entries
