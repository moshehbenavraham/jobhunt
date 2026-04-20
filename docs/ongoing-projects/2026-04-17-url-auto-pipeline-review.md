# 2026-04-17 URL Auto-Pipeline Review

## Status Checklist

- [x] Finding 1: work-authorization preflight warning and gating contract.
      Completed on 2026-04-17. Approx implementation time: 30-45 minutes.
- [x] Session 1: repo-owned single-job ATS extraction helper. Completed on
      2026-04-17. Approx implementation time: 2-2.5 hours.
- [x] Session 2: ATS-first auto-pipeline integration and fallback regression
      coverage. Completed on 2026-04-17. Approx implementation time: 2-2.5 hours.
- [x] Finding 3: explicit auto-pipeline PDF default. Auto-pipeline now uses
      HTML/PDF by default, and Canva is opt-in only. Completed on 2026-04-17.
      Approx implementation time: 15-25 minutes.
- [x] Finding 4: cover-letter contract cleanup. The repo now flags cover
      letters as manual follow-up until a real generator and artifact path exist.
      Completed on 2026-04-17. Approx implementation time: 20-30 minutes.
- [x] Verification and safety fixes: quick-suite verification, `VERSION` sync,
      and batch `RESULT_FILE` prompt-path fix. Completed on 2026-04-17. Approx
      implementation time: 20-30 minutes.

## Remaining Work Plan

All review-scoped fixes are now complete on the manual pass branch.

- [x] Session 1 (`~2.5h`): build the repo-owned single-job ATS extraction
      helper. Completed on 2026-04-17.
      Delivered: shared ATS runtime in `scripts/ats-core.mjs`, CLI entry point in
      `scripts/extract-job.mjs`, scanner reuse of the shared parsing code, script
      docs, and regression coverage in `scripts/test-extract-job.mjs`.
- [x] Session 2 (`~2.5h`): integrate the helper into the URL auto-pipeline and
      lock it down with regression coverage. Completed on 2026-04-17.
      Delivered: ATS-first routing helper in `scripts/ats-core.mjs`, explicit
      auto-pipeline and inbox-pipeline ordering in `modes/auto-pipeline.md` and
      `modes/pipeline.md`, script-surface documentation in `docs/SCRIPTS.md`, and
      regression coverage in `scripts/test-auto-pipeline-routing.mjs`.

Follow-on feature work that is intentionally out of scope for this review is
tracked separately in `docs/ongoing-projects/2026-04-17-cover-letter-support-gap.md`.

## Scope

This review covers the end-to-end path exercised when a user pasted a single
Ashby job URL:

- startup checklist and profile load
- URL liveness check
- JD extraction
- evaluation/report generation
- PDF generation
- application-form handling
- tracker merge and pipeline verification

Test input used in the reviewed run:

- `https://jobs.ashbyhq.com/livekit/b889ef16-4d5d-4b71-b0a9-682026a0a1ee`

Artifacts produced during the run:

- `reports/001-livekit-2026-04-17.md`
- `output/cv-max-gibson-livekit-2026-04-17.pdf`
- merged tracker row in `data/applications.md`

## Findings

### 1. High: missing work-authorization data is not caught early enough for U.S.-restricted application flows

**Evidence**

- `scripts/cv-sync-check.mjs:61-81` only validates that `config/profile.yml`
  appears to contain `full_name`, `email`, and `location`.
- `config/profile.example.yml:81-85` already documents
  `location.visa_status`, so the repo clearly expects this kind of data to
  exist.
- before the profile update on 2026-04-17, the active `config/profile.yml` left
  `location.visa_status` blank.

**Observed in this run**

The system completed liveness, extraction, evaluation, report creation, and PDF
generation before discovering that the application page required precise answers
for:

- `Are you legally authorized to work in the US?`
- `Would you now or in the future require sponsorship support?`

That meant a key blocker was discovered late, during form inspection, instead of
during preflight validation.

**Impact**

The current flow can spend time tailoring materials for U.S.-only roles even
when the profile is missing the authorization data needed to decide whether the
application is viable.

**Recommended fix**

Strengthen profile validation and role gating:

- warn when `location.visa_status` is blank
- add a dedicated structured field for U.S. work authorization / sponsorship if
  needed
- surface the warning before Step 4 of `auto-pipeline`
- optionally downgrade or flag U.S.-restricted roles when this data is missing

### 2. Medium: single-job ATS URL extraction is not backed by a deterministic repo-owned helper, even though the scanner already has the core ATS parsing logic

**Evidence**

- `modes/auto-pipeline.md:11-15` says URL extraction should use
  `browser_navigate` / `browser_snapshot`, then `WebFetch`, then `WebSearch`.
- `scripts/scan.mjs:450-527` already contains ATS-specific logic for:
  - Ashby API endpoint discovery
  - Greenhouse API endpoint discovery
  - Lever API endpoint discovery
  - response parsing for all three
- there is no checked-in `scripts/extract-job.mjs` or shared helper used by the
  evaluation pipeline for a single pasted ATS URL.

**Observed in this run**

The LiveKit Ashby posting could be evaluated, but only by combining:

- liveness checking
- HTML / JSON-LD extraction
- manual probing of the Ashby posting API

That duplicated logic that the repo already has inside the scanner and made the
flow more brittle than it needs to be.

**Impact**

Single-URL evaluation is less reliable and less reproducible than batch scan,
despite using the same ATS sources. This increases prompt/runtime dependence and
makes regressions harder to test.

**Recommended fix**

Extract the ATS URL logic into a shared helper or add a dedicated script such
as:

```bash
node scripts/extract-job.mjs <url>
```

That helper should:

- detect supported ATS types from the URL
- fetch structured job JSON when available
- return normalized title, company, location, date, compensation, apply URL,
  and JD text

### 3. Medium: the Canva branch in `pdf` mode conflicts with unattended auto-pipeline execution

**Evidence**

- `modes/auto-pipeline.md:29-31` says to run the full PDF pipeline
  automatically.
- `modes/pdf.md:101-108` says that if `config/profile.yml` contains
  `canva_resume_design_id`, the user should be offered a choice between:
  - HTML/PDF
  - Canva CV

**Observed in this run**

The active profile includes `candidate.canva_resume_design_id`, which means the
PDF mode and auto-pipeline disagree about whether the flow should pause for a
user choice. In practice, the automated run used the HTML/PDF path silently.

**Impact**

This is a prompt-contract ambiguity. Different agents or future maintainers
could reasonably choose different behaviors for the same input, which is exactly
the kind of non-determinism the checked-in workflow is trying to avoid.

**Recommended fix**

Define one explicit default for auto-pipeline, for example:

- auto-pipeline defaults to HTML/PDF
- Canva is only used when the user explicitly asks for it

Alternatively, add a profile flag that tells the pipeline which branch to use by
default.

### 4. Medium: the global "always include a cover letter" rule is not implemented in the URL-driven pipeline

**Evidence**

- `modes/_shared.md:106` says: if the form allows it, always include a cover
  letter.
- `modes/auto-pipeline.md` has no cover-letter generation step.
- `modes/apply.md` has no cover-letter artifact flow.
- repo search shows no checked-in cover-letter generator or output location for
  this path.

**Observed in this run**

The evaluated role went through report generation, PDF generation, tracker
registration, and form inspection, but the system had no deterministic way to:

- detect whether a cover letter was allowed
- generate one
- store it
- reflect it in the report/tracker

**Impact**

The global rule over-promises the current automation. It also creates policy
drift: operators cannot tell whether skipping a cover letter is a workflow bug
or an intentional exception.

**Recommended fix**

Choose one of these directions:

1. implement cover-letter generation and storage in the auto-pipeline/apply
   flow, or
2. downgrade the global rule from "ALWAYS include one" to a recommendation until
   the feature exists

## Resolution Update (2026-04-17)

The first three low-risk fixes from this review have now landed on the manual
pass branch:

1. **Finding 1 resolved:** `scripts/cv-sync-check.mjs` now warns when
   `location.visa_status` is missing or blank, `config/profile.example.yml` now
   tells the user to make that field specific enough for work-authorization
   forms, and `modes/auto-pipeline.md` now requires this preflight check before
   continuing on U.S.-restricted flows.
2. **Finding 2 resolved:** the repo now has a shared single-job ATS extraction
   helper (`scripts/ats-core.mjs` + `scripts/extract-job.mjs`), an
   ATS-first routing helper for auto-pipeline URL handling, explicit mode
   instructions that route supported ATS URLs through the helper before generic
   extraction, and regression tests for both the ATS-first path and generic
   fallback behavior.
3. **Finding 3 resolved:** `modes/auto-pipeline.md` and `modes/pdf.md` now make
   the default explicit: unattended auto-pipeline runs the HTML/PDF branch, and
   Canva is opt-in only when the user explicitly asks for it.
4. **Finding 4 resolved:** `modes/_shared.md`, `modes/auto-pipeline.md`, and
   `modes/apply.md` no longer pretend cover letters are automatic in this flow.
   Cover-letter fields are now treated as manual follow-up items until the repo
   has a checked-in generator and artifact path.

Verification run after these edits:

- `npm run test:quick` -> passed (`120 passed, 0 failed`)

Additional safety fixes discovered during verification:

- synced `VERSION` to `1.5.25` so it matches `package.json` and
  `package-lock.json`
- removed markdown backticks from the `RESULT_FILE` line in
  `batch/batch-prompt.md` so batch workers receive a literal writable path

## Session 1 Update (2026-04-17)

Session 1 of Finding 2 is now complete.

What landed in this session:

- added `scripts/ats-core.mjs` as the shared ATS runtime for board detection,
  ATS API fetches, HTML/text normalization, and single-job extraction
- added `scripts/extract-job.mjs` so a pasted hosted ATS URL can be resolved by
  the repo itself with:

  ```bash
  node scripts/extract-job.mjs <url>
  ```

- supported hosted URL families:
  - Ashby: `jobs.ashbyhq.com`
  - Greenhouse: `boards.greenhouse.io`,
    `job-boards.greenhouse.io`, `job-boards.eu.greenhouse.io`
  - Lever: `jobs.lever.co`
- normalized output now includes:
  - ATS type
  - normalized job/apply URL
  - company key plus best-effort company name
  - title, location, department/team, employment type, workplace type
  - published date
  - compensation object when exposed by the ATS
  - JD HTML and plain-text content
- `scripts/scan.mjs` now reuses the shared ATS parsing helpers so the scanner
  and the single-job extractor do not drift apart
- added regression coverage in `scripts/test-extract-job.mjs` for one known
  fixture per supported ATS (Ashby, Greenhouse, Lever)
- documented the new script in `docs/SCRIPTS.md` and exposed it as
  `npm run extract-job`

Verification completed in this session:

- `node scripts/test-extract-job.mjs`
- `npm run test:quick`
- targeted live extraction checks for one public URL each from Ashby,
  Greenhouse, and Lever using `node scripts/extract-job.mjs <url>`

Remaining work for Session 2:

- route ATS URLs through `scripts/extract-job.mjs` before generic URL/JD
  extraction in the auto-pipeline
- update `modes/auto-pipeline.md` to make that ordering explicit
- add tests for the ATS-first path plus generic fallback behavior

## Session 2 Update (2026-04-17)

Session 2 of Finding 2 is now complete.

What landed in this session:

- added `extractUrlForAutoPipeline(...)` to `scripts/ats-core.mjs` so the repo
  has a checked-in ATS-first routing helper instead of relying on prose alone
- the routing helper now:
  - uses the ATS extractor first for supported Ashby, Greenhouse, and Lever
    URLs
  - returns the normalized ATS extraction on success
  - falls back to the generic extraction path when ATS extraction fails
  - routes unsupported URLs straight to the generic extraction path
- updated `modes/auto-pipeline.md` so the first extraction step is now:
  `node scripts/extract-job.mjs <url>` for supported ATS URLs before
  Playwright/WebFetch/WebSearch
- updated `modes/pipeline.md` so inbox processing uses the same ATS-first
  ordering and does not drift from `auto-pipeline`
- updated `docs/SCRIPTS.md` to document that auto-pipeline uses
  `extract-job` first for supported ATS URLs and only falls back to the generic
  chain when needed
- added regression coverage in `scripts/test-auto-pipeline-routing.mjs` for:
  - ATS-first success without invoking the generic extractor
  - ATS extraction failure falling back to the generic extractor
  - unsupported URLs going directly to the generic extractor
  - mode/docs contract markers so the prompt layer does not silently drift from
    the checked-in routing contract

Verification completed in this session:

- `node scripts/test-auto-pipeline-routing.mjs`
- `node scripts/test-extract-job.mjs`
- `npm run test:quick`
- targeted live check with `extractUrlForAutoPipeline(...)` against a public
  Ashby posting, which returned strategy `ats` with normalized `company` and
  `title`

Current state after Session 2:

- Finding 2 is fully resolved for the supported hosted ATS families already in
  scope for this repo: Ashby, Greenhouse, and Lever
- the auto-pipeline contract is now deterministic about when to use the
  repo-owned ATS helper versus the generic browser/fetch/search chain
- the remaining larger product gap around actual cover-letter generation is
  tracked separately and is no longer mixed into this review

## What worked

These parts of the flow behaved well in the reviewed run:

- startup/profile preconditions were satisfied
- `node scripts/cv-sync-check.mjs` passed
- `npm run liveness -- <url>` correctly classified the posting as active
- the report was saved successfully
- `node scripts/generate-pdf.mjs` produced a valid PDF
- tracker merge and `node scripts/verify-pipeline.mjs` both completed cleanly

## Summary

The URL-to-report/PDF/tracker path is now materially more deterministic than it
was at the start of this review:

- authorization blockers surface earlier
- supported ATS URLs now use a repo-owned extraction path before generic
  browser/fetch/search fallbacks
- the auto-pipeline PDF default is explicit
- the cover-letter contract no longer over-promises behavior that does not yet
  exist

The main follow-on item is no longer a bug in this review path; it is the
separate product feature tracked in
`docs/ongoing-projects/2026-04-17-cover-letter-support-gap.md`.
