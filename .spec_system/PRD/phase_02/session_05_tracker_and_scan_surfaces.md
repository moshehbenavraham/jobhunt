# Session 05: Tracker and Scan Surfaces

**Session ID**: `phase02-session05-tracker-and-scan-surfaces`
**Status**: Not Started
**Estimated Tasks**: ~20
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Rebuild the tracker and scan review surfaces for dense operator scanning with
sticky filters, context rail, and clear action shelves.

---

## Scope

### In Scope (MVP)

- Rebuild tracker-workspace-surface.tsx with dense scannable rows
  (company + role + status + score + last action + date)
- Sticky filters for tracker (status, score, date)
- Tracker context rail: selecting a row shows detail in evidence rail
- Rebuild scan-review-surface.tsx with dense job-listing rows
- Rebuild scan-review-shortlist.tsx for shortlisted items
- Rebuild scan-review-action-shelf.tsx with clear action buttons
- Rebuild scan-review-launch-panel.tsx for starting new scans
- Scan context rail: selecting a listing shows detail in evidence rail
- Migrate all inline hex/RGB values to design tokens
- Replace all internal jargon with operator-focused copy
- sculpt-ui design brief before implementation

### Out of Scope

- Batch/specialist surfaces (session 06)
- Inline tracker editing beyond status updates
- Portal configuration UI

---

## Prerequisites

- [ ] Sessions 01-04 complete (evaluation console, artifact handoff, report
      viewer, pipeline review)
- [ ] sculpt-ui design brief produced for tracker and scan surfaces

---

## Deliverables

1. Dense tracker workspace with scannable rows
2. Dense scan review with listing rows and shortlist
3. Context rail detail for both surfaces
4. Sticky filters for tracker
5. Clear action shelves for scan
6. Token-compliant styling
7. Banned-terms-clean operator copy

---

## Success Criteria

- [ ] Tracker supports rapid scanning of 30+ application rows
- [ ] Scan review supports scanning of 20+ job listings
- [ ] Context rail updates without route churn on both surfaces
- [ ] Action shelves are clearly visible and logically grouped
- [ ] No inline hex/RGB color values in tracker or scan files
- [ ] Banned-terms check passes on all tracker and scan strings
- [ ] Desktop and mobile screenshots reviewed against PRD
