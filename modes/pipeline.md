# Mode: pipeline -- URL Inbox

Process accumulated job URLs from `data/pipeline.md`. The user can add URLs
whenever they want, then run the pipeline to process them in a batch.

## Workflow

1. Read `data/pipeline.md`.
2. Review `## Shortlist` first when it exists:
   - treat it as the recommended order of operations
   - start with the highest-ranked roles before touching adjacent/noisy roles
3. Find unchecked items `- [ ]` under `## Pending`.
4. For each pending URL you decide to process:
   a. Calculate the next sequential `REPORT_NUM` from `reports/`
   b. Extract the JD using the ATS helper first for supported Ashby,
      Greenhouse, and Lever URLs, then Playwright -> WebFetch -> WebSearch for
      everything else
   c. If the URL is inaccessible, mark it as `- [!]` with a note and continue
   d. Run the full auto-pipeline: evaluation A-F, legitimacy check G, report, PDF when eligible, tracker update
   e. Move it from `## Pending` to `## Processed`:

```markdown
- [x] #NNN | URL | Company | Role | Score/5 | PDF ✅/❌
```

5. If there are many pending URLs, process them in a controlled batch, but keep
   the shortlist order as the default priority.
6. At the end, show a summary table:

```text
| # | Company | Role | Score | PDF | Recommended action |
```

## Pipeline format

```markdown
# Pipeline

## Shortlist

Last refreshed: 2026-04-16 by npm run scan.
Campaign guidance: Current strongest lane cluster: Forward Deployed + Solutions. Use the top of the list below before touching adjacent/noisy roles.

Bucket counts:
- Strongest fit: 4
- Possible fit: 9
- Adjacent or noisy: 2

Top 10 to evaluate first:
1. Strongest fit | https://jobs.example.com/posting/123 | Example Co | Forward Deployed Engineer | direct forward-deployed title; remote-compatible

## Pending

- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job -- Error: login required

## Processed

- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | AI PM | 4.2/5 | PDF ✅
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF ❌
```

Notes:

- `## Shortlist` is generated guidance, not the executable queue
- the real queue remains the unchecked `- [ ]` entries under `## Pending`
- if the shortlist is stale, refresh it with `npm run scan`

## Smart JD extraction

1. **ATS helper first for supported hosted ATS URLs:** for Ashby, Greenhouse,
   and Lever postings, run:

   ```bash
   node scripts/extract-job.mjs <url>
   ```

   Reuse the returned `descriptionText` and normalized metadata when present.
2. **If the ATS helper does not support the URL or fails:** continue with the
   generic extraction chain below.
3. **Playwright (preferred):** `browser_navigate` + `browser_snapshot`
4. **WebFetch (fallback):** for static pages
5. **WebSearch (last resort):** for secondary indexing sites

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
