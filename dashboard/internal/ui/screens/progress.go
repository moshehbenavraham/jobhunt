package screens

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/santifer/career-ops/dashboard/internal/model"
	"github.com/santifer/career-ops/dashboard/internal/theme"
)

// ProgressClosedMsg is emitted when the progress screen is dismissed.
type ProgressClosedMsg struct{}

// ProgressModel implements the progress analytics screen.
type ProgressModel struct {
	metrics      model.ProgressMetrics
	scrollOffset int
	width        int
	height       int
	theme        theme.Theme
}

// NewProgressModel creates a new progress screen.
func NewProgressModel(t theme.Theme, metrics model.ProgressMetrics, width, height int) ProgressModel {
	return ProgressModel{
		metrics: metrics,
		width:   width,
		height:  height,
		theme:   t,
	}
}

// Init implements tea.Model.
func (m ProgressModel) Init() tea.Cmd {
	return nil
}

// Resize updates dimensions.
func (m *ProgressModel) Resize(width, height int) {
	m.width = width
	m.height = height
}

// Update handles input for the progress screen.
func (m ProgressModel) Update(msg tea.Msg) (ProgressModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc":
			return m, func() tea.Msg { return ProgressClosedMsg{} }
		case "down", "j":
			m.scrollOffset++
		case "up", "k":
			if m.scrollOffset > 0 {
				m.scrollOffset--
			}
		case "pgdown", "ctrl+d":
			m.scrollOffset += m.height / 2
		case "pgup", "ctrl+u":
			m.scrollOffset -= m.height / 2
			if m.scrollOffset < 0 {
				m.scrollOffset = 0
			}
		}
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	}
	return m, nil
}

// View renders the progress screen.
func (m ProgressModel) View() string {
	header := m.renderHeader()
	funnel := m.renderFunnel()
	scores := m.renderScoreDistribution()
	rates := m.renderRates()
	weekly := m.renderWeeklyActivity()
	help := m.renderHelp()

	// Combine panels
	body := lipgloss.JoinVertical(lipgloss.Left,
		funnel,
		"",
		scores,
		"",
		rates,
		"",
		weekly,
	)

	// Apply scroll
	bodyLines := strings.Split(body, "\n")
	offset := m.scrollOffset
	if offset >= len(bodyLines) {
		offset = len(bodyLines) - 1
	}
	if offset < 0 {
		offset = 0
	}
	if offset > 0 {
		bodyLines = bodyLines[offset:]
	}

	// Clamp to available height
	availHeight := m.height - 4 // header + help + padding
	if availHeight < 3 {
		availHeight = 3
	}
	if len(bodyLines) > availHeight {
		bodyLines = bodyLines[:availHeight]
	}

	body = strings.Join(bodyLines, "\n")

	return lipgloss.JoinVertical(lipgloss.Left, header, body, help)
}

func (m ProgressModel) renderHeader() string {
	style := m.theme.Shelf(m.width)
	title := m.theme.Display(m.theme.Mauve).Render("SEARCH PROGRESS")

	totalCount := 0
	if len(m.metrics.FunnelStages) > 0 {
		totalCount = m.metrics.FunnelStages[0].Count
	}
	info := m.theme.Supporting().Render(fmt.Sprintf("%d evaluated | %.1f avg score", totalCount, m.metrics.AvgScore))

	gap := m.width - lipgloss.Width(title) - lipgloss.Width(info) - 4
	if gap < 1 {
		gap = 1
	}

	return style.Render(title + strings.Repeat(" ", gap) + info)
}

func (m ProgressModel) renderFunnel() string {
	padStyle := lipgloss.NewStyle().Padding(0, theme.SpaceSM)

	var lines []string
	lines = append(lines, padStyle.Render(m.theme.Section().Render("Pipeline Funnel")))

	if len(m.metrics.FunnelStages) == 0 {
		lines = append(lines, padStyle.Render(m.theme.Supporting().Render("No data")))
		return strings.Join(lines, "\n")
	}

	maxCount := 0
	for _, s := range m.metrics.FunnelStages {
		if s.Count > maxCount {
			maxCount = s.Count
		}
	}

	labelW := 10
	wc := theme.ClassifyWidth(m.width)
	barMaxW := m.width - labelW - 20
	if wc >= theme.WidthComfortable {
		barMaxW = m.width - labelW - 16
	}
	if barMaxW < 10 {
		barMaxW = 10
	}

	stageColors := []lipgloss.Color{
		m.theme.Blue,
		m.theme.Sky,
		m.theme.Green,
		m.theme.Yellow,
		m.theme.Peach,
	}

	for i, stage := range m.metrics.FunnelStages {
		barW := 0
		if maxCount > 0 {
			barW = stage.Count * barMaxW / maxCount
		}
		if barW < 1 && stage.Count > 0 {
			barW = 1
		}

		color := m.theme.Text
		if i < len(stageColors) {
			color = stageColors[i]
		}

		barStyle := lipgloss.NewStyle().Foreground(color)
		label := m.theme.Body().Width(labelW).Render(stage.Label)
		bar := barStyle.Render(strings.Repeat(theme.BlockLowerHalf, barW))

		pctStr := ""
		if i > 0 {
			pctStr = fmt.Sprintf(" (%.0f%%)", stage.Pct)
		}
		count := m.theme.Supporting().Render(fmt.Sprintf("  %d%s", stage.Count, pctStr))

		lines = append(lines, padStyle.Render(label+bar+count))
	}

	return strings.Join(lines, "\n")
}

func (m ProgressModel) renderScoreDistribution() string {
	padStyle := lipgloss.NewStyle().Padding(0, theme.SpaceSM)

	var lines []string
	lines = append(lines, padStyle.Render(m.theme.Section().Render("Score Distribution")))

	if len(m.metrics.ScoreBuckets) == 0 {
		lines = append(lines, padStyle.Render(m.theme.Supporting().Render("No data")))
		return strings.Join(lines, "\n")
	}

	maxCount := 0
	for _, b := range m.metrics.ScoreBuckets {
		if b.Count > maxCount {
			maxCount = b.Count
		}
	}

	labelW := 8
	wc := theme.ClassifyWidth(m.width)
	barMaxW := m.width - labelW - 14
	if wc >= theme.WidthComfortable {
		barMaxW = m.width - labelW - 10
	}
	if barMaxW < 10 {
		barMaxW = 10
	}

	bucketColors := []lipgloss.Color{
		m.theme.Green,
		m.theme.Green,
		m.theme.Yellow,
		m.theme.Peach,
		m.theme.Red,
	}

	for i, bucket := range m.metrics.ScoreBuckets {
		barW := 0
		if maxCount > 0 {
			barW = bucket.Count * barMaxW / maxCount
		}
		if barW < 1 && bucket.Count > 0 {
			barW = 1
		}

		color := m.theme.Text
		if i < len(bucketColors) {
			color = bucketColors[i]
		}

		barStyle := lipgloss.NewStyle().Foreground(color)
		label := m.theme.Body().Width(labelW).Render(bucket.Label)
		bar := barStyle.Render(strings.Repeat(theme.BlockFull, barW))
		count := m.theme.Supporting().Render(fmt.Sprintf("  %d", bucket.Count))

		lines = append(lines, padStyle.Render(label+bar+count))
	}

	return strings.Join(lines, "\n")
}

func (m ProgressModel) renderRates() string {
	padStyle := lipgloss.NewStyle().Padding(0, theme.SpaceSM)

	var lines []string
	lines = append(lines, padStyle.Render(m.theme.Section().Render("Conversion Rates")))

	labelStyle := m.theme.Body()
	valueStyle := lipgloss.NewStyle().Bold(true)
	sep := m.theme.Structural().Render("  |  ")

	rates := labelStyle.Render("Response Rate: ") +
		valueStyle.Foreground(m.rateColor(m.metrics.ResponseRate)).Render(fmt.Sprintf("%.1f%%", m.metrics.ResponseRate)) +
		sep +
		labelStyle.Render("Interview Rate: ") +
		valueStyle.Foreground(m.rateColor(m.metrics.InterviewRate)).Render(fmt.Sprintf("%.1f%%", m.metrics.InterviewRate)) +
		sep +
		labelStyle.Render("Offer Rate: ") +
		valueStyle.Foreground(m.rateColor(m.metrics.OfferRate)).Render(fmt.Sprintf("%.1f%%", m.metrics.OfferRate))

	lines = append(lines, padStyle.Render(rates))

	activeInfo := m.theme.Supporting().Render(fmt.Sprintf(
		"%d active applications | %d total offers",
		m.metrics.ActiveApps, m.metrics.TotalOffers,
	))
	lines = append(lines, padStyle.Render(activeInfo))

	return strings.Join(lines, "\n")
}

func (m ProgressModel) renderWeeklyActivity() string {
	padStyle := lipgloss.NewStyle().Padding(0, theme.SpaceSM)

	var lines []string
	lines = append(lines, padStyle.Render(m.theme.Section().Render("Weekly Activity")))

	if len(m.metrics.WeeklyActivity) == 0 {
		lines = append(lines, padStyle.Render(m.theme.Supporting().Render("No data")))
		return strings.Join(lines, "\n")
	}

	maxCount := 0
	total := 0
	for _, w := range m.metrics.WeeklyActivity {
		if w.Count > maxCount {
			maxCount = w.Count
		}
		total += w.Count
	}
	avg := float64(total) / float64(len(m.metrics.WeeklyActivity))

	wc := theme.ClassifyWidth(m.width)
	labelW := 10
	if wc >= theme.WidthCinematic {
		labelW = 12
	}
	barMaxW := m.width - labelW - 12
	if wc >= theme.WidthComfortable {
		barMaxW = m.width - labelW - 8
	}
	if barMaxW < 10 {
		barMaxW = 10
	}

	for _, week := range m.metrics.WeeklyActivity {
		barW := 0
		if maxCount > 0 {
			barW = week.Count * barMaxW / maxCount
		}
		if barW < 1 && week.Count > 0 {
			barW = 1
		}

		barColor := m.theme.Blue
		if avg > 0 {
			ratio := float64(week.Count) / avg
			switch {
			case ratio > 1.2:
				barColor = m.theme.Green
			case ratio < 0.8:
				barColor = m.theme.Peach
			}
		}

		barStyle := lipgloss.NewStyle().Foreground(barColor)

		weekLabel := week.Week
		if wc < theme.WidthCinematic {
			if idx := strings.Index(weekLabel, "-"); idx >= 0 {
				weekLabel = weekLabel[idx+1:]
			}
		}

		label := m.theme.Supporting().Width(labelW).Render(weekLabel)
		bar := barStyle.Render(strings.Repeat(theme.BlockFull, barW))
		count := m.theme.Supporting().Render(fmt.Sprintf("  %d", week.Count))

		lines = append(lines, padStyle.Render(label+bar+count))
	}

	return strings.Join(lines, "\n")
}

func (m ProgressModel) renderHelp() string {
	style := m.theme.Shelf(m.width).Padding(0, 1)

	keyStyle := m.theme.Body().Bold(true)
	descStyle := m.theme.Supporting()
	brand := m.theme.Supporting().Render("career-ops by santifer.io")

	keys := keyStyle.Render("\u2191\u2193") + descStyle.Render(" scroll  ") +
		keyStyle.Render("PgUp/Dn") + descStyle.Render(" page  ") +
		keyStyle.Render("Esc") + descStyle.Render(" back")

	gap := m.width - lipgloss.Width(keys) - lipgloss.Width(brand) - 2
	if gap < 1 {
		gap = 1
	}

	return style.Render(keys + strings.Repeat(" ", gap) + brand)
}

// rateColor returns a color based on the rate value.
func (m ProgressModel) rateColor(rate float64) lipgloss.Color {
	switch {
	case rate >= 30:
		return m.theme.Green
	case rate >= 15:
		return m.theme.Yellow
	case rate >= 5:
		return m.theme.Peach
	default:
		return m.theme.Red
	}
}
