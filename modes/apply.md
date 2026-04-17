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

These are first drafts for the candidate to review and personalize before submission. The system assumes human review of every final answer, even when the application page contains anti-AI language.

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
- [Any final customization suggestion]
```

## Step 6 -- Post-apply (optional)

If the candidate confirms they submitted the application:

1. update the existing row in `data/applications.md` from `Evaluated` to `Applied`
2. update the saved report with the final submitted answers when useful
3. suggest the next step: LinkedIn outreach via `modes/contacto.md`

## Scroll handling

If the form extends beyond the visible area:

- ask the user to scroll and share another screenshot
- or paste the remaining questions
- continue in passes until the form is fully covered
