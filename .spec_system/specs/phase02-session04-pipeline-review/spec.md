# Session Specification

**Session ID**: `phase02-session04-pipeline-review`
**Phase**: 02 - Rebuild Workbench and Review Surfaces
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

The pipeline review surface is the operator's primary tool for triaging the
evaluation queue -- scanning pending and processed items, filtering by status
or score, and drilling into any row without losing the queue context. The
current implementation (`pipeline-review-surface.tsx`) works functionally but
has ~60 inline hex/RGB color values, uses the now-banned "Phase 04 / Session
04" header copy, and renders everything in a single scrolling column with no
evidence rail integration.

This session rebuilds the pipeline surface as a dense hybrid-row listing in
the center canvas with a context rail in the evidence rail position. Sticky
filters, sort controls, and clear visual hierarchy for pipeline stages land
here. All inline colors migrate to design tokens and all copy is rewritten
for operator triage ergonomics.

The rebuild follows the same patterns established in sessions 01-03: token-
compliant inline CSSProperties, ShellContext callbacks for navigation, outlet
context for page state, and the three-zone layout from Phase 01.

---

## 2. Objectives

1. Rebuild the pipeline surface with dense hybrid rows (company + role +
   score + status + legitimacy + warnings in one scannable row)
2. Add context rail detail in the evidence rail position -- selecting a
   pipeline item populates the right rail without route churn
3. Implement sticky filter bar (section, score range, date range) at the
   top of center canvas
4. Implement sort controls (date, score, company, queue order)
5. Migrate all inline hex/RGB color values to design token custom properties
6. Replace all internal jargon and banned terms with operator-focused copy
7. Add pipeline-specific design tokens to tokens.css

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - Design tokens
- [x] `phase01-session02-typography-and-base-styles` - Typography
- [x] `phase01-session03-three-zone-shell-layout` - Three-zone layout
- [x] `phase01-session04-responsive-layout-and-mobile` - Responsive layout
- [x] `phase01-session05-router-and-deep-linking` - Router and deep linking
- [x] `phase01-session06-command-palette-and-operator-copy` - Command palette
- [x] `phase02-session01-evaluation-console-and-run-flow` - Evaluation console
- [x] `phase02-session02-artifact-handoff-and-evidence-rail` - Artifact handoff
- [x] `phase02-session03-report-viewer` - Report viewer

### Required Tools/Knowledge

- Design token vocabulary in `apps/web/src/styles/tokens.css`
- Pipeline review API contract in `pipeline-review-types.ts`
- Three-zone layout CSS from `apps/web/src/styles/layout.css`

### Environment Requirements

- Node.js with Vite dev server
- TypeScript strict mode
- Banned-terms copy check: `scripts/check-app-ui-copy.mjs`

---

## 4. Scope

### In Scope (MVP)

- Operator can scan 20+ pipeline items in a dense hybrid-row listing in center canvas
- Operator can select any row to see detail in the evidence rail without navigating away
- Operator can filter by section (all / pending / processed) with sticky controls
- Operator can sort by company, queue order, or score with sticky controls
- Shortlist context section rebuilt with token-compliant styling
- Selected detail section rebuilt for evidence rail rendering
- All inline hex/RGB values replaced with design token references
- All banned terms purged from user-visible strings
- Pipeline-specific design tokens added (queue state tones, row highlight)
- Responsive layout: 3-tier (mobile / desktop / wide) matching session 03 patterns
- Pipeline page wired to pass evidence rail content via outlet context

### Out of Scope (Deferred)

- Tracker and scan surfaces - _Reason: session 05_
- Batch and specialist surfaces - _Reason: session 06_
- Inline pipeline item editing - _Reason: not in PRD scope_
- Score range and date range filter inputs - _Reason: API does not yet support these filters; section/sort only for MVP_

---

## 5. Technical Approach

### Architecture

The pipeline surface splits into two rendering zones:

1. **Center canvas**: Dense hybrid-row listing with sticky filter/sort bar.
   Each row shows company, role, score chip, status pill, legitimacy badge,
   and warning count in a single scannable line. The shortlist context
   section sits above the queue listing.

2. **Evidence rail**: When a row is selected, the selected detail renders in
   the evidence rail via outlet context (following session 02/03 patterns).
   This replaces the current inline "Selected detail" section.

### Design Patterns

- **Outlet context for evidence rail**: Pipeline page passes selected detail
  content to the evidence rail via the same outlet context mechanism used by
  evaluation console and report viewer
- **Token-only styling**: All visual values reference CSS custom properties
- **Hybrid row component**: Extracted helper for dense row rendering

### Technology Stack

- TypeScript React (Vite) -- `apps/web`
- CSS custom properties from `tokens.css`
- React Router v7 (existing)

---

## 6. Deliverables

### Files to Create

| File                                                | Purpose                    | Est. Lines |
| --------------------------------------------------- | -------------------------- | ---------- |
| `apps/web/src/pipeline/pipeline-row.tsx`            | Dense hybrid-row component | ~120       |
| `apps/web/src/pipeline/pipeline-filters.tsx`        | Sticky filter + sort bar   | ~100       |
| `apps/web/src/pipeline/pipeline-context-detail.tsx` | Evidence rail detail panel | ~150       |
| `apps/web/src/pipeline/pipeline-shortlist.tsx`      | Shortlist context section  | ~100       |
| `apps/web/src/pipeline/pipeline-empty-state.tsx`    | Empty/loading/error states | ~60        |

### Files to Modify

| File                                                | Changes                                                                       | Est. Lines |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| `apps/web/src/pipeline/pipeline-review-surface.tsx` | Rebuild as composition of extracted components, token migration, copy rewrite | ~200       |
| `apps/web/src/pages/pipeline-page.tsx`              | Wire evidence rail via outlet context                                         | ~30        |
| `apps/web/src/styles/tokens.css`                    | Add pipeline-specific design tokens                                           | ~30        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Pipeline lists 20+ items in dense hybrid rows
- [ ] Selecting a row shows detail in evidence rail without route change
- [ ] Section filter (all/pending/processed) works
- [ ] Sort controls (company/queue/score) work
- [ ] Pagination controls work
- [ ] Shortlist context renders with token-compliant cards
- [ ] Report viewer opens from pipeline detail

### Testing Requirements

- [ ] TypeScript compiles with zero errors (strict mode)
- [ ] Vite build succeeds cleanly
- [ ] Banned-terms check passes on all pipeline files
- [ ] Manual testing of filter/sort/select/paginate flows

### Non-Functional Requirements

- [ ] Zero inline hex/RGB color values in pipeline files
- [ ] All user-visible strings are operator-grade terse copy
- [ ] Responsive layout works at mobile, desktop, and wide breakpoints

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions
- [ ] Design tokens used exclusively for all visual values

---

## 8. Implementation Notes

### Key Considerations

- The existing `use-pipeline-review.ts` hook and `pipeline-review-client.ts`
  are well-structured and do not need modification -- only the rendering
  layer changes
- The `pipeline-review-types.ts` type definitions are complete and stable
- The API contract includes section, sort, and selection state management --
  the rebuild is purely a presentation concern

### Potential Challenges

- Dense row layout on mobile: Need to stack rather than truncate, following
  the responsive patterns from session 03/04
- Evidence rail rendering: Must follow the outlet context pattern from
  session 02 to populate the right zone without adding a new route

### Relevant Considerations

- [P01] **Hex/RGB values in non-shell components**: This session migrates
  ~60 inline color values in pipeline files to design tokens
- [P01] **Pre-existing banned-term violations**: "Phase 04 / Session 04"
  header and other internal copy must be purged
- [P01] **Outlet context vs ShellContext split**: Evidence rail content via
  outlet context, navigation callbacks via ShellContext
- [P01] **CSS classes for layout, inline styles for visuals**: Maintain
  separation -- grid layout in CSS, component visuals in inline styles
  with token references

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Filter/sort state transitions could flash stale data while refetching --
  show refreshing indicator during in-flight requests
- Row selection must not cause route churn -- evidence rail updates via
  state, not navigation
- Empty/error/offline states must be explicit and operator-readable

---

## 9. Testing Strategy

### Unit Tests

- Pipeline row renders correctly with all field combinations
- Filter bar emits correct section/sort callbacks
- Empty state shows appropriate message per status

### Integration Tests

- Pipeline page renders within three-zone layout
- Evidence rail populates on row selection

### Manual Testing

- Load pipeline with 20+ items, verify dense scanning ergonomics
- Filter by pending/processed, verify row set changes
- Sort by company/score/queue, verify order changes
- Select a row, verify evidence rail populates
- Test on mobile viewport, verify responsive stacking
- Run `scripts/check-app-ui-copy.mjs`, verify zero violations

### Edge Cases

- Pipeline with zero items (empty state)
- Pipeline offline / API error (degraded state with last snapshot)
- All rows missing reports (warning badges on every row)
- Selected row disappears after filter change (stale selection handling)
- Very long company names or role titles (text truncation)

---

## 10. Dependencies

### External Libraries

- No new dependencies required

### Other Sessions

- **Depends on**: phase01 sessions 01-06, phase02 sessions 01-03
- **Depended by**: phase02-session05-tracker-and-scan-surfaces, phase02-session07-deep-linking-approvals-and-guardrails

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
