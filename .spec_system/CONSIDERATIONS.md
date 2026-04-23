# Considerations

> Institutional memory for AI assistants. Updated between phases via carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 02 (2026-04-23)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt

<!-- Max 5 items -->

- [P02-apps/web] **4 intentional hex values without tokens**: #93c5fd (info border), #7f1d1d (deep error text), #ffffff (row default), rgba(15,23,42,0.06) (subtle selection) have no exact token match. Create tokens if reuse grows beyond 2 files.
- [P02-apps/web] **rgba() values in shared style modules**: tracker-styles.ts and scan-styles.ts contain 3 rgba() values for subtle-button bg and input border. These are centralized but not tokenized.
- [P01-apps/web] **Uppercase label letter-spacing not tokenized**: 0.08em letter-spacing for uppercase labels is hardcoded inline. Should be tokenized during a full component typography audit.
- [P01-apps/web] **operator-shell.tsx is dead code**: Preserved as a thin RouterProvider wrapper. Can be deleted once all imports are confirmed clean.

### External Dependencies

<!-- Max 5 items -->

- [P01-apps/web] **Google Fonts CDN dependency**: Space Grotesk, IBM Plex Sans, and IBM Plex Mono loaded from Google Fonts CDN. Self-hosting deferred but recommended for offline capability and privacy.

### Performance / Security

<!-- Max 5 items -->

- [P01-apps/web] **Backdrop-filter removal**: Glassmorphism backdrop-filter was stripped from shell components for performance and PRD compliance. Do not re-introduce.

### Architecture

<!-- Max 5 items -->

- [P02-apps/web] **Evidence rail has no dynamic content injection**: Root-layout EvidenceRail renders statically. Surfaces that need detail panels use inline two-zone layouts instead. If a future phase needs shell-level evidence rail content from child pages, a context or children-prop bridge must be built.
- [P01-apps/web] **Outlet context vs ShellContext split**: Navigation callbacks live in ShellContext (stable, all pages). State hooks (home, startup, shell) live in outlet context (page-specific). Maintain this separation.
- [P01-apps/web] **CSS classes for layout, inline styles for component visuals**: Grid layout and media queries use CSS classes in layout.css. Component-specific visual properties use inline CSSProperties with token references. Do not mix these concerns.

---

## Lessons Learned

Proven patterns and anti-patterns. Reference during implementation.

### What Worked

<!-- Max 15 items -->

- [P00-P06] **Monorepo with clear apps/api and apps/web separation**: Clean package boundaries enabled parallel work.
- [P00-P06] **Typed backend tool contracts**: Gave the frontend reliable API surface.
- [P00-P06] **Spec-driven session workflow**: Caught code and behavioral regressions.
- [P00-P06] **SQLite operational store**: Kept data local-first.
- [P01-apps/web] **Design tokens as single source of truth**: Replacing inline hex values with CSS custom properties made palette changes atomic and auditable.
- [P01-apps/web] **CSS Grid for three-zone layout**: More predictable than flexbox-wrap for rail/canvas/evidence composition.
- [P01-apps/web] **Drawer state co-located with breakpoint detection**: useResponsiveLayout hook handles breakpoints and drawer open/close without external coordination.
- [P01-apps/web] **React Router Outlet context for state, ShellContext for callbacks**: Clean separation that scales as more pages are added.
- [P01-apps/web] **Sculpt-UI design briefs before implementation**: Produced coherent visual strategies aligned with mineral-paper aesthetic.
- [P02-apps/web] **Compact inline pill rows over nested card sections**: Replaced verbose 6-section artifact rail with single-row pill layout. Dramatically improved scannability.
- [P02-apps/web] **Component extraction from monolithic surfaces**: tracker-workspace reduced from ~1100 to ~235 lines by extracting filter bar, row list, detail pane. Easier to maintain and test.
- [P02-apps/web] **Two-zone inline detail for surfaces without shell-level rail injection**: Pipeline, tracker, and scan surfaces render their own detail panels in a responsive two-column grid, avoiding shell-layer refactoring.
- [P02-apps/web] **requestIdRef concurrency pattern**: Counter-based stale response prevention in useRunDetail hook. Simple, effective, no external dependencies.
- [P02-apps/web] **Shared style modules (tracker-styles.ts, scan-styles.ts)**: Centralizing CSSProperties objects per domain kept components clean while maintaining token usage.
- [P02-apps/web] **Iterative banned-terms script improvement**: Improving heuristics each session (allowlisting property chains, arrow functions) reduced false positives from 141 to 0 without weakening the check.

### What to Avoid

<!-- Max 10 items -->

- [P00-P06] **AI-generated explanatory prose instead of operator-grade terse copy**: Always write for a stressed operator doing triage.
- [P00-P06] **Validating UI sessions only on code/tests without visual review**: Screenshot review against PRD is mandatory.
- [P00-P06] **Generic glassmorphism / SaaS dashboard aesthetics**: Backdrop-filter and gradients dilute the mineral-paper palette identity.
- [P00-P06] **Inline style objects duplicated across components**: Use shared tokens or shared style modules.
- [P00-P06] **Skipping sculpt-ui design briefs**: Causes visual drift across sessions.
- [P01-apps/web] **Conditional rendering for grid layout hiding**: CSS class + media query hiding is more reliable for grid column assignment.
- [P02-apps/web] **Creating single-use tokens for every color variant**: 4 hex values were intentionally kept without tokens to avoid token bloat. Only tokenize if reuse grows.
- [P02-apps/web] **Piping detail content into shell-level evidence rail without architecture support**: Adding outlet context injection requires shell refactoring. Use inline two-zone layouts instead until a proper bridge is built.

### Tool/Library Notes

<!-- Max 5 items -->

- [P01-apps/web] **React Router v7**: createBrowserRouter with Outlet-based layouts. No issues.
- [P01-apps/web] **CSS custom properties over CSS-in-JS**: Simpler, faster, debuggable. Token layer is ~200 lines of :root declarations.
- [P02-apps/web] **vitest**: Added as devDependency in apps/web for unit testing (extract-sections). Lightweight, Vite-native, fast.
- [P02-apps/web] **IntersectionObserver for TOC**: Used in report-toc.tsx for active section tracking. Remember to disconnect on unmount.

---

## Resolved

Recently closed items (buffer -- rotates out after 2 phases).

| Phase | Item                                    | Resolution                                                                                            |
| ----- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| P02   | Hex/RGB values in non-shell components  | All surfaces migrated to design tokens across sessions 01-07. 4 intentional exceptions documented.    |
| P02   | Pre-existing banned-term violations     | Reduced from 141 to 0 across 7 sessions. Script heuristics improved iteratively.                      |
| P02   | No deep-link routes for detail pages    | Added /runs/:runId, /reports/:reportId, /workflows/:workflowId, /batch/:batchId, /scan/:scanId routes |
| P02   | Static command palette                  | Extended with context-aware commands (forSurface filtering) and surface-change reset                  |
| P01   | Inline color values in shell components | Replaced ~75 hex values with CSS custom property tokens in sessions 01-02                             |
| P01   | No design token layer                   | Created tokens.css with color, spacing, radius, border, shadow, font, and typographic scale tokens    |
| P01   | Generic responsive collapse             | Three-zone CSS Grid layout with intentional tablet/mobile breakpoints                                 |
| P01   | No real router / hash routing           | React Router v7 with 13 deep-linkable routes, legacy hash redirect loader                             |
| P01   | Internal jargon in UI strings           | Banned-terms check script + full copy rewrite across shell components                                 |
| P01   | Missing command palette                 | Command palette with Cmd/Ctrl+K, fuzzy search, 16 commands, ARIA roles                                |

---

_Auto-generated by carryforward. Manual edits allowed but may be overwritten._
