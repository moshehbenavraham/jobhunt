# Task Checklist

**Session ID**: `phase04-session01-evaluation-result-contract`
**Total Tasks**: 15
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-22

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 4      | 4      | 0         |
| Implementation | 5      | 5      | 0         |
| Testing        | 3      | 3      | 0         |
| **Total**      | **15** | **15** | **0**     |

---

## Setup (3 tasks)

Establish the route contract and read-model scaffolding before composing live
evaluation state.

### apps/api

- [x] T001 [S0401] Create typed evaluation-result enums, artifact packet
      shapes, and response contracts with types matching declared contract and
      exhaustive enum handling
      (`apps/api/src/server/evaluation-result-contract.ts`)
- [x] T002 [S0401] Create the evaluation-result summary scaffolding for
      session focus, empty-state handling, and bounded preview options with
      bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/evaluation-result-summary.ts`)
- [x] T003 [S0401] Create the GET-only evaluation-result route and register it
      in the shared route registry with schema-validated input and explicit
      error mapping (`apps/api/src/server/routes/evaluation-result-route.ts`,
      `apps/api/src/server/routes/index.ts`)

---

## Foundation (4 tasks)

Normalize stored runtime state into one browser-safe evaluation result packet.

### apps/api

- [x] T004 [S0401] Implement session selection for `single-evaluation` and
      `auto-pipeline` histories with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/server/evaluation-result-summary.ts`)
- [x] T005 [S0401] Implement job, approval, and failure summarizers for the
      evaluation result payload with types matching declared contract and
      exhaustive enum handling (`apps/api/src/server/evaluation-result-summary.ts`)
- [x] T006 [S0401] Implement report, PDF, and tracker artifact packet
      normalization with authorization enforced at the boundary closest to the
      resource (`apps/api/src/server/evaluation-result-summary.ts`)
- [x] T007 [S0401] Implement checkpoint, warning, and closeout-state
      normalization for pending, running, waiting, failed, completed, and
      degraded results with explicit error mapping
      (`apps/api/src/server/evaluation-result-summary.ts`)

---

## Implementation (5 tasks)

Compose the live summary and keep the route read-only, health-aware, and ready
for the Session 02 handoff surface.

### apps/api

- [x] T008 [S0401] Compose the bounded evaluation-result payload from session,
      job, checkpoint, approval, and observability inputs with types matching
      declared contract and exhaustive enum handling
      (`apps/api/src/server/evaluation-result-summary.ts`)
- [x] T009 [S0401] Support explicit `sessionId` lookup plus latest-session
      fallback in the evaluation-result route with schema-validated input and
      explicit error mapping
      (`apps/api/src/server/routes/evaluation-result-route.ts`)
- [x] T010 [S0401] Expose approval-paused and failed handoff fields so the
      summary preserves review and resume context without duplicating approval
      state logic (`apps/api/src/server/evaluation-result-summary.ts`)
- [x] T011 [S0401] Expose completed and degraded artifact packets with score,
      legitimacy, warning, and closeout fields aligned to stored worker-result
      semantics with types matching declared contract and exhaustive enum
      handling (`apps/api/src/server/evaluation-result-contract.ts`,
      `apps/api/src/server/evaluation-result-summary.ts`)
- [x] T012 [S0401] Keep the read model health-aware and read-only so missing
      store, unsupported workflows, and empty evaluation history remain
      explicit with explicit error mapping
      (`apps/api/src/server/routes/evaluation-result-route.ts`,
      `apps/api/src/server/evaluation-result-summary.ts`)

---

## Testing (3 tasks)

Verify the contract against the live server harness and the Phase 04 result
states that later UI sessions depend on.

### apps/api

- [x] T013 [S0401] [P] Extend HTTP runtime-contract coverage for pending,
      running, approval-paused, failed, completed, and degraded
      evaluation-result states across `single-evaluation` and `auto-pipeline`
      sessions with schema-validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)
- [x] T014 [S0401] [P] Extend HTTP runtime-contract coverage for `sessionId`
      lookup, latest-session fallback, unsupported workflows, and bounded
      preview behavior with bounded pagination, validated filters, and
      deterministic ordering (`apps/api/src/server/http-server.test.ts`)
- [x] T015 [S0401] Run API check, build, runtime-contract tests, and ASCII
      verification for the evaluation-result contract deliverables
      (`apps/api/src/server/evaluation-result-contract.ts`,
      `apps/api/src/server/evaluation-result-summary.ts`,
      `apps/api/src/server/routes/evaluation-result-route.ts`,
      `apps/api/src/server/http-server.test.ts`)

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
