package main

import (
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"strings"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/data"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/i18n"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/theme"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/ui/screens"
)

type teaProgram interface {
	Run() (tea.Model, error)
}

var newTeaProgram = func(model tea.Model, opts ...tea.ProgramOption) teaProgram {
	return tea.NewProgram(model, opts...)
}

type viewState int

const (
	viewPipeline viewState = iota
	viewReport
	viewProgress
)

type appModel struct {
	pipeline        screens.PipelineModel
	viewer          screens.ViewerModel
	progress        screens.ProgressModel
	state           viewState
	careerOpsPath   string
	theme           theme.Theme
	catalog         i18n.Catalog
	progressMetrics model.ProgressMetrics
}

func (m appModel) currentCatalog() i18n.Catalog {
	if m.catalog.Code == "" {
		return i18n.En
	}
	return m.catalog
}

func (m *appModel) reloadPipelineData() {
	apps := data.ParseApplications(m.careerOpsPath)
	metrics := data.ComputeMetrics(apps)
	m.progressMetrics = data.ComputeProgressMetrics(apps)
	m.pipeline = m.pipeline.WithReloadedData(apps, metrics)
}

func (m appModel) Init() tea.Cmd {
	return nil
}

func (m appModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.pipeline.Resize(msg.Width, msg.Height)
		if m.state == viewReport {
			m.viewer.Resize(msg.Width, msg.Height)
		}
		if m.state == viewProgress {
			m.progress.Resize(msg.Width, msg.Height)
		}
		pm, cmd := m.pipeline.Update(msg)
		m.pipeline = pm
		return m, cmd

	case screens.PipelineClosedMsg:
		return m, tea.Quit

	case screens.PipelineLoadReportMsg:
		archetype, tldr, remote, comp := data.LoadReportSummary(msg.CareerOpsPath, msg.ReportPath)
		m.pipeline.EnrichReport(msg.ReportPath, archetype, tldr, remote, comp)
		return m, nil

	case screens.PipelineUpdateStatusMsg:
		err := data.UpdateApplicationStatus(msg.CareerOpsPath, msg.App, msg.NewStatus)
		if err != nil {
			// Log the error but still reload data to keep UI consistent
			fmt.Fprintf(os.Stderr, "WARN: status update failed: %v\n", err)
		}
		m.reloadPipelineData()
		return m, nil

	case screens.PipelineRefreshMsg:
		m.reloadPipelineData()
		return m, nil

	case screens.PipelineOpenReportMsg:
		m.viewer = screens.NewViewerModel(
			m.theme,
			msg.Path, msg.Title,
			m.pipeline.Width(), m.pipeline.Height(),
			m.currentCatalog(),
		)
		m.state = viewReport
		return m, nil

	case screens.ViewerClosedMsg:
		m.state = viewPipeline
		return m, nil

	case screens.PipelineOpenProgressMsg:
		m.progress = screens.NewProgressModel(
			m.theme,
			m.progressMetrics,
			m.pipeline.Width(), m.pipeline.Height(),
			m.currentCatalog(),
		)
		m.state = viewProgress
		return m, nil

	case screens.ProgressClosedMsg:
		m.state = viewPipeline
		return m, nil

	case screens.PipelineOpenURLMsg:
		cmd, openErr := safeExternalURLCommand(msg.URL, runtime.GOOS)
		if openErr != nil {
			fmt.Fprintf(os.Stderr, "WARN: refused URL open: %v\n", openErr)
			return m, nil
		}
		return m, func() tea.Msg {
			_ = cmd.Run()
			return nil
		}

	default:
		if m.state == viewReport {
			vm, cmd := m.viewer.Update(msg)
			m.viewer = vm
			return m, cmd
		}
		if m.state == viewProgress {
			pg, cmd := m.progress.Update(msg)
			m.progress = pg
			return m, cmd
		}
		pm, cmd := m.pipeline.Update(msg)
		m.pipeline = pm
		return m, cmd
	}
}

func safeExternalURLCommand(rawURL, goos string) (*exec.Cmd, error) {
	if strings.TrimSpace(rawURL) != rawURL || strings.ContainsAny(rawURL, "\r\n\x00") {
		return nil, fmt.Errorf("URL contains unsafe whitespace or control characters")
	}
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}
	if (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return nil, fmt.Errorf("only absolute http(s) URLs may be opened")
	}

	switch goos {
	case "darwin":
		return exec.Command("open", rawURL), nil
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", rawURL), nil
	default:
		return exec.Command("xdg-open", rawURL), nil
	}
}

func (m appModel) View() string {
	switch m.state {
	case viewReport:
		return m.viewer.View()
	case viewProgress:
		return m.progress.View()
	default:
		return m.pipeline.View()
	}
}

func run(careerOpsPath string) error {
	return runLocalized(careerOpsPath, i18n.En)
}

func runLocalized(careerOpsPath string, catalog i18n.Catalog) error {
	// Load applications
	apps := data.ParseApplications(careerOpsPath)
	if apps == nil {
		return fmt.Errorf(
			"could not find applications.md in %s or %s/data/",
			careerOpsPath,
			careerOpsPath,
		)
	}

	// Compute metrics
	metrics := data.ComputeMetrics(apps)
	progressMetrics := data.ComputeProgressMetrics(apps)

	// Batch-load all report summaries
	t := theme.NewTheme("auto")
	pm := screens.NewPipelineModel(t, apps, metrics, careerOpsPath, 120, 40, catalog)

	for _, app := range apps {
		if app.ReportPath == "" {
			continue
		}
		archetype, tldr, remote, comp := data.LoadReportSummary(careerOpsPath, app.ReportPath)
		if archetype != "" || tldr != "" || remote != "" || comp != "" {
			pm.EnrichReport(app.ReportPath, archetype, tldr, remote, comp)
		}
	}

	m := appModel{
		pipeline:        pm,
		careerOpsPath:   careerOpsPath,
		theme:           t,
		catalog:         catalog,
		progressMetrics: progressMetrics,
	}

	p := newTeaProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		return err
	}
	return nil
}

func main() {
	pathFlag := flag.String("path", ".", "Path to jobhunt directory")
	defaultLanguage := os.Getenv("JOBHUNT_LANG")
	if defaultLanguage == "" {
		defaultLanguage = "en"
	}
	langFlag := flag.String("lang", defaultLanguage, "Dashboard language: en, de, fr, or ja")
	flag.Parse()

	catalog, languageErr := i18n.Resolve(*langFlag)
	if languageErr != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", languageErr)
		os.Exit(2)
	}
	if err := runLocalized(*pathFlag, catalog); err != nil {
		if !errors.Is(err, flag.ErrHelp) {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		}
		os.Exit(1)
	}
}
