# Mode: auto-pipeline -- Full Automatic Pipeline

When the user pastes a JD (text or URL) without an explicit sub-command, run the full pipeline in sequence.

## Step 0 -- Extract the JD

If the input is a **URL** (not pasted JD text), extract the content in this order:

**Priority order:**

1. **Playwright (preferred):** Most job portals (Lever, Ashby, Greenhouse, Workday) are SPAs. Use `browser_navigate` + `browser_snapshot` to render and read the JD.
2. **WebFetch (fallback):** For static pages such as ZipRecruiter, WeLoveProduct, or simple company careers pages.
3. **WebSearch (last resort):** Search for role title + company on secondary sites that index the JD in static HTML.

If none of these work, ask the candidate to paste the JD manually or share a screenshot.

If the input is already pasted JD text, use it directly.

## Step 1 -- Evaluation A-G

Run the same evaluation as `modes/oferta.md`, including Blocks A-F and Block G posting legitimacy.

## Step 2 -- Save the report

Save the full evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md` using the report format from `modes/oferta.md`.

Always include Block G in the saved report and add `**Legitimacy:** {tier}` in the header.

## Step 3 -- Generate the PDF

Run the full `pdf` pipeline from `modes/pdf.md`.

## Step 4 -- Draft application answers (only if score >= 4.5)

If the final score is `>= 4.5`, generate draft answers for the application form:

1. Extract the form questions with Playwright if possible. If that fails, fall back to the generic questions below.
2. Generate answers using the tone rules below.
3. Treat them as working drafts for human review and editing, not final copy to submit unchanged.
4. Save them in the report under `## H) Draft Application Answers`.

Application-form anti-AI language is not a reason to skip this step. The workflow assumes the candidate will review, personalize, and own the final submission before sending it.

### Generic fallback questions

- Why are you interested in this role?
- Why do you want to work at [Company]?
- Tell us about a relevant project or achievement
- What makes you a good fit for this position?
- How did you hear about this role?

### Form-answer tone

**Positioning: "I'm choosing you."** The candidate has options and is choosing this company for specific reasons.

**Tone rules:**

- **Confident without arrogance:** "I've spent the past year building production AI agent systems -- your role is where I want to apply that experience next."
- **Selective without ego:** "I've been intentional about finding a team where I can contribute meaningfully from day one."
- **Specific and concrete:** Always reference something real from the JD or company and something real from the candidate's experience.
- **Direct, no fluff:** 2-4 sentences per answer. Avoid "I'm passionate about..." and "I would love the opportunity to..."
- **Lead with proof, not claims:** Instead of "I'm great at X," say "I built X that did Y."

**Answer framework by question:**

- **Why this role?** -> "Your [specific thing] maps directly to [specific thing I built]."
- **Why this company?** -> Mention something concrete about the company. "I've been using [product] for [time/purpose]."
- **Relevant experience?** -> Use a quantified proof point. "Built [X] that [metric]."
- **Good fit?** -> "I sit at the intersection of [A] and [B], which is exactly where this role lives."
- **How did you hear?** -> Be honest. "Found through [portal/scan], evaluated against my criteria, and it scored highest."

Always generate answers in the language of the JD (English by default).

## Step 5 -- Update the tracker

Record the evaluation using the repo's tracker-addition flow. Do not add new rows directly to `data/applications.md`.

If any step fails, continue with later steps when possible and mark the failed step as pending in the tracker notes.
