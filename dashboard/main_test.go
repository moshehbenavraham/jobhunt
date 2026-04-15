package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/data"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/theme"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/ui/screens"
)

type stubProgram struct {
	model tea.Model
	err   error
}

func (s stubProgram) Run() (tea.Model, error) {
	return s.model, s.err
}

func writeDashboardFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func sampleApps() []model.CareerApplication {
	return []model.CareerApplication{
		{
			Date:         "2026-04-01",
			Company:      "Acme",
			Role:         "Platform Engineer",
			Status:       "Applied",
			Score:        4.6,
			ReportPath:   "reports/001.md",
			ReportNumber: "001",
			JobURL:       "https://jobs.example.com/acme",
		},
		{
			Date:         "2026-04-02",
			Company:      "Beta",
			Role:         "Backend Engineer",
			Status:       "Interview",
			Score:        4.3,
			ReportPath:   "reports/002.md",
			ReportNumber: "002",
			Notes:        "Strong match",
		},
	}
}

func TestRunUsesProgramFactory(t *testing.T) {
	root := t.TempDir()
	writeDashboardFile(
		t,
		filepath.Join(root, "data", "applications.md"),
		strings.Join([]string{
			"| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| 1 | 2026-04-01 | Acme | Platform Engineer | 4.6/5 | Applied | ✅ | [001](reports/001.md) | note |",
			"",
		}, "\n"),
	)
	writeDashboardFile(t, filepath.Join(root, "reports", "001.md"), "**TL;DR:** summary\n")

	orig := newTeaProgram
	defer func() { newTeaProgram = orig }()

	called := false
	newTeaProgram = func(model tea.Model, opts ...tea.ProgramOption) teaProgram {
		called = true
		return stubProgram{model: model}
	}

	if err := run(root); err != nil {
		t.Fatalf("unexpected run error: %v", err)
	}
	if !called {
		t.Fatal("expected run to create a tea program")
	}

	newTeaProgram = func(model tea.Model, opts ...tea.ProgramOption) teaProgram {
		return stubProgram{model: model, err: errors.New("boom")}
	}
	if err := run(root); err == nil || err.Error() != "boom" {
		t.Fatalf("expected bubbled program error, got %v", err)
	}

	if err := run(filepath.Join(root, "missing")); err == nil || !strings.Contains(err.Error(), "could not find applications.md") {
		t.Fatalf("expected missing tracker error, got %v", err)
	}
}

func TestAppModelUpdateAndViewTransitions(t *testing.T) {
	root := t.TempDir()
	writeDashboardFile(
		t,
		filepath.Join(root, "data", "applications.md"),
		strings.Join([]string{
			"| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| 1 | 2026-04-01 | Acme | Platform Engineer | 4.6/5 | Applied | ✅ | [001](reports/001.md) | note |",
			"",
		}, "\n"),
	)
	writeDashboardFile(
		t,
		filepath.Join(root, "reports", "001.md"),
		strings.Join([]string{
			"**Arquetipo detectado** | Builder |",
			"**TL;DR:** summary",
			"**Remote** | Global remote |",
			"**Comp** | $180k |",
			"",
		}, "\n"),
	)

	apps := sampleApps()
	th := theme.NewTheme("catppuccin-mocha")
	pm := screens.NewPipelineModel(
		th,
		apps,
		data.ComputeMetrics(apps),
		root,
		120,
		40,
	)

	modelState := appModel{
		pipeline:        pm,
		viewer:          screens.NewViewerModel(th, filepath.Join(root, "reports", "001.md"), "Viewer", 120, 40),
		progress:        screens.NewProgressModel(th, data.ComputeProgressMetrics(apps), 120, 40),
		state:           viewPipeline,
		careerOpsPath:   root,
		theme:           th,
		progressMetrics: data.ComputeProgressMetrics(apps),
	}

	modelState.reloadPipelineData()
	if modelState.progressMetrics.ActiveApps == 0 {
		t.Fatal("expected reloadPipelineData to populate progress metrics")
	}
	if cmd := modelState.Init(); cmd != nil {
		t.Fatalf("expected nil init command, got %#v", cmd)
	}

	updatedAny, cmd := modelState.Update(tea.WindowSizeMsg{Width: 100, Height: 30})
	updated := updatedAny.(appModel)
	if cmd != nil {
		t.Fatalf("expected nil resize command, got %#v", cmd)
	}
	if updated.pipeline.Width() != 100 || updated.pipeline.Height() != 30 {
		t.Fatalf("expected pipeline resize, got %dx%d", updated.pipeline.Width(), updated.pipeline.Height())
	}

	updatedAny, cmd = updated.Update(screens.PipelineLoadReportMsg{
		CareerOpsPath: root,
		ReportPath:    "reports/001.md",
	})
	updated = updatedAny.(appModel)
	if cmd != nil {
		t.Fatalf("expected nil enrich command, got %#v", cmd)
	}
	if updated.pipeline.Width() == 0 {
		t.Fatal("expected pipeline state to remain usable after enrichment")
	}

	updatedAny, cmd = updated.Update(screens.PipelineOpenReportMsg{
		Path:  filepath.Join(root, "reports", "001.md"),
		Title: "Acme",
	})
	updated = updatedAny.(appModel)
	if cmd != nil || updated.state != viewReport {
		t.Fatalf("expected report view transition, state=%v cmd=%#v", updated.state, cmd)
	}
	if !strings.Contains(updated.View(), "Acme") {
		t.Fatalf("expected viewer view, got %q", updated.View())
	}

	updatedAny, _ = updated.Update(screens.ViewerClosedMsg{})
	updated = updatedAny.(appModel)
	if updated.state != viewPipeline {
		t.Fatalf("expected pipeline state after closing viewer, got %v", updated.state)
	}

	updatedAny, _ = updated.Update(screens.PipelineOpenProgressMsg{})
	updated = updatedAny.(appModel)
	if updated.state != viewProgress {
		t.Fatalf("expected progress state, got %v", updated.state)
	}
	if !strings.Contains(updated.View(), "SEARCH PROGRESS") {
		t.Fatalf("expected progress view, got %q", updated.View())
	}

	updatedAny, _ = updated.Update(screens.ProgressClosedMsg{})
	updated = updatedAny.(appModel)
	if updated.state != viewPipeline {
		t.Fatalf("expected pipeline state after closing progress, got %v", updated.state)
	}

	updatedAny, cmd = updated.Update(screens.PipelineOpenURLMsg{URL: "https://jobs.example.com/acme"})
	updated = updatedAny.(appModel)
	if cmd == nil {
		t.Fatal("expected URL open command")
	}

	updatedAny, _ = updated.Update(screens.PipelineRefreshMsg{})
	updated = updatedAny.(appModel)
	if updated.progressMetrics.ActiveApps == 0 {
		t.Fatal("expected refresh to reload progress metrics")
	}

	updatedAny, _ = updated.Update(screens.PipelineUpdateStatusMsg{
		CareerOpsPath: root,
		App: model.CareerApplication{
			ReportNumber: "001",
			Status:       "Applied",
		},
		NewStatus: "Offer",
	})
	updated = updatedAny.(appModel)
	if got, _ := os.ReadFile(filepath.Join(root, "data", "applications.md")); !strings.Contains(string(got), "Offer") {
		t.Fatalf("expected status update to persist, got %q", string(got))
	}
}
