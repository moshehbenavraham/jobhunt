package data

import (
	"math"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
)

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func TestParseApplicationsAndURLEnrichment(t *testing.T) {
	root := t.TempDir()

	writeTestFile(
		t,
		filepath.Join(root, "data", "applications.md"),
		strings.Join([]string{
			"# Applications Tracker",
			"",
			"| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| --- | ---- | ------- | ---- | ----- | ------ | --- | ------ | ----- |",
			"| 1 | 2026-04-01 | Acme Inc. | Platform Engineer | 4.6/5 | Applied | ✅ | [001](reports/001-acme.md) | first note |",
			"| 2 | 2026-04-02 | Beta LLC | Backend Engineer | 4.1/5 | Respondido |  | [002](reports/002-beta.md) | second note |",
			"| 3 | 2026-04-03 | Gamma Group | Staff Platform Engineer | 3.9/5 | Entrevista | ✅ | [003](reports/003-gamma.md) | third note |",
			"| 4 | 2026-04-04 | Delta Technologies | Principal Data Engineer | 3.4/5 | Evaluada |  | [004](reports/004-delta.md) | fourth note |",
			"| 5 |\t2026-04-05\tEcho Corporation\tMachine Learning Engineer\t2.9/5\tRejected\t \t[005](reports/005-echo.md)\tfifth note\t|",
			"",
		}, "\n"),
	)

	writeTestFile(
		t,
		filepath.Join(root, "reports", "001-acme.md"),
		"**URL:** https://jobs.example.com/acme\n",
	)
	writeTestFile(
		t,
		filepath.Join(root, "reports", "002-beta.md"),
		"**Batch ID:** 2\n",
	)
	writeTestFile(
		t,
		filepath.Join(root, "reports", "003-gamma.md"),
		"no direct url\n",
	)
	writeTestFile(
		t,
		filepath.Join(root, "reports", "004-delta.md"),
		"no direct url\n",
	)
	writeTestFile(
		t,
		filepath.Join(root, "reports", "005-echo.md"),
		"no direct url\n",
	)

	writeTestFile(
		t,
		filepath.Join(root, "batch", "batch-input.tsv"),
		strings.Join([]string{
			"id\turl\tsource\tnotes",
			"2\thttps://jackjill.example/beta\tfixture\tBackend Engineer @ Beta LLC | 92% | https://jobs.example.com/beta",
			"3\thttps://jackjill.example/gamma\tfixture\tStaff Platform Engineer @ Gamma Group | 88% | https://placeholder.example/gamma",
			"4\thttps://jackjill.example/delta\tfixture\tPrincipal Data Engineer @ Delta Technologies | 76% | https://jobs.example.com/delta-data",
			"5\thttps://jackjill.example/echo\tfixture\tMachine Learning Engineer @ Echo Corporation | 54% | https://jobs.example.com/echo-ml",
			"",
		}, "\n"),
	)
	writeTestFile(
		t,
		filepath.Join(root, "batch", "batch-state.tsv"),
		strings.Join([]string{
			"id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries",
			"3\thttps://placeholder.example/gamma\tcompleted\t-\t-\t003\t4.7\t\t0",
			"",
		}, "\n"),
	)
	writeTestFile(
		t,
		filepath.Join(root, "scan-history.tsv"),
		strings.Join([]string{
			"url\tfirst_seen\tportal\ttitle\tcompany\tstatus",
			"https://jobs.example.com/delta-platform\t2026-04-01\tlever\tPlatform Engineer\tDelta Technologies\tadded",
			"https://jobs.example.com/delta-data\t2026-04-01\tlever\tPrincipal Data Engineer\tDelta Technologies\tadded",
			"",
		}, "\n"),
	)

	apps := ParseApplications(root)
	if len(apps) != 5 {
		t.Fatalf("expected 5 applications, got %d", len(apps))
	}

	if apps[0].JobURL != "https://jobs.example.com/acme" {
		t.Fatalf("expected report URL enrichment, got %q", apps[0].JobURL)
	}
	if apps[1].JobURL != "https://jobs.example.com/beta" {
		t.Fatalf("expected batch-id URL enrichment, got %q", apps[1].JobURL)
	}
	if apps[2].JobURL != "https://placeholder.example/gamma" {
		t.Fatalf("expected report-number URL enrichment, got %q", apps[2].JobURL)
	}
	if apps[3].JobURL != "https://jobs.example.com/delta-data" {
		t.Fatalf("expected scan-history role match, got %q", apps[3].JobURL)
	}
	if apps[4].JobURL != "https://jobs.example.com/echo-ml" {
		t.Fatalf("expected company fallback URL enrichment, got %q", apps[4].JobURL)
	}
	if !apps[0].HasPDF {
		t.Fatal("expected PDF column to be parsed")
	}
	if apps[4].Score != 2.9 {
		t.Fatalf("expected numeric score parsing, got %.1f", apps[4].Score)
	}
}

func TestParseApplicationsFallbackAndMissing(t *testing.T) {
	root := t.TempDir()

	writeTestFile(
		t,
		filepath.Join(root, "applications.md"),
		strings.Join([]string{
			"| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| 1 | 2026-04-01 | Acme | Engineer | 4.0/5 | Applied | ✅ | [001](reports/001.md) | note |",
			"| 2 | 2026-04-02 | Beta | Strategist | 4.5/5 | Applied | ✅ | reports/002-beta.md | note 2 |",
			"",
		}, "\n"),
	)
	writeTestFile(t, filepath.Join(root, "reports", "001.md"), "**URL:** https://jobs.example.com/acme\n")
	writeTestFile(t, filepath.Join(root, "reports", "002-beta.md"), "**URL:** https://jobs.example.com/beta\n")

	apps := ParseApplications(root)
	if len(apps) != 2 {
		t.Fatalf("expected root tracker fallback, got %d apps", len(apps))
	}
	if apps[1].ReportPath != "reports/002-beta.md" {
		t.Fatalf("expected bare report path parsing, got %q", apps[1].ReportPath)
	}
	if apps[1].ReportNumber != "002" {
		t.Fatalf("expected report number derived from path, got %q", apps[1].ReportNumber)
	}
	if apps[1].JobURL != "https://jobs.example.com/beta" {
		t.Fatalf("expected URL enrichment for bare report path, got %q", apps[1].JobURL)
	}

	if got := ParseApplications(filepath.Join(root, "missing")); got != nil {
		t.Fatalf("expected nil apps for missing tracker, got %+v", got)
	}
}

func TestBatchHelpersAndNormalization(t *testing.T) {
	root := t.TempDir()

	writeTestFile(
		t,
		filepath.Join(root, "batch", "batch-input.tsv"),
		strings.Join([]string{
			"id\turl\tsource\tnotes",
			"1\thttps://jackjill.example/one\tfixture\tPlatform Engineer @ Acme Inc. | 95% | https://jobs.example.com/acme",
			"2\thttps://jackjill.example/two\tfixture\tRole without explicit url",
			"",
		}, "\n"),
	)
	writeTestFile(
		t,
		filepath.Join(root, "batch", "batch-state.tsv"),
		strings.Join([]string{
			"id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries",
			"1\thttps://ignored.example\tcompleted\t-\t-\t7\t4.5\t\t0",
			"2\thttps://ignored.example\tfailed\t-\t-\t008\t\tbroken\t1",
			"",
		}, "\n"),
	)

	batchURLs := loadBatchInputURLs(root)
	if batchURLs["1"] != "https://jobs.example.com/acme" {
		t.Fatalf("expected extracted notes URL, got %q", batchURLs["1"])
	}
	if batchURLs["2"] != "https://jackjill.example/two" {
		t.Fatalf("expected fallback jackjill URL, got %q", batchURLs["2"])
	}

	jobURLs := loadJobURLs(root)
	if jobURLs["7"] != "https://jobs.example.com/acme" {
		t.Fatalf("expected raw report number lookup, got %q", jobURLs["7"])
	}
	if jobURLs["007"] != "https://jobs.example.com/acme" {
		t.Fatalf("expected zero-padded report number lookup, got %q", jobURLs["007"])
	}

	if got := normalizeCompany("Delta Technologies LLC"); got != "delta" {
		t.Fatalf("unexpected normalized company: %q", got)
	}
}

func TestMetricsProgressAndStatusHelpers(t *testing.T) {
	apps := []model.CareerApplication{
		{Date: "2026-03-03", Status: "Evaluada", Score: 4.6, HasPDF: true},
		{Date: "2026-03-10", Status: "Applied", Score: 4.1},
		{Date: "2026-03-17", Status: "Respondido", Score: 3.7},
		{Date: "2026-03-24", Status: "Interview", Score: 3.2},
		{Date: "2026-03-31", Status: "Offer", Score: 2.8},
		{Date: "2026-04-07", Status: "Rejected"},
		{Date: "2026-04-14", Status: "SKIP"},
	}

	metrics := ComputeMetrics(apps)
	if metrics.Total != len(apps) {
		t.Fatalf("expected total %d, got %d", len(apps), metrics.Total)
	}
	if metrics.WithPDF != 1 {
		t.Fatalf("expected 1 PDF, got %d", metrics.WithPDF)
	}
	if metrics.Actionable != 5 {
		t.Fatalf("expected 5 actionable apps, got %d", metrics.Actionable)
	}
	if math.Abs(metrics.AvgScore-3.68) > 0.001 {
		t.Fatalf("unexpected avg score: %.3f", metrics.AvgScore)
	}
	if metrics.TopScore != 4.6 {
		t.Fatalf("unexpected top score: %.1f", metrics.TopScore)
	}

	progress := ComputeProgressMetrics(apps)
	if progress.TotalOffers != 1 {
		t.Fatalf("expected 1 offer, got %d", progress.TotalOffers)
	}
	if progress.ActiveApps != 5 {
		t.Fatalf("expected 5 active apps, got %d", progress.ActiveApps)
	}
	if len(progress.FunnelStages) != 5 {
		t.Fatalf("expected 5 funnel stages, got %d", len(progress.FunnelStages))
	}
	if !reflect.DeepEqual(progress.ScoreBuckets, []model.ScoreBucket{
		{Label: "4.5-5.0", Count: 1},
		{Label: "4.0-4.4", Count: 1},
		{Label: "3.5-3.9", Count: 1},
		{Label: "3.0-3.4", Count: 1},
		{Label: "  <3.0", Count: 1},
	}) {
		t.Fatalf("unexpected score buckets: %+v", progress.ScoreBuckets)
	}
	if len(progress.WeeklyActivity) == 0 {
		t.Fatal("expected weekly activity entries")
	}
	if safePct(3, 0) != 0 {
		t.Fatal("expected safePct to guard divide-by-zero")
	}
	if math.Abs(safePct(1, 4)-25) > 0.001 {
		t.Fatalf("unexpected safePct result: %.2f", safePct(1, 4))
	}

	statuses := map[string]string{
		"Applied 2026-03-12": "applied",
		"Respondido":         "responded",
		"Oferta":             "offer",
		"Descartada":         "discarded",
		"geo blocker":        "skip",
		"something-new":      "something-new",
	}
	for raw, want := range statuses {
		if got := NormalizeStatus(raw); got != want {
			t.Fatalf("NormalizeStatus(%q) = %q, want %q", raw, got, want)
		}
	}

	if replaceStatusInLine("| x | Applied |", "Applied", "Offer") != "| x | Offer |" {
		t.Fatal("expected status replacement to update the first matching field")
	}
	if cleanTableCell("  remote only |  ") != "remote only" {
		t.Fatal("expected cleanTableCell to trim pipes and whitespace")
	}
	if StatusPriority("offer") >= StatusPriority("applied") {
		t.Fatal("expected offer to sort ahead of applied")
	}
}

func TestLoadReportSummaryAndStatusUpdate(t *testing.T) {
	root := t.TempDir()
	longTLDR := strings.Repeat("x", 130)

	writeTestFile(
		t,
		filepath.Join(root, "reports", "001.md"),
		strings.Join([]string{
			"**Arquetipo detectado** | Builder |",
			"**TL;DR** | " + longTLDR + " |",
			"**Remote** | Global remote |",
			"**Comp** | $180k |",
			"",
		}, "\n"),
	)
	writeTestFile(
		t,
		filepath.Join(root, "reports", "002.md"),
		strings.Join([]string{
			"**Arquetipo:** Advisor",
			"**TL;DR:** concise summary",
			"",
		}, "\n"),
	)

	archetype, tldr, remote, comp := LoadReportSummary(root, "reports/001.md")
	if archetype != "Builder" || remote != "Global remote" || comp != "$180k" {
		t.Fatalf("unexpected summary extraction: %q %q %q", archetype, remote, comp)
	}
	if len(tldr) != 120 || !strings.HasSuffix(tldr, "...") {
		t.Fatalf("expected truncated TL;DR, got %q", tldr)
	}

	archetype, tldr, _, _ = LoadReportSummary(root, "reports/002.md")
	if archetype != "Advisor" || tldr != "concise summary" {
		t.Fatalf("unexpected colon-format summary extraction: %q %q", archetype, tldr)
	}

	writeTestFile(
		t,
		filepath.Join(root, "data", "applications.md"),
		strings.Join([]string{
			"| #   | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"| 1 | 2026-04-01 | Acme | Engineer | 4.0/5 | Applied | ✅ | [001](reports/001.md) | note |",
			"| 2 | 2026-04-02 | Beta | Strategist | 4.5/5 | Applied | ✅ | reports/002.md | note 2 |",
			"",
		}, "\n"),
	)

	err := UpdateApplicationStatus(root, model.CareerApplication{
		ReportNumber: "001",
		Status:       "Applied",
	}, "Offer")
	if err != nil {
		t.Fatalf("unexpected update error: %v", err)
	}

	updated, err := os.ReadFile(filepath.Join(root, "data", "applications.md"))
	if err != nil {
		t.Fatalf("read updated tracker: %v", err)
	}
	if !strings.Contains(string(updated), "| 1 | 2026-04-01 | Acme | Engineer | 4.0/5 | Offer |") {
		t.Fatalf("expected updated status in tracker, got %q", string(updated))
	}

	err = UpdateApplicationStatus(root, model.CareerApplication{
		ReportPath:   "reports/002.md",
		ReportNumber: "002",
		Status:       "Applied",
	}, "Interview")
	if err != nil {
		t.Fatalf("unexpected bare-path update error: %v", err)
	}

	updated, err = os.ReadFile(filepath.Join(root, "data", "applications.md"))
	if err != nil {
		t.Fatalf("read updated tracker after bare-path update: %v", err)
	}
	if !strings.Contains(string(updated), "| 2 | 2026-04-02 | Beta | Strategist | 4.5/5 | Interview |") {
		t.Fatalf("expected bare-path status update in tracker, got %q", string(updated))
	}

	err = UpdateApplicationStatus(root, model.CareerApplication{
		ReportNumber: "999",
		Status:       "Applied",
	}, "Offer")
	if err == nil || !strings.Contains(err.Error(), "application not found") {
		t.Fatalf("expected not found error, got %v", err)
	}
}
