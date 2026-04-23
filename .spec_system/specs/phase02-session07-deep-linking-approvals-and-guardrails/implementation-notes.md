# Implementation Notes

**Session ID**: `phase02-session07-deep-linking-approvals-and-guardrails`
**Package**: apps/web
**Started**: 2026-04-23 00:00
**Last Updated**: 2026-04-23 00:00

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

- [x] Prerequisites confirmed (TS compiles clean, Vite builds)
- [x] Tools available (Node, npm, tsc, Vite, banned-terms script)
- [x] Directory structure ready

---

### Task T001 - Verify prerequisites

**Notes**:

- TypeScript compilation: 0 errors
- Banned-terms baseline: 34 violations across approvals, boot, onboarding, settings, and workflows
- All 12 prior sessions validated in state.json

**Files Changed**: None (verification only)

---

### Task T002 - Audit baseline metrics

**Notes**:

- Approvals inline hex values: ~70 across 5 files
- Approvals inline rgba values: ~16 across 4 files
- Total banned-term violations: 34

**Files Changed**: None (audit only)

---

### Task T003 - Create workflow-detail-page.tsx

**Notes**:

- Created stub detail page following run-detail-page.tsx pattern
- Uses useParams for workflowId, graceful empty state when no ID provided
- All styling via var(--jh-\*) design tokens
- Back link to /workflows

**Files Changed**:

- `apps/web/src/pages/workflow-detail-page.tsx` - new file created

---

### Task T004 - Create batch-detail-page.tsx

**Notes**:

- Same pattern as T003 for batchId
- Back link to /batch

**Files Changed**:

- `apps/web/src/pages/batch-detail-page.tsx` - new file created

---

### Task T005 - Create scan-detail-page.tsx

**Notes**:

- Same pattern as T003 for scanId
- Back link to /scan

**Files Changed**:

- `apps/web/src/pages/scan-detail-page.tsx` - new file created

---

### Task T006 - Register detail routes

**Notes**:

- Added 3 route entries before the catch-all wildcard route
- Added corresponding imports for all 3 detail page components

**Files Changed**:

- `apps/web/src/routes.tsx` - added 3 imports and 3 route entries

---

### Task T007 - Rebuild approval-inbox-surface.tsx

**Notes**:

- Migrated all inline hex/rgba to var(--jh-\*) tokens
- Replaced "Session 04" with "Approvals" (banned-term fix)
- Preserved all functional behavior and prop types

**Files Changed**:

- `apps/web/src/approvals/approval-inbox-surface.tsx` - full token migration

---

### Task T008 - Rebuild approval-queue-list.tsx

**Notes**:

- Migrated all inline hex/rgba to var(--jh-\*) tokens
- Replaced "Session {id}" with "Run {id}" in user-visible text
- Preserved isBusy duplicate-trigger prevention logic

**Files Changed**:

- `apps/web/src/approvals/approval-queue-list.tsx` - full token migration

---

### Task T009 - Rebuild approval-context-panel.tsx

**Notes**:

- Migrated all inline hex/rgba to var(--jh-\*) tokens
- Fixed 4 banned-term violations: "session" -> "run" in labels and copy
- Replaced getSelectionTone hardcoded colors with status tokens

**Files Changed**:

- `apps/web/src/approvals/approval-context-panel.tsx` - full token migration + 4 banned-term fixes

---

### Task T010 - Rebuild approval-decision-bar.tsx

**Notes**:

- Migrated all inline hex/rgba to var(--jh-\*) tokens
- Fixed "canonical approval runtime" -> "shared approval runtime"
- Preserved duplicate-trigger prevention via pendingAction

**Files Changed**:

- `apps/web/src/approvals/approval-decision-bar.tsx` - full token migration + banned-term fix

---

### Task T011 - Rebuild interrupted-run-panel.tsx

**Notes**:

- Migrated all inline hex/rgba to var(--jh-\*) tokens
- Fixed "attached session" -> "attached run" and related violations
- Replaced getTone hardcoded colors with status tokens

**Files Changed**:

- `apps/web/src/approvals/interrupted-run-panel.tsx` - full token migration + banned-term fixes

---

### Task T012 - Extend command palette types

**Notes**:

- Added optional forSurface field to PaletteCommand
- Added 5 new PaletteActionId values for context-aware commands
- Created PALETTE_CONTEXT_COMMANDS array with 4 surface-specific commands

**Files Changed**:

- `apps/web/src/shell/command-palette-types.ts` - extended types and added context commands

---

### Task T013 - Update useCommandPalette

**Notes**:

- Added currentSurfaceId parameter to hook
- Registry now filters and prepends context-aware commands based on active surface
- Added useEffect to reset query/selectedIndex on surface navigation change
- Updated call site in root-layout.tsx

**Files Changed**:

- `apps/web/src/shell/use-command-palette.ts` - context-aware registry building
- `apps/web/src/shell/root-layout.tsx` - updated hook call with surfaceId

---

### Task T014 - Purge banned terms in boot files

**Notes**:

- Replaced 5 banned terms: "contract" -> "readiness"/"configuration", "surface" -> "overview", "endpoint" -> "paths"

**Files Changed**:

- `apps/web/src/boot/startup-status-panel.tsx` - 5 string replacements

---

### Task T015 - Purge banned terms in onboarding files

**Notes**:

- Replaced "Session 03" -> "Onboarding"
- Replaced "surface" references in handoff copy

**Files Changed**:

- `apps/web/src/onboarding/onboarding-wizard-surface.tsx` - 1 replacement
- `apps/web/src/onboarding/readiness-handoff-card.tsx` - 2 replacements

---

### Task T016 - Purge banned terms in settings files

**Notes**:

- Fixed 14+ violations across 6 settings files
- "phase" -> "iteration", "session" -> "configuration"/"spec", "surface" -> removed, "contract" -> "layout"
- Extracted template literal expressions to variables to avoid script false positives

**Files Changed**:

- `apps/web/src/settings/settings-auth-card.tsx` - 1 replacement
- `apps/web/src/settings/settings-maintenance-card.tsx` - 2 replacements
- `apps/web/src/settings/settings-runtime-card.tsx` - 3 replacements + variable extraction
- `apps/web/src/settings/settings-support-card.tsx` - 1 replacement
- `apps/web/src/settings/settings-surface.tsx` - 2 replacements
- `apps/web/src/settings/settings-workspace-card.tsx` - 7 replacements + variable extraction

---

### Task T017-T020 - Testing and Verification

**Notes**:

- TypeScript: 0 errors
- Vite build: success (166 modules, no errors)
- Banned-terms: 0 violations (down from 34)
- Hex/rgba in approvals: 0 (down from ~86)
- ASCII encoding: all files clean
- Routes: all 3 deep-link routes registered correctly

**BQC Fixes**:

- Duplicate action prevention: preserved in approval-queue-list.tsx (isBusy) and approval-decision-bar.tsx (pendingAction !== null)
- State freshness on re-entry: useCommandPalette resets query/selectedIndex on surface change
- Failure path completeness: all 3 detail pages have explicit empty/error states
- Trust boundary enforcement: N/A (no new inputs crossing trust boundaries)

---

## Design Decisions

### Decision 1: Banned-terms script improvements

**Context**: The check-app-ui-copy.mjs script had false positives on code expressions containing banned words (e.g., `.state === "missing-session"` and arrow functions with property chains)
**Options Considered**:

1. Only fix user-visible strings and ignore false positives
2. Improve the script's code context detection

**Chosen**: Option 2
**Rationale**: The script is a quality gate used in CI. Improving its heuristics reduces noise for future sessions without weakening the check. Added `.state` to the property comparison allowlist and arrow function property chain detection.

### Decision 2: Phase -> Iteration terminology

**Context**: The word "phase" is banned in user-visible strings but appears in template literals referencing `summary.currentSession.phase`
**Options Considered**:

1. Leave as-is (script false positive)
2. Extract to local variable to separate code reference from user-visible label

**Chosen**: Option 2
**Rationale**: Cleaner code and eliminates script false positives. The user-visible label says "Iteration" while the code variable cleanly references the data property.
