# Session 03: Three-Zone Shell Layout

**Session ID**: `phase01-session03-three-zone-shell-layout`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~22
**Estimated Duration**: 3-4 hours

---

## Objective

Rework the operator shell into a true three-zone desktop layout (stable left
rail, dominant center canvas, narrower right evidence rail) using CSS Grid and
layout tokens, replacing the current generic responsive collapse.

---

## Scope

### In Scope (MVP)

- Rework `apps/web/src/shell/operator-shell.tsx` into a CSS Grid three-zone
  composition
- Left rail: stable navigation with clear active-state indicators
- Center canvas: dominant content area that owns the primary workflow
- Right rail: persistent evidence/artifact/approval zone on desktop
- Use layout tokens from layout.css for zone widths and breakpoints
- Update `apps/web/src/shell/navigation-rail.tsx` to work within the new left
  rail zone
- Update `apps/web/src/shell/status-strip.tsx` for the new shell composition
- Remove auto-fit card grid as default layout pattern
- Run sculpt-ui design brief before implementation

### Out of Scope

- Tablet and mobile responsive behavior (session 04)
- Command palette (session 06)
- Router integration (session 05)
- Content within center canvas and right rail (Phase 02 workbench rebuild)

---

## Prerequisites

- [ ] Session 01 completed (design tokens available)
- [ ] Session 02 completed (typography in place)
- [ ] sculpt-ui design brief completed for this session

---

## Deliverables

1. Reworked operator-shell.tsx with CSS Grid three-zone layout
2. Updated navigation-rail.tsx within left rail zone
3. Right rail zone rendered persistently on desktop
4. status-strip.tsx updated for new shell composition
5. layout.css zone tokens applied throughout

---

## Success Criteria

- [ ] Desktop shell visibly has three distinct work zones
- [ ] Left rail is stable and does not collapse on desktop
- [ ] Center canvas is the dominant content area
- [ ] Right rail is persistent on desktop, not hidden behind a toggle
- [ ] No auto-fit card grids used as default layout
- [ ] Shell uses CSS Grid with layout.css tokens, not nested flexbox hacks
- [ ] Static screenshot shows intentional three-zone composition
- [ ] sculpt-ui design brief was followed
