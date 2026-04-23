# Task Checklist

**Session ID**: `phase01-session04-responsive-layout-and-mobile`
**Total Tasks**: 20
**Estimated Duration**: 2-3 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 8      | 8      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (3 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0104] Verify sessions 01-03 artifacts exist: tokens.css, base.css, layout.css, operator-shell.tsx with three-zone grid (`apps/web/src/styles/`, `apps/web/src/shell/`)
- [x] T002 [S0104] Run sculpt-ui design brief for responsive layout -- document tablet collapsed-rail composition and mobile bottom-nav composition decisions
- [x] T003 [S0104] Add breakpoint token section to tokens.css with --jh-bp-mobile (768px), --jh-bp-tablet (1200px), and --jh-bp-wide (1600px) reference values (`apps/web/src/styles/tokens.css`)

---

## Foundation (5 tasks)

Core structures and base implementations.

- [x] T004 [S0104] Create useResponsiveLayout hook with matchMedia listeners for mobile/tablet/desktop breakpoints, with cleanup on scope exit for all acquired resources (`apps/web/src/shell/use-responsive-layout.ts`)
- [x] T005 [S0104] Create Drawer component with open/close props, CSS transition slide-in, overlay backdrop, and state reset on close (`apps/web/src/shell/drawer.tsx`)
- [x] T006 [S0104] [P] Add tablet media query (768px-1199px) to layout.css: two-column grid with collapsed rail width and hidden evidence rail column (`apps/web/src/styles/layout.css`)
- [x] T007 [S0104] [P] Add mobile media query (< 768px) to layout.css: single-column grid, bottom padding for nav bar, drawer overlay styles (`apps/web/src/styles/layout.css`)
- [x] T008 [S0104] Create BottomNav component for mobile: horizontal bar with surface icons, active indicator, with duplicate-trigger prevention while in-flight (`apps/web/src/shell/bottom-nav.tsx`)

---

## Implementation (8 tasks)

Main feature implementation.

- [x] T009 [S0104] Update NavigationRail to accept a `variant` prop ("full" | "collapsed" | "hidden") and render icon-only items in collapsed mode (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T010 [S0104] Define icon/label map for each shell surface in NavigationRail for use in collapsed rail and bottom nav (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T011 [S0104] Update EvidenceRail to accept an `inline` boolean prop; when false, render as drawer content instead of a static aside (`apps/web/src/shell/evidence-rail.tsx`)
- [x] T012 [S0104] Wire useResponsiveLayout into OperatorShell: pass variant to NavigationRail, conditionally render EvidenceRail inline or in Drawer, render BottomNav on mobile (`apps/web/src/shell/operator-shell.tsx`)
- [x] T013 [S0104] Add evidence-drawer toggle button to operator-shell tablet layout (visible only on tablet/mobile), wired to drawer open state (`apps/web/src/shell/operator-shell.tsx`)
- [x] T014 [S0104] Add mobile navigation drawer: hamburger button opens full NavigationRail in a Drawer overlay on mobile (`apps/web/src/shell/operator-shell.tsx`)
- [x] T015 [S0104] Ensure drawer auto-closes when breakpoint changes from mobile/tablet to desktop, with state reset or revalidation on re-entry (`apps/web/src/shell/use-responsive-layout.ts`)
- [x] T016 [S0104] Style all new components using only design tokens from tokens.css -- no raw color, spacing, or font values (`apps/web/src/shell/`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0104] Manual testing: resize browser through desktop (1200px+), tablet (768-1199px), and mobile (< 768px) widths -- verify layout composition at each breakpoint
- [x] T018 [S0104] Manual testing: verify drawer open/close behavior (evidence drawer on tablet, navigation drawer on mobile), verify bottom nav renders only on mobile
- [x] T019 [S0104] Validate ASCII encoding on all new and modified files
- [x] T020 [S0104] Screenshot review at desktop, tablet (iPad 810px), and mobile (iPhone 390px) widths against sculpt-ui design brief

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the validate workflow step

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
