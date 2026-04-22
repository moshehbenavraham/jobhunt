# Session 04: Pipeline Review Workspace

**Session ID**: `phase04-session04-pipeline-review-workspace`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Provide a dedicated pipeline review workspace with row selection, bounded
detail, and direct handoffs into reports and evaluation artifacts.

---

## Scope

### In Scope (MVP)

- Render the current pipeline queue with filter, sort, and selected-detail
  behavior
- Show pipeline item status, artifact availability, and warning state
- Reuse existing shell refresh and detail patterns for a stable review surface

### Out of Scope

- Tracker status mutations
- Batch-specific orchestration and retries

---

## Prerequisites

- [x] `phase02-session04-scan-pipeline-and-batch-tools`
- [ ] `phase04-session01-evaluation-result-contract`
- [ ] `phase04-session03-report-viewer-and-artifact-browser`

---

## Deliverables

1. Pipeline review surface inside the operator shell
2. Bounded API summary for pipeline rows and selected detail
3. Browser and route coverage for empty, partial, warning, and linked-artifact
   states

---

## Success Criteria

- [ ] Operators can review queued pipeline entries without reading
      `data/pipeline.md` directly
- [ ] Pipeline detail clearly shows related reports, PDFs, and warnings
- [ ] Empty and degraded pipeline states remain explicit and actionable
