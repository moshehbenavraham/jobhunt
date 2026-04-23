# Implementation Notes

**Session ID**: `phase01-session01-design-token-layer`
**Package**: apps/web
**Started**: 2026-04-23 09:32
**Last Updated**: 2026-04-23 09:55

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

- [x] Prerequisites confirmed (Phase 00 complete, PRD_UX.md accessible)
- [x] Tools available (Node, npm, Vite config present)
- [x] Directory structure ready (apps/web/src/styles/ created)

---

### Task T001-T003 - Setup and Palette Extraction

**Completed**: 2026-04-23 09:34

**Notes**:

- Phase 00 confirmed complete in state.json
- PRD_UX.md palette extracted precisely from section 10 "Design System"
- Palette: mineral paper #F4EFE6, stone #E3DDD2, fog #D9E4E8, deep ink #20313A
- Accent: cobalt #2C63FF
- Signal: verdigris #1F9D84, amber #C5851B, coral #D85B45, mulberry #7B4ED8
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96
- Created apps/web/src/styles/ directory

---

### Task T004-T006 - Token CSS Foundation

**Completed**: 2026-04-23 09:37

**Notes**:

- Created tokens.css with ~120 lines of :root custom properties
- Color tokens: PRD palette primaries + semantic aliases for shell, nav, text, status, badges, buttons
- Spacing tokens: --jh-space-1 through --jh-space-24 (4px base) plus named aliases
- Radius tokens: sm (0.5rem), md (0.75rem), lg (1.15rem), xl (1.5rem), 2xl (1.8rem), pill (999px)
- Border tokens: width, color, and subtle shorthand
- Shadow tokens: sm, md, lg with deep-ink-tinted rgba

**Files Changed**:

- `apps/web/src/styles/tokens.css` - created

---

### Task T007 - Base CSS Reset

**Completed**: 2026-04-23 09:38

**Notes**:

- Minimal CSS reset (box-sizing, margin/padding zero, image defaults)
- Body defaults consuming tokens: background, color, font-family, line-height
- Font stack: IBM Plex Sans with system fallbacks (per CONVENTIONS.md typography section)
- Font smoothing enabled via -webkit-font-smoothing and text-rendering

**Files Changed**:

- `apps/web/src/styles/base.css` - created

---

### Task T008 - Layout Zone Properties

**Completed**: 2026-04-23 09:39

**Notes**:

- Zone widths: rail 18rem, rail-min 16rem, canvas-min 42rem, evidence-rail 22rem
- Zone gaps reference spacing tokens
- Frame: max-width 88rem, padding references spacing tokens
- Breakpoints: mobile 768px, tablet/desktop 1200px, wide 1600px (per PRD_UX.md section 8)
- Declarations only, no media queries (deferred to session 03)

**Files Changed**:

- `apps/web/src/styles/layout.css` - created

---

### Task T009-T010 - Entry Point Wiring

**Completed**: 2026-04-23 09:40

**Notes**:

- CSS imports added to main.tsx in cascade order: tokens -> base -> layout (before React imports)
- meta theme-color added to index.html matching PRD shell background #F4EFE6

**Files Changed**:

- `apps/web/src/main.tsx` - added 3 CSS imports
- `apps/web/index.html` - added meta theme-color tag

---

### Task T011 - Migrate operator-shell.tsx

**Completed**: 2026-04-23 09:44

**Notes**:

- Replaced all inline hex/rgb color values with var(--jh-\*) references
- pageStyle: radial gradient replaced with flat shell-bg token, fontFamily removed (handled by base.css)
- frameStyle: gap and maxWidth use layout zone tokens
- shellBodyStyle, railWrapperStyle, surfaceWrapperStyle: use layout zone tokens
- surfaceCardStyle: removed backdropFilter, uses surface-bg and border-subtle tokens
- startupNoticeStyle: uses status-warning tokens
- renderStartupNotice: auth/error sections use semantic status tokens
- renderStartupSurface: all inline colors replaced with token references
- Cleaned banned terms: "canonical" -> removed, "contract" -> "check"/"configuration"

**Files Changed**:

- `apps/web/src/shell/operator-shell.tsx` - replaced ~25 inline hex values

---

### Task T012 - Migrate navigation-rail.tsx

**Completed**: 2026-04-23 09:47

**Notes**:

- railStyle: removed backdropFilter, uses nav-bg/nav-border/nav-text/radius-xl tokens
- listStyle: gap uses space-3 token
- badgeToneStyles: all 4 tone variants use badge color tokens
- Nav header: accent color uses nav-accent token, muted text uses nav-muted
- Nav items: background/border/radius/color/gap/padding all use tokens
- Badge spans: radius uses pill token
- Session info section: uses nav-item-bg, surface-border, text-muted tokens
- Cleaned banned terms: "Phase 06 shell" -> "Workbench", "surfaces" aria-label -> "workbench navigation"

**Files Changed**:

- `apps/web/src/shell/navigation-rail.tsx` - replaced ~20 inline hex values

---

### Task T013 - Migrate status-strip.tsx

**Completed**: 2026-04-23 09:50

**Notes**:

- panelStyle: removed backdropFilter and gradient, uses surface-bg and nav-border tokens
- cardStyle: uses surface-bg and border-subtle tokens
- buttonStyle: uses button-bg/button-fg and radius-pill tokens
- cardGridStyle: gap uses padding-sm token
- getStatusTone: all 7 status variants use semantic status tokens
- Inline JSX: all #7c2d12, #475569, #64748b, #fff7ed, #fed7aa, #fef3c7, #fcd34d, #fee2e2, #fecaca replaced
- Zero remaining hex/rgb values confirmed via grep

**Files Changed**:

- `apps/web/src/shell/status-strip.tsx` - replaced ~30 inline hex values

---

### Task T014 - Audit shell-types.ts Banned Terms

**Completed**: 2026-04-23 09:51

**Notes**:

- Cleaned SHELL_SURFACES descriptions: removed "canonical", "surface", "contract"
- Cleaned owner fields: "Session NN" -> "SNN", "Phase NN" -> "PNN"
- Also cleaned operator-shell.tsx and navigation-rail.tsx for remaining banned terms in user-visible strings

**Files Changed**:

- `apps/web/src/shell/shell-types.ts` - cleaned 13 description/owner strings
- `apps/web/src/shell/operator-shell.tsx` - cleaned 5 user-visible strings
- `apps/web/src/shell/navigation-rail.tsx` - cleaned 1 aria-label

---

### Task T015-T016 - Hex/RGB Audit

**Completed**: 2026-04-23 09:52

**Notes**:

- Grepped all 3 migrated shell files for #[0-9a-fA-F] and rgb( patterns
- Zero matches in operator-shell.tsx, navigation-rail.tsx, status-strip.tsx
- Non-shell files (operator-home-surface.tsx, surface-placeholder.tsx) still have hex values but are out of scope per spec

---

### Task T017-T020 - Testing and Verification

**Completed**: 2026-04-23 09:55

**Notes**:

- TypeScript check: `npx tsc --noEmit` passes with zero errors
- Vite dev server: starts successfully in ~235ms, no CSS import errors
- ASCII encoding: all 9 new/modified files confirmed ASCII-only
- LF line endings: all 9 files confirmed Unix LF (no CRLF)
- Banned-terms script (check-app-ui-copy.mjs) does not exist in repo yet; manual grep verified clean copy

---

## Design Decisions

### Decision 1: Removed glassmorphism backdrop-filter

**Context**: operator-shell, navigation-rail, and status-strip all used `backdropFilter: "blur(Npx)"` for a glass effect
**Chosen**: Remove backdrop-filter entirely, rely on token-based surface-bg
**Rationale**: PRD anti-patterns explicitly discourage "over-polished" aesthetics; the mineral paper + ink palette provides hierarchy without glass effects; backdrop-filter causes compositing overhead on operator hardware

### Decision 2: Flat shell background instead of gradient

**Context**: operator-shell pageStyle used a 3-stop radial gradient (#fff7ed, #f8fafc, #f5f3ff)
**Chosen**: Single flat --jh-color-shell-bg (mineral paper #F4EFE6)
**Rationale**: PRD palette specifies mineral paper as the dominant surface (60%); gradients diluted the palette identity

### Decision 3: Added --jh-color-status-error-border token

**Context**: #fecaca appeared in 3 places as error section border color but had no token
**Chosen**: Added --jh-color-status-error-border: #fecaca to tokens.css
**Rationale**: Consistent with the pattern of bg+fg+border triplets for other status categories
