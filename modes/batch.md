# Mode: batch -- Bulk Job Processing

Two usage modes:

- **interactive conductor** for navigating live portals
- **standalone runner** for already-collected URLs

## Architecture

```text
Interactive conductor (browser automation)
  |
  | Chrome: navigate portals with logged-in sessions
  | Read the DOM directly while the user sees everything
  |
  |- Job 1: read JD text + URL from the DOM
  |  -> codex exec worker -> result.json + report + PDF + tracker TSV
  |
  |- Job 2: click next, read JD + URL
  |  -> codex exec worker -> result.json + report + PDF + tracker TSV
  |
  `- Finish: merge tracker additions into applications.md + summary
```

Each worker is a child `codex exec` process with a resolved prompt and a JSON output contract. The conductor only orchestrates.

## Files

```text
batch/
  batch-input.tsv
  batch-state.tsv
  batch-runner.sh
  batch-prompt.md
  worker-result.schema.json
  logs/
  tracker-additions/
```

## Mode A: interactive conductor

1. Read `batch/batch-state.tsv` to see what is already processed.
2. Navigate the portal in Chrome.
3. Extract result URLs from the DOM and append them to `batch-input.tsv`.
4. For each pending URL:
   a. click the role in Chrome and read JD text from the DOM
   b. save the JD to `/tmp/batch-jd-{id}.txt`
   c. calculate the next sequential report number
   d. resolve `batch/batch-prompt.md` with `URL`, `JD_FILE`, `REPORT_NUM`, `DATE`, `ID`, and `RESULT_FILE`
   e. run the worker via Bash
   f. read `batch/logs/{report_num}-{id}.result.json` and update `batch-state.tsv`
   g. go back in Chrome and continue
5. Paginate if needed.
6. Merge `tracker-additions/` into `applications.md` and show a summary.

## Mode B: standalone runner

```bash
batch/batch-runner.sh [OPTIONS]
```

Options:

- `--dry-run` - list pending items without running them
- `--retry-failed` - retry only failed items
- `--start-from N` - start from ID N
- `--parallel N` - run N workers in parallel
- `--max-retries N` - retries per job (default: 2)

## `batch-state.tsv` format

```text
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-...	2026-...	002	4.2	-	0
2	https://...	partial	2026-...	2026-...	003	4.0	warnings: pdf-not-generated	0
3	https://...	failed	2026-...	2026-...	004	-	semantic: missing-jd-text	0
4	https://...	failed	2026-...	2026-...	005	-	infrastructure: exit 17; worker timed out	1
```

## Resumability

- rerun safely; completed, partial, and skipped jobs should not be repeated
- `batch-runner.pid` prevents duplicate runners
- `--retry-failed` should focus on infrastructure failures under the retry cap
- each worker is independent; failure on one job must not block the rest

## Worker outputs

Each worker should produce:

1. a report in `reports/`
2. a PDF in `output/`
3. a tracker TSV in `batch/tracker-additions/`
4. a result JSON in `batch/logs/`
5. a copy of the final message in `batch/logs/`

## Error handling

| Error | Recovery |
| --- | --- |
| URL inaccessible | worker fails semantically or infrastructurally depending on the case |
| JD behind login | conductor tries the DOM first; otherwise mark failed |
| portal layout changed | conductor adapts based on HTML structure |
| worker crashed | runner marks infrastructure failure and allows retry |
| conductor crashed | rerun and resume from state |
| PDF failed | mark the job `partial`; the report may still be useful |
