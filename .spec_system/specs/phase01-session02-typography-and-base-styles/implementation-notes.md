# Implementation Notes

**Session ID**: `phase01-session02-typography-and-base-styles`
**Package**: apps/web
**Started**: 2026-04-23 09:55
**Last Updated**: 2026-04-23 10:25

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 18 / 18 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### [2026-04-23] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T001 - Verify session 01 prerequisites

**Started**: 2026-04-23 09:53
**Completed**: 2026-04-23 09:55
**Duration**: 2 minutes

**Notes**:

- tokens.css exists with color, spacing, radius, border, and shadow tokens
- base.css exists with reset and body defaults
- Both stylesheets imported in main.tsx (lines 1-2)
- Session 01 deliverables confirmed complete

**Files Changed**:

- (none -- verification only)

---

### Task T002 - Sculpt-UI design brief

**Started**: 2026-04-23 09:55
**Completed**: 2026-04-23 09:58
**Duration**: 3 minutes

**Notes**:

- Emotional targets: calm authority + operational clarity
- Space Grotesk headings for Swiss International editorial identity
- IBM Plex Sans body for professional legibility
- IBM Plex Mono for utilitarian data/code precision
- Scale ratio: 1.25 (major second) per PRD
- Weight usage: Regular 400 body, Medium 500 labels, Semibold 600 subheadings, Bold 700 headings/badges

**Files Changed**:

- (none -- design brief only)

---

### Task T003 - Identify Google Fonts CDN URLs

**Started**: 2026-04-23 09:58
**Completed**: 2026-04-23 09:59
**Duration**: 1 minute

**Notes**:

- Space Grotesk: weights 400, 500, 600, 700
- IBM Plex Sans: weights 400, 500, 600
- IBM Plex Mono: weights 400, 500
- All with display=swap for FOIT prevention
- Single consolidated URL via Google Fonts multi-family syntax

**Files Changed**:

- (none -- research only)

---

### Task T004 - Add Google Fonts to index.html

**Started**: 2026-04-23 09:59
**Completed**: 2026-04-23 10:01
**Duration**: 2 minutes

**Notes**:

- Added preconnect to fonts.googleapis.com and fonts.gstatic.com
- Added consolidated stylesheet link for all three families with display=swap
- Placed before title tag for early discovery

**Files Changed**:

- `apps/web/index.html` - Added preconnect and Google Fonts stylesheet links

---

### Task T005 - Define font family tokens

**Started**: 2026-04-23 10:01
**Completed**: 2026-04-23 10:05
**Duration**: 4 minutes

**Notes**:

- Added --jh-font-heading (Space Grotesk + system-ui fallback)
- Added --jh-font-body (IBM Plex Sans + system-ui fallback)
- Added --jh-font-mono (IBM Plex Mono + monospace fallback stack)

**Files Changed**:

- `apps/web/src/styles/tokens.css` - Added font family token section

---

### Task T006 - Define typographic scale tokens

**Started**: 2026-04-23 10:05
**Completed**: 2026-04-23 10:10
**Duration**: 5 minutes

**Notes**:

- 13 scale steps: display, h1, h2, h3, h4, body-lg, body, body-sm, caption, mono, mono-sm, label, label-sm
- Each step has size, weight, line-height, and letter-spacing
- 1.25 ratio applied: 16px base -> 20 -> 25 -> 31 -> 39px
- Minimum body size 16px (1rem) per PRD

**Files Changed**:

- `apps/web/src/styles/tokens.css` - Added typographic scale section

---

### Task T007 - Define font weight tokens

**Started**: 2026-04-23 10:10
**Completed**: 2026-04-23 10:11
**Duration**: 1 minute

**Notes**:

- --jh-font-weight-regular: 400
- --jh-font-weight-medium: 500
- --jh-font-weight-semibold: 600
- --jh-font-weight-bold: 700

**Files Changed**:

- `apps/web/src/styles/tokens.css` - Added font weight token section

---

### Task T008 - Apply typographic defaults in base.css

**Started**: 2026-04-23 10:11
**Completed**: 2026-04-23 10:16
**Duration**: 5 minutes

**Notes**:

- Replaced body font-family with var(--jh-font-body) token reference
- Added body font-size, weight, line-height, letter-spacing from tokens
- Added h1-h6 defaults using --jh-font-heading family with per-level scale tokens
- Added code/kbd/samp/pre defaults using --jh-font-mono
- Added small element defaults using body-sm tokens
- Avenir Next and non-PRD fonts eliminated (also completes T013)

**Files Changed**:

- `apps/web/src/styles/base.css` - Full typographic defaults rewrite

---

### Task T009 - Migrate operator-shell.tsx

**Started**: 2026-04-23 10:16
**Completed**: 2026-04-23 10:17
**Duration**: 1 minute

**Notes**:

- Replaced lineHeight: 1.6 with var(--jh-text-body-line-height) in pageStyle
- Added fontFamily: var(--jh-font-body) to pageStyle for explicit root declaration
- Most values already used design tokens from session 01

**Files Changed**:

- `apps/web/src/shell/operator-shell.tsx` - Updated pageStyle font references

---

### Task T010 - Migrate navigation-rail.tsx

**Started**: 2026-04-23 10:17
**Completed**: 2026-04-23 10:19
**Duration**: 2 minutes

**Notes**:

- Replaced fontSize: "1.35rem" with var(--jh-text-h3-size) on heading
- Replaced fontSize: "0.82rem" with var(--jh-text-caption-size) on badges
- Replaced fontWeight: 700 with var(--jh-font-weight-bold) on badges
- Replaced fontSize: "0.92rem" with var(--jh-text-body-sm-size) on descriptions

**Files Changed**:

- `apps/web/src/shell/navigation-rail.tsx` - Updated 3 font value references

---

### Task T011 - Migrate status-strip.tsx

**Started**: 2026-04-23 10:19
**Completed**: 2026-04-23 10:22
**Duration**: 3 minutes

**Notes**:

- Replaced fontSize: "0.95rem" with var(--jh-text-body-sm-size) in buttonStyle
- Replaced fontWeight: 700 with var(--jh-font-weight-bold) in buttonStyle and badge
- Replaced fontSize: clamp(2rem, 4vw, 3rem) with var(--jh-text-display-size) on h1 (2 instances)
- Added letterSpacing: var(--jh-text-display-letter-spacing) on h1 elements
- Kept letterSpacing: "0.08em" on uppercase labels (intentional all-caps treatment)

**Files Changed**:

- `apps/web/src/shell/status-strip.tsx` - Updated button, badge, and h1 font tokens

---

### Task T012 - Migrate operator-home-surface.tsx

**Started**: 2026-04-23 10:22
**Completed**: 2026-04-23 10:24
**Duration**: 2 minutes

**Notes**:

- Replaced fontSize: "0.9rem" with var(--jh-text-body-sm-size) in badgeStyle
- Replaced fontWeight: 700 with var(--jh-font-weight-bold) in badgeStyle and actionButtonStyle
- Replaced borderRadius: "999px" with var(--jh-radius-pill) in badgeStyle and actionButtonStyle
- Replaced background: "#0f172a" with var(--jh-color-button-bg) in actionButtonStyle
- Replaced color: "#f8fafc" with var(--jh-color-button-fg) in actionButtonStyle
- Replaced inline fontWeight: 700 with var(--jh-font-weight-bold) on degraded state notice
- Raw hex color values for semantic colors left for Phase 02 color migration

**Files Changed**:

- `apps/web/src/shell/operator-home-surface.tsx` - Updated font and button tokens

---

### Task T013 - Remove Avenir Next and non-PRD font references

**Started**: 2026-04-23 10:24
**Completed**: 2026-04-23 10:24
**Duration**: <1 minute

**Notes**:

- Already completed as part of T008 (base.css body font-family update)
- Verified via grep: zero Avenir, Trebuchet, or Gill Sans references in apps/web/src

**Files Changed**:

- (none -- already done in T008)

---

### Task T014 - Audit surface-placeholder.tsx

**Started**: 2026-04-23 10:24
**Completed**: 2026-04-23 10:24
**Duration**: <1 minute

**Notes**:

- No inline fontSize, fontWeight, lineHeight, or fontFamily declarations found
- File uses semantic h2 and p elements that inherit from base.css typography defaults

**Files Changed**:

- (none -- no migration needed)

---

### Task T015 - Banned-terms check

**Started**: 2026-04-23 10:24
**Completed**: 2026-04-23 10:25
**Duration**: 1 minute

**Notes**:

- check-app-ui-copy.mjs does not exist yet; ran manual grep for banned terms
- No new banned-term regressions introduced by typography changes
- Pre-existing "Phase" and "Session" strings in operator-home-surface.tsx noted but out of scope

**Files Changed**:

- (none -- verification only)

---

### Task T016 - Verify fonts load via Vite dev server

**Started**: 2026-04-23 10:25
**Completed**: 2026-04-23 10:25
**Duration**: <1 minute

**Notes**:

- TypeScript check (tsc --noEmit) passes cleanly
- Vite production build succeeds (118 modules, 7.14 kB CSS, 751 kB JS)
- Google Fonts CDN URL verified well-formed with display=swap
- Manual browser verification deferred to operator

**Files Changed**:

- (none -- verification only)

---

### Task T017 - Verify no FOIT/FOUT

**Started**: 2026-04-23 10:25
**Completed**: 2026-04-23 10:25
**Duration**: <1 minute

**Notes**:

- Preconnect hints present for fonts.googleapis.com and fonts.gstatic.com
- display=swap parameter ensures font-display: swap behavior
- System font fallback stacks in all three family tokens
- Manual browser hard-refresh test deferred to operator

**Files Changed**:

- (none -- verification only)

---

### Task T018 - Validate ASCII and LF line endings

**Started**: 2026-04-23 10:25
**Completed**: 2026-04-23 10:25
**Duration**: <1 minute

**Notes**:

- All 7 modified files confirmed ASCII-only (code points 0-127)
- All 7 modified files confirmed Unix LF line endings (no CRLF)

**Files Changed**:

- (none -- verification only)

---

## Design Decisions

### Decision 1: Google Fonts CDN vs self-hosted fonts

**Context**: PRD specifies Space Grotesk, IBM Plex Sans, IBM Plex Mono
**Options Considered**:

1. Google Fonts CDN -- zero config, fast CDN, display=swap built in
2. Self-hosted font files -- offline capable, no third-party dependency

**Chosen**: Google Fonts CDN
**Rationale**: Spec explicitly names this as the simplest path; self-hosting is deferred per spec

### Decision 2: Typographic scale ratio

**Context**: Need a scale that works for both dense operational UI and editorial headings
**Options Considered**:

1. 1.25 (major second) -- measured, non-dramatic
2. 1.333 (perfect fourth) -- more dramatic heading contrast

**Chosen**: 1.25 per PRD_UX.md specification
**Rationale**: PRD explicitly specifies 1.25 ratio

### Decision 3: Uppercase label letter-spacing (0.08em) not tokenized

**Context**: Uppercase labels use 0.08em letter-spacing across multiple components
**Options Considered**:

1. Create a dedicated --jh-text-label-caps-letter-spacing token
2. Leave as inline 0.08em (consistent but not tokenized)

**Chosen**: Leave as inline for now
**Rationale**: This value is specific to the uppercase+small-caps label pattern and
does not map cleanly to any existing scale step. Can be tokenized in Phase 02 when
the full component typography audit happens.
