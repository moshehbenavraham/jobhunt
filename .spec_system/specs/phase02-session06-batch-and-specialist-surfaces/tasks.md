# Task Checklist

**Session ID**: `phase02-session06-batch-and-specialist-surfaces`
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
| Foundation     | 3      | 3      | 0         |
| Implementation | 14     | 14     | 0         |
| Testing        | 3      | 3      | 0         |
| **Total**      | **22** | **22** | **0**     |

---

## Setup (2 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0206] Verify prerequisites met: confirm Sessions 01-05 complete, tokens.css present, banned-terms script available, TypeScript compiles, Vite builds
- [x] T002 [S0206] Audit tokens.css for missing semantic tokens needed by batch/specialist/help surfaces; add batch-status, specialist-status, and help-status tokens if not already covered by existing status-tone tokens (`apps/web/src/styles/tokens.css`)

---

## Foundation (3 tasks)

Token migration pattern verification and copy replacement reference.

- [x] T003 [S0206] [P] Create a token-mapping reference for batch surfaces: map each inline hex/rgba value found in batch files to its CSS custom property equivalent, identifying any gaps
- [x] T004 [S0206] [P] Create a token-mapping reference for specialist surfaces: map each inline hex/rgba value found in specialist files to its CSS custom property equivalent, identifying any gaps
- [x] T005 [S0206] [P] Create a token-mapping reference for application-help surfaces: map each inline hex/rgba value found in application-help files to its CSS custom property equivalent, identifying any gaps

---

## Implementation (14 tasks)

Main token migration and copy purge across all three surface families.

### apps/web/src/batch/

- [x] T006 [S0206] Migrate batch-workspace-surface.tsx: replace ~6 inline hex values with token references, rewrite 2 banned-term strings ("Phase", "Session") with operator copy (`apps/web/src/batch/batch-workspace-surface.tsx`)
- [x] T007 [S0206] Migrate batch-workspace-item-matrix.tsx: replace ~16 inline hex/rgba values with token references, rewrite 3 banned-term strings ("endpoint", "payload", "surface") with operator copy (`apps/web/src/batch/batch-workspace-item-matrix.tsx`)
- [x] T008 [S0206] Migrate batch-workspace-run-panel.tsx: replace ~20 inline hex/rgba values with token references, rewrite 3 banned-term strings ("endpoint", "payload", "contract") with operator copy, verify duplicate-trigger prevention on action buttons (`apps/web/src/batch/batch-workspace-run-panel.tsx`)
- [x] T009 [S0206] Migrate batch-workspace-detail-rail.tsx: replace ~15 inline hex/rgba values with token references, rewrite 3 banned-term strings ("endpoint", "payload", "Session") with operator copy (`apps/web/src/batch/batch-workspace-detail-rail.tsx`)
- [x] T010 [S0206] Purge banned terms from batch-workspace-client.ts: rewrite 4 "endpoint" references in user-facing error messages with operator-friendly alternatives (`apps/web/src/batch/batch-workspace-client.ts`)

### apps/web/src/workflows/

- [x] T011 [S0206] Migrate specialist-workspace-surface.tsx: replace ~6 inline hex values with token references, rewrite 3 banned-term strings ("Phase", "Session", "surface") with operator copy (`apps/web/src/workflows/specialist-workspace-surface.tsx`)
- [x] T012 [S0206] Migrate specialist-workspace-launch-panel.tsx: replace ~21 inline hex/rgba values with token references, rewrite 7+ banned-term strings ("Phase", "Session", "endpoint", "payload", "surface", "route") with operator copy (`apps/web/src/workflows/specialist-workspace-launch-panel.tsx`)
- [x] T013 [S0206] Migrate specialist-workspace-state-panel.tsx and specialist-workspace-detail-rail.tsx: replace ~30 combined inline hex/rgba values with token references, rewrite ~12 combined banned-term strings with operator copy (`apps/web/src/workflows/specialist-workspace-state-panel.tsx`, `apps/web/src/workflows/specialist-workspace-detail-rail.tsx`)
- [x] T014 [S0206] Migrate specialist-workspace-review-rail.tsx: replace ~13 inline hex/rgba values with token references, rewrite 4 banned-term strings ("surface", "Session", "route") with operator copy (`apps/web/src/workflows/specialist-workspace-review-rail.tsx`)
- [x] T015 [S0206] [P] Migrate tracker-specialist-review-panel.tsx: replace inline hex/rgba values with token references, purge banned terms from user-visible strings (`apps/web/src/workflows/tracker-specialist-review-panel.tsx`)
- [x] T016 [S0206] [P] Migrate research-specialist-review-panel.tsx: replace inline hex/rgba values with token references, purge banned terms from user-visible strings (`apps/web/src/workflows/research-specialist-review-panel.tsx`)
- [x] T017 [S0206] Purge banned terms from specialist-workspace-client.ts: rewrite "endpoint" references in error messages with operator-friendly alternatives (`apps/web/src/workflows/specialist-workspace-client.ts`)

### apps/web/src/application-help/

- [x] T018 [S0206] Migrate application-help-surface.tsx and application-help-launch-panel.tsx: replace ~29 combined inline hex/rgba values with token references, rewrite 8 combined banned-term strings with operator copy (`apps/web/src/application-help/application-help-surface.tsx`, `apps/web/src/application-help/application-help-launch-panel.tsx`)
- [x] T019 [S0206] Migrate application-help-draft-panel.tsx, application-help-context-rail.tsx, and application-help-client.ts: replace ~26 combined inline hex/rgba values with token references, rewrite 8 combined banned-term strings with operator copy, verify explicit loading/empty/error states (`apps/web/src/application-help/application-help-draft-panel.tsx`, `apps/web/src/application-help/application-help-context-rail.tsx`, `apps/web/src/application-help/application-help-client.ts`)

---

## Testing (3 tasks)

Verification and quality assurance.

- [x] T020 [S0206] Run TypeScript compilation and Vite build; confirm 0 errors and clean build across all modified files
- [x] T021 [S0206] Run `node scripts/check-app-ui-copy.mjs` and confirm 0 banned-term violations in all batch, specialist, and application-help files
- [x] T022 [S0206] Validate ASCII encoding on all modified files; verify Unix LF line endings; spot-check token usage visually in dev server for batch, specialist, and application-help surfaces

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
