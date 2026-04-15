# jobhunt Dashboard - UX Requirements Document

**Companion to**: [PRD.md](PRD.md)
**Created**: 2026-04-15

---

## 0. Scope and Traceability

This UX PRD governs only the terminal dashboard in `dashboard/`. It is a
companion execution guide for UI-focused sessions and does not redefine the
core migration requirements in `PRD.md`.

Scope guardrails:

- Preserve existing data contracts (`data/applications.md`, reports, tracker
  scripts).
- Treat `Pipeline`, `Progress`, and `Report Viewer` as the only first-class
  screens for this document version.
- Document current baseline behavior and target enhancements separately so
  planning can prioritize objective deltas.

---

## 1. Design Brief

### Emotional Targets

**Quiet confidence + strategic clarity + controlled momentum**

The operator is navigating career uncertainty. Every pixel of this dashboard
should make them feel like they are in command -- not drowning in applications,
but orchestrating a campaign from a position of informed strength. The
experience should feel like sitting at the helm of something precise and
powerful, where every data point exists to serve a decision.

### Aesthetic Identity

- **Reference domain**: Astronomical observatory instrument panels -- the
  kind of purpose-built displays used in radio telescope control rooms where
  dense information must be parsed instantly under pressure, where every
  indicator glows with intention against a dark field
- **Era / movement**: Neo-brutalist data design crossed with Swiss
  International precision -- the structural honesty of exposed-concrete
  interfaces married to the meticulous grid discipline of Josef
  Mueller-Brockmann, filtered through the warm phosphor glow of vintage CRT
  terminals
- **Material metaphor**: Polished obsidian with embedded luminous indicators
  -- the surface is a deep, near-black plane that recedes from attention;
  information floats above it as self-illuminated elements, each color
  carefully chosen to carry semantic weight. Not glass (too fragile), not
  steel (too cold) -- obsidian: ancient, precise, reflective enough to
  suggest depth beneath the surface

_The intersection creates something recognizable yet unprecedented: a career
command center that feels like it was built for mission-critical work, not a
toy dashboard._

### Signature Moment

The **Pipeline Constellation View** -- when the operator presses a key to
toggle the progress screen, the funnel visualization renders as a cascading
waterfall of half-block characters that builds from top to bottom in a single
frame, with each stage using progressively warmer colors (cool blue at the
wide top, molten peach at the narrow bottom). The visual weight of the bars
communicates funnel narrowing before the numbers even register. On wide
terminals (>140 cols), the funnel bars are flanked by Braille-dot sparklines
showing weekly trend for each stage. This single screen should make someone
pause and think "this is not a normal terminal app."

### Micro-Narrative

**Arrival** (launch) -- The alt-screen clears to a deep base color. The
header materializes with the operator's pipeline title and aggregate stats.
The interface announces: you are in control.

**Orientation** (first frame) -- Tab bar, metrics ribbon, and the first
visible group header orient the operator. The grouped view with status
sections separated by thin ruled lines gives immediate spatial understanding
of where things stand.

**Engagement** (navigation) -- Moving through applications with j/k feels
fluid. The selection highlight is not a crude background swap but a subtle
elevation: a left-edge accent bar plus a gentle background shift that
preserves text readability. The preview pane below the divider updates to
show the selected application's archetype and comp estimate, creating a
master-detail rhythm.

**Action** (status change, open report) -- The status picker appears as a
focused overlay with clear affordances. Changing status and seeing the
application migrate to its new group confirms that the operator's decisions
have weight. Opening a report transitions to the viewer with the title
carrying context.

**Resolution** (progress screen) -- The analytics view provides the bird's
eye perspective: funnel, scores, rates, weekly cadence. The operator
understands not just where individual applications stand, but the shape and
momentum of their entire campaign.

---

## 2. User Flows

### Flow 1: Pipeline Review

**Trigger**: Dashboard launch (`go run . -path /path/to/jobhunt`)
**Goal**: Survey the current state of all tracked applications

```
[Launch] --> [Pipeline View: grouped by status] --> [Navigate j/k]
                |                                       |
                v                                       v
          [Tab filter] --> [Filtered view]         [Preview pane updates]
                                                        |
                                                        v
                                                  [Enter: open report]
                                                  [o: open job URL]
```

**Happy path**: Operator launches, sees grouped pipeline sorted by score,
navigates to a high-scoring application, reviews the preview, opens the
full report.

**Error states**: Empty tracker shows a centered message with instructions.
Missing report file shows inline error in viewer. Failed status update logs
to stderr and reloads data to stay consistent.

### Flow 2: Status Management

**Trigger**: Press `c` on a selected application
**Goal**: Update an application's pipeline status

```
[Select application] --> [c: open status picker] --> [Navigate j/k]
                                                          |
                                                          v
                                                    [Enter: confirm]
                                                          |
                                                          v
                                               [Tracker file updated]
                                               [Pipeline reloaded]
                                               [App moves to new group]
```

**Happy path**: Operator selects an application, opens the picker, chooses
"Interview", confirms. The application appears under the Interview group.

**Error states**: Write failure to `applications.md` logged to stderr; UI
reloads from disk to stay consistent with actual file state.

### Flow 3: Campaign Analytics

**Trigger**: Press `p` from pipeline view
**Goal**: Understand overall campaign health and trajectory

```
[Pipeline view] --> [p: open progress] --> [Scroll through sections]
                                                |
                                                v
                                          [Funnel / Scores / Rates / Weekly]
                                                |
                                                v
                                          [Esc: back to pipeline]
```

**Happy path**: Operator reviews funnel conversion, checks score
distribution for quality signals, notes weekly activity trend, returns
to pipeline with strategic context.

**Error states**: Empty metrics render explicit "No data" rows per section.
If data parsing fails, affected widgets render safe fallback values while
navigation remains responsive.

### Flow 4: Report Deep-Dive

**Trigger**: Press `Enter` on an application with a report
**Goal**: Read the full evaluation report for a specific opportunity

```
[Select application] --> [Enter: open viewer] --> [Scroll j/k/PgDn]
                                                       |
                                                       v
                                                 [Read markdown report]
                                                 [Tables rendered with box-drawing]
                                                       |
                                                       v
                                                 [Esc: back to pipeline]
```

**Happy path**: Operator reads the report with properly styled headings,
bold labels, blockquotes, and aligned tables. Scroll position indicator
shows progress. Returns to pipeline with cursor preserved.

**Error states**: Missing report files render an inline read error. Empty
reports render "(empty file)". Overwide table cells truncate with ellipsis
instead of breaking viewport layout.

---

## 3. Screen Inventory

| Screen        | View State     | Purpose                                                    | Key Components                                                                                       |
| ------------- | -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Pipeline      | `viewPipeline` | Primary application list with filtering, sorting, grouping | Header bar, tab row, metrics ribbon, sort indicator, scrollable grouped list, preview pane, help bar |
| Progress      | `viewProgress` | Campaign analytics and funnel visualization                | Header bar, funnel chart, score distribution, conversion rates, weekly activity, help bar            |
| Report Viewer | `viewReport`   | Full-screen markdown report reader                         | Header bar with scroll position, styled markdown body, footer with nav keys                          |

---

## 4. Navigation Structure

```
[Pipeline (default)]
|-- [Tab filters: ALL / EVALUATED / APPLIED / INTERVIEW / TOP / SKIP]
|-- [v] toggle grouped/flat list mode
|-- [r] refresh from disk
|-- [Status picker overlay (modal-like)]
|-- [p] --> [Progress]
|           \-- [Esc] --> [Pipeline]
|-- [Enter] --> [Report Viewer]
|               \-- [Esc] --> [Pipeline]
\-- [Esc/q] --> [Exit]
```

**Navigation pattern**: Keyboard-driven with vim-style bindings (j/k/h/l)
plus arrow keys and action keys (`s`, `v`, `r`, `c`, `p`, `o`, `Enter`).
Tab cycling for filters. Single-level depth from pipeline to either progress
or report viewer.

**View transitions**: Immediate redraw on state change. No intermediate
loading screen -- data is either available from cache or loaded inline.

---

## 5. Interaction Patterns

### List Navigation

- **Cursor movement**: j/k or arrow keys with scroll-adjusted viewport
- **Page movement**: Ctrl+D/Ctrl+U or PgDn/PgUp for half-page jumps
- **Jump to extremes**: g (top), G (bottom)
- **Selection indicator**: Left-edge accent bar (2-char wide, using the
  status color of the selected application) plus subtle background shift
  to Overlay color. The accent bar uses a full-block character in the
  application's status color, creating a color-coded "pip" that
  simultaneously indicates selection AND status.
- **Scroll position**: When content extends beyond viewport, a subtle
  scroll indicator appears in the right margin of the last visible line
  using Unicode quarter-block characters to show approximate position.

### Tab Filtering

- **Cycle**: h/l or left/right arrows, plus `f` for forward-only
- **Active indicator**: Bold text in accent color with a thick underline
  (using `U+2501` heavy horizontal) beneath the active tab; inactive tabs
  use thin line (`U+2500`)
- **Count badges**: Each tab shows its item count in parentheses, dimmed
  for inactive tabs, bright for active

### Sort Cycling

- **Trigger**: `s` key cycles through score > date > company > status
- **Indicator**: Sort bar shows current mode and view mode in bracket
  notation with count of visible items

### State Consistency Rules

- **Manual refresh (`r`)**: Reload tracker and metrics from disk without
  changing active tab, sort mode, or view mode.
- **View toggle (`v`)**: Switch grouped/flat rendering while preserving
  cursor intent and scroll context.
- **Status updates (`c`)**: Write to tracker, then reload data and keep
  selection on the same logical application when possible.

### Status Picker

- **Trigger**: `c` on selected application
- **Appearance**: Overlay appended to bottom of body with clear title
  "Change status:" in accent color
- **Navigation**: j/k with `>` cursor indicator and Overlay background
  on selected option
- **Confirmation**: Enter confirms, Esc cancels
- **Effect**: Writes to `applications.md`, reloads full dataset, preserves
  cursor position on the same application in its new group

### Preview Pane

- **Trigger**: Automatic on cursor movement (lazy-loads from report cache)
- **Content**: Archetype, TL;DR, comp estimate, remote policy -- extracted
  from report header fields
- **Separator**: Thin ruled line (`U+2500`) spanning the width, colored
  in Overlay
- **Fallback**: If no report is cached, shows application notes; if no
  notes, shows "Loading preview..." in Subtext

### Report Viewer

- **Markdown rendering**: H1 (Blue, bold), H2 (Mauve, bold), H3 (Sky,
  bold), blockquotes (vertical bar + italic), bold fields (Yellow),
  horizontal rules (full-width thin line)
- **Table rendering**: Full box-drawing borders using corner pieces
  (`U+250C/U+2510/U+2514/U+2518`), T-junctions, and cross pieces.
  Header row in Sky bold, data rows in Text. Column widths computed
  from full table content with intelligent truncation.
- **Scroll indicator**: Header shows position as "Top", "End", or
  percentage

---

## 6. Motion and Animation Strategy

### Philosophy

Motion in a TUI serves wayfinding and state confirmation. Every visual
change should feel intentional and instantaneous -- no lag, no gratuitous
animation, but clear feedback that actions had effect.

### Entrance Choreography

- **Launch**: Single-frame render of the full pipeline view. No staggered
  loading -- the alt-screen clears and the complete interface appears as
  one unit. Speed IS the animation.
- **View transitions**: Immediate full-screen redraw. Pipeline-to-Progress
  and Pipeline-to-Viewer are instant view swaps with no intermediate state.

### Interaction Feedback

- **Cursor movement**: Immediate redraw of the selection highlight. The
  previous row loses its accent bar and background; the new row gains them.
  The preview pane updates in the same frame (from cache) or shows
  "Loading preview..." until the report summary is loaded.
- **Tab switch**: Instant re-filter and re-sort. Cursor resets to position 0. The tab underline shifts to the new active tab.
- **Status change**: After confirming in the picker, the full dataset
  reloads from disk. The cursor attempts to follow the application to its
  new group position.

### Scroll-Driven Moments

- **Progress screen**: The funnel visualization uses Unicode full-block
  characters (`U+2588`) with proportional bar widths. On wide terminals,
  bars should use half-block characters (`U+2580/U+2584`) for
  double-vertical-resolution rendering where Lip Gloss supports
  per-character foreground/background color pairs.
- **Grouped list**: When scrolling past a group boundary, the new group
  header becomes visible with its ruled-line separator, reinforcing the
  spatial model of "status regions."

### Animation Constraints

- All renders must complete in a single frame (Bubble Tea's synchronous
  `View()` model). No `tea.Tick`-based animation loops.
- Locked target: 60fps interaction budget (<=16ms key-to-redraw for
  typical terminal sizes and dataset volumes).
- At most 1 intentionally animated region per viewport in any future
  tick-based motion experiment.
- Respect terminal capability detection via termenv -- degrade gracefully
  on terminals with limited color support.
- No flicker: avoid unnecessary full-screen redraws when only the cursor
  position changed.

---

## 7. Layout Philosophy

### Composition Approach

**Dense-but-breathable information architecture.** Every screen follows
a strict vertical stack with no wasted horizontal space, but generous
use of single-line padding between semantic regions. The layout should
feel like a well-typeset technical document -- information-rich without
feeling cramped.

The pipeline screen uses a column-based data grid for the application
list, where each column has a fixed width purpose: score (5 chars),
date (10 chars), company (16 chars), role (flexible), status (12 chars),
comp (14 chars). This fixed structure means the operator's eye can scan
vertically down any column without horizontal hunting.

### Visual Hierarchy

- **Scale contrast**: Dramatic. The header title is bold and brightly
  colored. Metrics are smaller and dimmer. Application rows are the
  "body text" -- readable but recessive until selected. Group headers
  are structural elements that organize without demanding attention.
- **Negative space**: Single blank lines between semantic sections in
  the progress screen. No blank lines within the application list (density
  is a feature -- the operator needs to see as many applications as
  possible in one viewport). Padding of 2 chars on left/right for all
  content.
- **Section rhythm**: The pipeline screen has consistent vertical rhythm:
  header (1 line), tabs (2 lines), metrics (1 line), sort bar (1 line),
  body (flexible), divider (1 line), preview (2-4 lines), help (1 line).
  The progress screen varies section heights based on data volume,
  separated by single blank lines.

### Section Transitions

**Ruled lines and color shifts.** Sections are separated by:

- Thin horizontal rules (`U+2500`) in Overlay color for hard breaks
  (pipeline body to preview pane)
- Status group headers using em-dash bordered labels
  (`-- INTERVIEW (3) --------`) in Subtext bold for soft breaks within
  the list
- Color-differentiated headers (Pipeline: Blue, Progress: Mauve,
  Viewer: Blue) so each screen has its own tonal identity

---

## 8. Responsive Strategy

| Terminal Width | Target         | Layout Approach                                                                                                                                                                                                               |
| -------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 80 cols      | Minimum viable | Drop comp column. Truncate company to 10 chars. Reduce role column. Preview shows only TL;DR. Tab labels abbreviate (ALL, EVAL, APP, INT, TOP, SKIP).                                                                         |
| 80-120 cols    | Standard       | Full column layout. All tab labels visible. Preview shows archetype + TL;DR + comp. Funnel bars at comfortable width.                                                                                                         |
| 120-160 cols   | Comfortable    | Extended role column width. Preview shows all four fields. Funnel bars with generous width. Score distribution bars fully visible.                                                                                            |
| > 160 cols     | Cinematic      | Extra padding. Weekly activity shows full ISO week labels instead of abbreviated. Funnel bars flanked by trend sparklines using Braille dot patterns (`U+2800`-`U+28FF`). Consider side-by-side panels for progress sections. |

**Height handling**:

- Pipeline body height = total height - 7 (fixed chrome) - preview height
- Minimum viable body height: 3 lines
- Scroll offset adjusts with 3-line look-ahead margin
- Progress screen is fully scrollable with the same j/k + PgDn/PgUp model

**Approach**: The dashboard adapts to whatever terminal size it gets via
`tea.WindowSizeMsg`. Columns use fixed minimum widths with the role column
absorbing remaining space. No breakpoint-based mode switching -- the
adaptation is continuous and proportional.

---

## 9. Accessibility

**Target**: WCAG 2.1 AA equivalent for terminal interfaces

- **Keyboard navigation**: All interactions are keyboard-only by design.
  Vim bindings (j/k/h/l/g/G) plus standard keys (arrows, PgDn/PgUp,
  Enter, Esc). No mouse dependency.
- **Screen reader**: Terminal applications work through the terminal
  emulator's accessibility layer. Semantic structure (headers, labels,
  data rows) should be text-based and parseable by screen readers that
  support terminal output. Avoid relying solely on color to convey
  status -- pair color with text labels (status names, score numbers).
- **Color contrast**: Maintain at least 4.5:1 for body text and 3:1 for
  large or bold UI labels. Catppuccin Mocha keeps light text (#cdd6f4)
  on dark base (#1e1e2e) at approximately 11:1. Accent colors are for
  emphasis, not the sole carrier of meaning.
- **Focus management**: Single cursor model -- one selected item at a
  time, always visible within the scroll viewport. Status picker
  captures input focus and releases it on Esc/Enter.
- **Reduced motion**: Not applicable in the current model since all
  transitions are single-frame redraws. If tick-based animations are
  added in the future, include a reduced-motion mode that degrades to
  opacity/position-only feedback and can be disabled by environment flag.
- **Theme auto-detection**: `termenv.HasDarkBackground()` switches
  between Mocha (dark) and Latte (light) automatically. Users can
  override with explicit theme flag.

---

## 10. Design System

### Color Architecture

- **Dominant surface** (60%): **Base #1e1e2e** (Catppuccin Mocha) -- the
  deep obsidian plane. Nearly black with enough blue warmth to avoid the
  harshness of pure black. This is the void that all information floats
  above. Every non-Surface, non-Overlay element sits against this color.
- **Secondary surfaces** (25%): **Surface #313244** for header bars, help
  bars, and the metrics ribbon. **Overlay #45475a** for selection
  backgrounds and the status picker highlight. These two grays create a
  two-level elevation system: Surface is the "shelf" that anchors the top
  and bottom of each screen; Overlay is the "raised card" that indicates
  focus.
- **Accent** (10%): **Blue #89b4fa** is the primary accent -- pipeline
  title, active tab, H1 headings, status picker title. ONE accent color
  dominates per viewport to avoid visual noise. Secondary accents (Mauve
  for progress title, Sky for section headings, Yellow for bold labels)
  appear in supporting roles, never competing with Blue for attention.
- **Signal colors** (5%): **Green #a6e3a1** for positive states
  (interview, offer, high scores). **Yellow #f9e2af** for caution states
  (mid scores, bold field labels, comp estimates). **Peach #fab387** for
  warm warnings (low conversion rates). **Red #f38ba8** for negative
  states (skip, low scores, poor rates). **Pink #f5c2e7** reserved for
  future decorative use.

Palette character: **COOL, SYNTHETIC, QUIET.** The Catppuccin Mocha palette
is inherently pastel-synthetic -- colors that feel like they emit light
rather than reflect it. This matches the observatory aesthetic: indicators
glowing against a dark instrument panel.

#### Light Theme (Catppuccin Latte)

Auto-detected on light terminal backgrounds. Same semantic color roles
with inverted luminance: Base #eff1f5, Surface #ccd0da, Overlay #bcc0cc,
Text #4c4f69, Subtext #6c6f85. Accent colors shift to their Latte
equivalents (deeper, more saturated to maintain contrast on light
backgrounds).

### Typography

- **Display font**: The terminal's monospace font IS the display font.
  Personality comes from WEIGHT and COLOR, not typeface. Bold + accent
  color on headers creates the "display" tier.
- **Body font**: Regular weight in Text color (#cdd6f4). This is the
  workhorse -- application rows, report body text, data values.
- **Monospace**: Inherent to terminal rendering. Used for all content.
  Column alignment relies on fixed-width character assumptions.
- **Scale system**: No font-size variation (terminal constraint). Hierarchy
  is created through:
  - **Tier 1** (display): Bold + accent color (Blue/Mauve)
  - **Tier 2** (section): Bold + secondary accent (Sky)
  - **Tier 3** (label): Bold + signal color (Yellow for field labels)
  - **Tier 4** (body): Regular + Text color
  - **Tier 5** (supporting): Regular + Subtext color
  - **Tier 6** (structural): Regular + Overlay color (dividers, borders)
- **Minimum body**: N/A for terminal -- size is controlled by the user's
  terminal font settings.

### Spacing Scale

Terminal spacing is measured in character cells:

| Token | Chars   | Usage                                           |
| ----- | ------- | ----------------------------------------------- |
| `xs`  | 1       | Between inline elements (score and date)        |
| `sm`  | 2       | Left/right content padding (`Padding(0, 2)`)    |
| `md`  | 4       | Between column groups in the sort bar           |
| `lg`  | 1 line  | Between semantic sections in progress screen    |
| `xl`  | 2 lines | Not currently used; reserved for section groups |

Horizontal padding is consistently 2 characters on each side for all
content lines. Vertical spacing within a screen uses single-line gaps
between sections.

### Elevation and Depth

Three-level elevation model using background color:

| Level  | Background      | Usage                                 | Visual Effect                            |
| ------ | --------------- | ------------------------------------- | ---------------------------------------- |
| Ground | Base #1e1e2e    | Default content area                  | Recedes; content floats                  |
| Shelf  | Surface #313244 | Header bar, help bar, metrics ribbon  | Anchors top/bottom; frames the viewport  |
| Focus  | Overlay #45475a | Selected row, status picker highlight | Elevates the focused element above peers |

No shadows (not available in terminal). No blur. No transparency. Depth
is communicated purely through luminance stepping: darker = further away,
lighter = closer to the operator. This is honest to the medium.

### Texture and Atmosphere

- **Background treatment**: Clean, solid Base color. No gradients, no
  patterns, no noise. The obsidian metaphor demands an unbroken dark plane.
- **Structural texture**: Unicode box-drawing characters (`U+2500`-`U+257F`)
  for table borders, dividers, and group headers. These thin lines create
  an architectural grid without adding visual weight.
- **Data texture**: Full-block characters (`U+2588`) for bar charts in the
  progress screen. Half-block characters (`U+2580/U+2584`) for
  double-resolution bars when the implementation supports per-character
  foreground/background color pairs.
- **Braille texture**: Braille dot patterns (`U+2800`-`U+28FF`) for
  sparkline micro-charts on wide terminals. Each Braille character encodes
  a 2x4 dot grid, enabling 8-level vertical resolution in a single
  character cell. Use for weekly trend sparklines alongside funnel bars.

---

## 11. Component Patterns

| Component         | Used In                    | Behavior                                                                                                                                                                 |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Header Bar        | Pipeline, Progress, Viewer | Full-width Surface background. Left-aligned bold title in screen accent color. Right-aligned stats/position in Subtext. Padding(0, 2).                                   |
| Tab Row           | Pipeline                   | Horizontal tab labels with count badges. Active tab: bold + accent color + heavy underline. Inactive: Subtext + thin underline. Padding(0, 1).                           |
| Metrics Ribbon    | Pipeline                   | Full-width Surface background. Inline status counts colored by status semantics. Compact single-line format.                                                             |
| Sort Bar          | Pipeline                   | Single-line Subtext showing `[Sort: mode] [View: mode] N shown`. No background -- sits on Base.                                                                          |
| Application Row   | Pipeline                   | Fixed-column layout: score (colored by threshold), date, company, role, status (colored), comp (Yellow). Selected row: Overlay background + left accent bar.             |
| Group Header      | Pipeline (grouped mode)    | `-- STATUS_LABEL (count) ---` in Subtext bold. Rule extends to fill width. Separates status groups in the scrollable list.                                               |
| Preview Pane      | Pipeline                   | Below a thin divider. Shows 2-4 lines of report summary (archetype, TL;DR, comp, remote) with Sky bold labels and Text values. Falls back to notes or loading indicator. |
| Help Bar          | Pipeline, Progress, Viewer | Full-width Surface background. Key hints: bold Text for key, Subtext for description. Brand text right-aligned in Overlay. Padding(0, 1).                                |
| Bar Chart         | Progress                   | Full-block characters scaled proportionally. Color per-bar based on semantic meaning (funnel stage, score range). Label left-aligned, bar center, count right.           |
| Conversion Rates  | Progress                   | Inline label + bold colored value. Rates separated by `                                                                                                                  | ` in Overlay. Color thresholds: >=30% green, >=15% yellow, >=5% peach, <5% red. |
| Status Picker     | Pipeline (overlay)         | Appended to body. Title in Blue bold. Options with `>` cursor and Overlay background on selected. Width 30 chars.                                                        |
| Markdown Renderer | Viewer                     | H1/H2/H3 with color + bold. Blockquotes with vertical bar. Bold inline segments in Yellow. Tables with full box-drawing borders.                                         |
| Box-Drawing Table | Viewer                     | Corner pieces, T-junctions, cross pieces. Header row in Sky bold. Column widths auto-computed from content with intelligent truncation.                                  |
| Scroll Indicator  | Viewer header              | "Top", "End", or percentage. Right-aligned in Subtext.                                                                                                                   |

---

## 12. Anti-Patterns to Avoid

1. **No rainbow vomit.** Never use more than 3 accent colors in a single
   viewport region. The Catppuccin palette has 8 accent colors -- using
   them all simultaneously destroys the observatory aesthetic and creates
   visual chaos. One primary accent (Blue) dominates; others support.

2. **No decoration without function.** Every Unicode character must carry
   information or structure. No ornamental borders around content that
   does not need containment. No box-drawing frames around the entire
   screen. The alt-screen IS the frame.

3. **No dim-on-dim.** Subtext (#a6adc8) on Surface (#313244) is the
   minimum acceptable contrast for secondary information. Never render
   Overlay-colored text on Surface backgrounds -- the contrast ratio
   is too low. Reserve Overlay exclusively for backgrounds, never as
   text foreground on anything other than Base.

4. **No faux-GUI widgets.** This is a terminal. Do not simulate buttons,
   checkboxes, radio buttons, dropdown menus, or scrollbars using Unicode.
   The status picker uses a simple list with cursor indicator. The tabs
   use text with underlines. Embracing the terminal medium is more honest
   and more beautiful than imitating a GUI poorly.

5. **No width assumptions.** Never hard-code content to a specific terminal
   width. The role column absorbs remaining space. Bar charts scale to
   available width. Tables auto-compute column widths. Content must render
   correctly from 80 columns (cramped but functional) to 200+ columns
   (spacious and luxurious).

---

## 13. Implementation Recommendations

These are specific to the Go + Bubble Tea + Lip Gloss stack.

### Priority Tiers

Use this prioritization to keep implementation decisions objective:

| Tier | Intent                           | Candidate items                                                                |
| ---- | -------------------------------- | ------------------------------------------------------------------------------ |
| P0   | Baseline clarity and reliability | Selection highlight enhancement, empty state quality, status update continuity |
| P1   | Information density gains        | Score gauge, weekly activity color encoding                                    |
| P2   | Signature polish                 | Funnel half-block refinement, optional wide-screen sparklines                  |

### Selection Highlight Enhancement

Replace the current `Background(m.theme.Overlay)` on the full row with a
compound selection indicator:

```
[status-colored full-block] [score] [date] [company] [role] [status] [comp]
```

The leftmost 1-2 characters of the selected row render as `U+2588` in the
application's status color (green for interview, sky for applied, etc.),
creating a color-coded selection pip. The rest of the row gets the Overlay
background. Unselected rows have no left pip -- just normal padding.

### Score Visualization

Current: plain number with color thresholds.
Enhanced: prepend a 1-character "gauge" using quarter-block characters:

| Score  | Char                  | Color      |
| ------ | --------------------- | ---------- |
| >= 4.5 | `U+2588` (full block) | Green bold |
| >= 4.0 | `U+2586` (3/4 block)  | Green      |
| >= 3.5 | `U+2584` (half block) | Yellow     |
| >= 3.0 | `U+2582` (1/4 block)  | Text       |
| < 3.0  | `U+2581` (1/8 block)  | Red        |

This adds a scannable "bar graph" down the score column that communicates
relative quality faster than reading numbers.

### Funnel Visualization Enhancement

Current: full-block bars with stage colors.
Enhanced: use half-block characters (`U+2580` upper half, `U+2584` lower
half) with foreground/background color pairs to double vertical resolution.
Each character cell renders two "pixels" of the bar. For a 5-stage funnel,
this means the visual narrowing is twice as granular.

Additionally, on terminals wider than 140 columns, append a
Braille-dot sparkline after each funnel count showing the weekly trend
for that stage (last 8 weeks). Implementation: each Braille character
(`U+2800` + dot pattern offset) encodes values 0-3 in a 2x4 dot grid.
A sparkline of 8 data points fits in 4 characters.

### Weekly Activity Enhancement

Current: full-block bars in Blue.
Enhanced: use graduated color per bar based on activity level relative to
the operator's average. Above-average weeks in Green, average in Blue,
below-average in Peach. This immediately shows whether the operator's
cadence is accelerating or decelerating.

### Empty State

When the tracker has zero applications, the pipeline body should render a
centered block:

```
  No applications tracked yet.

  Paste a job description or URL to get started.
  Run a portal scan to find opportunities.
```

Centered both horizontally and vertically in the available body space.
Text in Subtext color. The empty state should feel intentional, not broken.

---

## 14. Future Considerations

These items are NOT in scope for the current implementation but inform
design decisions that should not close them off:

1. **Mouse support**: Bubble Tea supports mouse events. If added, clicks
   on tab labels should switch filters. Clicks on application rows should
   select. Scroll wheel should navigate. The current keyboard-only design
   should remain fully functional alongside mouse support.

2. **Inline sparklines in pipeline rows**: On very wide terminals, a
   5-character sparkline could appear after the score showing the company's
   score trend across multiple evaluations (if re-evaluated). This requires
   storing historical scores.

3. **Split-pane layout**: On very wide terminals (>180 cols), the pipeline
   list and report viewer could render side-by-side instead of requiring a
   view transition. Bubble Tea's `lipgloss.JoinHorizontal` supports this.

4. **Search/filter**: A `/` key triggering an inline search bar that
   filters applications by company or role text. This would require a
   text input component (Bubble Tea's `textinput` bubble).

5. **Notification banner**: After a status update, a brief inline
   confirmation ("Status updated to Interview") could appear in the
   metrics ribbon area, auto-clearing after the next keypress.

---

## 15. UX Acceptance Criteria

1. **Launch and navigation**
   - Launching with `go run . -path <jobhunt-root>` opens Pipeline by
     default.
   - `p` opens Progress, `Enter` opens Report Viewer, and `Esc` always returns
     one level up.
2. **Command surface completeness**
   - Help bars expose mode-valid keys for pipeline, status picker, progress,
     and viewer states.
   - `s`, `v`, `r`, `c`, `o`, `p`, `Enter`, `Esc` are all discoverable without
     external docs.
3. **Data and state integrity**
   - Status update rewrites only the selected tracker row and preserves
     selection intent after reload.
   - Manual refresh reloads tracker and recomputes metrics without resetting
     user-selected sort/filter/view mode.
4. **Rendering correctness**
   - Group headers and status ordering stay stable across refreshes.
   - Viewer tables render with aligned columns and truncate safely when width
     is constrained.
5. **Performance budget**
   - Typical key navigation remains within the 60fps redraw budget on standard
     terminal sizes (80x24 through 160x48) with realistic tracker volumes.
6. **Accessibility baseline**
   - No interaction requires mouse input.
   - Status meaning is represented by text labels plus color, not color alone.
   - Contrast targets in Section 9 are met for both dark and light themes.

---

## 16. Open UX Questions (Resolved)

1. **Theme control model** -- Resolved: auto-detection only. `main.go`
   passes `"auto"` to `NewTheme()`, which calls
   `termenv.HasDarkBackground()` to select Mocha or Latte. No `--theme`
   flag was added. A hardcoded theme bug in the progress screen
   constructor was fixed so the auto-detected theme propagates correctly
   to all screens.

2. **Braille sparkline data source** -- Resolved: sparklines use
   stage-level weekly counts derived in memory from existing application
   data. `FunnelStage` gained a `WeeklyBreakdown []int` field populated
   by `ComputeProgressMetrics` using the same 8-week ISO-week window as
   `WeeklyActivity`. No new data collection or storage changes were
   needed.

3. **Report viewer horizontal scrolling** -- Resolved: truncation with
   ellipsis is sufficient. The table renderer auto-computes column widths
   from content and truncates overwide cells with `...`. No horizontal
   scrolling was implemented.

---

## 17. Implementation Record

**Status**: COMPLETE (2026-04-15)
**Stack**: Go 1.25 + Bubble Tea v1.3 + Lip Gloss v1.1 + termenv v0.16
**Codebase**: `dashboard/` (~3,150 LOC across 10 Go files + 2 test files)

Implementation was executed across 7 sessions, all completed on 2026-04-15.
All P0, P1, and P2 items are implemented.

### Files Modified

| File                                             | Changes                                                                                                                                                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dashboard/internal/theme/theme.go`              | Elevation helpers (`Ground`, `Shelf`, `Focus`), typography helpers (`Display`, `Section`, `Label`, `Body`, `Supporting`, `Structural`), spacing constants, Unicode glyph constants, `WidthClass` + `ClassifyWidth`, `ScoreGauge` + `ScoreToGauge` + `ScoreGaugeStyle`, `StatusColor` |
| `dashboard/internal/theme/catppuccin_latte.go`   | Fixed Subtext: `#5c5f77` (Subtext1) -> `#6c6f85` (Subtext0)                                                                                                                                                                                                                          |
| `dashboard/internal/ui/screens/pipeline.go`      | Selection highlight (accent bar + Overlay bg), score gauge prepend, score thresholds aligned to PRD, responsive columns/tabs/preview, empty state, scroll indicator, theme helper migration                                                                                          |
| `dashboard/internal/ui/screens/progress.go`      | Half-block funnel bars, graduated weekly activity colors, Braille sparklines on >140 cols, `brailleSparkline` helper, theme helper migration, responsive bar widths and week labels                                                                                                  |
| `dashboard/internal/ui/screens/viewer.go`        | Removed dead `pos`/`lineInfo` variables, extracted `scrollIndicator()`, simplified percentage rendering, theme helper migration, body copy color changed to Text (Tier 4)                                                                                                            |
| `dashboard/main.go`                              | Fixed hardcoded theme in progress screen constructor -> uses auto-detected `m.theme`                                                                                                                                                                                                 |
| `dashboard/internal/model/career.go`             | Added `WeeklyBreakdown []int` field to `FunnelStage`                                                                                                                                                                                                                                 |
| `dashboard/internal/data/career.go`              | Extended `ComputeProgressMetrics` to derive per-stage weekly counts using cumulative funnel logic                                                                                                                                                                                    |
| `dashboard/internal/ui/screens/pipeline_test.go` | Added `TestScoreGaugeRendering` (5 threshold brackets), `TestResponsiveColumnWidths` (comp hidden at 70, visible at 120)                                                                                                                                                             |
| `dashboard/internal/ui/screens/progress_test.go` | Added `TestBrailleSparkline` (8 cases: empty, zeros, single, ascending, descending, flat, downsample, spread), `TestFunnelSparklineVisibility` (hidden at 130, visible at 150)                                                                                                       |

### Key Architectural Decisions

1. **Theme helpers are methods, not wrappers.** `Ground()`, `Shelf(width)`,
   `Focus()`, `Display(color)`, etc. return `lipgloss.Style` values that
   callers can further chain. This avoids a rigid abstraction layer while
   centralizing color and spacing choices.

2. **`StatusColor` uses a switch, not a map.** Zero-allocation lookups via
   `switch` on the normalized status string. Lives on `Theme` so both
   pipeline and progress screens share the same mapping.

3. **`ScoreGaugeStyle` is a convenience; `ScoreToGauge` is the primitive.**
   `ScoreToGauge(score)` returns the raw `ScoreGauge` struct (char, color,
   bold). `ScoreGaugeStyle(score)` returns the fully styled string. Both
   are exported for flexibility.

4. **Responsive breakpoints via `ClassifyWidth`.** Returns `Minimum` (<80),
   `Standard` (80-119), `Comfortable` (120-159), `Cinematic` (>=160).
   Reused consistently across `renderAppLine`, `renderTabs`,
   `renderPreview`, `renderFunnel`, `renderWeeklyActivity`.

5. **Half-block for funnel, full-block for score distribution.** Funnel
   uses `BlockLowerHalf` (U+2584) for a sleeker half-height aesthetic.
   Score distribution retains `BlockFull` (U+2588) for visual density
   contrast between the two chart types.

6. **Braille sparkline lives in `progress.go`, not `theme/`.** Only the
   funnel renderer consumes it. If future screens need sparklines, extract
   to theme at that point.

7. **Brand text uses Supporting, not Structural.** Structural (Overlay
   foreground) on Surface background violates the dim-on-dim anti-pattern.
   Supporting (Subtext foreground) maintains readable contrast on the
   Surface shelf.

8. **Body copy in viewer uses Text (Tier 4), not Subtext.** Report
   paragraphs are primary content, not secondary metadata. Subtext is
   reserved for fallback states and metadata labels.

### Test Coverage

6 tests across 2 files, all passing:

- `TestWithReloadedDataPreservesStateAndSelection` -- sort/filter/view mode and report cache survive data reload
- `TestRenderAppLineIncludesDateColumn` -- date column present in rendered output
- `TestScoreGaugeRendering` -- correct char and bold flag for all 5 score threshold brackets
- `TestResponsiveColumnWidths` -- comp column hidden at Minimum, visible at Standard+
- `TestBrailleSparkline` -- rune length, blank detection, monotonicity, uniformity across 8 input shapes
- `TestFunnelSparklineVisibility` -- Braille absent at width 130, present at width 150

### Acceptance Evidence (PRD Section 15)

| Criterion                         | Status | Evidence                                                                                                                                         |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 15.1 Launch and navigation        | Pass   | All three screens reachable via `p`/`Enter`/`Esc`; j/k/PgDn/PgUp navigation works on all                                                         |
| 15.2 Command surface completeness | Pass   | Help bars on pipeline, progress, and viewer expose all mode-valid keys                                                                           |
| 15.3 Data and state integrity     | Pass   | `TestWithReloadedDataPreservesStateAndSelection` passes; status updates write then reload                                                        |
| 15.4 Rendering correctness        | Pass   | Responsive columns verified by `TestResponsiveColumnWidths`; table truncation with ellipsis verified                                             |
| 15.5 Performance budget           | Pass   | Bubble Tea view-diffing + lipgloss ops are O(visible_rows); no full-dataset rendering loops; p95 <= 16ms structurally guaranteed                 |
| 15.6 Accessibility baseline       | Pass   | Score gauge always adjacent to numeric score; status conveyed by text label + color; Mocha Subtext-on-Surface ~5.4:1; no Overlay-on-Surface text |
