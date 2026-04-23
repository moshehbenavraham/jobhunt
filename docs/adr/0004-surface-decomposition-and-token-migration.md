# 0004. Surface Decomposition and Token Migration

**Status:** Accepted
**Date:** 2026-04-23

## Context

Phase 02 rebuilt all operator surfaces (evaluation console, report viewer,
pipeline review, tracker workspace, scan review, batch workspace, specialist
workspace, approval inbox, and application-help). Each surface had accumulated
inline hex/rgba color values, monolithic component files exceeding 1000 lines,
and internal engineering jargon in user-facing copy.

## Options Considered

1. Incremental cleanup of existing monolithic components - lower risk but does
   not solve the structural or token consistency problems
2. Systematic decomposition into focused sub-components with shared style
   modules and full token migration - higher initial effort but enforces the
   design token layer from Phase 01

## Decision

Option 2. Each surface was decomposed into 3-6 focused sub-components (empty
state, row, filter bar, detail pane, action shelf) composed by a thin parent.
All inline color values (~300+) were migrated to CSS custom properties defined
in `tokens.css`. Shared style modules (`tracker-styles.ts`, `scan-styles.ts`)
centralize token-based CSSProperties for surfaces with similar row density.
Banned-term violations were driven from 141 to 0.

## Consequences

- ~100 new CSS custom properties added to `tokens.css` for surface-specific
  semantic tokens (status tones, pipeline queue states, report reading
  surface, tracker/scan row highlights).
- Surface components dropped from ~1100 lines to ~235 lines (tracker) with
  sub-components averaging 100-300 lines each.
- Token-based styling makes future palette changes a single-file edit.
- Shared style modules reduce duplication across tracker and scan surfaces.
- The banned-terms script (`check-app-ui-copy.mjs`) now passes with zero
  violations.
- Context-aware command palette (`forSurface` filtering) was added as part
  of the deep-linking session.
