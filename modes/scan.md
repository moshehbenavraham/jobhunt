# Mode: scan -- Portal Scanner

Scan configured job portals, filter by title relevance, and add new matches to the pipeline for later evaluation.

## What the current implementation actually does

The checked-in zero-token scanner is API-first. It:

- reads `portals.yml`
- scans enabled `tracked_companies` with a detectable ATS API
- filters titles through `title_filter`
- deduplicates against `data/scan-history.tsv`, `data/applications.md`, and `data/pipeline.md`
- appends new roles to `data/pipeline.md`
- logs seen URLs in `data/scan-history.tsv`

Do not over-promise broader search behavior that the current script does not implement.

## Configuration

Read `portals.yml`, which contains:

- `tracked_companies`: companies to scan directly
- `title_filter`: positive, negative, and seniority-boost title keywords
- `search_queries`: future or manual discovery queries; the current zero-token scanner does not use them directly

## Supported ATS families

- Greenhouse
- Ashby
- Lever

API detection is inferred from `api:` or from `careers_url`.

## Workflow

1. Read `portals.yml`.
2. Build the list of enabled companies with detectable APIs.
3. Load dedup sources:
   - `data/scan-history.tsv`
   - `data/applications.md`
   - `data/pipeline.md`
4. Fetch each detected API.
5. Normalize each job to `{title, url, company, location}`.
6. Apply title filtering:
   - at least one positive keyword must match, unless the positive list is empty
   - no negative keyword may match
7. Deduplicate by:
   - exact URL
   - normalized company + role pair
8. Append each new role to the `## Pending` section of `data/pipeline.md`:

```markdown
- [ ] {url} | {company} | {title}
```

9. Append each added URL to `data/scan-history.tsv`:

```text
url	first_seen	portal	title	company	status
```

10. Print a scan summary showing:
   - companies scanned
   - total jobs found
   - jobs filtered out
   - duplicates skipped
   - new roles added

## Pipeline file format

`data/pipeline.md` should use English section headings:

```markdown
# Pipeline

## Pending

- [ ] https://jobs.example.com/posting/123 | Example Co | Forward Deployed Engineer

## Processed
```

## Expected output summary

```text
Portal Scan -- {YYYY-MM-DD}
=============================================
Companies scanned:     N
Total jobs found:      N
Filtered by title:     N removed
Duplicates:            N skipped
New offers added:      N
```

## Tuning guidance

- tighten `title_filter.negative` if results are noisy
- broaden `title_filter.positive` if results are too thin
- add or remove `tracked_companies` based on fit
- make sure each tracked company has a working `careers_url`
- add explicit `api:` values when the ATS URL cannot be inferred cleanly
