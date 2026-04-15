package screens

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/theme"
)

func pipelineFixtureApps() []model.CareerApplication {
	return []model.CareerApplication{
		{
			Date:       "2026-04-13",
			Company:    "Anthropic",
			Role:       "Forward Deployed Engineer",
			Status:     "Applied",
			Score:      4.5,
			ReportPath: "reports/001.md",
			JobURL:     "https://jobs.example.com/anthropic",
			Notes:      "Strong remote fit",
		},
		{
			Date:       "2026-04-12",
			Company:    "Beta",
			Role:       "Platform Engineer",
			Status:     "Interview",
			Score:      4.8,
			ReportPath: "reports/002.md",
			JobURL:     "https://jobs.example.com/beta",
			Notes:      "Interview scheduled",
		},
		{
			Date:       "2026-04-11",
			Company:    "Gamma",
			Role:       "Data Engineer",
			Status:     "SKIP",
			Score:      3.2,
			ReportPath: "reports/003.md",
			Notes:      "Geo blocker",
		},
	}
}

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

func TestPipelineModelUpdateFlowAndRendering(t *testing.T) {
	apps := pipelineFixtureApps()
	th := theme.NewTheme("catppuccin-mocha")
	pm := NewPipelineModel(
		th,
		apps,
		model.PipelineMetrics{
			Total: len(apps),
			ByStatus: map[string]int{
				"applied":   1,
				"interview": 1,
				"skip":      1,
			},
			AvgScore: 4.2,
		},
		"..",
		120,
		36,
	)
	pm.EnrichReport("reports/002.md", "Operator", "Interview loop", "Hybrid", "$180k")

	if cmd := pm.Init(); cmd != nil {
		t.Fatalf("expected nil init command, got %#v", cmd)
	}
	pm.Resize(128, 40)
	if pm.Width() != 128 || pm.Height() != 40 {
		t.Fatalf("expected resize to persist, got %dx%d", pm.Width(), pm.Height())
	}

	if _, ok := pm.CurrentApp(); !ok {
		t.Fatal("expected a current app in the default filtered view")
	}

	updated, cmd := pm.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("j")})
	if cmd == nil {
		t.Fatal("expected down navigation to request report loading")
	}
	if msg := cmd(); msg == nil {
		t.Fatal("expected non-nil load-report message")
	}
	if updated.cursor != 1 {
		t.Fatalf("expected cursor 1 after down navigation, got %d", updated.cursor)
	}
	updated.EnrichReport("reports/001.md", "Builder", "Concise summary", "Global remote", "$200k")

	updated, _ = updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("s")})
	if updated.sortMode != sortDate {
		t.Fatalf("expected sort cycle to reach %q, got %q", sortDate, updated.sortMode)
	}

	updated, _ = updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("f")})
	if updated.activeTab != 1 {
		t.Fatalf("expected next tab, got %d", updated.activeTab)
	}

	updated, _ = updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("v")})
	if updated.viewMode != "flat" {
		t.Fatalf("expected flat view mode, got %q", updated.viewMode)
	}

	updated.cursor = 0
	updated.activeTab = 0
	updated.applyFilterAndSort()

	opened, cmd := updated.Update(tea.KeyMsg{Type: tea.KeyEnter})
	if cmd == nil {
		t.Fatal("expected enter to open report")
	}
	if msg := cmd(); msg == nil {
		t.Fatal("expected non-nil open-report message")
	}
	openReportMsg, ok := cmd().(PipelineOpenReportMsg)
	if !ok {
		t.Fatalf("expected PipelineOpenReportMsg, got %#v", cmd())
	}
	if !strings.Contains(openReportMsg.Title, "Anthropic") {
		t.Fatalf("unexpected report title: %#v", openReportMsg)
	}
	if opened.cursor != updated.cursor {
		t.Fatalf("expected open-report command not to mutate cursor, got %d -> %d", updated.cursor, opened.cursor)
	}

	openedURL, cmd := updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("o")})
	if cmd == nil {
		t.Fatal("expected URL open command")
	}
	if msg := cmd(); msg == nil {
		t.Fatal("expected non-nil URL message")
	}
	if _, ok := cmd().(PipelineOpenURLMsg); !ok {
		t.Fatalf("expected PipelineOpenURLMsg, got %#v", cmd())
	}
	if openedURL.cursor != updated.cursor {
		t.Fatalf("expected URL command not to move cursor, got %d -> %d", updated.cursor, openedURL.cursor)
	}

	progressModel, cmd := updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("p")})
	if cmd == nil {
		t.Fatal("expected progress open command")
	}
	if _, ok := cmd().(PipelineOpenProgressMsg); !ok {
		t.Fatalf("expected PipelineOpenProgressMsg, got %#v", cmd())
	}
	if progressModel.cursor != updated.cursor {
		t.Fatalf("expected progress command not to move cursor, got %d -> %d", updated.cursor, progressModel.cursor)
	}

	refreshModel, cmd := updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("r")})
	if cmd == nil {
		t.Fatal("expected refresh command")
	}
	if _, ok := cmd().(PipelineRefreshMsg); !ok {
		t.Fatalf("expected PipelineRefreshMsg, got %#v", cmd())
	}
	if refreshModel.cursor != updated.cursor {
		t.Fatalf("expected refresh command not to move cursor, got %d -> %d", updated.cursor, refreshModel.cursor)
	}

	statusPicker, cmd := updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("c")})
	if cmd != nil {
		t.Fatalf("expected no immediate command when opening status picker, got %#v", cmd)
	}
	if !statusPicker.statusPicker {
		t.Fatal("expected status picker to open")
	}

	statusPicker, _ = statusPicker.Update(tea.KeyMsg{Type: tea.KeyDown})
	if statusPicker.statusCursor != 1 {
		t.Fatalf("expected status cursor 1, got %d", statusPicker.statusCursor)
	}
	statusPicker, cmd = statusPicker.Update(tea.KeyMsg{Type: tea.KeyEnter})
	if statusPicker.statusPicker {
		t.Fatal("expected status picker to close after selection")
	}
	if cmd == nil {
		t.Fatal("expected status update command")
	}
	if _, ok := cmd().(PipelineUpdateStatusMsg); !ok {
		t.Fatalf("expected PipelineUpdateStatusMsg, got %#v", cmd())
	}

	_, quitCmd := updated.Update(tea.KeyMsg{Type: tea.KeyEsc})
	if quitCmd == nil {
		t.Fatal("expected quit command on esc")
	}
	if _, ok := quitCmd().(PipelineClosedMsg); !ok {
		t.Fatalf("expected PipelineClosedMsg, got %#v", quitCmd())
	}

	updated, _ = updated.Update(tea.WindowSizeMsg{Width: 110, Height: 32})
	if updated.Width() != 110 || updated.Height() != 32 {
		t.Fatalf("expected window resize to update dimensions, got %dx%d", updated.Width(), updated.Height())
	}

	if view := updated.View(); !strings.Contains(view, "CAREER PIPELINE") || !strings.Contains(view, "jobhunt by aiwithapex.com") {
		t.Fatalf("expected rendered pipeline view, got %q", view)
	}
	if !strings.Contains(updated.renderHeader(), "CAREER PIPELINE") {
		t.Fatal("expected header rendering to include title")
	}
	if !strings.Contains(updated.renderTabs(), "ALL") {
		t.Fatal("expected tabs rendering to include labels")
	}
	if !strings.Contains(updated.renderMetrics(), "Applied") {
		t.Fatal("expected metrics rendering to include statuses")
	}
	if !strings.Contains(updated.renderSortBar(), "[Sort:") {
		t.Fatal("expected sort bar rendering to include sort label")
	}
	if !strings.Contains(updated.renderBody(), "Anthropic") {
		t.Fatal("expected body rendering to include current app")
	}
	if !strings.Contains(updated.renderPreview(), "TL;DR") {
		t.Fatal("expected preview rendering to include cached summary")
	}
	if !strings.Contains(updated.renderHelp(), "progress") {
		t.Fatal("expected help rendering to include keyboard hints")
	}
	statusPicker.statusPicker = true
	if !strings.Contains(statusPicker.overlayStatusPicker("body"), "Change status:") {
		t.Fatal("expected status picker overlay")
	}
	if updated.countForFilter(filterAll) != len(apps) {
		t.Fatalf("expected all filter count %d, got %d", len(apps), updated.countForFilter(filterAll))
	}
	if updated.countByNormStatus("applied") != 1 {
		t.Fatalf("expected one applied app, got %d", updated.countByNormStatus("applied"))
	}
	if updated.scoreStyle(4.6).Render("score") == "" {
		t.Fatal("expected score style to render content")
	}
	if got := truncateRunes("forward deployed engineer", 10); got != "forward..." {
		t.Fatalf("unexpected truncation: %q", got)
	}
	if got := statusLabel("responded"); got != "Responded" {
		t.Fatalf("unexpected status label: %q", got)
	}
}

func TestPipelineEmptyStateAndNavigationHelpers(t *testing.T) {
	th := theme.NewTheme("catppuccin-mocha")
	pm := NewPipelineModel(th, nil, model.PipelineMetrics{}, "..", 90, 20)

	if !strings.Contains(pm.renderEmptyState(), "No applications tracked yet") {
		t.Fatal("expected onboarding empty state")
	}

	pm.apps = pipelineFixtureApps()
	pm.activeTab = filterSkipIndex()
	pm.applyFilterAndSort()
	pm.cursor = len(pm.filtered) - 1
	pm.viewMode = "grouped"
	pm.adjustScroll()
	if pm.cursorLineEstimate() < 0 {
		t.Fatal("expected non-negative cursor line estimate")
	}

	pm.filtered = nil
	if _, ok := pm.CurrentApp(); ok {
		t.Fatal("expected no current app when filtered list is empty")
	}
}

func filterSkipIndex() int {
	for i, tab := range pipelineTabs {
		if tab.filter == filterSkip {
			return i
		}
	}
	return 0
}
