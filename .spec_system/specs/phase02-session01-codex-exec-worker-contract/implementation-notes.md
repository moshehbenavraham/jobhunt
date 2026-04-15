# Implementation Notes

**Session ID**: `phase02-session01-codex-exec-worker-contract`
**Started**: 2026-04-15 12:29
**Last Updated**: 2026-04-15 12:45

---

## Session Progress

| Metric              | Value     |
| ------------------- | --------- |
| Tasks Completed     | 23 / 23   |
| Estimated Remaining | 0 hours   |
| Blockers            | 0         |

---

## Environment Verified

- [x] Prerequisites confirmed via `check-prereqs.sh --json --env`
- [x] Required tools confirmed: `codex`, `node`, `npm`, `bash`, `rg`, `jq`, `git`
- [x] Current session resolved via `analyze-project.sh --json`
- [x] Session directory present with `spec.md` and `tasks.md`

## Baseline Audit

### Worker Launch And State Boundary

- `batch/batch-runner.sh` still documents and requires `claude -p` for every
  batch worker launch.
- The runner owns lock files, state updates, retry counts, report-number
  reservation, tracker merge, and summary output already; those behaviors are
  the boundary to preserve during this session.
- Per-offer temp artifacts currently include `/tmp/batch-jd-${id}.txt`,
  `batch/logs/${report_num}-${id}.log`, and
  `batch/.resolved-prompt-${id}.md`. There is no explicit result-file,
  last-message, or event-log artifact yet.
- Success is currently inferred from a zero worker exit plus a regex scrape of
  `"score"` from stdout logs. Missing JSON, stale temp files, or invalid final
  output are not validated before the runner marks the offer completed.

### Prompt Placeholder And Output Contract

- `batch/batch-prompt.md` currently depends on the existing placeholders
  `{{URL}}`, `{{JD_FILE}}`, `{{REPORT_NUM}}`, `{{DATE}}`, and `{{ID}}`.
- The prompt asks the worker to print a final JSON summary to stdout rather
  than write a schema-backed result artifact to disk.
- The prompt already defines the semantic statuses `completed` and `failed`;
  Session 01 needs to make those outcomes explicit in a checked-in contract and
  add `partial` for degraded secondary artifacts without changing broader batch
  semantics yet.

### PRD And Convention Boundaries

- `.spec_system/PRD/PRD.md` confirms that Phase 02 owns the migration from
  `claude -p` to `codex exec` and that Session 01 is limited to the worker
  contract boundary, not downstream state semantics or docs cleanup.
- `.spec_system/CONVENTIONS.md` requires live-path verification, deterministic
  machine-readable outputs, fast failure on missing prerequisites, and
  `node scripts/test-all.mjs --quick` as the baseline regression gate.
- `.spec_system/CONSIDERATIONS.md` flags validator coupling, no new telemetry
  or PII surfaces, and the need to keep runtime-reference cleanup narrowly
  scoped to the batch contract workstream.

## Contract Decisions

- Worker result artifacts now live under `batch/logs/` as
  `{report_num}-{id}.result.json`, `{report_num}-{id}.last-message.json`, and
  `{report_num}-{id}.log`.
- The runner now treats the checked-in schema and a valid result file as the
  success boundary. A zero `codex exec` exit code alone is no longer enough.
- The prompt writes the final JSON to `{{RESULT_FILE}}` and returns the exact
  same JSON as the last assistant message so `--output-schema` and
  `--output-last-message` stay aligned.
- The contract harness owns deterministic verification of the launch surface by
  swapping in a fake `codex` executable inside a disposable repo sandbox.

## Session 02 Handoff

- Session 02 must make structured worker status authoritative. Today the
  runner records `partial` and semantic `failed` results in logs and the result
  artifact, but still marks the batch state as `completed` when the CLI exit
  code is zero.
- Session 02 should map `completed`, `partial`, and `failed` into final state,
  retry behavior, score handling, and operator-facing summaries without
  changing the invocation surface introduced here.
- Session 02 can reuse the checked-in schema, fixtures, and contract harness as
  the stable base for downstream state-semantic work.

## Validation Summary

- `bash -n batch/batch-runner.sh` passed after the runner conversion.
- `node scripts/test-batch-runner-contract.mjs` passed and verified completed,
  partial, semantic failed, and non-zero CLI exit cases in disposable
  sandboxes.
- `node scripts/test-all.mjs --quick` passed with 76 checks passed, 0 failed,
  and 0 warnings.
- A manual dry run against the stub `codex` executable completed successfully,
  left no `.resolved-prompt-*` temp files behind, and removed the
  `batch-runner.pid` lock file at exit.
- ASCII and LF validation passed for the touched batch assets, fixtures,
  session notes, and test scripts after normalizing the remaining legacy
  Unicode in the touched batch files.

## Contract Sources Reviewed

- `.spec_system/PRD/PRD.md`
- `.spec_system/PRD/phase_02/PRD_phase_02.md`
- `.spec_system/PRD/phase_02/session_01_codex_exec_worker_contract.md`
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/spec.md`
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/tasks.md`
- `.spec_system/CONVENTIONS.md`
- `.spec_system/CONSIDERATIONS.md`
- `batch/batch-runner.sh`
- `batch/batch-prompt.md`
- `scripts/test-all.mjs`

---

## Task Log

### 2026-04-15 - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

### Task T001 - Review the Phase 02 goals, Session 01 stub, and current batch-runtime boundaries

**Started**: 2026-04-15 12:29
**Completed**: 2026-04-15 12:29
**Duration**: 0 minutes

**Notes**:

- Reviewed the master PRD, the Phase 02 session stub, and the full session
  spec together to confirm the exact scope.
- Confirmed this session is limited to worker-launch conversion, result-file
  plumbing, schema definition, and contract-focused regression coverage.
- Confirmed Session 02 owns downstream result-to-state semantics and Session 03
  owns batch-runtime docs alignment.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - created the session-local implementation log

### Task T002 - Capture the current worker-launch, placeholder, and log-scrape baseline in session notes

**Started**: 2026-04-15 12:29
**Completed**: 2026-04-15 12:29
**Duration**: 0 minutes

**Notes**:

- Captured the live `claude -p` launch path, temp artifact usage, and
  stdout-driven score scrape behavior from `batch/batch-runner.sh`.
- Captured the existing batch prompt placeholders and the current stdout JSON
  summary contract from `batch/batch-prompt.md`.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - recorded the runner and prompt baseline

### Task T003 - Create the session notes scaffold for contract decisions, test evidence, and Session 02 handoff

**Started**: 2026-04-15 12:29
**Completed**: 2026-04-15 12:29
**Duration**: 0 minutes

**Notes**:

- Structured the notes around the exact session outputs: baseline audit,
  contract decisions, Session 02 handoff, validation summary, and a
  task-by-task execution log.
- Kept the format aligned with earlier spec sessions so validation has a
  familiar artifact layout.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - added the implementation scaffold

### Task T004 - Verify the `codex exec` contract requirements and phase boundaries against the master PRD

**Started**: 2026-04-15 12:29
**Completed**: 2026-04-15 12:29
**Duration**: 0 minutes

**Notes**:

- Verified in `.spec_system/PRD/PRD.md` that batch execution must move to
  `codex exec`, use an explicit structured output contract, and preserve the
  existing business logic and user outputs.
- Confirmed again that Session 01 must not absorb Session 02 result semantics
  or Session 03 docs cleanup.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the PRD boundary verification

### Task T005 - Verify conventions, validator expectations, and active concerns governing batch-runtime edits

**Started**: 2026-04-15 12:29
**Completed**: 2026-04-15 12:29
**Duration**: 0 minutes

**Notes**:

- Verified in `.spec_system/CONVENTIONS.md` that the runner changes must fail
  fast on missing prerequisites, keep machine-readable output explicit, and
  validate through `node scripts/test-all.mjs --quick`.
- Verified in `.spec_system/CONSIDERATIONS.md` that validator coupling, no new
  telemetry or PII surfaces, and explicit deferral boundaries remain active
  concerns during this session.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the governing conventions and active concerns

### Task T006 - Audit the current `claude -p` runner launch path, temp files, and state touchpoints

**Started**: 2026-04-15 12:29
**Completed**: 2026-04-15 12:29
**Duration**: 0 minutes

**Notes**:

- Audited the current runner flow and confirmed `process_offer` is the only
  worker-launch boundary that needs to change for this session.
- Confirmed the state file columns, report-number reservation, retry handling,
  lock management, and tracker merge behavior can remain untouched if the new
  contract stays narrow.
- Identified the main behavioral risks: missing result-file validation, stale
  temp-path reuse, and success being inferred from logs instead of an explicit
  artifact.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the runner audit

### Task T007 - Audit the worker prompt placeholders and stdout JSON contract that must be minimally adapted

**Started**: 2026-04-15 12:29
**Completed**: 2026-04-15 12:29
**Duration**: 0 minutes

**Notes**:

- Confirmed the prompt already has a stable placeholder surface and can absorb
  a `{{RESULT_FILE}}` placeholder without broader cleanup.
- Confirmed the final stdout JSON summary can be redirected into a schema-backed
  result file while preserving the rest of the worker instructions for now.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the prompt audit

### Task T008 - Define the checked-in worker result schema for `completed`, `partial`, and `failed` outcomes

**Started**: 2026-04-15 12:34
**Completed**: 2026-04-15 12:35
**Duration**: 1 minute

**Notes**:

- Added `batch/worker-result.schema.json` as the canonical worker-result
  contract with explicit variants for `completed`, `partial`, and `failed`.
- Kept the schema limited to the batch-owned fields this session needs:
  identifier fields, output artifact paths, score, legitimacy, and error
  summary.

**Files Changed**:

- `batch/worker-result.schema.json` - added the checked-in worker-result contract
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the schema definition

### Task T009 - Create the stub `codex` executable used by contract regression tests

**Started**: 2026-04-15 12:34
**Completed**: 2026-04-15 12:35
**Duration**: 1 minute

**Notes**:

- Added `batch/test-fixtures/mock-codex-exec.sh` to capture the live
  invocation surface, copy fixture output into the requested result artifacts,
  and emit deterministic JSONL events for the runner log.
- Kept the stub self-contained so the contract harness can override the
  `codex` executable through `PATH` without touching the user's real CLI.

**Files Changed**:

- `batch/test-fixtures/mock-codex-exec.sh` - added the deterministic Codex stub
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the stub fixture creation

### Task T010 - Add result-file, last-message, and event-log path helpers plus `codex` prerequisite checks to the runner

**Started**: 2026-04-15 12:35
**Completed**: 2026-04-15 12:39
**Duration**: 4 minutes

**Notes**:

- Added runner-owned result, last-message, and event-log paths under
  `batch/logs/` using the reserved report number and offer ID.
- Added runner prerequisite checks for `codex`, `jq`, and the checked-in
  schema file so the contract fails fast before any offer work starts.
- Reset stale result artifacts before each worker launch to avoid reusing old
  files on retries or re-entry.

**Files Changed**:

- `batch/batch-runner.sh` - added artifact paths, prerequisite checks, and stale-file cleanup
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the runner helper changes

**BQC Fixes**:

- State freshness on re-entry: cleared result, last-message, and event-log
  artifacts before each run (`batch/batch-runner.sh`)

### Task T011 - Thread `{{RESULT_FILE}}` through resolved prompt generation without breaking the existing batch placeholders

**Started**: 2026-04-15 12:35
**Completed**: 2026-04-15 12:39
**Duration**: 4 minutes

**Notes**:

- Extended the placeholder replacement flow with `{{RESULT_FILE}}` while
  keeping the existing URL, JD file, report number, date, and batch ID
  replacements intact.
- Added a small sed-escape helper so the new absolute path replacement stays
  deterministic and collision-safe.

**Files Changed**:

- `batch/batch-runner.sh` - threaded the result-file placeholder through prompt resolution
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the placeholder plumbing

### Task T012 - Replace the `claude -p` launch path with `codex exec -C "$PROJECT_DIR"` plus schema and last-message output flags, with explicit exit-code capture and failure-path handling

**Started**: 2026-04-15 12:35
**Completed**: 2026-04-15 12:39
**Duration**: 4 minutes

**Notes**:

- Replaced the worker launch with `codex exec -C "$PROJECT_DIR"` and the
  required non-interactive flags: dangerous bypass, output schema, last
  message, and JSONL event output.
- Switched score extraction from stdout scraping to structured result parsing.
- Added explicit contract validation so a zero exit code is not accepted when
  the result file is missing, empty, or shape-invalid.
- Kept state semantics intentionally narrow: the runner surfaces the worker
  status in logs, but Session 02 still owns authoritative mapping of
  `completed`, `partial`, and `failed` into batch state behavior.

**Files Changed**:

- `batch/batch-runner.sh` - replaced the worker launch path and added contract validation
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the Codex execution contract

**BQC Fixes**:

- Failure path completeness: failed fast when the result file is missing or
  invalid instead of treating a zero exit code as success (`batch/batch-runner.sh`)
- Contract alignment: validated the worker result against the checked-in
  contract before updating state (`batch/batch-runner.sh`)

### Task T013 - Update the worker prompt so the final structured JSON result is written to `{{RESULT_FILE}}` and remains aligned with the checked-in schema

**Started**: 2026-04-15 12:39
**Completed**: 2026-04-15 12:40
**Duration**: 1 minute

**Notes**:

- Added `{{RESULT_FILE}}` to the prompt placeholder contract and exposed a
  parseable `RESULT_FILE:` line for deterministic harness inspection.
- Updated the final-output instructions so the worker writes the JSON result to
  disk and returns the exact same JSON as the last assistant message.
- Added the explicit `partial` example and a `tracker` field so the checked-in
  prompt matches the new schema surface.

**Files Changed**:

- `batch/batch-prompt.md` - updated the prompt contract for result-file output
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the prompt contract update

### Task T014 - Create a completed-result fixture that represents the full report, PDF, and tracker success path

**Started**: 2026-04-15 12:40
**Completed**: 2026-04-15 12:40
**Duration**: 0 minutes

**Notes**:

- Added a completed fixture with all three artifact paths present and a numeric
  score so the harness can validate the full success contract.

**Files Changed**:

- `batch/test-fixtures/worker-result-completed.json` - added the completed result fixture
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the completed fixture

### Task T015 - Create a partial-result fixture that represents degraded secondary artifacts without losing the primary evaluation

**Started**: 2026-04-15 12:40
**Completed**: 2026-04-15 12:40
**Duration**: 0 minutes

**Notes**:

- Added a partial fixture with a successful report, a preserved score, and
  missing secondary artifacts so the harness can keep the semantic boundary
  explicit without reassigning batch state yet.

**Files Changed**:

- `batch/test-fixtures/worker-result-partial.json` - added the partial result fixture
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the partial fixture

### Task T016 - Create a failed-result fixture that represents semantic worker failure with a required error summary

**Started**: 2026-04-15 12:40
**Completed**: 2026-04-15 12:40
**Duration**: 0 minutes

**Notes**:

- Added a failed fixture with null score and artifact fields plus a required
  error summary so the harness can exercise semantic failure separately from a
  non-zero CLI exit.

**Files Changed**:

- `batch/test-fixtures/worker-result-failed.json` - added the failed result fixture
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the failed fixture

### Task T017 - Create the Codex contract harness that validates CLI arguments, repo-root execution, schema wiring, and fixture-backed result capture

**Started**: 2026-04-15 12:40
**Completed**: 2026-04-15 12:41
**Duration**: 1 minute

**Notes**:

- Added a disposable sandbox harness that copies the runner, prompt, schema,
  and a fake `codex` executable into a temporary repo-shaped workspace.
- The harness verifies the exact `codex exec` argument surface, prompt
  placeholder resolution, repo-root `-C` target, schema path wiring, and the
  presence of result, last-message, and event-log artifacts.
- The harness covers completed, partial, semantic failed, and non-zero CLI
  exit cases with the checked-in fixtures.

**Files Changed**:

- `scripts/test-batch-runner-contract.mjs` - added the Codex contract harness
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the harness implementation

**BQC Fixes**:

- Duplicate action prevention: isolated each contract scenario in its own temp
  workspace to prevent state reuse across test cases (`scripts/test-batch-runner-contract.mjs`)
- Contract alignment: asserted the placeholder-free prompt, schema path, and
  result-file capture surface in the harness (`scripts/test-batch-runner-contract.mjs`)

### Task T018 - Integrate the batch contract harness into the quick regression suite

**Started**: 2026-04-15 12:41
**Completed**: 2026-04-15 12:42
**Duration**: 1 minute

**Notes**:

- Added the batch contract harness to `scripts/test-all.mjs` so the repo's
  baseline quick suite now exercises the new worker boundary, not just syntax.
- Verified locally that the dedicated harness passes before moving into the
  broader validation tasks.

**Files Changed**:

- `scripts/test-all.mjs` - added the batch runner contract check to the quick suite
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the test-suite integration

### Task T019 - Record contract decisions, residual Session 02 state mapping work, and implementation evidence in session notes

**Started**: 2026-04-15 12:42
**Completed**: 2026-04-15 12:45
**Duration**: 3 minutes

**Notes**:

- Replaced the placeholder closeout sections with the actual contract
  decisions, Session 02 deferral notes, and validation evidence gathered in
  this session.
- Made the state-semantics deferral explicit so Session 02 can continue from a
  stable invocation surface without reopening Session 01 scope.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - finalized the contract decisions, handoff notes, and validation evidence

### Task T020 - Run `bash -n` and the contract harness to verify runner syntax, CLI arguments, schema validation, and result-file creation paths

**Started**: 2026-04-15 12:42
**Completed**: 2026-04-15 12:45
**Duration**: 3 minutes

**Notes**:

- Re-ran `bash -n batch/batch-runner.sh` after the final runner edits and
  prompt normalization.
- Re-ran `node scripts/test-batch-runner-contract.mjs` and confirmed the
  harness still validates CLI arguments, schema wiring, and result artifacts on
  the final tree.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the syntax and contract-harness evidence

### Task T021 - Run `node scripts/test-all.mjs --quick` and confirm the new batch contract coverage passes

**Started**: 2026-04-15 12:42
**Completed**: 2026-04-15 12:45
**Duration**: 3 minutes

**Notes**:

- Re-ran `node scripts/test-all.mjs --quick` on the final tree and confirmed
  the quick suite passes with the new batch contract section included.
- The quick suite reported 76 passed, 0 failed, and 0 warnings.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the quick-suite validation

### Task T022 - Manual dry-run the runner against the stub `codex` executable to verify lock, temp-file, and cleanup behavior

**Started**: 2026-04-15 12:42
**Completed**: 2026-04-15 12:45
**Duration**: 3 minutes

**Notes**:

- Ran the patched runner in a temporary repo-shaped sandbox with the stub
  `codex` executable on `PATH`.
- Confirmed the run completed with a structured result, updated batch state,
  removed `.resolved-prompt-*` temp files, and removed the `batch-runner.pid`
  lock file after exit.

**Files Changed**:

- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the manual dry-run evidence

### Task T023 - Validate ASCII encoding and Unix LF line endings across touched batch assets, fixtures, and session notes

**Started**: 2026-04-15 12:42
**Completed**: 2026-04-15 12:45
**Duration**: 3 minutes

**Notes**:

- Verified the touched batch assets, fixtures, notes, and test scripts contain
  only ASCII characters.
- Verified the same file set has Unix LF line endings and no CRLF content.
- Normalized the remaining touched batch files to ASCII so the session closes
  without a file-format waiver.

**Files Changed**:

- `batch/batch-prompt.md` - normalized the touched prompt file to ASCII
- `batch/batch-runner.sh` - removed the remaining touched non-ASCII warning glyph
- `.spec_system/specs/phase02-session01-codex-exec-worker-contract/implementation-notes.md` - logged the file-format validation
