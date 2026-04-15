# Third-Party Connections

This document is intentionally narrow. It covers only the external recruiting surfaces this repo touches:

- live job posting URLs
- company career pages
- ATS-hosted job boards
- public job-board pages used for discovery
- ATS application pages used for guidance and liveness checks

It does not try to catalog every other external dependency in the repo.

## Why These Connections Exist

Job Hunt needs third-party recruiting pages for four core workflows:

1. A user pastes a live job URL and the system extracts the JD.
2. Portal scan reads company career pages and ATS feeds to discover roles.
3. Liveness checks confirm whether a posting is still active.
4. Apply assistance may inspect ATS application pages to guide the user, but it never submits an application on the user's behalf.

## What Counts As A Recruiting Connection

The repo treats these as in-scope third-party surfaces:

- a company careers page such as `https://company.com/careers`
- a hosted ATS board such as Greenhouse, Ashby, Lever, Workday, BambooHR, or Teamtailor
- a job detail page on a public job board or startup-job site
- a public ATS application page reached from a job detail URL

## ATS And Job-Site Families

These are the recruiting platforms and patterns explicitly handled or documented by the repo.

| Family               | Common domains / patterns                                                             | Typical use in Job Hunt                       |
| -------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Greenhouse           | `job-boards.greenhouse.io`, `job-boards.eu.greenhouse.io`, `boards-api.greenhouse.io` | direct scan, JD extraction, liveness            |
| Ashby                | `jobs.ashbyhq.com`, `api.ashbyhq.com`                                                 | direct scan, JD extraction, liveness            |
| Lever                | `jobs.lever.co`, `api.lever.co`                                                       | direct scan, JD extraction, liveness            |
| BambooHR             | `*.bamboohr.com/careers/*`                                                            | documented scan target and JD read              |
| Teamtailor           | `*.teamtailor.com/jobs`, `*.teamtailor.com/jobs.rss`                                  | documented scan target and feed-based discovery |
| Workday              | `*.myworkdayjobs.com`                                                                 | documented scan target, JD extraction, liveness |
| Custom company sites | company-owned careers domains                                                         | direct scan and single-offer evaluation         |

The example `portals.yml` also includes search-driven discovery across broader job sites, including `apply.workable.com`, `workatastartup.com`, `ycombinator.com/jobs`, `ai-jobs.net`, `remoteok.com`, `weworkremotely.com`, `workingnomads.com`, `euremotejobs.com`, `fwddeploy.com`, and `getmanfred.com`.

## How The Repo Connects To These Pages

### Single evaluation

When the input is a live URL, the system opens the posting page and extracts the real JD from the source page, not from a cached search result.

### Portal scan

Portal scan works in layers:

1. Read each tracked company's `careers_url` directly.
2. Use structured ATS APIs or feeds when available.
3. Use broader search queries to discover new roles on public job sites and ATS boards.

The first-party source of truth for these connections is `portals.yml`.

### Liveness verification

When a URL comes from broad search discovery, the repo verifies it against the live page before treating it as active. The goal is to reject stale results that still appear in search indexes after the posting is gone.

### Application guidance

If the user wants help during an application flow, the system may inspect the public ATS form or posting page to explain what to do next. It does not press submit for the user.

## What The Repo Considers "Live"

A posting is treated as active only when the live page shows real role content, not just a shell page.

Strong active signal:

- visible job content plus a visible apply control

Strong expired signals:

- HTTP `404` or `410`
- redirect patterns such as `?error=true`
- explicit closed-page text such as "job no longer available", "position has been filled", or "no longer accepting applications"
- pages that contain only light shell content with no real JD body

If content exists but no visible apply control is found, the result can remain `uncertain`.

## Practical Boundaries

- The exact third-party surface depends on the user's `portals.yml` and the URLs they paste.
- A live posting must come from the live page itself, not from generic search snippets alone.
- The repo prefers direct careers pages and ATS boards over search-engine discovery.
- This document is about recruiting surfaces only. It does not cover package registries, GitHub update paths, CI, or AI-provider connections.

## Repo Touchpoints

- `modes/scan.md`
- `scripts/scan.mjs`
- `scripts/check-liveness.mjs`
- `scripts/liveness-core.mjs`
- `templates/portals.example.yml`
- `docs/ARCHITECTURE.md`
