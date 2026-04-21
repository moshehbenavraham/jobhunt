# Task Checklist

**Session ID**: `phase02-session03-evaluation-pdf-and-tracker-tools`
**Total Tasks**: 16
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-21

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 4      | 4      | 0         |
| Implementation | 5      | 5      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **16** | **16** | **0**     |

---

## Setup (3 tasks)

Evaluation, PDF, and tracker tools need explicit artifact ownership and
allowlisted script definitions before the tool handlers can land.

### apps/api

- [x] T001 [S0203] Extend workspace surface metadata for reports and
      tracker-additions with authorization enforced at the boundary closest to
      the resource (`apps/api/src/workspace/workspace-types.ts`,
      `apps/api/src/workspace/workspace-contract.ts`,
      `apps/api/src/workspace/workspace-boundary.ts`,
      `apps/api/src/workspace/workspace-summary.ts`)
- [x] T002 [S0203] Create the default Session 03 script allowlist for ATS
      extraction, PDF generation, and tracker closeout with timeout,
      retry/backoff, and failure-path handling
      (`apps/api/src/tools/default-tool-scripts.ts`)
- [x] T003 [S0203] Wire the Session 03 tool registration scaffolding and
      default script allowlist into the shared runtime with cleanup on scope
      exit for all acquired resources (`apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/index.ts`, `apps/api/src/runtime/service-container.ts`)

---

## Foundation (4 tasks)

Typed tool definitions for intake, workflow bootstrap, artifacts, and PDF
generation.

### apps/api

- [x] T004 [S0203] Create evaluation intake tools for supported ATS URL
      extraction and raw JD normalization with schema-validated input and
      explicit error mapping (`apps/api/src/tools/evaluation-intake-tools.ts`)
- [x] T005 [S0203] Create workflow bootstrap tools for `single-evaluation` and
      `auto-pipeline` with types matching declared contract and exhaustive enum
      handling (`apps/api/src/tools/evaluation-workflow-tools.ts`)
- [x] T006 [S0203] [P] Create report artifact tools for canonical path
      reservation, report writes, and deterministic artifact discovery with
      duplicate-trigger prevention while in-flight
      (`apps/api/src/tools/evaluation-artifact-tools.ts`)
- [x] T007 [S0203] [P] Create ATS PDF generation tools backed by the
      allowlisted script adapter with timeout, retry/backoff, and failure-path
      handling (`apps/api/src/tools/pdf-generation-tools.ts`)

---

## Implementation (5 tasks)

Tracker-safe closeout tools and runtime integration for the full Session 03
catalog.

### apps/api

- [x] T008 [S0203] Create tracker-integrity tools for TSV staging plus merge,
      verify, normalize, and dedup flows with idempotency protection,
      transaction boundaries, and compensation on failure
      (`apps/api/src/tools/tracker-integrity-tools.ts`)
- [x] T009 [S0203] Update the default tool suite and runtime coverage so the
      shared container publishes the Session 03 catalog and default script
      allowlist with state reset or revalidation on re-entry
      (`apps/api/src/runtime/service-container.test.ts`)
- [x] T010 [S0203] Update the API package guide with evaluation, PDF, report,
      and tracker tool boundaries plus the validation path
      (`apps/api/README_api.md`)
- [x] T011 [S0203] [P] Add evaluation intake and workflow bootstrap tests for
      ATS extraction, auth-required bootstrap, prompt failures, and
      unsupported-workflow handling (`apps/api/src/tools/evaluation-intake-tools.test.ts`,
      `apps/api/src/tools/evaluation-workflow-tools.test.ts`)
- [x] T012 [S0203] [P] Add report artifact and PDF tool tests for path
      collisions, deterministic ordering, and output-path validation
      (`apps/api/src/tools/evaluation-artifact-tools.test.ts`,
      `apps/api/src/tools/pdf-generation-tools.test.ts`)

---

## Testing (4 tasks)

Verification and regression coverage for tracker discipline and repo-wide
closeout.

### apps/api

- [x] T013 [S0203] [P] Add tracker-integrity tool tests covering TSV
      formatting, merge or verify dispatch, and warning propagation with denied
      or restricted handling and fallback behavior
      (`apps/api/src/tools/tracker-integrity-tools.test.ts`)

### repo root

- [x] T014 [S0203] Update quick-suite ASCII coverage and touched-script
      validation hooks for the Session 03 deliverables
      (`scripts/test-all.mjs`)
- [x] T015 [S0203] Run API tool tests, runtime tests, build, and boot smoke for
      the Session 03 deliverables (`apps/api/src/tools/`,
      `apps/api/src/runtime/service-container.test.ts`)
- [x] T016 [S0203] Run the repo quick suite and fixture-driven evaluation, PDF,
      and tracker smoke checks with explicit loading, empty, error, and offline
      states (`scripts/test-all.mjs`, `scripts/extract-job.mjs`,
      `scripts/generate-pdf.mjs`, `scripts/merge-tracker.mjs`,
      `scripts/verify-pipeline.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `implement` workflow step next. After a successful `plansession` run,
`implement` is always the next workflow command.
