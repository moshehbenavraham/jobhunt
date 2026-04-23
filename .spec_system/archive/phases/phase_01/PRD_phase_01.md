# PRD Phase 01: Rebuild Foundation and Shell

**Status**: Complete
**Sessions**: 6
**Estimated Duration**: 12-24 days

**Progress**: 6/6 sessions (100%)
**Completed**: 2026-04-23

---

## Overview

Replace the visual foundation and shell composition so the app reads as an
intentional operator workbench rather than a generic AI dashboard. This phase
introduces design tokens, PRD-defined typography, the three-zone layout, a real
router for deep-linkable navigation, and a command palette. Nothing ships to
users until the shell reads as distinctive and aligned with PRD_UX.md.

Maps to **Phase B** of the recovery plan and covers Workstreams 1, 2, and 5:
`docs/ongoing-projects/2026-04-23-app-ux-recovery-plan.md`

---

## Progress Tracker

| Session | Name                                | Status      | Est. Tasks | Validated  |
| ------- | ----------------------------------- | ----------- | ---------- | ---------- |
| 01      | Design Token Layer                  | Complete    | 20         | 2026-04-23 |
| 02      | Typography and Base Styles          | Complete    | 18         | 2026-04-23 |
| 03      | Three-Zone Shell Layout             | Complete    | 20         | 2026-04-23 |
| 04      | Responsive Layout and Mobile        | Complete    | 20         | 2026-04-23 |
| 05      | Router and Deep-Linkable Navigation | Complete    | 20         | 2026-04-23 |
| 06      | Command Palette and Operator Copy   | Not Started | ~18        | -          |

---

## Completed Sessions

- Session 01: Design Token Layer (2026-04-23) -- 20 tasks, apps/web
- Session 02: Typography and Base Styles (2026-04-23) -- 18 tasks, apps/web
- Session 03: Three-Zone Shell Layout (2026-04-23) -- 20 tasks, apps/web
- Session 04: Responsive Layout and Mobile (2026-04-23) -- 20 tasks, apps/web
- Session 05: Router and Deep-Linkable Navigation (2026-04-23) -- 20 tasks, apps/web
- Session 06: Command Palette and Operator Copy (2026-04-23) -- 20 tasks, apps/web

---

## Upcoming Sessions

None -- Phase 01 complete.

---

## Objectives

1. Introduce design token layer (tokens.css, base.css, layout.css) with the PRD
   palette (mineral paper, deep ink, disciplined cobalt, restrained status colors)
2. Load PRD-defined typography (Space Grotesk, IBM Plex Sans, IBM Plex Mono)
3. Move all inline style values to shared CSS custom properties
4. Rework operator shell into a true three-zone layout (left rail, center canvas,
   right evidence rail)
5. Add tablet and mobile-specific layout behavior
6. Adopt a real router for app-owned deep-linkable navigation
7. Add command palette with Cmd/Ctrl+K
8. Replace section intros with concise operator-focused copy

---

## Prerequisites

- Phase 00 completed: banned-terms check in CI, internal jargon stripped, spec
  workflow updated with UX fidelity gates
- sculpt-ui design brief required before each session's implementation

---

## Technical Considerations

### Architecture

- Token layer uses CSS custom properties exclusively -- no CSS-in-JS runtime
- Three-zone layout is a CSS Grid composition, not nested flexbox auto-fit
- Router replaces current hash/query syncing with proper client-side routing
- Command palette is a standalone module with its own keyboard event model

### Technologies

- CSS custom properties for design tokens (tokens.css)
- Space Grotesk / IBM Plex Sans / IBM Plex Mono via self-hosted or CDN
- React Router for deep-linkable navigation
- Vite + React (existing stack in apps/web)

### Risks

- Font loading latency: Mitigate with font-display: swap plus preload links
- Token migration scope: Many components have inline styles that need replacement;
  session 01 establishes tokens, later sessions migrate incrementally
- Router migration: Changing navigation model touches every surface entry point;
  session 05 must be carefully scoped to avoid breaking active surfaces

### Relevant Considerations

- [P00] **Inline style objects with repeated ad hoc color values**: tokens.css
  replaces all of these in sessions 01-02
- [P00] **Generic responsive collapse instead of intentional three-zone
  composition**: session 03 addresses directly
- [P00] **No real router**: session 05 introduces React Router
- [P00] **sculpt-ui was not enforced during Phases 03-06**: every session in
  this phase must go through sculpt-ui design brief first
- [P00] **Avoid generic glassmorphism / SaaS dashboard aesthetics**: the PRD
  palette (mineral paper, deep ink, cobalt accent) is enforced via tokens
- [P00] **Font loading strategy needed**: session 02 implements preloading

---

## Success Criteria

Phase complete when:

- [x] All 6 sessions completed and validated
- [ ] Design token layer exists and all visual values flow through CSS custom
      properties (no inline ad hoc colors, spacing, or typography)
- [ ] PRD typography (Space Grotesk, IBM Plex Sans, IBM Plex Mono) loads
      without visible FOIT/FOUT
- [ ] Desktop shell has three distinct visible work zones (left rail, center
      canvas, right evidence rail)
- [ ] Tablet layout uses collapsed rail and detail drawer
- [ ] Mobile layout is review-first and legible
- [ ] App uses a real router with deep-linkable URLs
- [ ] Cmd/Ctrl+K opens a working command palette
- [ ] All section intros use terse operator copy, no engineering prose
- [ ] Static screenshot of the shell reads as intentional and distinctive
- [ ] banned-terms check passes on all user-visible strings

---

## Dependencies

### Depends On

- Phase 00: Stop the Bleeding (quality gates, jargon removal, workflow updates)

### Enables

- Phase 02: Rebuild Workbench and Review Surfaces (builds on foundation and shell)
