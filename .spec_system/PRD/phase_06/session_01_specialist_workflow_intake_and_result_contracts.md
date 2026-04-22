# Session 01: Specialist Workflow Intake and Result Contracts

**Session ID**: `phase06-session01-specialist-workflow-intake-and-result-contracts`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Define the shared backend contract for launching, resuming, and summarizing the
remaining specialist workflows so browser clients can use one bounded model
instead of inferring behavior from repo files, raw prompts, or ad hoc status
shapes.

---

## Scope

### In Scope (MVP)

- Extend the specialist catalog and orchestration entry points for the
  remaining workflow families still outside the app-owned runtime
- Define typed intake, progress, warning, approval, and result-summary
  contracts that specialist surfaces can reuse
- Add backend launch and resume routes or actions that preserve explicit
  handoff metadata and bounded error states

### Out of Scope

- Specialist-specific browser panels and dashboard layouts
- Final cutover or dashboard retirement decisions

---

## Prerequisites

- [x] `phase02-session05-router-and-specialist-agent-topology`
- [x] `phase05-session05-application-help-draft-contract`
- [x] `phase05-session06-application-help-review-and-approvals`

---

## Deliverables

1. Shared specialist intake and result-summary contract in `apps/api`
2. Backend launch or resume support for the remaining specialist workflow set
3. Contract coverage for idle, running, waiting, degraded, and completed
   specialist states

---

## Success Criteria

- [ ] Browser clients can launch or resume specialist flows through one
      backend-owned contract family
- [ ] Specialist state exposes explicit progress, warning, approval, and
      result fields without raw repo parsing in the browser
- [ ] Shared handoff metadata stays bounded and reusable across multiple
      specialist workflows
