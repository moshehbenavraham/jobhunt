# Mode: interview-redflag — Process and Company Risk Review

Evaluate interview-stage signals without turning anecdotes into facts.

## Dimensions

- process: scheduling, cancellations, hidden rounds, pressure, or unpaid work
- culture: behavioral evidence about working norms
- management: clarity, feedback, decision rights, and manager conduct
- scope: title, reporting line, responsibilities, and resource contradictions
- compensation: range, classification, benefits, equity, and prior statements

For every dimension record:

- `clear`, `watch`, `reconsider`, or `unknown`
- `none`, `low`, `medium`, `high`, or `unknown` severity
- the exact signal
- attributed evidence with an excerpt or source URL
- candidate review: `pending`, `confirmed`, or `disputed`

Unknown means no usable evidence, not safe. A watch/reconsider signal requires
evidence. Keep source reliability explicit and distinguish direct interviewer
statements, first-party documents, reliable third parties, candidate notes, and
inference.

Store the result through the `redFlags` and `panel` fields of
`npm run interview:session`. Do not edit company blacklists or tracker status
without a separate explicit user decision.
