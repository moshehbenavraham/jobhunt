package theme

import (
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
)

func TestThemeFactoriesAndHelpers(t *testing.T) {
	mocha := NewTheme("catppuccin-mocha")
	if mocha.Base != lipgloss.Color("#1e1e2e") {
		t.Fatalf("unexpected mocha base color: %v", mocha.Base)
	}

	latte := NewTheme("catppuccin-latte")
	if latte.Base != lipgloss.Color("#eff1f5") {
		t.Fatalf("unexpected latte base color: %v", latte.Base)
	}

	fallback := NewTheme("unknown")
	if fallback.Base != mocha.Base {
		t.Fatalf("expected fallback theme to use mocha palette, got %v", fallback.Base)
	}

	widthCases := map[int]WidthClass{
		79:  WidthMinimum,
		80:  WidthStandard,
		119: WidthStandard,
		120: WidthComfortable,
		159: WidthComfortable,
		160: WidthCinematic,
	}
	for cols, want := range widthCases {
		if got := ClassifyWidth(cols); got != want {
			t.Fatalf("ClassifyWidth(%d) = %v, want %v", cols, got, want)
		}
	}

	if got := mocha.Shelf(24).Render("panel"); !strings.Contains(got, "panel") {
		t.Fatalf("expected shelf render to include content, got %q", got)
	}
	if got := mocha.Focus().Render("focus"); !strings.Contains(got, "focus") {
		t.Fatalf("expected focus render to include content, got %q", got)
	}
	if got := mocha.Ground().Render("ground"); !strings.Contains(got, "ground") {
		t.Fatalf("expected ground render to include content, got %q", got)
	}
	if got := mocha.Display(mocha.Blue).Render("title"); !strings.Contains(got, "title") {
		t.Fatalf("expected display render to include content, got %q", got)
	}
	if got := mocha.Section().Render("section"); !strings.Contains(got, "section") {
		t.Fatalf("expected section render to include content, got %q", got)
	}
	if got := mocha.Label().Render("label"); !strings.Contains(got, "label") {
		t.Fatalf("expected label render to include content, got %q", got)
	}
	if got := mocha.Body().Render("body"); !strings.Contains(got, "body") {
		t.Fatalf("expected body render to include content, got %q", got)
	}
	if got := mocha.Supporting().Render("support"); !strings.Contains(got, "support") {
		t.Fatalf("expected supporting render to include content, got %q", got)
	}
	if got := mocha.Structural().Render("struct"); !strings.Contains(got, "struct") {
		t.Fatalf("expected structural render to include content, got %q", got)
	}
}

func TestStatusColorsAndScoreGauges(t *testing.T) {
	th := NewTheme("catppuccin-mocha")

	colorCases := map[string]lipgloss.Color{
		"interview": th.Green,
		"offer":     th.Green,
		"applied":   th.Sky,
		"responded": th.Blue,
		"evaluated": th.Text,
		"skip":      th.Red,
		"rejected":  th.Subtext,
		"discarded": th.Subtext,
		"custom":    th.Text,
	}
	for status, want := range colorCases {
		if got := th.StatusColor(status); got != want {
			t.Fatalf("StatusColor(%q) = %v, want %v", status, got, want)
		}
	}

	gaugeCases := []struct {
		score float64
		char  string
		color lipgloss.Color
		bold  bool
	}{
		{4.6, BlockFull, th.Green, true},
		{4.0, Block3_4, th.Green, false},
		{3.6, BlockHalf, th.Yellow, false},
		{3.1, Block1_4, th.Text, false},
		{2.2, Block1_8, th.Red, false},
	}
	for _, tc := range gaugeCases {
		got := th.ScoreToGauge(tc.score)
		if got.Char != tc.char || got.Color != tc.color || got.Bold != tc.bold {
			t.Fatalf("unexpected gauge for %.1f: %+v", tc.score, got)
		}
		if rendered := th.ScoreGaugeStyle(tc.score); !strings.Contains(rendered, tc.char) {
			t.Fatalf("expected rendered gauge %q for %.1f, got %q", tc.char, tc.score, rendered)
		}
	}
}
