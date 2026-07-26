package data

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
)

func TestTrackerLockMatchesNodePathAndSerializesDashboardWrite(t *testing.T) {
	root := t.TempDir()
	trackerPath := filepath.Join(root, "data", "applications.md")
	writeTestFile(
		t,
		trackerPath,
		strings.Join([]string{
			"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |",
			"|---|------|---------|------|-------|--------|-----|--------|-------|",
			"| 1 | 2026-07-25 | Acme | Platform Engineer | 4.5/5 | Applied | | [001](reports/001-acme.md) | first |",
			"",
		}, "\n"),
	)
	canonical, err := canonicalPath(trackerPath)
	if err != nil {
		t.Fatal(err)
	}
	sum := sha256.Sum256([]byte(canonical))
	want := filepath.Join(
		os.TempDir(),
		"jobhunt-tracker-"+hex.EncodeToString(sum[:10])+".lock",
	)
	lockPath, err := trackerLockDirFor(trackerPath)
	if err != nil {
		t.Fatal(err)
	}
	if lockPath != want {
		t.Fatalf("Go lock path %q does not match Node lock path %q", lockPath, want)
	}

	lock, err := acquireTrackerLock(trackerPath, trackerLockOptions{
		timeout: 200 * time.Millisecond,
		retry:   5 * time.Millisecond,
		stale:   time.Minute,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = lock.release() })
	done := make(chan error, 1)
	go func() {
		done <- UpdateApplicationStatus(
			root,
			model.CareerApplication{
				Number:       1,
				Company:      "Acme",
				Role:         "Platform Engineer",
				ReportNumber: "001",
			},
			"Interview",
		)
	}()
	select {
	case err := <-done:
		t.Fatalf("dashboard write bypassed shared lock: %v", err)
	case <-time.After(40 * time.Millisecond):
	}

	content, err := os.ReadFile(trackerPath)
	if err != nil {
		t.Fatal(err)
	}
	content = []byte(strings.Replace(
		string(content),
		"\n",
		"\n| 2 | 2026-07-26 | Beta | Data Engineer | 4.1/5 | Applied | | [002](reports/002-beta.md) | concurrent |\n",
		1,
	))
	if err := os.WriteFile(trackerPath, content, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := lock.release(); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("dashboard write did not resume after lock release")
	}
	updated, err := os.ReadFile(trackerPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(updated), "| Interview |") ||
		!strings.Contains(string(updated), "| 2 | 2026-07-26 | Beta |") {
		t.Fatalf("serialized update lost data:\n%s", updated)
	}
	logContent, err := os.ReadFile(filepath.Join(root, "data", "status-log.tsv"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(logContent), "\tApplied\tInterview\tdashboard\t") {
		t.Fatalf("status transition not audited:\n%s", logContent)
	}
}

func TestHeaderAwareDashboardReadAndWrite(t *testing.T) {
	root := t.TempDir()
	trackerPath := filepath.Join(root, "data", "applications.md")
	writeTestFile(
		t,
		trackerPath,
		strings.Join([]string{
			"| Empresa | Notas | Estado | # | Puesto | Fecha | Informe | Puntuación | PDF | Ubicación | Vía |",
			"|---------|-------|--------|---|--------|-------|---------|------------|-----|-----------|-----|",
			"| Applied Materials | keep status words | Applied | 42 | Staff AI Engineer | 2026-07-26 | [042](reports/042-applied-materials.md) | 4.8/5 | ✅ | Tel Aviv | Referral |",
			"",
		}, "\n"),
	)
	apps := ParseApplications(root)
	if len(apps) != 1 {
		t.Fatalf("expected one parsed app, got %+v", apps)
	}
	app := apps[0]
	if app.Number != 42 || app.Company != "Applied Materials" ||
		app.Role != "Staff AI Engineer" || app.Status != "Applied" ||
		app.Score != 4.8 || app.ReportNumber != "042" {
		t.Fatalf("header-aware parse mismatch: %+v", app)
	}
	if err := UpdateApplicationStatus(root, app, "Hired"); err != nil {
		t.Fatal(err)
	}
	updated, err := os.ReadFile(trackerPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(
		string(updated),
		"| Applied Materials | keep status words | Hired | 42 |",
	) {
		t.Fatalf("wrong column changed:\n%s", updated)
	}
}

func TestDashboardRejectsNonCanonicalStatus(t *testing.T) {
	root := t.TempDir()
	writeTestFile(
		t,
		filepath.Join(root, "data", "applications.md"),
		"| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n| 1 | 2026-07-26 | Acme | Engineer | 4.0/5 | Applied | | [001](reports/001.md) | |\n",
	)
	err := UpdateApplicationStatus(
		root,
		model.CareerApplication{Number: 1, Company: "Acme", Role: "Engineer"},
		"Maybe",
	)
	if err == nil || !strings.Contains(err.Error(), "not canonical") {
		t.Fatalf("expected canonical status error, got %v", err)
	}
}
