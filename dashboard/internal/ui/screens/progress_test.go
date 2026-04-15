package screens

import (
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/santifer/career-ops/dashboard/internal/model"
	"github.com/santifer/career-ops/dashboard/internal/theme"
)

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
