# Task Checklist

**Session ID**: `phase04-session04-pipeline-review-workspace`
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

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 3 | 3 | 0 |
| Foundation | 5 | 5 | 0 |
| Implementation | 6 | 6 | 0 |
| Testing | 4 | 4 | 0 |
| **Total** | **18** | **18** | **0** |

---

## Setup (3 tasks)

Define the typed queue-review contract and browser-facing parsing boundary
before wiring the new shell surface.

### apps/api

- [x] T001 [S0404] [P] Create typed pipeline-review payloads, row-preview and
      selected-detail shapes, and warning or artifact enums with types matching
      declared contract and exhaustive enum handling
      (`apps/api/src/server/pipeline-review-contract.ts`)

### apps/web

- [x] T002 [S0404] [P] Create browser pipeline-review payload types and parser
      helpers with types matching declared contract and exhaustive enum
      handling (`apps/web/src/pipeline/pipeline-review-types.ts`)
- [x] T003 [S0404] Create the pipeline-review client and URL-backed focus
      helpers for section, sort, selection, and pagination with timeout,
      retry-backoff, and failure-path handling
      (`apps/web/src/pipeline/pipeline-review-client.ts`)

---

## Foundation (5 tasks)

Build the bounded queue-summary model and attach it to a real shell surface.

### apps/api

- [x] T004 [S0404] Create pipeline-review summary scaffolding for pipeline
      markdown parsing, shortlist overview extraction, and bounded row
      selection with bounded pagination, validated filters, and deterministic
      ordering (`apps/api/src/server/pipeline-review-summary.ts`)
- [x] T005 [S0404] Create the GET-only pipeline-review route and register it in
      the shared route registry with schema-validated input and explicit error
      mapping (`apps/api/src/server/routes/pipeline-review-route.ts`,
      `apps/api/src/server/routes/index.ts`)

### apps/web

- [x] T006 [S0404] [P] Create the pipeline-review hook for selected-row
      refresh, focus sync, and request cleanup on scope exit for all acquired
      resources (`apps/web/src/pipeline/use-pipeline-review.ts`)
- [x] T007 [S0404] [P] Create the pipeline-review surface for shortlist
      context, queue rows, and selected detail with explicit loading, empty,
      error, and offline states
      (`apps/web/src/pipeline/pipeline-review-surface.tsx`)
- [x] T008 [S0404] Register the pipeline shell surface, placeholder
      exhaustiveness, and navigation affordance with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/surface-placeholder.tsx`)

---

## Implementation (6 tasks)

Keep queue review read-only, deterministic, and aligned with existing report
and evaluation handoff behavior.

### apps/api

- [x] T009 [S0404] Implement pending and processed row parsing for
      `data/pipeline.md`, including report-number extraction and explicit
      malformed-row handling with schema-validated input and explicit error
      mapping (`apps/api/src/server/pipeline-review-summary.ts`)
- [x] T010 [S0404] Implement processed-row artifact enrichment by resolving
      matching report files, parsed report headers, and PDF existence with
      authorization enforced at the boundary closest to the resource
      (`apps/api/src/server/pipeline-review-summary.ts`)
- [x] T011 [S0404] Implement warning classification, section or sort filtering,
      and selected-detail fallbacks for missing rows or stale focus with
      bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/pipeline-review-summary.ts`)

### apps/web

- [x] T012 [S0404] Wire the pipeline-review surface into the existing shell
      frame and shared open-pipeline behavior with state reset or revalidation
      on re-entry (`apps/web/src/shell/operator-shell.tsx`)
- [x] T013 [S0404] Wire selected-row focus to URL-backed report-number or URL
      selection, report-viewer link-out, and queue revalidation with state
      reset or revalidation on re-entry
      (`apps/web/src/pipeline/use-pipeline-review.ts`,
      `apps/web/src/pipeline/pipeline-review-client.ts`,
      `apps/web/src/pipeline/pipeline-review-surface.tsx`)
- [x] T014 [S0404] Update evaluation artifact handoff plumbing so review-ready
      closeout opens the pipeline workspace and unavailable states stay
      explicit with denied, unavailable, or deferred handling and fallback
      behavior (`apps/web/src/chat/evaluation-artifact-rail.tsx`,
      `apps/web/src/chat/evaluation-result-types.ts`,
      `apps/web/src/chat/chat-console-surface.tsx`)

---

## Testing (4 tasks)

Verify the route contract, shell handoff behavior, and repo-level regression
gates.

### apps/api

- [x] T015 [S0404] [P] Extend HTTP runtime-contract coverage for missing
      pipeline data, parsed pending and processed rows, invalid query
      rejection, selected-detail resolution, and warning classification with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T016 [S0404] [P] Add browser smoke coverage for pipeline navigation,
      filter or sort behavior, selected-detail rendering, evaluation handoff,
      and report-viewer link-out with explicit loading, empty, error, and
      offline states (`scripts/test-app-pipeline-review.mjs`,
      `scripts/test-app-chat-console.mjs`,
      `scripts/test-app-shell.mjs`)
- [x] T017 [S0404] [P] Update the quick regression suite and ASCII coverage for
      the pipeline-review files and smoke scripts with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T018 [S0404] Run API and web checks or builds, pipeline-review smoke
      coverage, and quick regressions, then verify ASCII-only session
      deliverables (`apps/api/src/server/pipeline-review-contract.ts`,
      `apps/api/src/server/pipeline-review-summary.ts`,
      `apps/api/src/server/routes/pipeline-review-route.ts`,
      `apps/web/src/pipeline/`, `scripts/test-app-pipeline-review.mjs`,
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
