# Session 06: Application-Help Review and Approvals

**Session ID**: `phase05-session06-application-help-review-and-approvals`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Integrate application-help into the operator shell so a user can launch or
resume the flow, inspect draft outputs, resolve approvals, and continue the
run without losing context or dropping back to Codex.

---

## Scope

### In Scope (MVP)

- Add application-help launch, draft review, and approval-aware handoff inside
  the existing shell and approval surfaces
- Render draft packets, warnings, and next-step messaging from the Session 05
  backend contract without browser-owned workflow inference
- Reuse approval inbox and run-status patterns so application-help feels like a
  first-class operator workflow, not a one-off surface

### Out of Scope

- Generic specialist workspace for all remaining workflow families
- Dashboard-equivalent settings and maintenance cutover work reserved for
  Phase 06

---

## Prerequisites

- [x] `phase03-session04-approval-inbox-and-human-review-flow`
- [x] `phase04-session02-evaluation-console-and-artifact-handoff`
- [ ] `phase05-session05-application-help-draft-contract`

---

## Deliverables

1. Application-help launch and review UX inside the operator shell
2. Approval-aware draft presentation with resume and rejection follow-through
3. Browser coverage for waiting, rejected, resumed, and completed application
   help flows

---

## Success Criteria

- [ ] Operators can launch or resume application-help from the app and keep
      context visible throughout the flow
- [ ] Draft outputs and approval states are explicit and reviewable inside the
      shell
- [ ] The application-help path preserves the repo's no-submit rule while
      remaining recoverable after pauses or rejection
