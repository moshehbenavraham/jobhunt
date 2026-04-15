# Mode: deep -- Deep Research Prompt

Generate a structured research prompt for Perplexity, Claude, or ChatGPT with these 6 axes:

```markdown
## Deep Research: [Company] -- [Role]

Context: I am evaluating an application for [role] at [company]. I need interview-useful, actionable information.

### 1. AI strategy
- What AI/ML products or features do they have?
- What does their AI stack appear to be?
- Do they publish engineering writing? What topics recur?
- Have they given talks or published work related to AI?

### 2. Recent moves (last 6 months)
- important hires in AI, ML, product, or leadership
- acquisitions or partnerships
- launches, pivots, or platform changes
- funding rounds or leadership changes

### 3. Engineering culture
- shipping cadence
- CI/CD maturity
- monorepo vs multirepo signals
- languages and frameworks in use
- remote-first or office-first posture
- Glassdoor or Blind signals about engineering culture

### 4. Likely challenges
- scaling issues
- reliability, cost, or latency constraints
- migrations in flight
- recurring pain points in public reviews or posts

### 5. Competitors and differentiation
- main competitors
- moat or differentiation
- how the company positions itself relative to peers

### 6. Candidate angle
Given my profile (read from profile/cv.md and config/profile.yml):
- what unique value do I bring to this team?
- which of my projects are most relevant?
- what story should I tell in the interview?
```

Tailor each section to the specific job that is being evaluated.
