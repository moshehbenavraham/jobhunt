# Session Specification

**Session ID**: `phase01-session04-responsive-layout-and-mobile`
**Phase**: 01 - Rebuild Foundation and Shell
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

The three-zone desktop shell landed in session 03 with a CSS Grid layout that
gives the operator a left navigation rail, a center canvas, and a right evidence
rail. Below the 1200px breakpoint, however, the grid collapses to a single
column with no intentional composition -- the navigation rail, canvas, and
evidence rail simply stack, producing an unusable mobile experience.

This session replaces that generic collapse with purpose-built tablet and mobile
layouts. Tablet gets a collapsed icon-only rail plus a slide-over drawer for the
evidence rail. Mobile gets a review-first single column with a bottom navigation
bar and drawer-based access to context. The goal is that every breakpoint reads
as designed, not as an accidental degradation.

This work is prerequisite to the router (session 05) and command palette
(session 06) because those features need stable responsive shell behavior to
build on.

---

## 2. Objectives

1. Define breakpoint tokens in tokens.css (mobile < 768px, tablet 768-1199px, desktop >= 1200px)
2. Implement tablet layout: collapsed icon-only navigation rail, center canvas dominant, evidence rail as slide-over drawer
3. Implement mobile layout: review-first single column, bottom navigation bar, evidence and navigation accessible via drawers
4. Ensure all breakpoint transitions feel intentional and designed, not accidental collapse

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - provides tokens.css and design token vocabulary
- [x] `phase01-session02-typography-and-base-styles` - provides base.css and typography system
- [x] `phase01-session03-three-zone-shell-layout` - provides desktop three-zone CSS Grid shell

### Required Tools/Knowledge

- CSS Grid and media query responsive layout patterns
- React state management for drawer open/close
- CSS custom properties for breakpoint-aware tokens

### Environment Requirements

- Vite dev server running in apps/web
- Node.js and npm available

---

## 4. Scope

### In Scope (MVP)

- Operator can use the workbench on tablet with a collapsed rail and drawer-based evidence - add breakpoint tokens and media queries
- Operator can use the workbench on mobile with bottom nav and drawer context - add mobile shell composition
- Operator can open and close evidence rail drawer on tablet and mobile - add drawer component and toggle
- Operator can open and close navigation drawer on mobile - add mobile nav drawer
- Navigation rail collapses to icon-only on tablet and hidden on mobile - update NavigationRail
- Evidence rail collapses to slide-over drawer on tablet and mobile - update EvidenceRail
- Shell grid switches composition at each breakpoint - update layout.css and operator-shell.tsx

### Out of Scope (Deferred)

- Touch gesture interactions (swipe to open/close drawers) - _Reason: polish, not MVP_
- Offline or PWA behavior - _Reason: separate concern_
- Router changes - _Reason: session 05_
- Command palette - _Reason: session 06_

---

## 5. Technical Approach

### Architecture

The layout system uses CSS Grid with media queries at three breakpoints. The
shell frame and body change grid-template-columns at each breakpoint. Drawers
are React components with CSS transitions that overlay content on tablet and
mobile. State for drawer visibility lives in the shell hook (useOperatorShell)
or a dedicated useResponsiveShell hook.

### Design Patterns

- **Mobile-first CSS**: Base styles are mobile, media queries add tablet and desktop layouts
- **Progressive disclosure**: Navigation and evidence are always accessible but hidden behind drawers on smaller screens
- **Token-driven breakpoints**: Breakpoint values defined as CSS custom properties and mirrored in a JS constant for useMediaQuery

### Technology Stack

- CSS custom properties for breakpoint tokens
- CSS Grid with media queries for layout composition
- React useState/useEffect for drawer state
- CSS transitions for drawer animation

---

## 6. Deliverables

### Files to Create

| File                                          | Purpose                                        | Est. Lines |
| --------------------------------------------- | ---------------------------------------------- | ---------- |
| `apps/web/src/shell/drawer.tsx`               | Reusable slide-over drawer component           | ~80        |
| `apps/web/src/shell/bottom-nav.tsx`           | Mobile bottom navigation bar                   | ~90        |
| `apps/web/src/shell/use-responsive-layout.ts` | Hook for breakpoint detection and drawer state | ~60        |

### Files to Modify

| File                                     | Changes                                                        | Est. Lines |
| ---------------------------------------- | -------------------------------------------------------------- | ---------- |
| `apps/web/src/styles/tokens.css`         | Add breakpoint tokens section                                  | ~15        |
| `apps/web/src/styles/layout.css`         | Add tablet and mobile media queries, drawer overlay styles     | ~80        |
| `apps/web/src/shell/operator-shell.tsx`  | Wire responsive layout hook, render drawers and bottom nav     | ~60        |
| `apps/web/src/shell/navigation-rail.tsx` | Add collapsed icon-only mode for tablet, hidden on mobile      | ~50        |
| `apps/web/src/shell/evidence-rail.tsx`   | Accept drawer mode prop, render inside drawer on tablet/mobile | ~30        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Tablet shell (768-1199px) uses collapsed icon-only rail and evidence drawer
- [ ] Mobile shell (< 768px) uses bottom nav and review-first single column
- [ ] Evidence rail content is accessible on all breakpoints via drawer or inline
- [ ] Navigation is accessible on all breakpoints via rail, collapsed rail, or bottom nav
- [ ] Drawer opens and closes with smooth CSS transition
- [ ] Breakpoint transitions feel intentional, not accidental collapse

### Testing Requirements

- [ ] Manual testing at desktop (1200px+), tablet (768-1199px), and mobile (< 768px) widths
- [ ] Verify drawer open/close behavior at tablet and mobile breakpoints
- [ ] Verify bottom nav renders only on mobile

### Non-Functional Requirements

- [ ] No layout shift or flash during breakpoint transitions
- [ ] Drawer animation completes in under 300ms

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (tokens for all visual values)
- [ ] sculpt-ui design brief was followed
- [ ] Screenshot review at desktop, tablet, and mobile widths

---

## 8. Implementation Notes

### Key Considerations

- The existing layout.css already has a 1200px desktop media query; tablet and mobile queries slot below it
- Breakpoint tokens are reference values in CSS (cannot be used in media queries directly) but serve as documentation and JS constants
- The evidence rail is currently a simple aside; it needs a mode prop to render inline (desktop) or inside a drawer (tablet/mobile)

### Potential Challenges

- **Drawer focus management**: Drawer should trap focus when open and return focus on close - mitigate with basic focus trap logic
- **Navigation rail icon-only mode**: The current rail has text labels and badges; icon-only mode needs icons that are not yet present - mitigate with single-character or emoji placeholders initially, with proper icons as a follow-up
- **Breakpoint tokens in JS**: CSS custom properties cannot be read before DOM mount - mitigate with a JS constant that mirrors the CSS values

### Relevant Considerations

- [TD-1] **Inline style objects with repeated ad hoc values**: This session must not introduce new inline color/spacing values; all visual values come from tokens
- [TD-2] **Current shell layout uses generic responsive collapse**: This session directly addresses this debt by replacing it with intentional compositions
- [WTA-3] **Generic glassmorphism / SaaS dashboard aesthetics**: Avoid generic drawer patterns; keep the mineral paper / deep ink aesthetic
- [WTA-4] **Auto-fit card grids as default layout**: Do not fall back to auto-fit grids on mobile; use explicit single-column composition

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Drawer component must reset state on close (prevent stale evidence rail content)
- Bottom nav must handle rapid taps without duplicate navigation
- Responsive layout hook must clean up media query listeners on unmount

---

## 9. Testing Strategy

### Unit Tests

- useResponsiveLayout hook returns correct breakpoint for given window width
- Drawer component renders children when open, hides when closed

### Integration Tests

- OperatorShell renders three-zone grid at desktop, collapsed rail at tablet, bottom nav at mobile

### Manual Testing

- Resize browser through all three breakpoints and verify layout composition changes
- Open and close evidence drawer on tablet
- Open and close navigation drawer on mobile
- Verify bottom nav highlights current surface on mobile

### Edge Cases

- Rapid breakpoint crossing (dragging browser resize handle quickly)
- Drawer open when breakpoint changes (should auto-close or adapt)
- Very narrow mobile viewport (320px) still usable

---

## 10. Dependencies

### External Libraries

- None (CSS Grid, media queries, React state are sufficient)

### Other Sessions

- **Depends on**: phase01-session01, phase01-session02, phase01-session03
- **Depended by**: phase01-session05-router-and-deep-linking, phase01-session06-command-palette-and-operator-copy

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
