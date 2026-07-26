package data

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
)

const statusLogHeader = "event_id\ttimestamp\tapp_num\treport_num\tcompany\trole\tfrom_status\tto_status\tsource\tnote\n"

type statusTransitionJournal struct {
	SchemaVersion     int    `json:"schemaVersion"`
	TrackerBasename   string `json:"trackerBasename"`
	StatusLogBasename string `json:"statusLogBasename"`
	BeforeSHA256      string `json:"beforeSha256"`
	AfterSHA256       string `json:"afterSha256"`
	LogLine           string `json:"logLine"`
}

func sha256Text(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}

func tsvTrackerCell(value string) string {
	return strings.ReplaceAll(sanitizeTrackerCell(value), "\t", " ")
}

func appendStatusLogAtomic(path, line string) error {
	content := statusLogHeader
	if existing, err := os.ReadFile(path); err == nil {
		content = string(existing)
	} else if !errors.Is(err, fs.ErrNotExist) {
		return err
	}
	eventID := strings.SplitN(line, "\t", 2)[0]
	for _, existingLine := range strings.Split(content, "\n") {
		if strings.SplitN(existingLine, "\t", 2)[0] == eventID {
			return nil
		}
	}
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	return writeFileAtomic(path, []byte(content+line))
}

func recoverStatusTransitionJournals(
	careerOpsPath, trackerPath string,
	trackerContent []byte,
) error {
	dataDirectory := filepath.Join(careerOpsPath, "data")
	entries, err := os.ReadDir(dataDirectory)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	names := make([]string, 0)
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".status-transition-") &&
			strings.HasSuffix(entry.Name(), ".json") {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)
	statusLogPath := filepath.Join(dataDirectory, "status-log.tsv")
	currentHash := sha256Text(trackerContent)
	for _, name := range names {
		journalPath := filepath.Join(dataDirectory, name)
		content, err := os.ReadFile(journalPath)
		if err != nil {
			return err
		}
		var journal statusTransitionJournal
		if err := json.Unmarshal(content, &journal); err != nil {
			return fmt.Errorf("unreadable status transition journal %s: %w", name, err)
		}
		if journal.TrackerBasename != filepath.Base(trackerPath) ||
			journal.StatusLogBasename != filepath.Base(statusLogPath) {
			return fmt.Errorf("status transition journal has invalid targets: %s", name)
		}
		switch currentHash {
		case journal.BeforeSHA256:
			if err := os.Remove(journalPath); err != nil {
				return err
			}
		case journal.AfterSHA256:
			if err := appendStatusLogAtomic(statusLogPath, journal.LogLine); err != nil {
				return err
			}
			if err := os.Remove(journalPath); err != nil {
				return err
			}
		default:
			return fmt.Errorf(
				"cannot recover %s: tracker changed outside the recorded transition",
				name,
			)
		}
	}
	return nil
}

func commitTrackerStatusTransition(
	careerOpsPath, trackerPath string,
	before, after []byte,
	app model.CareerApplication,
	fromStatus, toStatus string,
) error {
	dataDirectory := filepath.Join(careerOpsPath, "data")
	if err := os.MkdirAll(dataDirectory, 0o755); err != nil {
		return err
	}
	eventID, err := randomLockToken()
	if err != nil {
		return err
	}
	reportNumber := app.ReportNumber
	if reportNumber == "" && app.ReportPath != "" {
		reportNumber = reportNumberFromPath(app.ReportPath)
	}
	logLine := strings.Join([]string{
		eventID,
		time.Now().UTC().Format(time.RFC3339Nano),
		strconv.Itoa(app.Number),
		reportNumber,
		tsvTrackerCell(app.Company),
		tsvTrackerCell(app.Role),
		tsvTrackerCell(fromStatus),
		tsvTrackerCell(toStatus),
		"dashboard",
		"",
	}, "\t") + "\n"
	statusLogPath := filepath.Join(dataDirectory, "status-log.tsv")
	journal := statusTransitionJournal{
		SchemaVersion:     1,
		TrackerBasename:   filepath.Base(trackerPath),
		StatusLogBasename: filepath.Base(statusLogPath),
		BeforeSHA256:      sha256Text(before),
		AfterSHA256:       sha256Text(after),
		LogLine:           logLine,
	}
	journalContent, err := json.MarshalIndent(journal, "", "  ")
	if err != nil {
		return err
	}
	journalPath := filepath.Join(
		dataDirectory,
		".status-transition-"+eventID+".json",
	)
	if err := writeFileAtomic(journalPath, append(journalContent, '\n')); err != nil {
		return err
	}
	if err := os.WriteFile(trackerPath+".bak", before, 0o644); err != nil {
		_ = os.Remove(journalPath)
		return err
	}
	if err := writeFileAtomic(trackerPath, after); err != nil {
		_ = os.Remove(journalPath)
		return err
	}
	if err := appendStatusLogAtomic(statusLogPath, logLine); err != nil {
		rollbackErr := writeFileAtomic(trackerPath, before)
		if rollbackErr == nil {
			_ = os.Remove(journalPath)
			return err
		}
		return errors.Join(err, fmt.Errorf("rollback tracker: %w", rollbackErr))
	}
	return os.Remove(journalPath)
}

func resolveCanonicalTrackerStatus(careerOpsPath, input string) (string, error) {
	clean := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(input, "**", "")))
	if clean == "" {
		return "", fmt.Errorf("status is empty")
	}
	statesPath := filepath.Join(careerOpsPath, "templates", "states.yml")
	content, err := os.ReadFile(statesPath)
	if err == nil {
		var id, label string
		var aliases []string
		flush := func() string {
			for _, candidate := range append([]string{id, label}, aliases...) {
				if strings.EqualFold(strings.TrimSpace(candidate), clean) {
					return label
				}
			}
			return ""
		}
		for _, rawLine := range strings.Split(string(content), "\n") {
			line := strings.TrimSpace(rawLine)
			if strings.HasPrefix(line, "- id:") {
				if canonical := flush(); canonical != "" {
					return canonical, nil
				}
				id = strings.TrimSpace(strings.TrimPrefix(line, "- id:"))
				label = ""
				aliases = nil
			} else if strings.HasPrefix(line, "label:") {
				label = strings.TrimSpace(strings.TrimPrefix(line, "label:"))
			} else if strings.HasPrefix(line, "aliases:") {
				value := strings.TrimSpace(strings.TrimPrefix(line, "aliases:"))
				value = strings.Trim(value, "[]")
				for _, alias := range strings.Split(value, ",") {
					aliases = append(aliases, strings.Trim(strings.TrimSpace(alias), `"'`))
				}
			}
		}
		if canonical := flush(); canonical != "" {
			return canonical, nil
		}
		return "", fmt.Errorf("status %q is not canonical in templates/states.yml", input)
	}
	if !errors.Is(err, fs.ErrNotExist) {
		return "", err
	}
	fallback := map[string]string{
		"evaluated": "Evaluated", "applied": "Applied", "responded": "Responded",
		"interview": "Interview", "offer": "Offer", "hired": "Hired",
		"rejected": "Rejected", "discarded": "Discarded", "skip": "SKIP",
	}
	if canonical := fallback[clean]; canonical != "" {
		return canonical, nil
	}
	return "", fmt.Errorf("status %q is not canonical", input)
}
