# Task Checklist

**Session ID**: `phase01-session01-design-token-layer`
**Total Tasks**: 20
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[S0101]` = Session reference (Phase 01, Session 01)
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

- [x] T001 [S0101] Verify prerequisites met: Phase 00 complete, Vite dev server starts, `docs/PRD_UX.md` accessible for palette reference
- [x] T002 [S0101] Create directory structure `apps/web/src/styles/` for token, base, and layout stylesheets
- [x] T003 [S0101] Read `docs/PRD_UX.md` and extract the precise PRD color palette, spacing scale, radius scale, border, and shadow definitions to use as token values

---

## Foundation (5 tasks)

Core token declarations and base styles.

- [x] T004 [S0101] Create `apps/web/src/styles/tokens.css` with `:root` color tokens: PRD palette (mineral paper base, deep ink chrome, disciplined cobalt accent, restrained status green/amber/red/muted) plus semantic aliases for shell-bg, surface-bg, text-primary, text-secondary, text-muted, nav-bg, nav-text, nav-border, accent, status tones
- [x] T005 [S0101] Add spacing scale tokens to `apps/web/src/styles/tokens.css`: 4px base unit scale (--jh-space-1 through --jh-space-16), plus named spacing tokens for common patterns (padding, gap, section-gap)
- [x] T006 [S0101] Add radius, border, and shadow tokens to `apps/web/src/styles/tokens.css`: radius scale (sm, md, lg, xl, pill), border tokens (width, color, subtle), shadow tokens (sm, md, lg for card and panel elevation)
- [x] T007 [S0101] Create `apps/web/src/styles/base.css` with minimal CSS reset (box-sizing, margin/padding zero, image defaults) and `:root`/`body` defaults consuming tokens (background, color, line-height, font smoothing)
- [x] T008 [S0101] Create `apps/web/src/styles/layout.css` with layout zone custom properties: zone widths (rail, canvas, evidence-rail), zone gaps, max-width, and breakpoint tokens (desktop, tablet, mobile thresholds) -- declarations only, no media queries applied

---

## Implementation (8 tasks)

Wire tokens into app and migrate shell components.

- [x] T009 [S0101] Wire CSS imports into `apps/web/src/main.tsx` in cascade order: tokens.css, base.css, layout.css -- imported before React render
- [x] T010 [S0101] Update `apps/web/index.html` with meta theme-color matching PRD shell background token and preconnect hints if CDN fonts are used later
- [x] T011 [S0101] Migrate `apps/web/src/shell/operator-shell.tsx` inline style objects: replace all hardcoded hex/rgb color values, spacing values, border-radius values, and shadow values with `var(--jh-*)` token references
- [x] T012 [S0101] Migrate `apps/web/src/shell/navigation-rail.tsx` inline style objects: replace all hardcoded color hex values, spacing, radius, and border values with `var(--jh-*)` token references; replace glassmorphism backdrop-filter with token-based panel style
- [x] T013 [S0101] Migrate `apps/web/src/shell/status-strip.tsx` inline style objects: replace all hardcoded color hex values, spacing, radius, border, and shadow values with `var(--jh-*)` token references
- [x] T014 [S0101] Migrate `apps/web/src/shell/shell-types.ts` to remove any hardcoded color or style references in surface descriptions that contain banned terms (verify copy is clean)
- [x] T015 [S0101] [P] Audit `apps/web/src/shell/operator-shell.tsx` renderStartupNotice and renderStartupSurface helper functions: replace remaining inline hex values with token references
- [x] T016 [S0101] [P] Audit migrated shell files for any remaining raw hex/rgb values: grep for `#[0-9a-fA-F]` and `rgb(` patterns; fix any survivors

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0101] Run TypeScript check (`npm run check` in apps/web) and verify zero type errors from var() string usage in CSSProperties
- [x] T018 [S0101] Start Vite dev server (`npm run dev` in apps/web) and verify shell renders with PRD palette: mineral paper background, deep ink text, cobalt accents, restrained status colors
- [x] T019 [S0101] Validate ASCII encoding on all new and modified files: no Unicode characters, emoji, smart quotes, or em-dashes; Unix LF line endings only
- [x] T020 [S0101] Run banned-terms copy check (`node scripts/check-app-ui-copy.mjs`) and verify it still passes after all changes

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
