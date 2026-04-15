# Mode: tracker -- Application Tracker

Read and summarize `data/applications.md`.

**Tracker format:**

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report |
```

Possible statuses come from `templates/states.yml`, including:

- `Evaluated`
- `Applied`
- `Responded`
- `Interview`
- `Offer`
- `Rejected`
- `Discarded`
- `SKIP`

If the user asks to update a status, edit the existing row accordingly.

Also show:

- total applications
- breakdown by status
- average score
- percentage with PDF generated
- percentage with report generated
