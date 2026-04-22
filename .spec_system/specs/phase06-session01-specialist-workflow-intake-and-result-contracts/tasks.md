# Task Checklist

**Session ID**: `phase06-session01-specialist-workflow-intake-and-result-contracts`
**Total Tasks**: 18
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
| Implementation | 6      | 6      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **18** | **18** | **0**     |

---

## Setup (3 tasks)

Define the shared specialist workspace contract, catalog metadata, and route
seams before wiring runtime overlays and action handling.

### apps/api

- [x] T001 [S0601] [P] Create typed specialist workspace payloads for
      workflow descriptors, intake requirements, shared run states, warning
      codes, selected detail, and action envelopes with types matching
      declared contract and exhaustive enum handling
      (`apps/api/src/server/specialist-workspace-contract.ts`)
- [x] T002 [S0601] [P] Extend specialist catalog metadata for workflow
      families, workspace labels, support states, detail-surface hints, and
      bounded tool previews with deterministic ordering
      (`apps/api/src/orchestration/specialist-catalog.ts`)
- [x] T003 [S0601] Create specialist workspace summary and route scaffolding
      plus deterministic registry wiring for GET and POST workspace endpoints
      with schema-validated input and explicit error mapping
      (`apps/api/src/server/specialist-workspace-summary.ts`,
      `apps/api/src/server/routes/specialist-workspace-route.ts`,
      `apps/api/src/server/routes/specialist-workspace-action-route.ts`,
      `apps/api/src/server/routes/index.ts`)

---

## Foundation (5 tasks)

Build the server-owned workflow inventory, selection rules, and runtime
overlays the browser workspace will rely on.

### apps/api

- [x] T004 [S0601] Implement shared workflow inventory mapping from the
      specialist catalog and mode routes with family grouping, mode metadata,
      and deterministic ordering
      (`apps/api/src/server/specialist-workspace-summary.ts`)
- [x] T005 [S0601] Implement selected workflow and session focus rules for
      `mode`, `sessionId`, latest-session fallback, and stale-selection
      recovery with bounded pagination, validated filters, and deterministic
      ordering (`apps/api/src/server/specialist-workspace-summary.ts`)
- [x] T006 [S0601] Implement session, job, approval, and recent-failure
      overlays for idle, running, waiting, degraded, and completed specialist
      workspace states with types matching declared contract and exhaustive
      enum handling (`apps/api/src/server/specialist-workspace-summary.ts`)
- [x] T007 [S0601] Implement shared result-availability and next-action
      mapping that points to dedicated detail surfaces when present and emits
      bounded blocked or degraded guidance otherwise with types matching
      declared contract and exhaustive enum handling
      (`apps/api/src/server/specialist-workspace-summary.ts`,
      `apps/api/src/orchestration/specialist-catalog.ts`)
- [x] T008 [S0601] Implement action-request validation and duplicate-trigger
      guards for launch and resume requests scoped to specialist workspace
      workflows with duplicate-trigger prevention while in-flight
      (`apps/api/src/server/routes/specialist-workspace-action-route.ts`)

---

## Implementation (6 tasks)

Compose the bounded workspace payload and make specialist launch or resume
behavior explicit for browser clients.

### apps/api

- [x] T009 [S0601] Implement top-level specialist workspace payload
      composition for workflow list, selected detail, shared warnings, and
      status messaging without raw orchestration or repo parsing in the
      browser with types matching declared contract and exhaustive enum
      handling (`apps/api/src/server/specialist-workspace-summary.ts`)
- [x] T010 [S0601] Implement GET route query handling for `mode` and
      `sessionId` focus with schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/specialist-workspace-route.ts`)
- [x] T011 [S0601] Implement POST launch handling that wraps orchestration
      service handoff into bounded ready, blocked, degraded, and duplicate
      specialist workspace responses with schema-validated input and explicit
      error mapping
      (`apps/api/src/server/routes/specialist-workspace-action-route.ts`)
- [x] T012 [S0601] Implement POST resume handling that reuses stored session
      context and returns explicit missing-session, blocked, duplicate, and
      accepted outcomes with state reset or revalidation on re-entry
      (`apps/api/src/server/routes/specialist-workspace-action-route.ts`)
- [x] T013 [S0601] Implement shared handoff metadata for specialist label,
      mode path, tool-preview boundaries, and dedicated detail-surface links
      so Session 02 can route without inferring from chat payloads with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/specialist-workspace-contract.ts`,
      `apps/api/src/server/specialist-workspace-summary.ts`)
- [x] T014 [S0601] Update specialist catalog expectations and route registry
      ordering for the new workspace contract family with deterministic
      ordering
      (`apps/api/src/orchestration/specialist-catalog.test.ts`,
      `apps/api/src/server/routes/index.ts`)

---

## Testing (4 tasks)

Lock the contract and runtime behavior before Session 02 builds the browser
workspace on this API surface.

### apps/api

- [x] T015 [S0601] [P] Create specialist workspace summary tests for workflow
      inventory, focus selection, idle or running or waiting state overlays,
      degraded result availability, and completed handoff metadata with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/specialist-workspace-summary.test.ts`)
- [x] T016 [S0601] [P] Extend HTTP runtime coverage for GET and POST
      specialist workspace routes across launch, resume, blocked workflow,
      duplicate request, stale session, and invalid-input cases with schema-
      validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T017 [S0601] [P] Extend specialist-catalog and quick-regression coverage
      for shared workspace metadata and new ASCII-tracked files with
      deterministic ordering
      (`apps/api/src/orchestration/specialist-catalog.test.ts`,
      `scripts/test-all.mjs`)
- [x] T018 [S0601] Run API checks or builds, runtime tests, and quick
      regressions for the specialist workspace contract deliverables
      (`apps/api/src/server/specialist-workspace-contract.ts`,
      `apps/api/src/server/specialist-workspace-summary.ts`,
      `apps/api/src/server/routes/specialist-workspace-route.ts`,
      `apps/api/src/server/routes/specialist-workspace-action-route.ts`,
      `apps/api/src/orchestration/specialist-catalog.ts`,
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

Run the `implement` workflow step next. After a successful `plansession` run,
`implement` is always the next workflow command.
