# Task Checklist

**Session ID**: `phase02-session01-evaluation-console-and-run-flow`
**Total Tasks**: 20
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
| Implementation | 9      | 9      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (2 tasks)

Initial configuration and environment preparation.

- [x] T001 [S0201] Verify Phase 01 design tokens are available and Vite dev server starts cleanly (`apps/web/src/styles/tokens.css`)
- [x] T002 [S0201] Produce sculpt-ui design brief for evaluation console rebuild -- document status tone mapping, three-zone canvas layout, and operator copy direction (`apps/web/src/chat/`)

---

## Foundation (5 tasks)

Token mapping and core component structure.

- [x] T003 [S0201] Create a status-tone token map that maps all run states (completed, running, approval-paused, failed, degraded, pending, idle) to --jh-color-status-\* CSS custom properties, replacing the ~30 inline hex values in run-status-panel.tsx (`apps/web/src/chat/run-status-panel.tsx`)
- [x] T004 [S0201] [P] Rewrite all user-visible strings in chat-console-client.ts to remove banned terms (endpoint, payload) with operator-focused error messages (with timeout, retry/backoff, and failure-path handling) (`apps/web/src/chat/chat-console-client.ts`)
- [x] T005 [S0201] [P] Rewrite all user-visible strings in evaluation-result-client.ts to remove banned terms (endpoint, payload) with operator-focused error messages (with timeout, retry/backoff, and failure-path handling) (`apps/web/src/chat/evaluation-result-client.ts`)
- [x] T006 [S0201] [P] Rewrite assertion labels in chat-console-types.ts to remove banned terms (payload, session) with operator-focused validation messages (`apps/web/src/chat/chat-console-types.ts`)
- [x] T007 [S0201] [P] Rewrite assertion labels in evaluation-result-types.ts to remove banned terms (payload, artifact) with operator-focused validation messages (`apps/web/src/chat/evaluation-result-types.ts`)

---

## Implementation (9 tasks)

Main feature implementation -- visual rebuild of evaluation console components.

### apps/web

- [x] T008 [S0201] Rebuild chat-console-surface.tsx layout to use three-zone composition (left=recent runs, center=active run, right=prepared for session 02), replacing all inline hex/rgba with var(--jh-\*) token references and rewriting all user-visible copy to remove banned terms (phase, session, route message) with operator-focused labels (with explicit loading, empty, error, and offline states) (`apps/web/src/chat/chat-console-surface.tsx`)
- [x] T009 [S0201] Rebuild run-status-panel.tsx with token-based status tones from T003 mapping, replacing all inline hex/rgba with var(--jh-\*) references, ensuring completed/running/paused/failed/degraded are visually distinct at a glance, and rewriting copy to remove banned term "session" (with explicit loading, empty, error, and offline states) (`apps/web/src/chat/run-status-panel.tsx`)
- [x] T010 [S0201] Rebuild run-timeline.tsx with token-based severity tones (info=blue, warn=amber, error=red from --jh-color-status-_ tokens), replacing all inline hex with var(--jh-_) references, and rewriting copy to remove banned term "session" (`apps/web/src/chat/run-timeline.tsx`)
- [x] T011 [S0201] Rebuild workflow-composer.tsx with token-based styling, replacing all inline hex/rgba and gradient backgrounds with var(--jh-\*) references, and rewriting copy to remove banned terms (session, route) with operator-focused launch guidance (with duplicate-trigger prevention while in-flight) (`apps/web/src/chat/workflow-composer.tsx`)
- [x] T012 [S0201] Rebuild recent-session-list.tsx with token-based styling and operator copy, replacing all inline hex with var(--jh-\*) references, renaming "Recent sessions" to "Recent runs", and removing banned terms (session, surface) (with state reset or revalidation on re-entry) (`apps/web/src/chat/recent-session-list.tsx`)
- [x] T013 [S0201] Migrate evaluation-artifact-rail.tsx error message strings only -- rewrite the 3 user-visible error strings that contain banned terms (endpoint, payload, surface, contract, session) to operator language; defer full visual rebuild to session 02 (`apps/web/src/chat/evaluation-artifact-rail.tsx`)
- [x] T014 [S0201] Verify all modified components use correct typography tokens -- headings use var(--jh-font-heading) / Space Grotesk, body text uses var(--jh-font-body) / IBM Plex Sans, data/code uses var(--jh-font-mono) / IBM Plex Mono (`apps/web/src/chat/`)
- [x] T015 [S0201] Verify responsive behavior of rebuilt evaluation console at desktop (>1200px), tablet (768-1200px), and mobile (<768px) breakpoints -- left rail collapses to drawer on tablet, stacks vertically on mobile (`apps/web/src/chat/chat-console-surface.tsx`)
- [x] T016 [S0201] Wire up any missing --jh-color-status-\* tokens in tokens.css if the status tone mapping from T003 reveals gaps in the existing token palette (`apps/web/src/styles/tokens.css`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0201] Run banned-terms copy check script and verify zero violations across all evaluation console files (`scripts/check-app-ui-copy.mjs`)
- [x] T018 [S0201] Run Vite build and TypeScript compilation to verify zero errors after token migration (`apps/web/`)
- [x] T019 [S0201] Validate ASCII encoding and Unix LF line endings on all modified files (`apps/web/src/chat/`)
- [x] T020 [S0201] Manual visual review: capture desktop and mobile screenshots of evaluation console in empty, active-run, completed, failed, and degraded states and verify against PRD visual intent (`apps/web/src/chat/`)

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
