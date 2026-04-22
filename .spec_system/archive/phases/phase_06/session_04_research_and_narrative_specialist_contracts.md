# Session 04: Research and Narrative Specialist Contracts

**Session ID**: `phase06-session04-research-and-narrative-specialist-contracts`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Implement backend contracts for deep research, outreach drafting, interview
prep, training review, and project review so narrative-heavy specialist flows
produce bounded summaries, draft outputs, and explicit approval states inside
the app-owned runtime.

---

## Scope

### In Scope (MVP)

- Add typed backend summaries for research and narrative-oriented specialist
  workflows
- Preserve draft, approval, and no-submit boundaries for candidate-facing or
  shareable outputs
- Reuse shared specialist intake and result patterns so the browser can render
  these workflows without bespoke parsing

### Out of Scope

- Compare-offers, follow-up, and rejection-pattern contracts
- Dashboard replacement and cutover work

---

## Prerequisites

- [x] `phase02-session05-router-and-specialist-agent-topology`
- [x] `phase05-session05-application-help-draft-contract`
- [ ] `phase06-session01-specialist-workflow-intake-and-result-contracts`

---

## Deliverables

1. API contracts for deep research, outreach, interview prep, training review,
   and project review
2. Shared warning, approval, and draft metadata for narrative-heavy workflows
3. Coverage for missing-input, approval-blocked, interrupted, and completed
   narrative specialist states

---

## Success Criteria

- [ ] Narrative-heavy specialist workflows expose bounded summaries and draft
      outputs through the app-owned runtime
- [ ] Candidate-facing outputs preserve explicit review and no-submit rules
- [ ] Shared contract patterns keep specialist behavior consistent across
      multiple workflow families
