# career-ops - Product Requirements Document

## Overview

career-ops is an AI-powered job search pipeline whose durable value lives in
its prompts, scripts, templates, and tracker discipline. The product already
delivers job evaluation, PDF generation, portal scanning, and tracker
integrity through mostly agent-agnostic Node.js and Go components.

This PRD defines the full migration required to make OpenAI Codex CLI the
primary runtime for the repository. The goal is not to rewrite the product.
The goal is to unify the repo around a single canonical agent contract,
replace Claude-specific operational entrypoints with Codex-native ones, and
remove repo drift that currently breaks validation, updater behavior, and
contributor onboarding.

The intended result is a Codex-primary repository where interactive use starts
with `codex`, non-interactive work uses `codex exec`, `AGENTS.md` is
authoritative, `.codex/skills/` is the active checked-in skill surface, and
the existing job-search business logic continues to operate without a product
rewrite.

## Current State Summary

career-ops is not Codex-primary today. It is in a mixed state:

- The repo already contains a real Codex instruction surface in `AGENTS.md`
  and `.codex/skills/career-ops/SKILL.md`.
- The core Node.js and Go implementation is mostly agent-agnostic and does not
  require a rewrite.
- The operating model, docs, batch runner, updater metadata, and test harness
  are still materially Claude-first.

The migration therefore centers on four outcomes:

1. Make the canonical agent surface unambiguous.
2. Replace Claude-specific entrypoints and worker orchestration with Codex CLI
   entrypoints.
3. Remove internal drift where the repo references missing files and old
   directories.
4. Preserve the existing business logic, data contract, and user outputs.

## Goals

1. Make Codex CLI the primary interactive and non-interactive runtime for
   career-ops.
2. Eliminate internal repo drift that causes missing-file failures, version
   mismatches, and ambiguous instruction sources.
3. Preserve the existing job-search business logic, data contract, and user
   outputs while converting the runtime surface.
4. Make docs, modes, updater logic, and repo metadata consistently reflect a
   Codex-primary operating model.
5. Remove Claude Code and OpenCode from primary onboarding and from the
   supported runtime contract described by the main repo docs.

## Non-Goals

- Rebuild the evaluator, scanner, PDF pipeline, tracker scripts, or dashboard
  from scratch.
- Change the user-layer data contract or move personalization into system-layer
  files.
- Add automatic job submission or any other behavior that bypasses the
  existing human-in-the-loop model.
- Introduce a new external orchestration service when repo-owned scripts plus
  Codex CLI are sufficient.
- Keep missing legacy instruction files as required dependencies for the
  primary workflow.

## Users and Use Cases

### Primary Users

- **Repo maintainer**: Owns the canonical runtime contract, release flow,
  updater behavior, and migration sequencing.
- **Contributor**: Modifies docs, scripts, modes, and metadata and needs a
  clear source of truth plus working validation.
- **Job-search operator**: Runs the repo interactively or in batch and expects
  the documented primary path to work with Codex CLI.

### Key Use Cases

1. A maintainer can define the authoritative agent contract in `AGENTS.md` and
   checked-in Codex skills without depending on missing companion docs.
2. A contributor can clone the repo, follow setup instructions, and validate
   the repo without hitting stale path or version failures.
3. A job-search operator can start the product from the repo root with
   `codex` and use documented workflows without Claude-first instructions.
4. A batch operator can run multi-offer processing through `codex exec`
   workers instead of `claude -p`.
5. A maintainer can delete the original conversion audit doc without losing the
   rationale, evidence, scope, or completion criteria for the migration.

## Requirements

### MVP Requirements

- Maintainer can define canonical agent behavior through `AGENTS.md` and
  `.codex/skills/` without requiring `docs/CLAUDE.md` or `docs/CODEX.md`.
- Contributor can run repo validation on a clean checkout and get passing
  results once required system files and version paths are aligned.
- User can follow `README.md` and `docs/SETUP.md` to install dependencies and
  start career-ops with `codex` from the repo root.
- User sees Codex CLI as the only documented runtime in primary onboarding,
  with Claude Code and OpenCode removed from the main setup, quick-start, and
  contribution path.
- Batch operator can execute batch evaluation flows through `codex exec`
  instead of `claude -p`.
- Maintainer can keep one canonical version source that the updater, tests,
  package metadata, and version docs all agree on.
- Contributor can update docs, updater logic, labeler rules, and data-contract
  references against `.codex/skills/` as the active checked-in skill surface.
- Maintainer can keep mode files and batch prompts in Codex-native or
  runtime-neutral capability language instead of vendor-specific tool API
  names.
- Job-search operator can continue receiving the same core outputs - reports,
  PDFs, tracker additions, and scan results - after the runtime conversion.
- Maintainer can remove `docs/CODEX_CLI_PRIMARY_CONVERSION_AUDIT.md` once the
  PRD becomes the canonical migration source of truth.

### Deferred Requirements

- Maintainer can document optional alternate runtimes without weakening
  Codex-primary defaults.
- Contributor can add richer machine-readable telemetry for batch workers
  beyond the final-message contract.
- Maintainer can add deeper Codex-native review and automation workflows after
  the primary migration is stable.

## Non-Functional Requirements

- **Validation correctness**: `node scripts/test-all.mjs --quick` passes on a
  clean checkout with zero failures caused by missing legacy artifacts or stale
  path expectations.
- **Version consistency**: `package.json`, the canonical version file, updater
  logic, and any retained version mirrors resolve to the same semantic version
  string.
- **Batch operability**: Batch execution has zero dependency on `claude -p`,
  and every worker invocation uses `codex exec` with a documented structured
  output contract instead of log scraping.
- **Documentation usability**: A first-time user can complete the primary
  setup flow using `README.md` and `docs/SETUP.md` without any required step
  that defaults to `claude`.
- **Repo consistency**: Checked-in docs, updater paths, and repo metadata
  contain zero required references to missing instruction files or inactive
  `.claude/skills/` paths in Codex-primary flows.
- **Language cleanup**: Mode files, batch prompts, and primary docs contain
  zero backward-compatible Claude wording or tool-name shims after the
  migration completes.
- **Migration traceability**: The PRD contains the audit rationale, file-level
  breakpoints, migration order, and definition of done needed to replace the
  deleted audit document.

## Constraints and Dependencies

- The migration must preserve the existing Node.js scripts, Go dashboard,
  templates, tracker files, and user-layer data contract.
- The canonical persistent instruction surface must remain rooted in
  `AGENTS.md` plus checked-in Codex skills.
- The migration depends on Codex CLI capabilities observed locally: `codex`,
  `codex exec`, `codex review`, `codex mcp`, `--output-last-message`,
  `--json`, and `-C/--cd`.
- The repo depends on Node.js, npm, Playwright, Bash, and Go as existing
  implementation layers.
- The migration should prefer repo-owned scripts and runtime-neutral wording
  over vendor-specific UX metaphors.
- Root `VERSION` is the canonical version source because the updater, test
  harness, and data contract already anchor to it; `docs/VERSION` will be
  removed rather than retained as a mirror.

## Existing Assets That Transfer Cleanly

These areas already work with a Codex-first design or need only light wording
changes:

- `scripts/*.mjs` for PDF generation, liveness checking, tracker merge/dedup,
  normalization, scan, doctor, and verification.
- `dashboard/` Go TUI.
- `templates/`, `fonts/`, `data/`, `reports/`, `output/`, and `jds/`.
- Most of `docs/DATA_CONTRACT.md`.
- Root agent instructions in `AGENTS.md`.
- Codex skill bootstrap in `.codex/skills/career-ops/SKILL.md`.

The repo's durable value is in its prompts, scripts, templates, and tracker
discipline. Those should survive the migration intact.

## Current Breakpoints

### 1. Canonical agent docs are inconsistent

The repo currently has three competing stories:

- `AGENTS.md` is the only real Codex contract.
- `.codex/skills/career-ops/SKILL.md` still says the read order starts with
  `docs/CODEX.md` and `docs/CLAUDE.md`.
- The test suite and multiple docs still assume `docs/CLAUDE.md` exists.

These files do not exist in the current checkout. The result is split guidance,
contributor confusion, and validation failures unrelated to business logic.

### 2. Validation fails because of missing legacy artifacts

Observed audit facts:

- `node scripts/test-all.mjs --quick` fails because `scripts/test-all.mjs`
  requires `docs/CLAUDE.md` and root `VERSION`.
- Root `VERSION` is missing.
- The repo instead has `docs/VERSION`.

The result is that the declared repo gate is broken and the updater/test
surface disagrees with the actual file layout.

### 3. Version ownership is split across incompatible paths

Observed audit facts:

- `package.json` says `1.5.3`.
- `docs/VERSION` says `1.5.3`.
- `scripts/update-system.mjs` reads root `VERSION`, which is missing.
- `node scripts/update-system.mjs check` reports local version as `0.0.0`.

The result is incorrect update prompts and unreliable release-path behavior.

### 4. Public product positioning is still Claude-first

Observed examples:

- `README.md` badges include `Claude Code`, `OpenCode`, and `Codex (soon)`.
- `README.md` quick start tells users to run `claude`.
- `docs/SETUP.md` requires Claude Code and starts with `claude`.
- `docs/CONTRIBUTING.md` says career-ops is built with Claude Code.
- `scripts/doctor.mjs` ends with `Run claude to start`.

The result is that even functional Codex support would still be hidden behind
Claude-first onboarding.

### 5. Batch mode is hardwired to `claude -p`

This affects:

- `batch/batch-runner.sh`
- `batch/README-batch.md`
- `modes/batch.md`
- `docs/ARCHITECTURE.md`

The current design assumes a `claude` executable exists, that workers are
launched with `claude -p`, and that worker behavior is described in
Claude-native language. This is the largest operational blocker to a
Codex-primary runtime.

### 6. Prompt and mode language assumes Claude tool names

Observed examples across `modes/` and `batch/` include:

- `WebSearch`
- `WebFetch`
- `browser_navigate`
- `browser_snapshot`
- `Agent(...)`
- `/career-ops ...` slash-command framing

Some of these are capability descriptions, but others encode another agent's
tool API and UX model directly into the repo.

### 7. Update and metadata paths still point at `.claude`

This affects:

- `scripts/update-system.mjs`
- `.github/labeler.yml`
- `docs/DATA_CONTRACT.md`
- `docs/CUSTOMIZATION.md`
- `.gitignore`

The repo's active checked-in skill surface lives under `.codex/`, but several
system paths still point at `.claude/skills/` or `.claude` local state.

## Codex CLI Runtime Surface Available Locally

The local environment already exposes the Codex CLI surface needed for this
migration:

- `codex`
- `codex exec`
- `codex review`
- `codex mcp`
- interactive usage through `codex [PROMPT]`

Relevant observed behavior:

- `codex exec` supports non-interactive execution.
- Prompt content can be provided directly or via stdin.
- `--output-last-message` and `--json` provide machine-readable integration
  options.
- `-C/--cd` supports setting the workspace root.

This means the repo can replace `claude -p` batch workers without introducing a
new external service.

## Alignment With OpenAI Guidance

The target architecture is consistent with current OpenAI guidance:

- Codex CLI supports persistent project instructions via `AGENTS.md`.
- Codex supports checked-in skills that can be shared across the app, CLI, and
  IDE extension.
- The repo does not need a second mandatory "Codex instructions" document to
  be Codex-native.

Architectural implication: `AGENTS.md` plus `.codex/skills/` is the correct
primary shape for this repository.

## Recommended Target State

To make career-ops truly Codex-primary, the canonical model should be:

- **Interactive use**: `codex` from the repo root, governed by `AGENTS.md`
  and `.codex/skills/career-ops/SKILL.md`
- **Non-interactive and batch use**: `codex exec`
- **Repo-owned business logic**: Node.js scripts, mode files, templates, and
  tracker rules
- **Agent-neutral implementation where possible**
- **Codex-specific wording only where runtime behavior actually depends on
  Codex**

## Migration Workstreams

### Workstream A: Make `AGENTS.md` the single source of truth

Problem:

- The repo advertises multiple instruction sources and still references missing
  legacy docs.

Required changes:

- Rewrite `.codex/skills/career-ops/SKILL.md` to read `AGENTS.md` first, not
  `docs/CODEX.md` or `docs/CLAUDE.md`.
- Remove `docs/CLAUDE.md` integrity checks from `scripts/test-all.mjs`.
- Replace those checks with validation that:
  - `AGENTS.md` exists
  - `.codex/skills/career-ops/SKILL.md` exists
  - required Career-Ops sections are present in `AGENTS.md`

Result:

- One canonical Codex contract.
- No fake dual source of truth.

### Workstream B: Standardize version ownership

Problem:

- Version data is split across incompatible paths and the updater reads a
  missing file.

Required changes:

- Restore root `VERSION` because the updater and test harness already expect
  it.
- Remove `docs/VERSION` instead of keeping a second human-maintained mirror.
- Ensure `package.json`, updater logic, and tests all resolve to the root
  `VERSION` value.

Result:

- Update checks report the real local version.
- Tests stop failing on version drift.

### Workstream C: Replace Claude-first entrypoints with Codex-first entrypoints

Problem:

- Public onboarding still defaults to Claude-first usage.

Required changes:

- Update `README.md`, `docs/SETUP.md`, `docs/CONTRIBUTING.md`, and
  `scripts/doctor.mjs`.
- Replace wording like "Open Claude Code" with `Run codex from this
directory`.
- Replace `Codex (soon)` positioning with Codex as the primary runtime.
- Remove Claude Code and OpenCode from the primary onboarding path instead of
  documenting them as alternate runtimes.

Result:

- The default documented path matches the intended product.

### Workstream D: Rebuild batch mode around `codex exec`

Problem:

- Batch orchestration is operationally owned by `claude -p`.

Required changes:

- Replace the worker invocation in `batch/batch-runner.sh` with `codex exec`.
- Feed the resolved worker prompt through stdin or an explicit prompt argument.
- Use `-C "$PROJECT_DIR"` so each worker runs against the repo root.
- Capture worker output through `--output-last-message`, and optionally use
  `--json` for event logs.
- Update batch docs and architecture docs to match the new worker contract.

Worker contract:

- The runner invokes `codex exec` with `--output-schema` and
  `--output-last-message <result-file>` so the final worker result is
  schema-validated JSON rather than free-form text.
- The final JSON object is the source of truth for batch state and must
  include:
  - `status`: `completed`, `partial`, or `failed`
  - `score`: numeric 0-5 score or `null`
  - `report_path`: absolute or repo-relative path to the report, or `null`
  - `pdf_path`: absolute or repo-relative path to the PDF, or `null`
  - `tracker_path`: absolute or repo-relative path to the tracker TSV, or
    `null`
  - `batch_id`: input offer ID
  - `report_num`: reserved report number
  - `company_slug`: normalized company slug
  - `warnings`: array of strings
  - `error`: human-readable failure summary or `null`
- `completed` means the report, PDF, and tracker TSV all exist and `score` is
  present.
- `partial` means the report exists and `score` is present, but one or more
  secondary artifacts are missing or degraded; the missing artifact is named in
  `warnings`.
- `failed` means the worker completed its reasoning pass but could not produce
  a usable evaluation outcome; `error` is required and the runner records the
  offer as failed.
- A non-zero `codex exec` exit code is treated as infrastructure failure, not
  as a semantic worker outcome. In that case the runner marks the offer failed
  even if log output exists.
- The batch runner must stop extracting `score` by regex from logs and instead
  read the structured result file.

Result:

- The project becomes Codex-primary operationally, not just interactively.

### Workstream E: Rewrite mode language to be Codex-native or runtime-neutral

Problem:

- Prompt and mode files encode Claude-native tools and UX assumptions.

Required changes:

- Keep job-search business rules intact.
- Replace named tool expectations with capability language such as `use browser
automation when available`.
- Replace tool-specific directions with repo-script language where appropriate,
  such as `run npm run liveness -- <url>`.
- Replace slash-command framing with natural-language Codex usage or
  documented `codex exec` examples.
- Remove all backward-compatible Claude wording rather than preserving any
  transitional aliases or dual-runtime phrasing.

Result:

- Mode files become durable across Codex versions.
- The repo stops encoding another agent's tool API as if it were universal.

### Workstream F: Move repo metadata from `.claude` to `.codex`

Problem:

- Repo metadata and updater paths still target the wrong skill namespace.

Required changes:

- Update `scripts/update-system.mjs`, `.github/labeler.yml`,
  `docs/DATA_CONTRACT.md`, and `docs/CUSTOMIZATION.md` to point at `.codex`.
- Decide whether `.claude` remains only as a legacy optional surface.
- Ensure local-state ignores and contributor tooling align with the actual
  checked-in Codex skill directory.

Result:

- Updater, docs, and metadata target the real repo layout.

## Phases

| Phase | Name                              | Sessions | Status   |
| ----- | --------------------------------- | -------- | -------- |
| 00    | Contract and Drift Cleanup        | 4        | Complete |
| 01    | Docs and Entrypoints              | 4        | Complete |
| 02    | Batch Runtime Conversion          | 4        | Complete    |
| 03    | Prompt and Metadata Normalization | TBD      | Planned  |

Phase 00 is complete as of 2026-04-15. Phase 01 is complete as of 2026-04-15.
Phase 02 is complete as of 2026-04-15. Phase 03 remains planned.

## Suggested Migration Order

### Phase 00: Contract and Drift Cleanup

Objectives:

1. Make `AGENTS.md` plus `.codex/skills/` the unambiguous canonical
   instruction surface.
2. Remove missing-file and version-path drift that currently breaks validation
   and updater behavior.
3. Align core repo metadata with the actual checked-in Codex skill layout.

Primary workstreams:

- Workstream A
- Workstream B
- The metadata subset of Workstream F that blocks validation and updates

### Phase 01: Docs and Entrypoints

Objectives:

1. Make the public onboarding path Codex-primary.
2. Remove documentation drift that positions Claude as the default runtime.

Primary workstreams:

- Workstream C

### Phase 02: Batch Runtime Conversion

Objectives:

1. Replace `claude -p` worker orchestration with `codex exec`.
2. Validate the worker output contract against real batch flows.

Primary workstreams:

- Workstream D

### Phase 03: Prompt and Metadata Normalization

Objectives:

1. Remove Claude-specific tool names and UX assumptions from modes and batch
   prompts.
2. Finish metadata normalization so `.codex/` is the active checked-in skill
   surface everywhere.

Primary workstreams:

- Workstream E
- Remaining Workstream F items

## Technical Stack

- Node.js ESM scripts - primary automation, validation, updater, tracker, and
  PDF pipeline logic
- Codex CLI - primary interactive runtime and planned non-interactive batch
  worker runtime
- Playwright - browser-backed liveness checks and PDF/browser-dependent flows
- Bash - orchestration and glue for existing repo scripts and batch execution
- Go with Bubble Tea - terminal dashboard implementation
- Markdown and YAML prompts/config - checked-in operational contract, modes,
  and configuration surfaces

## Success Criteria

- [x] A new user can follow `README.md` and `docs/SETUP.md` using `codex`, not
      `claude`.
- [x] `README.md`, `docs/SETUP.md`, `docs/CONTRIBUTING.md`, and
      `scripts/doctor.mjs` no longer position Claude Code or OpenCode as
      alternate runtimes in the main onboarding path.
- [x] The canonical instructions are rooted in `AGENTS.md`, with no required
      missing companion files.
- [x] `node scripts/test-all.mjs --quick` passes on a clean checkout.
- [x] `node scripts/update-system.mjs check` reports the correct local version.
- [x] Batch mode runs via `codex exec`, not `claude -p`.
- [x] Batch workers emit schema-validated structured JSON via
      `--output-last-message`, and the runner no longer scrapes scores from
      logs.
- [x] `.codex/skills/` is treated as the active checked-in skill surface
      across docs, updater logic, and repo metadata.
- [x] Root `VERSION` is present as the canonical version source and
      `docs/VERSION` is removed.
- [x] Mode files, batch prompts, and primary docs contain zero Claude-specific
      tool names or backward-compatible wording.
- [x] `docs/CODEX_CLI_PRIMARY_CONVERSION_AUDIT.md` can be deleted without
      losing migration scope, evidence, or acceptance criteria.

## What Does Not Need a Rewrite

These areas should largely stay intact during the migration:

- tracker merge, dedup, and verify scripts
- PDF generation pipeline
- Playwright liveness checker
- portal scanner logic
- dashboard
- templates and fonts
- the user/system data boundary

The repo's problem is not its business logic. The problem is its agent
contract and execution-surface drift.

## Risks

- **Compatibility drift**: Optional support for alternate runtimes can
  reintroduce dual-source confusion. Mitigation: codify Codex-primary defaults
  and mark alternates as optional.
- **Batch contract mismatch**: `codex exec` output semantics may differ from
  the current Claude-based runner. Mitigation: define a worker output contract
  and validate it on real offers before rollout.
- **Documentation churn**: Many files reference old paths and assumptions.
  Mitigation: update docs and metadata by explicit workstream and keep
  validation gates active.
- **Partial migration risk**: Interactive flows may look complete while batch
  mode still fails. Mitigation: treat batch runtime conversion as a separate
  phase with explicit acceptance criteria.

## Assumptions

- Maintainers want Codex CLI to be the primary runtime, not merely an optional
  alternative.
- Existing Node.js and Go business logic remains valid once the runtime
  contract and entrypoints are corrected.
- Codex CLI will continue to support non-interactive execution and
  machine-readable output suitable for batch orchestration.
- `AGENTS.md` plus `.codex/skills/` remains the preferred persistent
  instruction model for this repository.

## Definition of Done

The repository should only be called Codex-primary when all of the following
are true:

- A new user can follow `README.md` and `docs/SETUP.md` using `codex`, not
  `claude`.
- `README.md`, `docs/SETUP.md`, `docs/CONTRIBUTING.md`, and `scripts/doctor.mjs`
  no longer position Claude Code or OpenCode as alternate runtimes in the main
  onboarding path.
- The canonical instructions are rooted in `AGENTS.md`, with no required
  missing companion files.
- `node scripts/test-all.mjs --quick` passes on a clean checkout.
- `node scripts/update-system.mjs check` reports the correct local version.
- Batch mode runs via `codex exec`, not `claude -p`.
- Batch workers emit schema-validated structured JSON via
  `--output-last-message`, and the runner no longer scrapes scores from logs.
- `.codex/skills/` is treated as the active checked-in skill surface across
  docs, updater logic, and repo metadata.
- Root `VERSION` is present as the canonical version source and `docs/VERSION`
  is removed.
- Mode files, batch prompts, and primary docs contain zero Claude-specific
  tool names or backward-compatible wording.
