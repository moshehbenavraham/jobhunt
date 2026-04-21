# Considerations

> Institutional memory for AI assistants. Updated between phases via carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 02 (2026-04-21)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt

<!-- Max 5 items -->

- [P00] **Prompt and boot contract drift**: Keep `scripts/test-app-scaffold.mjs`, `scripts/test-all.mjs`, and the API startup payload in sync when prompt or boot metadata changes.
- [P00-apps/api] **Workspace registry coupling**: Boundary, read, and write helpers all depend on the checked-in surface registry; edits should flow through the registry instead of ad hoc path checks.
- [P02-apps/api] **Tool catalog drift**: Keep default suite registration, scoped visibility, and router maps aligned as new tools and workflows are added.
- [P02-apps/api] **Durable workflow fan-out**: Preserve the single enqueue/executor contract as scan, pipeline, and batch surfaces expand.

### External Dependencies

<!-- Max 5 items -->

- [P00] **Repo-bound startup freshness**: Startup remains sensitive to missing or stale checked-in files. Keep required-file checks and onboarding messages aligned with the live contract.
- [P02-apps/api] **Allowlisted script coverage**: Workflow scripts remain the execution boundary, so new script-backed tools need explicit registration and validation.

### Performance / Security

<!-- Max 5 items -->

- [P00] **Read-first boot surface**: Startup and diagnostics must stay read-only and metadata-only. Do not reintroduce hidden writes or stdout scraping.
- [P00] **Live contract payload size**: Keep the boot response narrow so startup stays fast and the web UI does not depend on large derived payloads.
- [P02-apps/api] **Mutation guardrails**: Workspace writes and report outputs must stay repo-relative and approval-aware; do not widen the target surface.

### Architecture

<!-- Max 5 items -->

- [P00] **Canonical live surface**: `AGENTS.md`, `.codex/skills/`, `modes/`, `docs/`, and the user-layer files remain the source of truth.
- [P00] **Registry-first contracts**: Prompt routing, workspace ownership, and startup summaries should derive from checked-in registries, not duplicated path logic.
- [P02-apps/api] **Catalog-driven routing**: Specialist routing and tool visibility should stay deterministic and checked-in; avoid implicit privilege expansion.

---

## Lessons Learned

Proven patterns and anti-patterns. Reference during implementation.

### What Worked

<!-- Max 15 items -->

- [P00] **Registry-first surface mapping**: One checked-in registry made workspace and prompt behavior easy to audit.
- [P00] **Read-first startup**: Reporting missing prerequisites without mutating user files kept boot deterministic.
- [P00] **Explicit startup summaries**: Exposing workspace, prompt, and boot metadata in diagnostics gave later phases a stable inspection surface.
- [P00] **Freshness-aware caches**: Re-statting prompt sources and evicting missing files prevented stale re-entry behavior.
- [P00] **Contract reuse over parallel bootstrap logic**: Serializing boot data from existing diagnostics avoided a second source of truth.
- [P00] **Validator-first closeout**: Wiring scaffold and boot smoke checks into the repo gate caught drift immediately.
- [P02-apps/api] **Registry-backed execution**: Duplicate-safe catalogs and typed envelopes made tool expansion reviewable.
- [P02-apps/api] **Read-first inspection**: Deterministic summaries and prompt checks kept onboarding safe and testable.
- [P02-apps/api] **Reservation before write**: Reserving report artifacts before writing prevented duplicate allocation.
- [P02-apps/api] **Enqueue then run**: Durable workflow boundaries were cleaner than exposing direct long-running execution.
- [P02-apps/api] **Resume first orchestration**: Reusing live sessions preserved approvals and runtime state.
- [P02-apps/api] **Template-backed repair**: Bounded repairs from checked-in templates kept onboarding fixes predictable.

### What to Avoid

<!-- Max 10 items -->

- [P00] **Legacy path fallbacks**: Do not re-add alias paths once the registry has a canonical surface.
- [P00] **Split closeout state**: Do not update implementation code without the matching validation and tracker state.
- [P00] **Stdout scraping**: Prefer structured payloads and summary objects over log parsing.
- [P00] **Bundling prompt cleanup with runtime work**: Keep wording and metadata cleanup separate from runtime contract changes.
- [P00] **Hidden writes during diagnostics**: Boot and validation paths should not create app state or user-layer files.
- [P02-apps/api] **Silent fallthrough**: Blocked workflows should fail explicitly instead of guessing a route.
- [P02-apps/api] **Split tool registration**: Avoid a second startup tool path or parallel catalog source.

### Tool/Library Notes

<!-- Max 5 items -->

- [P00] **`scripts/test-app-scaffold.mjs`**: Use it for repo-boundary and startup-contract drift.
- [P00] **`scripts/test-app-bootstrap.mjs`**: Use it for live boot-surface checks and no-mutation validation.
- [P00] **`scripts/test-all.mjs --quick`**: The quick suite now covers scaffold, prompt, boot, and ASCII regressions.
- [P00-apps/api] **Prompt cache invalidation**: File freshness should be rechecked on every lookup; missing files should evict cached entries immediately.
- [P02-apps/api] **`scripts/test-all.mjs --quick`**: The quick suite now covers the Phase 02 tool and orchestration surface, so it remains the fastest repo-wide regression gate.
- [P02-apps/api] **Lazy service resolution**: Tool and job-executor wiring must stay acyclic when they cross-reference each other.

---

## Resolved

Recently closed items (buffer - rotates out after 2 phases).

| Phase | Item                           | Resolution                                                                                                        |
| ----- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| P00   | Scaffold boundary drift        | Workspace, app-state, and repo-gate checks now cover the new app scaffold and keep writes inside `.jobhunt-app/`. |
| P00   | Workspace contract drift       | Adapter ownership checks now reject protected targets before mutation and keep startup diagnostics read-only.     |
| P00   | Prompt routing ambiguity       | Workflow-to-mode routing and source precedence are now explicit in the prompt loader contract.                    |
| P00   | Boot-path drift                | API boot payloads now serialize from the startup contract and the web shell renders the same diagnostics surface. |
| P00   | Version ownership drift        | Root `VERSION` remains canonical and mirrored by package metadata plus validation checks.                         |
| P00   | Validator runtime footer drift | `npm run doctor` now ends with Codex-primary guidance and the repo gate asserts that output.                      |

_Auto-generated by carryforward. Manual edits allowed but may be overwritten._
