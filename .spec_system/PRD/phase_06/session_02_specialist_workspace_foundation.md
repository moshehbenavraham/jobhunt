# Session 02: Specialist Workspace Foundation

**Session ID**: `phase06-session02-specialist-workspace-foundation`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Build the shared browser-side workspace for specialist workflows so operators
can launch, resume, inspect, and navigate specialist runs inside the app with
the same bounded, approval-aware patterns already used for scan, batch, and
application-help.

---

## Scope

### In Scope (MVP)

- Add specialist workflow entry points to the shell, navigation, and handoff
  surfaces
- Create shared loading, empty, warning, interrupted, and completed specialist
  states backed only by typed API summaries
- Reuse URL-backed focus, action routing, and artifact-handoff patterns for
  specialist review flows

### Out of Scope

- Specialist-specific deep layouts for each workflow family
- Dashboard replacement and settings polish reserved for later sessions

---

## Prerequisites

- [x] `phase03-session02-chat-console-and-session-resume`
- [x] `phase04-session02-evaluation-console-and-artifact-handoff`
- [ ] `phase06-session01-specialist-workflow-intake-and-result-contracts`

---

## Deliverables

1. Shared specialist workspace and shell integration in `apps/web`
2. Reusable client types, loaders, and focus-state handling for specialist runs
3. Browser coverage for empty, running, degraded, interrupted, and completed
   specialist states

---

## Success Criteria

- [ ] Operators can stay inside the app while launching or resuming specialist
      workflows
- [ ] Specialist workspace state comes entirely from bounded backend contracts
- [ ] Refresh, re-entry, and stale-selection recovery remain reliable for the
      new specialist views
