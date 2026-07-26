package data

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
)

var (
	reReportLink     = regexp.MustCompile(`\[(\d+)\]\(([^)]+)\)`)
	reReportNumber   = regexp.MustCompile(`^(\d+)`)
	reScoreValue     = regexp.MustCompile(`(\d+\.?\d*)/5`)
	reArchetype      = regexp.MustCompile(`(?i)\*\*Arquetipo(?:\s+detectado)?\*\*\s*\|\s*(.+)`)
	reTlDr           = regexp.MustCompile(`(?i)\*\*TL;DR\*\*\s*\|\s*(.+)`)
	reTlDrColon      = regexp.MustCompile(`(?i)\*\*TL;DR:\*\*\s*(.+)`)
	reRemote         = regexp.MustCompile(`(?i)\*\*Remote\*\*\s*\|\s*(.+)`)
	reComp           = regexp.MustCompile(`(?i)\*\*Comp\*\*\s*\|\s*(.+)`)
	reArchetypeColon = regexp.MustCompile(`(?i)\*\*Arquetipo:\*\*\s*(.+)`)
	reReportURL      = regexp.MustCompile(`(?m)^\*\*URL:\*\*\s*(https?://\S+)`)
	reBatchID        = regexp.MustCompile(`(?m)^\*\*Batch ID:\*\*\s*(\d+)`)
)

// ParseApplications reads applications.md and returns parsed applications.
// It tries both {path}/applications.md and {path}/data/applications.md for compatibility.
func ParseApplications(careerOpsPath string) []model.CareerApplication {
	filePath := filepath.Join(careerOpsPath, "applications.md")
	content, err := os.ReadFile(filePath)
	if err != nil {
		// Fallback: try data/ subdirectory
		filePath = filepath.Join(careerOpsPath, "data", "applications.md")
		content, err = os.ReadFile(filePath)
		if err != nil {
			return nil
		}
	}

	lines := strings.Split(string(content), "\n")
	apps := make([]model.CareerApplication, 0)
	cols := resolveTrackerColumns(lines)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "# ") || strings.HasPrefix(line, "|---") || strings.HasPrefix(line, "| ---") || strings.HasPrefix(line, "| #") {
			continue
		}
		if !strings.HasPrefix(line, "|") {
			continue
		}

		fields := splitTrackerRow(line)

		if len(fields) < 8 {
			continue
		}

		at := func(name string) string {
			if index, ok := cols[name]; ok && index >= 0 && index < len(fields) {
				return fields[index]
			}
			return ""
		}

		trackerNumber, err := strconv.Atoi(at("num"))
		if err != nil || trackerNumber <= 0 {
			continue
		}
		hasPDF, pdfPath := parsePDFCell(at("pdf"))
		app := model.CareerApplication{
			Number:       trackerNumber,
			Date:         at("date"),
			Company:      at("company"),
			Role:         at("role"),
			Location:     at("location"),
			Via:          at("via"),
			Compensation: at("compensation"),
			Contact:      at("contact"),
			Status:       at("status"),
			HasPDF:       hasPDF,
			PDFPath:      pdfPath,
		}

		app.ScoreRaw = at("score")
		if sm := reScoreValue.FindStringSubmatch(at("score")); sm != nil {
			app.Score, _ = strconv.ParseFloat(sm[1], 64)
		}

		// Parse report field. Accept both markdown links like
		// [001](reports/001-acme.md) and bare paths like reports/002-beta.md.
		app.ReportNumber, app.ReportPath = parseReportCell(at("report"))

		app.Notes = at("notes")

		apps = append(apps, app)
	}

	enrichPDFStatuses(careerOpsPath, apps)

	// Enrich with job URLs using 5-tier strategy:
	// 1. **URL:** field in report header (newest reports)
	// 2. **Batch ID:** in report -> batch-input.tsv URL lookup
	// 3. report_num -> batch-state completed/partial mapping
	// 4. scan-history.tsv (pipeline scan entries matched by company+role)
	// 5. company name fallback from batch-input.tsv
	batchURLs := loadBatchInputURLs(careerOpsPath)
	reportNumURLs := loadJobURLs(careerOpsPath)

	for i := range apps {
		if apps[i].ReportPath == "" {
			continue
		}
		fullReport, resolveErr := ResolveReportPath(careerOpsPath, apps[i].ReportPath)
		if resolveErr != nil {
			continue
		}
		reportContent, err := os.ReadFile(fullReport)
		if err != nil {
			continue
		}
		header := string(reportContent)
		// Only scan the header (first 1000 bytes) for speed
		if len(header) > 1000 {
			header = header[:1000]
		}

		// Strategy 1: **URL:** in report
		if m := reReportURL.FindStringSubmatch(header); m != nil {
			apps[i].JobURL = m[1]
			continue
		}

		// Strategy 2: **Batch ID:** -> batch-input.tsv
		if m := reBatchID.FindStringSubmatch(header); m != nil {
			if url, ok := batchURLs[m[1]]; ok {
				apps[i].JobURL = url
				continue
			}
		}

		// Strategy 3: report_num -> batch-state completed/partial mapping
		if reportNumURLs != nil {
			if url, ok := reportNumURLs[apps[i].ReportNumber]; ok {
				apps[i].JobURL = url
				continue
			}
		}
	}

	// Strategy 4: scan-history.tsv (pipeline scan entries matched by company+role)
	enrichFromScanHistory(careerOpsPath, apps)

	// Strategy 5: company name fallback from batch-input.tsv
	enrichAppURLsByCompany(careerOpsPath, apps)

	return apps
}

// loadBatchInputURLs reads batch-input.tsv and returns a map of batch ID -> job URL.
func loadBatchInputURLs(careerOpsPath string) map[string]string {
	inputPath := filepath.Join(careerOpsPath, "batch", "batch-input.tsv")
	inputData, err := os.ReadFile(inputPath)
	if err != nil {
		return nil
	}
	result := make(map[string]string)
	for _, line := range strings.Split(string(inputData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 4 || fields[0] == "id" {
			continue
		}
		id := fields[0]
		notes := fields[3]
		// Extract real job URL from notes: "Title @ Company | Match% | https://actual-url"
		if idx := strings.LastIndex(notes, "| "); idx >= 0 {
			u := strings.TrimSpace(notes[idx+2:])
			if strings.HasPrefix(u, "http") {
				result[id] = u
				continue
			}
		}
		// Fallback: use JackJill URL
		if strings.HasPrefix(fields[1], "http") {
			result[id] = fields[1]
		}
	}
	return result
}

// batchEntry holds parsed data from batch-input.tsv.
type batchEntry struct {
	id      string
	url     string
	company string
	role    string
}

// loadJobURLs reads batch TSV files and returns a map of report_num -> job URL.
// Uses two strategies: (1) report_num mapping for report-bearing completed or
// partial jobs, (2) company name matching as fallback for failed or missing jobs.
func loadJobURLs(careerOpsPath string) map[string]string {
	// Read batch-input.tsv: id \t url \t source \t notes
	inputPath := filepath.Join(careerOpsPath, "batch", "batch-input.tsv")
	inputData, err := os.ReadFile(inputPath)
	if err != nil {
		return nil
	}

	// Parse batch-input: extract job URL, company, and role from notes
	entries := make(map[string]batchEntry) // keyed by id
	for _, line := range strings.Split(string(inputData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 4 || fields[0] == "id" {
			continue
		}
		e := batchEntry{id: fields[0]}
		notes := fields[3]

		// Extract URL from notes: "Title @ Company | Match% | https://actual-url"
		if idx := strings.LastIndex(notes, "| "); idx >= 0 {
			u := strings.TrimSpace(notes[idx+2:])
			if strings.HasPrefix(u, "http") {
				e.url = u
			}
		}
		// Fallback: use JackJill URL from field 1
		if e.url == "" && strings.HasPrefix(fields[1], "http") {
			e.url = fields[1]
		}

		// Extract company and role: "Role @ Company | Match% | URL"
		notesPart := notes
		if pipeIdx := strings.Index(notesPart, " | "); pipeIdx >= 0 {
			notesPart = notesPart[:pipeIdx]
		}
		if atIdx := strings.LastIndex(notesPart, " @ "); atIdx >= 0 {
			e.role = strings.TrimSpace(notesPart[:atIdx])
			e.company = strings.TrimSpace(notesPart[atIdx+3:])
		}

		if e.url != "" {
			entries[fields[0]] = e
		}
	}

	// Read batch-state.tsv: id \t url \t status \t ... \t report_num \t ...
	statePath := filepath.Join(careerOpsPath, "batch", "batch-state.tsv")
	stateData, err := os.ReadFile(statePath)
	if err != nil {
		return nil
	}

	// Strategy 1: map report_num -> URL for report-bearing completed/partial jobs
	reportToURL := make(map[string]string)
	for _, line := range strings.Split(string(stateData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 6 || fields[0] == "id" {
			continue
		}
		id := fields[0]
		status := fields[2]
		reportNum := fields[5]
		if (status != "completed" && status != "partial") || reportNum == "" || reportNum == "-" {
			continue
		}
		if e, ok := entries[id]; ok {
			reportToURL[reportNum] = e.url
			if len(reportNum) < 3 {
				reportToURL[fmt.Sprintf("%03s", reportNum)] = e.url
			}
		}
	}

	return reportToURL
}

// enrichFromScanHistory fills JobURL from scan-history.tsv by matching company name.
func enrichFromScanHistory(careerOpsPath string, apps []model.CareerApplication) {
	scanPath := filepath.Join(careerOpsPath, "scan-history.tsv")
	scanData, err := os.ReadFile(scanPath)
	if err != nil {
		return
	}

	// Build company -> URL index from scan-history
	type scanEntry struct {
		url     string
		company string
		title   string
	}
	byCompany := make(map[string][]scanEntry)
	for _, line := range strings.Split(string(scanData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 5 || fields[0] == "url" {
			continue
		}
		url := fields[0]
		company := fields[4]
		title := fields[3]
		if url == "" || !strings.HasPrefix(url, "http") {
			continue
		}
		key := normalizeCompany(company)
		byCompany[key] = append(byCompany[key], scanEntry{url: url, company: company, title: title})
	}

	for i := range apps {
		if apps[i].JobURL != "" {
			continue
		}
		key := normalizeCompany(apps[i].Company)
		matches := byCompany[key]
		if len(matches) == 1 {
			apps[i].JobURL = matches[0].url
		} else if len(matches) > 1 {
			// Multiple entries: pick best role match
			appRole := strings.ToLower(apps[i].Role)
			best := matches[0].url
			bestScore := 0
			for _, m := range matches {
				score := 0
				mTitle := strings.ToLower(m.title)
				for _, word := range strings.Fields(appRole) {
					if len(word) > 2 && strings.Contains(mTitle, word) {
						score++
					}
				}
				if score > bestScore {
					bestScore = score
					best = m.url
				}
			}
			apps[i].JobURL = best
		}
	}
}

// normalizeCompany strips common suffixes and lowercases a company name.
func normalizeCompany(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	for _, suffix := range []string{" inc.", " inc", " llc", " ltd", " corp", " corporation", " technologies", " technology", " group", " co."} {
		s = strings.TrimSuffix(s, suffix)
	}
	return strings.TrimSpace(s)
}

// enrichAppURLsByCompany fills in JobURL for apps that didn't get one via report_num mapping.
// It matches by company name from batch-input.tsv notes.
func enrichAppURLsByCompany(careerOpsPath string, apps []model.CareerApplication) {
	inputPath := filepath.Join(careerOpsPath, "batch", "batch-input.tsv")
	inputData, err := os.ReadFile(inputPath)
	if err != nil {
		return
	}

	// Build company -> []entry index
	type entry struct {
		role string
		url  string
	}
	byCompany := make(map[string][]entry)
	for _, line := range strings.Split(string(inputData), "\n") {
		fields := strings.Split(line, "\t")
		if len(fields) < 4 || fields[0] == "id" {
			continue
		}
		notes := fields[3]
		var url string
		if idx := strings.LastIndex(notes, "| "); idx >= 0 {
			u := strings.TrimSpace(notes[idx+2:])
			if strings.HasPrefix(u, "http") {
				url = u
			}
		}
		if url == "" && strings.HasPrefix(fields[1], "http") {
			url = fields[1]
		}
		if url == "" {
			continue
		}
		notesPart := notes
		if pipeIdx := strings.Index(notesPart, " | "); pipeIdx >= 0 {
			notesPart = notesPart[:pipeIdx]
		}
		if atIdx := strings.LastIndex(notesPart, " @ "); atIdx >= 0 {
			role := strings.TrimSpace(notesPart[:atIdx])
			company := strings.TrimSpace(notesPart[atIdx+3:])
			key := normalizeCompany(company)
			byCompany[key] = append(byCompany[key], entry{role: role, url: url})
		}
	}

	for i := range apps {
		if apps[i].JobURL != "" {
			continue
		}
		key := normalizeCompany(apps[i].Company)
		matches := byCompany[key]
		if len(matches) == 1 {
			apps[i].JobURL = matches[0].url
		} else if len(matches) > 1 {
			// Multiple entries for same company: pick best role match
			appRole := strings.ToLower(apps[i].Role)
			best := matches[0].url
			bestScore := 0
			for _, m := range matches {
				score := 0
				mRole := strings.ToLower(m.role)
				// Count matching words
				for _, word := range strings.Fields(appRole) {
					if len(word) > 2 && strings.Contains(mRole, word) {
						score++
					}
				}
				if score > bestScore {
					bestScore = score
					best = m.url
				}
			}
			apps[i].JobURL = best
		}
	}
}

// ComputeMetrics calculates aggregate metrics from applications.
func ComputeMetrics(apps []model.CareerApplication) model.PipelineMetrics {
	m := model.PipelineMetrics{
		Total:    len(apps),
		ByStatus: make(map[string]int),
	}

	var totalScore float64
	var scored int

	for _, app := range apps {
		status := NormalizeStatus(app.Status)
		m.ByStatus[status]++

		if app.Score > 0 {
			totalScore += app.Score
			scored++
			if app.Score > m.TopScore {
				m.TopScore = app.Score
			}
		}
		if app.HasPDF {
			m.WithPDF++
			switch app.PDFStatus {
			case "fresh":
				m.FreshPDF++
			case "stale", "invalid", "missing":
				m.StalePDF++
			case "legacy":
				m.LegacyPDF++
			}
		}
		if status != "skip" && status != "rejected" && status != "discarded" && status != "hired" {
			m.Actionable++
		}
	}

	if scored > 0 {
		m.AvgScore = totalScore / float64(scored)
	}

	return m
}

// NormalizeStatus normalizes raw status text to a canonical form.
// Aliases match states.yml -- keep in sync with jobhunt/states.yml
func NormalizeStatus(raw string) string {
	// Strip markdown bold and trailing dates
	s := strings.ReplaceAll(raw, "**", "")
	s = strings.TrimSpace(strings.ToLower(s))
	// Strip trailing date (e.g., "aplicado 2026-03-12")
	if idx := strings.Index(s, " 202"); idx > 0 {
		s = strings.TrimSpace(s[:idx])
	}

	switch {
	// Most restrictive first - accepts both English and Spanish
	case strings.Contains(s, "no aplicar") || strings.Contains(s, "no_aplicar") || s == "skip" || strings.Contains(s, "geo blocker"):
		return "skip"
	case strings.Contains(s, "interview") || strings.Contains(s, "entrevista"):
		return "interview"
	case s == "hired" || s == "accepted" || s == "accept" || strings.Contains(s, "contratado") || strings.Contains(s, "contratada"):
		return "hired"
	case s == "offer" || strings.Contains(s, "oferta"):
		return "offer"
	case strings.Contains(s, "responded") || strings.Contains(s, "respondido"):
		return "responded"
	case strings.Contains(s, "applied") || strings.Contains(s, "aplicado") || s == "enviada" || s == "aplicada" || s == "sent":
		return "applied"
	case strings.Contains(s, "rejected") || strings.Contains(s, "rechazado") || s == "rechazada":
		return "rejected"
	case strings.Contains(s, "discarded") || strings.Contains(s, "descartado") || s == "descartada" || s == "cerrada" || s == "cancelada" ||
		strings.HasPrefix(s, "duplicado") || strings.HasPrefix(s, "dup"):
		return "discarded"
	case strings.Contains(s, "evaluated") || strings.Contains(s, "evaluada") || s == "condicional" || s == "hold" || s == "monitor" || s == "evaluar" || s == "verificar":
		return "evaluated"
	default:
		return s
	}
}

// LoadReportSummary extracts key fields from a report file.
func LoadReportSummary(careerOpsPath, reportPath string) (archetype, tldr, remote, comp string) {
	fullPath, resolveErr := ResolveReportPath(careerOpsPath, reportPath)
	if resolveErr != nil {
		return
	}
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return
	}
	text := string(content)

	if m := reArchetype.FindStringSubmatch(text); m != nil {
		archetype = cleanTableCell(m[1])
	} else if m := reArchetypeColon.FindStringSubmatch(text); m != nil {
		archetype = cleanTableCell(m[1])
	}

	// Try table-format TL;DR first (most reports), then colon format
	if m := reTlDr.FindStringSubmatch(text); m != nil {
		tldr = cleanTableCell(m[1])
	} else if m := reTlDrColon.FindStringSubmatch(text); m != nil {
		tldr = cleanTableCell(m[1])
	}

	if m := reRemote.FindStringSubmatch(text); m != nil {
		remote = cleanTableCell(m[1])
	}

	if m := reComp.FindStringSubmatch(text); m != nil {
		comp = cleanTableCell(m[1])
	}

	// Truncate long fields
	if len(tldr) > 120 {
		tldr = tldr[:117] + "..."
	}

	return
}

func splitTrackerRow(line string) []string {
	line = strings.TrimSpace(line)
	if strings.Contains(line, "\t") {
		line = strings.TrimSpace(strings.TrimPrefix(line, "|"))
		parts := strings.Split(line, "\t")
		fields := make([]string, 0, len(parts))
		for _, part := range parts {
			fields = append(fields, strings.TrimSpace(strings.Trim(part, "|")))
		}
		return fields
	}
	line = strings.Trim(line, "|")
	parts := strings.Split(line, "|")
	fields := make([]string, 0, len(parts))
	for _, part := range parts {
		fields = append(fields, strings.TrimSpace(part))
	}
	return fields
}

var trackerHeaderAliases = map[string]string{
	"#": "num", "num": "num", "number": "num",
	"date": "date", "fecha": "date",
	"company": "company", "empresa": "company",
	"via": "via", "agency": "via",
	"role": "role", "puesto": "role",
	"location": "location", "ubicacion": "location", "ubicación": "location",
	"comp": "compensation", "compensation": "compensation", "salary": "compensation", "pay": "compensation",
	"contact": "contact", "recruiter": "contact", "contacto": "contact",
	"score": "score", "puntuacion": "score", "puntuación": "score",
	"status": "status", "estado": "status",
	"pdf":    "pdf",
	"report": "report", "informe": "report",
	"notes": "notes", "notas": "notes",
}

var legacyTrackerColumns = map[string]int{
	"num": 0, "date": 1, "company": 2, "role": 3, "score": 4,
	"status": 5, "pdf": 6, "report": 7, "notes": 8,
}

func detectTrackerColumns(lines []string) map[string]int {
	for _, line := range lines {
		if !strings.HasPrefix(strings.TrimSpace(line), "|") {
			continue
		}
		columns := make(map[string]int)
		for index, raw := range splitTrackerRow(line) {
			name, ok := trackerHeaderAliases[strings.ToLower(strings.TrimSpace(raw))]
			if ok {
				if _, exists := columns[name]; !exists {
					columns[name] = index
				}
			}
		}
		complete := true
		for _, required := range []string{"num", "company", "role", "score", "status"} {
			if _, ok := columns[required]; !ok {
				complete = false
				break
			}
		}
		if complete {
			return columns
		}
	}
	return nil
}

func resolveTrackerColumns(lines []string) map[string]int {
	if columns := detectTrackerColumns(lines); columns != nil {
		return columns
	}
	return legacyTrackerColumns
}

// UpdateApplicationStatus updates the status of an application in applications.md.
func UpdateApplicationStatus(careerOpsPath string, app model.CareerApplication, newStatus string) (returnErr error) {
	canonicalStatus, err := resolveCanonicalTrackerStatus(careerOpsPath, newStatus)
	if err != nil {
		return err
	}
	newStatus = canonicalStatus
	filePath := filepath.Join(careerOpsPath, "applications.md")
	if _, err := os.Stat(filePath); err != nil {
		filePath = filepath.Join(careerOpsPath, "data", "applications.md")
		if _, err := os.Stat(filePath); err != nil {
			return err
		}
	}
	canonical, err := canonicalPath(filePath)
	if err != nil {
		return fmt.Errorf("resolve tracker path: %w", err)
	}
	filePath = canonical
	lock, err := acquireTrackerLock(filePath, defaultTrackerLockOptions())
	if err != nil {
		return fmt.Errorf("acquire tracker lock: %w", err)
	}
	defer func() {
		if releaseErr := lock.release(); releaseErr != nil {
			if returnErr == nil {
				returnErr = releaseErr
			} else {
				returnErr = errors.Join(returnErr, releaseErr)
			}
		}
	}()

	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	if err := recoverStatusTransitionJournals(careerOpsPath, filePath, content); err != nil {
		return fmt.Errorf("recover status transition: %w", err)
	}

	lines := strings.Split(string(content), "\n")
	columns := resolveTrackerColumns(lines)
	statusIndex, ok := columns["status"]
	if !ok {
		return fmt.Errorf("status column not found in tracker")
	}
	newStatus = sanitizeTrackerCell(newStatus)
	if newStatus == "" {
		return fmt.Errorf("new status is empty after sanitization")
	}
	found := false
	fromStatus := ""

	for i, line := range lines {
		if !strings.HasPrefix(strings.TrimSpace(line), "|") {
			continue
		}
		if lineMatchesApplication(line, app, columns) {
			fields := splitTrackerRow(line)
			if statusIndex >= 0 && statusIndex < len(fields) {
				fromStatus = fields[statusIndex]
			}
			updated, replaceOK := replaceTrackerCell(line, statusIndex, newStatus)
			if !replaceOK {
				return fmt.Errorf("status column index %d is out of bounds", statusIndex)
			}
			lines[i] = updated
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf(
			"application not found: report %s path %s",
			app.ReportNumber,
			app.ReportPath,
		)
	}

	after := []byte(strings.Join(lines, "\n"))
	if string(after) == string(content) {
		return nil
	}
	return commitTrackerStatusTransition(
		careerOpsPath,
		filePath,
		content,
		after,
		app,
		fromStatus,
		newStatus,
	)
}

func parseReportCell(cell string) (reportNumber, reportPath string) {
	cell = cleanTableCell(cell)
	if cell == "" {
		return "", ""
	}

	if rm := reReportLink.FindStringSubmatch(cell); rm != nil {
		reportNumber = strings.TrimSpace(rm[1])
		reportPath = cleanTableCell(rm[2])
		if reportNumber == "" {
			reportNumber = reportNumberFromPath(reportPath)
		}
		return reportNumber, reportPath
	}

	reportPath = cell
	reportNumber = reportNumberFromPath(reportPath)
	return reportNumber, reportPath
}

func reportNumberFromPath(reportPath string) string {
	base := filepath.Base(strings.TrimSpace(reportPath))
	if m := reReportNumber.FindStringSubmatch(base); m != nil {
		return m[1]
	}
	return ""
}

func lineMatchesApplication(line string, app model.CareerApplication, columns map[string]int) bool {
	fields := splitTrackerRow(line)
	at := func(name string) string {
		if index, ok := columns[name]; ok && index >= 0 && index < len(fields) {
			return fields[index]
		}
		return ""
	}
	number, path := parseReportCell(at("report"))
	if app.ReportNumber != "" && number == app.ReportNumber {
		return true
	}
	if app.ReportPath != "" && filepath.Clean(path) == filepath.Clean(app.ReportPath) {
		return true
	}
	if app.Number > 0 {
		if numberValue, err := strconv.Atoi(at("num")); err == nil && numberValue == app.Number {
			return at("company") == app.Company && at("role") == app.Role
		}
	}
	return app.Company != "" && app.Role != "" &&
		at("company") == app.Company && at("role") == app.Role
}

func replaceTrackerCell(line string, fieldIndex int, newValue string) (string, bool) {
	if strings.Contains(line, "\t") {
		prefix, body, found := strings.Cut(line, "|")
		if !found {
			return line, false
		}
		parts := strings.Split(body, "\t")
		if fieldIndex < 0 || fieldIndex >= len(parts) {
			return line, false
		}
		parts[fieldIndex] = replaceCellValue(parts[fieldIndex], newValue)
		return prefix + "|" + strings.Join(parts, "\t"), true
	}
	parts := strings.Split(line, "|")
	index := fieldIndex + 1
	if index < 1 || index >= len(parts) {
		return line, false
	}
	parts[index] = replaceCellValue(parts[index], newValue)
	return strings.Join(parts, "|"), true
}

// replaceStatusInLine keeps the legacy helper contract for callers that do not
// have a detected header map. New tracker writes use replaceTrackerCell with
// the resolved Status index.
func replaceStatusInLine(line, _ string, newStatus string) string {
	updated, ok := replaceTrackerCell(line, legacyTrackerColumns["status"], newStatus)
	if !ok {
		return line
	}
	return updated
}

func replaceCellValue(cell, newValue string) string {
	leading := len(cell) - len(strings.TrimLeft(cell, " "))
	trailing := len(cell) - len(strings.TrimRight(cell, " "))
	return strings.Repeat(" ", leading) + newValue + strings.Repeat(" ", trailing)
}

func sanitizeTrackerCell(value string) string {
	value = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\r' || r == '\u2028' || r == '\u2029' {
			return ' '
		}
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, value)
	value = strings.ReplaceAll(value, "|", "/")
	return strings.Join(strings.Fields(value), " ")
}

// cleanTableCell removes trailing pipes and whitespace from a table cell value.
func cleanTableCell(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimRight(s, "|")
	return strings.TrimSpace(s)
}

// StatusPriority returns the sort priority for a status (lower = higher priority).
func StatusPriority(status string) int {
	switch NormalizeStatus(status) {
	case "hired":
		return 0
	case "interview":
		return 1
	case "offer":
		return 2
	case "responded":
		return 3
	case "applied":
		return 4
	case "evaluated":
		return 5
	case "skip":
		return 6
	case "rejected":
		return 7
	case "discarded":
		return 8
	default:
		return 9
	}
}

// ComputeProgressMetrics computes progress-oriented analytics from applications.
func ComputeProgressMetrics(apps []model.CareerApplication) model.ProgressMetrics {
	pm := model.ProgressMetrics{}

	// Count by normalized status
	statusCounts := make(map[string]int)
	var totalScore float64
	var scored int

	for _, app := range apps {
		norm := NormalizeStatus(app.Status)
		statusCounts[norm]++

		if app.Score > 0 {
			totalScore += app.Score
			scored++
			if app.Score > pm.TopScore {
				pm.TopScore = app.Score
			}
		}

		if norm == "offer" || norm == "hired" {
			pm.TotalOffers++
		}
		if norm != "skip" && norm != "rejected" && norm != "discarded" && norm != "hired" {
			pm.ActiveApps++
		}
	}

	if scored > 0 {
		pm.AvgScore = totalScore / float64(scored)
	}

	// Funnel: each stage counts all apps that reached at least that stage.
	// An app in "interview" has passed through evaluated -> applied -> responded -> interview.
	total := len(apps)
	applied := statusCounts["applied"] + statusCounts["responded"] + statusCounts["interview"] + statusCounts["offer"] + statusCounts["hired"] + statusCounts["rejected"]
	responded := statusCounts["responded"] + statusCounts["interview"] + statusCounts["offer"] + statusCounts["hired"]
	interview := statusCounts["interview"] + statusCounts["offer"] + statusCounts["hired"]
	offer := statusCounts["offer"] + statusCounts["hired"]

	pm.FunnelStages = []model.FunnelStage{
		{Label: "Evaluated", Count: total, Pct: 100.0},
		{Label: "Applied", Count: applied, Pct: safePct(applied, total)},
		{Label: "Responded", Count: responded, Pct: safePct(responded, applied)},
		{Label: "Interview", Count: interview, Pct: safePct(interview, applied)},
		{Label: "Offer", Count: offer, Pct: safePct(offer, applied)},
	}

	// Rates (relative to applied)
	if applied > 0 {
		pm.ResponseRate = float64(responded) / float64(applied) * 100
		pm.InterviewRate = float64(interview) / float64(applied) * 100
		pm.OfferRate = float64(offer) / float64(applied) * 100
	}

	// Score distribution
	buckets := [5]int{} // 0: 4.5-5.0, 1: 4.0-4.4, 2: 3.5-3.9, 3: 3.0-3.4, 4: <3.0
	for _, app := range apps {
		if app.Score <= 0 {
			continue
		}
		switch {
		case app.Score >= 4.5:
			buckets[0]++
		case app.Score >= 4.0:
			buckets[1]++
		case app.Score >= 3.5:
			buckets[2]++
		case app.Score >= 3.0:
			buckets[3]++
		default:
			buckets[4]++
		}
	}
	pm.ScoreBuckets = []model.ScoreBucket{
		{Label: "4.5-5.0", Count: buckets[0]},
		{Label: "4.0-4.4", Count: buckets[1]},
		{Label: "3.5-3.9", Count: buckets[2]},
		{Label: "3.0-3.4", Count: buckets[3]},
		{Label: "  <3.0", Count: buckets[4]},
	}

	// Weekly activity: group by ISO week from Date field, show last 8 weeks.
	// Also track per-stage weekly counts for funnel sparklines.
	weekCounts := make(map[string]int)
	stageWeekCounts := [5]map[string]int{}
	for i := range stageWeekCounts {
		stageWeekCounts[i] = make(map[string]int)
	}

	for _, app := range apps {
		if app.Date == "" {
			continue
		}
		t, err := time.Parse("2006-01-02", app.Date)
		if err != nil {
			continue
		}
		year, week := t.ISOWeek()
		key := fmt.Sprintf("%d-W%02d", year, week)
		weekCounts[key]++

		norm := NormalizeStatus(app.Status)
		var highestStage int
		switch norm {
		case "offer":
			highestStage = 4
		case "interview":
			highestStage = 3
		case "responded":
			highestStage = 2
		case "applied", "rejected":
			highestStage = 1
		default:
			highestStage = 0
		}
		for s := 0; s <= highestStage; s++ {
			stageWeekCounts[s][key]++
		}
	}

	// Sort weeks and take last 8
	var weeks []string
	for w := range weekCounts {
		weeks = append(weeks, w)
	}
	sort.Strings(weeks)
	if len(weeks) > 8 {
		weeks = weeks[len(weeks)-8:]
	}

	for _, w := range weeks {
		pm.WeeklyActivity = append(pm.WeeklyActivity, model.WeekActivity{
			Week:  w,
			Count: weekCounts[w],
		})
	}

	for i := range pm.FunnelStages {
		breakdown := make([]int, len(weeks))
		for j, w := range weeks {
			breakdown[j] = stageWeekCounts[i][w]
		}
		pm.FunnelStages[i].WeeklyBreakdown = breakdown
	}

	return pm
}

// safePct returns the percentage of part/whole, or 0 if whole is 0.
func safePct(part, whole int) float64 {
	if whole == 0 {
		return 0
	}
	return float64(part) / float64(whole) * 100
}
