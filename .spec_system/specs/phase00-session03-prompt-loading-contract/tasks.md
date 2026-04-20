# Task Checklist

**Session ID**: `phase00-session03-prompt-loading-contract`
**Total Tasks**: 14
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

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 2 | 2 | 0 |
| Foundation | 4 | 4 | 0 |
| Implementation | 5 | 5 | 0 |
| Testing | 3 | 3 | 0 |
| **Total** | **14** | **14** | **0** |

---

## Setup (2 tasks)

Initial prompt-module alignment for the API runtime.

### apps/api

- [x] T001 [S0003] Create shared prompt types and barrel exports for workflow
      intents, source roles, and composed bundles with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/prompt/prompt-types.ts`,
      `apps/api/src/prompt/index.ts`)
- [x] T002 [S0003] Create the workflow-to-mode registry aligned with the live
      `AGENTS.md` routing table and checked-in mode files with schema-validated
      input and explicit error mapping
      (`apps/api/src/prompt/workflow-mode-map.ts`)

---

## Foundation (4 tasks)

Core source policy, resolution, and cache building blocks.

### apps/api

- [x] T003 [S0003] [P] Create prompt source-order policy for `AGENTS.md`,
      shared mode, profile overlays, workflow mode, CV, profile config, and
      optional article digest with types matching declared contract and
      exhaustive enum handling
      (`apps/api/src/prompt/prompt-source-policy.ts`)
- [x] T004 [S0003] [P] Create prompt resolution helpers that validate allowed
      mode paths against the repo contract and legacy fallback rules with
      schema-validated input and explicit error mapping
      (`apps/api/src/prompt/prompt-resolution.ts`)
- [x] T005 [S0003] [P] Create a read-through prompt cache keyed by resolved
      source identity and file freshness with state reset or revalidation on
      re-entry
      (`apps/api/src/prompt/prompt-cache.ts`)
- [x] T006 [S0003] Create prompt composition helpers that preserve
      shared-before-profile order and article-digest precedence without
      duplicating user-specific narrative
      (`apps/api/src/prompt/prompt-compose.ts`)

---

## Implementation (5 tasks)

Public loader behavior and diagnostics integration.

### apps/api

- [x] T007 [S0003] Create the public prompt loader facade that assembles
      deterministic workflow bundles with explicit loading, missing, empty, and
      unsupported-workflow states
      (`apps/api/src/prompt/prompt-loader.ts`)
- [x] T008 [S0003] Create prompt contract summary helpers for startup
      diagnostics and future runtime bootstrap with types matching declared
      contract and exhaustive enum handling
      (`apps/api/src/prompt/prompt-summary.ts`)
- [x] T009 [S0003] Update API startup diagnostics to expose supported
      workflows, source order, and cache mode without mutating repo files
      (`apps/api/src/index.ts`)
- [x] T010 [S0003] Update the API workspace manifest with prompt-contract
      validation commands aligned to the new loader surface
      (`apps/api/package.json`)
- [x] T011 [S0003] Create temp-repo prompt fixtures covering legacy CV
      fallback, optional article digest, and missing workflow mode scenarios
      with state reset or revalidation on re-entry
      (`apps/api/src/prompt/test-utils.ts`)

---

## Testing (3 tasks)

Deterministic package-local verification.

### apps/api

- [x] T012 [S0003] [P] Create prompt-loader contract tests for workflow
      routing, source order, required-versus-optional inputs, and unsupported
      intent handling with explicit loading, missing, empty, and error states
      (`apps/api/src/prompt/prompt-loader.test.ts`)
- [x] T013 [S0003] [P] Extend prompt-loader tests to cover cache invalidation
      after local prompt edits and article-digest precedence over CV metrics
      (`apps/api/src/prompt/prompt-loader.test.ts`)
- [x] T014 [S0003] Run package build and test coverage for the prompt contract,
      then verify all new prompt files remain ASCII-only
      (`apps/api/package.json`, `apps/api/src/prompt/`)

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

Run the `implement` workflow step to begin AI-led implementation.
