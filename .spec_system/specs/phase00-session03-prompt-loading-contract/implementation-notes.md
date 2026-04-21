# Implementation Notes

**Session ID**: `phase00-session03-prompt-loading-contract`
**Package**: `apps/api`
**Started**: 2026-04-21 02:43
**Last Updated**: 2026-04-21 02:53

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 14 / 14 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

### Task T001 - Create shared prompt types and barrel exports for workflow intents, source roles, and composed bundles

**Started**: 2026-04-21 02:43
**Completed**: 2026-04-21 02:44
**Duration**: 1 minutes

**Notes**:

- Added the shared prompt type surface for workflow intents, source roles, bundle sources, and loader states.
- Added prompt-contract error types for unsupported workflows and invalid mode paths.

**Files Changed**:

- `apps/api/src/prompt/prompt-types.ts` - added the shared prompt contract types and error classes
- `apps/api/src/prompt/index.ts` - created the initial prompt barrel exports

### Task T002 - Create the workflow-to-mode registry aligned with the live AGENTS.md routing table

**Started**: 2026-04-21 02:43
**Completed**: 2026-04-21 02:44
**Duration**: 1 minutes

**Notes**:

- Added an explicit workflow registry that mirrors the current routing table in `AGENTS.md`.
- Added runtime validation for supported workflow inputs and guarded mode-path normalization.

**Files Changed**:

- `apps/api/src/prompt/workflow-mode-map.ts` - added the workflow registry and workflow-input validation helpers

**BQC Fixes**:

- Trust boundary enforcement: workflow mode resolution now rejects unsupported workflow names and invalid mode paths before file access (`apps/api/src/prompt/workflow-mode-map.ts`)

### Task T003 - Create prompt source-order policy for AGENTS.md, shared mode, profile overlays, workflow mode, profile config, CV, and article digest

**Started**: 2026-04-21 02:44
**Completed**: 2026-04-21 02:47
**Duration**: 3 minutes

**Notes**:

- Added one canonical prompt source policy that fixes the load order across instructions, workflow guidance, and supporting user data.
- Encoded the article-digest precedence note so later runtime layers do not re-decide proof-point ordering.

**Files Changed**:

- `apps/api/src/prompt/prompt-source-policy.ts` - added the canonical prompt source order and per-source metadata
- `apps/api/src/prompt/prompt-types.ts` - added the resolved-source type used by the policy and loader pipeline

### Task T004 - Create prompt resolution helpers that validate allowed mode paths against the repo contract and legacy fallback rules

**Started**: 2026-04-21 02:44
**Completed**: 2026-04-21 02:47
**Duration**: 3 minutes

**Notes**:

- Added prompt resolution helpers that bind prompt sources either to workspace surfaces or to the explicit workflow mode path.
- Reused the workspace adapter so legacy CV and article-digest fallbacks stay aligned with the existing repo contract.

**Files Changed**:

- `apps/api/src/prompt/prompt-resolution.ts` - added source resolution on top of the workspace adapter and mode registry
- `apps/api/src/prompt/index.ts` - exported the resolution helpers

**BQC Fixes**:

- Trust boundary enforcement: prompt resolution now validates workflow-mode paths through workspace ownership checks before resolving on disk (`apps/api/src/prompt/prompt-resolution.ts`)

### Task T005 - Create a read-through prompt cache keyed by resolved source identity and file freshness

**Started**: 2026-04-21 02:44
**Completed**: 2026-04-21 02:47
**Duration**: 3 minutes

**Notes**:

- Added a read-through cache keyed by source identity and `mtime:size` freshness so unchanged prompt files do not re-read unnecessarily.
- Missing files evict cached entries immediately so re-entry revalidates the on-disk state instead of serving stale content.

**Files Changed**:

- `apps/api/src/prompt/prompt-cache.ts` - added freshness-aware prompt loading and cache reset support
- `apps/api/src/prompt/index.ts` - exported the cache helpers

**BQC Fixes**:

- State freshness on re-entry: cache lookups re-stat every file and evict missing sources before returning a result (`apps/api/src/prompt/prompt-cache.ts`)
- Failure path completeness: missing or non-file prompt assets now surface explicit prompt read errors instead of silent fallthrough (`apps/api/src/prompt/prompt-cache.ts`)

### Task T006 - Create prompt composition helpers that preserve shared-before-profile order and article-digest precedence

**Started**: 2026-04-21 02:44
**Completed**: 2026-04-21 02:47
**Duration**: 3 minutes

**Notes**:

- Added bundle composition that keeps ordered source metadata and a deterministic rendered prompt text.
- Rendered source markers keep the assembled prompt inspectable without duplicating user-specific narrative outside the checked-in files.

**Files Changed**:

- `apps/api/src/prompt/prompt-compose.ts` - added deterministic prompt bundle composition
- `apps/api/src/prompt/index.ts` - exported the composition helpers

**BQC Fixes**:

- Contract alignment: composed bundles now preserve the declared source order and carry source identities for later runtime inspection (`apps/api/src/prompt/prompt-compose.ts`)

### Task T007 - Create the public prompt loader facade that assembles deterministic workflow bundles

**Started**: 2026-04-21 02:47
**Completed**: 2026-04-21 02:49
**Duration**: 2 minutes

**Notes**:

- Added the public prompt loader facade that binds the workspace adapter, source resolution, cache, and bundle composition into one API.
- The loader returns explicit `ready`, `missing`, `empty`, and `unsupported-workflow` states instead of silently defaulting.

**Files Changed**:

- `apps/api/src/prompt/prompt-loader.ts` - added the public loader facade and state mapping
- `apps/api/src/prompt/index.ts` - exported the prompt loader surface

**BQC Fixes**:

- Failure path completeness: unsupported workflows and missing or empty required prompt sources now produce explicit loader states (`apps/api/src/prompt/prompt-loader.ts`)

### Task T008 - Create prompt contract summary helpers for startup diagnostics and future runtime bootstrap

**Started**: 2026-04-21 02:47
**Completed**: 2026-04-21 02:49
**Duration**: 2 minutes

**Notes**:

- Added a static prompt contract summary that exposes supported workflows, source order, and cache mode for diagnostics.
- Added a generic policy summary entry for workflow-guidance sources so startup diagnostics do not need to inspect user content.

**Files Changed**:

- `apps/api/src/prompt/prompt-summary.ts` - added prompt contract summary helpers
- `apps/api/src/prompt/prompt-source-policy.ts` - added policy summary helpers for diagnostics
- `apps/api/src/prompt/index.ts` - exported the prompt summary helpers

**BQC Fixes**:

- Contract alignment: the diagnostics summary is now derived from the same prompt registry and source policy used by the loader (`apps/api/src/prompt/prompt-summary.ts`)

### Task T009 - Update API startup diagnostics to expose supported workflows, source order, and cache mode

**Started**: 2026-04-21 02:47
**Completed**: 2026-04-21 02:49
**Duration**: 2 minutes

**Notes**:

- Added `promptContract` to startup diagnostics so the boot surface exposes supported workflows and source order without reading mutable runtime state.
- Updated the diagnostics session identifier to the current prompt-loading contract session.

**Files Changed**:

- `apps/api/src/index.ts` - added prompt-contract diagnostics and updated the session identifier

**BQC Fixes**:

- Failure path completeness: startup diagnostics now expose the prompt contract explicitly instead of requiring callers to infer it from source code (`apps/api/src/index.ts`)

### Task T010 - Update the API workspace manifest with prompt-contract validation commands

**Started**: 2026-04-21 02:47
**Completed**: 2026-04-21 02:49
**Duration**: 2 minutes

**Notes**:

- Added a focused prompt-contract test script alongside the package-wide test command.

**Files Changed**:

- `apps/api/package.json` - added the prompt-contract test command

### Task T011 - Create temp-repo prompt fixtures covering fallback and missing-mode scenarios

**Started**: 2026-04-21 02:47
**Completed**: 2026-04-21 02:49
**Duration**: 2 minutes

**Notes**:

- Added prompt fixtures built on the workspace fixture helper so tests can cover routing, legacy CV fallback, optional article digest, and missing mode cases.
- File-update helpers bump mtimes explicitly so cache invalidation tests stay deterministic.

**Files Changed**:

- `apps/api/src/prompt/test-utils.ts` - added prompt fixtures and deterministic prompt-file mutation helpers

**BQC Fixes**:

- State freshness on re-entry: prompt test fixtures now force file timestamp changes so cache revalidation tests exercise live freshness checks (`apps/api/src/prompt/test-utils.ts`)

### Task T012 - Create prompt-loader contract tests for routing, source order, required-versus-optional inputs, and unsupported intent handling

**Started**: 2026-04-21 02:49
**Completed**: 2026-04-21 02:53
**Duration**: 4 minutes

**Notes**:

- Added prompt-loader tests covering ready bundles, explicit loading state exposure, unsupported workflows, legacy CV fallback, optional article digest handling, required missing workflow modes, and empty required sources.

**Files Changed**:

- `apps/api/src/prompt/prompt-loader.test.ts` - added the primary prompt-contract test coverage
- `apps/api/src/prompt/prompt-loader.ts` - exported the loading-state helper used by the tests

**BQC Fixes**:

- Failure path completeness: tests now lock in explicit loader states for unsupported, missing, and empty prompt inputs (`apps/api/src/prompt/prompt-loader.test.ts`)

### Task T013 - Extend prompt-loader tests for cache invalidation and article-digest precedence

**Started**: 2026-04-21 02:49
**Completed**: 2026-04-21 02:53
**Duration**: 4 minutes

**Notes**:

- Extended the prompt-loader tests to verify cache invalidation after prompt-file edits and the declared article-digest precedence over CV metrics.

**Files Changed**:

- `apps/api/src/prompt/prompt-loader.test.ts` - added cache invalidation and article-digest precedence coverage

**BQC Fixes**:

- State freshness on re-entry: cache tests now verify that file edits are visible on the next loader call without process restart (`apps/api/src/prompt/prompt-loader.test.ts`)

### Task T014 - Run prompt-contract validation and verify ASCII-only output

**Started**: 2026-04-21 02:49
**Completed**: 2026-04-21 02:53
**Duration**: 4 minutes

**Notes**:

- Ran package-local type checks, full API tests, the focused prompt-contract test script, startup diagnostics smoke output, an ASCII scan, and the repo quick regression suite.
- Updated the scaffold regression script to match the new diagnostics session identifier and prompt-contract fields after the repo quick suite exposed the drift.

**Files Changed**:

- `apps/api/src/prompt/prompt-loader.test.ts` - tightened the cache invalidation assertion to match the fixture content
- `scripts/test-app-scaffold.mjs` - updated scaffold regression expectations for the new prompt-contract diagnostics

**BQC Fixes**:

- Contract alignment: the repo-level scaffold regression now validates the new prompt-contract diagnostics surface instead of the retired Session 02 contract (`scripts/test-app-scaffold.mjs`)

**Out-of-Scope Files** (files outside declared package):

- `scripts/test-app-scaffold.mjs` - required to keep the repo quick regression suite aligned with the new API diagnostics contract

---

## Verification

- `npm run check --workspace @jobhunt/api`
- `npm run test --workspace @jobhunt/api`
- `npm run test:prompt-contract --workspace @jobhunt/api`
- `node apps/api/dist/index.js`
- `LC_ALL=C rg -n "[^[:ascii:]]" apps/api/src/prompt .spec_system/specs/phase00-session03-prompt-loading-contract || true`
- `node scripts/test-app-scaffold.mjs`
- `node scripts/test-all.mjs --quick`

**Result**:

- Prompt contract type checks and package-local tests passed.
- Startup diagnostics now expose `promptContract` with supported workflows, source order, and cache mode.
- ASCII scan returned no matches for the new prompt module or session artifacts.
- Repo quick regression suite passed after aligning the scaffold regression with the new diagnostics contract.

## Task Log

### 2026-04-21 - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---
