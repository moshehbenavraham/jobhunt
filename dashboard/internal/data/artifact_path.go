package data

import (
	"fmt"
	"path/filepath"
	"strings"
)

// ResolveReportPath resolves a tracker report link while proving that it stays
// inside the repository-owned reports directory.
func ResolveReportPath(careerOpsPath, reportPath string) (string, error) {
	clean := filepath.Clean(filepath.FromSlash(strings.TrimSpace(reportPath)))
	if clean == "." || clean == "" {
		return "", fmt.Errorf("report path is empty")
	}
	if filepath.IsAbs(clean) {
		return "", fmt.Errorf("report path must be repository-relative")
	}
	if clean != "reports" && !strings.HasPrefix(clean, "reports"+string(filepath.Separator)) {
		return "", fmt.Errorf("report path must stay inside reports/")
	}

	root, err := filepath.Abs(careerOpsPath)
	if err != nil {
		return "", fmt.Errorf("resolve repository root: %w", err)
	}
	target := filepath.Join(root, clean)
	relative, err := filepath.Rel(root, target)
	if err != nil {
		return "", fmt.Errorf("resolve report path: %w", err)
	}
	if relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("report path escapes the repository")
	}
	return target, nil
}
