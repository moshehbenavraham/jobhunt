# Mode: cover-letter -- Evidence-Backed Cover Letter

Generate a tailored, human-reviewed cover-letter draft from the JD and the
candidate sources of truth. Markdown is the editable source. Generate a PDF
only when the user asks for one or the application form requires an upload.

## Hard gates

Do not generate a letter unless at least one trigger is true:

- the user explicitly asks for a cover letter
- the application form requires or allows cover-letter text
- the application form requires or allows a cover-letter upload
- a checked-in workflow policy requests one for a strong-fit role

For a role below `4.0/5`, recommend against spending time on a letter. Continue
only when the user explicitly overrides that recommendation. Never submit the
letter or application.

The JD must identify the company, role, and substantive responsibilities or
requirements. For a URL, verify and extract the live JD using the normal
liveness and extraction order before drafting.

## Sources of truth

Read:

- `profile/cv.md`
- `config/profile.yml`
- `modes/_profile.md`
- `profile/article-digest.md` when present
- the saved JD and evaluation report when present

Never invent experience, metrics, credentials, company facts, notice periods,
language levels, or motivations. If the draft needs a personal angle that is
not in the sources, ask the candidate for it and save the confirmed wording in
an appropriate user-layer source before building the artifact.

## Draft contract

1. Extract the exact company, role, location, JD language, and application-form
   cover-letter status.
2. Select three to five concise paragraphs:
   - specific motivation grounded in the JD or confirmed company context
   - one or two candidate proof paragraphs grounded in the profile sources
   - an approach or fit paragraph grounded in both sides
   - an optional claim-free closing paragraph
3. Mirror useful JD vocabulary naturally. Do not keyword-stuff.
4. Keep the letter to one page. Prefer direct sentences and concrete evidence.
5. Create a structured JSON input that conforms to
   `templates/cover-letter-build.schema.json`.
6. Attach evidence IDs to every non-closing paragraph. Each evidence excerpt
   must occur verbatim in `job.jdText` or the declared source file.
7. Set `review.humanReviewRequired` to `true`.

Use one of these explicit generation triggers in the JSON:

- `explicit-user-request`
- `form-required`
- `form-optional`
- `strong-fit-policy`

Use one of these observed field states:

- `required`
- `optional`
- `not-present`
- `unknown`

## Build and validation

Write the temporary structured input under `tmp/`, then run:

```bash
npm run cover-letter -- tmp/cover-letter-build.json
```

For an uploadable one-page PDF:

```bash
npm run cover-letter -- tmp/cover-letter-build.json --pdf
```

The deterministic output base includes candidate, company, role, and date to
avoid same-company collisions. The build publishes:

- `.md` -- editable source draft
- `.html` -- deterministic rendered source
- `.cover-letter.json` -- canonical evidence-linked build
- optional `.pdf` -- tagged, outlined, one-page upload artifact
- `.manifest.json` -- source/template/version/artifact hashes and validation

Do not use `--force` without first checking whether the existing markdown draft
contains human edits. Validate the finished set with:

```bash
npm run cover-letter:validate -- output/{artifact}.manifest.json
```

Treat the artifact as generated only when validation passes. A PDF is usable
only when the sibling manifest records `validation.valid: true`.

## Report integration

Append or update this block in the role report:

```markdown
## I) Cover Letter

- Cover letter allowed/requested: required | optional | not-present | unknown
- Generation trigger: explicit-user-request | form-required | form-optional | strong-fit-policy
- Draft generated: yes | no
- Editable draft: output/{artifact}.md | —
- Upload PDF: output/{artifact}.pdf | not requested
- Manifest: output/{artifact}.manifest.json | —
- Validation: valid | invalid | not generated
- Status: human review required
```

Do not embed the full draft in the report; the markdown artifact is the editable
source of truth.

## Tracker integration

Do not add a tracker column and do not add a new tracker row directly.

For a new evaluation, include one of these phrases in the pending tracker TSV
notes:

- `cover-letter: generated-valid`
- `cover-letter: manual-pending`
- `cover-letter: not-applicable`

For an existing tracker row, update its notes only through the normal tracker
maintenance flow. Never claim `generated-valid` unless the manifest validator
passes.

## Handoff

Show the editable draft path, optional PDF path, validation result, and a short
list of candidate-specific points that deserve human review. State clearly that
the draft must be edited and approved by the candidate before submission.
