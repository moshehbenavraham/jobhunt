# Task Checklist

**Session ID**: `phase06-session04-research-and-narrative-specialist-contracts`
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
| Setup          | 4      | 0     | 4         |
| Foundation     | 5      | 0     | 5         |
| Implementation | 6      | 0     | 6         |
| Testing        | 4      | 0     | 4         |
| **Total**      | **19** | **0** | **19**    |

---

## Setup (4 tasks)

Define the research-specialist contract, tool surface, and routing seams before
wiring normalized narrative packets.

### apps/api

- [x] T001 [S0604] [P] Create typed research-specialist payloads for workflow-
      specific packet kinds, summary states, warnings, next actions, and
      review boundaries with types matching declared contract and exhaustive
      enum handling (`apps/api/src/server/research-specialist-contract.ts`)
- [x] T002 [S0604] [P] Create research-specialist tool scaffolding for shared
      context resolution, packet staging, and packet loading across narrative
      workflows with schema-validated input and explicit error mapping
      (`apps/api/src/tools/research-specialist-tools.ts`)
- [x] T003 [S0604] [P] Create research-specialist summary scaffolding for
      mode or session selection, packet reads, and runtime overlays with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/research-specialist-summary.ts`)
- [x] T004 [S0604] Create research-specialist route and registration seams
      across route index, tool suite, tools barrel, and specialist catalog
      with schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/research-specialist-route.ts`,
      `apps/api/src/server/routes/index.ts`,
      `apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/index.ts`,
      `apps/api/src/orchestration/specialist-catalog.ts`)

---

## Foundation (5 tasks)

Build the shared context lookup, packet persistence, and focused selection
rules the narrative detail route will depend on.

### apps/api

- [x] T005 [S0604] Implement shared narrative context resolution for company
      or role hints, saved reports, prompt-route metadata, and optional
      interview story-bank inputs with bounded pagination, validated filters,
      and deterministic ordering (`apps/api/src/tools/research-specialist-tools.ts`)
- [x] T006 [S0604] Implement packet validation and persistence for deep
      research and LinkedIn outreach outputs under
      `.jobhunt-app/research-specialist/` with idempotency protection,
      transaction boundaries, and compensation on failure
      (`apps/api/src/tools/research-specialist-tools.ts`)
- [x] T007 [S0604] Implement packet validation and persistence for interview
      prep, training review, and project review outputs with idempotency
      protection, transaction boundaries, and compensation on failure
      (`apps/api/src/tools/research-specialist-tools.ts`)
- [x] T008 [S0604] Implement selected workflow and session focus rules for
      explicit `mode`, explicit `sessionId`, latest-session fallback, and
      missing-session recovery with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/server/research-specialist-summary.ts`)
- [x] T009 [S0604] Implement shared warning, approval, failure, and review-
      boundary derivation for missing-context, no-packet-yet,
      approval-paused, rejected, resumable, and completed narrative states
      with types matching declared contract and exhaustive enum handling
      (`apps/api/src/server/research-specialist-summary.ts`)

---

## Implementation (6 tasks)

Compose the bounded narrative payload and make research-specialist routing
explicit and ready for browser review.

### apps/api

- [x] T010 [S0604] Implement deep research and interview-prep summary
      composition for bounded briefs, source status, artifact links, and next-
      review guidance with types matching declared contract and exhaustive
      enum handling (`apps/api/src/server/research-specialist-summary.ts`)
- [x] T011 [S0604] Implement LinkedIn outreach, training review, and project
      review summary composition for draft packets, verdict metadata, and
      manual-send guardrails with types matching declared contract and
      exhaustive enum handling (`apps/api/src/server/research-specialist-summary.ts`)
- [x] T012 [S0604] Implement GET route query handling for `mode` and
      `sessionId` focus with schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/research-specialist-route.ts`)
- [x] T013 [S0604] Register the research-specialist tool surface in the
      default tool suite and tools barrel with deterministic ordering
      (`apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/index.ts`)
- [x] T014 [S0604] Promote `deep-company-research` and
      `linkedin-outreach` from tooling-gap to ready with dedicated-detail
      metadata, allowed-tool policies, and missing-capability cleanup with
      types matching declared contract and exhaustive enum handling
      (`apps/api/src/orchestration/specialist-catalog.ts`)
- [x] T015 [S0604] Promote `interview-prep`, `training-review`, and
      `project-review` to ready with dedicated-detail metadata, allowed-tool
      policies, and missing-capability cleanup with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/orchestration/specialist-catalog.ts`)

---

## Testing (4 tasks)

Lock the tool surface, detail contract, and ready-route behavior before
Session 05 builds the operator-facing review panels.

### apps/api

- [x] T016 [S0604] [P] Create research-specialist tool tests for context
      resolution, packet staging or loading, missing-input handling, and
      workflow-specific packet validation with schema-validated input and
      explicit error mapping (`apps/api/src/tools/research-specialist-tools.test.ts`)
- [x] T017 [S0604] [P] Create summary and HTTP route coverage for empty,
      approval-paused, rejected, resumed, completed, and invalid-query states
      across the five narrative workflows with schema-validated input and
      explicit error mapping
      (`apps/api/src/server/research-specialist-summary.test.ts`,
      `apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T018 [S0604] [P] Extend specialist-catalog, shared specialist-
      workspace, service-container, and quick-regression coverage for ready
      research-specialist routing, dedicated-detail metadata, and ASCII-
      tracked files with deterministic ordering
      (`apps/api/src/orchestration/specialist-catalog.test.ts`,
      `apps/api/src/server/specialist-workspace-summary.test.ts`,
      `apps/api/src/runtime/service-container.test.ts`,
      `scripts/test-all.mjs`)
- [x] T019 [S0604] Run API checks or builds, tool/runtime tests, and quick
      regression coverage for the research-specialist deliverables
      (`apps/api/src/tools/research-specialist-tools.ts`,
      `apps/api/src/server/research-specialist-summary.ts`,
      `apps/api/src/server/routes/research-specialist-route.ts`,
      `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [ ] All tasks marked `[x]`
- [ ] All tests passing
- [ ] All files ASCII-encoded
- [ ] implementation-notes.md updated
- [ ] Ready for the `implement` workflow step

---

## Next Steps

Run the `implement` workflow step next to begin AI-led implementation.
