# PRD Phase 02: Batch Runtime Conversion

**Status**: Complete
**Sessions**: 4
**Estimated Duration**: 4-6 days

**Progress**: 4/4 sessions (100%)

---

## Overview

Phase 02 converted the repository's batch execution path from `claude -p`
workers to a Codex-native `codex exec` runtime with a structured JSON result
contract. The goal is operational alignment, not a rewrite of the batch input,
report generation, or tracker merge business logic.

This phase stays tightly focused on batch execution. It covers the runner
invocation path, worker result handling, and batch-owned documentation needed
to operate and validate the new runtime. It does not absorb the broader mode
language cleanup and metadata normalization that Phase 03 already owns.

---

## Progress Tracker

| Session | Name | Status | Est. Tasks | Validated |
|---------|------|--------|------------|-----------|
| 01 | Codex Exec Worker Contract | Complete | ~12-25 | 2026-04-15 |
| 02 | Structured Batch Result Handling | Complete | ~12-25 | 2026-04-15 |
| 03 | Batch Runtime Docs Alignment | Complete | ~12-25 | 2026-04-15 |
| 04 | Batch Flow Validation and Closeout | Complete | ~12-25 | 2026-04-15 |

---

## Completed Sessions

- Session 01: Codex Exec Worker Contract
- Session 02: Structured Batch Result Handling
- Session 03: Batch Runtime Docs Alignment
- Session 04: Batch Flow Validation and Closeout

---

## Upcoming Sessions

None. Phase 02 is complete.

---

## Objectives

1. Replace `claude -p` batch worker orchestration with `codex exec`.
2. Make the worker output contract structured, schema-validated, and
   authoritative for batch state handling.
3. Validate the new batch runtime without pulling broad prompt cleanup or
   metadata normalization into this phase.

---

## Prerequisites

- Phase 01 completed
- `AGENTS.md`, `.codex/skills/`, and the existing validation surface remain
  the canonical runtime contract
- Prompt and mode language cleanup stays deferred to Phase 03 unless a batch
  runtime blocker forces a narrowly scoped edit

---

## Technical Considerations

### Architecture

The batch runner should keep the current repo-owned orchestration model, input
TSV format, report numbering discipline, and tracker merge flow. Phase 02 only
replaces the worker runtime surface and the way worker outcomes are recorded.

### Technologies

- Bash batch orchestration in `batch/batch-runner.sh`
- Codex CLI non-interactive execution via `codex exec`
- JSON schema validation for worker results
- Existing Node.js verification scripts such as
  `scripts/merge-tracker.mjs` and `scripts/verify-pipeline.mjs`

### Risks

- Runtime-contract mismatch between `codex exec` and the current runner:
  mitigate by defining the result schema before changing downstream state
  handling
- Scope creep into Phase 03 prompt cleanup: mitigate by keeping broader mode
  and metadata edits out of scope unless they block batch validation
- Partial artifact ambiguity during rollout: mitigate by making `completed`,
  `partial`, and `failed` outcomes explicit and testable

### Relevant Considerations

- [P00] **Residual legacy references**: Keep non-batch runtime cleanup out of
  this phase unless it directly blocks the batch path.
- [P00] **Validator surface drift**: Recheck batch-runtime changes against the
  scripts and files that define the live runtime contract.
- [P01] **Deferred runtime-reference cleanup**: Limit this phase to batch
  execution and batch-owned docs, then hand residual wording cleanup to
  Phase 03.
- [P00] **No data collection surface**: Preserve the clean no-PII, no-secrets
  posture in logs, schemas, and validation output.
- [P00] **Canonical live surface**: Keep `AGENTS.md`, `.codex/skills/`, and
  live docs as the authoritative runtime surfaces.
- [P00] **Explicit deferral ledger**: Record any leftover prompt or metadata
  drift so Phase 03 starts with a clean handoff.
- [P00] **Validator-first closeout**: Pair runtime changes with validation
  evidence instead of treating docs or closeout as a separate cleanup pass.

---

## Success Criteria

Phase complete when:
- [x] All 4 sessions completed
- [x] `batch/batch-runner.sh` launches workers through `codex exec`, not
      `claude -p`
- [x] Worker outcomes are read from a structured result file rather than log
      scraping
- [x] Batch-owned docs describe the live `codex exec` runtime and the worker
      result contract
- [x] Validation evidence shows dry-run and controlled batch flows work
      without reopening Phase 00 or Phase 01 scope
- [x] Residual prompt and metadata cleanup is explicitly handed to Phase 03

---

## Dependencies

### Depends On

- Phase 01: Docs and Entrypoints

### Enables

- Phase 03: Prompt and Metadata Normalization
