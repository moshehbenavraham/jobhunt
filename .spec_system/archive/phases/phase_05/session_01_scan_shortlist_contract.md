# Session 01: Scan Shortlist Contract

**Session ID**: `phase05-session01-scan-shortlist-contract`
**Status**: Complete
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Expose a typed backend contract for portal scan runs, shortlist candidates,
dedup notes, and launch-ready follow-through so the browser can review scan
results without reading repo files or raw logs directly.

---

## Scope

### In Scope (MVP)

- Define bounded scan-run summaries with launcher, running, completed, and
  degraded states
- Surface shortlist candidates, fit signals, duplicate hints, and warning
  states in one canonical API contract
- Add explicit backend actions or handoff metadata for ignore, evaluate, and
  batch-seed follow-through from shortlist review

### Out of Scope

- Scan workspace layout and shortlist card UI
- Batch item-matrix supervision beyond seed handoff metadata

---

## Prerequisites

- [x] `phase02-session04-scan-pipeline-and-batch-tools`
- [x] `phase03-session04-approval-inbox-and-human-review-flow`
- [x] `phase04-session04-pipeline-review-workspace`

---

## Deliverables

1. API summary contract for scan runs and shortlist candidates
2. Backend route or action support for shortlist follow-through decisions
3. Contract and route coverage for empty, duplicate-heavy, warning, and ready
   shortlist states

---

## Success Criteria

- [ ] Browser clients can fetch one typed summary for scan launcher, progress,
      and shortlist state
- [ ] Shortlist items expose explicit fit, dedup, warning, and next-action
      fields without browser-side repo parsing
- [ ] Evaluation and batch handoff data stays backend-owned and bounded
