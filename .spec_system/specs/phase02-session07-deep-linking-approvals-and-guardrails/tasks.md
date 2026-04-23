# Task Checklist

**Session ID**: `phase02-session07-deep-linking-approvals-and-guardrails`
**Total Tasks**: 20
**Estimated Duration**: 2.5-3.5 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[S0207]` = Session reference (02=phase, 07=session)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 2      | 2      | 0         |
| Foundation     | 4      | 4      | 0         |
| Implementation | 10     | 10     | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (2 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0207] Verify prerequisites met: TS compiles, Vite builds, banned-terms script runs, all 12 prior sessions validated (`apps/web/`)
- [x] T002 [S0207] Audit current inline hex/rgba count in approvals files and current banned-term violation count to establish baseline metrics (`apps/web/src/approvals/`)

---

## Foundation (4 tasks)

Core structures and new route pages.

- [x] T003 [S0207] [P] Create workflow detail page with useParams, explicit loading/empty/error states, and graceful handling of missing workflowId (`apps/web/src/pages/workflow-detail-page.tsx`)
- [x] T004 [S0207] [P] Create batch detail page with useParams, explicit loading/empty/error states, and graceful handling of missing batchId (`apps/web/src/pages/batch-detail-page.tsx`)
- [x] T005 [S0207] [P] Create scan detail page with useParams, explicit loading/empty/error states, and graceful handling of missing scanId (`apps/web/src/pages/scan-detail-page.tsx`)
- [x] T006 [S0207] Register 3 new detail routes in router: /workflows/:workflowId, /batch/:batchId, /scan/:scanId (`apps/web/src/routes.tsx`)

---

## Implementation (10 tasks)

Main feature implementation.

- [x] T007 [S0207] Rebuild approval-inbox-surface.tsx: migrate all inline hex/rgba to var(--jh-\*) tokens, rewrite banned-term copy, remove "Session 04" header label (`apps/web/src/approvals/approval-inbox-surface.tsx`)
- [x] T008 [S0207] Rebuild approval-queue-list.tsx: migrate all inline hex/rgba to var(--jh-\*) tokens, rewrite banned-term copy, adopt dense scannable row pattern with duplicate-trigger prevention while in-flight (`apps/web/src/approvals/approval-queue-list.tsx`)
- [x] T009 [S0207] Rebuild approval-context-panel.tsx: migrate all inline hex/rgba to var(--jh-\*) tokens, rewrite 4 banned-term "session" violations, replace selection-tone hardcoded colors with status tokens (`apps/web/src/approvals/approval-context-panel.tsx`)
- [x] T010 [S0207] Rebuild approval-decision-bar.tsx: migrate all inline hex/rgba to var(--jh-\*) tokens, rewrite "canonical" banned-term violation, maintain duplicate-trigger prevention while in-flight (`apps/web/src/approvals/approval-decision-bar.tsx`)
- [x] T011 [S0207] Rebuild interrupted-run-panel.tsx: migrate all inline hex/rgba to var(--jh-\*) tokens, rewrite "session" banned-term violation, replace getTone hardcoded colors with status tokens (`apps/web/src/approvals/interrupted-run-panel.tsx`)
- [x] T012 [S0207] Extend command palette types with context-aware command support: add optional surfaceId filter to PaletteCommand, add surface-specific action commands (`apps/web/src/shell/command-palette-types.ts`)
- [x] T013 [S0207] Update useCommandPalette to accept current surfaceId, build contextual registry that prepends surface-specific commands with state reset on surface navigation change (`apps/web/src/shell/use-command-palette.ts`)
- [x] T014 [S0207] [P] Purge banned-term violations in boot files: rewrite "contract", "surface", and "endpoint" terms in startup-status-panel.tsx (`apps/web/src/boot/startup-status-panel.tsx`)
- [x] T015 [S0207] [P] Purge banned-term violations in onboarding files: rewrite "session" in onboarding-wizard-surface.tsx and "surface" in readiness-handoff-card.tsx (`apps/web/src/onboarding/onboarding-wizard-surface.tsx`, `apps/web/src/onboarding/readiness-handoff-card.tsx`)
- [x] T016 [S0207] [P] Purge banned-term violations in settings files: rewrite "surface", "session", "phase", and "contract" terms across 6 settings components (`apps/web/src/settings/`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0207] Run TypeScript compilation and verify 0 errors across apps/web (`apps/web/`)
- [x] T018 [S0207] Run Vite build and verify clean output (`apps/web/`)
- [x] T019 [S0207] Run scripts/check-app-ui-copy.mjs and verify 0 banned-term violations across all apps/web/src (`scripts/check-app-ui-copy.mjs`)
- [x] T020 [S0207] Validate ASCII encoding on all new and modified files, verify no inline hex/rgba in approvals components, confirm all 3 deep-link routes resolve correctly (`apps/web/src/`)

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
