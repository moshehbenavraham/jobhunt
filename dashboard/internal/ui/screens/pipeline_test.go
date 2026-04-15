package screens

import (
	"strings"
	"testing"

	"github.com/santifer/career-ops/dashboard/internal/model"
	"github.com/santifer/career-ops/dashboard/internal/theme"
)

func TestWithReloadedDataPreservesStateAndSelection(t *testing.T) {
	initialApps := []model.CareerApplication{
		{
			Company:    "Acme",
			Role:       "Backend Engineer",
			Status:     "Evaluated",
			Score:      4.2,
			ReportPath: "reports/001-acme.md",
		},
		{
			Company:    "Beta",
			Role:       "Platform Engineer",
			Status:     "Applied",
			Score:      4.6,
			ReportPath: "reports/002-beta.md",
		},
	}

	pm := NewPipelineModel(
		theme.NewTheme("catppuccin-mocha"),
		initialApps,
		model.PipelineMetrics{Total: len(initialApps)},
		"..",
		120,
		40,
	)
	pm.sortMode = sortCompany
	pm.activeTab = 0
	pm.viewMode = "flat"
	pm.applyFilterAndSort()
	pm.cursor = 1
	pm.reportCache["reports/002-beta.md"] = reportSummary{tldr: "cached"}

	refreshedApps := []model.CareerApplication{
		initialApps[0],
		initialApps[1],
		{
			Company:    "Gamma",
			Role:       "AI Engineer",
			Status:     "Interview",
			Score:      4.8,
			ReportPath: "reports/003-gamma.md",
		},
	}

	reloaded := pm.WithReloadedData(refreshedApps, model.PipelineMetrics{Total: len(refreshedApps)})

	if reloaded.sortMode != sortCompany {
		t.Fatalf("expected sort mode %q, got %q", sortCompany, reloaded.sortMode)
	}
	if reloaded.viewMode != "flat" {
		t.Fatalf("expected view mode to stay flat, got %q", reloaded.viewMode)
	}
	if got := len(reloaded.filtered); got != 3 {
		t.Fatalf("expected 3 filtered apps after refresh, got %d", got)
	}
	if app, ok := reloaded.CurrentApp(); !ok || app.ReportPath != "reports/002-beta.md" {
		t.Fatalf("expected selection to stay on beta app, got %+v (ok=%v)", app, ok)
	}
	if reloaded.reportCache["reports/002-beta.md"].tldr != "cached" {
		t.Fatal("expected cached report summaries to survive refresh")
	}
}

func TestRenderAppLineIncludesDateColumn(t *testing.T) {
	pm := NewPipelineModel(
		theme.NewTheme("catppuccin-mocha"),
		nil,
		model.PipelineMetrics{},
		"..",
		120,
		40,
	)

	line := pm.renderAppLine(model.CareerApplication{
		Date:    "2026-04-13",
		Company: "Anthropic",
		Role:    "Forward Deployed Engineer",
		Status:  "Applied",
		Score:   4.5,
	}, false)

	if !strings.Contains(line, "2026-04-13") {
		t.Fatalf("expected rendered line to include date column, got %q", line)
	}
}

func TestScoreGaugeRendering(t *testing.T) {
	th := theme.NewTheme("catppuccin-mocha")

	tests := []struct {
		score    float64
		wantChar string
		wantBold bool
	}{
		{4.8, theme.BlockFull, true},
		{4.5, theme.BlockFull, true},
		{4.2, theme.Block3_4, false},
		{4.0, theme.Block3_4, false},
		{3.7, theme.BlockHalf, false},
		{3.5, theme.BlockHalf, false},
		{3.2, theme.Block1_4, false},
		{3.0, theme.Block1_4, false},
		{2.5, theme.Block1_8, false},
	}

	for _, tc := range tests {
		g := th.ScoreToGauge(tc.score)
		if g.Char != tc.wantChar {
			t.Errorf("ScoreToGauge(%.1f): char = %q, want %q", tc.score, g.Char, tc.wantChar)
		}
		if g.Bold != tc.wantBold {
			t.Errorf("ScoreToGauge(%.1f): bold = %v, want %v", tc.score, g.Bold, tc.wantBold)
		}
	}
}

func TestResponsiveColumnWidths(t *testing.T) {
	app := model.CareerApplication{
		Date:       "2026-04-13",
		Company:    "Anthropic",
		Role:       "Forward Deployed Engineer",
		Status:     "Applied",
		Score:      4.5,
		ReportPath: "reports/001.md",
	}

	th := theme.NewTheme("catppuccin-mocha")

	narrow := NewPipelineModel(th, nil, model.PipelineMetrics{}, "..", 70, 40)
	narrow.reportCache["reports/001.md"] = reportSummary{comp: "$200k-$250k"}
	narrowLine := narrow.renderAppLine(app, false)

	if strings.Contains(narrowLine, "$200k") {
		t.Errorf("narrow (70 cols): comp column should be hidden, but found comp data in %q", narrowLine)
	}

	wide := NewPipelineModel(th, nil, model.PipelineMetrics{}, "..", 120, 40)
	wide.reportCache["reports/001.md"] = reportSummary{comp: "$200k-$250k"}
	wideLine := wide.renderAppLine(app, false)

	if !strings.Contains(wideLine, "$200k") {
		t.Errorf("wide (120 cols): comp column should be visible, but comp data missing from %q", wideLine)
	}
}
