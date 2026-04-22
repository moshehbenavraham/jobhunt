# Task Checklist

**Session ID**: `phase06-session03-offer-follow-up-and-pattern-contracts`
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

Define the tracker-specialist contract, tool surface, and routing seams before
wiring normalized planning-workflow results.

### apps/api

- [x] T001 [S0603] [P] Create typed tracker-specialist payloads for workflow-
      specific result states, warnings, next actions, and selected-detail
      envelopes with types matching declared contract and exhaustive enum
      handling (`apps/api/src/server/tracker-specialist-contract.ts`)
- [x] T002 [S0603] [P] Create tracker-specialist tool scaffolding for compare-
      offers context lookup plus script-backed follow-up and rejection-pattern
      analysis with schema-validated input and explicit error mapping
      (`apps/api/src/tools/tracker-specialist-tools.ts`)
- [x] T003 [S0603] Create tracker-specialist summary and route scaffolding plus
      specialist, tool-suite, script-allowlist, and registry seams with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/tracker-specialist-summary.ts`,
      `apps/api/src/server/routes/tracker-specialist-route.ts`,
      `apps/api/src/server/routes/index.ts`,
      `apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/default-tool-scripts.ts`,
      `apps/api/src/orchestration/specialist-catalog.ts`)

---

## Foundation (5 tasks)

Build the application-history parsing, script normalization, and focused
selection rules the specialist detail route will depend on.

### apps/api

- [x] T004 [S0603] Implement compare-offers context resolution across report
      numbers, report paths, tracker references, company or role hints, and
      manual offer labels with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/tools/tracker-specialist-tools.ts`)
- [x] T005 [S0603] Implement follow-up cadence script execution, JSON
      normalization, and empty-history or degraded-output warnings with
      timeout, retry/backoff, and failure-path handling
      (`apps/api/src/tools/tracker-specialist-tools.ts`,
      `apps/api/src/tools/default-tool-scripts.ts`)
- [x] T006 [S0603] Implement rejection-pattern script execution, threshold
      normalization, and recommendation extraction with timeout, retry/backoff,
      and failure-path handling (`apps/api/src/tools/tracker-specialist-tools.ts`,
      `apps/api/src/tools/default-tool-scripts.ts`)
- [x] T007 [S0603] Implement app-owned planning-result packet read and write
      helpers for compare-offers, follow-up, and rejection-pattern outputs
      with idempotency protection, transaction boundaries, and compensation on
      failure (`apps/api/src/tools/tracker-specialist-tools.ts`,
      `apps/api/src/server/tracker-specialist-summary.ts`)
- [x] T008 [S0603] Implement selected workflow and session focus rules for
      explicit `mode`, explicit `sessionId`, latest-session fallback, and
      missing-session recovery with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/server/tracker-specialist-summary.ts`)

---

## Implementation (6 tasks)

Compose the bounded planning-workflow payload and make tracker-specialist
routing explicit and ready for browser review.

### apps/api

- [x] T009 [S0603] Implement session, job, approval, and recent-failure
      overlays for pending, running, waiting, degraded, resumed, and completed
      application-history specialist outcomes with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/server/tracker-specialist-summary.ts`)
- [x] T010 [S0603] Implement top-level tracker-specialist payload composition
      for compare-offers context, follow-up cadence analysis,
      rejection-pattern findings, warnings, and handoff metadata with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/tracker-specialist-summary.ts`)
- [x] T011 [S0603] Implement GET route query handling for `mode` and
      `sessionId` focus with schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/tracker-specialist-route.ts`)
- [x] T012 [S0603] Register the tracker-specialist tool surface in the default
      tool suite and tools barrel with deterministic ordering
      (`apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/index.ts`)
- [x] T013 [S0603] Promote `compare-offers`, `follow-up-cadence`, and
      `rejection-patterns` from tooling-gap to ready with dedicated-detail
      metadata, allowed-tool policies, and missing-capability cleanup with
      types matching declared contract and exhaustive enum handling
      (`apps/api/src/orchestration/specialist-catalog.ts`)
- [x] T014 [S0603] Update shared specialist-workspace expectations for ready
      planning workflows and tracker-specialist detail handoffs with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/routes/index.ts`,
      `apps/api/src/server/specialist-workspace-summary.test.ts`)

---

## Testing (4 tasks)

Lock the tool surface, detail contract, and ready-route behavior before
Session 05 builds the operator-facing review panels.

### apps/api

- [x] T015 [S0603] [P] Create tracker-specialist tool tests for compare-
      offers context matching, follow-up cadence normalization,
      rejection-pattern normalization, and degraded script output handling with
      schema-validated input and explicit error mapping
      (`apps/api/src/tools/tracker-specialist-tools.test.ts`)
- [x] T016 [S0603] [P] Create summary and HTTP route coverage for missing-
      input, degraded, resumed, completed, and invalid-query states across the
      three planning workflows with schema-validated input and explicit error
      mapping (`apps/api/src/server/tracker-specialist-summary.test.ts`,
      `apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T017 [S0603] [P] Extend specialist-catalog, service-container, and
      quick-regression coverage for ready tracker-specialist routing, new
      script-allowlist entries, and ASCII-tracked files with deterministic
      ordering (`apps/api/src/orchestration/specialist-catalog.test.ts`,
      `apps/api/src/runtime/service-container.test.ts`,
      `scripts/test-all.mjs`)
- [x] T018 [S0603] Run API checks or builds, tool/runtime tests, script
      regressions, and quick regressions for the tracker-specialist
      deliverables (`apps/api/src/tools/tracker-specialist-tools.ts`,
      `apps/api/src/server/tracker-specialist-summary.ts`,
      `apps/api/src/server/routes/tracker-specialist-route.ts`,
      `scripts/test-followup-cadence.mjs`,
      `scripts/test-analyze-patterns.mjs`,
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

Run the `validate` workflow step next.
