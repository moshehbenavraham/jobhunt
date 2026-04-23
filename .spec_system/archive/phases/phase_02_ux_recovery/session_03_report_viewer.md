# Session 03: Report Viewer

**Session ID**: `phase02-session03-report-viewer`
**Status**: Not Started
**Estimated Tasks**: ~18
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Rebuild the report viewer with reading ergonomics so evaluation reports read
as real long-form artifact browsers, not diagnostic panels.

---

## Scope

### In Scope (MVP)

- Rebuild report viewer surface with wide reading column in center canvas
- Sticky metadata rail in evidence rail (score, legitimacy, company, role,
  date, warnings)
- Visible section markers or table-of-contents navigation
- Obvious artifact actions (download PDF, view in tracker, re-evaluate)
- Implement /reports/:reportId route (replace current redirect-to-artifacts)
- Migrate all inline hex/RGB values to design tokens
- Replace all internal jargon with operator-focused copy
- sculpt-ui design brief before implementation

### Out of Scope

- Pipeline review (session 04)
- Tracker/scan/batch surfaces (sessions 05-06)
- Inline report editing

---

## Prerequisites

- [ ] Sessions 01-02 complete (evaluation console and artifact handoff)
- [ ] sculpt-ui design brief produced for report viewer

---

## Deliverables

1. Rebuilt report viewer with wide reading column
2. Sticky metadata rail in evidence rail position
3. Section markers or TOC for long reports
4. Working /reports/:reportId deep link
5. Token-compliant styling
6. Banned-terms-clean operator copy

---

## Success Criteria

- [ ] Report viewer reads like a long-form artifact browser
- [ ] Metadata rail stays visible while scrolling report content
- [ ] Section markers enable quick navigation within long reports
- [ ] /reports/:reportId loads the specific report (not a redirect)
- [ ] No inline hex/RGB color values in report viewer files
- [ ] Banned-terms check passes on all report viewer strings
- [ ] Desktop and mobile screenshots reviewed against PRD
