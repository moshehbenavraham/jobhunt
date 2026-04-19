# Scripts Reference

All scripts live in the project root as `.mjs` modules and are exposed via `npm run <name>`.

## Quick Reference

| Command                | Script                               | Purpose                                    |
| ---------------------- | ------------------------------------ | ------------------------------------------ |
| `npm run cron:install` | `scripts/install-scan-cron.mjs`      | Install repo-managed daily scan cron       |
| `npm run doctor`       | `scripts/doctor.mjs`                 | Validate setup prerequisites               |
| `npm run verify`       | `scripts/verify-pipeline.mjs`        | Check pipeline data integrity              |
| `npm run normalize`    | `scripts/normalize-statuses.mjs`     | Fix non-canonical statuses                 |
| `npm run dedup`        | `scripts/dedup-tracker.mjs`          | Remove duplicate tracker entries           |
| `npm run merge`        | `scripts/merge-tracker.mjs`          | Merge batch TSVs into applications.md      |
| `npm run pdf`          | `scripts/generate-pdf.mjs`           | Convert HTML to ATS-optimized PDF          |
| `npm run latex`        | `scripts/generate-latex.mjs`         | Validate and compile an optional LaTeX CV  |
| `npm run sync-check`   | `scripts/cv-sync-check.mjs`          | Validate CV/profile consistency            |
| `npm run coverage`     | `c8` + `go test -cover`              | Measure Node script and dashboard coverage |
| `npm run update:check` | `scripts/update-system.mjs check`    | Check for upstream updates                 |
| `npm run update`       | `scripts/update-system.mjs apply`    | Apply upstream update                      |
| `npm run rollback`     | `scripts/update-system.mjs rollback` | Rollback last update                       |
| `npm run liveness`     | `scripts/check-liveness.mjs`         | Test if job URLs are still active          |
| `npm run extract-job`  | `scripts/extract-job.mjs`            | Extract one ATS-backed job as JSON         |
| `npm run scan`         | `scripts/scan.mjs`                   | Zero-token portal scanner                  |

---

## cron:install

Installs or refreshes the checked-in daily scan cron entry in the current
user's crontab. The active cron line calls the repo-owned
`scripts/run-scheduled-scan.sh` runner, which writes logs to
`tmp/cron/scan.log`.

```bash
npm run cron:install
npm run cron:install -- --hour 6 --minute 0
npm run cron:install -- --remove
```

Notes:

- default schedule is `06:00` host local time
- intended host timezone is `Asia/Jerusalem` when you want Israel-local runs
- the installer replaces only the tagged `jobhunt daily scan` block and leaves
  other cron entries untouched

**Exit codes:** `0` success, `1` invalid arguments or crontab failure.

---

## doctor

Validates that all prerequisites are in place: Node.js >= 18, dependencies installed, Playwright chromium, required files (`profile/cv.md`, `config/profile.yml`, `portals.yml`), fonts directory, and auto-creates `data/`, `output/`, `reports/` if missing.

```bash
npm run doctor
```

**Exit codes:** `0` all checks passed, `1` one or more checks failed (fix messages printed).

---

## verify

Health check for pipeline data integrity. Validates `data/applications.md` against seven rules: canonical statuses (per `templates/states.yml`), no duplicate company+role pairs, all report links point to existing files, scores match `X.XX/5` / `N/A` / `DUP`, rows have proper pipe-delimited format, no pending TSVs in `batch/tracker-additions/`, and no markdown bold in scores.

```bash
npm run verify
```

**Exit codes:** `0` pipeline clean (zero errors), `1` errors found. Warnings (e.g. possible duplicates) do not cause a non-zero exit.

---

## normalize

Maps non-canonical statuses to their canonical equivalents and strips markdown bold and dates from the status column. Aliases like `Enviada` become `Aplicado`, `CERRADA` becomes `Descartado`, etc. DUPLICADO info is moved to the notes column.

```bash
npm run normalize             # apply changes
npm run normalize -- --dry-run  # preview without writing
```

Creates a `.bak` backup of `applications.md` before writing.

**Exit codes:** `0` always (changes or no changes).

---

## dedup

Removes duplicate entries from `applications.md` by grouping on normalized company name + fuzzy role match. Keeps the entry with the highest score. If a removed entry had a more advanced pipeline status, that status is promoted to the keeper.

```bash
npm run dedup             # apply changes
npm run dedup -- --dry-run  # preview without writing
```

Creates a `.bak` backup before writing.

**Exit codes:** `0` always.

---

## merge

Merges batch tracker additions (`batch/tracker-additions/*.tsv`) into `applications.md`. Handles 9-column TSV, 8-column TSV, and pipe-delimited markdown formats. Detects duplicates by report number, entry number, and company+role fuzzy match. Higher-scored re-evaluations update existing entries in place.

```bash
npm run merge                 # apply merge
npm run merge -- --dry-run    # preview without writing
npm run merge -- --verify     # merge then run verify-pipeline
```

Processed TSVs are moved to `batch/tracker-additions/merged/`.

**Exit codes:** `0` success, `1` verification errors (with `--verify`).

---

## pdf

Renders an HTML file to a print-quality, ATS-parseable PDF via headless Chromium. Resolves font paths from `fonts/`, normalizes Unicode for ATS compatibility (em-dashes, smart quotes, zero-width characters), and reports page count and file size.

```bash
npm run pdf -- input.html output.pdf
npm run pdf -- input.html output.pdf --format=letter   # US letter
npm run pdf -- input.html output.pdf --format=a4        # A4 (default)
```

**Exit codes:** `0` PDF generated, `1` missing arguments or generation failure.

The ATS normalization regression is covered by `scripts/test-generate-pdf-normalization.mjs` with checked-in HTML fixtures under `scripts/test-fixtures/`. It runs as part of `node scripts/test-all.mjs --quick`.

---

## latex

Validates a `.tex` CV against the repo's LaTeX guardrails, then compiles it
with `pdflatex` when the local toolchain is available. This is the optional
LaTeX / Overleaf path; the default ATS-first flow remains `npm run pdf`.

```bash
npm run latex -- input.tex output.pdf
npm run latex -- output/cv-jane-openai-2026-04-19.tex
```

Notes:

- requires `pdflatex` on `PATH`
- supported local distributions include TeX Live and MiKTeX
- if the output path is omitted, the PDF is written beside the input `.tex`
- validation failures exit with code `1`, print a JSON report, and skip
  compilation
- missing `pdflatex` returns a clear actionable error instead of silently
  failing; the same `.tex` can still be uploaded to Overleaf

**Exit codes:** `0` validation and compile succeeded, `1` invalid input or
compile failure.

The LaTeX validation regression is covered by `scripts/test-generate-latex.mjs`
and runs as part of `node scripts/test-all.mjs --quick`.

---

## sync-check

Validates that the jobhunt setup is internally consistent: `profile/cv.md` exists and is not too short, `config/profile.yml` exists with required fields, no hardcoded metrics in `modes/_shared.md` or `batch/batch-prompt.md`, and `profile/article-digest.md` freshness (warns if older than 30 days).

```bash
npm run sync-check
```

**Exit codes:** `0` no errors (warnings allowed), `1` errors found.

---

## coverage

Measures actual code coverage instead of only pass/fail health.

```bash
npm run coverage
```

This runs two coverage passes:

- `npm run coverage:node` wraps `node scripts/test-all.mjs --quick` with `c8`
  and writes reports to `coverage/node/`.
- `npm run coverage:dashboard` runs `go test ./... -covermode=atomic
-coverprofile=coverage.out` inside `dashboard/` and prints the summary from
  `go tool cover -func=coverage.out`.

Useful variants:

```bash
npm run coverage:node
npm run coverage:dashboard
npm run coverage:dashboard:html
```

`coverage:dashboard:html` writes `dashboard/coverage.html` after
`dashboard/coverage.out` already exists.

**Exit codes:** `0` both coverage runs succeeded, `1` either coverage run failed.

---

## update:check

Checks whether a newer version of jobhunt is available upstream. Outputs JSON to stdout:

```bash
npm run update:check
```

Possible JSON responses:

| `status`           | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| `up-to-date`       | Local version matches remote                                   |
| `update-available` | Newer version exists (includes `local`, `remote`, `changelog`) |
| `dismissed`        | User dismissed the update prompt                               |
| `offline`          | Could not reach GitHub                                         |

**Exit codes:** `0` always.

---

## update

Applies the upstream update. Creates a backup branch (`backup-pre-update-{version}`), fetches from the canonical repo, checks out only system-layer files, runs `npm install`, and commits. User-layer files (`profile/cv.md`, `config/profile.yml`, `data/`, etc.) are never touched.

```bash
npm run update
```

**Exit codes:** `0` success, `1` lock conflict or safety violation.

---

## rollback

Restores system-layer files from the most recent backup branch created during an update.

```bash
npm run rollback
```

**Exit codes:** `0` success, `1` no backup branch found or git error.

---

## extract-job

Extracts a single job posting directly from a supported ATS URL and prints a
normalized JSON payload. This is the repo-owned single-job counterpart to the
scanner's ATS fetch logic.

Supported hosted ATS URL families:

- `jobs.ashbyhq.com`
- `boards.greenhouse.io`
- `job-boards.greenhouse.io`
- `job-boards.eu.greenhouse.io`
- `jobs.lever.co`

```bash
npm run extract-job -- https://jobs.ashbyhq.com/livekit/1757f49e-7e19-4c45-85f7-e4637dff66fb
npm run extract-job -- https://job-boards.greenhouse.io/figma/jobs/5364702004
npm run extract-job -- https://jobs.lever.co/entrata/3793997e-8983-4995-b896-4031c8169f63
```

Output fields include:

- ATS type and source URL
- normalized job URL and apply URL
- company slug plus best-effort company name
- title, location, department/team, employment type, workplace type
- published date
- normalized compensation object when the ATS exposes it
- JD HTML and plain-text content

`scripts/scan.mjs` and `scripts/extract-job.mjs` both reuse the shared
`scripts/ats-core.mjs` module so ATS parsing stays aligned across batch scan
and single-URL extraction.

For supported Ashby, Greenhouse, and Lever job URLs, auto-pipeline uses this
helper first. If the helper does not support the URL or extraction fails, fall
back to Playwright, WebFetch, then WebSearch.

**Exit codes:** `0` success, `1` unsupported URL or extraction failure.

---

## liveness

Tests whether job posting URLs are still live using headless Chromium. Detects expired patterns (e.g. "job no longer available"), HTTP 404/410, ATS redirect patterns, and apply-button presence. Supports multi-language expired patterns (English, German, French).

```bash
npm run liveness -- https://example.com/job/123
npm run liveness -- https://a.com/job/1 https://b.com/job/2
npm run liveness -- --file urls.txt
```

Each URL gets a verdict: `active`, `expired`, or `uncertain` with a reason.

**Exit codes:** `0` all URLs active, `1` any expired or uncertain.

---

## scan

Zero-token portal scanner. Hits ATS APIs (Greenhouse, Ashby, Lever) directly,
applies title filters from `portals.yml`, applies optional location constraints
from `config/profile.yml -> discovery`, appends matching listings to
`data/pipeline.md`, and refreshes the generated `## Shortlist` section with
bucket counts, campaign guidance, and a top-10 ranking.

```bash
npm run scan
npm run scan -- --compare-clean
```

**Exit codes:** `0` scan completed, `1` configuration error or no portals.yml found.

---

## scan-state

Developer-oriented maintenance command for `data/pipeline.md` and
`data/scan-history.tsv`. Use this when you intentionally want to archive or
reset scan artifacts during testing or when changing campaigns. Archives are
written to `tmp/scan-state/<timestamp>/`.

```bash
npm run scan-state -- --archive-pipeline
npm run scan-state -- --archive-history
npm run scan-state -- --archive-all
npm run scan-state -- --reset-pipeline
npm run scan-state -- --reset-history --yes
```

Recommended usage:

- normal retuning: prefer `npm run scan -- --compare-clean`
- inbox cleanup: `npm run scan-state -- --archive-pipeline`
- destructive history wipe: `npm run scan-state -- --reset-history --yes`

Notes:

- `--archive-*` recreates a fresh scaffold after moving the old file
- `--reset-history` requires `--yes`
- normal users should usually keep `data/scan-history.tsv` intact because it
  powers dedup and repost-pattern signals

**Exit codes:** `0` success, `1` invalid usage or refused destructive reset.
