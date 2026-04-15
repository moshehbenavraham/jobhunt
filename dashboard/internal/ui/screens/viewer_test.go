package screens

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/theme"
)

func TestViewerModelLifecycleAndHelpers(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "report.md")
	content := strings.Join([]string{
		"# Title",
		"## Section",
		"### Detail",
		"**Label:** value",
		"> quoted text",
		"- bullet with **bold**",
		"1. ordered item",
		"| Header | Value |",
		"| ------ | ----- |",
		"| Long cell content | Wider table cell |",
		"",
	}, "\n")
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write report: %v", err)
	}

	th := theme.NewTheme("catppuccin-mocha")
	viewer := NewViewerModel(th, path, "Report", 72, 12)
	if len(viewer.lines) == 0 {
		t.Fatal("expected viewer to load file lines")
	}
	if viewer.bodyHeight() < 3 {
		t.Fatalf("expected minimum body height, got %d", viewer.bodyHeight())
	}

	viewer.Resize(80, 8)
	if viewer.width != 80 || viewer.height != 8 {
		t.Fatalf("unexpected resize result: %dx%d", viewer.width, viewer.height)
	}

	if cmd := viewer.Init(); cmd != nil {
		t.Fatalf("expected nil init command, got %#v", cmd)
	}

	updated, cmd := viewer.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("j")})
	if cmd != nil {
		t.Fatalf("expected nil scroll command, got %#v", cmd)
	}
	if updated.scrollOffset != 1 {
		t.Fatalf("expected scroll offset 1, got %d", updated.scrollOffset)
	}

	updated, _ = updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("g")})
	if updated.scrollOffset != 0 {
		t.Fatalf("expected home navigation to reset scroll, got %d", updated.scrollOffset)
	}

	updated, cmd = updated.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})
	if cmd == nil {
		t.Fatal("expected close command from q")
	}
	if msg := cmd(); msg != (ViewerClosedMsg{}) {
		t.Fatalf("unexpected close message: %#v", msg)
	}

	if got := updated.View(); !strings.Contains(got, "Report") || !strings.Contains(got, "Title") {
		t.Fatalf("expected rendered viewer content, got %q", got)
	}

	missing := NewViewerModel(th, filepath.Join(root, "missing.md"), "Missing", 60, 10)
	if !strings.Contains(strings.Join(missing.lines, "\n"), "Error reading file") {
		t.Fatalf("expected missing-file placeholder, got %q", strings.Join(missing.lines, "\n"))
	}
}

func TestViewerFormattingHelpers(t *testing.T) {
	th := theme.NewTheme("catppuccin-mocha")
	viewer := ViewerModel{
		lines: []string{
			"| Header | Value |",
			"| ------ | ----- |",
			"| row | data |",
		},
		title:  "Table",
		width:  50,
		height: 10,
		theme:  th,
	}

	if !isTableLine("| value |") {
		t.Fatal("expected markdown table line detection")
	}
	if isTableLine("not a table") {
		t.Fatal("expected non-table line to be rejected")
	}
	if !isTableSeparator("| --- | :--- |") {
		t.Fatal("expected markdown separator detection")
	}
	if isTableSeparator("plain text") {
		t.Fatal("expected non-separator to be rejected")
	}

	cells := parseTableCells("| one | two |")
	if strings.Join(cells, ",") != "one,two" {
		t.Fatalf("unexpected parsed cells: %#v", cells)
	}

	widths := computeColumnWidths([]string{
		"| Header | Extra Wide Column |",
		"| ------ | ----------------- |",
		"| row | value |",
	}, 30)
	if len(widths) != 2 || widths[0] < 3 || widths[1] < 3 {
		t.Fatalf("unexpected computed widths: %#v", widths)
	}

	renderedTable := viewer.renderTableBlock(viewer.lines, widths, 0)
	if len(renderedTable) == 0 || !strings.Contains(strings.Join(renderedTable, "\n"), "Header") {
		t.Fatalf("expected rendered table block, got %#v", renderedTable)
	}

	if got := viewer.styleLine("# Heading"); !strings.Contains(got, "Heading") {
		t.Fatalf("expected heading styling, got %q", got)
	}
	if got := viewer.styleLine("**Label:** value"); !strings.Contains(got, "Label") {
		t.Fatalf("expected label styling, got %q", got)
	}
	if got := viewer.styleLine("> note"); !strings.Contains(got, "note") {
		t.Fatalf("expected quote styling, got %q", got)
	}
	if got := viewer.styleLine("---"); !strings.Contains(got, theme.ThinHoriz) {
		t.Fatalf("expected divider styling, got %q", got)
	}
	if got := viewer.renderInlineBold("before **bold** after", th.Text); !strings.Contains(got, "bold") {
		t.Fatalf("expected inline bold rendering, got %q", got)
	}

	if indicator := viewer.scrollIndicator(); indicator != "Top" {
		t.Fatalf("expected top scroll indicator, got %q", indicator)
	}
	viewer.scrollOffset = 1
	if indicator := viewer.scrollIndicator(); indicator == "" {
		t.Fatal("expected non-empty scroll indicator")
	}
	if body := viewer.renderBody(); !strings.Contains(body, "row") || !strings.Contains(body, "┌") {
		t.Fatalf("expected rendered body to include table, got %q", body)
	}
	if footer := viewer.renderFooter(); !strings.Contains(footer, "scroll") {
		t.Fatalf("expected footer help text, got %q", footer)
	}
}
