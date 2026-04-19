# Mode: scan - Portal Scanner

Scan configured job portals, filter by title relevance, and turn the surviving
matches into a usable shortlist for later evaluation.

## What the current implementation actually does

The checked-in zero-token scanner is API-first. It:

- reads `portals.yml`
- reads `config/profile.yml` for optional discovery constraints
- scans enabled `tracked_companies` with a detectable supported ATS API
- supports Greenhouse, Ashby, and Lever board discovery
- filters titles through `title_filter.positive` and `title_filter.negative`
- filters locations through `config/profile.yml -> discovery` when configured
- deduplicates against `data/scan-history.tsv`, `data/applications.md`, and
  `data/pipeline.md`
- appends new roles to `data/pipeline.md`
- refreshes a generated `## Shortlist` section in `data/pipeline.md`
- logs seen URLs in `data/scan-history.tsv`
- creates missing `data/pipeline.md` and `data/scan-history.tsv` on live runs

Do not over-promise broader search behavior that the current script does not
implement.

## Configuration

Read `portals.yml`, which currently matters in these ways:

- `tracked_companies`: the live discovery surface for this scanner
- `title_filter.positive`: required title keywords unless the list is empty
- `title_filter.negative`: blocked title keywords

Read `config/profile.yml`, which currently matters in these ways:

- `discovery.remote_policy`: whether scan-time location filtering is disabled,
  remote-only, remote-or-allowed-locations, or allowed-locations-only
- `discovery.allowed_location_terms`: substring matches allowed for non-remote
  roles, such as `United States`, `US`, or `Israel`
- `discovery.blocked_location_terms`: explicit location substrings to reject
- `discovery.allowed_regions`: optional coarse region allowlist such as `US`,
  `EMEA`, `APAC`, `LATAM`, `CANADA`, `ISRAEL`, or `REMOTE`
- `discovery.blocked_regions`: optional coarse region blocklist
- `discovery.allow_unknown_locations`: whether non-remote roles with missing
  or ambiguous location should survive scan-time filtering
- `discovery.allow_remote_unknown_locations`: same, but for remote roles

Config that is allowed in `portals.yml` but not used by this scanner today:

- `search_queries`: manual or future discovery notes only
- `title_filter.seniority_boost`: ignored by the current scanner
- `tracked_companies.scan_method`: ignored by the current scanner
- `tracked_companies.scan_query`: ignored by the current scanner

## careers_url guidance

Prefer a branded company careers page in `careers_url` when one exists. Use an
ATS-hosted URL only as fallback when the company has no branded careers page.

This matters for two reasons:

- later liveness and application flows are often more stable on the company's
  own careers domain
- raw ATS URLs can produce false `410` or job-ID mismatch issues when the
  public posting is really anchored on the branded site

Keep the current zero-token scanner behavior in mind:

- ATS family detection only comes from `api:` or an ATS-shaped `careers_url`
- if `careers_url` points to a branded page that hides the ATS slug, set
  `api:` explicitly
- a branded `careers_url` without explicit `api:` will be skipped unless the
  URL itself still exposes a supported ATS pattern

## Supported ATS families

- Greenhouse
- Ashby
- Lever

API detection is inferred from `api:` or from `careers_url`.

## Workflow

1. Read `portals.yml`.
2. Select tracked companies within scope:
   - include companies matching `--company`, if provided
   - skip disabled companies
   - skip companies with no detectable supported ATS API
3. Load dedup sources:
   - `data/scan-history.tsv`
   - `data/applications.md`
   - `data/pipeline.md`
   - unless `--compare-clean` is used, which ignores prior dedup state for a
     clean tuning preview
4. Fetch each detected API.
5. Normalize each job to `{title, url, company, location}`.
6. Apply title filtering:
   - at least one positive keyword must match, unless the positive list is empty
   - no negative keyword may match
7. Apply location filtering from `config/profile.yml -> discovery`, when
   enabled:
   - remote roles can be kept broadly, or restricted, depending on
     `remote_policy`
   - non-remote roles can be restricted to allowed geographies
   - coarse blocked regions can remove obvious timezone or geography mismatch
8. Deduplicate by:
   - exact URL
   - normalized company + role pair
9. Append each new role to the `## Pending` section of `data/pipeline.md`:

```markdown
- [ ] {url} | {company} | {title}
```

10. Append each added URL to `data/scan-history.tsv`:

```text
url    first_seen    portal    title    company    status
```

11. Rebuild the generated `## Shortlist` section in `data/pipeline.md`:

- bucket pending roles into:
  - strongest fit
  - possible fit
  - adjacent or noisy
- generate a top 10 ranking
- add campaign guidance and explicit next-step instructions
- keep the actual execution queue in `## Pending`

12. Print a scan summary showing:

- companies configured
- companies scanned
- companies skipped, with reasons
- unsupported config that was ignored
- total jobs found
- jobs filtered out by title
- jobs filtered out by location
- profile discovery constraints in effect
- duplicates skipped
- new roles added
- shortlist bucket counts
- top 10 roles to evaluate first

## Pipeline file format

`data/pipeline.md` should use English section headings:

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

- [ ] https://jobs.example.com/posting/123 | Example Co | Forward Deployed Engineer

## Processed
```

## Expected output summary

```text
Portal Scan - {YYYY-MM-DD}
---------------------------------------------
Companies configured: N
Companies scanned:    N
Companies skipped:    N
Total jobs found:     N
Filtered by title:    N removed
Filtered by location: N removed
Duplicates:           N skipped
New offers added:     N
```

The live script also prints:

- a `Scanned companies` list
- a `Skipped companies` list with reasons
- an `Unsupported config` list when the config contains ignored fields
- a `Profile constraints` list when `config/profile.yml -> discovery` is active
- a `Location rejections` list summarizing which geographies were cut
- a `Shortlist buckets` block
- a `Campaign guidance` line
- a `Top 10 to evaluate first` block
- a concrete next step pointing the user to `data/pipeline.md -> ## Shortlist`

## Tuning guidance

- tighten `title_filter.negative` if results are noisy
- broaden `title_filter.positive` if results are too thin
- add or remove `tracked_companies` based on fit
- tune `config/profile.yml -> discovery` if geo-cloned roles still leak through
- prefer a branded `careers_url` when available, and add explicit `api:` when
  the branded page hides the supported ATS slug
- treat `search_queries` as manual notes until the scanner grows a broader
  discovery backend
- use `npm run scan -- --compare-clean` when retuning so the preview is not
  distorted by prior `scan-history.tsv`, `pipeline.md`, or tracker state
- after the shortlist looks right, run plain `npm run scan` so the live
  `## Shortlist` section is refreshed before you process roles
