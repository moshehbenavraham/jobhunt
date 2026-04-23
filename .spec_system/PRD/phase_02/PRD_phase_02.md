# PRD Phase 02: Rebuild Workbench and Review Surfaces

**Status**: In Progress
**Sessions**: 7
**Estimated Duration**: 14-28 days

**Progress**: 6/7 sessions (86%)

---

## Overview

Rebuild the main evaluation workbench and all review surfaces on top of the
Phase 01 foundation. The evaluation console becomes a coherent run-to-artifact
handoff flow. Report, pipeline, tracker, scan, batch, and specialist surfaces
are rebuilt for dense operator scanning. Deep-linking reaches all major review
states. Closes with screenshot validation and spec guardrail updates.

Maps to **Phases C + D** of the recovery plan (Workstreams 3, 4, 5, 6):
`docs/ongoing-projects/2026-04-23-app-ux-recovery-plan.md`

---

## Progress Tracker

| Session | Name                                    | Status      | Est. Tasks | Validated  |
| ------- | --------------------------------------- | ----------- | ---------- | ---------- |
| 01      | Evaluation Console and Run Flow         | Complete    | 20         | 2026-04-23 |
| 02      | Artifact Handoff and Evidence Rail      | Complete    | 20         | 2026-04-23 |
| 03      | Report Viewer                           | Complete    | 20         | 2026-04-23 |
| 04      | Pipeline Review                         | Complete    | 20         | 2026-04-23 |
| 05      | Tracker and Scan Surfaces               | Complete    | 22         | 2026-04-23 |
| 06      | Batch and Specialist Surfaces           | Complete    | 22         | 2026-04-23 |
| 07      | Deep Linking, Approvals, and Guardrails | Not Started | ~18        | -          |

---

## Completed Sessions

- **Session 01: Evaluation Console and Run Flow** -- completed 2026-04-23
  - Full token migration of 11 chat/ files (zero inline hex/rgba)
  - Status tones: 10 run states mapped to --jh-color-status-\* tokens
  - Copy purge: all banned terms removed from evaluation console
  - 20/20 tasks, 209/209 tests passing, Vite build clean

- **Session 02: Artifact Handoff and Evidence Rail** -- completed 2026-04-23
  - Compact artifact packet rebuild (score chip, status pills, compact summary, button row)
  - Real /runs/:runId route with Run Detail page (timeline, artifact state, resume/retry)
  - Full token migration of artifact rail (zero inline hex/rgba)
  - useRunDetail hook with polling, abort cleanup, concurrency safety
  - Evidence rail wired for contextual artifact content
  - 20/20 tasks, TS 0 errors, Vite build clean (147 modules)

- **Session 03: Report Viewer** -- completed 2026-04-23
  - Report viewer rebuilt as wide-column long-form reader with mineral paper reading surface
  - Sticky metadata rail (score, legitimacy, company, role, date, warnings, linked PDF)
  - Table-of-contents section markers with click-to-scroll navigation and active highlight
  - Real /reports/:reportId route with ReportPage component
  - Artifact action shelf (refresh, download PDF, tracker, re-evaluate, browse artifacts)
  - Full token migration (zero inline hex/RGB), all banned terms purged
  - 3-tier responsive layout (mobile/desktop/wide)
  - 20/20 tasks, 8/8 tests, TS 0 errors, Vite build clean (153 modules)

- **Session 04: Pipeline Review** -- completed 2026-04-23
  - Pipeline surface rebuilt as composition of 5 extracted components (row, filters, detail, shortlist, empty state)
  - Dense hybrid rows with score chip, status pill, legitimacy badge, warning count
  - Sticky filter bar with section toggles (all/pending/processed) and sort controls (company/queue/score)
  - Pagination controls with count badges
  - Two-zone responsive layout (queue + evidence rail detail on desktop)
  - Shortlist overview with metric cards, campaign guidance, top roles
  - Full token migration (28 pipeline tokens, zero inline hex/RGB)
  - All banned terms purged, refreshing indicator with duplicate-trigger prevention
  - 20/20 tasks, TS 0 errors, Vite build clean (158 modules)

- **Session 05: Tracker and Scan Surfaces** -- completed 2026-04-23
  - Tracker surface rebuilt as composition of 3 extracted components (filter bar, row list, detail pane)
  - Dense scannable rows with explicit column widths and sticky filter bar
  - Tracker detail pane with status update, maintenance actions, report handoff
  - Scan surfaces migrated to token-based styling with dense listing rows
  - Scan action shelf with duplicate-trigger prevention (ignore/restore/launch/seed)
  - Full token migration (10 new semantic tokens, zero inline hex/RGB in components)
  - All banned terms purged from tracker and scan files
  - 22/22 tasks, TS 0 errors

- **Session 06: Batch and Specialist Surfaces** -- completed 2026-04-23
  - Token migration across batch (5 files), specialist (8 files), application-help (5 files)
  - ~120 inline hex/rgba values replaced with CSS custom property references (4 documented exceptions)
  - ~40 banned-term violations purged from user-visible strings across all three surface families
  - Batch item matrix with dense scannable rows, status filters, selection state
  - Specialist workflow cards with ready/gap separation, state panels, review rails
  - Application help launch-to-draft flow with context rail
  - 4 new CSS tokens added (button-subtle-bg, selected-border, selected-highlight-border, selected-highlight-shadow)
  - 22/22 tasks, TS 0 errors, Vite build clean

---

## Upcoming Sessions

- Session 07: Deep Linking, Approvals, and Guardrails

---

## Objectives

1. Rebuild evaluation console as a coherent run-to-artifact handoff flow
2. Make center canvas the active run understanding zone, right rail the compact
   artifact packet
3. Introduce /runs/:runId detail route with timeline, logs, artifact state,
   and resume/retry
4. Achieve 15-second state comprehension for any single evaluation
5. Rebuild report viewer with reading ergonomics (sticky metadata, section
   markers, wide reading column)
6. Rebuild pipeline review with dense hybrid rows and context rail
7. Rebuild tracker, scan, and batch surfaces for dense scanning with sticky
   filters, context rail, and clear action shelves
8. Add explicit deep linking for report and workflow review states
9. Add screenshot-based UX validation to spec workflow
10. Update apex-spec frontend guardrails

---

## Prerequisites

- Phase 01 completed: design tokens, typography, three-zone layout, router,
  command palette, and operator copy all in place
- sculpt-ui design brief required before each session's implementation
- Banned-terms copy check passing in CI

---

## Technical Considerations

### Architecture

- All surfaces consume Phase 01 design tokens via CSS custom properties
- Three-zone layout (left rail, center canvas, right evidence rail) is the
  standard composition for all surfaces
- React Router v7 deep-linkable routes are the navigation foundation
- Outlet context for page-specific state, ShellContext for stable callbacks
- CSS classes for layout, inline CSSProperties with token refs for component
  visuals

### Technologies

- CSS custom properties from tokens.css (Phase 01 token layer)
- React Router v7 (installed in Phase 01)
- Space Grotesk / IBM Plex Sans / IBM Plex Mono (loaded in Phase 01)
- Vite + React (existing stack in apps/web)

### Risks

- Inline hex/RGB migration: surface components still have non-tokenized
  color values from pre-Phase-01 code; each session must migrate as it
  rebuilds
- Banned-term violations: pre-existing violations in application-help,
  approvals, batch, and boot files must be cleaned as those surfaces are
  touched
- Cross-surface consistency: 7 sessions rebuilding different surfaces must
  maintain consistent density, rail usage, and copy tone
- Run detail route (/runs/:runId) implemented in Session 02 with real
  RunDetailPage component

### Relevant Considerations

- [P01] **Hex/RGB values in non-shell components**: Phase 02 must migrate
  inline color values to design tokens as each surface is rebuilt
- [P01] **Pre-existing banned-term violations**: application-help, approvals,
  batch, and boot files must be cleaned in Phase 02
- [P01] **Outlet context vs ShellContext split**: maintain separation --
  navigation callbacks in ShellContext, state hooks in outlet context
- [P01] **CSS classes for layout, inline styles for visuals**: do not mix
  these concerns
- [P01] **Static command registry**: Phase 02 should add context-aware
  commands while keeping the registry pattern
- [P01] **Backdrop-filter removal**: do not re-introduce glassmorphism

---

## Success Criteria

Phase complete when:

- [ ] All 7 sessions completed and validated
- [ ] Evaluation console shows coherent run-to-artifact handoff flow
- [ ] A person can understand one evaluation state in under 15 seconds
- [ ] Completed, paused, failed, and degraded runs are visually distinct
- [ ] /runs/:runId shows real run detail (timeline, logs, artifact state,
      resume/retry)
- [ ] Report viewer has sticky metadata, section markers, and wide reading
      column
- [ ] Pipeline review uses dense hybrid rows with context rail
- [ ] Tracker, scan, and batch surfaces support rapid visual scanning
- [ ] All surfaces use design tokens -- no inline hex/RGB values
- [ ] All user-visible copy passes banned-terms check
- [ ] Deep links work for reports, runs, and major review states
- [ ] Screenshot review produced for every session
- [ ] Desktop and mobile layouts verified against PRD for all surfaces

---

## Dependencies

### Depends On

- Phase 01: Rebuild Foundation and Shell (design tokens, typography,
  three-zone layout, router, command palette)

### Enables

- Project completion (Phase 02 is the final planned phase)
