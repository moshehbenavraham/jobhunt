# Task Checklist

**Session ID**: `phase02-session03-report-viewer`
**Total Tasks**: 20
**Estimated Duration**: 2.5-3.5 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[S0203]` = Session reference (02=phase, 03=session)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 2      | 2      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 9      | 9      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (2 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0203] Verify prerequisites met: confirm Vite builds clean, banned-terms check runs, design tokens exist, /reports/:reportId currently redirects (`apps/web/src/routes.tsx`)
- [x] T002 [S0203] Audit current report-viewer-surface.tsx for all inline hex/RGB values and banned-term violations; document migration checklist in implementation-notes.md (`apps/web/src/reports/report-viewer-surface.tsx`)

---

## Foundation (5 tasks)

Core structures and base implementations.

- [x] T003 [S0203] [P] Create extract-sections utility to parse ## headings from raw markdown body into TOC entries with id anchors and display text (`apps/web/src/reports/extract-sections.ts`)
- [x] T004 [S0203] [P] Create ReportPage route component that extracts reportId from URL params via useParams and initializes useReportViewer with the report path as initial focus (`apps/web/src/pages/report-page.tsx`)
- [x] T005 [S0203] Wire ReportPage into router replacing the Navigate redirect, with proper import (`apps/web/src/routes.tsx`)
- [x] T006 [S0203] Extend useReportViewer hook to accept an optional initialReportPath parameter for route-driven focus initialization with cleanup on scope exit for all acquired resources (`apps/web/src/reports/use-report-viewer.ts`)
- [x] T007 [S0203] Add report-viewer semantic token aliases to tokens.css if needed (reading surface background, section marker accent, metadata rail tones) (`apps/web/src/styles/tokens.css`)

---

## Implementation (9 tasks)

Main feature implementation.

- [x] T008 [S0203] [P] Create ReportMetadataRail component: sticky metadata panel with score chip, legitimacy badge, date, company/role, linked PDF status, and URL link -- all using design tokens, with explicit loading, empty, error, and offline states (`apps/web/src/reports/report-metadata-rail.tsx`)
- [x] T009 [S0203] [P] Create ReportActionShelf component: artifact action buttons (download PDF, view in tracker, re-evaluate) using design tokens, with duplicate-trigger prevention while in-flight (`apps/web/src/reports/report-action-shelf.tsx`)
- [x] T010 [S0203] [P] Create ReportToc component: table-of-contents section marker sidebar parsed from extract-sections, with click-to-scroll navigation and active section highlight, with platform-appropriate accessibility labels and focus management (`apps/web/src/reports/report-toc.tsx`)
- [x] T011 [S0203] Create ReportReadingColumn component: wide reading column with section id anchors from extract-sections, markdown body in proper typographic tokens (mineral paper background, body font), with explicit loading, empty, error, and offline states (`apps/web/src/reports/report-reading-column.tsx`)
- [x] T012 [S0203] Rebuild ReportViewerSurface: compose ReportMetadataRail, ReportReadingColumn, ReportToc, and ReportActionShelf into three-zone layout; migrate all inline hex/RGB to design tokens; remove all banned terms from user-facing strings (`apps/web/src/reports/report-viewer-surface.tsx`)
- [x] T013 [S0203] Wire artifacts page to use rebuilt ReportViewerSurface preserving the /artifacts route as the artifact browser entry point (`apps/web/src/pages/artifacts-page.tsx`)
- [x] T014 [S0203] Implement sticky metadata behavior: position: sticky with top offset within the grid evidence rail zone, with proper height constraints for nested scroll (`apps/web/src/reports/report-metadata-rail.tsx`)
- [x] T015 [S0203] Implement mobile and tablet responsive behavior: metadata moves to compact summary strip above reading column on mobile; TOC collapses to dropdown or hides on tablet and below (`apps/web/src/reports/report-viewer-surface.tsx`)
- [x] T016 [S0203] Rewrite all user-facing copy in report viewer files: remove "artifact review surface", "Session 03", "bounded report-viewer summary", "report-viewer endpoint", "report-viewer payload", and all other banned/internal terms; replace with operator-focused language (`apps/web/src/reports/report-viewer-surface.tsx`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0203] [P] Write unit tests for extract-sections: parses ## headings, handles empty body, handles no headings, strips markdown formatting, generates unique anchor IDs (`apps/web/src/reports/extract-sections.test.ts`)
- [x] T018 [S0203] Run banned-terms check and fix any remaining violations in report viewer files (`scripts/check-app-ui-copy.mjs`)
- [x] T019 [S0203] Run Vite build and TypeScript check to verify zero errors; validate all new files are ASCII-encoded with Unix LF line endings
- [x] T020 [S0203] Manual testing: verify /reports/:reportId deep link, sticky metadata scroll, TOC click-to-scroll, mobile and desktop layouts, empty/error/offline states, artifact actions

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the validate workflow step

---

## Next Steps

Run the validate workflow step to verify session completeness.
