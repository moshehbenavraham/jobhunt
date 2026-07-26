package data

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/moshehbenavraham/jobhunt/dashboard/internal/model"
)

var rePDFLink = regexp.MustCompile(`(?i)\]\((output/[^)]+\.pdf)\)`)

type pdfHashRef struct {
	Path   string `json:"path"`
	SHA256 string `json:"sha256"`
}

type pdfManifest struct {
	SchemaVersion int    `json:"schemaVersion"`
	GeneratedAt   string `json:"generatedAt"`
	Pipeline      struct {
		Version       string `json:"version"`
		VersionSHA256 string `json:"versionSha256"`
	} `json:"pipeline"`
	Candidate struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"candidate"`
	Job struct {
		Company  string `json:"company"`
		Role     string `json:"role"`
		JDSHA256 string `json:"jdSha256"`
	} `json:"job"`
	Inputs struct {
		BuildPath      string       `json:"buildPath"`
		BuildSHA256    string       `json:"buildSha256"`
		TemplatePath   string       `json:"templatePath"`
		TemplateSHA256 string       `json:"templateSha256"`
		Sources        []pdfHashRef `json:"sources"`
	} `json:"inputs"`
	Output struct {
		PDFPath    string `json:"pdfPath"`
		PDFSHA256  string `json:"pdfSha256"`
		HTMLPath   string `json:"htmlPath"`
		HTMLSHA256 string `json:"htmlSha256"`
		Format     string `json:"format"`
		PageCount  int    `json:"pageCount"`
	} `json:"output"`
	Validation struct {
		Valid bool `json:"valid"`
	} `json:"validation"`
}

type pdfManifestRecord struct {
	path     string
	manifest pdfManifest
}

func parsePDFCell(value string) (bool, string) {
	trimmed := strings.TrimSpace(strings.ReplaceAll(value, "**", ""))
	normalized := strings.ToLower(trimmed)
	if trimmed == "" || normalized == "no" || normalized == "false" ||
		normalized == "none" || normalized == "n/a" || normalized == "-" ||
		trimmed == "❌" {
		return false, ""
	}
	if match := rePDFLink.FindStringSubmatch(trimmed); match != nil {
		return true, filepath.ToSlash(match[1])
	}
	return strings.Contains(trimmed, "✅") || normalized == "yes" ||
		normalized == "true" || strings.Contains(normalized, ".pdf"), ""
}

func normalizePDFIdentity(value string) string {
	var result strings.Builder
	for _, r := range strings.ToLower(value) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			result.WriteRune(r)
		}
	}
	return result.String()
}

func pdfIdentityKey(company, role string) string {
	return normalizePDFIdentity(company) + "::" + normalizePDFIdentity(role)
}

func sha256Path(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:]), nil
}

func sha256String(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func resolvePDFArtifact(root, manifestPath, artifactPath string) (string, error) {
	if artifactPath == "" {
		return "", fmt.Errorf("artifact path missing")
	}
	if filepath.IsAbs(artifactPath) {
		absolute := filepath.Clean(artifactPath)
		rel, err := filepath.Rel(filepath.Dir(manifestPath), absolute)
		if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
			return "", fmt.Errorf("absolute artifact is not beside its manifest")
		}
		return absolute, nil
	}

	absolute := filepath.Join(root, filepath.FromSlash(artifactPath))
	rel, err := filepath.Rel(root, absolute)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return "", fmt.Errorf("artifact escapes project root")
	}
	return absolute, nil
}

func pdfManifestFreshness(root string, record pdfManifestRecord) []string {
	manifest := record.manifest
	issues := make([]string, 0)
	checkHash := func(label, path, expected string) {
		if path == "" || expected == "" {
			issues = append(issues, label+" path/hash missing")
			return
		}
		absolute, err := resolvePDFArtifact(root, record.path, path)
		if err != nil {
			issues = append(issues, label+": "+err.Error())
			return
		}
		actual, err := sha256Path(absolute)
		if err != nil {
			issues = append(issues, label+" unavailable")
		} else if actual != expected {
			issues = append(issues, label+" changed")
		}
	}

	if manifest.SchemaVersion != 1 {
		issues = append(issues, "unsupported manifest schema version")
	}
	if manifest.Candidate.Name == "" || manifest.Candidate.Email == "" {
		issues = append(issues, "candidate identity missing")
	}
	if manifest.Job.Company == "" || manifest.Job.Role == "" || manifest.Job.JDSHA256 == "" {
		issues = append(issues, "job identity/JD hash missing")
	}
	if manifest.Output.Format != "letter" && manifest.Output.Format != "a4" {
		issues = append(issues, "paper format missing or invalid")
	}
	if manifest.Output.PageCount < 1 {
		issues = append(issues, "page count missing or invalid")
	}
	if len(manifest.Inputs.Sources) == 0 {
		issues = append(issues, "profile source hashes missing")
	}

	checkHash("PDF", manifest.Output.PDFPath, manifest.Output.PDFSHA256)
	checkHash("structured build", manifest.Inputs.BuildPath, manifest.Inputs.BuildSHA256)
	checkHash("template", manifest.Inputs.TemplatePath, manifest.Inputs.TemplateSHA256)
	checkHash("rendered HTML", manifest.Output.HTMLPath, manifest.Output.HTMLSHA256)
	seenSources := make(map[string]bool)
	for _, source := range manifest.Inputs.Sources {
		if source.Path == "" || source.SHA256 == "" {
			issues = append(issues, "profile source path/hash missing")
			continue
		}
		if seenSources[source.Path] {
			issues = append(issues, "duplicate profile source "+source.Path)
			continue
		}
		seenSources[source.Path] = true
		checkHash("source "+source.Path, source.Path, source.SHA256)
	}

	versionBytes, err := os.ReadFile(filepath.Join(root, "VERSION"))
	if err != nil {
		issues = append(issues, "VERSION unavailable")
	} else {
		version := strings.TrimSpace(string(versionBytes))
		if manifest.Pipeline.Version != version ||
			manifest.Pipeline.VersionSHA256 != sha256String(version) {
			issues = append(issues, "pipeline version changed")
		}
	}

	buildPath, err := resolvePDFArtifact(root, record.path, manifest.Inputs.BuildPath)
	if err != nil {
		issues = append(issues, "JD hash unavailable")
	} else {
		var build struct {
			Job struct {
				JDText string `json:"jdText"`
			} `json:"job"`
		}
		content, readErr := os.ReadFile(buildPath)
		if readErr != nil || json.Unmarshal(content, &build) != nil ||
			manifest.Job.JDSHA256 != sha256String(build.Job.JDText) {
			issues = append(issues, "JD hash changed")
		}
	}

	return issues
}

func loadPDFManifestRecords(root string) []pdfManifestRecord {
	files, err := filepath.Glob(filepath.Join(root, "output", "*.manifest.json"))
	if err != nil {
		return nil
	}
	records := make([]pdfManifestRecord, 0, len(files))
	for _, path := range files {
		content, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var manifest pdfManifest
		if json.Unmarshal(content, &manifest) != nil {
			continue
		}
		records = append(records, pdfManifestRecord{path: path, manifest: manifest})
	}
	sort.Slice(records, func(i, j int) bool {
		return records[i].manifest.GeneratedAt > records[j].manifest.GeneratedAt
	})
	return records
}

func matchPDFManifest(app model.CareerApplication, records []pdfManifestRecord) (pdfManifestRecord, bool) {
	if app.PDFPath != "" {
		for _, record := range records {
			if filepath.ToSlash(record.manifest.Output.PDFPath) == app.PDFPath ||
				filepath.Base(record.manifest.Output.PDFPath) == filepath.Base(app.PDFPath) {
				return record, true
			}
		}
		return pdfManifestRecord{}, false
	}
	key := pdfIdentityKey(app.Company, app.Role)
	for _, record := range records {
		if pdfIdentityKey(record.manifest.Job.Company, record.manifest.Job.Role) == key {
			return record, true
		}
	}
	return pdfManifestRecord{}, false
}

func latestPDFSourceModTime(root string) time.Time {
	var latest time.Time
	for _, relativePath := range []string{
		"profile/cv.md",
		"cv.md",
		"profile/article-digest.md",
		"article-digest.md",
		"config/profile.yml",
		"modes/_profile.md",
		"templates/cv-template.html",
	} {
		info, err := os.Stat(filepath.Join(root, filepath.FromSlash(relativePath)))
		if err == nil && info.ModTime().After(latest) {
			latest = info.ModTime()
		}
	}
	return latest
}

func findLegacyPDF(root string, app model.CareerApplication) string {
	if app.PDFPath != "" {
		path := filepath.Join(root, filepath.FromSlash(app.PDFPath))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			return path
		}
	}
	files, _ := filepath.Glob(filepath.Join(root, "output", "*.pdf"))
	company := normalizePDFIdentity(app.Company)
	var best string
	var bestMod time.Time
	for _, path := range files {
		if company == "" || !strings.Contains(normalizePDFIdentity(filepath.Base(path)), company) {
			continue
		}
		info, err := os.Stat(path)
		if err == nil && info.ModTime().After(bestMod) {
			best = path
			bestMod = info.ModTime()
		}
	}
	return best
}

func enrichPDFStatuses(root string, apps []model.CareerApplication) {
	records := loadPDFManifestRecords(root)
	sourceModTime := latestPDFSourceModTime(root)
	for index := range apps {
		app := &apps[index]
		if !app.HasPDF {
			app.PDFStatus = "none"
			continue
		}

		record, found := matchPDFManifest(*app, records)
		if found {
			app.PDFManifest = relativeOrAbsolute(root, record.path)
			if !record.manifest.Validation.Valid {
				app.PDFStatus = "invalid"
				app.PDFIssue = "manifest validation failed"
				continue
			}
			resolvedPDF, err := resolvePDFArtifact(
				root,
				record.path,
				record.manifest.Output.PDFPath,
			)
			if err != nil {
				app.PDFStatus = "invalid"
				app.PDFIssue = "unsafe PDF artifact path"
				continue
			}
			app.PDFPath = relativeOrAbsolute(root, resolvedPDF)
			issues := pdfManifestFreshness(root, record)
			if len(issues) > 0 {
				app.PDFStatus = "stale"
				app.PDFIssue = strings.Join(issues, "; ")
			} else {
				app.PDFStatus = "fresh"
			}
			continue
		}

		legacyPath := findLegacyPDF(root, *app)
		if legacyPath == "" {
			app.PDFStatus = "missing"
			app.PDFIssue = "tracker marks a PDF but no file or manifest was found"
			continue
		}
		app.PDFPath = relativeOrAbsolute(root, legacyPath)
		info, err := os.Stat(legacyPath)
		if err == nil && !sourceModTime.IsZero() && sourceModTime.After(info.ModTime()) {
			app.PDFStatus = "stale"
			app.PDFIssue = "candidate source or template is newer than this legacy PDF"
		} else {
			app.PDFStatus = "legacy"
			app.PDFIssue = "no validation manifest"
		}
	}
}

func relativeOrAbsolute(root, path string) string {
	rel, err := filepath.Rel(root, path)
	if err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel) {
		return filepath.ToSlash(rel)
	}
	return path
}
