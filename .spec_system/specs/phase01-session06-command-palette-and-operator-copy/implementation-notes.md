# Implementation Notes

**Session ID**: `phase01-session06-command-palette-and-operator-copy`
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

- [x] Prerequisites confirmed (sessions 01-05 complete)
- [x] Tools available (Node.js, npm, TypeScript)
- [x] Directory structure ready (apps/web/src/shell/, scripts/)

---

### Task T001 - Verify prerequisites

**Completed**: 2026-04-23

**Notes**:

- Confirmed all 5 prior sessions complete in state.json
- Verified tokens.css exists with full design token vocabulary
- Verified SHELL_SURFACES has all 13 entries
- Verified React Router wired in root-layout.tsx with useNavigate

**Files Changed**:

- None (verification only)

---

### Task T002 - Confirm directory structure

**Completed**: 2026-04-23

**Notes**:

- apps/web/src/shell/ exists with 17 files
- scripts/ exists

**Files Changed**:

- None (verification only)

---

### Task T003 - Create command palette types

**Completed**: 2026-04-23

**Notes**:

- Defined PaletteCommand type with kind, actionId, surfaceId, path, label, description
- Defined PaletteActionId union for the 3 common actions
- Created PALETTE_ACTIONS array with new-evaluation, view-pipeline, open-tracker

**Files Changed**:

- `apps/web/src/shell/command-palette-types.ts` - Created (~50 lines)

---

### Task T004 - Create banned-terms check script

**Completed**: 2026-04-23

**Notes**:

- Scans .ts/.tsx under apps/web/src for banned terms in string literals and JSX text
- Ignores type definition files, client files, test files, and command-palette-types
- Detects CSS variable references and internal IDs as code context to avoid false positives
- Exits 1 on violations with file:line and snippet details

**Files Changed**:

- `scripts/check-app-ui-copy.mjs` - Created (~140 lines)

---

### Task T005 - Create use-command-palette hook

**Completed**: 2026-04-23

**Notes**:

- Global Cmd/Ctrl+K keydown listener with cleanup on unmount
- Guards against activation when focus is in textarea, text input, or contenteditable
- Builds command registry from SHELL_SURFACES (13 navigate commands) plus PALETTE_ACTIONS (3 action commands)
- Fuzzy/substring filter with selectedIndex reset on query change
- Saves and restores focus on open/close

**BQC Fixes**:

- Resource cleanup: keydown listener removed in useEffect cleanup
- State freshness: query and selectedIndex reset on close
- Accessibility: focus saved on open, restored on close

**Files Changed**:

- `apps/web/src/shell/use-command-palette.ts` - Created (~140 lines)

---

### Task T006 - Create command palette overlay

**Completed**: 2026-04-23

**Notes**:

- Full overlay with backdrop, search input, filtered command list, and keyboard hint footer
- Keyboard navigation: ArrowDown/Up for selection, Enter to execute, Escape to dismiss
- Uses design tokens exclusively for all visual values
- ARIA roles: dialog, combobox, listbox, option with aria-selected
- Focus auto-moves to input on open
- Selected item auto-scrolls into view

**BQC Fixes**:

- State freshness: palette state resets completely on close
- Accessibility: dialog role, combobox role, listbox/option roles, aria-label on input

**Files Changed**:

- `apps/web/src/shell/command-palette.tsx` - Created (~190 lines)

---

### Task T007 - Mount CommandPalette in RootLayout

**Completed**: 2026-04-23

**Notes**:

- Imported CommandPalette and useCommandPalette
- Wired useCommandPalette with useNavigate callback
- Rendered palette above shell frame (fixed positioning handles layering)

**Files Changed**:

- `apps/web/src/shell/root-layout.tsx` - Added imports and palette mount (~8 lines changed)

---

### Task T008 - Rewrite SHELL_SURFACES descriptions

**Completed**: 2026-04-23

**Notes**:

- Replaced all 13 description strings with terse operator-focused copy
- Each description is one short sentence about what the operator can do
- No engineering jargon, no internal build references

**Files Changed**:

- `apps/web/src/shell/shell-types.ts` - 13 description strings rewritten

---

### Task T009 - Rewrite navigation rail heading and intro

**Completed**: 2026-04-23

**Notes**:

- "Operator navigation" -> "Navigation"
- Long explanatory paragraph -> "Jump to any area. Press Ctrl+K to search."

**Files Changed**:

- `apps/web/src/shell/navigation-rail.tsx` - Heading and intro rewritten

---

### Task T010 - Rewrite nav rail Active build section

**Completed**: 2026-04-23

**Notes**:

- "Active build" -> "Current context"
- "Cross-cutting" -> "All packages"

**Files Changed**:

- `apps/web/src/shell/navigation-rail.tsx` - Section label and fallback rewritten

---

### Task T011 - Rewrite surface placeholder titles and body

**Completed**: 2026-04-23

**Notes**:

- Replaced all 13 placeholder title+body pairs
- Removed "Session NN will...", "Phase NN adds..." patterns
- New format: "[Area name] -- coming soon" with one-sentence description of purpose

**Files Changed**:

- `apps/web/src/shell/surface-placeholder.tsx` - All getPlaceholderBody cases rewritten

---

### Task T012 - Rewrite surface placeholder highlights

**Completed**: 2026-04-23

**Notes**:

- Replaced implementation-detail highlights with operator-relevant context
- Kept dynamic counts from summary data
- Removed references to internal architecture decisions

**Files Changed**:

- `apps/web/src/shell/surface-placeholder.tsx` - Highlights rewritten in same pass as T011

---

### Task T013 - Rewrite operator-home-surface headings

**Completed**: 2026-04-23

**Notes**:

- "Operator home" (both fallback and hero labels) -> "Home"
- "App-owned daily landing path" -> "Daily overview"
- Fallback copy simplified: "Loading operator home" -> "Loading home", etc.
- Offline/error snapshot messages shortened

**Files Changed**:

- `apps/web/src/shell/operator-home-surface.tsx` - Labels, headings, and fallback copy rewritten

---

### Task T014 - Rewrite operator-home Phase/Session status line

**Completed**: 2026-04-23

**Notes**:

- Removed "Phase NN | Session `id`" format
- New format: just the current session ID and refresh timestamp

**Files Changed**:

- `apps/web/src/shell/operator-home-surface.tsx` - Status line simplified

---

### Task T015 - Wire palette action commands

**Completed**: 2026-04-23

**Notes**:

- Implemented in command-palette.tsx and use-command-palette.ts during T006
- "New evaluation" -> /evaluate, "View pipeline" -> /pipeline, "Open tracker" -> /tracker
- All actions navigate via useNavigate callback, palette closes after execution

**Files Changed**:

- Covered by T005 and T006 deliverables

---

### Task T016 - Add empty-state message

**Completed**: 2026-04-23

**Notes**:

- Implemented in command-palette.tsx during T006
- Shows "No matching commands" with muted styling when filter returns zero results

**Files Changed**:

- Covered by T006 deliverables

---

### Task T017 - Run banned-terms check

**Completed**: 2026-04-23

**Notes**:

- Session-scoped files pass with zero violations
- Pre-existing violations found in files outside session scope (application-help, approvals, batch, boot)
- Fixed one "contract" violation in surface-placeholder.tsx -> "format"
- Improved script heuristics to reduce false positives (CSS vars, internal IDs, HTML attrs)

**Files Changed**:

- `apps/web/src/shell/surface-placeholder.tsx` - Fixed "contract" -> "format"
- `scripts/check-app-ui-copy.mjs` - Improved code-context detection

---

### Task T018 - TypeScript type check

**Completed**: 2026-04-23

**Notes**:

- Fixed 2 type errors:
  1. command-palette.tsx: PaletteCommand | undefined narrowing on Enter key handler
  2. use-command-palette.ts: string | undefined narrowing on fuzzy match charAt

**Files Changed**:

- `apps/web/src/shell/command-palette.tsx` - Added const narrowing for selected command
- `apps/web/src/shell/use-command-palette.ts` - Added undefined guard for char lookup

---

### Task T019 - Validate ASCII encoding

**Completed**: 2026-04-23

**Notes**:

- All 9 new/modified files pass ASCII-only check
- No Unicode, smart quotes, or em-dashes found

**Files Changed**:

- None (verification only)

---

### Task T020 - Manual testing documentation

**Completed**: 2026-04-23

**Notes**:

- Manual testing checklist documented for user verification:
  - Cmd/Ctrl+K opens palette from every surface
  - Fuzzy search filters correctly (partial label, subsequence)
  - Arrow keys navigate, Enter selects, Escape dismisses
  - Navigation completes to correct route after selection
  - Palette closes after command execution
  - Focus returns to previous element on dismiss
  - All nav rail, placeholder, and home copy reads as terse operator guidance
  - No banned terms visible in any UI string

**Files Changed**:

- None (documentation only)

---

## Design Decisions

### Decision 1: Static command registry

**Context**: Whether to build the command registry dynamically on each render or statically from SHELL_SURFACES
**Chosen**: Static registry built once in useMemo with empty deps
**Rationale**: 13 surfaces + 3 actions is a small fixed set; no dynamic sources exist yet. Phase 02 will add context-aware commands.

### Decision 2: Fuzzy matching strategy

**Context**: Full fuzzy (subsequence) vs substring-only matching
**Chosen**: Both -- substring match first, fuzzy subsequence as fallback
**Rationale**: Substring handles the common case (typing "track" finds Tracker); fuzzy handles abbreviation patterns (typing "vp" could match "View pipeline").

### Decision 3: Palette action routing

**Context**: Whether action commands should use special callbacks or just navigate to paths
**Chosen**: Navigate to paths (same as surface commands)
**Rationale**: All 3 initial actions map 1:1 to existing routes. Phase 02 can add non-navigation actions when context-aware commands arrive.
