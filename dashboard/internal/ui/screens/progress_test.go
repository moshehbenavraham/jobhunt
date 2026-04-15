package screens

import (
	"strings"
	"testing"
	"unicode/utf8"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/theme"
)

func progressFixtureMetrics() model.ProgressMetrics {
	breakdown := []int{2, 4, 6, 3, 5, 7, 1, 8}
	return model.ProgressMetrics{
		FunnelStages: []model.FunnelStage{
			{Label: "Evaluated", Count: 36, Pct: 100.0, WeeklyBreakdown: breakdown},
			{Label: "Applied", Count: 20, Pct: 55.6, WeeklyBreakdown: breakdown},
			{Label: "Responded", Count: 8, Pct: 40.0, WeeklyBreakdown: breakdown},
			{Label: "Interview", Count: 3, Pct: 15.0, WeeklyBreakdown: breakdown},
			{Label: "Offer", Count: 1, Pct: 5.0, WeeklyBreakdown: breakdown},
		},
		ScoreBuckets: []model.ScoreBucket{
			{Label: "4.5-5.0", Count: 5},
			{Label: "4.0-4.4", Count: 4},
			{Label: "3.5-3.9", Count: 3},
			{Label: "3.0-3.4", Count: 2},
			{Label: "  <3.0", Count: 1},
		},
		WeeklyActivity: []model.WeekActivity{
			{Week: "2026-W10", Count: 2},
			{Week: "2026-W11", Count: 5},
			{Week: "2026-W12", Count: 1},
		},
		ResponseRate:  40.0,
		InterviewRate: 15.0,
		OfferRate:     5.0,
		AvgScore:      4.1,
		TopScore:      4.8,
		TotalOffers:   1,
		ActiveApps:    6,
	}
}

func TestBrailleSparkline(t *testing.T) {
	blank := string(theme.BrailleBase)

	tests := []struct {
		name      string
		data      []int
		width     int
		wantLen   int
		wantBlank bool
	}{
		{"empty input", nil, 4, 4, true},
		{"all zeros", []int{0, 0, 0, 0}, 4, 4, true},
		{"single value", []int{5}, 4, 4, false},
		{"ascending", []int{1, 2, 3, 4}, 4, 4, false},
		{"descending", []int{4, 3, 2, 1}, 4, 4, false},
		{"flat equal", []int{3, 3, 3, 3}, 4, 4, false},
		{"more data than width", []int{1, 2, 3, 4, 5, 6, 7, 8}, 4, 4, false},
		{"less data than width", []int{2, 8}, 4, 4, false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := brailleSparkline(tc.data, tc.width)
			gotLen := utf8.RuneCountInString(got)
			if gotLen != tc.wantLen {
				t.Errorf("rune count = %d, want %d", gotLen, tc.wantLen)
			}
			allBlank := got == strings.Repeat(blank, tc.width)
			if allBlank != tc.wantBlank {
				t.Errorf("all blank = %v, want %v (got %q)", allBlank, tc.wantBlank, got)
			}
		})
	}

	// Ascending [1,2,3,4] must have strictly increasing or equal dot heights
	asc := brailleSparkline([]int{1, 2, 3, 4}, 4)
	runes := []rune(asc)
	for i := 1; i < len(runes); i++ {
		if runes[i] < runes[i-1] {
			t.Errorf("ascending: rune[%d] (%U) < rune[%d] (%U)", i, runes[i], i-1, runes[i-1])
		}
	}

	// Descending [4,3,2,1] must have decreasing or equal dot heights
	desc := brailleSparkline([]int{4, 3, 2, 1}, 4)
	runes = []rune(desc)
	for i := 1; i < len(runes); i++ {
		if runes[i] > runes[i-1] {
			t.Errorf("descending: rune[%d] (%U) > rune[%d] (%U)", i, runes[i], i-1, runes[i-1])
		}
	}

	// Flat equal values should produce uniform non-blank pattern
	flat := brailleSparkline([]int{3, 3, 3, 3}, 4)
	runes = []rune(flat)
	for i := 1; i < len(runes); i++ {
		if runes[i] != runes[0] {
			t.Errorf("flat: rune[%d] (%U) != rune[0] (%U)", i, runes[i], runes[0])
		}
	}
}

func TestFunnelSparklineVisibility(t *testing.T) {
	breakdown := []int{2, 4, 6, 3, 5, 7, 1, 8}

	stages := []model.FunnelStage{
		{Label: "Evaluated", Count: 36, Pct: 100.0, WeeklyBreakdown: breakdown},
		{Label: "Applied", Count: 20, Pct: 55.6, WeeklyBreakdown: breakdown},
		{Label: "Responded", Count: 8, Pct: 40.0, WeeklyBreakdown: breakdown},
		{Label: "Interview", Count: 3, Pct: 15.0, WeeklyBreakdown: breakdown},
		{Label: "Offer", Count: 1, Pct: 5.0, WeeklyBreakdown: breakdown},
	}
	metrics := model.ProgressMetrics{FunnelStages: stages}
	th := theme.NewTheme("catppuccin-mocha")

	// Width 130: sparklines should be hidden
	narrow := NewProgressModel(th, metrics, 130, 40)
	narrowView := narrow.renderFunnel()
	for r := theme.BrailleBase; r <= theme.BrailleBase+0xFF; r++ {
		if strings.ContainsRune(narrowView, r) {
			t.Errorf("width 130: found Braille rune U+%04X in funnel output", r)
			break
		}
	}

	// Width 150: sparklines should be visible
	wide := NewProgressModel(th, metrics, 150, 40)
	wideView := wide.renderFunnel()
	hasBraille := false
	for r := theme.BrailleBase; r <= theme.BrailleBase+0xFF; r++ {
		if strings.ContainsRune(wideView, r) {
			hasBraille = true
			break
		}
	}
	if !hasBraille {
		t.Error("width 150: expected Braille characters in funnel output, found none")
	}
}

func TestProgressModelUpdateAndRender(t *testing.T) {
	th := theme.NewTheme("catppuccin-mocha")
	pm := NewProgressModel(th, progressFixtureMetrics(), 150, 24)

	if cmd := pm.Init(); cmd != nil {
		t.Fatalf("expected nil init command, got %#v", cmd)
	}
	pm.Resize(140, 22)
	if pm.width != 140 || pm.height != 22 {
		t.Fatalf("unexpected resize result: %dx%d", pm.width, pm.height)
	}
	if pm.maxScrollOffset() <= 0 {
		t.Fatalf("expected positive max scroll offset, got %d", pm.maxScrollOffset())
	}

	updated, cmd := pm.Update(tea.KeyMsg{Type: tea.KeyDown})
	if cmd != nil {
		t.Fatalf("expected nil scroll command, got %#v", cmd)
	}
	if updated.scrollOffset != 1 {
		t.Fatalf("expected scroll offset 1, got %d", updated.scrollOffset)
	}

	updated, _ = updated.Update(tea.KeyMsg{Type: tea.KeyPgDown})
	if updated.scrollOffset <= 1 {
		t.Fatalf("expected page-down to advance scroll, got %d", updated.scrollOffset)
	}

	updated, _ = updated.Update(tea.KeyMsg{Type: tea.KeyPgUp})
	if updated.scrollOffset < 0 {
		t.Fatalf("expected non-negative scroll offset, got %d", updated.scrollOffset)
	}

	updated, cmd = updated.Update(tea.KeyMsg{Type: tea.KeyEsc})
	if cmd == nil {
		t.Fatal("expected close command from esc")
	}
	if _, ok := cmd().(ProgressClosedMsg); !ok {
		t.Fatalf("expected ProgressClosedMsg, got %#v", cmd())
	}

	updated, _ = updated.Update(tea.WindowSizeMsg{Width: 120, Height: 18})
	if updated.width != 120 || updated.height != 18 {
		t.Fatalf("unexpected window resize result: %dx%d", updated.width, updated.height)
	}

	if view := updated.View(); !strings.Contains(view, "SEARCH PROGRESS") {
		t.Fatalf("expected rendered progress view, got %q", view)
	}
	if !strings.Contains(updated.renderHeader(), "evaluated") {
		t.Fatal("expected header to include evaluated count")
	}
	if !strings.Contains(updated.renderScoreDistribution(), "Score Distribution") {
		t.Fatal("expected score distribution section")
	}
	if !strings.Contains(updated.renderRates(), "Response Rate") {
		t.Fatal("expected rates section")
	}
	if !strings.Contains(updated.renderWeeklyActivity(), "Weekly Activity") {
		t.Fatal("expected weekly activity section")
	}
	if !strings.Contains(updated.renderHelp(), "scroll") {
		t.Fatal("expected help footer")
	}
	if updated.rateColor(35) != th.Green || updated.rateColor(18) != th.Yellow || updated.rateColor(7) != th.Peach || updated.rateColor(2) != th.Red {
		t.Fatal("expected rateColor thresholds to map to theme colors")
	}
}

func TestProgressModelEmptySections(t *testing.T) {
	th := theme.NewTheme("catppuccin-mocha")
	pm := NewProgressModel(th, model.ProgressMetrics{}, 100, 16)

	if !strings.Contains(pm.renderFunnel(), "No data") {
		t.Fatal("expected empty funnel message")
	}
	if !strings.Contains(pm.renderScoreDistribution(), "No data") {
		t.Fatal("expected empty score distribution message")
	}
	if !strings.Contains(pm.renderWeeklyActivity(), "No data") {
		t.Fatal("expected empty weekly activity message")
	}
	if !strings.Contains(pm.View(), "No data") {
		t.Fatal("expected empty progress view to surface no-data states")
	}
}
