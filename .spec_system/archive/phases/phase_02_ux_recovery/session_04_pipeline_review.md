# Session 04: Pipeline Review

**Session ID**: `phase02-session04-pipeline-review`
**Status**: Not Started
**Estimated Tasks**: ~18
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Rebuild the pipeline review surface with dense hybrid rows and a context rail
so an operator can rapidly scan pipeline state and drill into any item
without losing context.

---

## Scope

### In Scope (MVP)

- Rebuild pipeline-review-surface.tsx with dense hybrid rows
  (company + role + score + status + key signals in one scannable row)
- Context rail: selecting a pipeline item shows detail in the evidence rail
  without route churn
- Sticky filters (status, score range, date range) at top of center canvas
- Sort controls (date, score, company)
- Clear visual hierarchy for pipeline stages
- Migrate all inline hex/RGB values to design tokens
- Replace all internal jargon with operator-focused copy
- sculpt-ui design brief before implementation

### Out of Scope

- Tracker/scan surfaces (session 05)
- Batch/specialist surfaces (session 06)
- Inline pipeline item editing

---

## Prerequisites

- [ ] Sessions 01-03 complete (evaluation console, artifact handoff, report
      viewer)
- [ ] sculpt-ui design brief produced for pipeline review

---

## Deliverables

1. Dense hybrid-row pipeline listing in center canvas
2. Context rail detail in evidence rail position
3. Sticky filter bar
4. Sort controls
5. Token-compliant styling
6. Banned-terms-clean operator copy

---

## Success Criteria

- [ ] Pipeline supports rapid visual scanning of 20+ items
- [ ] Selecting an item shows detail in context rail without navigating away
- [ ] Filters and sorts work predictably
- [ ] No inline hex/RGB color values in pipeline review files
- [ ] Banned-terms check passes on all pipeline review strings
- [ ] Desktop and mobile screenshots reviewed against PRD
