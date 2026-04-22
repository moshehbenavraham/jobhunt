# Session 05: Application-Help Draft Contract

**Session ID**: `phase05-session05-application-help-draft-contract`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Expose a typed backend contract for application-help runs that preserves the
repo's no-submit rule while surfacing draft outputs, approvals, and resumable
state through explicit app-owned summaries.

---

## Scope

### In Scope (MVP)

- Add typed tool and summary support for application-help draft outputs,
  approval checkpoints, and resumable run state
- Surface candidate-facing draft packets, warnings, and next-review actions in
  one canonical API contract
- Preserve explicit no-submit boundaries and approval requirements for any
  sensitive output or workflow step

### Out of Scope

- Deep research, outreach, interview, or other specialist tooling reserved for
  Phase 06
- Generic specialist-workspace routing beyond the application-help flow

---

## Prerequisites

- [x] `phase03-session04-approval-inbox-and-human-review-flow`
- [x] `phase04-session02-evaluation-console-and-artifact-handoff`
- [ ] `phase05-session03-batch-supervisor-contract`

---

## Deliverables

1. Typed application-help tool and summary contract
2. Backend support for draft packets, approval context, and resumable state
3. Contract and orchestration coverage for waiting, resumed, rejected, and
   completed application-help outcomes

---

## Success Criteria

- [ ] Application-help runs expose explicit draft outputs and review state
- [ ] Approval checkpoints remain visible, resumable, and impossible to bypass
- [ ] No candidate-facing action crosses into auto-submit behavior
