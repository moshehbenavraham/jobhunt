# Task Checklist

**Session ID**: `phase02-session02-artifact-handoff-and-evidence-rail`
**Total Tasks**: 20
**Estimated Duration**: 2.5-3.5 hours
**Created**: 2026-04-23

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[S0202]` = Session reference (02=phase number, 02=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 8      | 8      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (3 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0202] Verify Phase 01 design tokens, Session 01 status tone tokens, and Vite dev server (`apps/web/src/styles/tokens.css`)
- [x] T002 [S0202] Produce sculpt-ui design brief for compact artifact packet and run detail page
- [x] T003 [S0202] Create run-detail types file with view state and route param types (`apps/web/src/chat/run-detail-types.ts`)

---

## Foundation (5 tasks)

Core structures and token migration groundwork.

- [x] T004 [S0202] [P] Create token-based style constants for artifact rail (replace panelStyle, sectionStyle, buttonStyle hex values with var(--jh-\*) references) (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T005 [S0202] [P] Migrate getArtifactTone, getCloseoutTone, getVerificationTone, getHandoffTone to --jh-color-status-_ and --jh-color-closeout-_ tokens (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T006 [S0202] [P] Migrate all remaining inline hex/rgba values in empty state, header, error banner, stat cards, and warning sections to design tokens (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T007 [S0202] Create useRunDetail hook to fetch evaluation-result summary filtered by sessionId from URL param, with explicit loading, empty, error, and offline states (`apps/web/src/chat/use-run-detail.ts`)
- [x] T008 [S0202] Add run-detail fetch helper to evaluation-result-client.ts (reuses summary endpoint with sessionId filter) with timeout, retry/backoff, and failure-path handling (`apps/web/src/chat/evaluation-result-client.ts`)

---

## Implementation (8 tasks)

Main feature implementation.

- [x] T009 [S0202] Rebuild artifact rail header as compact score + legitimacy chip row with closeout badge (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T010 [S0202] Rebuild artifact cards section as inline status badge row (report/PDF/tracker pills) instead of card grid (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T011 [S0202] Rebuild closeout, input provenance, verification, and warning sections as compact summary lines instead of nested card panels (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T012 [S0202] Rebuild handoff actions section as a compact button group with "View run details" link to /runs/:runId (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T013 [S0202] Rewrite all user-visible strings in evaluation-artifact-rail.tsx to operator-focused copy with no banned terms, with state reset or revalidation on re-entry (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T014 [S0202] Create RunDetailPage component with timeline summary, checkpoint progress, artifact state, failure details, and resume/retry controls; with schema-validated input and explicit error mapping for invalid runId (`apps/web/src/pages/run-detail-page.tsx`)
- [x] T015 [S0202] Replace /runs/:runId redirect with real RunDetailPage component import and route entry (`apps/web/src/routes.tsx`)
- [x] T016 [S0202] Wire artifact packet into evidence rail when evaluation context exists, replacing placeholder content (`apps/web/src/shell/evidence-rail.tsx`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0202] [P] Run banned-terms copy check on all modified and created files (`scripts/check-app-ui-copy.mjs`)
- [x] T018 [S0202] [P] Run Vite build and TypeScript compilation, verify zero errors
- [x] T019 [S0202] Validate ASCII encoding and Unix LF line endings on all session files
- [x] T020 [S0202] Manual visual review: desktop and mobile screenshots of compact artifact packet and run detail page against PRD

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

Run the implement workflow step to begin AI-led implementation.
