# Mode: agent-inbox — Durable inbound review queue

Use `scripts/agent-inbox.mjs` to queue pasted replies, invites, job URLs, notes,
or integration references. The append-only user-owned event log supports:

1. enqueue
2. lease-based claim
3. explicit approve/reject/needs-context review
4. completed/failed/deferred outcome with artifact paths

An approved review is required before an outcome. Queue operations never send
messages or submit applications, and every outcome records those invariants.
Use `scripts/inbound-match.mjs` for reply/invite classification and save its
reviewed result as an outcome artifact.
