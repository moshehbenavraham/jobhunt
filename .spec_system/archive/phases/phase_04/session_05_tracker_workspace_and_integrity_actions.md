# Session 05: Tracker Workspace and Integrity Actions

**Session ID**: `phase04-session05-tracker-workspace-and-integrity-actions`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Add a tracker workspace that supports review, canonical status editing, and
explicit merge-and-verify closeout feedback without bypassing repo integrity
rules.

---

## Scope

### In Scope (MVP)

- Build tracker list and selected-detail views with bounded summaries
- Support canonical status updates through backend-owned mutation routes
- Surface merge, verify, normalize, dedup, and warning outcomes clearly in the
  operator experience

### Out of Scope

- Scan and batch review surfaces
- Specialist workflows beyond tracker maintenance

---

## Prerequisites

- [x] `phase02-session03-evaluation-pdf-and-tracker-tools`
- [ ] `phase04-session01-evaluation-result-contract`
- [ ] `phase04-session04-pipeline-review-workspace`

---

## Deliverables

1. Tracker review workspace with status-edit controls
2. Backend mutation and summary support for integrity-aware tracker actions
3. Test coverage for canonical status validation, warnings, and duplicate-guard
   scenarios

---

## Success Criteria

- [ ] Operators can review tracker rows and update status without editing
      `data/applications.md` manually
- [ ] Merge-and-verify outcomes are visible and warning-producing failures are
      explicit
- [ ] Browser and backend contracts preserve canonical status labels and
      tracker integrity boundaries
