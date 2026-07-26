package screens

import (
	"fmt"
	"sort"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/data"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/i18n"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
	"github.com/moshehbenavraham/jobhunt/dashboard/internal/theme"
)

// PipelineClosedMsg is emitted when the pipeline screen is dismissed.
type PipelineClosedMsg struct{}

// PipelineOpenReportMsg is emitted when a report should be opened in FileViewer.
type PipelineOpenReportMsg struct {
	Path   string
	Title  string
	JobURL string
}

// PipelineOpenURLMsg is emitted when a job URL should be opened in browser.
type PipelineOpenURLMsg struct {
	URL string
}

// PipelineLoadReportMsg requests lazy loading of a report summary.
type PipelineLoadReportMsg struct {
	CareerOpsPath string
	ReportPath    string
}

// PipelineUpdateStatusMsg requests a status update for an application.
type PipelineUpdateStatusMsg struct {
	CareerOpsPath string
	App           model.CareerApplication
	NewStatus     string
}

// PipelineRefreshMsg requests a full tracker reload from disk.
type PipelineRefreshMsg struct{}

// PipelineOpenProgressMsg is emitted when the progress screen should open.
type PipelineOpenProgressMsg struct{}

type reportSummary struct {
	archetype string
	tldr      string
	remote    string
	comp      string
}

// Sort modes
const (
	sortScore   = "score"
	sortDate    = "date"
	sortCompany = "company"
	sortStatus  = "status"
)

// Filter modes
const (
	filterAll       = "all"
	filterEvaluated = "evaluated"
	filterApplied   = "applied"
	filterInterview = "interview"
	filterSkip      = "skip"
	filterRejected  = "rejected"
	filterDiscarded = "discarded"
	filterTop       = "top"
)

type pipelineTab struct {
	filter string
	label  string
	abbrev string
}

var pipelineTabs = []pipelineTab{
	{filterAll, "ALL", "ALL"},
	{filterEvaluated, "EVALUATED", "EVAL"},
	{filterApplied, "APPLIED", "APP"},
	{filterInterview, "INTERVIEW", "INT"},
	{filterTop, "TOP ≥4", "TOP"},
	{filterSkip, "SKIP", "SKIP"},
	{filterRejected, "REJECTED", "REJ"},
	{filterDiscarded, "DISCARDED", "DISC"},
}

var sortCycle = []string{sortScore, sortDate, sortCompany, sortStatus}

var statusOptions = []string{"Evaluated", "Applied", "Responded", "Interview", "Offer", "Hired", "Rejected", "Discarded", "SKIP"}

// statusGroupOrder defines display order for grouped view.
var statusGroupOrder = []string{"hired", "interview", "offer", "responded", "applied", "evaluated", "skip", "rejected", "discarded"}

// PipelineModel implements the career pipeline dashboard screen.
type PipelineModel struct {
	apps          []model.CareerApplication
	filtered      []model.CareerApplication
	metrics       model.PipelineMetrics
	cursor        int
	scrollOffset  int
	sortMode      string
	activeTab     int
	viewMode      string // "grouped" or "flat"
	width, height int
	theme         theme.Theme
	catalog       i18n.Catalog
	careerOpsPath string
	reportCache   map[string]reportSummary
	searchActive  bool
	searchQuery   string
	// Status picker sub-state
	statusPicker bool
	statusCursor int
}

// NewPipelineModel creates a new pipeline screen.
func NewPipelineModel(t theme.Theme, apps []model.CareerApplication, metrics model.PipelineMetrics, careerOpsPath string, width, height int, catalogs ...i18n.Catalog) PipelineModel {
	catalog := i18n.En
	if len(catalogs) > 0 {
		catalog = catalogs[0]
	}
	m := PipelineModel{
		apps:          apps,
		metrics:       metrics,
		sortMode:      sortScore,
		activeTab:     0,
		viewMode:      "grouped",
		width:         width,
		height:        height,
		theme:         t,
		catalog:       catalog,
		careerOpsPath: careerOpsPath,
		reportCache:   make(map[string]reportSummary),
	}
	m.applyFilterAndSort()
	return m
}

// Init implements tea.Model.
func (m PipelineModel) Init() tea.Cmd {
	return nil
}

// Resize updates dimensions.
func (m *PipelineModel) Resize(width, height int) {
	m.width = width
	m.height = height
}

// Width returns the current width.
func (m PipelineModel) Width() int { return m.width }

// Height returns the current height.
func (m PipelineModel) Height() int { return m.height }

// CopyReportCache copies the report cache from another pipeline model.
func (m *PipelineModel) CopyReportCache(other *PipelineModel) {
	for k, v := range other.reportCache {
		m.reportCache[k] = v
	}
}

// EnrichReport caches report summary data for preview.
func (m *PipelineModel) EnrichReport(reportPath, archetype, tldr, remote, comp string) {
	m.reportCache[reportPath] = reportSummary{
		archetype: archetype,
		tldr:      tldr,
		remote:    remote,
		comp:      comp,
	}
}

// WithReloadedData rebuilds the pipeline with fresh tracker data while preserving
// the current UI state so manual refresh feels seamless.
func (m PipelineModel) WithReloadedData(apps []model.CareerApplication, metrics model.PipelineMetrics) PipelineModel {
	selectedReportPath := ""
	selectedCompany := ""
	selectedRole := ""
	if app, ok := m.CurrentApp(); ok {
		selectedReportPath = app.ReportPath
		selectedCompany = app.Company
		selectedRole = app.Role
	}

	reloaded := NewPipelineModel(m.theme, apps, metrics, m.careerOpsPath, m.width, m.height, m.catalog)
	reloaded.sortMode = m.sortMode
	reloaded.activeTab = m.activeTab
	reloaded.viewMode = m.viewMode
	reloaded.searchActive = m.searchActive
	reloaded.searchQuery = m.searchQuery
	reloaded.applyFilterAndSort()
	reloaded.CopyReportCache(&m)

	for i, app := range reloaded.filtered {
		if selectedReportPath != "" && app.ReportPath == selectedReportPath {
			reloaded.cursor = i
			reloaded.adjustScroll()
			return reloaded
		}
		if selectedReportPath == "" && app.Company == selectedCompany && app.Role == selectedRole {
			reloaded.cursor = i
			reloaded.adjustScroll()
			return reloaded
		}
	}

	if len(reloaded.filtered) == 0 {
		reloaded.cursor = 0
		reloaded.scrollOffset = 0
		return reloaded
	}

	if m.cursor >= len(reloaded.filtered) {
		reloaded.cursor = len(reloaded.filtered) - 1
	} else if m.cursor > 0 {
		reloaded.cursor = m.cursor
	}
	reloaded.adjustScroll()
	return reloaded
}

// CurrentApp returns the currently selected application, if any.
func (m PipelineModel) CurrentApp() (model.CareerApplication, bool) {
	if m.cursor < 0 || m.cursor >= len(m.filtered) {
		return model.CareerApplication{}, false
	}
	return m.filtered[m.cursor], true
}

// Update handles input for the pipeline screen.
func (m PipelineModel) Update(msg tea.Msg) (PipelineModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		if m.statusPicker {
			return m.handleStatusPicker(msg)
		}
		if m.searchActive {
			return m.handleSearchInput(msg)
		}
		return m.handleKey(msg)
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	}
	return m, nil
}

func (m PipelineModel) handleKey(msg tea.KeyMsg) (PipelineModel, tea.Cmd) {
	switch msg.String() {
	case "q", "esc":
		return m, func() tea.Msg { return PipelineClosedMsg{} }

	case "/":
		m.searchActive = true
		return m, nil

	case "ctrl+l":
		m.searchQuery = ""
		m.applyFilterAndSort()
		m.cursor = 0
		m.scrollOffset = 0

	case "down", "j":
		if len(m.filtered) > 0 {
			m.cursor++
			if m.cursor >= len(m.filtered) {
				m.cursor = len(m.filtered) - 1
			}
			m.adjustScroll()
			return m, m.loadCurrentReport()
		}

	case "up", "k":
		if len(m.filtered) > 0 {
			m.cursor--
			if m.cursor < 0 {
				m.cursor = 0
			}
			m.adjustScroll()
			return m, m.loadCurrentReport()
		}

	case "s":
		// Cycle sort mode
		for i, s := range sortCycle {
			if s == m.sortMode {
				m.sortMode = sortCycle[(i+1)%len(sortCycle)]
				break
			}
		}
		m.applyFilterAndSort()
		m.cursor = 0
		m.scrollOffset = 0

	case "f", "right", "l":
		m.activeTab++
		if m.activeTab >= len(pipelineTabs) {
			m.activeTab = 0
		}
		m.applyFilterAndSort()
		m.cursor = 0
		m.scrollOffset = 0

	case "left", "h":
		m.activeTab--
		if m.activeTab < 0 {
			m.activeTab = len(pipelineTabs) - 1
		}
		m.applyFilterAndSort()
		m.cursor = 0
		m.scrollOffset = 0

	case "v":
		if m.viewMode == "grouped" {
			m.viewMode = "flat"
		} else {
			m.viewMode = "grouped"
		}

	case "enter":
		if app, ok := m.CurrentApp(); ok && app.ReportPath != "" {
			fullPath, resolveErr := data.ResolveReportPath(m.careerOpsPath, app.ReportPath)
			if resolveErr != nil {
				return m, nil
			}
			title := fmt.Sprintf("%s — %s", app.Company, app.Role)
			jobURL := app.JobURL
			return m, func() tea.Msg {
				return PipelineOpenReportMsg{Path: fullPath, Title: title, JobURL: jobURL}
			}
		}

	case "o":
		if app, ok := m.CurrentApp(); ok && app.JobURL != "" {
			return m, func() tea.Msg {
				return PipelineOpenURLMsg{URL: app.JobURL}
			}
		}

	case "p":
		return m, func() tea.Msg { return PipelineOpenProgressMsg{} }

	case "r":
		return m, func() tea.Msg { return PipelineRefreshMsg{} }

	case "c":
		if len(m.filtered) > 0 {
			m.statusPicker = true
			m.statusCursor = 0
		}

	case "g":
		if len(m.filtered) > 0 {
			m.cursor = 0
			m.scrollOffset = 0
			return m, m.loadCurrentReport()
		}

	case "G":
		if len(m.filtered) > 0 {
			m.cursor = len(m.filtered) - 1
			m.adjustScroll()
			return m, m.loadCurrentReport()
		}

	case "pgdown", "ctrl+d":
		if len(m.filtered) > 0 {
			halfPage := m.height / 2
			if halfPage < 1 {
				halfPage = 1
			}
			m.cursor += halfPage
			if m.cursor >= len(m.filtered) {
				m.cursor = len(m.filtered) - 1
			}
			m.adjustScroll()
			return m, m.loadCurrentReport()
		}

	case "pgup", "ctrl+u":
		if len(m.filtered) > 0 {
			halfPage := m.height / 2
			if halfPage < 1 {
				halfPage = 1
			}
			m.cursor -= halfPage
			if m.cursor < 0 {
				m.cursor = 0
			}
			m.adjustScroll()
			return m, m.loadCurrentReport()
		}
	}

	return m, nil
}

func (m PipelineModel) handleSearchInput(msg tea.KeyMsg) (PipelineModel, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc, tea.KeyEnter:
		m.searchActive = false
	case tea.KeyBackspace, tea.KeyDelete:
		runes := []rune(m.searchQuery)
		if len(runes) > 0 {
			m.searchQuery = string(runes[:len(runes)-1])
		}
	case tea.KeyCtrlU:
		m.searchQuery = ""
	case tea.KeyRunes:
		m.searchQuery += string(msg.Runes)
	}

	m.applyFilterAndSort()
	m.cursor = 0
	m.scrollOffset = 0
	return m, nil
}

func (m PipelineModel) handleStatusPicker(msg tea.KeyMsg) (PipelineModel, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.statusPicker = false
		return m, nil

	case "down", "j":
		m.statusCursor++
		if m.statusCursor >= len(statusOptions) {
			m.statusCursor = len(statusOptions) - 1
		}

	case "up", "k":
		m.statusCursor--
		if m.statusCursor < 0 {
			m.statusCursor = 0
		}

	case "enter":
		m.statusPicker = false
		if app, ok := m.CurrentApp(); ok {
			newStatus := statusOptions[m.statusCursor]
			return m, func() tea.Msg {
				return PipelineUpdateStatusMsg{
					CareerOpsPath: m.careerOpsPath,
					App:           app,
					NewStatus:     newStatus,
				}
			}
		}
	}
	return m, nil
}

func (m PipelineModel) loadCurrentReport() tea.Cmd {
	app, ok := m.CurrentApp()
	if !ok || app.ReportPath == "" {
		return nil
	}
	if _, cached := m.reportCache[app.ReportPath]; cached {
		return nil
	}
	path := m.careerOpsPath
	report := app.ReportPath
	return func() tea.Msg {
		return PipelineLoadReportMsg{CareerOpsPath: path, ReportPath: report}
	}
}

// applyFilterAndSort rebuilds the filtered list from apps.
func (m *PipelineModel) applyFilterAndSort() {
	var filtered []model.CareerApplication

	currentFilter := pipelineTabs[m.activeTab].filter
	for _, app := range m.apps {
		norm := data.NormalizeStatus(app.Status)
		if !m.matchesSearch(app) {
			continue
		}
		switch currentFilter {
		case filterAll:
			filtered = append(filtered, app)
		case filterTop:
			if app.Score >= 4.0 && norm != "skip" {
				filtered = append(filtered, app)
			}
		default:
			if norm == currentFilter {
				filtered = append(filtered, app)
			}
		}
	}

	// Sort
	switch m.sortMode {
	case sortScore:
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].Score > filtered[j].Score
		})
	case sortDate:
		sort.SliceStable(filtered, func(i, j int) bool {
			return filtered[i].Date > filtered[j].Date
		})
	case sortCompany:
		sort.SliceStable(filtered, func(i, j int) bool {
			return strings.ToLower(filtered[i].Company) < strings.ToLower(filtered[j].Company)
		})
	case sortStatus:
		sort.SliceStable(filtered, func(i, j int) bool {
			return data.StatusPriority(filtered[i].Status) < data.StatusPriority(filtered[j].Status)
		})
	}

	// In grouped mode, always sort by status priority first, then by selected sort within groups
	if m.viewMode == "grouped" {
		sort.SliceStable(filtered, func(i, j int) bool {
			pi := data.StatusPriority(filtered[i].Status)
			pj := data.StatusPriority(filtered[j].Status)
			if pi != pj {
				return pi < pj
			}
			// Within same group, use selected sort
			switch m.sortMode {
			case sortScore:
				return filtered[i].Score > filtered[j].Score
			case sortDate:
				return filtered[i].Date > filtered[j].Date
			case sortCompany:
				return strings.ToLower(filtered[i].Company) < strings.ToLower(filtered[j].Company)
			default:
				return filtered[i].Score > filtered[j].Score
			}
		})
	}

	m.filtered = filtered
}

func (m PipelineModel) matchesSearch(app model.CareerApplication) bool {
	query := strings.ToLower(strings.TrimSpace(m.searchQuery))
	if query == "" {
		return true
	}

	fields := []string{
		app.Company,
		app.Role,
		app.Location,
		app.Via,
		app.Compensation,
		app.Contact,
		app.Status,
		app.Date,
		app.Notes,
		app.JobURL,
		app.ReportPath,
	}
	if summary, ok := m.reportCache[app.ReportPath]; ok {
		fields = append(fields, summary.archetype, summary.tldr, summary.remote, summary.comp)
	}
	haystack := strings.ToLower(strings.Join(fields, "\n"))
	for _, token := range strings.Fields(query) {
		if !strings.Contains(haystack, token) {
			return false
		}
	}
	return true
}

// adjustScroll updates scrollOffset so the cursor stays visible.
func (m *PipelineModel) adjustScroll() {
	availHeight := m.height - 12 // header + tabs(2) + metrics + sortbar + footer + preview
	if availHeight < 5 {
		availHeight = 5
	}
	line := m.cursorLineEstimate()
	margin := 3

	if line >= m.scrollOffset+availHeight-margin {
		m.scrollOffset = line - availHeight + margin + 1
	}
	if line < m.scrollOffset+margin {
		m.scrollOffset = line - margin
	}
	if m.scrollOffset < 0 {
		m.scrollOffset = 0
	}
}

func (m PipelineModel) cursorLineEstimate() int {
	if m.viewMode != "grouped" {
		return m.cursor
	}
	// Account for group headers
	line := 0
	prevStatus := ""
	for i, app := range m.filtered {
		norm := data.NormalizeStatus(app.Status)
		if norm != prevStatus {
			line++ // group header
			prevStatus = norm
		}
		if i == m.cursor {
			return line
		}
		line++
	}
	return line
}

// -- View --

// View renders the pipeline screen.
func (m PipelineModel) View() string {
	header := m.renderHeader()
	tabs := m.renderTabs()
	metricsBar := m.renderMetrics()
	sortBar := m.renderSortBar()
	body := m.renderBody()
	preview := m.renderPreview()
	help := m.renderHelp()

	// Apply scroll to body
	bodyLines := strings.Split(body, "\n")
	totalBodyLines := len(bodyLines)
	if m.scrollOffset > 0 && m.scrollOffset < len(bodyLines) {
		bodyLines = bodyLines[m.scrollOffset:]
	}

	// Calculate available height for body
	previewLines := strings.Count(preview, "\n") + 1
	availHeight := m.height - 7 - previewLines // header + tabs(2) + metrics + sortbar + help + preview
	if availHeight < 3 {
		availHeight = 3
	}
	if len(bodyLines) > availHeight {
		bodyLines = bodyLines[:availHeight]
	}

	if totalBodyLines > availHeight && availHeight > 0 && len(bodyLines) > 0 {
		scrollRange := totalBodyLines - availHeight
		thumbPos := 0
		if scrollRange > 0 {
			thumbPos = int(float64(m.scrollOffset) * float64(availHeight-1) / float64(scrollRange))
		}
		if thumbPos >= len(bodyLines) {
			thumbPos = len(bodyLines) - 1
		}
		indicator := lipgloss.NewStyle().Foreground(m.theme.Overlay).Render(theme.Block1_4)
		line := bodyLines[thumbPos]
		lineW := lipgloss.Width(line)
		if lineW < m.width {
			bodyLines[thumbPos] = line + strings.Repeat(" ", m.width-lineW-1) + indicator
		}
	}

	body = strings.Join(bodyLines, "\n")

	// Status picker overlay
	if m.statusPicker {
		body = m.overlayStatusPicker(body)
	}

	return lipgloss.JoinVertical(lipgloss.Left,
		header,
		tabs,
		metricsBar,
		sortBar,
		body,
		preview,
		help,
	)
}

func (m PipelineModel) renderHeader() string {
	shelf := m.theme.Shelf(m.width)

	info := m.theme.Supporting().Render(
		fmt.Sprintf(m.catalog.ApplicationsSummary, m.metrics.Total, m.metrics.AvgScore))
	title := m.theme.Display(m.theme.Blue).Render(m.catalog.AppTitle)

	gap := m.width - lipgloss.Width(title) - lipgloss.Width(info) - 4
	if gap < 1 {
		gap = 1
	}

	return shelf.Render(title + strings.Repeat(" ", gap) + info)
}

func (m PipelineModel) renderTabs() string {
	var tabs []string
	var underParts []string

	wc := theme.ClassifyWidth(m.width)

	for i, tab := range pipelineTabs {
		count := m.countForFilter(tab.filter)
		tabLabel, abbreviation := m.tabLabels(tab.filter)
		if wc == theme.WidthMinimum {
			tabLabel = abbreviation
		}
		label := fmt.Sprintf(" %s (%d) ", tabLabel, count)

		if i == m.activeTab {
			style := lipgloss.NewStyle().
				Bold(true).
				Foreground(m.theme.Blue).
				Padding(0, 0)
			tabs = append(tabs, style.Render(label))
			underParts = append(underParts, strings.Repeat("━", lipgloss.Width(label)))
		} else {
			style := lipgloss.NewStyle().
				Foreground(m.theme.Subtext).
				Padding(0, 0)
			tabs = append(tabs, style.Render(label))
			underParts = append(underParts, strings.Repeat("─", lipgloss.Width(label)))
		}
	}

	row := lipgloss.JoinHorizontal(lipgloss.Top, tabs...)
	underline := lipgloss.NewStyle().Foreground(m.theme.Overlay).Render(strings.Join(underParts, ""))

	padStyle := lipgloss.NewStyle().Padding(0, 1)
	return padStyle.Render(row) + "\n" + padStyle.Render(underline)
}

func (m PipelineModel) tabLabels(filter string) (string, string) {
	switch filter {
	case filterEvaluated:
		return m.catalog.TabEvaluated, m.catalog.AbbrevEvaluated
	case filterApplied:
		return m.catalog.TabApplied, m.catalog.AbbrevApplied
	case filterInterview:
		return m.catalog.TabInterview, m.catalog.AbbrevInterview
	case filterTop:
		return m.catalog.TabTop, m.catalog.AbbrevTop
	case filterSkip:
		return m.catalog.TabSkip, m.catalog.AbbrevSkip
	case filterRejected:
		return m.catalog.TabRejected, m.catalog.AbbrevRejected
	case filterDiscarded:
		return m.catalog.TabDiscarded, m.catalog.AbbrevDiscarded
	default:
		return m.catalog.TabAll, m.catalog.AbbrevAll
	}
}

func (m PipelineModel) countForFilter(filter string) int {
	count := 0
	for _, app := range m.apps {
		norm := data.NormalizeStatus(app.Status)
		switch filter {
		case filterAll:
			count++
		case filterTop:
			if app.Score >= 4.0 && norm != "skip" {
				count++
			}
		default:
			if norm == filter {
				count++
			}
		}
	}
	return count
}

func (m PipelineModel) renderMetrics() string {
	shelf := m.theme.Shelf(m.width)

	var parts []string
	for _, status := range statusGroupOrder {
		count, ok := m.metrics.ByStatus[status]
		if !ok || count == 0 {
			continue
		}
		s := lipgloss.NewStyle().Foreground(m.theme.StatusColor(status))
		parts = append(parts, s.Render(fmt.Sprintf("%s:%d", m.catalog.StatusLabel(status), count)))
	}
	if m.metrics.WithPDF > 0 {
		pdfMetrics := fmt.Sprintf(
			m.catalog.PDFMetricsFormat,
			m.metrics.FreshPDF,
			m.metrics.StalePDF,
			m.metrics.LegacyPDF,
		)
		parts = append(parts, lipgloss.NewStyle().Foreground(m.theme.Subtext).Render(pdfMetrics))
	}

	return shelf.Render(strings.Join(parts, "  "))
}

func (m PipelineModel) renderSortBar() string {
	style := lipgloss.NewStyle().
		Foreground(m.theme.Subtext).
		Width(m.width).
		Padding(0, 2)

	sortLabel := fmt.Sprintf(m.catalog.SortFormat, m.catalog.SortLabel(m.sortMode))
	viewLabel := fmt.Sprintf(m.catalog.ViewFormat, m.catalog.ViewLabel(m.viewMode))
	count := fmt.Sprintf(m.catalog.ShownFormat, len(m.filtered))
	searchLabel := m.catalog.SearchIdle
	if m.searchActive {
		searchLabel = fmt.Sprintf(m.catalog.SearchActive, m.searchQuery)
	} else if m.searchQuery != "" {
		searchLabel = fmt.Sprintf(m.catalog.SearchClosed, m.searchQuery)
	}

	return style.Render(fmt.Sprintf("%s  %s  %s  %s", sortLabel, viewLabel, searchLabel, count))
}

func (m PipelineModel) renderBody() string {
	if len(m.filtered) == 0 {
		return m.renderEmptyState()
	}

	var lines []string
	prevStatus := ""
	padStyle := lipgloss.NewStyle().Padding(0, 2)

	for i, app := range m.filtered {
		norm := data.NormalizeStatus(app.Status)

		// Group header in grouped mode
		if m.viewMode == "grouped" && norm != prevStatus {
			count := m.countByNormStatus(norm)
			headerStyle := lipgloss.NewStyle().
				Bold(true).
				Foreground(m.theme.Subtext)
			lines = append(lines, padStyle.Render(
				headerStyle.Render(fmt.Sprintf("── %s (%d) %s",
					strings.ToUpper(m.catalog.StatusLabel(norm)), count,
					strings.Repeat("─", max(0, m.width-30-len([]rune(m.catalog.StatusLabel(norm))))))),
			))
			prevStatus = norm
		}

		selected := i == m.cursor
		line := m.renderAppLine(app, selected)
		lines = append(lines, line)
	}

	return strings.Join(lines, "\n")
}

func (m PipelineModel) renderEmptyState() string {
	availHeight := m.height - 7
	if availHeight < 3 {
		availHeight = 3
	}

	var msg string
	if len(m.apps) == 0 {
		msg = m.catalog.NoApplications
	} else {
		msg = m.catalog.NoMatches
	}

	msgStyle := lipgloss.NewStyle().
		Foreground(m.theme.Subtext).
		Width(m.width).
		Align(lipgloss.Center)

	msgLines := strings.Count(msg, "\n") + 1
	topPad := (availHeight - msgLines) / 2
	if topPad < 0 {
		topPad = 0
	}

	return strings.Repeat("\n", topPad) + msgStyle.Render(msg)
}

func (m PipelineModel) renderAppLine(app model.CareerApplication, selected bool) string {
	padStyle := lipgloss.NewStyle().Padding(0, 2)
	wc := theme.ClassifyWidth(m.width)

	scoreW := 5
	numW := 5
	dateW := 10
	companyW := 16
	statusW := 12
	compW := 14
	showComp := true

	switch wc {
	case theme.WidthMinimum:
		companyW = 10
		showComp = false
		compW = 0
	case theme.WidthCinematic:
		companyW = 20
		compW = 18
	}

	// chrome: pad(4) + accent(1) + gauge+space(2) + col widths + inter-col spaces(7)
	chrome := 4 + 1 + 2 + numW + scoreW + dateW + companyW + statusW + 7
	if showComp {
		chrome += compW
	}
	roleW := m.width - chrome
	if roleW < 15 {
		roleW = 15
	}

	gauge := m.theme.ScoreGaugeStyle(app.Score)

	numText := "#-"
	if app.Number > 0 {
		numText = fmt.Sprintf("#%d", app.Number)
	}
	numStyle := lipgloss.NewStyle().Foreground(m.theme.Blue).Bold(true).Width(numW)

	ss := m.scoreStyle(app.Score)
	score := ss.Render(fmt.Sprintf("%.1f", app.Score))

	company := truncateRunes(app.Company, companyW)
	companyStyle := lipgloss.NewStyle().Foreground(m.theme.Text).Width(companyW)

	dateText := app.Date
	if dateText == "" {
		dateText = "—"
	}
	dateStyle := lipgloss.NewStyle().Foreground(m.theme.Subtext).Width(dateW)

	role := truncateRunes(app.Role, roleW)
	roleStyle := lipgloss.NewStyle().Foreground(m.theme.Subtext).Width(roleW)

	norm := data.NormalizeStatus(app.Status)
	statusColor := m.theme.StatusColor(norm)
	statusStyle := lipgloss.NewStyle().Foreground(statusColor).Width(statusW)
	statusValue := m.catalog.StatusLabel(norm)
	if marker := pdfStatusMarker(app.PDFStatus); marker != "" {
		statusValue += " " + marker
	}
	statusText := statusStyle.Render(truncateRunes(statusValue, statusW))

	content := fmt.Sprintf("%s %s %s %s %s %s %s",
		gauge,
		numStyle.Render(truncateRunes(numText, numW)),
		score,
		dateStyle.Render(truncateRunes(dateText, dateW)),
		companyStyle.Render(company),
		roleStyle.Render(role),
		statusText,
	)

	if showComp {
		compText := ""
		if summary, ok := m.reportCache[app.ReportPath]; ok && summary.comp != "" {
			comp := truncateRunes(summary.comp, compW-1)
			compText = lipgloss.NewStyle().Foreground(m.theme.Yellow).Render(comp)
		}
		content += " " + compText
	}

	if selected {
		accentBar := lipgloss.NewStyle().Foreground(statusColor).Render(theme.BlockFull)
		selStyle := lipgloss.NewStyle().
			Background(m.theme.Overlay).
			Width(m.width - 5)
		return padStyle.Render(accentBar + selStyle.Render(content))
	}
	return padStyle.Render(" " + content)
}

func (m PipelineModel) renderPreview() string {
	app, ok := m.CurrentApp()
	if !ok {
		return ""
	}

	padStyle := lipgloss.NewStyle().Padding(0, 2)
	divider := m.theme.Structural()

	var lines []string
	lines = append(lines, padStyle.Render(divider.Render(strings.Repeat("─", m.width-4))))

	labelStyle := lipgloss.NewStyle().Foreground(m.theme.Sky).Bold(true)
	valueStyle := lipgloss.NewStyle().Foreground(m.theme.Text)
	dimStyle := lipgloss.NewStyle().Foreground(m.theme.Subtext)

	wc := theme.ClassifyWidth(m.width)

	if app.HasPDF {
		pdfText := m.pdfStatusLabel(app.PDFStatus)
		if app.PDFIssue != "" {
			pdfText += " — " + app.PDFIssue
		}
		lines = append(lines, padStyle.Render(
			labelStyle.Render(m.catalog.LabelPDF)+valueStyle.Render(truncateRunes(pdfText, m.width-10))))
	}

	if summary, ok := m.reportCache[app.ReportPath]; ok {
		if wc >= theme.WidthStandard && summary.archetype != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render(m.catalog.LabelArchetype)+valueStyle.Render(summary.archetype)))
		}
		if summary.tldr != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render(m.catalog.LabelTLDR)+valueStyle.Render(summary.tldr)))
		}
		if wc >= theme.WidthStandard && summary.comp != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render(m.catalog.LabelComp)+valueStyle.Render(summary.comp)))
		}
		if wc >= theme.WidthComfortable && summary.remote != "" {
			lines = append(lines, padStyle.Render(
				labelStyle.Render(m.catalog.LabelRemote)+valueStyle.Render(summary.remote)))
		}
	}
	if app.Location != "" {
		lines = append(lines, padStyle.Render(
			labelStyle.Render(m.catalog.LabelLocation)+valueStyle.Render(app.Location)))
	}
	if app.Compensation != "" {
		lines = append(lines, padStyle.Render(
			labelStyle.Render(m.catalog.LabelCompensation)+valueStyle.Render(app.Compensation)))
	}
	if app.Contact != "" || app.Via != "" {
		contact := app.Contact
		if contact == "" {
			contact = app.Via
		}
		lines = append(lines, padStyle.Render(
			labelStyle.Render(m.catalog.LabelContact)+valueStyle.Render(contact)))
	}
	if _, ok := m.reportCache[app.ReportPath]; !ok && app.Notes != "" {
		notes := truncateRunes(app.Notes, m.width-10)
		lines = append(lines, padStyle.Render(dimStyle.Render(notes)))
	} else if _, ok := m.reportCache[app.ReportPath]; !ok && app.Notes == "" &&
		app.Location == "" && app.Compensation == "" && app.Contact == "" && app.Via == "" {
		lines = append(lines, padStyle.Render(dimStyle.Render(m.catalog.LoadingPreview)))
	}

	return strings.Join(lines, "\n")
}

func (m PipelineModel) renderHelp() string {
	style := m.theme.Shelf(m.width).Padding(0, 1)

	keyStyle := m.theme.Body().Bold(true)
	descStyle := m.theme.Supporting()

	if m.statusPicker {
		return style.Render(
			keyStyle.Render("↑↓/jk") + descStyle.Render(" "+m.catalog.HelpNavigate+"  ") +
				keyStyle.Render("Enter") + descStyle.Render(" "+m.catalog.HelpConfirm+"  ") +
				keyStyle.Render("Esc") + descStyle.Render(" "+m.catalog.HelpCancel))
	}
	if m.searchActive {
		return style.Render(
			keyStyle.Render("type") + descStyle.Render(" "+m.catalog.HelpSearch+"  ") +
				keyStyle.Render("Backspace") + descStyle.Render(" "+m.catalog.HelpEdit+"  ") +
				keyStyle.Render("Ctrl+U") + descStyle.Render(" "+m.catalog.HelpClear+"  ") +
				keyStyle.Render("Enter/Esc") + descStyle.Render(" "+m.catalog.HelpClose))
	}

	brand := m.theme.Supporting().Render("jobhunt by aiwithapex.com")

	keys := keyStyle.Render("↑↓/jk") + descStyle.Render(" "+m.catalog.HelpNavigate+"  ") +
		keyStyle.Render("←→/hl") + descStyle.Render(" "+m.catalog.HelpTabs+"  ") +
		keyStyle.Render("s") + descStyle.Render(" "+m.catalog.HelpSort+"  ") +
		keyStyle.Render("/") + descStyle.Render(" "+m.catalog.HelpSearch+"  ") +
		keyStyle.Render("r") + descStyle.Render(" "+m.catalog.HelpRefresh+"  ") +
		keyStyle.Render("Enter") + descStyle.Render(" "+m.catalog.HelpReport+"  ") +
		keyStyle.Render("o") + descStyle.Render(" "+m.catalog.HelpOpenURL+"  ") +
		keyStyle.Render("c") + descStyle.Render(" "+m.catalog.HelpChange+"  ") +
		keyStyle.Render("v") + descStyle.Render(" "+m.catalog.HelpView+"  ") +
		keyStyle.Render("p") + descStyle.Render(" "+m.catalog.HelpProgress+"  ") +
		keyStyle.Render("Esc") + descStyle.Render(" "+m.catalog.HelpQuit)

	gap := m.width - lipgloss.Width(keys) - lipgloss.Width(brand) - 2
	if gap < 1 {
		gap = 1
	}

	return style.Render(keys + strings.Repeat(" ", gap) + brand)
}

func (m PipelineModel) overlayStatusPicker(body string) string {
	// Render status picker inline at bottom of body
	bodyLines := strings.Split(body, "\n")

	pickerWidth := 30
	padStyle := lipgloss.NewStyle().Padding(0, 2)
	borderStyle := lipgloss.NewStyle().
		Foreground(m.theme.Blue).
		Bold(true)

	var picker []string
	picker = append(picker, padStyle.Render(borderStyle.Render(m.catalog.ChangeStatus)))

	for i, opt := range statusOptions {
		style := lipgloss.NewStyle().Foreground(m.theme.Text).Width(pickerWidth)
		if i == m.statusCursor {
			style = style.Background(m.theme.Overlay).Bold(true)
		}
		prefix := "  "
		if i == m.statusCursor {
			prefix = "> "
		}
		picker = append(picker, padStyle.Render(style.Render(prefix+m.catalog.StatusLabel(data.NormalizeStatus(opt)))))
	}

	// Append picker to body
	bodyLines = append(bodyLines, picker...)
	return strings.Join(bodyLines, "\n")
}

// -- Helpers --

func (m PipelineModel) scoreStyle(score float64) lipgloss.Style {
	switch {
	case score >= 4.5:
		return lipgloss.NewStyle().Foreground(m.theme.Green).Bold(true)
	case score >= 4.0:
		return lipgloss.NewStyle().Foreground(m.theme.Green)
	case score >= 3.5:
		return lipgloss.NewStyle().Foreground(m.theme.Yellow)
	case score >= 3.0:
		return lipgloss.NewStyle().Foreground(m.theme.Text)
	default:
		return lipgloss.NewStyle().Foreground(m.theme.Red)
	}
}

func (m PipelineModel) countByNormStatus(status string) int {
	count := 0
	for _, app := range m.filtered {
		if data.NormalizeStatus(app.Status) == status {
			count++
		}
	}
	return count
}

// truncateRunes truncates a string to at most maxRunes runes, appending "..." if truncated.
func truncateRunes(s string, maxRunes int) string {
	runes := []rune(s)
	if len(runes) <= maxRunes {
		return s
	}
	if maxRunes <= 3 {
		return string(runes[:maxRunes])
	}
	return string(runes[:maxRunes-3]) + "..."
}

func statusLabel(norm string) string {
	return i18n.En.StatusLabel(norm)
}

func pdfStatusMarker(status string) string {
	switch status {
	case "fresh":
		return "P✓"
	case "stale":
		return "P!"
	case "legacy":
		return "P?"
	case "invalid", "missing":
		return "P×"
	default:
		return ""
	}
}

func (m PipelineModel) pdfStatusLabel(status string) string {
	switch status {
	case "fresh":
		return m.catalog.PDFFresh
	case "stale":
		return m.catalog.PDFStale
	case "legacy":
		return m.catalog.PDFLegacy
	case "invalid":
		return m.catalog.PDFInvalid
	case "missing":
		return m.catalog.PDFMissing
	default:
		return m.catalog.PDFNotBuilt
	}
}
