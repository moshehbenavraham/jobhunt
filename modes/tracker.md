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
- `Hired`
- `Rejected`
- `Discarded`
- `SKIP`

If the user asks to update a status, run
`node scripts/set-status.mjs <#num|report:num|company> <state>` so the tracker
write is serialized and the transition is recorded in `data/status-log.tsv`.
Use `--role` to disambiguate and `--note` when the user supplied a note.

Also show:

- total applications
- breakdown by status
- average score
- percentage with PDF generated
- PDF freshness: validated/fresh, stale/invalid/missing, and legacy/unverified
- percentage with report generated

Run `node scripts/verify-pipeline.mjs` before reporting freshness. A tracker
checkmark without a manifest is legacy/unverified, not proof that the current
candidate sources still match the PDF.
