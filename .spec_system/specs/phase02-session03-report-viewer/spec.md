# Session Specification

**Session ID**: `phase02-session03-report-viewer`
**Phase**: 02 - Rebuild Workbench and Review Surfaces
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session rebuilds the report viewer from its current diagnostic-panel
state into a long-form artifact reader with reading ergonomics that match
the PRD_UX specification. The current ReportViewerSurface is a flat list of
artifact cards with a raw `<pre>` markdown dump and extensive inline hex
color values. It needs to become a wide-column reading experience with
sticky metadata, section navigation, and proper route handling.

The rebuild replaces the current `/reports/:reportId` redirect-to-artifacts
with a real ReportPage component, restructures the surface into center
canvas (reading column) and evidence rail (sticky metadata), adds a
table-of-contents section marker rail, migrates all inline color values to
design tokens, and purges all banned terms from user-facing strings.

This is a critical reading surface -- reports are the primary artifact an
operator reviews after every evaluation run. Getting the reading experience
right here directly supports the 15-second state comprehension goal.

---

## 2. Objectives

1. Rebuild report viewer as a wide-column long-form reader in center canvas
2. Create sticky metadata rail in evidence rail (score, legitimacy, company, role, date, warnings, linked PDF)
3. Add table-of-contents section markers for quick in-report navigation
4. Implement real `/reports/:reportId` route with ReportPage component
5. Migrate all inline hex/RGB values in report viewer files to design tokens
6. Purge all banned terms from report viewer user-facing strings

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session01-evaluation-console-and-run-flow` - Token-migrated chat surface, run status tones
- [x] `phase02-session02-artifact-handoff-and-evidence-rail` - Artifact packet, /runs/:runId route, evidence rail wiring

### Required Tools/Knowledge

- PRD_UX.md report viewer specification (section 3 surface table, section 4 drawers, section 10 color architecture)
- Design token vocabulary from `apps/web/src/styles/tokens.css`
- Three-zone layout system from `apps/web/src/styles/layout.css`
- Report viewer API contract from `report-viewer-types.ts` and `report-viewer-client.ts`

### Environment Requirements

- Vite dev server (`npm run app:web:dev`)
- API server for report-viewer endpoint (`npm run app:api:dev`)
- Banned-terms check script (`scripts/check-app-ui-copy.mjs`)

---

## 4. Scope

### In Scope (MVP)

- Operator can read a full evaluation report in a wide reading column - rebuild ReportViewerSurface layout
- Operator sees score, legitimacy, date, company, and linked PDF sticky in the right rail while scrolling - sticky metadata rail component
- Operator can jump to report sections via visible markers - table-of-contents sidebar or anchors
- Operator can open a report via deep link at `/reports/:reportId` - real ReportPage replacing the redirect
- Operator can download PDF, view in tracker, or re-evaluate from the report view - artifact action buttons
- All report viewer strings pass banned-terms check - copy rewrite
- All report viewer visual values use design tokens - full token migration

### Out of Scope (Deferred)

- Pipeline review surface - _Reason: session 04_
- Inline report editing - _Reason: not in PRD scope_
- Rendered markdown (HTML from markdown AST) - _Reason: raw markdown body is the current API contract; rendering can be a future enhancement_
- Artifact browser/pagination (existing functionality preserved, not rebuilt) - _Reason: session scope discipline_

---

## 5. Technical Approach

### Architecture

The report viewer uses the three-zone layout from Phase 01. The center
canvas hosts the reading column (report body with section markers). The
right evidence rail hosts sticky metadata (score chip, legitimacy, dates,
linked PDF, and action buttons). The left navigation rail is inherited from
the shell.

A new `ReportPage` component at `/reports/:reportId` replaces the current
`Navigate` redirect. It extracts `reportId` from the URL params, passes it
to the `useReportViewer` hook as the initial `reportPath` focus, and
renders the rebuilt surface.

The reading column uses the wide reading width from the PRD (expanded at

> = 1600px breakpoint). Markdown body renders in a `<pre>` with proper
> typographic tokens. A simple section extractor parses `## ` headings from
> the markdown body to produce a table-of-contents list. Clicking a TOC
> entry scrolls the reading column to the corresponding heading anchor.

### Design Patterns

- Three-zone composition: center canvas + evidence rail (from Phase 01)
- Token-only visual values: `var(--jh-*)` for all colors, spacing, typography
- Hook-driven data: `useReportViewer` provides all state and actions
- URL-synced focus: `syncReportViewerFocus` keeps deep link in sync

### Technology Stack

- React 19 + TypeScript
- CSS custom properties (tokens.css)
- React Router v7 (useParams for reportId extraction)
- Existing report-viewer-client.ts and report-viewer-types.ts

---

## 6. Deliverables

### Files to Create

| File                                             | Purpose                                                      | Est. Lines |
| ------------------------------------------------ | ------------------------------------------------------------ | ---------- |
| `apps/web/src/reports/report-metadata-rail.tsx`  | Sticky metadata component for evidence rail                  | ~120       |
| `apps/web/src/reports/report-reading-column.tsx` | Wide reading column with section anchors                     | ~150       |
| `apps/web/src/reports/report-toc.tsx`            | Table-of-contents section marker sidebar                     | ~80        |
| `apps/web/src/reports/report-action-shelf.tsx`   | Artifact action buttons (download PDF, tracker, re-evaluate) | ~70        |
| `apps/web/src/reports/extract-sections.ts`       | Parse markdown headings into TOC entries                     | ~40        |
| `apps/web/src/pages/report-page.tsx`             | Route component for /reports/:reportId                       | ~50        |

### Files to Modify

| File                                             | Changes                                                                       | Est. Lines |
| ------------------------------------------------ | ----------------------------------------------------------------------------- | ---------- |
| `apps/web/src/reports/report-viewer-surface.tsx` | Full rebuild: token migration, layout restructure, compose new sub-components | ~200       |
| `apps/web/src/routes.tsx`                        | Replace Navigate redirect with ReportPage import                              | ~5         |
| `apps/web/src/reports/use-report-viewer.ts`      | Add initialReportPath option for route-driven focus                           | ~15        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Report viewer reads as a long-form artifact browser, not a diagnostic panel
- [ ] Metadata rail stays visible (position: sticky) while scrolling report body
- [ ] Table-of-contents section markers enable jump navigation within long reports
- [ ] `/reports/:reportId` loads the specific report directly (no redirect)
- [ ] Artifact actions (download PDF, view in tracker, re-evaluate) are visible and functional
- [ ] Empty, loading, error, and offline states render with operator-friendly copy

### Testing Requirements

- [ ] Vitest unit tests for extract-sections utility
- [ ] Manual testing of /reports/:reportId deep link with valid and invalid IDs
- [ ] Manual testing of sticky metadata scrolling behavior
- [ ] Manual testing of TOC click-to-scroll navigation

### Non-Functional Requirements

- [ ] Report state comprehension achievable in under 15 seconds (score, legitimacy, company visible without scrolling)

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Zero inline hex/RGB values in report viewer files
- [ ] Banned-terms check passes on all report viewer strings
- [ ] Desktop and mobile layouts reviewed against PRD

---

## 8. Implementation Notes

### Key Considerations

- The current ReportViewerSurface has ~40 inline hex values that must migrate to tokens
- The `<pre>` markdown body currently uses a dark-ink background; PRD calls for mineral paper reading surface
- The existing useReportViewer hook and client are solid; extend rather than rewrite
- The artifacts page at `/artifacts` still renders ReportViewerSurface; preserve this route as the artifact browser while `/reports/:reportId` becomes the focused reading view

### Potential Challenges

- Section extraction from raw markdown: Reports have inconsistent heading styles; use simple `## ` pattern matching with fallback to no-TOC state
- Sticky position in nested scroll containers: Evidence rail must use `position: sticky` within the grid layout, requiring explicit height constraints
- Mobile layout: Reading column goes full-width; metadata moves above the body as a compact summary strip instead of a sticky rail

### Relevant Considerations

- [P01] **Hex/RGB values in non-shell components**: This session fully migrates report viewer files to design tokens
- [P01] **Pre-existing banned-term violations**: Report viewer copy must be rewritten for operator focus
- [P01] **Outlet context vs ShellContext split**: Report page uses outlet context for page-specific state
- [P01] **CSS classes for layout, inline styles for visuals**: Layout uses CSS classes from layout.css; component visuals use inline CSSProperties with token references

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Report loading with explicit loading, empty, error, and offline states
- TOC navigation with scroll behavior that handles missing anchors gracefully
- Sticky metadata rail with state reset or revalidation when report changes

---

## 9. Testing Strategy

### Unit Tests

- extract-sections: correctly parses ## headings, handles empty body, handles no headings
- extract-sections: strips markdown formatting from heading text

### Integration Tests

- Report page route resolves reportId from URL and passes to hook

### Manual Testing

- Open /reports/valid-report-path -- report loads with metadata and reading column
- Open /reports/nonexistent -- empty/error state renders cleanly
- Scroll long report -- metadata rail stays visible
- Click TOC entry -- reading column scrolls to section
- Test at mobile, tablet, desktop, and wide breakpoints

### Edge Cases

- Report with no ## headings: TOC is hidden gracefully
- Report with null score/legitimacy: metadata fields show "Unavailable"
- Report body is empty or null: reading column shows empty state message
- API offline: shows last cached data with offline banner

---

## 10. Dependencies

### External Libraries

- No new dependencies required

### Other Sessions

- **Depends on**: phase02-session01 (token-migrated chat), phase02-session02 (evidence rail, /runs/:runId pattern)
- **Depended by**: phase02-session04 (pipeline review), phase02-session07 (deep linking and guardrails)

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
