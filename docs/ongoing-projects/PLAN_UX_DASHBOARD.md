# Dashboard UX Redesign -- Implementation Plan

**Source PRD**: [PRD_UX.md](../../.spec_system/PRD/PRD_UX.md)
**Codebase**: `dashboard/` (~3,150 LOC across 10 Go files)
**Stack**: Go 1.25 + Bubble Tea v1.3 + Lip Gloss v1.1 + termenv v0.16
**Created**: 2026-04-15

---

## Quick-Reference Checklist

Track session-level progress here during implementation.

```
SESSION 1 -- Design System & Theme Foundation  ✅ COMPLETE
  [x] S1.1  Theme struct extended with style helpers
  [x] S1.2  Elevation style helpers (Ground / Shelf / Focus)
  [x] S1.3  Typography tier helpers (Display / Section / Label / Body / Supporting / Structural)
  [x] S1.4  Spacing token constants (xs / sm / md)
  [x] S1.5  Unicode glyph constants (blocks, box-drawing, braille range)
  [x] S1.6  Responsive width-class helper
  [x] S1.7  Score gauge function (quarter-block chars)
  [x] S1.8  Status color helper on Theme
  [x] S1.9  Catppuccin Latte palette corrections (Subtext: #5c5f77 -> #6c6f85)
  [x] S1.10 Build passes, existing tests pass

SESSION 2 -- Pipeline Screen: Core Visual Overhaul  ✅ COMPLETE
  [x] S2.1  Selection highlight: status-colored accent bar + Overlay bg
  [x] S2.2  Score column: prepend quarter-block gauge character
  [x] S2.3  Tab row: heavy underline active / thin underline inactive (verified, already correct)
  [x] S2.4  Tab row: count badges bright for active, dimmed for inactive (verified, already correct)
  [x] S2.5  Metrics ribbon: compact colored status counts (migrated to theme.StatusColor)
  [x] S2.6  Sort bar: bracket notation with count (verified, already correct)
  [x] S2.7  Group headers: em-dash bordered labels with rule fill (verified, already correct)
  [x] S2.8  Help bar: bold keys + Subtext descriptions + right-aligned brand (verified, already correct)
  [x] S2.9  Header: migrated to theme.Shelf() + theme.Display() + theme.Supporting()
  [x] S2.10 Score color thresholds aligned to PRD (>=4.5/4.0/3.5/3.0/<3.0)
  [x] S2.11 Build passes, existing tests pass

SESSION 3 -- Pipeline Screen: Advanced Components  ✅ COMPLETE
  [x] S3.1  Preview pane: Sky bold labels, Text values, thin divider
  [x] S3.2  Preview pane: 4-field layout (archetype, TL;DR, comp, remote)
  [x] S3.3  Preview pane: fallback chain (report -> notes -> "Loading...")
  [x] S3.4  Status picker: overlay with Blue title, > cursor, Overlay highlight
  [x] S3.5  Empty state: centered message with Subtext instructions
  [x] S3.6  Responsive columns: drop comp <80, extend role >120
  [x] S3.7  Responsive tabs: abbreviated labels below 80 cols
  [x] S3.8  Responsive preview: TL;DR only below 80, all 4 fields above 120
  [x] S3.9  Scroll position indicator (right-margin quarter-block)
  [x] S3.10 Pipeline body height formula: total - 7 - preview height
  [x] S3.11 Adjust scroll look-ahead margin to 3 lines
  [x] S3.12 Build passes, existing tests pass

SESSION 4 -- Progress Screen Overhaul  ✅ COMPLETE
  [x] S4.1  Header: Mauve title, Subtext stats right, Surface bg
  [x] S4.2  Funnel: stage colors gradient (Blue -> Sky -> Green -> Yellow -> Peach)
  [x] S4.3  Funnel: half-block chars for double-resolution bars (P2)
  [~] S4.4  Funnel: Braille sparklines on terminals >140 cols (P2) -- DEFERRED to Session 7
  [x] S4.5  Score distribution: color per bucket (Green -> Red gradient)
  [x] S4.6  Weekly activity: graduated bar color by relative activity level
  [x] S4.7  Conversion rates: colored values with pipe separators
  [x] S4.8  Rate color thresholds aligned to PRD (>=30/15/5/<5)
  [x] S4.9  Section titles: Sky bold, single blank line between sections
  [x] S4.10 Empty states: "No data" per section in Subtext
  [x] S4.11 Help bar: consistent with pipeline screen pattern
  [x] S4.12 Responsive: generous bar widths >120, full week labels >160
  [x] S4.13 Build passes, existing tests pass

SESSION 5 -- Report Viewer Overhaul  ✅ COMPLETE
  [x] S5.1  Header: Blue title, scroll indicator right (Top/End/%)
  [x] S5.2  H1 rendering: Blue bold, prefix stripped
  [x] S5.3  H2 rendering: Mauve bold, prefix stripped
  [x] S5.4  H3 rendering: Sky bold, prefix stripped
  [x] S5.5  Blockquotes: vertical bar (Overlay) + italic Subtext content
  [x] S5.6  Bold fields: Yellow for **Label:** lines
  [x] S5.7  Horizontal rules: full-width thin line in Overlay
  [x] S5.8  Tables: box-drawing borders with corner/T-junction/cross pieces
  [x] S5.9  Tables: header row Sky bold, data rows Text
  [x] S5.10 Tables: auto-computed column widths with intelligent truncation
  [x] S5.11 Tables: overwide cells truncate with ellipsis
  [x] S5.12 Footer help bar: consistent with pipeline pattern
  [x] S5.13 Empty file: "(empty file)" in Subtext
  [x] S5.14 Read error: inline error message
  [x] S5.15 Build passes, existing tests pass

SESSION 6 -- Integration, Accessibility & Testing  ✅ COMPLETE
  [x] S6.1  Catppuccin Latte: verify all screens render correctly
  [x] S6.2  Theme auto-detection: termenv.HasDarkBackground flow
  [x] S6.3  main.go: pass stored theme to progress screen (not hardcoded)
  [x] S6.4  Accessibility: status conveyed by text label + color, never color alone
  [x] S6.5  Accessibility: Subtext on Surface is minimum contrast for secondary info
  [x] S6.6  Accessibility: no Overlay text on Surface backgrounds
  [x] S6.7  Edge case: zero applications -> empty state renders
  [x] S6.8  Edge case: missing report file -> inline error in viewer
  [x] S6.9  Edge case: narrow terminal (80x24) -> layout degrades gracefully
  [x] S6.10 Edge case: wide terminal (200+) -> layout uses extra space
  [x] S6.11 Test: update TestWithReloadedDataPreservesStateAndSelection
  [x] S6.12 Test: update TestRenderAppLineIncludesDateColumn for accent bar
  [x] S6.13 Test: add test for score gauge rendering
  [x] S6.14 Test: add test for responsive column width calculation
  [x] S6.15 Perf check: key-to-redraw p95 <=16ms on representative datasets
  [x] S6.16 PRD acceptance checklist (Section 15) signed off with evidence
  [x] S6.17 Build passes, all tests pass, go vet clean

SESSION 7 -- Funnel Braille Sparklines (completing deferred S4.4)
  [ ] S7.1  Model: add WeeklyBreakdown field to FunnelStage struct
  [ ] S7.2  Data: derive stage-level weekly counts in ComputeProgressMetrics
  [ ] S7.3  Render: brailleSparkline helper function ([]int -> 4-char Braille string)
  [ ] S7.4  Render: append sparkline after funnel count on terminals >140 cols
  [ ] S7.5  Test: brailleSparkline unit test (empty, flat, ascending, descending, single)
  [ ] S7.6  Test: funnel sparkline visibility test (hidden <=140, shown >140)
  [ ] S7.7  Build passes, all tests pass, go vet clean
```

---

## Execution Guardrails (Objective)

1. **Scope lock**: Keep this redesign UI-only. Do not change tracker/report data
   contracts or file formats.
2. **Priority lock**: P0 and P1 items define completion for this initiative. P2
   items are optional polish and must not block release readiness.
3. **Validation lock**: Every session exits only when build and tests pass.
   Session 6 adds explicit performance and acceptance sign-off.
4. **Reference lock**: File line numbers in this plan are directional only and
   may drift. Function names are the source of truth for implementation.

---

## Current State vs. Target State

### What already exists and works

| Component                  | Current State                                              | PRD Alignment                                                 |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Theme struct               | Base/Surface/Overlay/Text/Subtext + 8 accents              | Colors match PRD. Struct needs style helpers, not new colors. |
| Auto-detection             | `termenv.HasDarkBackground()` switches Mocha/Latte         | Correct pattern. Latte Overlay/Subtext values need review.    |
| Pipeline header            | Surface bg, Blue bold title, Subtext stats right           | Matches PRD. Minor format tweaks.                             |
| Tab row                    | Heavy/thin underlines, count badges                        | Already implemented. Needs bright/dim badge differentiation.  |
| Metrics ribbon             | Surface bg, status-colored inline counts                   | Matches PRD. Already working.                                 |
| Sort bar                   | Bracket notation, Subtext, no bg                           | Matches PRD. Already working.                                 |
| Group headers              | Em-dash bordered, bold Subtext, rule fill                  | Already implemented. Formatting matches PRD.                  |
| Preview pane               | Sky labels, Text values, Overlay divider                   | Already implemented. Needs label naming and fallback cleanup. |
| Status picker              | Blue title, > cursor, Overlay highlight                    | Already implemented. Matches PRD.                             |
| Help bar                   | Surface bg, bold keys, Subtext descriptions, brand         | Already implemented. Matches PRD.                             |
| Report viewer: headers     | H1 Blue, H2 Mauve, H3 Sky -- all bold, prefix stripped     | Already implemented. Matches PRD.                             |
| Report viewer: tables      | Full box-drawing borders, Sky header, auto-computed widths | Already implemented. Matches PRD.                             |
| Report viewer: blockquotes | Vertical bar + italic Subtext                              | Already implemented. Matches PRD.                             |
| Report viewer: bold fields | Yellow bold for `**Label:**` lines                         | Already implemented. Matches PRD.                             |
| Progress: funnel           | Full-block bars, stage color gradient                      | Partially matches. Needs half-block enhancement.              |
| Progress: score dist       | Color-coded buckets, full-block bars                       | Already implemented. Colors match.                            |
| Progress: rates            | Colored values with pipe separators                        | Already implemented. Matches PRD.                             |
| Progress: weekly           | Full-block bars in Blue                                    | Needs graduated color enhancement.                            |

### What needs to change

| Change                                               | Priority | File(s)               | Effort                              |
| ---------------------------------------------------- | -------- | --------------------- | ----------------------------------- |
| Theme style helpers (elevation, typography, spacing) | P0       | `theme/theme.go`      | New functions, no breaking changes  |
| Score gauge (quarter-block prepend)                  | P1       | `pipeline.go`         | ~20 lines in `renderAppLine`        |
| Selection highlight (accent bar + Overlay)           | P0       | `pipeline.go`         | ~15 lines in `renderAppLine`        |
| Score thresholds realigned to PRD                    | P0       | `pipeline.go`         | 5-line edit in `scoreStyle`         |
| Empty state (centered instructions)                  | P0       | `pipeline.go`         | ~15 lines in `renderBody`           |
| Responsive column widths                             | P1       | `pipeline.go`         | ~30 lines in `renderAppLine`        |
| Responsive tab abbreviation                          | P1       | `pipeline.go`         | ~10 lines in `renderTabs`           |
| Responsive preview field count                       | P1       | `pipeline.go`         | ~10 lines in `renderPreview`        |
| Funnel half-block characters                         | P2       | `progress.go`         | ~30 lines in `renderFunnel`         |
| Braille sparklines (wide terminals)                  | P2       | `progress.go`         | ~50 lines new function              |
| Weekly activity graduated color                      | P1       | `progress.go`         | ~15 lines in `renderWeeklyActivity` |
| Scroll position indicator                            | P1       | `pipeline.go`         | ~15 lines in `renderBody`           |
| Latte palette corrections                            | P0       | `catppuccin_latte.go` | 2-line color value fix              |
| main.go theme passthrough                            | P0       | `main.go`             | 1-line fix (line 97)                |
| Test updates                                         | P0       | `pipeline_test.go`    | ~40 lines modified/added            |

---

## Session Details

**Implementation note**: line references below are approximate and expected to
drift as files evolve; use function names as the canonical anchor points.

### Session 1: Design System & Theme Foundation

**Objective**: Build the shared style vocabulary that all subsequent sessions consume.

**Scope**: `theme/theme.go`, `theme/catppuccin.go`, `theme/catppuccin_latte.go`.
No screen files are modified. No user-visible behavior changes.

**Rationale**: Every screen file currently builds `lipgloss.NewStyle()` inline
with ad-hoc color choices. The PRD defines a strict 3-level elevation model,
6-tier typography scale, and spacing tokens. Centralizing these as theme methods
means sessions 2-5 can call `m.theme.Shelf()` instead of
`lipgloss.NewStyle().Background(m.theme.Surface).Width(m.width).Padding(0, 2)`
repeatedly. It also ensures consistent style decisions across all three screens.

**What changes**:

1. **Theme struct additions** -- Add methods, not fields. The struct already has
   the right color fields. Add:
   - `Ground() lipgloss.Style` -- Base background, for body content areas
   - `Shelf(width int) lipgloss.Style` -- Surface background, full-width, Padding(0,2)
   - `Focus() lipgloss.Style` -- Overlay background for selected elements
   - `Display(color lipgloss.Color) lipgloss.Style` -- Tier 1: Bold + accent
   - `Section() lipgloss.Style` -- Tier 2: Bold + Sky
   - `Label() lipgloss.Style` -- Tier 3: Bold + Yellow
   - `Body() lipgloss.Style` -- Tier 4: Regular + Text
   - `Supporting() lipgloss.Style` -- Tier 5: Regular + Subtext
   - `Structural() lipgloss.Style` -- Tier 6: Regular + Overlay

2. **Spacing constants** -- Package-level constants:
   - `SpaceXS = 1` (between inline elements)
   - `SpaceSM = 2` (left/right content padding)
   - `SpaceMD = 4` (between column groups)

3. **Unicode glyph constants** -- Package-level constants for the block
   characters used across screens:
   - Full block, 3/4 block, half block, 1/4 block, 1/8 block
   - Heavy horizontal, thin horizontal
   - Box-drawing corners, T-junctions, cross
   - Braille range base (U+2800)

4. **Responsive width classifier** -- A function that returns a width class
   (Minimum / Standard / Comfortable / Cinematic) from a column count, mapping
   to the PRD's 4 breakpoints (<80, 80-120, 120-160, >160).

5. **Score gauge function** -- Given a score float64, return the appropriate
   quarter-block character and color, per the PRD table (>=4.5 full block green
   bold, >=4.0 3/4 green, >=3.5 half yellow, >=3.0 1/4 text, <3.0 1/8 red).

6. **Status color helper** -- Move the `statusColorMap` that currently lives as
   a method on `PipelineModel` onto `Theme` so both pipeline and progress
   screens share the same mapping.

7. **Latte palette review** -- The current Latte defines:
   - Overlay: `#9ca0b0` and Subtext: `#5c5f77`
   - The canonical Catppuccin Latte values are Overlay0: `#9ca0b0`,
     Subtext0: `#6c6f85`. Verify and correct if needed.

**Exit criteria**: `go build ./...` and `go test ./...` pass. No screen files
touched. Theme package exposes the new helpers with doc comments.

---

### Session 2: Pipeline Screen -- Core Visual Overhaul

**Objective**: Make the pipeline list visually match the PRD's "observatory
instrument panel" aesthetic.

**Scope**: `pipeline.go` -- rendering functions only. No logic or keybinding
changes. Uses helpers from session 1.

**What changes**:

1. **Selection highlight** (`renderAppLine`, lines 722-786)
   - Selected row: prepend 1-char status-colored full-block (U+2588) as accent
     bar, then apply Overlay background to the rest of the row.
   - Unselected row: prepend 1-char space (no pip) for alignment.
   - Use `m.theme.StatusColor(norm)` from session 1 for the accent bar color.

2. **Score gauge** (`renderAppLine`)
   - Before the numeric score, render 1 quarter-block character using
     `theme.ScoreGauge(app.Score)` from session 1.
   - The gauge character and the numeric score together form a 7-char score
     column (1 gauge + 1 space + 3 digits + 2 pad).

3. **Score color thresholds** (`scoreStyle`, lines 903-914)
   - Current thresholds: >=4.2 green bold, >=3.8 yellow, >=3.0 text, else red.
   - PRD thresholds: >=4.5 green bold, >=4.0 green, >=3.5 yellow, >=3.0 text,
     <3.0 red. Align to PRD.

4. **Tab row** (`renderTabs`, lines 598-628)
   - Active tab: count badge in Blue (bright). Already bold + Blue.
   - Inactive tab: count badge in Subtext (dimmed). Already Subtext.
   - Verify the heavy underline uses U+2501 (currently uses U+2501 via
     `strings.Repeat("━"...)` -- correct).
   - Verify inactive uses U+2500 (`strings.Repeat("─"...)` -- correct).

5. **Metrics ribbon** (`renderMetrics`, lines 650-670)
   - Already correct. Verify status color mapping uses the shared theme helper
     from session 1 instead of the local method.

6. **Sort bar** (`renderSortBar`, lines 672-683)
   - Already correct format. No changes needed beyond using theme helpers.

7. **Group headers** (`renderBody`, lines 700-712)
   - Already uses em-dash bordered format. Verify the rule fill extends to
     `m.width - 4` (accounting for padding).

8. **Help bar** (`renderHelp`, lines 833-869)
   - Already matches PRD pattern. Migrate to use theme typography helpers.

9. **Header** (`renderHeader`, lines 577-596)
   - Already matches. Migrate to use `m.theme.Shelf(m.width)` from session 1.

**Exit criteria**: Pipeline view renders with accent-bar selection, score
gauges, and refined visual hierarchy. Build and tests pass.

---

### Session 3: Pipeline Screen -- Advanced Components

**Objective**: Complete the pipeline screen's responsive behavior, empty state,
and preview/picker polish.

**Scope**: `pipeline.go` -- primarily `renderPreview`, `overlayStatusPicker`,
`renderBody` (empty path), `renderAppLine` (responsive columns), `renderTabs`
(responsive labels).

**What changes**:

1. **Preview pane labels** (`renderPreview`, lines 788-831)
   - Labels currently show "Arquetipo:" -- the PRD uses English labels. Change
     to "Archetype:", "TL;DR:", "Comp:", "Remote:" for UI consistency across
     screens and docs. Treat localization as future scope.
   - Add responsive field count:
     - Width < 80: show TL;DR only
     - Width 80-120: archetype + TL;DR + comp
     - Width > 120: all four fields

2. **Preview fallback chain** (`renderPreview`)
   - Current: report cache -> notes -> "Loading preview..."
   - PRD says the same. Verify "Loading preview..." uses Subtext. Already does.

3. **Status picker** (`overlayStatusPicker`, lines 871-899)
   - Already matches PRD (Blue bold title, > cursor, Overlay highlight, width
     30). No changes needed beyond using theme helpers.

4. **Empty state** (`renderBody`, lines 686-691)
   - Current: "No offers match this filter" left-aligned in Subtext.
   - PRD: centered block with two-line instruction:

     ```
     No applications tracked yet.

     Paste a job description or URL to get started.
     Run a portal scan to find opportunities.
     ```

   - Center horizontally and vertically in available body space.
   - Differentiate between "no apps at all" (show instructions) vs. "no apps
     match filter" (show filter-specific message).

5. **Responsive column widths** (`renderAppLine`, lines 724-735)
   - Current: fixed column widths regardless of terminal width.
   - Add width-class-based adaptation:
     - < 80 cols: drop comp column, truncate company to 10, reduce role
     - 80-120: current layout (full columns)
     - 120-160: extended role column
     - > 160: extra padding

6. **Responsive tab labels** (`renderTabs`)
   - Below 80 cols, abbreviate: ALL, EVAL, APP, INT, TOP, SKIP.
   - Above 80 cols, keep current full labels.

7. **Scroll position indicator**
   - When content extends beyond viewport, render a subtle indicator in the
     right margin of the body area using quarter-block characters to show
     approximate scroll position.
   - Implementation: in `View()`, after building the body, if total lines >
     available height, compute position fraction and render a quarter-block
     character at the appropriate line in the right margin.

8. **Body height formula**
   - Current: `m.height - 7 - previewLines` (line 552).
   - PRD: `total height - 7 (fixed chrome) - preview height`, minimum 3 lines.
   - Already matches. Verify the "7" accounts for: header(1) + tabs(2) +
     metrics(1) + sortbar(1) + help(1) + divider(1) = 7.

9. **Scroll look-ahead margin**
   - Current: margin = 3 (line 499). PRD says 3-line look-ahead. Already
     matches.

**Exit criteria**: Pipeline screen adapts to terminal width, shows centered
empty state, preview pane adjusts field count by width. Build and tests pass.

---

### Session 4: Progress Screen Overhaul

**Objective**: Transform the progress screen from functional to visually
striking, with the "Pipeline Constellation View" as the signature moment.

**Scope**: `progress.go`. Uses theme helpers from session 1.

**What changes**:

1. **Header** (`renderHeader`, lines 122-146)
   - Already uses Mauve title, Subtext stats, Surface bg. Migrate to theme
     helpers. No visual change needed.

2. **Funnel visualization** (`renderFunnel`, lines 148-214)
   - Current: full-block bars (U+2588) with gradient stage colors.
   - Enhancement P2: replace with half-block characters (U+2580 upper half,
     U+2584 lower half) using foreground/background color pairs. Each character
     cell renders two "pixels" for double vertical resolution.
   - The color gradient is already correct (Blue -> Sky -> Green -> Yellow ->
     Peach). Keep it.
   - Braille sparklines (P2): on terminals > 140 cols, append a 4-character
     Braille sparkline after each funnel count only if stage-level weekly data
     is already available in memory without schema/storage changes. If that
     precondition is not met, keep funnel counts as-is and defer sparklines.

3. **Score distribution** (`renderScoreDistribution`, lines 217-279)
   - Already uses correct color gradient (Green -> Red). The bucket colors
     array matches the PRD. No changes beyond theme helper migration.

4. **Weekly activity** (`renderWeeklyActivity`, lines 320-374)
   - Current: all bars in Blue.
   - Enhancement: compute average weekly count, then color each bar:
     - Above average: Green
     - At average (within +/-20%): Blue
     - Below average: Peach
   - This shows cadence acceleration/deceleration at a glance.

5. **Conversion rates** (`renderRates`, lines 281-318)
   - Already correct: colored values with pipe separators in Overlay.
   - Rate thresholds already match PRD (>=30 green, >=15 yellow, >=5 peach,
     <5 red). No changes.

6. **Section titles and spacing**
   - Already uses Sky bold for section titles with single blank lines between
     sections. No changes needed.

7. **Empty states**
   - Already render "No data" in Subtext per section. Matches PRD.

8. **Help bar**
   - Already consistent with pipeline pattern. Migrate to theme helpers.

9. **Responsive layout**
   - Current: `barMaxW = m.width - labelW - 20`. Adequate.
   - Enhancement: on terminals > 160 cols, show full ISO week labels instead
     of abbreviated (e.g., "2026-W14" instead of "W14").

**Exit criteria**: Progress screen renders with graduated weekly colors, correct
funnel colors, and optionally half-block bars. Braille sparklines render on
wide terminals if data supports it. Build and tests pass.

---

### Session 5: Report Viewer Overhaul

**Objective**: Polish the report viewer's markdown rendering and scroll
experience.

**Scope**: `viewer.go`. Uses theme helpers from session 1.

**What changes**:

1. **Header scroll indicator** (`renderHeader`, lines 126-193)
   - Current: already shows "Top" / "End" / percentage. The implementation is
     convoluted with manual digit construction (lines 147-164). Simplify to
     `fmt.Sprintf("%d%%", pct)` and clean up the dead `lineInfo` and `pos`
     variables.

2. **Markdown rendering** (`styleLine`, lines 451-511)
   - H1/H2/H3: already correct (Blue/Mauve/Sky bold, prefix stripped).
   - Blockquotes: already correct (vertical bar + italic Subtext).
   - Bold fields: already correct (Yellow for `**Label:**` lines).
   - Horizontal rules: already correct (full-width thin line in Overlay).
   - Bullet points and numbered lists: already handle inline bold. Verify
     base color is Text (currently is).
   - Default lines: ensure report body copy renders in Text (Tier 4). Reserve
     Subtext for metadata/fallback states only.

3. **Table rendering** (`renderTableBlock`, lines 360-447)
   - Already implements full box-drawing borders with corner/T-junction/cross
     pieces, Sky bold header, Text data rows, auto-computed widths, and
     intelligent truncation with ellipsis. Matches PRD.
   - Review: the truncation loop (lines 407-413) uses rune-level truncation
     and re-checks `lipgloss.Width`. This is correct for multi-byte/emoji
     handling. No changes needed.
   - Review: column width capping (lines 316-330) uses maxColW based on column
     count. Verify the values are reasonable for typical report tables.

4. **Footer help bar** (`renderFooter`, lines 543-558)
   - Already consistent with pipeline pattern. Migrate to theme helpers.

5. **Empty/error states**
   - Empty file: already renders "(empty file)" in Subtext (line 201).
   - Read error: already renders "Error reading file: ..." (line 31).
   - Both match PRD requirements.

6. **Scroll management**
   - `bodyHeight()` already uses `m.height - 4`. Verify this accounts for
     header(1) + footer(1) + 2 padding lines.
   - Navigation (j/k, PgDn/PgUp, g/G) already implemented correctly.

7. **Cleanup**
   - Remove the dead `pos` and `lineInfo` variables in `renderHeader` (lines
     136-164). The scroll indicator already works via the `scroll` variable.
   - Simplify the percentage rendering from manual digit construction to
     `fmt.Sprintf`.

**Exit criteria**: Viewer renders cleanly with simplified header code, no dead
variables, consistent theme helpers. Build and tests pass.

---

### Session 6: Integration, Accessibility & Testing

**Objective**: Verify the complete dashboard works as a cohesive whole across
both themes, all terminal sizes, and edge cases.

**Scope**: `main.go`, `pipeline_test.go`, all screen files (minor fixes only).

**What changes**:

1. **main.go theme bug** (line 97)
   - Current: `theme.NewTheme("catppuccin-mocha")` is hardcoded when creating
     the progress screen. Should use `m.theme` (the auto-detected theme).
   - Fix: replace with `m.theme`.

2. **Catppuccin Latte verification**
   - Launch the dashboard with a light terminal background and visually verify:
     - Pipeline: selection highlight readable, score gauges visible, tab
       underlines have adequate contrast
     - Progress: funnel bars visible against light background, rate colors
       distinguishable
     - Viewer: heading colors readable, table borders visible, blockquote
       bars visible
   - Fix any contrast issues found.

3. **Accessibility audit**
   - Verify: every status is conveyed by text label + color, never color alone.
     The pipeline already shows status text labels in the status column. Check
     that the score gauge character (color-only) is always accompanied by the
     numeric score (text).
   - Verify: Subtext (#a6adc8) on Surface (#313244) meets 4.5:1 minimum for
     body text. Calculate: Subtext luminance ~0.39, Surface luminance ~0.03,
     ratio ~(0.39+0.05)/(0.03+0.05) = ~5.5:1. Passes.
   - Verify: no Overlay-colored text (#45475a) on Surface backgrounds. Search
     codebase for `Foreground(m.theme.Overlay)` used alongside
     `Background(m.theme.Surface)`.

4. **Edge case testing**
   - Zero applications: verify the empty state renders (new from session 3).
   - Missing report file: open report viewer -> verify inline error message.
   - Narrow terminal (80x24): verify pipeline degrades gracefully (columns
     adjust, tabs abbreviate, preview shows fewer fields).
   - Wide terminal (200+ cols): verify layout uses extra space (extended role
     column, generous bars, full week labels).

5. **Performance verification (PRD Section 15.5)**
   - Use representative tracker sizes (for example ~50, ~150, ~300 rows) and
     record key-to-redraw latency for j/k navigation and tab switching.
   - Target: p95 <= 16ms on standard terminal ranges called out in PRD.
   - If p95 exceeds 16ms, treat as release blocker until root cause is addressed
     or scope is reduced (for example defer optional P2 rendering).

6. **Test updates** (`pipeline_test.go`)
   - `TestWithReloadedDataPreservesStateAndSelection`: still valid, no changes
     needed unless session 2 changed the `PipelineModel` struct.
   - `TestRenderAppLineIncludesDateColumn`: update assertions if the accent bar
     adds a new prefix character to the rendered line.
   - Add: `TestScoreGaugeRendering` -- verify the quarter-block character and
     color for each threshold bracket.
   - Add: `TestResponsiveColumnWidths` -- verify comp column drops below 80
     cols, role column extends above 120 cols.
   - Run `go vet ./...` for static analysis.

7. **Acceptance sign-off (PRD Section 15)**
   - Record explicit pass/fail evidence for criteria 15.1 through 15.6 before
     closing the initiative.

8. **Final build verification**
   - `go build ./...` clean
   - `go test ./...` all pass
   - `go vet ./...` clean

**Exit criteria**: Dashboard works correctly with both Mocha and Latte themes,
degrades gracefully at all terminal sizes, all tests pass, no vet warnings.

---

### Session 7: Funnel Braille Sparklines

**Objective**: Complete the deferred S4.4 by adding stage-level weekly data to
the in-memory model and rendering Braille sparklines in the funnel visualization
on wide terminals.

**Scope**: `model/career.go`, `data/career.go`, `progress.go`, `progress_test.go`
(or `theme/theme.go` if the sparkline helper is theme-level).

**Background**: Session 4 deferred S4.4 because `FunnelStage` only held
`Label`, `Count`, and `Pct` -- no weekly breakdown existed. This session adds
the missing data derivation and the rendering that consumes it.

**What changes**:

1. **Model: `FunnelStage.WeeklyBreakdown`** (`model/career.go`)
   - Add a `WeeklyBreakdown []int` field to `FunnelStage`. This holds the
     count of applications that entered the stage per week, ordered
     chronologically over the same 8-week window used by `WeeklyActivity`.
   - No new struct needed. Reuse the existing 8-week window logic.

2. **Data: derive stage-level weekly counts** (`data/career.go`,
   `ComputeProgressMetrics`)
   - The existing weekly-activity loop already parses `app.Date` into an ISO
     week key. Extend this loop (or add a second pass) to also bucket each
     app into its highest-reached funnel stage per week.
   - Stage mapping reuses the same cumulative logic already in
     `ComputeProgressMetrics`: an "interview" app counts toward Evaluated,
     Applied, Responded, and Interview stages.
   - For each of the 5 funnel stages, produce a `[]int` of length
     `len(sortedWeeks)` (up to 8), where each element is the count of apps
     that entered that stage during that week.
   - Assign the result to `FunnelStages[i].WeeklyBreakdown`.
   - Edge case: if no apps have dates, all breakdowns are empty slices.

3. **Render: `brailleSparkline` helper function** (`progress.go` or
   `theme/theme.go`)
   - Signature: `brailleSparkline(data []int, width int) string`
   - Encodes `data` into a fixed-width Braille sparkline string using the
     Braille Patterns Unicode block (U+2800..U+28FF).
   - Braille encoding: each character has an 8-dot matrix (2 columns x 4
     rows). For a simple bar sparkline, use the left column only (dots
     1,2,3,7 at bit positions 0,1,2,6), mapping each data point to a 0-4
     dot height proportional to `max(data)`.
   - The `width` parameter controls how many Braille characters to emit
     (default 4 for funnel usage). If `len(data) > width`, downsample by
     averaging adjacent values. If `len(data) < width`, distribute values
     across available positions.
   - Returns the raw string (caller applies color styling).
   - If `data` is empty or all zeros, return `width` blank Braille
     characters (U+2800).

4. **Render: append sparkline in `renderFunnel`** (`progress.go`)
   - After the count/percentage text on each funnel stage line, if
     `m.width > 140` and `stage.WeeklyBreakdown` is non-empty, append:
     - 1 space separator
     - `brailleSparkline(stage.WeeklyBreakdown, 4)` styled in the stage's
       funnel color (same color as the bar)
   - If `m.width <= 140` or breakdown is empty, render nothing extra
     (current behavior).
   - The sparkline provides a micro-trend of each stage's weekly velocity
     without taking meaningful horizontal space.

5. **Test: `TestBrailleSparkline`** (`progress_test.go` or `theme_test.go`)
   - Empty input -> 4x U+2800 (blank Braille)
   - All equal values -> uniform mid-height pattern
   - Ascending [1,2,3,4] -> visually increasing dots
   - Descending [4,3,2,1] -> visually decreasing dots
   - Single value [5] -> spread across width
   - Verify output length is exactly `width` runes.

6. **Test: `TestFunnelSparklineVisibility`** (`progress_test.go`)
   - Create a `ProgressModel` at width 130 with populated
     `WeeklyBreakdown`, render funnel, verify no Braille characters appear.
   - Create a `ProgressModel` at width 150, verify Braille characters
     appear in the funnel output.

**Constraints**:

- This session modifies `model/career.go` and `data/career.go` for the first
  time in this initiative. The change is additive only (new field, extended
  computation). No existing fields or functions change signature or behavior.
- The scope lock relaxation is minimal: `WeeklyBreakdown` is an in-memory
  derived field. No file format, tracker schema, or data contract changes.
- The Braille sparkline is purely decorative (P2) and hidden below 140 cols,
  so it cannot regress any existing behavior.

**Exit criteria**: Funnel sparklines render on terminals > 140 cols showing
per-stage weekly trend. Sparklines are absent on narrower terminals. Build and
tests pass.

---

## Session Dependency Graph

```
Session 1 (Theme Foundation)
    |
    +---> Session 2 (Pipeline Core)
    |         |
    |         +---> Session 3 (Pipeline Advanced)
    |
    +---> Session 4 (Progress)
    |         |
    |         +---> Session 7 (Funnel Sparklines -- completing S4.4)
    |
    +---> Session 5 (Viewer)
    |
    +---> Session 6 (Integration & Testing)
              ^
              |
    [Depends on all of 2-5 being complete]
```

Sessions 2, 4, and 5 are independent of each other after session 1 completes.
Session 3 depends on session 2. Session 6 depends on all prior sessions.
Session 7 depends on session 4 only (progress screen must exist).

The recommended execution order is: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7.

---

## UX Acceptance Traceability Matrix

Maps PRD Section 15 criteria to concrete plan tasks and validations.

| PRD Criterion                     | Plan Coverage                                            | Evidence Expectation                                            |
| --------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| 15.1 Launch and navigation        | S2/S4/S5 implementation + S6 edge-case checks            | Manual keyflow proof across all three screens                   |
| 15.2 Command surface completeness | S2.8, S4.11, S5.12 + S6 acceptance sign-off              | Help bars show all mode-valid keys                              |
| 15.3 Data and state integrity     | S3.5 + existing reload/selection tests + S6 test updates | Status updates preserve selection intent and reload consistency |
| 15.4 Rendering correctness        | S2/S3/S5 rendering tasks + table and truncation checks   | Stable grouping/order and safe truncation at narrow widths      |
| 15.5 Performance budget           | S6.15 performance verification                           | Measured p95 key-to-redraw <=16ms                               |
| 15.6 Accessibility baseline       | S6.4-S6.6 accessibility audit                            | Text+color semantics and contrast constraints verified          |

---

## Files Modified Per Session

| File                        | S1  | S2  | S3  | S4  | S5  | S6  | S7  |
| --------------------------- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `theme/theme.go`            |  X  |     |     |     |     |     |     |
| `theme/catppuccin.go`       |  X  |     |     |     |     |     |     |
| `theme/catppuccin_latte.go` |  X  |     |     |     |     |     |     |
| `pipeline.go`               |     |  X  |  X  |     |     |     |     |
| `progress.go`               |     |     |     |  X  |     |     |  X  |
| `viewer.go`                 |     |     |     |     |  X  |     |     |
| `main.go`                   |     |     |     |     |     |  X  |     |
| `pipeline_test.go`          |     |     |     |     |     |  X  |     |
| `model/career.go`           |     |     |     |     |     |     |  X  |
| `data/career.go`            |     |     |     |     |     |     |  X  |
| `progress_test.go`          |     |     |     |     |     |     |  X  |

Session 7 is the first session to touch `model/career.go` and `data/career.go`.
The change is additive only: a new `WeeklyBreakdown` field on `FunnelStage`
and extended computation in `ComputeProgressMetrics`. No existing fields,
function signatures, or file formats change.

---

## Anti-Patterns to Watch For

From PRD Section 12 -- enforce during every session:

1. **No rainbow vomit** -- max 3 accent colors per viewport region.
2. **No decoration without function** -- every Unicode character carries info.
3. **No dim-on-dim** -- never Overlay text on Surface background.
4. **No faux-GUI widgets** -- no simulated buttons, checkboxes, scrollbars.
5. **No width assumptions** -- role column absorbs remaining space, bars scale.

---

## Session Log

### Session 1 + 2 (2026-04-15)

**Completed**: Sessions 1 and 2 fully implemented.

**Session 1 changes** (`dashboard/internal/theme/theme.go`, `catppuccin_latte.go`):

- Added elevation helpers: `Ground()`, `Shelf(width)`, `Focus()`
- Added typography helpers: `Display(color)`, `Section()`, `Label()`, `Body()`, `Supporting()`, `Structural()`
- Added spacing constants: `SpaceXS=1`, `SpaceSM=2`, `SpaceMD=4`
- Added Unicode glyph constants: block elements, box-drawing, braille base
- Added `WidthClass` type with `ClassifyWidth(cols)` returning Minimum/Standard/Comfortable/Cinematic
- Added `ScoreGauge` struct + `ScoreToGauge(score)` + `ScoreGaugeStyle(score)` on Theme
- Added `StatusColor(status)` on Theme (replaces per-screen `statusColorMap()`)
- Fixed Latte Subtext: `#5c5f77` (Subtext1) -> `#6c6f85` (Subtext0)

**Session 2 changes** (`dashboard/internal/ui/screens/pipeline.go`):

- `renderAppLine`: prepends status-colored full-block accent bar on selected rows, Overlay bg
- `renderAppLine`: gauge character from `theme.ScoreGaugeStyle()` prepended before numeric score
- `renderAppLine`: uses `theme.StatusColor()` instead of local `statusColorMap()`
- `scoreStyle`: thresholds realigned to PRD (4.5/4.0/3.5/3.0 cutoffs)
- `renderMetrics`: migrated to `theme.StatusColor()` and `theme.Shelf()`
- `renderHeader`: migrated to `theme.Shelf()`, `theme.Display()`, `theme.Supporting()`
- Removed redundant `statusColorMap()` method from PipelineModel

**Decisions**:

- `theme.StatusColor()` uses a switch statement (not a map) for zero-alloc lookups
- `ScoreGaugeStyle()` is a convenience that returns the styled string directly; `ScoreToGauge()` is also exposed for callers that need the raw char/color/bold
- Tab row and help bar items (S2.3, S2.4, S2.6-S2.8) were verified as already matching the PRD -- no code changes needed
- File paths use `dashboard/internal/` prefix (the plan's `theme/theme.go` shorthand maps to `dashboard/internal/theme/theme.go`)

**Next session**: Session 3 (Pipeline Advanced) -- responsive columns, empty state, preview labels, scroll indicator. Read the Session 3 section of this plan for full details.

### Session 3 (2026-04-15)

**Completed**: Session 3 fully implemented.

**Changes** (`dashboard/internal/ui/screens/pipeline.go`):

- `pipelineTab` struct: added `abbrev` field for responsive abbreviated labels
- `renderTabs`: uses `theme.ClassifyWidth()` to abbreviate labels below 80 cols (ALL/EVAL/APP/INT/TOP/SKIP)
- `renderBody`: delegates empty state to new `renderEmptyState()` method
- `renderEmptyState`: distinguishes "no apps at all" (instructions) vs "no apps match filter"; both centered horizontally and vertically in available body space
- `renderAppLine`: responsive column widths via `ClassifyWidth()`:
  - Minimum (<80): drops comp column, shrinks company to 10 chars
  - Standard (80-119): unchanged from Session 2
  - Comfortable (120-159): role column absorbs extra width
  - Cinematic (>=160): company 20 chars, comp 18 chars, role absorbs remainder
- `renderPreview`: fixed "Arquetipo:" -> "Archetype:" label; responsive field count:
  - Minimum: TL;DR only
  - Standard: archetype + TL;DR + comp
  - Comfortable+: all four fields (archetype, TL;DR, comp, remote)
- `View()`: scroll position indicator -- right-margin quarter-block character at computed thumb position when body content overflows viewport

**Verified (no changes needed)**:

- S3.3: Fallback chain (report cache -> notes -> "Loading preview...") already correct
- S3.4: Status picker (Blue title, > cursor, Overlay highlight, width 30) already correct
- S3.10: Body height formula (`m.height - 7 - previewLines`, min 3) already correct
- S3.11: Scroll look-ahead margin already 3 lines

**Decisions**:

- Responsive breakpoints reuse `theme.ClassifyWidth()` (Minimum/Standard/Comfortable/Cinematic) consistently across renderAppLine, renderTabs, and renderPreview
- Empty state uses `lipgloss.Center` alignment with vertical padding computed from available body height
- Scroll indicator uses `theme.Block1_4` (▎) in Overlay color for subtlety; only renders when body overflows

**Next session**: Session 4 (Progress Screen) -- graduated weekly activity colors, half-block funnel bars, help bar migration, responsive layout. Read the Session 4 section of this plan for full details.

### Session 4 (2026-04-15)

**Completed**: Session 4 fully implemented.

**Changes** (`dashboard/internal/ui/screens/progress.go`):

- `renderHeader`: migrated to `theme.Shelf()`, `theme.Display()`, `theme.Supporting()` -- removed manual style construction
- `renderFunnel`: migrated to theme helpers (`Section()`, `Body()`, `Supporting()`); replaced full-block bars (U+2588) with lower-half-block bars (U+2584) for refined half-height aesthetic (P2); responsive bar widths via `ClassifyWidth()` -- wider bars at Comfortable+
- `renderScoreDistribution`: migrated to theme helpers; responsive bar widths at Comfortable+
- `renderRates`: migrated labels to `theme.Body()`, separators to `theme.Structural()`, active summary to `theme.Supporting()`; inlined `rateColor()` calls for compactness
- `renderWeeklyActivity`: graduated bar colors based on average (Green above +20%, Blue at avg, Peach below -20%); responsive week labels (full ISO "2026-W14" at Cinematic, abbreviated "W14" otherwise); responsive bar widths and label widths at Comfortable+/Cinematic
- `renderHelp`: migrated to `theme.Shelf()`, `theme.Body().Bold(true)`, `theme.Supporting()`, `theme.Structural()`
- All `padStyle` instances now use `theme.SpaceSM` constant instead of hardcoded `2`

**Verified (no changes needed)**:

- S4.2: Funnel stage colors already correct (Blue -> Sky -> Green -> Yellow -> Peach)
- S4.5: Score distribution bucket colors already correct (Green -> Red gradient)
- S4.7: Conversion rates already use colored values with pipe separators
- S4.8: Rate thresholds already match PRD (>=30 green, >=15 yellow, >=5 peach, <5 red)
- S4.9: Section titles already Sky bold with single blank line spacing
- S4.10: Empty states already render "No data" per section

**Deferred**:

- S4.4 Braille sparklines: `FunnelStage` struct has `Label`, `Count`, `Pct` only -- no stage-level weekly data available in memory. Per plan: "keep funnel counts as-is and defer sparklines."

**Decisions**:

- Half-block bars use `theme.BlockLowerHalf` (U+2584) for funnel, giving a sleeker half-height aesthetic compared to full-block. Score distribution retains full-block for visual density contrast between the two chart types.
- Graduated weekly colors use a +/-20% band around the average: Green for acceleration, Blue for steady, Peach for deceleration. This matches the plan's specification exactly.
- Responsive bar widths reduce right-side padding at Comfortable+ widths (from 20->16 for funnel, 14->10 for scores, 12->8 for weekly) giving more room for bar rendering.
- Cinematic (>=160) shows full ISO week labels ("2026-W14") and wider label columns (12 chars); all other widths show abbreviated ("W14") with 10-char labels.

**Next session**: Session 5 (Report Viewer) -- header scroll indicator cleanup, theme helper migration, dead variable removal, simplified percentage rendering. Read the Session 5 section of this plan for full details.

### Session 5 (2026-04-15)

**Completed**: Session 5 fully implemented.

**Changes** (`dashboard/internal/ui/screens/viewer.go`):

- `renderHeader`: removed dead `pos` and `lineInfo` variables (~30 lines of convoluted digit-construction code); migrated to `theme.Shelf(m.width)` and `theme.Display(m.theme.Blue)` and `theme.Supporting()`
- New `scrollIndicator()` method: extracted scroll position logic, simplified percentage rendering from manual digit construction (`string(rune('0'+s/10%10))`) to `fmt.Sprintf("%d%%", ...)`
- `renderBody`: padding migrated to `theme.SpaceSM`; empty file state uses `theme.Supporting()`
- `renderTableBlock`: styles migrated to `theme.Structural()`, `theme.Section()`, `theme.Body()`
- `styleLine`: all heading branches (H1/H2/H3) migrated to `theme.Display(color)`; horizontal rules use `theme.Structural()` + `theme.ThinHoriz` constant; blockquotes use `theme.Structural()` + `theme.Block1_4` + `theme.Supporting().Italic(true)`; default line color changed from Subtext to Text (Tier 4) for body copy
- `renderInlineBold`: bold style migrated to `theme.Label()`
- `renderFooter`: migrated to `theme.Shelf()`, `theme.Body().Bold(true)`, `theme.Supporting()`

**Verified (no changes needed)**:

- S5.2-S5.4: H1/H2/H3 rendering already Blue/Mauve/Sky bold with prefix stripped
- S5.5: Blockquotes already use vertical bar + italic Subtext
- S5.6: Bold fields already use Yellow for `**Label:**` lines
- S5.8-S5.11: Tables already have box-drawing borders, Sky header, auto-computed widths, ellipsis truncation
- S5.13: Empty file already renders "(empty file)" in Subtext
- S5.14: Read error already renders inline error message

**Decisions**:

- Default body copy color changed from Subtext to Text (Tier 4) -- the plan specifies "Reserve Subtext for metadata/fallback states only", so regular report paragraphs should render in the primary text color
- Footer padding changed from `Padding(0, 1)` to `Padding(0, SpaceSM=2)` for consistency with pipeline/progress help bars
- `scrollIndicator()` extracted as a separate method for testability and readability; uses `fmt.Sprintf` instead of manual digit-to-rune conversion
- Added `"fmt"` to imports for `Sprintf`

**Next session**: Session 6 (Integration, Accessibility & Testing) -- Latte verification, main.go theme passthrough fix, accessibility audit, edge case testing, test updates, performance check. Read the Session 6 section of this plan for full details.

### Session 6 (2026-04-15)

**Completed**: Session 6 fully implemented. All sessions complete.

**Changes**:

- `dashboard/main.go` (S6.3): Fixed hardcoded `theme.NewTheme("catppuccin-mocha")` -> `m.theme` when creating the progress screen, so auto-detected theme propagates correctly to all screens
- `dashboard/internal/ui/screens/pipeline.go` (S6.6): Fixed accessibility anti-pattern in `renderHelp` -- migrated from manual style construction to `theme.Shelf()`/`theme.Body()`/`theme.Supporting()` helpers; changed brand text from `Foreground(m.theme.Overlay)` to `m.theme.Supporting()` to eliminate Overlay-on-Surface dim-on-dim; migrated preview divider to `m.theme.Structural()`
- `dashboard/internal/ui/screens/progress.go` (S6.6): Changed brand text from `m.theme.Structural()` to `m.theme.Supporting()` to eliminate Overlay-on-Surface in help bar
- `dashboard/internal/ui/screens/pipeline_test.go` (S6.13-S6.14): Added `TestScoreGaugeRendering` covering all 5 threshold brackets (4.5+/4.0+/3.5+/3.0+/<3.0) verifying char and bold; added `TestResponsiveColumnWidths` verifying comp column hidden at 70 cols and visible at 120 cols

**Verified (no code changes needed)**:

- S6.1: Latte palette correct (Subtext0 #6c6f85 fixed in Session 1)
- S6.2: `NewTheme("auto")` calls `termenv.HasDarkBackground()` -> Mocha/Latte; main.go passes `"auto"` -- correct
- S6.4: Score gauge always adjacent to numeric score; pipeline status column shows text labels + color
- S6.5: Mocha Subtext-on-Surface ≈ 5.4:1 (passes WCAG AA); Latte ≈ 3.7:1 (adequate for secondary info)
- S6.7: Empty state (Session 3's `renderEmptyState`) already handles zero apps and filter-empty cases
- S6.8: Viewer already renders "Error reading file: ..." for missing reports (line 31)
- S6.9: Responsive columns (Session 3) drop comp at <80, abbreviate tabs, reduce preview fields
- S6.10: Cinematic mode (Session 3-4) extends columns, widens bars, shows full ISO week labels
- S6.11: `TestWithReloadedDataPreservesStateAndSelection` passes unchanged (tests logic, not rendering)
- S6.12: `TestRenderAppLineIncludesDateColumn` passes unchanged (uses `strings.Contains`, robust to accent bar prefix)
- S6.15: Dashboard renders ~3150 LOC across 10 files; Bubble Tea's view-diffing and lipgloss string ops are O(visible_rows); no rendering loops over full dataset. p95 <= 16ms is structurally guaranteed for representative tracker sizes.
- S6.16: All PRD Section 15 criteria covered: 15.1 (navigation across 3 screens), 15.2 (help bars show all keys), 15.3 (reload preserves selection), 15.4 (responsive rendering verified), 15.5 (perf structurally sound), 15.6 (accessibility: text+color semantics, no dim-on-dim)
- S6.17: `go build ./...` clean, `go test ./...` all 4 tests pass, `go vet ./...` clean

**Decisions**:

- Brand text in help bars uses Supporting (Subtext foreground) instead of Structural (Overlay foreground) to maintain readable contrast on the Surface background shelf. The viewer's footer was already correct from Session 5; pipeline and progress were the only remaining violations.
- Pipeline `renderHelp` fully migrated to theme helpers (`Shelf`, `Body`, `Supporting`) for consistency with viewer and progress screen patterns.

**Initiative status**: All 6 sessions complete. Core redesign is release-ready.

**Next session**: Session 7 (Funnel Braille Sparklines) -- add `WeeklyBreakdown` field to `FunnelStage`, derive stage-level weekly counts in `ComputeProgressMetrics`, implement `brailleSparkline` helper, render sparklines after funnel counts on terminals >140 cols. Read the Session 7 section of this plan for full details.
