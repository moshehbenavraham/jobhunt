# Task Checklist

**Session ID**: `phase05-session05-application-help-draft-contract`
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

Define the application-help contract, typed tool surface, and route seams
before wiring report context and draft-packet state.

### apps/api

- [x] T001 [S0505] [P] Create typed application-help payloads for matched
      report context, draft packets, warnings, next-review guidance, and
      resumable run state with types matching declared contract and exhaustive
      enum handling (`apps/api/src/server/application-help-contract.ts`)
- [x] T002 [S0505] [P] Create application-help tool scaffolding for report
      matching, saved-answer extraction, and app-state draft-packet
      persistence with schema-validated input and explicit error mapping
      (`apps/api/src/tools/application-help-tools.ts`)
- [x] T003 [S0505] Create application-help summary and route scaffolding plus
      route, specialist, and tool-suite registration seams with schema-
      validated input and explicit error mapping
      (`apps/api/src/server/application-help-summary.ts`,
      `apps/api/src/server/routes/application-help-route.ts`,
      `apps/api/src/server/routes/index.ts`,
      `apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/orchestration/specialist-catalog.ts`)

---

## Foundation (5 tasks)

Build the report-backed context lookup, app-state packet model, and resumable
session overlays the browser will depend on.

### apps/api

- [x] T004 [S0505] Implement report lookup across report number, company, role,
      and artifact filename hints with deterministic ordering
      (`apps/api/src/tools/application-help-tools.ts`)
- [x] T005 [S0505] Implement report-section extraction for saved draft answers,
      report metadata, PDF availability, and cover-letter manual-follow-up
      cues with types matching declared contract and exhaustive enum handling
      (`apps/api/src/tools/application-help-tools.ts`)
- [x] T006 [S0505] Implement app-state draft-packet write and read helpers for
      questions, answers, warnings, notes, and revision metadata with
      idempotency protection, transaction boundaries, and compensation on
      failure (`apps/api/src/tools/application-help-tools.ts`,
      `apps/api/src/server/application-help-summary.ts`)
- [x] T007 [S0505] Implement session, job, approval, and recent-failure
      overlays for pending, running, waiting, rejected, resumed, and completed
      application-help outcomes with types matching declared contract and
      exhaustive enum handling (`apps/api/src/server/application-help-summary.ts`)
- [x] T008 [S0505] Implement summary selection rules for explicit `sessionId`
      focus, latest-session fallback, missing-context warnings, and latest-
      packet precedence with deterministic ordering
      (`apps/api/src/server/application-help-summary.ts`)

---

## Implementation (6 tasks)

Make the application-help tool surface, specialist routing, and bounded review
payload explicit and stable.

### apps/api

- [x] T009 [S0505] Implement application-help context tool output for matched
      report metadata, existing draft answers, no-submit reminders, and manual
      cover-letter cues with types matching declared contract and exhaustive
      enum handling (`apps/api/src/tools/application-help-tools.ts`)
- [x] T010 [S0505] Implement draft-packet staging tool output for structured
      question-answer items, warnings, and review notes with idempotency
      protection, transaction boundaries, and compensation on failure
      (`apps/api/src/tools/application-help-tools.ts`)
- [x] T011 [S0505] Implement top-level application-help payload composition for
      missing-context, draft-ready, approval-paused, rejected, resumed, and
      completed states with types matching declared contract and exhaustive
      enum handling (`apps/api/src/server/application-help-summary.ts`)
- [x] T012 [S0505] Implement GET route query handling for `sessionId` and
      deterministic session focus with schema-validated input and explicit
      error mapping (`apps/api/src/server/routes/application-help-route.ts`)
- [x] T013 [S0505] Register the application-help tool surface in the default
      tool suite and tools barrel with deterministic ordering
      (`apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/index.ts`)
- [x] T014 [S0505] Promote `application-help` specialist routing from tooling-
      gap to ready with the new tool policy and missing-capability cleanup with
      types matching declared contract and exhaustive enum handling
      (`apps/api/src/orchestration/specialist-catalog.ts`)

---

## Testing (4 tasks)

Lock the tool surface, summary contract, and routing behavior before Session 06
builds the browser review flow.

### apps/api

- [x] T015 [S0505] [P] Create application-help tool tests for report matching,
      saved-answer extraction, app-state packet persistence, missing-context
      handling, and cover-letter manual-follow-up flags with schema-validated
      input and explicit error mapping
      (`apps/api/src/tools/application-help-tools.test.ts`)
- [x] T016 [S0505] [P] Create summary and HTTP route coverage for draft-ready,
      approval-paused, rejected, resumed, completed, and invalid-query states
      with schema-validated input and explicit error mapping
      (`apps/api/src/server/application-help-summary.test.ts`,
      `apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T017 [S0505] [P] Extend specialist-catalog and quick-regression coverage
      for ready application-help routing and new ASCII-tracked files with
      deterministic ordering
      (`apps/api/src/orchestration/specialist-catalog.test.ts`,
      `scripts/test-all.mjs`)
- [x] T018 [S0505] Run API checks or builds, tool/runtime tests, and quick
      regressions for the application-help contract deliverables
      (`apps/api/src/tools/application-help-tools.ts`,
      `apps/api/src/server/application-help-summary.ts`,
      `apps/api/src/server/routes/application-help-route.ts`,
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
