# Session 05: Specialist Review Surfaces

**Session ID**: `phase06-session05-specialist-review-surfaces`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Turn the shared specialist workspace into usable operator-facing review
surfaces for the remaining workflow families so a user can inspect outputs,
warnings, and next actions in the app instead of falling back to the shell or
legacy dashboard.

---

## Scope

### In Scope (MVP)

- Add specialist-specific panels or rails for planning-oriented and
  narrative-oriented workflow outputs
- Render bounded summaries, draft packets, warnings, and next actions from the
  Session 03 and Session 04 contracts
- Keep review actions explicit and routed through backend-owned mutations or
  handoffs

### Out of Scope

- Final dashboard home or maintenance replacement work
- Cross-phase product changes unrelated to specialist parity

---

## Prerequisites

- [ ] `phase06-session02-specialist-workspace-foundation`
- [ ] `phase06-session03-offer-follow-up-and-pattern-contracts`
- [ ] `phase06-session04-research-and-narrative-specialist-contracts`

---

## Deliverables

1. Specialist review surfaces for the remaining workflow families
2. UI coverage for empty, warning, approval-blocked, interrupted, and complete
   specialist states
3. Shared handoff affordances back into chat, tracker, pipeline, or artifact
   review flows where relevant

---

## Success Criteria

- [ ] Operators can review and act on specialist workflow outputs without
      leaving the app
- [ ] Browser surfaces stay bounded and do not parse repo artifacts directly
- [ ] Specialist review UX remains consistent with the shell and other bounded
      review surfaces
