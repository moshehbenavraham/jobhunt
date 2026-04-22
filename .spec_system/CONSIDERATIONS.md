# Considerations

> Institutional memory for AI assistants. Updated between phases via carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 03 (2026-04-22)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt

<!-- Max 5 items -->

- [P00] **Prompt and boot contract drift**: Keep `scripts/test-app-scaffold.mjs`, `scripts/test-all.mjs`, and the API startup payload in sync when prompt or boot metadata changes.
- [P00-apps/api] **Workspace registry coupling**: Boundary, read, and write helpers all depend on the checked-in surface registry; edits should flow through the registry instead of ad hoc path checks.
- [P02-apps/api] **Tool catalog drift**: Keep default suite registration, scoped visibility, and router maps aligned as new tools and workflows are added.
- [P02-apps/api] **Durable workflow fan-out**: Preserve the single enqueue/executor contract as scan, pipeline, and batch surfaces expand.
- [P03-apps/web] **Frontend parser and fixture drift**: Strict payload parsers now gate shell, chat, onboarding, approvals, and settings; update fake API fixtures and backend summaries together.

### External Dependencies

<!-- Max 5 items -->

- [P00] **Repo-bound startup freshness**: Startup remains sensitive to missing or stale checked-in files. Keep required-file checks and onboarding messages aligned with the live contract.
- [P02-apps/api] **Allowlisted script coverage**: Workflow scripts remain the execution boundary, so new script-backed tools need explicit registration and validation.
- [P03-apps/api] **Updater JSON contract drift**: Settings relies on normalized results from `node scripts/update-system.mjs check`; keep the route helper aligned if updater output changes.

### Performance / Security

<!-- Max 5 items -->

- [P00] **Read-first boot surface**: Startup and diagnostics must stay read-only and metadata-only. Do not reintroduce hidden writes or stdout scraping.
- [P00] **Live contract payload size**: Keep the boot response narrow so startup stays fast and the web UI does not depend on large derived payloads.
- [P02-apps/api] **Mutation guardrails**: Workspace writes and report outputs must stay repo-relative and approval-aware; do not widen the target surface.
- [P03-apps/web] **Bounded polling payloads**: Shell, chat, approval, and settings surfaces now poll backend summaries; keep queue/detail splits and preview caps intact as parity surfaces expand.
- [P03-apps/web+apps/api] **Interaction race guards**: Onboarding repair and approval actions need browser-side duplicate-submit guards plus backend idempotence; do not rely on async UI state alone.

### Architecture

<!-- Max 5 items -->

- [P00] **Canonical live surface**: `AGENTS.md`, `.codex/skills/`, `modes/`, `docs/`, and the user-layer files remain the source of truth.
- [P00] **Registry-first contracts**: Prompt routing, workspace ownership, and startup summaries should derive from checked-in registries, not duplicated path logic.
- [P02-apps/api] **Catalog-driven routing**: Specialist routing and tool visibility should stay deterministic and checked-in; avoid implicit privilege expansion.
- [P03-apps/web] **Thin browser surfaces**: New UX surfaces should stay parser-driven and backend-owned; avoid recreating routing, tool logic, or filesystem rules in React state.
- [P03-apps/web+apps/api] **Single mutation paths**: Chat resume, onboarding repair, and approval decisions must reuse canonical runtime services instead of adding parallel UI-only command paths.

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
- [P02-apps/api] **Resume-first orchestration**: Reusing live sessions preserved approvals and runtime state.
- [P02-apps/api] **Template-backed repair**: Bounded repairs from checked-in templates kept onboarding fixes predictable.
- [P03-apps/web] **Bounded read models**: Queue-plus-selected-detail and summary-plus-preview contracts kept polling predictable and browser code small.
- [P03-apps/web] **Strict payload parsing**: Browser-edge parsers surfaced contract drift explicitly instead of silently rendering partial state.
- [P03-apps/web+apps/api] **Shell-wide refresh reuse**: Shared refresh callbacks let onboarding, approvals, and settings revalidate backend state without duplicating client wiring.

### What to Avoid

<!-- Max 10 items -->

- [P00] **Legacy path fallbacks**: Do not re-add alias paths once the registry has a canonical surface.
- [P00] **Split closeout state**: Do not update implementation code without the matching validation and tracker state.
- [P00] **Stdout scraping**: Prefer structured payloads and summary objects over log parsing.
- [P00] **Bundling prompt cleanup with runtime work**: Keep wording and metadata cleanup separate from runtime contract changes.
- [P00] **Hidden writes during diagnostics**: Boot and validation paths should not create app state or user-layer files.
- [P02-apps/api] **Silent fallthrough**: Blocked workflows should fail explicitly instead of guessing a route.
- [P02-apps/api] **Split tool registration**: Avoid a second startup tool path or parallel catalog source.
- [P03-apps/web] **Unbounded polling summaries**: Do not return full approval, session, or preview detail when a bounded queue plus selected item or small preview will do.
- [P03-apps/web] **UI-only mutation logic**: Do not let React surfaces invent repair, approval, or orchestration rules outside backend routes and runtime services.
- [P03-apps/web] **Async-only submit locks**: React state alone is too slow to stop rapid double submits; use synchronous interaction guards where explicit mutations can race.

### Tool/Library Notes

<!-- Max 5 items -->

- [P00] **`scripts/test-app-scaffold.mjs`**: Use it for repo-boundary and startup-contract drift.
- [P00] **`scripts/test-app-bootstrap.mjs`**: Use it for live boot-surface checks and no-mutation validation.
- [P02-apps/api] **`scripts/test-all.mjs --quick`**: It remains the fastest repo-wide regression gate and now covers shell, chat, onboarding, approvals, and settings smoke paths.
- [P02-apps/api] **Lazy service resolution**: Tool and job-executor wiring must stay acyclic when they cross-reference each other.
- [P03-apps/web] **Fake API smoke fixtures**: Keep fixture payloads aligned with strict frontend parsers or the surfaces should fail closed by design.

---

## Resolved

Recently closed items (buffer - rotates out after 2 phases).

None. Older Phase 00 resolved items rotated out after the two-phase buffer.

_Auto-generated by carryforward. Manual edits allowed but may be overwritten._
