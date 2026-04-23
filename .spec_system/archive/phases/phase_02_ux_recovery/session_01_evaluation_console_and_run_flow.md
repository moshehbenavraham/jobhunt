# Session 01: Evaluation Console and Run Flow

**Session ID**: `phase02-session01-evaluation-console-and-run-flow`
**Status**: Not Started
**Estimated Tasks**: ~20
**Estimated Duration**: 2-4 hours
**Packages**: apps/web, apps/api

---

## Objective

Rebuild the evaluation console center canvas as a coherent run-understanding
zone where an operator can comprehend any evaluation's state in under 15
seconds.

---

## Scope

### In Scope (MVP)

- Rebuild chat-console-surface.tsx as evaluation console center canvas
- Rebuild run-status-panel.tsx with clear visual states for completed, paused,
  failed, and degraded runs
- Rebuild run-timeline.tsx as a compact timeline showing run progression
- Rebuild workflow-composer.tsx for the input/launch area
- Rebuild recent-session-list.tsx as a compact recent-runs sidebar
- Migrate all inline hex/RGB values to design token CSS custom properties
- Replace all internal jargon with operator-focused copy
- Ensure three-zone layout: left rail = recent runs, center = active run,
  right = evidence (prepared for session 02)
- sculpt-ui design brief before implementation

### Out of Scope

- Right-rail artifact packet (session 02)
- /runs/:runId detail route (session 02)
- Report viewer (session 03)
- Pipeline review (session 04)

---

## Prerequisites

- [ ] Phase 01 complete (design tokens, three-zone layout, router)
- [ ] sculpt-ui design brief produced for evaluation console

---

## Deliverables

1. Rebuilt evaluation console center canvas
2. Clear run-state visual hierarchy (completed, paused, failed, degraded)
3. Compact run timeline
4. Token-compliant styling across all evaluation console components
5. Banned-terms-clean operator copy

---

## Success Criteria

- [ ] Operator can understand one evaluation state in under 15 seconds
- [ ] Completed, paused, failed, and degraded runs are visually distinct
- [ ] No inline hex/RGB color values in evaluation console files
- [ ] Banned-terms check passes on all evaluation console strings
- [ ] Desktop and mobile screenshots reviewed against PRD
