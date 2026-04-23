# Implementation Notes

**Session ID**: `phase01-session03-three-zone-shell-layout`
**Package**: apps/web
**Started**: 2026-04-23 10:15
**Last Updated**: 2026-04-23 10:35

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 20 / 20 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### [2026-04-23] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed (tokens.css, layout.css, base.css present)
- [x] Tools available (Node.js, npm, jq, git)
- [x] Directory structure ready

---

### Task T001 - Verify prerequisites

**Completed**: 2026-04-23 10:16

**Notes**:

- tokens.css, layout.css, base.css all present with expected token definitions
- Zone width tokens already defined in layout.css from session 01

**Files Changed**: None (verification only)

---

### Task T002 - Verify Vite build

**Completed**: 2026-04-23 10:17

**Notes**:

- Vite build succeeds cleanly: 118 modules, 750KB JS bundle
- No TypeScript errors

**Files Changed**: None (verification only)

---

### Task T003 - Review sculpt-ui design brief

**Completed**: 2026-04-23 10:17

**Notes**:

- No sculpt-ui design brief exists for this session
- Proceeding with spec directives only

**Files Changed**: None (verification only)

---

### Tasks T004-T006 - CSS Grid foundation in layout.css

**Completed**: 2026-04-23 10:20

**Notes**:

- Added `.jh-shell-frame` class: grid container for status strip + shell body
- Added `.jh-shell-body` class: single-column stack by default (mobile-first)
- Added `@media (min-width: 1200px)` query activating three-column grid
- Grid tracks: `var(--jh-zone-rail-width) minmax(0, 1fr) var(--jh-zone-evidence-rail-width)`
- Used `minmax(0, 1fr)` for center canvas to prevent overflow from long content

**Files Changed**:

- `apps/web/src/styles/layout.css` - Added .jh-shell-frame, .jh-shell-body, desktop media query

---

### Task T007 - Create evidence-rail.tsx

**Completed**: 2026-04-23 10:22

**Notes**:

- Created placeholder component with operator-facing copy
- Explicit empty-state messaging: "Select an item in the main view..."
- Consumes layout tokens for padding, background, border, radius
- Includes aria-label for accessibility

**BQC Fixes**:

- Failure path completeness: Empty state renders explicit messaging, not blank
- Accessibility: aria-label on aside element

**Files Changed**:

- `apps/web/src/shell/evidence-rail.tsx` - New file (~55 lines)

---

### Task T008 - Add EvidenceRailContent type

**Completed**: 2026-04-23 10:23

**Notes**:

- Added EvidenceRailContent type to shell-types.ts for future content contract
- Minimal type: heading and isEmpty fields

**Files Changed**:

- `apps/web/src/shell/shell-types.ts` - Added EvidenceRailContent type

---

### Tasks T009-T012, T015-T016 - Operator shell refactor

**Completed**: 2026-04-23 10:28

**Notes**:

- Replaced frameStyle inline object with `.jh-shell-frame` className
- Replaced shellBodyStyle (flexbox-wrap) with `.jh-shell-body` className
- Removed railWrapperStyle and surfaceWrapperStyle (grid containment replaces flex-basis)
- Removed pageStyle padding property (keep color/font/minHeight only)
- Added EvidenceRail as third grid child (persistent, no toggle)
- Added `minWidth: 0` on center canvas section to prevent grid blowout
- surfaceCardStyle preserved unchanged for all surface content

**BQC Fixes**:

- Contract alignment: Grid children match CSS class track definitions
- State freshness: useDeferredValue for surface ID preserved as-is

**Files Changed**:

- `apps/web/src/shell/operator-shell.tsx` - Major refactor: flex-to-grid, three-zone composition

---

### Task T013 - Navigation rail review

**Completed**: 2026-04-23 10:29

**Notes**:

- Reviewed navigation-rail.tsx railStyle: no width/minWidth/maxWidth/flex properties
- No changes needed -- rail correctly defers sizing to grid track containment

**Files Changed**: None (verification only)

---

### Task T014 - Status strip card grid

**Completed**: 2026-04-23 10:30

**Notes**:

- Replaced `repeat(auto-fit, minmax(12rem, 1fr))` with `repeat(4, 1fr)`
- Intentional 4-column layout for the 4 status cards

**Files Changed**:

- `apps/web/src/shell/status-strip.tsx` - Changed cardGridStyle grid-template-columns

---

### Tasks T017-T019 - Verification

**Completed**: 2026-04-23 10:33

**Notes**:

- Structural verification via build output and CSS analysis
- Built CSS confirms three-column grid at >=1200px, single-column below
- TypeScript compiles with zero errors
- 119 modules built (up from 118 with new evidence-rail.tsx)
- DOM structure verified: main > div.jh-shell-frame > StatusStrip + div.jh-shell-body > aside + section + EvidenceRail
- Manual browser testing recommended as part of validate step

**Files Changed**: None (verification only)

---

### Task T020 - ASCII and copy validation

**Completed**: 2026-04-23 10:34

**Notes**:

- All 6 created/modified files verified ASCII-only (no Unicode)
- All files use Unix LF line endings
- No banned terms in user-facing strings in evidence-rail.tsx
- CSS variable names containing "surface" are not user-facing strings

**Files Changed**: None (verification only)

---

## Design Decisions

### Decision 1: minmax(0, 1fr) for center canvas

**Context**: Center canvas track definition needed to prevent content overflow
**Options Considered**:

1. `minmax(var(--jh-zone-canvas-min-width), 1fr)` - enforces 42rem minimum
2. `minmax(0, 1fr)` - flexible with no hard minimum

**Chosen**: Option 2
**Rationale**: At exactly 1200px viewport width, the three columns with a 42rem center minimum would total ~82rem which leaves no room. Using minmax(0, 1fr) allows the center canvas to compress gracefully at the breakpoint boundary. Session 04 will add proper tablet breakpoints.

### Decision 2: repeat(4, 1fr) for status strip cards

**Context**: Replacing auto-fit card grid per WTA-4 lesson
**Options Considered**:

1. `repeat(4, 1fr)` - explicit 4-column for 4 cards
2. `repeat(auto-fill, minmax(14rem, 1fr))` - controlled auto-fill
3. Flexbox with fixed widths

**Chosen**: Option 1
**Rationale**: The status strip always renders exactly 4 cards. An explicit column count is more intentional and predictable than auto-fit. Session 04 will add responsive breakpoints for the status strip.

### Decision 3: CSS classes over inline styles for layout

**Context**: Spec called for moving shell body grid to CSS class
**Chosen**: CSS classes for layout composition (.jh-shell-frame, .jh-shell-body), inline styles for component-specific visual properties
**Rationale**: Grid layout with media queries cannot be expressed in React CSSProperties. CSS classes in layout.css keep layout concerns centralized and enable responsive media queries.
