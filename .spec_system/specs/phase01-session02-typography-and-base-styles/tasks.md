# Task Checklist

**Session ID**: `phase01-session02-typography-and-base-styles`
**Total Tasks**: 18
**Estimated Duration**: 2-3 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[S0102]` = Session reference (Phase 01, Session 02)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 7      | 7      | 0         |
| Testing        | 3      | 3      | 0         |
| **Total**      | **18** | **18** | **0**     |

---

## Setup (3 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0102] Verify session 01 prerequisites met: confirm `apps/web/src/styles/tokens.css` exists with color/spacing tokens and stylesheets are imported in `apps/web/src/main.tsx`
- [x] T002 [S0102] Run sculpt-ui design brief for typography session: define typographic personality, scale ratios, weight usage, and heading/body/mono pairing intent before any code changes
- [x] T003 [S0102] Identify Google Fonts CDN URLs for Space Grotesk (400, 500, 600, 700), IBM Plex Sans (400, 500, 600), and IBM Plex Mono (400, 500) with `display=swap`

---

## Foundation (5 tasks)

Font loading infrastructure and token definitions.

- [x] T004 [S0102] Add preconnect and Google Fonts stylesheet links to `apps/web/index.html` with preload hint for critical weights (`apps/web/index.html`)
- [x] T005 [S0102] Define font family tokens in tokens.css: `--jh-font-heading`, `--jh-font-body`, `--jh-font-mono` with system font fallback stacks (`apps/web/src/styles/tokens.css`)
- [x] T006 [S0102] Define typographic scale tokens in tokens.css: size, weight, line-height, and letter-spacing for each step (display, h1, h2, h3, h4, body-lg, body, body-sm, caption, mono, mono-sm, label, label-sm) (`apps/web/src/styles/tokens.css`)
- [x] T007 [S0102] Define font weight tokens in tokens.css: `--jh-font-weight-regular` (400), `--jh-font-weight-medium` (500), `--jh-font-weight-semibold` (600), `--jh-font-weight-bold` (700) (`apps/web/src/styles/tokens.css`)
- [x] T008 [S0102] Apply typographic defaults in base.css: update body font-family to use `--jh-font-body` token; add h1-h6 defaults using `--jh-font-heading` and scale tokens; add code/pre defaults using `--jh-font-mono` (`apps/web/src/styles/base.css`)

---

## Implementation (7 tasks)

Shell component migration to typographic tokens.

- [x] T009 [S0102] [P] Migrate `operator-shell.tsx` from inline fontSize/fontWeight/lineHeight values to `var(--jh-text-*)` and `var(--jh-font-weight-*)` token references (`apps/web/src/shell/operator-shell.tsx`)
- [x] T010 [S0102] [P] Migrate `navigation-rail.tsx` from inline fontSize/fontWeight/lineHeight values to typographic token references (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T011 [S0102] [P] Migrate `status-strip.tsx` from inline fontSize/fontWeight/lineHeight values to typographic token references (`apps/web/src/shell/status-strip.tsx`)
- [x] T012 [S0102] [P] Migrate `operator-home-surface.tsx` from inline fontSize/fontWeight/lineHeight values to typographic token references (`apps/web/src/shell/operator-home-surface.tsx`)
- [x] T013 [S0102] Remove Avenir Next and all non-PRD font family references from `apps/web/src/styles/base.css` fallback stack -- body font-family must reference `--jh-font-body` only (`apps/web/src/styles/base.css`)
- [x] T014 [S0102] Audit remaining shell files (`surface-placeholder.tsx`) for any inline font declarations and migrate to token references (`apps/web/src/shell/surface-placeholder.tsx`)
- [x] T015 [S0102] Run banned-terms check (`node scripts/check-app-ui-copy.mjs`) and verify no regressions from typography changes

---

## Testing (3 tasks)

Verification and quality assurance.

- [x] T016 [S0102] Start Vite dev server, verify all three fonts load: Space Grotesk on headings, IBM Plex Sans on body text, IBM Plex Mono on code/data (inspect via browser DevTools computed styles)
- [x] T017 [S0102] Hard-refresh page and verify no FOIT/FOUT: text should be immediately visible with system fonts then swap to web fonts without layout shift
- [x] T018 [S0102] Validate ASCII encoding on all modified files and confirm Unix LF line endings

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
