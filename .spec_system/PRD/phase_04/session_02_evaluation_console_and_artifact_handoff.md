# Session 02: Evaluation Console and Artifact Handoff

**Session ID**: `phase04-session02-evaluation-console-and-artifact-handoff`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Turn the existing chat shell into an evaluation-first console that shows the
run-to-artifact handoff with explicit report, PDF, tracker, and warning state.

---

## Scope

### In Scope (MVP)

- Extend the chat surface with evaluation-specific run summaries and artifact
  packet presentation
- Show explicit launch, running, waiting, failed, and artifact-ready states
- Provide in-app handoffs to the report viewer, PDF artifact, pipeline review,
  and approvals surface

### Out of Scope

- Full report-reading experience
- Dedicated pipeline and tracker pages

---

## Prerequisites

- [x] `phase03-session02-chat-console-and-session-resume`
- [x] `phase03-session04-approval-inbox-and-human-review-flow`
- [ ] `phase04-session01-evaluation-result-contract`

---

## Deliverables

1. Evaluation console updates inside the existing shell
2. Artifact packet or rail UI for completed and partial evaluation results
3. Browser and fixture coverage for happy-path, warning, and approval-paused
   evaluation flows

---

## Success Criteria

- [ ] Operators can launch evaluation work and watch it transition into
      reviewable artifacts inside the shell
- [ ] Artifact-ready states expose report, PDF, tracker, and warning outcomes
      without leaving the evaluation console
- [ ] Approval-paused and failed runs remain explicit and recoverable
