# Mode: oferta -- Full Evaluation A-G

When the candidate pastes a job posting (text or URL), always deliver all 7 blocks: A-F evaluation plus G legitimacy.

## Step 0 -- Archetype detection

Classify the role into one of the 6 archetypes from `_shared.md`. If it is hybrid, name the 2 closest archetypes. This drives:

- which proof points to prioritize in Block B
- how to rewrite the summary in Block E
- which STAR stories to prepare in Block F

## Block A -- Role summary

Create a table with:

- detected archetype
- domain (platform / agentic / LLMOps / ML / enterprise)
- function (build / consult / manage / deploy)
- seniority
- remote policy (full / hybrid / onsite)
- team size, if mentioned
- one-sentence TL;DR

## Block B -- Match against CV

Read `profile/cv.md`. Build a table mapping each JD requirement to exact lines from the CV.

**Adapt by archetype:**

- FDE -> prioritize fast delivery and client-facing proof points
- Solutions Architect -> prioritize system design and integrations
- PM -> prioritize product discovery and metrics
- LLMOps -> prioritize evals, observability, and pipelines
- Agentic -> prioritize multi-agent, HITL, and orchestration
- Transformation -> prioritize change management, adoption, and scaling

Add a **gaps** section with a mitigation strategy for each gap:

1. Is it a hard blocker or a nice-to-have?
2. Can the candidate show adjacent experience?
3. Is there a portfolio project that covers the gap?
4. What is the concrete mitigation plan? (cover-letter phrasing, fast project, interview framing, etc.)

## Block C -- Level and strategy

1. The level implied by the JD vs. the candidate's natural level for that archetype
2. A "sell senior without lying" plan: specific phrasing, concrete achievements to highlight, and how to position founder experience as an advantage
3. A "if they downlevel me" plan: when to accept, how to negotiate a 6-month review, and which promotion criteria to ask for

## Block D -- Compensation and demand

Use WebSearch for:

- current salary data for the role (Glassdoor, Levels.fyi, Blind)
- the company's compensation reputation
- market demand for this role type

Present the data in a table with cited sources. If data is unavailable, say so instead of inventing it.

## Block E -- Personalization plan

| #   | Section | Current state | Proposed change | Why |
| --- | ------- | ------------- | --------------- | --- |
| 1   | Summary | ...           | ...             | ... |

List the top 5 CV changes and top 5 LinkedIn changes that would improve fit.

## Block F -- Interview plan

Build 6-10 STAR+R stories mapped to JD requirements (STAR + **Reflection**):

| #   | JD requirement | STAR+R story | S   | T   | A   | R   | Reflection |
| --- | -------------- | ------------ | --- | --- | --- | --- | ---------- |

The **Reflection** column should capture what was learned or what would be done differently. That is a seniority signal.

**Story bank:** If `interview-prep/story-bank.md` exists, reuse matching stories and append new ones when helpful. If the user has not started one, they can bootstrap from `interview-prep/story-bank.example.md`.

**Adapt the framing by archetype:**

- FDE -> emphasize delivery speed and client-facing work
- Solutions Architect -> emphasize architecture decisions
- PM -> emphasize discovery and tradeoffs
- LLMOps -> emphasize metrics, evals, and production hardening
- Agentic -> emphasize orchestration, error handling, and HITL
- Transformation -> emphasize adoption and org change

Also include:

- 1 recommended case study to present
- likely red-flag questions and how to answer them

## Block G -- Posting legitimacy

Analyze whether the posting looks like a real, active opening. Present observations, not accusations.

### Signals to analyze

**1. Posting freshness** (from the live page or snapshot)

- date posted or "X days ago"
- apply-button state (active / closed / missing / redirects)
- whether the URL redirected to a generic careers page

**2. Description quality** (from the JD text)

- specific technologies, frameworks, or tools
- team size, reporting structure, or org context
- realistic requirements
- clear 6-12 month scope
- salary/comp transparency
- ratio of role-specific text to boilerplate
- internal contradictions

**3. Company hiring signals** (2-3 WebSearch queries)

- `"{company}" layoffs {year}`
- `"{company}" hiring freeze {year}`
- whether any layoffs hit the same department

**4. Reposting detection** (from `scan-history.tsv`)

- whether the company posted the same or very similar role before
- how many times and over what period

**5. Role market context** (qualitative)

- whether this is a common role that should fill quickly
- whether the role makes sense for the company's business
- whether the seniority level naturally stays open longer

### Output format

**Assessment:** one of:

- **High Confidence**
- **Proceed with Caution**
- **Suspicious**

Also include:

- a signals table with finding + weight (Positive / Neutral / Concerning)
- context notes explaining legitimate caveats

### Edge cases

- government or academic roles: slower timelines are normal
- evergreen hiring: not a ghost job if the JD explicitly says so
- executive or highly specialized roles: longer open windows are normal
- early-stage startups: vaguer JDs can still be legitimate
- no date available: default to "Proceed with Caution" unless there is stronger evidence
- recruiter-sourced roles: active recruiter contact is itself a positive signal

## After the evaluation

Always do the following after generating Blocks A-G.

### 1. Save the report

Save the full evaluation in `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = next sequential report number, zero-padded to 3 digits
- `{company-slug}` = lowercase company name with hyphens
- `{YYYY-MM-DD}` = current date

**Report format:**

```markdown
# Evaluation: {Company} -- {Role}

**Date:** {YYYY-MM-DD}
**URL:** {posting-url}
**Archetype:** {detected}
**Score:** {X/5}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {path or pending}

---

## A) Role Summary

...

## B) Match Against CV

...

## C) Level and Strategy

...

## D) Compensation and Demand

...

## E) Personalization Plan

...

## F) Interview Plan

...

## G) Posting Legitimacy

...

## H) Draft Application Answers

...(only if score >= 4.5)

---

## Extracted Keywords

...
```

### 2. Register it in the tracker flow

For a new evaluation, write one TSV file to `batch/tracker-additions/{num}-{company-slug}.tsv`.

Required columns:

`num	date	company	role	status	score	pdf	report	notes`

For a fresh evaluation:

- status -> `Evaluated`
- pdf -> `❌` unless the PDF was generated
- report -> relative path to the saved report

If the company + role already exists, update the existing tracker row instead of creating a duplicate.
