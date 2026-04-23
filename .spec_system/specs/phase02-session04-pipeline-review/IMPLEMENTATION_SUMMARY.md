# Implementation Summary

**Session ID**: `phase02-session04-pipeline-review`
**Package**: apps/web
**Completed**: 2026-04-23
**Duration**: ~1.5 hours

---

## Overview

Rebuilt the pipeline review surface from a monolithic single-scroll component
into a composition of 5 extracted components with dense hybrid rows, sticky
filter/sort controls, pagination, two-zone responsive layout (queue + evidence
rail detail), and shortlist overview. All inline hex/RGB color values migrated
to 28 new pipeline-specific design tokens. All user-visible strings rewritten
for operator triage ergonomics with zero banned-term violations.

---

## Deliverables

### Files Created

| File                                                | Purpose                                                                                             | Lines |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----- |
| `apps/web/src/pipeline/pipeline-row.tsx`            | Dense hybrid-row component (score chip, status pill, legitimacy badge, warning count, keyboard nav) | ~251  |
| `apps/web/src/pipeline/pipeline-filters.tsx`        | Sticky filter bar with section toggles, sort controls, pagination, count badges                     | ~245  |
| `apps/web/src/pipeline/pipeline-context-detail.tsx` | Evidence rail detail panel (metadata grid, warnings, source, report snapshot, stale selection)      | ~328  |
| `apps/web/src/pipeline/pipeline-shortlist.tsx`      | Shortlist overview with metric cards, campaign guidance, top roles                                  | ~162  |
| `apps/web/src/pipeline/pipeline-empty-state.tsx`    | Loading, empty, error, and offline states with operator-grade messages                              | ~71   |

### Files Modified

| File                                                | Changes                                                                                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/pipeline/pipeline-review-surface.tsx` | Full rebuild as composition of 5 extracted components; all inline hex/RGB removed; copy rewrite; refreshing indicator with duplicate-trigger prevention; responsive two-zone layout |
| `apps/web/src/styles/tokens.css`                    | Added 28 pipeline-specific design tokens (queue state tones, row highlight, shortlist card, campaign guidance, warning tones, legitimacy tones, stale selection)                    |
| `apps/web/src/styles/layout.css`                    | Added jh-pipeline-two-zone responsive media query                                                                                                                                   |

---

## Technical Decisions

1. **Inline two-zone layout vs root-level evidence rail injection**: Rendered detail panel within the pipeline surface's own responsive two-zone CSS layout rather than injecting into the root EvidenceRail, because the root layout lacks a content-injection mechanism and adding one would be out of scope
2. **Click-anywhere dense rows vs explicit review button**: Made entire row clickable with role="button", tabIndex, and keyboard handlers for faster operator triage scanning
3. **Refreshing indicator pattern**: Used opacity overlay with pointer-events: none and disabled refresh button while in-flight to prevent duplicate triggers without blocking row selection

---

## Test Results

| Metric             | Value                 |
| ------------------ | --------------------- |
| TypeScript Strict  | 0 errors              |
| Vite Build         | Clean (158 modules)   |
| Banned-Terms Check | 0 pipeline violations |
| ASCII Encoding     | All clean             |

---

## Lessons Learned

1. Extracting a monolithic surface into focused components before rebuilding yields cleaner token migration -- each component has a bounded set of visual values to tokenize
2. The two-zone layout pattern (CSS grid with responsive breakpoint) is reusable across surfaces and avoids the complexity of global evidence rail content injection

---

## Future Considerations

Items for future sessions:

1. Global evidence rail content injection from child pages (would unify pipeline, tracker, and scan detail rendering)
2. Score range and date range filter inputs (deferred until API supports these filters)
3. Unit test coverage for pipeline components (no unit test runner currently configured for web package)

---

## Session Statistics

- **Tasks**: 20 completed
- **Files Created**: 5
- **Files Modified**: 3
- **Tests Added**: 0 (build and type verification only)
- **Blockers**: 0 resolved
