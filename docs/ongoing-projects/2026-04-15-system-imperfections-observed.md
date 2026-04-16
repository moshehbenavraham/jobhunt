# 2026-04-15 System Imperfections Observed

## 3-Session Implementation Plan

Goal: deliver a strong v1 that fixes the main real-world pain exposed in this
session without expanding into a full new discovery backend.

Non-goal for this plan:

- do not implement a broad internet search system or activate `search_queries`
  as a full new backend yet

### Session 1. Make the scan surface honest and robust

Focus:

- align config, docs, and runtime around what the scanner actually does today
- remove or de-emphasize misleading config affordances
- make first-run scan behavior self-healing instead of brittle
- improve trust in scan summaries

Implementation targets:

- `scripts/scan.mjs`
- `modes/scan.md`
- `docs/CUSTOMIZATION.md`
- `README.md`
- `templates/portals.example.yml`
- `portals.yml` comments and structure where appropriate

Concrete changes:

- ensure `data/pipeline.md` and `data/scan-history.tsv` are created safely on
  first run
- surface which configured companies are actually scanned vs skipped, and why
- explicitly mark inactive config concepts so the YAML does not over-promise
- remove or document dead config such as `seniority_boost`
- make scan output clearly distinguish:
  - scanned companies
  - skipped companies
  - unsupported config

Acceptance bar:

- a fresh user can run `npm run scan` without hidden file-precondition failures
- the docs and config no longer imply broader behavior than the code provides
- scan summaries are trustworthy enough that a user can tell what was really
  searched

### Session 2. Add location-aware filtering and a real tuning loop

Focus:

- use actual location data during scanning
- bring candidate constraints into discovery
- make retuning iterative instead of confusing

Implementation targets:

- `scripts/scan.mjs`
- `config/profile.yml`
- `modes/scan.md`
- `docs/CUSTOMIZATION.md`
- supporting tests under `scripts/test-*.mjs`

Concrete changes:

- add location filtering based on parsed ATS location fields
- use relevant profile constraints from `config/profile.yml`
  - remote preference
  - geography
  - timezone or overlap constraints where practical
- add a clean retune workflow so config changes can be evaluated honestly
- add a scan mode that can compare against a clean baseline without being
  distorted by existing dedup history
- tighten title filtering behavior so the user can work in clearer primary lanes
  instead of one giant mixed campaign

Acceptance bar:

- the same scan config no longer floods the pipeline with obvious non-target
  geographies
- retuning can be tested without manually moving files around
- discovery reflects both `portals.yml` and the user's actual constraints

### Session 3. Turn scan results into an actionable shortlist

Focus:

- bridge the gap between scan and evaluation
- make the system usable for a beginner after discovery

Implementation targets:

- `scripts/scan.mjs` or a dedicated post-scan helper
- `modes/scan.md`
- `modes/pipeline.md`
- `README.md`
- optional helper docs under `docs/`

Concrete changes:

- add post-scan bucketing such as:
  - strongest fit
  - possible fit
  - adjacent or noisy
- generate a top-10 shortlist after scan
- make the next step explicit in the output:
  - review shortlist
  - evaluate top roles
  - defer adjacent roles
- improve campaign guidance so the system steers the user toward one strong lane
  at a time

Acceptance bar:

- after running `npm run scan`, a beginner can immediately see what to do next
- the pipeline is no longer just a large raw dump of matches
- the repo has a coherent flow from setup -> scan -> shortlist -> evaluation

### Definition Of Done For The 3-Session Plan

This v1 should be considered complete when:

- the scan surface is honest
- first-run scan is robust
- location and profile constraints shape discovery
- retuning does not require manual artifact shuffling
- scan output produces a usable shortlist instead of only a raw pipeline
- the beginner next-step story is materially clearer than it is today

## qimpl Session Update - 2026-04-15

Session objective:

- implement Session 1 from the plan above: make the scan surface honest and
  robust

Completed this session:

- `scripts/scan.mjs` now creates missing `data/pipeline.md` and
  `data/scan-history.tsv` automatically on live runs
- scan output now distinguishes scanned companies, skipped companies with
  reasons, and ignored config that the current scanner does not use
- `modes/scan.md`, `docs/CUSTOMIZATION.md`, `README.md`, and
  `templates/portals.example.yml` now describe the current zero-token scanner
  honestly instead of implying broader discovery
- the active user `portals.yml` no longer carries the dead
  `title_filter.seniority_boost` block
- `scripts/test-scan.mjs` now covers skipped-company reporting, ignored-config
  reporting, and fresh-run artifact creation

Current state:

- Session 1 is implemented and validated with `node scripts/test-scan.mjs`
- the scanner is still intentionally API-first and title-filter-only
- `search_queries`, `scan_method`, and `scan_query` remain inactive by design
  and are now surfaced as ignored config instead of silent affordances

Remaining work:

- Session 2 is still open: location-aware filtering, profile-aware discovery
  constraints, and a cleaner retune loop
- Session 3 is still open: post-scan bucketing, shortlist generation, and a
  clearer beginner handoff after scan

Notes for the next session:

- parser output already includes normalized `location` fields for Greenhouse,
  Ashby, and Lever jobs, so Session 2 can build on the current scan payload
- the new skipped-company and unsupported-config summary should be reused to
  validate any future location or profile filtering behavior
- the template and docs now define `tracked_companies` plus `title_filter` as
  the honest current discovery contract, so future broader discovery should be
  added explicitly rather than implied through dormant config

## qimpl Session Update - 2026-04-16

Session objective:

- implement Session 2 from the plan above: location-aware filtering,
  profile-aware discovery constraints, and a cleaner retune loop

Completed this session:

- `scripts/scan.mjs` now reads `config/profile.yml` and applies optional
  `discovery` constraints during scan-time filtering
- the scanner now supports coarse discovery policies:
  - `unrestricted`
  - `remote_only`
  - `remote_or_allowed_locations`
  - `allowed_locations_only`
- the scanner now classifies ATS location strings into coarse regions such as
  `US`, `EMEA`, `LATAM`, `APAC`, `CANADA`, `ISRAEL`, and `REMOTE`
- scan summaries now show:
  - jobs filtered by location
  - profile discovery constraints in effect
  - grouped location rejection reasons and sample geographies
- `scripts/scan.mjs` now supports `--compare-clean`, which ignores prior dedup
  state from `scan-history.tsv`, `pipeline.md`, and the tracker so retuning can
  be previewed honestly without moving files around
- `scripts/test-scan.mjs` now covers:
  - location classification and filtering
  - blocked-region rejection
  - compare-clean behavior
  - compare-clean staying preview-only
- `config/profile.example.yml` now documents the new `discovery` block
- the active user `config/profile.yml` now includes explicit discovery
  constraints for this search
- `modes/scan.md`, `docs/CUSTOMIZATION.md`, `docs/SCRIPTS.md`, `README.md`, and
  `templates/portals.example.yml` now document the profile-driven location
  filter and compare-clean retune workflow

Current state:

- Session 2 is implemented and validated with `node scripts/test-scan.mjs`
- the live repo scan now removes obvious geo-mismatch noise before roles reach
  the pipeline
- on the current real config, `npm run scan -- --compare-clean` now shows:
  - `Filtered by location: 34 removed`
  - `New offers added: 12`
  - remaining roles concentrated in `United States`, `Remote - US`, and other
    remote-compatible locations instead of the earlier London / Berlin / Dubai
    style spillover
- on the same config, regular `npm run scan -- --dry-run` now shows `0` new
  roles because the clean-baseline matches are already in dedup history, which
  is the expected contrast that `--compare-clean` was meant to surface

Remaining work:

- Session 3 is still open: post-scan bucketing, shortlist generation, and a
  clearer beginner handoff after scan

Notes for the next session:

- the new compare-clean mode provides the right baseline for shortlist logic,
  because it shows what the current config would surface before history-based
  suppression
- Session 3 should operate on the already location-filtered result set rather
  than trying to solve geographic noise again
- the next meaningful UX gain is to rank or bucket the surviving roles so a
  beginner sees a top 10 instead of only a cleaned raw list

## qimpl Session Update - 2026-04-16 (Session 3)

Session objective:

- implement Session 3 from the plan above: turn scan results into an
  actionable shortlist with a clearer beginner handoff

Completed this session:

- `scripts/scan.mjs` now builds a heuristic shortlist after every scan
- the scanner now:
  - buckets pending roles into `Strongest fit`, `Possible fit`, and
    `Adjacent or noisy`
  - ranks a top 10 to evaluate first
  - generates campaign guidance based on the strongest surviving lane cluster
  - prints explicit next-step instructions instead of only pointing at the raw
    pipeline
- `data/pipeline.md` now supports a generated `## Shortlist` section above the
  raw `## Pending` queue
- the scanner now refreshes that `## Shortlist` section on live runs without
  changing the underlying pending/processed workflow
- `scripts/test-scan.mjs` now covers:
  - pending-offer parsing
  - shortlist generation
  - shortlist section rendering
  - shortlist output in dry-run, compare-clean, and fresh-run flows
- `modes/scan.md`, `modes/pipeline.md`, `README.md`, and `docs/SCRIPTS.md`
  now describe the repo as `scan -> shortlist -> evaluate top roles` rather
  than `scan -> raw dump`

Current state:

- the full 3-session strong-v1 plan is now implemented and validated
- verification completed with:
  - `node scripts/test-scan.mjs`
  - `npm run scan -- --compare-clean`
  - `npm run scan -- --dry-run`
  - `git diff --check`
- on the current real config:
  - `npm run scan -- --compare-clean` now surfaces `12` clean-baseline roles
    with shortlist buckets of `3` strongest-fit and `9` possible-fit roles
  - regular `npm run scan -- --dry-run` now turns the existing pending queue
    into a usable live shortlist with buckets of `2` strongest-fit,
    `25` possible-fit, and `8` adjacent/noisy roles
  - the scanner now points the user to start with the top 3 roles instead of
    leaving them with only a large pending list

Remaining work:

- the 3-session strong-v1 plan is complete
- broader internet-wide discovery, `search_queries` as a real backend, and
  richer post-scan automation remain future work beyond this v1

Notes for the next session:

- if follow-on work is needed, the next meaningful product jump is broader
  discovery beyond ATS APIs rather than more iteration on the current shortlist
- if shortlist quality needs more nuance later, improve the heuristic scoring
  only after observing real evaluation outcomes from the new top-10 flow

## Status

Open note created on 2026-04-15.

This file captures the concrete product and implementation imperfections that
showed up during real use of the repo today. The 3-session strong-v1 plan at
the top of this file is now complete; remaining open items below should be
treated as future candidate work rather than blockers for this v1.

## Scope

Observed while using the repo as a first-time end user trying to:

1. understand the next step after setup
2. run portal discovery
3. tune noisy scan results
4. keep the workflow English-only

## Open Imperfections

### 1. The discovery story is narrower than the configuration implies

The practical expectation created by `portals.yml` is broader than what the
scanner actually does.

- The active zero-token scanner reads `tracked_companies`, not `search_queries`,
  per [modes/scan.md](../scan.md) and [scripts/scan.mjs](../../scripts/scan.mjs:300).
- `search_queries` exist in the config surface but are not used in the current
  scan path, per [modes/scan.md](../scan.md:24).
- Several company entries look enabled for discovery but are effectively inert
  unless their `careers_url` can be converted to Ashby, Lever, or Greenhouse.

User impact:

- A beginner can reasonably think the system is a broader job finder than it
  currently is.
- `portals.yml` looks richer than the implementation behind it.

### 2. `scan_method` / `scan_query` create misleading configuration affordances

`portals.yml` contains entries with `scan_method: websearch` and `scan_query`,
but the current scanner only detects direct APIs in `detectApi()`, per
[scripts/scan.mjs](../../scripts/scan.mjs:43).

User impact:

- A company can appear configured and enabled while still being skipped.
- The user cannot trust the YAML surface alone to know what will actually scan.

### 3. `seniority_boost` is dead configuration today

`seniority_boost` still exists in `portals.yml`, but it is not referenced in the
current scanner implementation or scan mode docs.

User impact:

- The user may think the scanner ranks or prioritizes senior roles.
- In reality, seniority is not changing scan output at all.

### 4. The title filter is too primitive for the breadth of roles being scanned

The current filter is a plain substring matcher over the job title:

- positive match if any token appears
- negative match if any blocked token appears

See [scripts/scan.mjs](../../scripts/scan.mjs:143).

User impact:

- Broad tokens such as `Deployment`, `Voice`, `Automation`, `Agents`, or
  `Product Engineer` admit many adjacent roles.
- Narrowing requires manual trial-and-error YAML surgery.
- The system has no concept of lane priority such as "primary", "secondary",
  or "adjacent" during scanning.

### 5. The scanner collects location but does not filter on location

Each ATS parser extracts `location`, per
[scripts/scan.mjs](../../scripts/scan.mjs:97), [scripts/scan.mjs](../../scripts/scan.mjs:107),
and [scripts/scan.mjs](../../scripts/scan.mjs:117), but filtering still happens
only on the title.

User impact:

- Scan results include many geo-cloned roles and non-target regions.
- The system does not use the candidate's location policy from
  `config/profile.yml` when scanning.
- Remote preference, country preference, and timezone constraints do not shape
  discovery.

### 6. The scanner does not use candidate constraints from `config/profile.yml`

The scan flow reads `portals.yml`, not the user profile, per
[scripts/scan.mjs](../../scripts/scan.mjs:300).

User impact:

- Search targeting lives in two mental models:
  - narrative and constraints in `config/profile.yml`
  - actual scan behavior in `portals.yml`
- A user can carefully set profile constraints and still see discovery results
  that ignore them.

### 7. Tuning is awkward because history-based dedup hides configuration changes

The scanner deduplicates against both `data/pipeline.md` and
`data/scan-history.tsv`, per [scripts/scan.mjs](../../scripts/scan.mjs:158).

User impact:

- A retune can appear better or worse than it really is because previous scan
  results have already been marked as seen.
- Honest tuning often requires backing up or resetting scan artifacts first.
- There is no built-in "compare this config against a clean baseline" mode.

### 8. First-run scan behavior was brittle because `data/pipeline.md` had to exist

The scan flow writes by first reading the pipeline file in `appendToPipeline()`,
per [scripts/scan.mjs](../../scripts/scan.mjs:213). During use today, a scan
failed until a scaffold pipeline file was created.

User impact:

- A fresh user can hit an avoidable first-run failure.
- The system relies on a hidden prerequisite instead of self-healing it.

### 9. Scan output is not ranked tightly enough for a beginner workflow

The first broad scan produced far too many roles to act on comfortably.

Observed impact in this session:

- the initial broad configuration produced 252 pending roles
- the user had no built-in prioritization help at the scan stage
- meaningful use required manual retuning before the results became manageable

The current scan flow adds matching jobs to the pipeline but does not score,
bucket, or summarize them into an immediately actionable shortlist.

### 10. The system lacks a first-class portal tuning workflow

There is no dedicated guided command that says:

1. define your primary lane
2. suggest company set
3. suggest positive tokens
4. suggest negative tokens
5. run a clean comparison scan

Current tuning is mostly:

- hand-edit `portals.yml`
- run `npm run scan -- --dry-run`
- inspect results manually

User impact:

- This is workable for technical users, but weak for a beginner job seeker.

### 11. The scan campaign can silently mix primary and adjacent lanes

The candidate profile clearly distinguishes primary and adjacent role families,
but the scan config can easily flatten them into one broad search surface.

User impact:

- The system can drift from "find my strongest roles" into "find every role
  that vaguely mentions AI, deployment, voice, or solutions."
- The user ends up curating a giant mixed-intent pipeline by hand.

### 12. Skipped-company visibility is still too weak for user trust

The summary shows skipped counts, but the system still makes it too easy to
believe enabled companies are being searched when they are not.

User impact:

- A user may assume `OpenAI`, `Retool`, `Twilio`, `Talkdesk`, `Genesys`, and
  similar entries are part of the live scan when they are not on the current
  API-only path.
- The difference between "configured" and "actually scanned" is not surfaced
  clearly enough in the main UX.

## Issues Encountered And Fixed In This Session

### 13. English-default behavior was inconsistent with the checked-in prompts

The skill contract says the system should default to English, per
[.codex/skills/career-ops/SKILL.md](../../.codex/skills/career-ops/SKILL.md:96),
but several live mode files and the batch prompt were still in Spanish when we
started using the repo.

Impact observed:

- visible Spanish surfaced in the active workflow
- this undermined confidence in the repo state
- it created avoidable confusion in a first-time setup

Local fix completed in this session:

- active mode files were translated to English
- `batch/batch-prompt.md` was translated to English
- pipeline headings were standardized to English

### 14. Pipeline heading expectations were fragile during the English cleanup

The scan flow depends on exact section markers such as `## Pending` and
`## Processed`, per [scripts/scan.mjs](../../scripts/scan.mjs:215). This made
the pipeline format sensitive to language migration and inconsistent historical
files.

Impact observed:

- language cleanup required prompt and code alignment together
- a mismatch between prompt language and parser assumptions could have broken
  appends or made the file harder to manage

Local fix completed in this session:

- the live scanner and tests were aligned to English headings

## Product-Level UX Gaps Exposed By This Session

### 15. The beginner next-step story is under-guided

A new user can finish setup and still be uncertain about:

- whether to generate a resume first
- whether the system discovers jobs or expects pasted URLs
- how to tune discovery when the first scan is too broad

This is not just user hesitation; it reflects a real gap in guided onboarding
after the core profile files are filled out.

### 16. Scan-to-shortlist is missing an opinionated middle step

The current system supports:

- setup
- scan
- pipeline processing

What is missing is a strong intermediate step:

- "shortlist the best 10 from the current scan"

Without that, the repo can feel powerful but high-friction.

## Candidate Spec Directions

### Spec A: Honest Discovery Surface

- remove or de-emphasize config fields that are not active
- explicitly separate:
  - API-backed scanning
  - manual search query suggestions
  - future search backends

### Spec B: Location-Aware Scanner

- use parsed `location`
- use user constraints from `config/profile.yml`
- allow country / remote / timezone / travel filters

### Spec C: Clean Retuning Workflow

- add a comparison mode that ignores existing scan history
- show diffs between old and new config runs
- make tuning iterative instead of destructive or manual

### Spec D: Guided Portal Tuner

- ask for the primary lane
- generate a starter company set
- generate positive and negative title tokens
- explain what each token is doing

### Spec E: Scan Shortlisting

- automatically bucket results into:
  - strong fit
  - possible fit
  - noisy / adjacent
- produce a top-10 recommendation immediately after scan

## Bottom Line

The repo is already useful, but the current discovery system is closer to a
technical scanner plus manual curation than a polished guided job-search
surface. The biggest open gap is not raw scanning capability; it is the lack of
honest, location-aware, beginner-friendly narrowing between "configured" and
"actionable shortlist."
