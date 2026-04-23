# Implementation Notes

**Session ID**: `phase02-session03-report-viewer`
**Package**: apps/web
**Started**: 2026-04-23 13:47
**Last Updated**: 2026-04-23 13:55

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

- [x] Prerequisites confirmed (TypeScript compiles clean)
- [x] Tools available (Vite, banned-terms checker)
- [x] Directory structure ready
- [x] Design tokens exist at apps/web/src/styles/tokens.css

---

### Task T001 - Verify prerequisites

**Started**: 2026-04-23 13:47
**Completed**: 2026-04-23 13:48
**Duration**: 1 minute

**Notes**:

- TypeScript compiles with zero errors
- Banned-terms check runs; found 7 violations in report-viewer-surface.tsx
- Design tokens file exists with full PRD palette
- /reports/:reportId route exists as Navigate redirect to /artifacts

**Files Changed**:

- (none -- verification only)

---

### Task T002 - Audit inline hex/RGB and banned terms

**Started**: 2026-04-23 13:48
**Completed**: 2026-04-23 13:49
**Duration**: 1 minute

**Notes**:

- Identified ~40 inline hex values across panelStyle, buttonStyle, subtleButtonStyle, getSelectionTone, getEmptyState, and rendering JSX
- Identified 7 banned-term violations: "Session 03" (x2), "endpoint" (x1), "payload" (x2), "surface" (x1), "artifact review surface" (x1)
- All resolved during T012 (surface rebuild) and T016 (copy rewrite)

**Files Changed**:

- (none -- audit only)

---

### Task T003 - Create extract-sections utility

**Started**: 2026-04-23 13:49
**Completed**: 2026-04-23 13:49
**Duration**: 1 minute

**Notes**:

- Parses ## headings from raw markdown body
- Strips inline formatting (bold, italic, code, strikethrough, links)
- Generates unique slug-based anchor IDs with deduplication
- Handles edge cases: null body, empty body, no headings, empty heading text

**Files Changed**:

- `apps/web/src/reports/extract-sections.ts` - Created (73 lines)

---

### Task T004 - Create ReportPage route component

**Started**: 2026-04-23 13:49
**Completed**: 2026-04-23 13:50
**Duration**: 1 minute

**Notes**:

- Extracts reportId from URL params via useParams
- Passes reportId as initialReportPath to ReportViewerSurface
- Shows fallback UI when no reportId provided
- All styles use design tokens

**Files Changed**:

- `apps/web/src/pages/report-page.tsx` - Created (73 lines)

---

### Task T005 - Wire ReportPage into router

**Started**: 2026-04-23 13:50
**Completed**: 2026-04-23 13:50
**Duration**: 1 minute

**Notes**:

- Replaced Navigate redirect with ReportPage component import
- Removed unused Navigate import from react-router
- Route pattern unchanged: /reports/:reportId

**Files Changed**:

- `apps/web/src/routes.tsx` - Replaced Navigate redirect with ReportPage component

---

### Task T006 - Extend useReportViewer with initialReportPath

**Started**: 2026-04-23 13:50
**Completed**: 2026-04-23 13:50
**Duration**: 1 minute

**Notes**:

- Added optional options parameter with initialReportPath
- Initial state merges URL focus with override reportPath from route
- Renamed createEmptyState to createInitialState for clarity
- Existing cleanup logic in useEffect already handles resource release

**Files Changed**:

- `apps/web/src/reports/use-report-viewer.ts` - Added options parameter, renamed state factory

---

### Task T007 - Add report-viewer semantic token aliases

**Started**: 2026-04-23 13:50
**Completed**: 2026-04-23 13:50
**Duration**: 1 minute

**Notes**:

- Added 7 semantic tokens for report viewer
- Reading surface bg (mineral paper), fg (ink), meta bg, meta border, toc accent, toc active bg, section border

**Files Changed**:

- `apps/web/src/styles/tokens.css` - Added report-viewer section with 7 tokens

---

### Task T008 - Create ReportMetadataRail component

**Started**: 2026-04-23 13:50
**Completed**: 2026-04-23 13:51
**Duration**: 2 minutes

**Notes**:

- Sticky metadata panel with score chip, legitimacy badge, title, archetype, date, report #, verification, URL, linked PDF, file path
- Score chip colors scale by score value (positive/info/attention/error)
- Legitimacy badge uses same token mapping as run-detail-page
- Explicit loading, empty, error, offline states with operator-focused copy
- position: sticky with top offset for evidence rail behavior

**BQC Fixes**:

- State freshness: Metadata re-renders when header prop changes, no stale data
- Failure path: All null/missing values show "Unavailable" rather than blank

**Files Changed**:

- `apps/web/src/reports/report-metadata-rail.tsx` - Created (~250 lines)

---

### Task T009 - Create ReportActionShelf component

**Started**: 2026-04-23 13:51
**Completed**: 2026-04-23 13:51
**Duration**: 1 minute

**Notes**:

- Refresh, Download PDF, View in tracker, Re-evaluate, Browse artifacts buttons
- Duplicate-trigger prevention via useRef guard on refresh
- PDF download button only shown when PDF exists
- All styles use design tokens

**BQC Fixes**:

- Duplicate action prevention: refreshGuardRef blocks rapid double-clicks

**Files Changed**:

- `apps/web/src/reports/report-action-shelf.tsx` - Created (~100 lines)

---

### Task T010 - Create ReportToc component

**Started**: 2026-04-23 13:51
**Completed**: 2026-04-23 13:52
**Duration**: 1 minute

**Notes**:

- Table-of-contents sidebar from TocEntry array
- IntersectionObserver for active section tracking
- Click-to-scroll with smooth behavior and focus management
- aria-label on nav, aria-current on active item
- Returns null when entries array is empty (graceful no-TOC)

**BQC Fixes**:

- Resource cleanup: IntersectionObserver disconnected on unmount
- Accessibility: ARIA labels, focus management, keyboard accessible buttons

**Files Changed**:

- `apps/web/src/reports/report-toc.tsx` - Created (~120 lines)

---

### Task T011 - Create ReportReadingColumn component

**Started**: 2026-04-23 13:52
**Completed**: 2026-04-23 13:52
**Duration**: 1 minute

**Notes**:

- Wide reading column with mineral paper background
- Section id anchors injected into pre body via dangerouslySetInnerHTML with HTML-escaped content
- Explicit loading, empty, error, missing, offline states
- Calls onSectionsExtracted callback for TOC integration

**BQC Fixes**:

- Trust boundary: HTML content is escaped before anchor injection
- Failure path: All error states show user-friendly messages

**Files Changed**:

- `apps/web/src/reports/report-reading-column.tsx` - Created (~130 lines)

---

### Task T012 - Rebuild ReportViewerSurface

**Started**: 2026-04-23 13:52
**Completed**: 2026-04-23 13:53
**Duration**: 3 minutes

**Notes**:

- Complete rewrite composing ReportMetadataRail, ReportReadingColumn, ReportToc, ReportActionShelf
- All ~40 inline hex/RGB values replaced with design token references
- Three layout tiers: mobile (stacked), desktop (reading + rail), wide (toc + reading + rail)
- Viewport tier detection via useViewportTier hook
- initialReportPath prop for route-driven focus

**BQC Fixes**:

- State freshness: TOC entries recalculated via useMemo when body changes
- Failure path: Empty, offline, error states all render with operator-focused copy

**Files Changed**:

- `apps/web/src/reports/report-viewer-surface.tsx` - Full rewrite (~500 lines)

---

### Task T013 - Wire artifacts page to rebuilt surface

**Started**: 2026-04-23 13:53
**Completed**: 2026-04-23 13:53
**Duration**: 0 minutes

**Notes**:

- ArtifactsPage already renders <ReportViewerSurface /> without props
- The new optional initialReportPath prop means no changes needed
- /artifacts route preserved as artifact browser entry

**Files Changed**:

- (none -- already compatible)

---

### Task T014 - Implement sticky metadata behavior

**Started**: 2026-04-23 13:53
**Completed**: 2026-04-23 13:53
**Duration**: 0 minutes

**Notes**:

- Implemented as part of T008 in report-metadata-rail.tsx
- position: sticky with top: var(--jh-space-4)
- Grid layout in parent provides the scroll context

**Files Changed**:

- (done in T008)

---

### Task T015 - Implement mobile/tablet responsive behavior

**Started**: 2026-04-23 13:53
**Completed**: 2026-04-23 13:53
**Duration**: 0 minutes

**Notes**:

- Implemented as part of T012 in report-viewer-surface.tsx
- Mobile: metadata above reading column, no TOC sidebar, stacked layout
- Desktop: reading column + metadata rail side by side
- Wide: TOC sidebar + reading column + metadata rail

**Files Changed**:

- (done in T012)

---

### Task T016 - Rewrite user-facing copy

**Started**: 2026-04-23 13:53
**Completed**: 2026-04-23 13:53
**Duration**: 0 minutes

**Notes**:

- Implemented as part of T012 in report-viewer-surface.tsx
- Removed: "Session 03", "Artifact review surface", "bounded report-viewer summary", "report-viewer endpoint", "report-viewer payload"
- Replaced with: "Reports", "Loading reports and recent files...", "No reports yet", operator-focused descriptions

**Files Changed**:

- (done in T012)

---

### Task T017 - Write unit tests for extract-sections

**Started**: 2026-04-23 13:54
**Completed**: 2026-04-23 13:54
**Duration**: 2 minutes

**Notes**:

- Installed vitest as devDependency for apps/web
- 8 test cases: null body, empty body, no headings, parses headings, strips formatting, duplicate IDs, mixed spacing, empty text after strip
- All tests pass

**Files Changed**:

- `apps/web/src/reports/extract-sections.test.ts` - Created (86 lines)
- `apps/web/package.json` - Added vitest devDependency

---

### Task T018 - Run banned-terms check

**Started**: 2026-04-23 13:54
**Completed**: 2026-04-23 13:54
**Duration**: 1 minute

**Notes**:

- Zero violations in any report-viewer file
- All banned terms ("session", "endpoint", "payload", "surface", "artifact review surface") eliminated

**Files Changed**:

- (none -- verification only)

---

### Task T019 - Run Vite build and TypeScript check

**Started**: 2026-04-23 13:54
**Completed**: 2026-04-23 13:55
**Duration**: 1 minute

**Notes**:

- TypeScript: zero errors
- Vite build: successful (153 modules, 305ms)
- ASCII encoding: all 8 new/modified files verified
- Unix LF endings: all files verified

**Files Changed**:

- (none -- verification only)

---

### Task T020 - Manual testing verification

**Started**: 2026-04-23 13:55
**Completed**: 2026-04-23 13:55
**Duration**: 1 minute

**Notes**:

- Programmatic verification complete (TypeScript, build, banned-terms, ASCII, tests)
- Manual testing checklist for user:
  1. Open /reports/valid-report-path -- report loads with metadata rail and reading column
  2. Open /reports/nonexistent -- empty/error state renders cleanly
  3. Scroll long report -- metadata rail stays visible (sticky)
  4. Click TOC entry (wide viewport) -- reading column scrolls to section
  5. Test at mobile (<768px), tablet (768-1199px), desktop (1200-1599px), wide (>=1600px)
  6. Verify /artifacts route still works as artifact browser
  7. Verify artifact action buttons (refresh, tracker, re-evaluate) are functional

**Files Changed**:

- (none -- manual verification)

---

## Design Decisions

### Decision 1: Viewport tier detection via JS vs CSS media queries

**Context**: Needed responsive layout that switches between mobile/tablet/desktop/wide
**Options Considered**:

1. CSS-only with media queries -- simpler but cannot conditionally render components
2. JS viewport detection -- enables conditional rendering of TOC sidebar and metadata position

**Chosen**: JS viewport detection (useViewportTier hook)
**Rationale**: Need to conditionally render ReportToc (only on wide) and move ReportMetadataRail between positions (above reading column on mobile, beside it on desktop+)

### Decision 2: HTML anchor injection via dangerouslySetInnerHTML

**Context**: Need clickable section anchors in pre-formatted markdown body
**Options Considered**:

1. Split body into sections and render React elements -- complex, breaks pre formatting
2. Inject span elements with IDs into HTML-escaped content -- simpler, preserves formatting

**Chosen**: HTML injection with full escaping
**Rationale**: Body content is HTML-escaped before anchor spans are injected, so XSS risk is mitigated. Preserves the pre-wrap formatting that operators expect.

---
