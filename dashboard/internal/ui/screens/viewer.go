package screens

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/theme"
)

// ViewerClosedMsg is emitted when the viewer is dismissed.
type ViewerClosedMsg struct{}

// ViewerModel implements an integrated file viewer screen.
type ViewerModel struct {
	lines        []string
	title        string
	scrollOffset int
	width        int
	height       int
	theme        theme.Theme
}

// NewViewerModel creates a new file viewer for the given path.
func NewViewerModel(t theme.Theme, path, title string, width, height int) ViewerModel {
	content, err := os.ReadFile(path)
	if err != nil {
		content = []byte("Error reading file: " + err.Error())
	}

	return ViewerModel{
		lines:  strings.Split(string(content), "\n"),
		title:  title,
		width:  width,
		height: height,
		theme:  t,
	}
}

func (m ViewerModel) Init() tea.Cmd {
	return nil
}

func (m *ViewerModel) Resize(width, height int) {
	m.width = width
	m.height = height
}

func (m ViewerModel) Update(msg tea.Msg) (ViewerModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc":
			return m, func() tea.Msg { return ViewerClosedMsg{} }

		case "down", "j":
			maxScroll := len(m.lines) - m.bodyHeight()
			if maxScroll < 0 {
				maxScroll = 0
			}
			if m.scrollOffset < maxScroll {
				m.scrollOffset++
			}

		case "up", "k":
			if m.scrollOffset > 0 {
				m.scrollOffset--
			}

		case "pgdown", "ctrl+d":
			jump := m.bodyHeight() / 2
			maxScroll := len(m.lines) - m.bodyHeight()
			if maxScroll < 0 {
				maxScroll = 0
			}
			m.scrollOffset += jump
			if m.scrollOffset > maxScroll {
				m.scrollOffset = maxScroll
			}

		case "pgup", "ctrl+u":
			jump := m.bodyHeight() / 2
			m.scrollOffset -= jump
			if m.scrollOffset < 0 {
				m.scrollOffset = 0
			}

		case "home", "g":
			m.scrollOffset = 0

		case "end", "G":
			maxScroll := len(m.lines) - m.bodyHeight()
			if maxScroll < 0 {
				maxScroll = 0
			}
			m.scrollOffset = maxScroll
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	}

	return m, nil
}

func (m ViewerModel) bodyHeight() int {
	h := m.height - 4 // header + footer + padding
	if h < 3 {
		h = 3
	}
	return h
}

func (m ViewerModel) View() string {
	header := m.renderHeader()
	body := m.renderBody()
	footer := m.renderFooter()

	return lipgloss.JoinVertical(lipgloss.Left, header, body, footer)
}

func (m ViewerModel) renderHeader() string {
	style := m.theme.Shelf(m.width)
	title := m.theme.Display(m.theme.Blue).Render(m.title)
	scroll := m.theme.Supporting().Render(m.scrollIndicator())

	gap := m.width - lipgloss.Width(m.title) - lipgloss.Width(scroll) - 4
	if gap < 1 {
		gap = 1
	}

	return style.Render(title + strings.Repeat(" ", gap) + scroll)
}

func (m ViewerModel) scrollIndicator() string {
	if len(m.lines) == 0 {
		return ""
	}
	maxScroll := len(m.lines) - m.bodyHeight()
	if maxScroll <= 0 {
		return "Top"
	}
	if m.scrollOffset == 0 {
		return "Top"
	}
	if m.scrollOffset >= maxScroll {
		return "End"
	}
	return fmt.Sprintf("%d%%", m.scrollOffset*100/maxScroll)
}

func (m ViewerModel) renderBody() string {
	bh := m.bodyHeight()
	padStyle := lipgloss.NewStyle().Padding(0, theme.SpaceSM)

	if len(m.lines) == 0 {
		return padStyle.Render(m.theme.Supporting().Render("(empty file)"))
	}

	end := m.scrollOffset + bh
	if end > len(m.lines) {
		end = len(m.lines)
	}
	visible := m.lines[m.scrollOffset:end]

	// Render with table block detection
	var styled []string
	i := 0
	for i < len(visible) {
		if isTableLine(visible[i]) {
			// Collect consecutive table lines
			tableStart := i
			for i < len(visible) && isTableLine(visible[i]) {
				i++
			}
			tableLines := visible[tableStart:i]

			// Also look ahead in full document for remaining table rows
			// that may be just beyond the visible window, to get correct column widths
			fullTableStart := m.scrollOffset + tableStart
			fullTableEnd := fullTableStart
			for fullTableEnd < len(m.lines) && isTableLine(m.lines[fullTableEnd]) {
				fullTableEnd++
			}
			fullTable := m.lines[fullTableStart:fullTableEnd]

			// Compute column widths from the full table, render only visible rows
			colWidths := computeColumnWidths(fullTable, m.width-6)
			rendered := m.renderTableBlock(tableLines, colWidths, fullTableStart)
			styled = append(styled, rendered...)
		} else {
			styled = append(styled, m.styleLine(visible[i]))
			i++
		}
	}

	// Pad to fill height
	for len(styled) < bh {
		styled = append(styled, "")
	}

	return padStyle.Render(strings.Join(styled, "\n"))
}

// isTableLine checks if a line is part of a markdown table.
func isTableLine(line string) bool {
	trimmed := strings.TrimSpace(line)
	return len(trimmed) > 1 && trimmed[0] == '|'
}

// isTableSeparator checks if a line is a table separator (|---|---|).
func isTableSeparator(line string) bool {
	trimmed := strings.TrimSpace(line)
	if !strings.HasPrefix(trimmed, "|") {
		return false
	}
	cleaned := strings.NewReplacer("|", "", "-", "", ":", "", " ", "").Replace(trimmed)
	return cleaned == ""
}

// parseTableCells splits a table line into trimmed cells.
func parseTableCells(line string) []string {
	trimmed := strings.TrimSpace(line)
	// Remove leading and trailing pipes
	if len(trimmed) > 0 && trimmed[0] == '|' {
		trimmed = trimmed[1:]
	}
	if len(trimmed) > 0 && trimmed[len(trimmed)-1] == '|' {
		trimmed = trimmed[:len(trimmed)-1]
	}
	parts := strings.Split(trimmed, "|")
	cells := make([]string, len(parts))
	for i, p := range parts {
		cells[i] = strings.TrimSpace(p)
	}
	return cells
}

// computeColumnWidths calculates max width per column across all table rows.
func computeColumnWidths(lines []string, maxTotal int) []int {
	maxCols := 0
	for _, line := range lines {
		if isTableSeparator(line) {
			continue
		}
		cells := parseTableCells(line)
		if len(cells) > maxCols {
			maxCols = len(cells)
		}
	}
	if maxCols == 0 {
		return nil
	}

	widths := make([]int, maxCols)
	for _, line := range lines {
		if isTableSeparator(line) {
			continue
		}
		cells := parseTableCells(line)
		for i, cell := range cells {
			if i < maxCols {
				w := lipgloss.Width(cell)
				if w > widths[i] {
					widths[i] = w
				}
			}
		}
	}

	// Cap individual columns based on column count
	maxColW := 45
	if maxCols > 5 {
		maxColW = 30
	}
	if maxCols > 7 {
		maxColW = 22
	}
	for i := range widths {
		if widths[i] > maxColW {
			widths[i] = maxColW
		}
		if widths[i] < 3 {
			widths[i] = 3
		}
	}

	// Shrink to fit available width
	for {
		total := 1 // trailing border
		for _, w := range widths {
			total += w + 3 // cell padding + border
		}
		if total <= maxTotal {
			break
		}
		// Find the widest column and shrink it by 1
		widestIdx := 0
		widestVal := 0
		for i, w := range widths {
			if w > widestVal {
				widestVal = w
				widestIdx = i
			}
		}
		if widths[widestIdx] <= 3 {
			break // can't shrink further
		}
		widths[widestIdx]--
	}

	return widths
}

// renderTableBlock renders table lines with aligned columns and box-drawing borders.
func (m ViewerModel) renderTableBlock(lines []string, colWidths []int, firstLineIdx int) []string {
	if len(lines) == 0 || len(colWidths) == 0 {
		// Fallback: render as plain text
		var result []string
		for _, line := range lines {
			result = append(result, m.styleLine(line))
		}
		return result
	}

	maxCols := len(colWidths)
	borderStyle := m.theme.Structural()
	headerStyle := m.theme.Section()
	dataStyle := m.theme.Body()

	// Build top border
	var result []string
	var topParts []string
	for _, w := range colWidths {
		topParts = append(topParts, strings.Repeat("─", w+2))
	}
	result = append(result, borderStyle.Render("┌"+strings.Join(topParts, "┬")+"┐"))

	isFirstDataRow := true
	for _, line := range lines {
		if isTableSeparator(line) {
			// Render middle separator
			var sepParts []string
			for _, w := range colWidths {
				sepParts = append(sepParts, strings.Repeat("─", w+2))
			}
			result = append(result, borderStyle.Render("├"+strings.Join(sepParts, "┼")+"┤"))
			continue
		}

		cells := parseTableCells(line)
		var paddedCells []string
		for i := 0; i < maxCols; i++ {
			cell := ""
			if i < len(cells) {
				cell = cells[i]
			}
			cellWidth := lipgloss.Width(cell)
			colW := colWidths[i]

			if cellWidth > colW {
				// Truncate — need to handle multi-byte/emoji carefully
				runes := []rune(cell)
				truncated := string(runes)
				for lipgloss.Width(truncated) > colW-3 && len(runes) > 0 {
					runes = runes[:len(runes)-1]
					truncated = string(runes)
				}
				cell = truncated + "..."
				cellWidth = lipgloss.Width(cell)
			}

			padding := colW - cellWidth
			if padding < 0 {
				padding = 0
			}
			paddedCells = append(paddedCells, " "+cell+strings.Repeat(" ", padding)+" ")
		}

		// Build row with borders
		border := borderStyle.Render("│")
		var rowParts []string
		for _, cell := range paddedCells {
			if isFirstDataRow {
				rowParts = append(rowParts, headerStyle.Render(cell))
			} else {
				rowParts = append(rowParts, dataStyle.Render(cell))
			}
		}
		row := border + strings.Join(rowParts, border) + border
		result = append(result, row)
		isFirstDataRow = false
	}

	// Bottom border
	var bottomParts []string
	for _, w := range colWidths {
		bottomParts = append(bottomParts, strings.Repeat("─", w+2))
	}
	result = append(result, borderStyle.Render("└"+strings.Join(bottomParts, "┴")+"┘"))

	return result
}

var reBold = regexp.MustCompile(`\*\*([^*]+)\*\*`)

func (m ViewerModel) styleLine(line string) string {
	trimmed := strings.TrimSpace(line)

	if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "## ") {
		return m.theme.Display(m.theme.Blue).Render("  " + strings.TrimPrefix(trimmed, "# "))
	}
	if strings.HasPrefix(trimmed, "## ") && !strings.HasPrefix(trimmed, "### ") {
		return m.theme.Display(m.theme.Mauve).Render("  " + strings.TrimPrefix(trimmed, "## "))
	}
	if strings.HasPrefix(trimmed, "### ") {
		return m.theme.Display(m.theme.Sky).Render("  " + strings.TrimPrefix(trimmed, "### "))
	}
	if trimmed == "---" || trimmed == "***" {
		return m.theme.Structural().Render(strings.Repeat(theme.ThinHoriz, m.width-4))
	}
	if strings.HasPrefix(trimmed, "> ") {
		content := strings.TrimPrefix(trimmed, "> ")
		border := m.theme.Structural().Render(theme.Block1_4 + " ")
		text := m.theme.Supporting().Italic(true).Render(content)
		return border + text
	}
	if strings.HasPrefix(trimmed, "**") && strings.Contains(trimmed, ":**") {
		return m.renderInlineBold(line, m.theme.Yellow)
	}
	if strings.HasPrefix(trimmed, "- ") || strings.HasPrefix(trimmed, "* ") {
		return m.renderInlineBold(line, m.theme.Text)
	}
	if len(trimmed) > 2 && trimmed[0] >= '0' && trimmed[0] <= '9' && strings.Contains(trimmed[:3], ".") {
		return m.renderInlineBold(line, m.theme.Text)
	}
	if strings.Contains(trimmed, "**") {
		return m.renderInlineBold(line, m.theme.Text)
	}

	return m.theme.Body().Render(line)
}

// renderInlineBold renders a line with **bold** segments highlighted.
func (m ViewerModel) renderInlineBold(line string, baseColor lipgloss.Color) string {
	baseStyle := lipgloss.NewStyle().Foreground(baseColor)
	boldStyle := m.theme.Label()

	matches := reBold.FindAllStringIndex(line, -1)
	if len(matches) == 0 {
		return baseStyle.Render(line)
	}

	var result strings.Builder
	last := 0
	for _, loc := range matches {
		// Render text before the bold
		if loc[0] > last {
			result.WriteString(baseStyle.Render(line[last:loc[0]]))
		}
		// Extract bold content (without **)
		boldText := line[loc[0]+2 : loc[1]-2]
		result.WriteString(boldStyle.Render(boldText))
		last = loc[1]
	}
	// Render remaining text
	if last < len(line) {
		result.WriteString(baseStyle.Render(line[last:]))
	}

	return result.String()
}

func (m ViewerModel) renderFooter() string {
	style := m.theme.Shelf(m.width)
	keyStyle := m.theme.Body().Bold(true)
	descStyle := m.theme.Supporting()

	return style.Render(
		keyStyle.Render("↑↓") + descStyle.Render(" scroll  ") +
			keyStyle.Render("PgUp/Dn") + descStyle.Render(" page  ") +
			keyStyle.Render("g/G") + descStyle.Render(" top/end  ") +
			keyStyle.Render("Esc") + descStyle.Render(" back"))
}
