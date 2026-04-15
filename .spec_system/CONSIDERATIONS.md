# Considerations

> Institutional memory for AI assistants. Updated between phases via carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 02 (2026-04-15)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt <!-- Max 5 items -->

- [P02] **Prompt and metadata cleanup**: Phase 02 aligned the live batch runtime and docs, but broader prompt wording and metadata cleanup still needs a dedicated follow-up phase. Keep it isolated from contract work.
- [P02] **Structured worker contract coupling**: `batch/batch-runner.sh`, `batch/worker-result.schema.json`, `batch/batch-prompt.md`, and dashboard fallback logic move together now. Any state or retry change needs matching schema and harness updates.

### External Dependencies <!-- Max 5 items -->

_None yet - no external API or service risk surfaced in Phases 00-02._

### Performance / Security <!-- Max 5 items -->

- [P02] **Trust boundary is file-based**: Preserve the move away from stdout scraping and keep synthetic fixtures free of real user data or secrets.

### Architecture <!-- Max 5 items -->

- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and `docs/` as the live instruction and metadata sources. Avoid reintroducing `.claude` or root-doc aliases.
- [P01] **Docs-local links matter**: Keep links and routing relative to the file's own directory, especially inside `docs/`. Root-level assumptions caused avoidable churn in Phase 01.
- [P02] **Live contract first**: Keep docs and operator guidance anchored to the checked-in runner and schema rather than narrative summaries.

---

## Lessons Learned

Proven patterns and anti-patterns. Reference during implementation.

### What Worked <!-- Max 15 items -->

- [P00] **Validator-first closeout**: Updating the runtime contract and the repo gate in the same phase prevented silent drift.
- [P00] **Explicit deferral ledger**: Keeping residual Phase 01 and Phase 02 references visible let Phase 00 stay narrow without losing future work.
- [P00] **Canonical version anchoring**: Using root `VERSION` as the source of truth and mirroring it in validation checks made version drift easy to catch.
- [P01] **Docs-first routing**: Keeping root entrypoints concise and pushing detail into `docs/` kept onboarding and contributor guidance manageable.
- [P01] **Live-contract alignment**: Anchoring setup and support docs to the validator and `docs/DATA_CONTRACT.md` kept the public surface consistent.
- [P01] **Phase-closeout bookkeeping**: Once validation evidence was in place, closeout was mostly tracker and PRD synchronization.
- [P02] **Contract-first worker output**: Using checked-in schema and result files is easier to validate than parsing stdout logs.
- [P02] **Structured result authority**: Let the JSON result drive batch state and retry semantics instead of collapsing zero-exit runs.
- [P02] **Report-bearing partials**: Preserve partial rows with report links so downstream consumers do not lose the primary evaluation link.
- [P02] **Deterministic closeout harnesses**: Temp-sandbox coverage is the safest way to validate dry-run, retry gating, merge, and verify behavior.
- [P02] **Docs/runtime alignment**: Keep operator docs and architecture notes pointed at the same live artifacts.
- [P02] **Validator-first closeout**: Merge and verify together before marking a phase complete.

### What to Avoid <!-- Max 10 items -->

- [P00] **Legacy path fallbacks**: Do not re-add `.claude` or `docs/VERSION` fallback logic once the live surface is known.
- [P00] **Split closeout state**: Do not update implementation changes without the matching validation artifact and tracker/state update.
- [P00] **Unscoped metadata churn**: Keep docs and labeler edits targeted to the live path that actually matters.
- [P01] **Root-relative docs assumptions**: Do not assume links from the repo root will resolve correctly inside nested docs.
- [P01] **Mixed-scope docs edits**: Avoid bundling runtime cleanup, policy wording, and onboarding routing into one docs pass.
- [P02] **Stdout scraping**: Do not infer worker success from logs when a structured result file exists.
- [P02] **Bundling prompt cleanup with runtime work**: Keep wording and contract changes in separate phases.

### Tool/Library Notes <!-- Max 5 items -->

- [P00] **`scripts/test-all.mjs`**: Now covers validator runtime output, version drift, and metadata path assertions. Use it for contract-surface changes.
- [P00] **`scripts/update-system.mjs`**: Reads root `VERSION` directly. Treat that file as canonical during release or version work.
- [P00] **`scripts/doctor.mjs`**: The success footer is part of the runtime contract, so check its output in tests, not just its exit code.
- [P02] **`scripts/test-batch-runner-contract.mjs`**: Covers CLI args, schema wiring, and result-file behavior.
- [P02] **`scripts/test-batch-runner-state-semantics.mjs`**: Covers rerun gating and summary semantics.
- [P02] **`scripts/test-batch-runner-closeout.mjs`**: Covers dry-run closeout and merge/verify sequencing.

---

## Resolved

Recently closed items (buffer - rotates out after 2 phases).

| Phase | Item                           | Resolution                                                                                             |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| P01   | Deferred runtime-reference cleanup | Batch runtime docs were aligned to the live `codex exec` contract in Phase 02; only narrower prompt and metadata cleanup remains. |
| P00   | Residual legacy references     | The batch runtime doc path was realigned in Phase 02, removing the old `claude -p` surface from the live docs. |
| P00   | Validator surface drift        | `scripts/test-all.mjs` now covers the batch runner contract, state semantics, and closeout harnesses.   |
| P00   | Version ownership drift        | Root `VERSION` was made canonical and mirrored by package metadata plus validation checks.             |
| P00   | Codex metadata path drift      | Updater, data contract, and GitHub metadata were realigned to `.codex/skills/` and live `docs/` paths. |
| P00   | Validator runtime footer drift | `npm run doctor` now ends with Codex-primary guidance and the repo gate asserts that output.           |

_Auto-generated by carryforward. Manual edits allowed but may be overwritten._
