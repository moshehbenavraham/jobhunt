# Session 02: Artifact Handoff and Evidence Rail

**Session ID**: `phase02-session02-artifact-handoff-and-evidence-rail`
**Status**: Not Started
**Estimated Tasks**: ~20
**Estimated Duration**: 2-4 hours
**Packages**: apps/web, apps/api

---

## Objective

Build the compact artifact packet in the right evidence rail and implement
the /runs/:runId detail route so every evaluation has a clear handoff from
active run to reviewable artifact.

---

## Scope

### In Scope (MVP)

- Rebuild evaluation-artifact-rail.tsx as a compact artifact packet showing:
  score, legitimacy, report state, PDF state, tracker state, warning summary,
  next actions
- Implement real /runs/:runId route (replace current redirect-to-home)
- Run detail view: timeline, logs summary, artifact state, resume/retry
  actions
- Connect artifact rail to run state for live updates during active runs
- Artifact handoff must feel like closure, not another wall of cards
- Migrate all inline hex/RGB values to design tokens
- Replace all internal jargon with operator-focused copy
- sculpt-ui design brief before implementation

### Out of Scope

- Report viewer (session 03)
- Pipeline review (session 04)
- Tracker/scan surfaces (session 05)

---

## Prerequisites

- [ ] Session 01 complete (evaluation console center canvas rebuilt)
- [ ] sculpt-ui design brief produced for artifact handoff

---

## Deliverables

1. Compact artifact packet in evidence rail
2. Working /runs/:runId detail route with timeline, logs, artifact state
3. Resume and retry actions on run detail
4. Token-compliant styling across all artifact handoff components
5. Banned-terms-clean operator copy

---

## Success Criteria

- [ ] Right rail shows a compact, scannable artifact summary (not cards)
- [ ] /runs/:runId loads a real detail view (not a redirect)
- [ ] Artifact handoff feels like closure for completed evaluations
- [ ] No inline hex/RGB color values in artifact handoff files
- [ ] Banned-terms check passes on all artifact handoff strings
- [ ] Desktop and mobile screenshots reviewed against PRD
