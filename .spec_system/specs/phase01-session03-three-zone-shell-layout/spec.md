# Session Specification

**Session ID**: `phase01-session03-three-zone-shell-layout`
**Phase**: 01 - Rebuild Foundation and Shell
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session replaces the current two-zone flexbox-wrap shell layout with a
true three-zone CSS Grid composition: stable left navigation rail, dominant
center canvas, and a persistent right evidence rail. The current
`operator-shell.tsx` uses `display: flex; flex-wrap: wrap` with a single
`railWrapperStyle` (left) and `surfaceWrapperStyle` (center), and has no
right rail zone at all. The layout collapses unpredictably at intermediate
widths because it relies on flex-basis hints rather than explicit grid tracks.

The three-zone layout is the structural backbone of the UX PRD's "editorial
operations workbench" identity (PRD_UX.md section 7). Without it, every
subsequent Phase 02 workbench surface -- evaluation console, pipeline review,
report viewer, scan review -- has no intentional place for its evidence or
artifact rail. Getting this right now prevents every future session from
re-inventing layout containment.

Design tokens for zone widths already exist in `layout.css` (session 01
output) but explicitly deferred grid application and media queries to this
session. This session activates those tokens through CSS Grid track
definitions and adds the desktop breakpoint media query scaffolding that
session 04 (responsive/mobile) will extend.

---

## 2. Objectives

1. Replace the flexbox-wrap shell body with a CSS Grid three-zone layout
   using explicit column track definitions
2. Create a persistent right evidence rail zone that renders on desktop
   (>=1200px) without toggle or collapse
3. Update `layout.css` with grid track definitions and the desktop media
   query that activates the three-zone composition
4. Refactor `operator-shell.tsx` to render left rail, center canvas, and
   right evidence rail as three distinct grid children
5. Remove the auto-fit card grid default from the shell body and status
   strip areas
6. Ensure the navigation rail and status strip work correctly within
   the new grid composition

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - tokens.css with PRD palette,
      layout.css with zone width custom properties
- [x] `phase01-session02-typography-and-base-styles` - base.css reset,
      heading hierarchy, font loading

### Required Tools/Knowledge

- CSS Grid layout (explicit track definitions, named areas)
- React CSSProperties inline style objects
- Design token consumption via CSS custom properties

### Environment Requirements

- Node.js, npm, Vite dev server for apps/web
- Browser with CSS Grid support (all modern browsers)

---

## 4. Scope

### In Scope (MVP)

- Operator can see three distinct work zones on desktop (>=1200px) -- left
  rail, center canvas, right evidence rail
- Layout uses CSS Grid with tracks derived from layout.css zone tokens
- Left rail is stable and does not collapse on desktop
- Right evidence rail is persistent on desktop, not hidden behind a toggle
- Center canvas is the dominant content area (flexible track)
- Status strip spans the full frame width above the three-zone body
- Navigation rail renders within the left rail grid child
- Right rail renders a placeholder component until Phase 02 populates it
- Shell body no longer uses flexbox-wrap or auto-fit card grids
- Layout degrades gracefully below 1200px to a single-column stack (session
  04 will add proper tablet/mobile behavior)

### Out of Scope (Deferred)

- Tablet and mobile responsive layouts -- _Reason: session 04_
- Router integration for deep linking -- _Reason: session 05_
- Command palette -- _Reason: session 06_
- Content within the right evidence rail -- _Reason: Phase 02_
- sculpt-ui design brief -- _Reason: stub prerequisite in session stub,
  but sculpt-ui is a utility command run by the operator before implementation;
  the implementer follows the design brief output if it exists_

---

## 5. Technical Approach

### Architecture

The shell layout moves from a flex container with two children to a CSS Grid
container with three column tracks:

```
+------------------+-----------------------------+------------------+
|  Left Rail       |  Center Canvas              |  Evidence Rail   |
|  (fixed width)   |  (flexible, dominant)       |  (fixed width)   |
|  18rem           |  1fr (min 42rem)            |  22rem           |
+------------------+-----------------------------+------------------+
```

On viewports below 1200px, the grid collapses to a single column as a
minimal fallback. Session 04 adds the proper tablet two-pane and mobile
single-column layouts.

### Design Patterns

- **CSS Grid named tracks**: Readable column definitions that map to layout
  tokens
- **Progressive enhancement**: Three-zone grid at >=1200px, single-column
  stack below
- **Composition over nesting**: Shell owns the grid; children are simple
  grid items without nested layout hacks

### Technology Stack

- React 18+ (existing)
- CSS custom properties via layout.css (existing)
- CSS Grid layout (no new dependencies)

---

## 6. Deliverables

### Files to Create

| File                                   | Purpose                                   | Est. Lines |
| -------------------------------------- | ----------------------------------------- | ---------- |
| `apps/web/src/shell/evidence-rail.tsx` | Placeholder right evidence rail component | ~45        |

### Files to Modify

| File                                     | Changes                                                                      | Est. Lines Changed |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| `apps/web/src/styles/layout.css`         | Add grid track definitions, desktop media query, grid area names             | ~40                |
| `apps/web/src/shell/operator-shell.tsx`  | Replace flex body with CSS Grid three-zone composition, add right rail child | ~60                |
| `apps/web/src/shell/navigation-rail.tsx` | Remove width self-sizing, adapt to grid containment                          | ~15                |
| `apps/web/src/shell/status-strip.tsx`    | Remove auto-fit card grid pattern from card layout                           | ~15                |
| `apps/web/src/shell/shell-types.ts`      | Add evidence rail zone type if needed                                        | ~5                 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Desktop shell (>=1200px) visibly has three distinct work zones
- [ ] Left rail is stable and does not collapse on desktop
- [ ] Center canvas is the dominant content area (takes remaining space)
- [ ] Right evidence rail is persistent on desktop, not hidden behind a toggle
- [ ] Status strip spans full width above the three-zone body
- [ ] All existing surface rendering still works in the center canvas
- [ ] Below 1200px the layout degrades to a usable single-column stack

### Testing Requirements

- [ ] Visual inspection at 1200px, 1400px, and 1600px confirms three zones
- [ ] Visual inspection at 1024px confirms graceful single-column fallback
- [ ] Navigation rail click handlers still switch surfaces correctly
- [ ] Status strip refresh and approval actions still function
- [ ] No horizontal overflow at any tested width

### Non-Functional Requirements

- [ ] No layout-thrashing CSS transitions (PRD_UX.md section 6)
- [ ] Shell renders in under 100ms on standard hardware
- [ ] All layout values come from layout.css tokens, no magic numbers

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] No banned terms in user-facing strings

---

## 8. Implementation Notes

### Key Considerations

- The current `shellBodyStyle` uses `display: flex; flex-wrap: wrap` which
  must be fully replaced, not layered over
- The current `surfaceWrapperStyle` uses `flex: 999 1` which is a flex-only
  pattern and will not carry over to grid
- The right evidence rail does not exist yet; a placeholder component is
  needed so the grid track is occupied and visible
- The status strip uses `gridTemplateColumns: repeat(auto-fit, minmax(12rem, 1fr))`
  for its internal card grid -- this auto-fit pattern inside the strip can
  stay but should not be used as the shell body layout pattern

### Potential Challenges

- **Minimum content width**: Center canvas has a 42rem minimum; on viewports
  between 1200px and ~1400px the three columns may be tight. Mitigation:
  use `minmax()` with a smaller practical minimum and let the evidence rail
  compress slightly
- **Existing inline styles**: operator-shell.tsx uses CSSProperties objects
  for layout. Switching to CSS classes in layout.css would be cleaner but
  is a larger refactor. This session converts the shell body grid to a CSS
  class and keeps component-internal styles inline per current convention
- **Surface rendering**: All surface components render inside the center
  canvas wrapper. The right rail is a sibling, not a child of the center
  canvas. Cross-surface communication (e.g., pipeline row selection updating
  the right rail) is a Phase 02 concern

### Relevant Considerations

- [TD-2] **Generic responsive collapse**: This session directly resolves
  this technical debt item by replacing the flexbox-wrap shell with
  intentional CSS Grid zones
- [TD-4] **Internal jargon**: The evidence rail placeholder must use
  operator-facing copy, not internal terms
- [WTA-4] **Auto-fit card grids**: This session removes auto-fit as the
  default shell layout pattern per the "What to Avoid" lesson
- [WTA-6] **Skipping sculpt-ui**: The session stub lists sculpt-ui as a
  prerequisite. The design brief should be run before implementation begins

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Evidence rail placeholder must handle empty state gracefully with explicit
  empty-state messaging
- Shell grid must not break or overflow when surface content is taller than
  the viewport (scroll containment)
- Navigation rail active-state indicators must remain correct after the
  layout refactor

---

## 9. Testing Strategy

### Unit Tests

- Evidence rail placeholder renders without errors
- Shell renders all three zones when window width >= 1200px

### Integration Tests

- Navigation rail surface switching still renders correct surface in center
  canvas
- Status strip refresh triggers data reload

### Manual Testing

- Open app at 1200px wide: confirm three distinct zones visible
- Open app at 1400px wide: confirm center canvas is dominant
- Open app at 1600px wide: confirm expanded layout per PRD wide-desktop spec
- Shrink to 1024px: confirm graceful single-column fallback
- Click through all navigation items: confirm surfaces render in center canvas
- Refresh shell: confirm status strip and navigation still function

### Edge Cases

- Viewport exactly at 1200px breakpoint
- Very tall surface content (scroll behavior within center canvas)
- Empty shell summary state (no API data loaded)
- Rapid surface switching during deferred rendering

---

## 10. Dependencies

### External Libraries

- None (CSS Grid is native)

### Other Sessions

- **Depends on**: phase01-session01 (tokens), phase01-session02 (typography)
- **Depended by**: phase01-session04 (responsive), phase01-session05 (router),
  phase01-session06 (command palette); all Phase 02 workbench sessions

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
