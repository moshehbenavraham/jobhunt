# Considerations

> Institutional memory for AI assistants. Updated between phases via carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 01 (2026-04-23)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt

<!-- Max 5 items -->

- [P01-apps/web] **Hex/RGB values in non-shell components**: operator-home-surface.tsx and other surface files still contain inline hex color values not yet migrated to design tokens. Phase 02 color migration needed.
- [P01-apps/web] **Uppercase label letter-spacing not tokenized**: 0.08em letter-spacing for uppercase labels is hardcoded inline in multiple components. Should be tokenized when the full component typography audit happens.
- [P01-apps/web] **operator-shell.tsx is dead code**: Preserved as a thin RouterProvider wrapper for backwards compatibility. Can be deleted once all imports are confirmed clean.
- [P01-apps/web] **Pre-existing banned-term violations**: check-app-ui-copy.mjs found violations in application-help, approvals, batch, and boot files that are outside Phase 01 scope. Must be cleaned in Phase 02.

### External Dependencies

<!-- Max 5 items -->

- [P01-apps/web] **Google Fonts CDN dependency**: Space Grotesk, IBM Plex Sans, and IBM Plex Mono loaded from Google Fonts CDN. Self-hosting deferred but recommended for offline capability and privacy.

### Performance / Security

<!-- Max 5 items -->

- [P01-apps/web] **Backdrop-filter removal**: Glassmorphism backdrop-filter was stripped from shell components for performance and PRD compliance. Do not re-introduce.

### Architecture

<!-- Max 5 items -->

- [P01-apps/web] **Outlet context vs ShellContext split**: Navigation callbacks live in ShellContext (stable, all pages). State hooks (home, startup, shell) live in outlet context (page-specific). Maintain this separation in Phase 02.
- [P01-apps/web] **CSS classes for layout, inline styles for component visuals**: Grid layout and media queries use CSS classes in layout.css. Component-specific visual properties use inline CSSProperties with token references. Do not mix these concerns.
- [P01-apps/web] **Static command registry**: Command palette uses a static registry of 16 commands (13 surfaces + 3 actions). Phase 02 should add context-aware commands, but keep the registry pattern.

---

## Lessons Learned

Proven patterns and anti-patterns. Reference during implementation.

### What Worked

<!-- Max 15 items -->

- [P00-P06] **Monorepo with clear apps/api and apps/web separation**: Clean package boundaries enabled parallel work.
- [P00-P06] **Typed backend tool contracts**: Gave the frontend reliable API surface.
- [P00-P06] **Spec-driven session workflow**: Caught code and behavioral regressions.
- [P00-P06] **SQLite operational store**: Kept data local-first.
- [P00-P06] **Approval flow contract**: Well-defined and API-clean.
- [P01-apps/web] **Design tokens as single source of truth**: Replacing ~75 inline hex values across 3 shell components with CSS custom properties made the palette change atomic and auditable.
- [P01-apps/web] **Flat shell background over gradient**: Single mineral-paper token replaced a 3-stop radial gradient, giving a cleaner identity.
- [P01-apps/web] **CSS Grid for three-zone layout**: More predictable than flexbox-wrap for the rail/canvas/evidence composition. Media queries handle responsive transitions cleanly.
- [P01-apps/web] **minmax(0, 1fr) for center canvas**: Prevents grid blowout from long content at the 1200px breakpoint boundary.
- [P01-apps/web] **Drawer state co-located with breakpoint detection**: useResponsiveLayout hook handles both breakpoints and drawer open/close, enabling auto-close on viewport change without external coordination.
- [P01-apps/web] **React Router Outlet context for state, ShellContext for callbacks**: Clean separation that scales as more pages are added.
- [P01-apps/web] **Legacy hash URL redirect loader**: Graceful migration for existing bookmarks without breaking new routing.
- [P01-apps/web] **Sculpt-UI design briefs before implementation**: Session 04 design brief for responsive layout produced a coherent mobile/tablet/desktop strategy aligned with the mineral-paper aesthetic.

### What to Avoid

<!-- Max 10 items -->

- [P00-P06] **AI-generated explanatory prose instead of operator-grade terse copy**: Always write for a stressed operator doing triage.
- [P00-P06] **Validating UI sessions only on code/tests without visual review**: Screenshot review against PRD is mandatory.
- [P00-P06] **Generic glassmorphism / SaaS dashboard aesthetics**: Backdrop-filter and gradients dilute the mineral-paper palette identity.
- [P00-P06] **Auto-fit card grids as default layout solution**: Explicit column counts (repeat(N, 1fr)) are more intentional.
- [P00-P06] **Inline style objects duplicated across components**: Use shared tokens.
- [P00-P06] **Skipping sculpt-ui design briefs**: Causes visual drift across sessions.
- [P00-P06] **Treating validation as done when code compiles**: UX translation fidelity must be verified.
- [P01-apps/web] **Conditional rendering for grid layout hiding**: CSS class + media query hiding is more reliable for grid column assignment. Use conditional rendering only when the rendering context differs significantly (e.g., inline vs drawer evidence rail).

### Tool/Library Notes

<!-- Max 5 items -->

- [P01-apps/web] **React Router v7**: Installed in Phase 01. createBrowserRouter with Outlet-based layouts. No issues.
- [P01-apps/web] **CSS custom properties over CSS-in-JS**: Simpler, faster, debuggable. Token layer is ~200 lines of :root declarations.
- [P01-apps/web] **Google Fonts display=swap**: Prevents FOIT. Combined with preconnect hints for early discovery.

---

## Resolved

Recently closed items (buffer -- rotates out after 2 phases).

| Phase  | Item                                    | Resolution                                                                                         |
| ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P01    | Inline color values in shell components | Replaced ~75 hex values with CSS custom property tokens in sessions 01-02                          |
| P01    | No design token layer                   | Created tokens.css with color, spacing, radius, border, shadow, font, and typographic scale tokens |
| P01    | Generic responsive collapse             | Three-zone CSS Grid layout with intentional tablet/mobile breakpoints (session 03-04)              |
| P01    | No real router / hash routing           | React Router v7 with 13 deep-linkable routes, legacy hash redirect loader (session 05)             |
| P01    | Internal jargon in UI strings           | Banned-terms check script + full copy rewrite across shell components (session 06)                 |
| P01    | Missing command palette                 | Command palette with Cmd/Ctrl+K, fuzzy search, 16 commands, ARIA roles (session 06)                |
| P01    | No right evidence rail                  | Persistent evidence rail on desktop, slide-over drawer on tablet/mobile (sessions 03-04)           |
| P01    | Font loading strategy missing           | Google Fonts CDN with preconnect + display=swap for Space Grotesk + IBM Plex (session 02)          |
| P01    | sculpt-ui not enforced                  | Design brief created for session 04; convention now requires sculpt-ui before every UI session     |
| P00-06 | Full backend + frontend build           | Completed; backend stable, frontend UX recovered in Phase 01                                       |

---

_Auto-generated by carryforward. Manual edits allowed but may be overwritten._
