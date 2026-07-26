# Mode: apply -- Live Application Assistant

Interactive mode for when the candidate is filling out an application form in Chrome. Read what is on screen, load prior context for the role, and generate tailored answers for each visible question.

## Requirements

- **Best with visible Playwright:** the user sees the browser and the agent can interact with the page.
- **Without Playwright:** the user shares screenshots or pastes the questions manually.

## Workflow

```text
1. DETECT     -> Read the active Chrome tab (screenshot / URL / title)
2. IDENTIFY   -> Extract company + role from the page
3. SEARCH     -> Match against existing reports in reports/
4. LOAD       -> Read the full report + Section G if it exists
5. COMPARE    -> Check whether the on-screen role matches the evaluated role
6. ANALYZE    -> Identify all visible application questions
7. GENERATE   -> Draft tailored answers for each question
8. PRESENT    -> Show clean copy-paste-ready answers
```

Before drafting, capture the visible form as a versioned JSON snapshot and run:

```bash
node scripts/application-preflight.mjs \
  --snapshot=/tmp/application-form.json \
  --expected-company="{company}" \
  --expected-role="{role}" \
  --pdf=output/{validated-cv}.pdf
```

The typed preflight normalizes Greenhouse, Ashby, Lever, Workday, and generic
forms; classifies fields; blocks unanswered knockout questions; detects
company/role drift and repeat-company history; validates selected PDFs; and
hard-codes no-submit/no-terms guards. Knockout and consent values require
explicit human input.

## Step 1 -- Detect the role

**With Playwright:** snapshot the active page and read the visible title, URL, and content.

**Without Playwright:** ask the candidate to:

- share a screenshot of the form
- paste the visible questions
- or provide the company + role so the relevant report can be found

## Step 2 -- Find prior context

1. Extract company name and role title from the page.
2. Search `reports/` for the company name.
3. If there is a match, load the full report.
4. If Section G or prior draft answers exist, use them as a starting point.
5. If there is no match, tell the user and offer a quick evaluation first.

## Step 3 -- Detect role drift

If the role on screen differs from the evaluated role:

- tell the user the role changed
- offer to either adapt the answers or re-evaluate
- if re-evaluated, refresh the report and any draft answers
- update the existing tracker row if the role title truly changed

## Step 4 -- Analyze the form

Identify all visible questions:

- free-text fields
- dropdowns
- yes/no questions
- salary fields
- upload fields
- cover-letter textareas or cover-letter upload slots

Classify each one:

- already covered by existing draft answers
- new question that must be answered from the report + `profile/cv.md`

## Step 5 -- Generate answers

For each question:

1. use proof points from Block B and STAR stories from Block F
2. refine any prior draft answers instead of starting from scratch
3. keep the "I'm choosing you" tone from auto-pipeline
4. reference something concrete from the visible JD or application context
5. include a jobhunt proof point when there is a strong fit and the question allows it

If the visible form includes a cover-letter field or upload:

1. classify it as `required` or `optional`
2. run `modes/cover-letter.md` with the matching `form-required` or
   `form-optional` trigger
3. request the PDF branch only for an upload field
4. record the validated artifact paths in the report and final notes

If generation cannot be completed or validated, record
`cover-letter: manual-pending`. Never present an unvalidated artifact as ready.

These are first drafts for the candidate to review and personalize before submission. The system assumes human review of every final answer, even when the application page contains anti-AI language.

After the user reviews the fields, store their exact values, selected files,
provenance, and review states with `scripts/application-answers.mjs`. The
versioned JSON sidecar and idempotent report section must always declare
`submissionPerformedByTool: false`. Only record `submitted_by_user` after the
user explicitly confirms submission.

**Output format:**

```markdown
## Answers for [Company] -- [Role]

Based on: Report #NNN | Score: X.X/5 | Archetype: [type]

---

### 1. [Exact form question]

> [Copy-paste-ready answer]

### 2. [Next question]

> [Answer]

---

Notes:

- [Role-change or context note]
- [Cover-letter artifact and validation note, if applicable]
- [Any final customization suggestion]
```

## Step 6 -- Post-apply (optional)

If the candidate confirms they submitted the application:

1. update the existing row in `data/applications.md` from `Evaluated` to `Applied`
2. update the saved report with the final submitted answers when useful
3. suggest the next step: LinkedIn outreach via `modes/contacto.md`
4. `scripts/set-status.mjs` automatically seeds the first append-only follow-up
   pin; use `--applied-date=YYYY-MM-DD` when the submission date is known

## Scroll handling

If the form extends beyond the visible area:

- ask the user to scroll and share another screenshot
- or paste the remaining questions
- continue in passes until the form is fully covered
