# Session 04: Responsive Layout and Mobile

**Session ID**: `phase01-session04-responsive-layout-and-mobile`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~18
**Estimated Duration**: 2-3 hours

---

## Objective

Add intentional tablet and mobile layout behavior to the three-zone shell so
each breakpoint has a purpose-built composition instead of relying on generic
responsive collapse.

---

## Scope

### In Scope (MVP)

- Define breakpoint tokens in tokens.css (desktop, tablet, mobile)
- Tablet layout: collapsed left rail (icon-only or drawer), center canvas
  dominant, right rail as slide-over drawer
- Mobile layout: review-first single column, bottom navigation or hamburger,
  context accessible via drawer
- Add layout.css media queries using breakpoint tokens
- Update operator-shell.tsx to switch grid composition at breakpoints
- Update navigation-rail.tsx for collapsed and mobile states
- Ensure right rail content remains accessible on tablet and mobile via drawer
  or overlay
- Run sculpt-ui design brief before implementation

### Out of Scope

- Touch gesture interactions
- Offline or PWA behavior
- Router changes (session 05)
- Command palette (session 06)

---

## Prerequisites

- [ ] Session 03 completed (three-zone desktop layout in place)
- [ ] sculpt-ui design brief completed for this session

---

## Deliverables

1. Breakpoint tokens in tokens.css
2. Tablet layout with collapsed rail and detail drawer
3. Mobile layout with review-first single column
4. Updated media queries in layout.css
5. operator-shell.tsx responsive grid switching
6. navigation-rail.tsx collapsed and mobile states

---

## Success Criteria

- [ ] Tablet shell uses collapsed rail and detail drawer, not a broken desktop
      layout
- [ ] Mobile is review-first, legible, and does not attempt dense multi-column
      author flows
- [ ] Right rail content is accessible on all breakpoints via drawer or overlay
- [ ] Breakpoint transitions feel intentional, not accidental collapse
- [ ] Screenshot review at desktop, tablet, and mobile widths all pass
- [ ] sculpt-ui design brief was followed
