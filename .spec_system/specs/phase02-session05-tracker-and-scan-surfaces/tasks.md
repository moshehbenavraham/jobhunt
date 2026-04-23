# Task Checklist

**Session ID**: `phase02-session05-tracker-and-scan-surfaces`
**Total Tasks**: 22
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 2      | 2      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 11     | 11     | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **22** | **22** | **0**     |

---

## Setup (2 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0205] Verify prerequisites met: confirm tokens.css has color/typography/spacing tokens, confirm shell three-zone layout renders evidence rail, confirm React Router outlet context pattern is available (`apps/web/src/styles/tokens.css`, `apps/web/src/shell/`)
- [x] T002 [S0205] Add tracker/scan semantic token aliases to tokens.css if needed -- row-bg, row-border, row-selected-bg, filter-bar-bg, dense-row-height (`apps/web/src/styles/tokens.css`)

---

## Foundation (5 tasks)

Core structures and shared style modules.

- [x] T003 [S0205] [P] Create tracker shared style module with token-based CSSProperties objects: panel, row, rowSelected, filterBar, button, subtleButton, input, stat card -- zero raw hex values (`apps/web/src/tracker/tracker-styles.ts`)
- [x] T004 [S0205] [P] Create scan shared style module with token-based CSSProperties objects: panel, listingRow, listingRowSelected, bucketBadge, actionButton, subtleButton, stat card -- zero raw hex values (`apps/web/src/scan/scan-styles.ts`)
- [x] T005 [S0205] Extract tracker filter bar into dedicated component with sticky positioning, search input, status dropdown, sort buttons, with state reset or revalidation on re-entry (`apps/web/src/tracker/tracker-filter-bar.tsx`)
- [x] T006 [S0205] Extract tracker row list into dedicated component with dense single/two-line rows, explicit column widths, with explicit loading, empty, error, and offline states (`apps/web/src/tracker/tracker-row-list.tsx`)
- [x] T007 [S0205] Extract tracker detail pane into dedicated component for evidence rail rendering with selected row detail, status update, maintenance actions, report handoff, with duplicate-trigger prevention while in-flight (`apps/web/src/tracker/tracker-detail-pane.tsx`)

---

## Implementation (11 tasks)

Main feature implementation.

- [x] T008 [S0205] Rebuild tracker-workspace-surface.tsx as composition of filter bar + row list + detail pane; remove all inline hex/RGB values; wire outlet context for evidence rail state (`apps/web/src/tracker/tracker-workspace-surface.tsx`)
- [x] T009 [S0205] Rewrite all tracker user-facing copy to be terse, operator-focused, and jargon-free -- remove "Phase 04 / Session 05", "canonical status", "payload", "bounded", "URL-backed tracker focus state", and similar internal terms (`apps/web/src/tracker/tracker-workspace-surface.tsx`, `apps/web/src/tracker/tracker-filter-bar.tsx`, `apps/web/src/tracker/tracker-row-list.tsx`, `apps/web/src/tracker/tracker-detail-pane.tsx`)
- [x] T010 [S0205] Update tracker-page.tsx to wire evidence rail outlet context for tracker detail pane rendering (`apps/web/src/pages/tracker-page.tsx`)
- [x] T011 [S0205] Migrate scan-review-launch-panel.tsx to token-based styles: replace all inline hex/RGB with var() references; rewrite copy to remove "Phase 05 / Session 02", "endpoint", "payload", and "launcher" jargon (`apps/web/src/scan/scan-review-launch-panel.tsx`)
- [x] T012 [S0205] Migrate scan-review-shortlist.tsx to token-based styles: replace all inline hex/RGB with var() references; restructure candidates as dense rows instead of auto-fit card grid; rewrite copy to remove "payload" and "endpoint" jargon (`apps/web/src/scan/scan-review-shortlist.tsx`)
- [x] T013 [S0205] Migrate scan-review-action-shelf.tsx to token-based styles: replace all inline hex/RGB with var() references; rewrite copy; add duplicate-trigger prevention while in-flight for ignore/evaluation/batch actions (`apps/web/src/scan/scan-review-action-shelf.tsx`)
- [x] T014 [S0205] Rebuild scan-review-surface.tsx layout with token styles; wire evidence rail outlet context for action shelf rendering; remove "Phase 05 / Session 02" header jargon (`apps/web/src/scan/scan-review-surface.tsx`)
- [x] T015 [S0205] Update scan-page.tsx to wire evidence rail outlet context for scan action shelf rendering (`apps/web/src/pages/scan-page.tsx`)
- [x] T016 [S0205] Ensure tracker filter bar is sticky on scroll: verify CSS position sticky with correct top offset and z-index within the center canvas scroll container (`apps/web/src/tracker/tracker-filter-bar.tsx`)
- [x] T017 [S0205] Ensure dense row height consistency across tracker and scan surfaces: verify row height, padding, font size match the operator scan ergonomics target (`apps/web/src/tracker/tracker-styles.ts`, `apps/web/src/scan/scan-styles.ts`)
- [x] T018 [S0205] Clean any remaining banned-term violations in tracker-specialist-review-panel.tsx (`apps/web/src/workflows/tracker-specialist-review-panel.tsx`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T019 [S0205] [P] Run banned-terms check on all tracker and scan files: `node scripts/check-app-ui-copy.mjs` -- verify zero violations (`scripts/check-app-ui-copy.mjs`)
- [x] T020 [S0205] [P] Verify zero inline hex/RGB values remain in modified tracker and scan files via grep audit (`apps/web/src/tracker/`, `apps/web/src/scan/`)
- [x] T021 [S0205] Validate ASCII encoding on all created and modified files; verify Unix LF line endings
- [x] T022 [S0205] Manual testing and verification: load tracker with rows, test filter/sort/select/status-update flow; load scan review, test bucket filter/select/action flow; verify evidence rail integration on desktop and drawer on mobile

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
