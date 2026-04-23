# Task Checklist

**Session ID**: `phase01-session06-command-palette-and-operator-copy`
**Total Tasks**: 20
**Estimated Duration**: 2-3 hours
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

- [x] T001 [S0106] Verify prerequisites met: confirm sessions 01-05 are complete, React Router is wired, design tokens exist in `apps/web/src/styles/tokens.css`, and SHELL_SURFACES registry is populated in `apps/web/src/shell/shell-types.ts`
- [x] T002 [S0106] Create directory structure: confirm `apps/web/src/shell/` exists for new palette files and `scripts/` exists for banned-terms script

---

## Foundation (5 tasks)

Core types, command registry, and hook.

- [x] T003 [S0106] [P] Create command palette types with PaletteCommand interface, PaletteActionId union, and static PALETTE_ACTIONS array for common actions (new evaluation, view pipeline, open tracker) (`apps/web/src/shell/command-palette-types.ts`)
- [x] T004 [S0106] [P] Create banned-terms check script that scans all .tsx and .ts files under apps/web/src for banned terms (phase, session, payload, endpoint, contract, surface, route message, artifact review surface, canonical) in string literals and JSX text, with exit code 1 on violations (`scripts/check-app-ui-copy.mjs`)
- [x] T005 [S0106] Create use-command-palette hook with global Cmd/Ctrl+K keydown listener (with cleanup on scope exit for all acquired resources), command registry built from SHELL_SURFACES plus PALETTE_ACTIONS, fuzzy/substring filter function, selected-index state, and open/close toggle (`apps/web/src/shell/use-command-palette.ts`)
- [x] T006 [S0106] Create command palette overlay component with search input, filtered command list, backdrop, focus trapping, keyboard navigation (arrow keys, Enter, Escape), and design-token-based styling with state reset on close (`apps/web/src/shell/command-palette.tsx`)
- [x] T007 [S0106] Mount CommandPalette in RootLayout: wire useCommandPalette hook, pass navigation callback via useNavigate, and render palette overlay above shell content with platform-appropriate accessibility labels and focus management (`apps/web/src/shell/root-layout.tsx`)

---

## Implementation (9 tasks)

Operator copy rewrite and palette integration.

- [x] T008 [S0106] [P] Rewrite SHELL_SURFACES descriptions in shell-types.ts: replace all 13 surface description strings with terse operator-focused copy (one short sentence describing what the operator can do, no engineering prose) (`apps/web/src/shell/shell-types.ts`)
- [x] T009 [S0106] [P] Rewrite navigation rail heading and intro paragraph: replace "Operator navigation" heading and the long explanatory paragraph with a short operator-focused heading and one-sentence guidance (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T010 [S0106] [P] Rewrite navigation rail "Active build" section label and session display to remove internal spec-system jargon (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T011 [S0106] [P] Rewrite all surface placeholder titles and body copy: replace engineering-prose descriptions ("Session 02 will attach...", "Phase 04 adds...") with terse operator guidance that describes what this area is for and what is coming (`apps/web/src/shell/surface-placeholder.tsx`)
- [x] T012 [S0106] [P] Rewrite surface placeholder highlights: replace implementation-detail highlights with operator-relevant context (counts, states, next steps) (`apps/web/src/shell/surface-placeholder.tsx`)
- [x] T013 [S0106] [P] Rewrite operator-home-surface headings: replace "Operator home" and "App-owned daily landing path" with terse operator copy; clean fallback titles and body text (`apps/web/src/shell/operator-home-surface.tsx`)
- [x] T014 [S0106] [P] Rewrite operator-home-surface Phase/Session status line: remove internal build-process terms (Phase, Session) and replace with neutral operator-facing context (`apps/web/src/shell/operator-home-surface.tsx`)
- [x] T015 [S0106] Wire palette action commands to shell callbacks: "New evaluation" navigates to /evaluate, "View pipeline" navigates to /pipeline, "Open tracker" navigates to /tracker, with palette closing after execution (`apps/web/src/shell/command-palette.tsx`)
- [x] T016 [S0106] Add empty-state message when palette filter returns zero results ("No matching commands") with proper styling (`apps/web/src/shell/command-palette.tsx`)

---

## Testing (4 tasks)

Verification and quality assurance.

- [x] T017 [S0106] Run banned-terms check script against all apps/web/src files and fix any violations found (`scripts/check-app-ui-copy.mjs`)
- [x] T018 [S0106] Run TypeScript type check (npm run check in apps/web) and fix any type errors
- [x] T019 [S0106] Validate ASCII encoding on all new and modified files: confirm no Unicode characters, smart quotes, or em-dashes
- [x] T020 [S0106] Manual testing: verify Cmd/Ctrl+K opens palette from every surface, fuzzy search filters correctly, arrow/Enter/Escape keyboard flow works, navigation completes, palette closes, focus returns, and all copy reads as terse operator guidance

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
