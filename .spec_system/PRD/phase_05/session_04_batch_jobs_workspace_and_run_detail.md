# Session 04: Batch Jobs Workspace and Run Detail

**Session ID**: `phase05-session04-batch-jobs-workspace-and-run-detail`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Build the batch jobs workspace so operators can compose or resume batch runs,
inspect per-item state, retry failures, review warnings, and complete
merge-plus-verify from one consistent surface.

---

## Scope

### In Scope (MVP)

- Add a `/batch` workspace with composer, item matrix, context rail, and
  action controls for retry, resume, merge, and verify
- Surface item-level approvals, failures, warnings, and artifact readiness
  without leaving the app
- Reuse run-detail, shell refresh, and navigation patterns so batch review
  stays consistent with the rest of the operator experience

### Out of Scope

- Scan shortlist creation or application-help drafting
- Dashboard replacement work reserved for Phase 06

---

## Prerequisites

- [x] `phase03-session02-chat-console-and-session-resume`
- [x] `phase04-session05-tracker-workspace-and-integrity-actions`
- [ ] `phase05-session03-batch-supervisor-contract`

---

## Deliverables

1. Batch jobs workspace with compose, monitor, and closeout actions
2. Item-matrix and run-detail presentation for warnings, approvals, and retry
   readiness
3. Browser coverage for failed-item retry, merge-blocked, and approval-paused
   batch flows

---

## Success Criteria

- [ ] Operators can supervise many batch items without losing per-item clarity
- [ ] Retry, merge, and verify controls are available from the same workspace
- [ ] Warning, approval-paused, and failed states remain explicit and
      recoverable
