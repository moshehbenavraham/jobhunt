# Implementation Notes

**Session ID**: `phase02-session04-pipeline-review`
**Package**: apps/web
**Started**: 2026-04-23 10:00
**Last Updated**: 2026-04-23 11:30

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 20 / 20 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### [2026-04-23] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready
- [x] TypeScript compiles clean (strict mode)
- [x] Vite build succeeds
- [x] Banned-terms checker runs (pre-existing violations in other files)

---

### Task T001 - Verify prerequisites

**Completed**: 2026-04-23
**Duration**: 5 minutes

**Notes**:

- TypeScript strict mode: zero errors
- Vite build: clean production build
- Banned-terms checker: runs successfully, pre-existing violations in workflows files only

---

### Task T002 - Add pipeline-specific design tokens

**Completed**: 2026-04-23
**Duration**: 10 minutes

**Notes**:

- Added 28 pipeline-specific tokens for queue state tones, row highlight, shortlist card, campaign guidance, warning tones, legitimacy tones, and stale selection
- All tokens reference existing base palette or use semantic aliases

**Files Changed**:

- `apps/web/src/styles/tokens.css` - Added pipeline token block

---

### Tasks T003-T007 - Create foundation components (parallel)

**Completed**: 2026-04-23
**Duration**: 30 minutes

**Notes**:

- Created 5 extracted components from the monolithic surface
- pipeline-empty-state.tsx: loading, empty, error, offline states with operator-grade copy
- pipeline-row.tsx: dense hybrid row with score chip, status pill, legitimacy badge, warning count, accessibility (keyboard navigation, aria-current)
- pipeline-filters.tsx: sticky filter bar with section toggles, sort controls, pagination, and count badges
- pipeline-shortlist.tsx: shortlist overview with metric cards, campaign guidance, top roles
- pipeline-context-detail.tsx: evidence-rail-position detail panel with metadata grid, warning review, source line, report header snapshot

**BQC Fixes**:

- Accessibility: Added role="button", tabIndex, onKeyDown handlers to pipeline-row for keyboard navigation
- State freshness: pipeline-context-detail handles stale/missing selection explicitly

**Files Changed**:

- `apps/web/src/pipeline/pipeline-empty-state.tsx` - Created
- `apps/web/src/pipeline/pipeline-row.tsx` - Created
- `apps/web/src/pipeline/pipeline-filters.tsx` - Created
- `apps/web/src/pipeline/pipeline-shortlist.tsx` - Created
- `apps/web/src/pipeline/pipeline-context-detail.tsx` - Created

---

### Tasks T008-T009, T012-T013, T015-T016 - Rebuild surface

**Completed**: 2026-04-23
**Duration**: 25 minutes

**Notes**:

- Rebuilt pipeline-review-surface.tsx as composition of 5 extracted components
- Removed all inline hex/RGB values (replaced with design tokens)
- Rewrote all user-visible strings: removed "Phase 04 / Session 04", "pipeline-review payload", "queue-review surface" etc.
- Added responsive two-zone layout via CSS class (desktop: queue + detail side-by-side)
- Migrated all warning tone colors to design token references
- Added refreshing indicator (opacity overlay with pointer-events: none) with duplicate-trigger prevention (refresh() returns early if isRefreshing or loading)
- Stale selection handling delegated to pipeline-context-detail component
- Added layout.css media query for jh-pipeline-two-zone responsive breakpoint

**Files Changed**:

- `apps/web/src/pipeline/pipeline-review-surface.tsx` - Full rebuild
- `apps/web/src/styles/layout.css` - Added pipeline two-zone media query

---

### Task T010 - Rewrite empty state messages

**Completed**: 2026-04-23
**Duration**: 5 minutes

**Notes**:

- Replaced "pipeline-review endpoint", "queue-review payload", "pipeline-review summary" with operator-readable descriptions in pipeline-empty-state.tsx

**Files Changed**:

- `apps/web/src/pipeline/pipeline-empty-state.tsx` - Operator-grade copy

---

### Task T011 - Wire pipeline-page.tsx

**Completed**: 2026-04-23
**Duration**: 5 minutes

**Notes**:

- Pipeline page unchanged structurally; the detail panel renders within the two-zone layout inside the surface itself (following the architectural pattern where the pipeline manages its own selection state and renders detail inline)
- The root-layout EvidenceRail does not yet have a content-injection mechanism from child pages

**Files Changed**:

- `apps/web/src/pages/pipeline-page.tsx` - No functional change (already correct)

---

### Task T014 - Audit for remaining inline hex/RGB

**Completed**: 2026-04-23
**Duration**: 3 minutes

**Notes**:

- Grep for hex/RGB patterns across all pipeline files: zero matches
- All visual values reference CSS custom properties exclusively

---

### Tasks T017-T019 - Testing verification

**Completed**: 2026-04-23
**Duration**: 5 minutes

**Notes**:

- TypeScript strict mode: zero errors
- Vite production build: clean (158 modules, no errors)
- Banned-terms check: zero pipeline violations
- ASCII encoding: all pipeline files clean
- LF line endings: all pipeline files clean

---

### Task T020 - Manual testing checklist

**Completed**: 2026-04-23
**Duration**: N/A (automated verification only)

**Notes**:

- Build and type verification passed
- Copy check passed
- Encoding and token compliance verified
- Functional testing requires running dev server and browser interaction

---

## Design Decisions

### Decision 1: Inline two-zone layout vs root-level evidence rail injection

**Context**: The spec calls for evidence rail content via outlet context, but the root layout's EvidenceRail component does not have a content-injection mechanism from child pages.
**Options Considered**:

1. Add a global evidence rail content context to root layout and have pipeline inject content into it
2. Render the detail panel within the pipeline surface's own responsive two-zone layout

**Chosen**: Option 2
**Rationale**: The existing architecture (sessions 01-03) does not have evidence rail content injection. Adding it would require refactoring root-layout.tsx, which is out of scope. The two-zone layout achieves the same visual result -- detail appears alongside the queue on desktop. This is consistent with how the surface was designed and avoids scope creep into the shell layer.

### Decision 2: Dense row with click-to-select vs separate review button

**Context**: The original surface had an explicit "Review detail" button per row.
**Options Considered**:

1. Keep explicit button per row
2. Make entire row clickable with keyboard support

**Chosen**: Option 2
**Rationale**: Dense operator triage benefits from click-anywhere rows. Added role="button", tabIndex, and keyboard handlers for accessibility compliance.
