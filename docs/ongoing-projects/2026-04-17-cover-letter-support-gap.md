# 2026-04-17 Cover Letter Support Gap

## Context

The URL auto-pipeline review on 2026-04-17 found a gap between repo policy and
actual implementation:

- the system previously claimed cover letters should always be included when
  allowed
- the URL-driven pipeline had no deterministic cover-letter generation flow
- there was no artifact path, no report field, and no tracker note convention
  for cover letters

That mismatch has now been made explicit in the mode contracts. The next step is
to implement real cover-letter support instead of leaving it as a manual
follow-up.

## Product Goal

Add deterministic cover-letter support to the jobhunt system so the pipeline can
produce a human-reviewed draft when a role and application flow justify it.

The implementation should:

- generate a tailored draft cover letter from the JD plus profile sources of
  truth
- save it to a deterministic output path such as
  `output/cover-letter-{candidate}-{company}-{date}.md`
- optionally render a PDF version when the application flow needs an uploadable
  artifact
- detect and report whether the application form allows or requests a cover
  letter
- record the artifact in the saved report and tracker notes
- keep cover letters explicitly human-reviewed, the same way form answers are
  treated

## Current Gap

Today the repo can:

- evaluate a role
- generate a tailored CV PDF
- inspect application questions
- draft application answers

But it cannot yet do the equivalent end-to-end workflow for cover letters.

Missing pieces:

- no checked-in cover-letter generator
- no deterministic artifact location
- no report section for cover-letter status and paths
- no tracker convention for generated vs manual-pending cover letters
- no PDF/export rule for upload-based application flows
- no prompt contract describing when to generate one vs when to skip

## Proposed Behavior

### 1. Generation trigger

Generate a cover-letter draft only when at least one of these is true:

- the user explicitly asks for a cover letter
- the form exposes a cover-letter textarea
- the form exposes a cover-letter upload field
- the workflow policy for a given mode says a cover letter should be produced
  for strong-fit roles

Do not silently generate one for every role regardless of relevance.

### 2. Source inputs

Use the same source-of-truth inputs already required elsewhere in the repo:

- `profile/cv.md`
- `config/profile.yml`
- `modes/_profile.md`
- `profile/article-digest.md` when present
- the extracted JD / saved report for the role

Never invent experience, metrics, or claims.

### 3. Artifact paths

Primary draft artifact:

- `output/cover-letter-{candidate}-{company}-{date}.md`

Optional rendered artifact for upload flows:

- `output/cover-letter-{candidate}-{company}-{date}.pdf`

If both are generated, the markdown file remains the editable source and the PDF
is the derived upload artifact.

### 4. Report integration

Each saved report should record:

- whether a cover letter was requested or allowed by the form
- whether a draft was generated
- the artifact path or paths
- whether the item still requires manual customization

Suggested report block:

```markdown
## I) Cover Letter

- Cover letter allowed/requested: yes | no | unknown
- Draft generated: yes | no
- Artifact: output/cover-letter-{candidate}-{company}-{date}.md
- Upload PDF: output/cover-letter-{candidate}-{company}-{date}.pdf
- Status: human review required
```

### 5. Tracker integration

Do not add a new tracker column unless there is a strong reason.

Short-term approach:

- store cover-letter status in tracker notes
- use phrases like `cover-letter: generated`, `cover-letter: manual-pending`,
  or `cover-letter: not-applicable`

This keeps the change low-risk and avoids a schema expansion until the workflow
is proven.

### 6. Human-review contract

Cover letters should follow the same ownership rule as application answers:

- the system generates a working draft
- the candidate reviews and edits it
- the candidate owns the final submitted version

The system must never imply that the generated draft should be submitted
unchanged.

## Suggested Implementation Plan

### Phase 1: deterministic markdown draft

- add a checked-in generator flow for cover-letter markdown
- define naming and storage rules in the relevant modes
- add report integration for artifact/status recording
- add tracker-note conventions

### Phase 2: form-aware generation

- detect cover-letter textarea or upload fields during `apply`
- detect the same during high-score `auto-pipeline` form inspection
- mark `unknown` when the form cannot be inspected

### Phase 3: PDF/export support

- render the markdown draft into a clean one-page PDF when upload is needed
- reuse existing visual system where sensible, without compromising ATS
  readability
- verify the output file is actually a PDF artifact

### Phase 4: regression coverage

- add tests for deterministic file naming
- add tests for report integration
- add tests for tracker note behavior
- add tests for the no-invention / human-review contract

## Open Design Questions

- Should cover-letter generation live inside `modes/auto-pipeline.md`,
  `modes/apply.md`, or a dedicated `modes/cover-letter.md` helper?
- Should PDF generation be automatic whenever an upload field is detected, or
  only when the user asks for an uploadable artifact?
- Should low-fit roles skip cover-letter generation entirely, even if the form
  allows one?
- Should the report include the full draft, or just the artifact path plus a
  short summary/status line?

## Recommendation

Implement cover-letter support as a real feature rather than restoring the old
"always include one" language.

The correct product contract is:

- cover letters are supported
- generation is deterministic
- artifacts are saved predictably
- reports and tracker notes reflect reality
- human review remains mandatory

That gives the system the capability it was missing without reintroducing a
false promise into the workflow.
