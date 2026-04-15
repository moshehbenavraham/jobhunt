// Package theme provides the visual theme system for the dashboard.
//
// The design vocabulary follows a 3-level elevation model (Ground / Shelf / Focus),
// a 6-tier typography scale, spacing tokens, and shared color helpers so that all
// screens produce a consistent "observatory instrument panel" aesthetic.
package theme

import (
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// ---------------------------------------------------------------------------
// Spacing tokens
// ---------------------------------------------------------------------------

const (
	SpaceXS = 1 // between inline elements
	SpaceSM = 2 // left/right content padding
	SpaceMD = 4 // between column groups
)

// ---------------------------------------------------------------------------
// Unicode glyph constants
// ---------------------------------------------------------------------------

// Block elements used for gauges, bars, and scroll indicators.
const (
	BlockFull = "\u2588" // █  Full block
	Block3_4  = "\u258a" // ▊  Left three-quarters block
	BlockHalf = "\u258c" // ▌  Left half block
	Block1_4  = "\u258e" // ▎  Left one-quarter block
	Block1_8  = "\u258f" // ▏  Left one-eighth block
)

// Half-block elements for double-resolution vertical bars.
const (
	BlockUpperHalf = "\u2580" // ▀  Upper half block
	BlockLowerHalf = "\u2584" // ▄  Lower half block
)

// Box-drawing characters for table rendering.
const (
	HeavyHoriz = "\u2501" // ━
	ThinHoriz  = "\u2500" // ─
	ThinVert   = "\u2502" // │

	CornerTL = "\u250c" // ┌
	CornerTR = "\u2510" // ┐
	CornerBL = "\u2514" // └
	CornerBR = "\u2518" // ┘

	TeeDown  = "\u252c" // ┬
	TeeUp    = "\u2534" // ┴
	TeeRight = "\u251c" // ├
	TeeLeft  = "\u2524" // ┤

	Cross = "\u253c" // ┼
)

// BrailleBase is U+2800, the start of the Braille Patterns Unicode block.
const BrailleBase = '\u2800'

// ---------------------------------------------------------------------------
// Responsive width classes
// ---------------------------------------------------------------------------

// WidthClass categorises the terminal column count into breakpoint tiers.
type WidthClass int

const (
	WidthMinimum     WidthClass = iota // < 80 cols
	WidthStandard                      // 80 .. 119
	WidthComfortable                   // 120 .. 159
	WidthCinematic                     // >= 160
)

// ClassifyWidth maps a column count to its WidthClass.
func ClassifyWidth(cols int) WidthClass {
	switch {
	case cols < 80:
		return WidthMinimum
	case cols < 120:
		return WidthStandard
	case cols < 160:
		return WidthComfortable
	default:
		return WidthCinematic
	}
}

// ---------------------------------------------------------------------------
// Theme struct
// ---------------------------------------------------------------------------

// Theme holds all color definitions for the pipeline dashboard.
type Theme struct {
	// Base colors
	Base    lipgloss.Color
	Surface lipgloss.Color
	Overlay lipgloss.Color
	Text    lipgloss.Color
	Subtext lipgloss.Color

	// Accent colors
	Blue   lipgloss.Color
	Mauve  lipgloss.Color
	Green  lipgloss.Color
	Yellow lipgloss.Color
	Sky    lipgloss.Color
	Peach  lipgloss.Color
	Red    lipgloss.Color
	Pink   lipgloss.Color
}

// NewTheme creates a theme by name. Use "auto" or "" to detect from terminal background.
func NewTheme(name string) Theme {
	switch name {
	case "catppuccin-mocha":
		return newCatppuccinMocha()
	case "catppuccin-latte":
		return newCatppuccinLatte()
	case "auto", "":
		if termenv.HasDarkBackground() {
			return newCatppuccinMocha()
		}
		return newCatppuccinLatte()
	default:
		return newCatppuccinMocha()
	}
}

// ---------------------------------------------------------------------------
// Elevation style helpers (PRD Section 7.2)
// ---------------------------------------------------------------------------

// Ground returns the base-level style for body content areas.
func (t Theme) Ground() lipgloss.Style {
	return lipgloss.NewStyle().Background(t.Base)
}

// Shelf returns a full-width Surface-background style with standard padding.
func (t Theme) Shelf(width int) lipgloss.Style {
	return lipgloss.NewStyle().
		Background(t.Surface).
		Width(width).
		Padding(0, SpaceSM)
}

// Focus returns an Overlay-background style for selected / highlighted elements.
func (t Theme) Focus() lipgloss.Style {
	return lipgloss.NewStyle().Background(t.Overlay)
}

// ---------------------------------------------------------------------------
// Typography tier helpers (PRD Section 7.3)
// ---------------------------------------------------------------------------

// Display returns Tier 1 typography: bold text in the given accent color.
func (t Theme) Display(color lipgloss.Color) lipgloss.Style {
	return lipgloss.NewStyle().Foreground(color).Bold(true)
}

// Section returns Tier 2 typography: bold Sky.
func (t Theme) Section() lipgloss.Style {
	return lipgloss.NewStyle().Foreground(t.Sky).Bold(true)
}

// Label returns Tier 3 typography: bold Yellow.
func (t Theme) Label() lipgloss.Style {
	return lipgloss.NewStyle().Foreground(t.Yellow).Bold(true)
}

// Body returns Tier 4 typography: regular Text.
func (t Theme) Body() lipgloss.Style {
	return lipgloss.NewStyle().Foreground(t.Text)
}

// Supporting returns Tier 5 typography: regular Subtext.
func (t Theme) Supporting() lipgloss.Style {
	return lipgloss.NewStyle().Foreground(t.Subtext)
}

// Structural returns Tier 6 typography: regular Overlay (low-contrast chrome).
func (t Theme) Structural() lipgloss.Style {
	return lipgloss.NewStyle().Foreground(t.Overlay)
}

// ---------------------------------------------------------------------------
// Status color helper (shared across pipeline + progress screens)
// ---------------------------------------------------------------------------

// StatusColor returns the accent color for a normalised application status.
func (t Theme) StatusColor(status string) lipgloss.Color {
	switch status {
	case "interview", "offer":
		return t.Green
	case "applied":
		return t.Sky
	case "responded":
		return t.Blue
	case "evaluated":
		return t.Text
	case "skip":
		return t.Red
	case "rejected", "discarded":
		return t.Subtext
	default:
		return t.Text
	}
}

// ---------------------------------------------------------------------------
// Score gauge (quarter-block visual indicator)
// ---------------------------------------------------------------------------

// ScoreGauge holds the visual representation of a score threshold.
type ScoreGauge struct {
	Char  string
	Color lipgloss.Color
	Bold  bool
}

// ScoreToGauge returns the quarter-block character, color, and weight for a score.
//
//	>= 4.5  full block, Green, bold
//	>= 4.0  3/4 block,  Green
//	>= 3.5  half block, Yellow
//	>= 3.0  1/4 block,  Text
//	<  3.0  1/8 block,  Red
func (t Theme) ScoreToGauge(score float64) ScoreGauge {
	switch {
	case score >= 4.5:
		return ScoreGauge{BlockFull, t.Green, true}
	case score >= 4.0:
		return ScoreGauge{Block3_4, t.Green, false}
	case score >= 3.5:
		return ScoreGauge{BlockHalf, t.Yellow, false}
	case score >= 3.0:
		return ScoreGauge{Block1_4, t.Text, false}
	default:
		return ScoreGauge{Block1_8, t.Red, false}
	}
}

// ScoreGaugeStyle returns a styled string for the gauge character.
func (t Theme) ScoreGaugeStyle(score float64) string {
	g := t.ScoreToGauge(score)
	s := lipgloss.NewStyle().Foreground(g.Color)
	if g.Bold {
		s = s.Bold(true)
	}
	return s.Render(g.Char)
}
