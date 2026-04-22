# Session 02: Scan Review Workspace

**Session ID**: `phase05-session02-scan-review-workspace`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Build the operator-owned scan workspace so a user can launch scans, review the
shortlist, inspect duplicate context, and hand selected roles into evaluation
or batch flows without leaving the app shell.

---

## Scope

### In Scope (MVP)

- Add a `/scan` workspace with launcher, progress panel, shortlist cards, and
  sticky action shelf behavior
- Render shortlist warnings, dedup notes, and explicit launch actions using
  the backend contract from Session 01
- Reuse shell navigation, focus sync, and handoff patterns so scan review fits
  the current operator shell instead of creating a separate mini-app

### Out of Scope

- Batch item-matrix review or retry controls
- Generic specialist-workspace infrastructure reserved for Phase 06

---

## Prerequisites

- [x] `phase03-session01-operator-shell-and-navigation-foundation`
- [x] `phase04-session04-pipeline-review-workspace`
- [ ] `phase05-session01-scan-shortlist-contract`

---

## Deliverables

1. Scan review workspace inside the operator shell
2. Shortlist card and context-rail presentation for fit, dedup, and warnings
3. Browser coverage for empty, warning, and evaluate-or-batch handoff flows

---

## Success Criteria

- [ ] Operators can run a scan and review shortlist outcomes in one app-owned
      workspace
- [ ] Scan shortlist actions hand off into evaluation or batch flows without
      losing shell context
- [ ] Duplicate, warning, and empty-result states are explicit and actionable
