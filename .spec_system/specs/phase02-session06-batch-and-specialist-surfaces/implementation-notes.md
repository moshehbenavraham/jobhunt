# Implementation Notes

**Session ID**: `phase02-session06-batch-and-specialist-surfaces`
**Package**: apps/web
**Started**: 2026-04-23 17:14
**Last Updated**: 2026-04-23 17:45

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

- [x] Prerequisites confirmed (Sessions 01-05 complete, tokens.css present)
- [x] Tools available (tsc, vite, check-app-ui-copy.mjs)
- [x] Directory structure ready
- [x] TypeScript compilation clean (0 errors)
- [x] Vite build clean

---

### T001 - Verify prerequisites

**Completed**: 2026-04-23 17:15

**Notes**:

- All 11 prior sessions (phase01-session01 through phase02-session05) confirmed complete in state.json
- TypeScript compilation passed with 0 errors
- Vite build succeeded
- Banned-terms check ran: 93 violations baseline (across entire codebase)

---

### T002 - Audit tokens.css

**Completed**: 2026-04-23 17:16

**Notes**:

- All inline hex/rgba values in batch/specialist/help files map directly to existing tokens
- No new tokens needed; existing status-tone, severity, badge, button, text, and surface tokens provide full coverage

---

### T003-T005 - Token mapping references

**Completed**: 2026-04-23 17:18

**Notes**:

- Comprehensive mapping created for ~120 inline color values across 20 files
- 4 values intentionally kept as-is: #93c5fd (no exact match), #7f1d1d (distinct deep-error shade), #ffffff (row default), rgba(15, 23, 42, 0.06) (subtle selection)
- Mapped categories: panel/card bg+border, buttons, text colors, status tones, notices, badges, radius values

---

### T006-T010 - Batch workspace migration

**Completed**: 2026-04-23 17:35

**Notes**:

- batch-workspace-surface.tsx: Removed "Phase 05 / Session 04" breadcrumb, tokenized 6 hex values
- batch-workspace-item-matrix.tsx: Tokenized panelStyle, buttonStyle, subtleButtonStyle, all inline colors (~16 values), rewrote 3 banned-term strings
- batch-workspace-run-panel.tsx: Tokenized panelStyle, sectionCardStyle, buttonStyle, subtleButtonStyle, getNoticeStyle (~20 values), removed "contract" reference
- batch-workspace-detail-rail.tsx: Tokenized all style constants (~15 values), changed "Session:" label to "Run:"
- batch-workspace-client.ts: Rewrote 6 error messages to remove "endpoint" and "payload"

**Files Changed**:

- `apps/web/src/batch/batch-workspace-surface.tsx` - token migration, removed dev breadcrumb
- `apps/web/src/batch/batch-workspace-item-matrix.tsx` - token migration, copy purge
- `apps/web/src/batch/batch-workspace-run-panel.tsx` - token migration, copy purge
- `apps/web/src/batch/batch-workspace-detail-rail.tsx` - token migration, copy purge
- `apps/web/src/batch/batch-workspace-client.ts` - copy purge on error messages

---

### T011-T017 - Specialist workspace migration

**Completed**: 2026-04-23 17:38

**Notes**:

- specialist-workspace-surface.tsx: Removed "Phase 06 / Session 02" breadcrumb, "shell surface" -> "workspace"
- specialist-workspace-launch-panel.tsx: Removed both dev breadcrumbs, tokenized all styles, rewrote endpoint/payload/surface strings
- specialist-workspace-state-panel.tsx: Tokenized all styles, "session" -> "run" in 5 UI labels, "surface" -> "workspace"
- specialist-workspace-detail-rail.tsx: Tokenized all styles, "detail surface" -> "detail"/"detail view", "surface" -> "workspace"
- specialist-workspace-review-rail.tsx: Tokenized all styles, "Session context" -> "Run context"
- tracker-specialist-review-panel.tsx: Tokenized panelStyle, cardStyle, state badge colors
- research-specialist-review-panel.tsx: Tokenized all styles, rewrote endpoint/payload strings
- specialist-workspace-client.ts: Rewrote 4 error messages to remove "endpoint" and "payload"
- use-specialist-workspace.ts: No changes (only "missing-session" programmatic discriminant, not UI text)

**Files Changed**:

- `apps/web/src/workflows/specialist-workspace-surface.tsx`
- `apps/web/src/workflows/specialist-workspace-launch-panel.tsx`
- `apps/web/src/workflows/specialist-workspace-state-panel.tsx`
- `apps/web/src/workflows/specialist-workspace-detail-rail.tsx`
- `apps/web/src/workflows/specialist-workspace-review-rail.tsx`
- `apps/web/src/workflows/tracker-specialist-review-panel.tsx`
- `apps/web/src/workflows/research-specialist-review-panel.tsx`
- `apps/web/src/workflows/specialist-workspace-client.ts`

---

### T018-T019 - Application-help migration

**Completed**: 2026-04-23 17:40

**Notes**:

- application-help-surface.tsx: Removed "Phase 05 / Session 06" breadcrumb, "shell surface" -> "workspace"
- application-help-launch-panel.tsx: Removed dev breadcrumb, tokenized all styles including textarea, rewrote 8 banned strings, "session" -> "run"
- application-help-draft-panel.tsx: Tokenized all styles, state badge colors, rewrote 5 banned strings
- application-help-context-rail.tsx: Tokenized all styles, "Session state" -> "Run state", rewrote endpoint/payload strings
- application-help-client.ts: Rewrote 5 error messages to remove "endpoint" and "payload"

**Files Changed**:

- `apps/web/src/application-help/application-help-surface.tsx`
- `apps/web/src/application-help/application-help-launch-panel.tsx`
- `apps/web/src/application-help/application-help-draft-panel.tsx`
- `apps/web/src/application-help/application-help-context-rail.tsx`
- `apps/web/src/application-help/application-help-client.ts`

---

### T020-T022 - Testing and validation

**Completed**: 2026-04-23 17:44

**Notes**:

- TypeScript compilation: 0 errors
- Vite build: clean, 309ms
- Banned-terms check: reduced from 93 to 34 violations; all 34 remaining are in out-of-scope files (approvals, boot, onboarding, settings) or programmatic identifiers (use-specialist-workspace.ts "missing-session")
- Zero banned-term violations in any batch, specialist, or application-help file
- 4 intentional hex values remain (no exact token match): #93c5fd, #7f1d1d, #ffffff, rgba(15,23,42,0.06)
- All files pass ASCII encoding check
- All files use Unix LF line endings

---

## Design Decisions

### Decision 1: Keep 4 hex values without exact token matches

**Context**: Some inline colors had no direct CSS custom property equivalent
**Options Considered**:

1. Create new tokens for each -- adds tokens for single-use values
2. Keep as-is with documentation -- minimal token bloat

**Chosen**: Option 2
**Rationale**: #93c5fd (info border variant), #7f1d1d (deep error text), #ffffff (row default), and rgba(15,23,42,0.06) (subtle selection) are either single-use or intentionally distinct from their nearest token. Adding single-use tokens would increase maintenance surface without improving consistency.

### Decision 2: Preserve "missing-session" programmatic discriminant

**Context**: use-specialist-workspace.ts uses "missing-session" as a state discriminant value, which the banned-terms checker flags
**Chosen**: Leave as-is
**Rationale**: This is a programmatic value used for state matching, not a user-visible UI string. Changing it would require coordinated changes across the type system and API contract.

---

## Verification Results

| Check                                 | Result                                             |
| ------------------------------------- | -------------------------------------------------- |
| TypeScript compilation                | 0 errors                                           |
| Vite build                            | Clean (309ms)                                      |
| Banned-terms (batch files)            | 0 violations                                       |
| Banned-terms (specialist files)       | 0 violations (3 false positives: code identifiers) |
| Banned-terms (application-help files) | 0 violations                                       |
| ASCII encoding                        | All files pass                                     |
| Unix LF endings                       | All files pass                                     |
| Inline hex audit                      | 4 intentional keeps documented                     |
