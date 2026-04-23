# Session Specification

**Session ID**: `phase02-session05-tracker-and-scan-surfaces`
**Phase**: 02 - Rebuild Workbench and Review Surfaces
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session rebuilds the tracker workspace and scan review surfaces to match
the operator-grade workbench aesthetic established in Phase 01 and refined
across Phase 02 sessions 01-04. The current tracker and scan components use
inline hex/RGB values, generic SaaS card layouts, hardcoded phase/session
references in headers, and internal planning jargon in empty-state copy.

The rebuild replaces all inline color values with CSS custom property tokens,
restructures the tracker into dense scannable rows with sticky filters and an
evidence-rail detail pane, restructures the scan surfaces into dense listing
rows with context-rail actions, and rewrites all user-facing copy to be terse,
operator-focused, and jargon-free. Both surfaces will integrate with the
three-zone shell layout by rendering their detail/action panes in the right
evidence rail on desktop and a drawer on mobile.

This session completes the second-to-last major workbench surface rebuild
before session 06 (batch/specialist) and session 07 (deep-linking/guardrails).

---

## 2. Objectives

1. Replace all inline hex/RGB color values in tracker and scan components
   with CSS custom property tokens from tokens.css
2. Rebuild tracker workspace into dense, scannable table rows with sticky
   filter bar and evidence-rail detail pane
3. Rebuild scan review surfaces into dense listing rows with context-rail
   action shelf
4. Rewrite all user-facing copy in tracker and scan files to be
   jargon-free and operator-focused
5. Ensure both surfaces pass the banned-terms copy check

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - CSS custom property tokens
- [x] `phase01-session02-typography-and-base-styles` - Typography system
- [x] `phase01-session03-three-zone-shell-layout` - Three-zone shell with evidence rail
- [x] `phase01-session04-responsive-layout-and-mobile` - Responsive breakpoints
- [x] `phase01-session05-router-and-deep-linking` - React Router deep links
- [x] `phase01-session06-command-palette-and-operator-copy` - Copy conventions
- [x] `phase02-session01-evaluation-console-and-run-flow` - Run flow patterns
- [x] `phase02-session02-artifact-handoff-and-evidence-rail` - Evidence rail integration
- [x] `phase02-session03-report-viewer` - Report viewer (tracker handoff target)
- [x] `phase02-session04-pipeline-review` - Dense review surface patterns

### Required Tools/Knowledge

- Design token vocabulary from tokens.css
- Three-zone layout integration patterns from Phase 01 sessions 03-04
- Evidence rail composition from Phase 02 session 02
- Dense row patterns established in Phase 02 session 04 (pipeline review)

### Environment Requirements

- Node.js, npm
- Vite dev server for apps/web

---

## 4. Scope

### In Scope (MVP)

- Operator can scan 30+ tracker application rows in a dense table view - token-based styling, compact row height
- Operator can filter tracker rows by status, search, score, and date via sticky filter bar - filters persist above scrollable rows
- Operator can select a tracker row to see full detail in the evidence rail - no route churn
- Operator can update tracker row status from the evidence rail detail pane
- Operator can scan 20+ scan review shortlist listings in dense rows - token-based styling
- Operator can filter scan shortlist by fit bucket and ignored state
- Operator can select a scan listing to see detail and actions in the evidence rail
- Operator can launch evaluation, seed batch, or ignore/restore from scan action shelf
- Operator can launch new scans and scope to specific run sessions
- All inline hex/RGB values migrated to design token custom properties
- All user-facing copy rewritten to be jargon-free
- sculpt-ui design brief for both surfaces (embedded in session approach)

### Out of Scope (Deferred)

- Batch/specialist surfaces - _Reason: session 06_
- Inline tracker editing beyond status updates - _Reason: post-recovery_
- Portal configuration UI - _Reason: post-recovery_
- Deep-linking for tracker/scan detail states - _Reason: session 07_

---

## 5. Technical Approach

### Architecture

Both surfaces follow the three-zone pattern: left rail navigation (existing),
center canvas with dense rows and sticky filters, right evidence rail for
selected-item detail. Detail panes render inside the existing evidence rail
slot, not as separate columns inside the surface component.

Tracker surface splits into: filter bar (sticky), row list (scrollable),
and detail pane (evidence rail). Scan surface splits into: launch panel,
shortlist list (scrollable with bucket filters), and action shelf (evidence
rail).

### Design Patterns

- **Token-only styling**: All CSSProperties objects reference var() tokens, zero raw hex
- **Outlet context for state**: Tracker and scan hooks pass selected state to evidence rail via outlet context
- **Dense rows over card grids**: Single-line or two-line rows with explicit column widths (not auto-fit cards)
- **Sticky filter bar**: CSS position sticky for filter section above scrollable list
- **Conditional rendering for rail content**: Evidence rail renders tracker detail or scan action shelf based on active route

### Technology Stack

- TypeScript React (existing)
- CSS custom properties via tokens.css
- React Router outlet context for evidence rail state

---

## 6. Deliverables

### Files to Create

| File                                           | Purpose                                  | Est. Lines |
| ---------------------------------------------- | ---------------------------------------- | ---------- |
| `apps/web/src/tracker/tracker-filter-bar.tsx`  | Sticky filter bar extracted from surface | ~80        |
| `apps/web/src/tracker/tracker-row-list.tsx`    | Dense row list component                 | ~120       |
| `apps/web/src/tracker/tracker-detail-pane.tsx` | Evidence rail detail pane                | ~180       |
| `apps/web/src/tracker/tracker-styles.ts`       | Shared token-based style objects         | ~60        |

### Files to Modify

| File                                                 | Changes                                                                         | Est. Lines |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/tracker/tracker-workspace-surface.tsx` | Rebuild as composition of filter bar + row list; strip inline hex, rewrite copy | ~150       |
| `apps/web/src/scan/scan-review-surface.tsx`          | Rebuild layout with token styles; strip jargon copy                             | ~80        |
| `apps/web/src/scan/scan-review-shortlist.tsx`        | Dense row layout, token migration, copy cleanup                                 | ~200       |
| `apps/web/src/scan/scan-review-action-shelf.tsx`     | Token migration, evidence rail integration, copy cleanup                        | ~150       |
| `apps/web/src/scan/scan-review-launch-panel.tsx`     | Token migration, copy cleanup                                                   | ~120       |
| `apps/web/src/pages/tracker-page.tsx`                | Wire evidence rail outlet context                                               | ~20        |
| `apps/web/src/pages/scan-page.tsx`                   | Wire evidence rail outlet context                                               | ~20        |
| `apps/web/src/styles/tokens.css`                     | Add tracker/scan semantic token aliases if needed                               | ~30        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Tracker supports rapid scanning of 30+ application rows
- [ ] Scan review supports scanning of 20+ job listings
- [ ] Tracker filter bar stays sticky above scrollable row list
- [ ] Context rail updates without route churn on both surfaces
- [ ] Action shelves are clearly visible and logically grouped
- [ ] Status update from tracker detail pane works end-to-end
- [ ] Scan ignore/restore, launch evaluation, seed batch actions work

### Testing Requirements

- [ ] Banned-terms check passes on all tracker and scan files
- [ ] Manual desktop and mobile screenshot review against PRD
- [ ] Verify no inline hex/RGB values remain in modified files

### Non-Functional Requirements

- [ ] 15-second state comprehension for any tracker row
- [ ] Scan shortlist scannable without horizontal scrolling

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions
- [ ] Zero inline hex/RGB color values in tracker and scan files
- [ ] Zero banned-term violations in tracker and scan strings

---

## 8. Implementation Notes

### Key Considerations

- The tracker-workspace-surface.tsx is ~1100 lines of monolithic JSX. Decompose into filter bar, row list, and detail pane before token migration to keep diffs reviewable.
- Scan review is already decomposed into 4 sub-components. Focus on token migration and copy cleanup within existing structure.
- Both surfaces have extensive inline style objects with raw hex values (~50+ in tracker, ~40+ across scan components).

### Potential Challenges

- **Style object proliferation**: Mitigate by creating shared style modules per surface that reference tokens
- **Evidence rail integration**: Tracker and scan pages need to pass selected-item state to the evidence rail without refactoring the router. Use existing outlet context pattern from Phase 02 session 02.
- **Dense row readability**: Balance information density with scan ergonomics. Use consistent type scale from tokens.

### Relevant Considerations

- [P01] **Hex/RGB values in non-shell components**: This session directly addresses the tracked concern by migrating all tracker and scan inline colors to tokens.
- [P01] **Uppercase label letter-spacing not tokenized**: Apply the tokenized letter-spacing when cleaning up headers.
- [P01] **Pre-existing banned-term violations**: Clean any violations in tracker and scan files.
- [P01] **CSS classes for layout, inline styles for component visuals**: Maintain this separation. Dense row layouts may benefit from a CSS class for grid columns.
- [P01] **Outlet context vs ShellContext split**: Maintain callbacks in ShellContext, state in outlet context.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Stale filter state after tracker refresh (filters should survive data reload)
- Evidence rail showing previous selection detail after clearing or switching surface
- Scan action shelf allowing duplicate action triggers while in-flight

---

## 9. Testing Strategy

### Unit Tests

- Verify token style objects contain no raw hex values (static analysis)

### Integration Tests

- Not applicable (no API changes in this session)

### Manual Testing

- Load tracker with 30+ rows, verify dense scanning ergonomics
- Apply filter combinations, verify sticky behavior on scroll
- Select/deselect tracker rows, verify evidence rail update
- Load scan shortlist with 20+ candidates, verify dense listing
- Select/deselect scan candidates, verify action shelf update
- Verify mobile/tablet layout fallback (evidence rail as drawer)

### Edge Cases

- Empty tracker (zero rows) with and without active filters
- Scan shortlist with all items ignored
- Tracker row with missing report/PDF paths
- Scan candidate with no reason summary
- Rapid row selection while previous detail is loading

---

## 10. Dependencies

### External Libraries

- None new (uses existing React, React Router, CSS custom properties)

### Other Sessions

- **Depends on**: phase02-session01 through session04 (evaluation console, evidence rail, report viewer, pipeline review patterns)
- **Depended by**: phase02-session06-batch-and-specialist-surfaces, phase02-session07-deep-linking-approvals-and-guardrails

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
