# Session 04: Approval Inbox and Human Review Flow

**Session ID**: `phase03-session04-approval-inbox-and-human-review-flow`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Expose pending approvals and interrupted runs through a dedicated review
surface that lets the operator inspect context, approve or reject work, and
resume blocked execution from the app UI.

---

## Scope

### In Scope (MVP)

- Build an approval inbox, detail view, and action controls for pending review
- Reuse the approval-runtime and durable job-runner contracts for pending,
  approved, rejected, and resumed states
- Show relevant session, job, and trace metadata needed for human review
- Add validation coverage for pending approvals, approve or reject actions,
  and interrupted-run resume behavior

### Out of Scope

- Broad workflow parity beyond approval checkpoints
- Batch review dashboards
- Final tracker or artifact management surfaces

---

## Prerequisites

- [ ] Session 01 operator shell and navigation foundation completed
- [ ] Session 02 chat console and session resume completed

---

## Deliverables

1. Approval inbox and approval detail view in the app shell
2. Backend action contract for approve, reject, and resume flows
3. Coverage for review-state transitions and blocked-run recovery

---

## Success Criteria

- [ ] Pending approvals are visible without direct database inspection
- [ ] Users can approve or reject from the UI and see the resulting run state
- [ ] Interrupted runs can resume through the same backend-owned workflow path
