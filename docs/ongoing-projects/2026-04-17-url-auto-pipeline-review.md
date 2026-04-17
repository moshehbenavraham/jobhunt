# 2026-04-17 URL Auto-Pipeline Review

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

## What worked

These parts of the flow behaved well in the reviewed run:

- startup/profile preconditions were satisfied
- `node scripts/cv-sync-check.mjs` passed
- `npm run liveness -- <url>` correctly classified the posting as active
- the report was saved successfully
- `node scripts/generate-pdf.mjs` produced a valid PDF
- tracker merge and `node scripts/verify-pipeline.mjs` both completed cleanly

## Summary

The URL-to-report/PDF/tracker path is usable today, but the main imperfections
are at the boundaries:

- late discovery of authorization blockers
- lack of a shared single-job ATS extraction path
- ambiguity in the Canva decision branch
- a global cover-letter rule with no real implementation behind it

The highest-priority fix is Finding 1, because it affects role viability and
preflight correctness. The remaining findings are workflow determinism and
policy-implementation gaps.
