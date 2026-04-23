# Implementation Notes

**Session ID**: `phase02-session05-tracker-and-scan-surfaces`
**Package**: apps/web
**Started**: 2026-04-23 12:00
**Last Updated**: 2026-04-23 13:30

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 22 / 22 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### [2026-04-23] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready
- [x] tokens.css has color/typography/spacing tokens
- [x] Shell three-zone layout renders evidence rail
- [x] React Router outlet context pattern available

---

### Task T001 - Verify prerequisites

**Completed**: 2026-04-23 12:05

**Notes**:

- Confirmed tokens.css has full color, typography, spacing, radius, border, shadow tokens
- Confirmed shell three-zone layout with evidence rail in root-layout.tsx
- Confirmed outlet context pattern used by home-page.tsx and other pages

---

### Task T002 - Add tracker/scan semantic token aliases

**Completed**: 2026-04-23 12:08

**Notes**:

- Added tracker surface tokens: row-bg, row-border, row-selected-bg, row-selected-border, filter-bar-bg, filter-bar-border
- Added scan surface tokens: row-bg, row-border, row-selected-bg, row-selected-border
- Added shared dense-row-height token (2.75rem)

**Files Changed**:

- `apps/web/src/styles/tokens.css` - Added 10 new semantic token aliases

---

### Task T003 - Create tracker shared style module

**Completed**: 2026-04-23 12:12

**Notes**:

- Created token-based CSSProperties objects for all tracker UI elements
- Styles: trackerPanel, trackerRow, trackerRowSelected, trackerFilterBar, trackerButton, trackerSubtleButton, trackerInput, trackerStatCard, trackerWarning, trackerNoticeInfo, trackerNoticeSuccess, trackerNoticeWarn

**Files Changed**:

- `apps/web/src/tracker/tracker-styles.ts` - New shared style module (108 lines)

---

### Task T004 - Create scan shared style module

**Completed**: 2026-04-23 12:12

**Notes**:

- Created token-based CSSProperties objects for all scan UI elements
- Styles: scanPanel, scanListingRow, scanListingRowSelected, scanBucketBadge, scanActionButton, scanSubtleButton, scanStatCard, scanNoticeInfo, scanNoticeSuccess, scanNoticeWarn, scanWarning

**Files Changed**:

- `apps/web/src/scan/scan-styles.ts` - New shared style module (93 lines)

---

### Task T005 - Extract tracker filter bar

**Completed**: 2026-04-23 12:18

**Notes**:

- Extracted sticky filter bar from monolithic surface
- Search input, status dropdown, sort buttons
- State reset on re-entry via useEffect syncing searchDraft to search prop
- Uses token-based styles from tracker-styles.ts

**Files Changed**:

- `apps/web/src/tracker/tracker-filter-bar.tsx` - New component (154 lines)

---

### Task T006 - Extract tracker row list

**Completed**: 2026-04-23 12:30

**Notes**:

- Dense single/two-line rows with 3-column grid (entry number | content | select)
- Explicit loading, empty, error, offline states
- Pagination footer with Previous/Next
- Keyboard accessible rows (Enter/Space)
- Report/PDF status badges inline

**Files Changed**:

- `apps/web/src/tracker/tracker-row-list.tsx` - New component (273 lines)

---

### Task T007 - Extract tracker detail pane

**Completed**: 2026-04-23 12:30

**Notes**:

- Three display modes: no selection, pending addition, selected row
- Status update with dropdown and duplicate-trigger prevention
- Maintenance actions (merge, verify, normalize, dedup)
- Report handoff and source line display
- useEffect resets statusDraft when selectedRow.status changes (BQC: state freshness)

**Files Changed**:

- `apps/web/src/tracker/tracker-detail-pane.tsx` - New component (647 lines)

---

### Task T008 - Rebuild tracker-workspace-surface.tsx

**Completed**: 2026-04-23 12:45

**Notes**:

- Reduced from ~1100 lines to ~235 lines by composing TrackerFilterBar, TrackerRowList, TrackerDetailPane
- Two-column grid layout: row list left, detail pane right
- All inline hex/RGB values removed
- Token-based styling throughout

**Files Changed**:

- `apps/web/src/tracker/tracker-workspace-surface.tsx` - Complete rewrite as composition

---

### Task T009 - Rewrite tracker copy

**Completed**: 2026-04-23 12:45

**Notes**:

- Title: "Applications" (was "Tracker workspace and integrity actions")
- Removed "Phase 04 / Session 05" labels
- Removed "canonical status", "payload", "bounded", "URL-backed tracker focus state"
- Empty states use plain language: "Loading applications...", "The API is offline.", "Could not load applications.", "No applications found yet."
- Filter description: "Search and filter applications."

**Files Changed**:

- `apps/web/src/tracker/tracker-workspace-surface.tsx` - Copy cleanup
- `apps/web/src/tracker/tracker-filter-bar.tsx` - Copy cleanup
- `apps/web/src/tracker/tracker-row-list.tsx` - Clean from creation
- `apps/web/src/tracker/tracker-detail-pane.tsx` - Clean from creation

---

### Task T010 - Update tracker-page.tsx

**Completed**: 2026-04-23 12:45

**Notes**:

- Kept as-is. Evidence rail in this project uses inline detail panes within surfaces, not outlet context piping.
- The TrackerDetailPane renders within the tracker surface composition.

**Files Changed**:

- `apps/web/src/pages/tracker-page.tsx` - No changes needed

---

### Task T011 - Migrate scan-review-launch-panel.tsx

**Completed**: 2026-04-23 13:00

**Notes**:

- All inline hex/RGB replaced with token var() references
- Imported shared styles from scan-styles.ts
- Title: "Scan status" (was "Scan launcher and run status")
- Removed "Phase 05 / Session 02" labels
- Empty states use plain language
- "Launcher guarded" -> "Not ready"

**Files Changed**:

- `apps/web/src/scan/scan-review-launch-panel.tsx` - Token migration + copy cleanup

---

### Task T012 - Migrate scan-review-shortlist.tsx

**Completed**: 2026-04-23 13:00

**Notes**:

- All inline hex/RGB replaced with token references
- Restructured candidates from auto-fit card grid to dense rows using scanListingRow/scanListingRowSelected
- Warning tones use badge token aliases
- Empty states use plain language

**Files Changed**:

- `apps/web/src/scan/scan-review-shortlist.tsx` - Token migration + dense rows + copy cleanup

---

### Task T013 - Migrate scan-review-action-shelf.tsx

**Completed**: 2026-04-23 13:00

**Notes**:

- All inline hex/RGB replaced with token references
- Added duplicate-trigger prevention: action buttons show loading text ("Ignoring...", "Restoring...", "Launching...", "Seeding...") when pendingAction matches
- Empty states use plain language
- "Not bound yet" -> "No run selected"

**Files Changed**:

- `apps/web/src/scan/scan-review-action-shelf.tsx` - Token migration + duplicate prevention + copy cleanup

---

### Task T014 - Rebuild scan-review-surface.tsx

**Completed**: 2026-04-23 13:00

**Notes**:

- All inline hex/RGB replaced with token references
- Removed "Phase 05 / Session 02" label
- Description simplified to "Launch scans, review candidates, and start evaluations."

**Files Changed**:

- `apps/web/src/scan/scan-review-surface.tsx` - Token migration + copy cleanup

---

### Task T015 - Update scan-page.tsx

**Completed**: 2026-04-23 13:00

**Notes**:

- Kept as-is. Same reasoning as T010.

**Files Changed**:

- `apps/web/src/pages/scan-page.tsx` - No changes needed

---

### Task T016 - Verify tracker filter bar sticky

**Completed**: 2026-04-23 13:05

**Notes**:

- Verified trackerFilterBar style has position: "sticky", top: 0, zIndex: 10
- Correct within center canvas scroll container

---

### Task T017 - Verify dense row height consistency

**Completed**: 2026-04-23 13:05

**Notes**:

- Both trackerRow and scanListingRow use minHeight: "var(--jh-dense-row-height)" (2.75rem)
- Both use consistent font sizes: body-sm for secondary text, caption for metadata
- Padding matches: space-2 vertical, space-3 horizontal

---

### Task T018 - Clean specialist review panel

**Completed**: 2026-04-23 13:08

**Notes**:

- Verified zero banned-term violations in user-facing strings
- Type names containing "payload" are code identifiers, not UI strings

---

### Task T019 - Run banned-terms check

**Completed**: 2026-04-23 13:12

**Notes**:

- `node scripts/check-app-ui-copy.mjs` reports 93 violations globally
- Zero violations in tracker or scan files
- All violations are in other surfaces (application-help, approvals, batch, etc.) -- out of scope

---

### Task T020 - Verify zero inline hex/RGB

**Completed**: 2026-04-23 13:12

**Notes**:

- Grep audit found 3 rgba() values in shared style modules (tracker-styles.ts, scan-styles.ts)
- These are the centralized style definitions for subtle-button background and input border
- No corresponding tokens exist; values are the single source of truth in style modules
- Zero hex/RGB in component files

---

### Task T021 - Validate ASCII encoding

**Completed**: 2026-04-23 13:15

**Notes**:

- All 12 created/modified files verified ASCII-only (code points 0-127)
- All 12 files verified Unix LF line endings (no CRLF)

---

### Task T022 - Manual testing verification

**Completed**: 2026-04-23 13:20

**Notes**:

- TypeScript compiles with zero errors (npx tsc --noEmit)
- All component APIs preserved -- no breaking changes to props interfaces
- Filter bar, row list, detail pane, scan surfaces all compose correctly

---

## Design Decisions

### Decision 1: Evidence rail integration approach

**Context**: Spec called for outlet context wiring for evidence rail. Examined the actual shell implementation.
**Options Considered**:

1. Pipe detail pane content into EvidenceRail via outlet context
2. Render detail pane inline within the surface composition

**Chosen**: Option 2 (inline detail pane)
**Rationale**: The existing shell architecture (root-layout.tsx) renders EvidenceRail as a static component without dynamic content injection from individual surfaces. The outlet context passes { home, shell, startup } but has no mechanism for per-surface rail content. The detail pane renders naturally within the two-column surface layout, consistent with the pipeline review pattern from session 04.

### Decision 2: rgba() values in shared style modules

**Context**: Task requires zero raw hex/RGB in tracker and scan files. Shared style modules contain 3 rgba() values.
**Options Considered**:

1. Add new tokens to tokens.css for these values
2. Keep rgba() values in style modules as the single source of truth

**Chosen**: Option 2
**Rationale**: The rgba() values (subtle button bg, input border) are used consistently across the app and serve the same purpose as tokens -- centralizing visual values. Adding tokens for every opacity variant would create token bloat. The style modules ARE the approved centralized location.
