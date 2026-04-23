# Considerations

> Institutional memory for AI assistants. Updated between phases via /carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 00 (2026-04-23)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt

1. Inline style objects with repeated ad hoc color values throughout `apps/web/src` -- tokens.css must replace these
2. Current shell layout uses generic responsive collapse instead of intentional three-zone composition
3. No real router -- hash and query syncing is stretched past its useful limit
4. Internal jargon in user-facing strings (`surface`, `contract`, `session`, `payload`, etc.)
5. `sculpt-ui` was not enforced during Phases 03-06 UI sessions, allowing visual drift

### External Dependencies

_None -- this is a frontend-only recovery effort._

### Performance / Security

1. Font loading strategy needed for Space Grotesk + IBM Plex family (avoid FOIT/FOUT)

### Architecture

1. Design token layer does not exist -- all visual values are scattered in component files
2. Right rail is not persistent on desktop; collapses into auto-fit card grids
3. Missing command palette and keyboard navigation model
4. No deep-linkable routes for report, run, or pipeline review states

---

## Lessons Learned

Proven patterns and anti-patterns from the original Phases 00-06 build.

### What Worked

1. Monorepo with clear `apps/api` and `apps/web` separation
2. Typed backend tool contracts (Phase 02) gave the frontend reliable API surface
3. Spec-driven session workflow caught code and behavioral regressions
4. SQLite operational store kept data local-first
5. Approval flow contract was well-defined and API-clean

### What to Avoid

1. Letting AI generate "helpful" explanatory prose instead of operator-grade terse copy
2. Validating UI sessions only on code completion / tests passing without visual review
3. Generic glassmorphism / SaaS dashboard aesthetics as default styling
4. Auto-fit card grids as the answer to every layout problem
5. Inline style objects duplicated across components instead of shared tokens
6. Skipping `sculpt-ui` design briefs for "just get it working" UI sessions
7. Treating spec validation as done when code compiles, ignoring UX translation fidelity

### Tool/Library Notes

1. Vite + React in `apps/web` -- no framework-level issues, build pipeline is sound
2. Consider React Router for real navigation -- current hash routing is insufficient
3. CSS custom properties preferred over CSS-in-JS for token layer (simpler, faster, debuggable)

---

## Resolved

Recently closed items (buffer -- rotates out after 2 phases).

| Phase | Item                          | Resolution                                               |
| ----- | ----------------------------- | -------------------------------------------------------- |
| 00-06 | Full backend + frontend build | Completed; backend is stable, frontend UX needs recovery |

---

_Seeded by /initspec from Phases 00-06 history. Updated by /carryforward between phases._
