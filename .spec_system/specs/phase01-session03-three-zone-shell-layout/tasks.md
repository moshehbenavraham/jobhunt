# Task Checklist

**Session ID**: `phase01-session03-three-zone-shell-layout`
**Total Tasks**: 20
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[S0103]` = Session reference (Phase 01, Session 03)
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

- [x] T001 [S0103] Verify prerequisites met: confirm tokens.css, layout.css, and base.css exist with expected token definitions (`apps/web/src/styles/`)
- [x] T002 [S0103] Verify Vite dev server starts cleanly and current shell renders without errors (`apps/web/`)
- [x] T003 [S0103] Review sculpt-ui design brief output for this session if it exists; note any layout directives to follow (`apps/web/`)

---

## Foundation (5 tasks)

Core structures and layout token activation.

- [x] T004 [S0103] Add CSS Grid track definitions to layout.css: define `.jh-shell-body` class with three-column grid using zone tokens, including `minmax()` for center canvas (`apps/web/src/styles/layout.css`)
- [x] T005 [S0103] Add desktop media query (`min-width: 1200px`) to layout.css that activates the three-column grid; default to single-column stack below breakpoint (`apps/web/src/styles/layout.css`)
- [x] T006 [S0103] Add `.jh-shell-frame` class to layout.css for the outer frame grid (status strip above, shell body below) replacing the current inline frameStyle (`apps/web/src/styles/layout.css`)
- [x] T007 [S0103] [P] Create evidence-rail.tsx placeholder component with explicit empty-state messaging using operator-facing copy, consuming layout tokens for padding and background (`apps/web/src/shell/evidence-rail.tsx`)
- [x] T008 [S0103] [P] Add EvidenceRailZone type or props interface to shell-types.ts if needed for the evidence rail placeholder contract (`apps/web/src/shell/shell-types.ts`)

---

## Implementation (8 tasks)

Main layout refactor and component updates.

- [x] T009 [S0103] Refactor operator-shell.tsx: replace `shellBodyStyle` (flexbox-wrap) with the `.jh-shell-body` CSS class, rendering three grid children -- left rail aside, center canvas section, right evidence rail aside (`apps/web/src/shell/operator-shell.tsx`)
- [x] T010 [S0103] Refactor operator-shell.tsx: replace `frameStyle` inline object with the `.jh-shell-frame` CSS class (`apps/web/src/shell/operator-shell.tsx`)
- [x] T011 [S0103] Remove `railWrapperStyle` and `surfaceWrapperStyle` inline style objects from operator-shell.tsx since grid containment replaces flex-basis sizing (`apps/web/src/shell/operator-shell.tsx`)
- [x] T012 [S0103] Render EvidenceRail placeholder as the third grid child in operator-shell.tsx, persistent on desktop without toggle (`apps/web/src/shell/operator-shell.tsx`)
- [x] T013 [S0103] Update navigation-rail.tsx: remove any self-sizing width declarations that conflict with grid track containment (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T014 [S0103] Update status-strip.tsx: replace the auto-fit card grid (`repeat(auto-fit, minmax(12rem, 1fr))`) with a more intentional card layout that does not rely on auto-fit as the primary composition pattern, with state reset or revalidation on re-entry (`apps/web/src/shell/status-strip.tsx`)
- [x] T015 [S0103] Remove `pageStyle` padding/layout properties from operator-shell.tsx that conflict with the new CSS class-based layout; keep only color and font properties inline (`apps/web/src/shell/operator-shell.tsx`)
- [x] T016 [S0103] Ensure `surfaceCardStyle` within center canvas still provides correct background, border, and padding for all rendered surfaces (`apps/web/src/shell/operator-shell.tsx`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0103] Visual verification at 1200px, 1400px, and 1600px: confirm three distinct zones are visible, center canvas is dominant, right rail is persistent (`apps/web/`)
- [x] T018 [S0103] Visual verification at 1024px: confirm graceful single-column fallback without horizontal overflow (`apps/web/`)
- [x] T019 [S0103] Functional verification: click through all navigation rail items, confirm surfaces render in center canvas and status strip actions still work (`apps/web/`)
- [x] T020 [S0103] Validate ASCII encoding on all created and modified files; confirm Unix LF line endings and no banned terms in user-facing strings (`apps/web/src/shell/`, `apps/web/src/styles/`)

---

## Completion Checklist

Before marking session complete:

- [ ] All tasks marked `[x]`
- [ ] All tests passing
- [ ] All files ASCII-encoded
- [ ] implementation-notes.md updated
- [ ] Ready for the validate workflow step

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
