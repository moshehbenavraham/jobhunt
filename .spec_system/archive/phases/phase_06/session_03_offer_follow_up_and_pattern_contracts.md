# Session 03: Offer, Follow-Up, and Pattern Contracts

**Session ID**: `phase06-session03-offer-follow-up-and-pattern-contracts`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Expose bounded backend summaries and actions for compare-offers, follow-up, and
rejection-pattern workflows so planning-heavy specialist analysis can run in
the app without direct markdown parsing or shell-only follow-through.

---

## Scope

### In Scope (MVP)

- Add typed result contracts for offer comparison, follow-up cadence, and
  rejection-pattern analysis over existing repo artifacts
- Normalize follow-through actions, warnings, and missing-input states for
  planning-oriented workflows
- Add fixture or route coverage for multi-item, empty-state, and degraded
  specialist results

### Out of Scope

- Deep research, outreach drafting, interview prep, training review, and
  project review contracts
- Specialist browser panels beyond the shared workspace foundation

---

## Prerequisites

- [x] `phase04-session05-tracker-workspace-and-integrity-actions`
- [x] `phase05-session03-batch-supervisor-contract`
- [ ] `phase06-session01-specialist-workflow-intake-and-result-contracts`

---

## Deliverables

1. API summaries and route support for compare-offers, follow-up, and patterns
2. Bounded warning and next-action models for planning-heavy specialist flows
3. Coverage for empty, multi-artifact, stale-data, and degraded result states

---

## Success Criteria

- [ ] Operators can review offer, follow-up, and pattern outputs through typed
      specialist summaries
- [ ] Follow-up and comparison actions stay backend-owned and explicit
- [ ] Planning workflows no longer depend on shell-only parsing or ad hoc
      status text
