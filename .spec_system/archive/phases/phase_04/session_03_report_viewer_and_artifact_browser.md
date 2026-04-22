# Session 03: Report Viewer and Artifact Browser

**Session ID**: `phase04-session03-report-viewer-and-artifact-browser`
**Status**: Complete
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/web

---

## Objective

Let the operator inspect generated reports and recent evaluation artifacts from
within the shell, with enough metadata to decide quickly whether a run is ready
for action.

---

## Scope

### In Scope (MVP)

- Build a report viewer for checked-in markdown reports
- Add recent artifact browsing for reports and PDFs with bounded pagination
- Surface report header metadata and artifact readiness without exposing raw
  filesystem internals

### Out of Scope

- Tracker status editing
- Pipeline queue management

---

## Prerequisites

- [x] `phase02-session03-evaluation-pdf-and-tracker-tools`
- [x] `phase04-session01-evaluation-result-contract`
- [x] `phase04-session02-evaluation-console-and-artifact-handoff`

---

## Deliverables

1. Report viewer surface and supporting browser state
2. Artifact browser for recent reports and PDFs
3. API support and tests for bounded artifact reads and missing-artifact states

---

## Success Criteria

- [x] Operators can open and review generated reports in-app
- [x] Recent report and PDF artifacts are discoverable through bounded browser
      views
- [x] Missing or stale artifact states are explicit instead of failing silently
