# Mode: pipeline -- URL Inbox

Process accumulated job URLs from `data/pipeline.md`. The user can add URLs whenever they want, then run the pipeline to process them in a batch.

## Workflow

1. Read `data/pipeline.md` and find unchecked items `- [ ]` under `## Pending`.
2. For each pending URL:
   a. Calculate the next sequential `REPORT_NUM` from `reports/`
   b. Extract the JD using Playwright -> WebFetch -> WebSearch
   c. If the URL is inaccessible, mark it as `- [!]` with a note and continue
   d. Run the full auto-pipeline: evaluation A-F, legitimacy check G, report, PDF when eligible, tracker update
   e. Move it from `## Pending` to `## Processed`:

```markdown
- [x] #NNN | URL | Company | Role | Score/5 | PDF ✅/❌
```

3. If there are many pending URLs, process them in a controlled batch.
4. At the end, show a summary table:

```text
| # | Company | Role | Score | PDF | Recommended action |
```

## Pipeline format

```markdown
# Pipeline

## Pending

- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job -- Error: login required

## Processed

- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | AI PM | 4.2/5 | PDF ✅
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF ❌
```

## Smart JD extraction

1. **Playwright (preferred):** `browser_navigate` + `browser_snapshot`
2. **WebFetch (fallback):** for static pages
3. **WebSearch (last resort):** for secondary indexing sites

Special cases:

- **LinkedIn:** may require login; ask the user to paste the JD text if needed
- **PDF:** if the URL points directly to a PDF, read it directly
- **`local:` prefix:** read the referenced local file

## Sequential numbering

1. List files in `reports/`
2. Extract the numeric prefix
3. Use max + 1

## Source sync

Before processing URLs, run:

```bash
node scripts/cv-sync-check.mjs
```

If sync warnings appear, notify the user before continuing.
