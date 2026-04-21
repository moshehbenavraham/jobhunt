# Task Checklist

**Session ID**: `phase00-session02-workspace-adapter-contract`
**Total Tasks**: 15
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
| Testing        | 3      | 3      | 0         |
| **Total**      | **15** | **15** | **0**     |

---

## Setup (3 tasks)

Initial package alignment for the workspace adapter contract.

### apps/api

- [x] T001 [S0002] Extend repo-root helpers with canonical directory anchors
      and normalized repo-relative resolution
      (`apps/api/src/config/repo-paths.ts`)
- [x] T002 [S0002] Create shared workspace adapter types and barrel exports for
      the new module surface
      (`apps/api/src/workspace/workspace-types.ts`,
      `apps/api/src/workspace/index.ts`)
- [x] T003 [S0002] Update app-state helpers to share adapter boundary
      enforcement and normalized app-owned path assertions
      (`apps/api/src/config/app-state-root.ts`)

---

## Foundation (4 tasks)

Core contract metadata and policy definitions.

### apps/api

- [x] T004 [S0002] [P] Create the canonical surface registry with ownership,
      startup criticality, and missing-file policy metadata
      (`apps/api/src/workspace/workspace-contract.ts`)
- [x] T005 [S0002] [P] Create typed workspace adapter errors with explicit
      boundary and missing-file mappings
      (`apps/api/src/workspace/workspace-errors.ts`)
- [x] T006 [S0002] [P] Create boundary classification helpers for user-layer,
      system-layer, and app-owned paths
      (`apps/api/src/workspace/workspace-boundary.ts`)
- [x] T007 [S0002] Create missing-file policy helpers that distinguish
      onboarding-blocking files from optional runtime artifacts
      (`apps/api/src/workspace/missing-file-policy.ts`)

---

## Implementation (5 tasks)

Public adapter behavior and startup integration.

### apps/api

- [x] T008 [S0002] Create canonical surface read helpers with explicit
      required/optional handling and deterministic text or JSON decoding
      (`apps/api/src/workspace/workspace-read.ts`)
- [x] T009 [S0002] Create guarded write helpers for app-owned or explicitly
      allowed targets with overwrite-policy checks, atomic temp-write or rename
      behavior, and failure-path reporting
      (`apps/api/src/workspace/workspace-write.ts`)
- [x] T010 [S0002] Create workspace summary helpers for startup diagnostics and
      later tool preflight callers
      (`apps/api/src/workspace/workspace-summary.ts`)
- [x] T011 [S0002] Create the public workspace adapter facade with types
      matching the declared contract and exhaustive ownership handling
      (`apps/api/src/workspace/workspace-adapter.ts`)
- [x] T012 [S0002] Update API startup diagnostics to surface adapter summaries
      and onboarding-critical missing files without mutating user-layer content
      (`apps/api/src/index.ts`)

---

## Testing (3 tasks)

Deterministic package-local verification.

### apps/api

- [x] T013 [S0002] [P] Create temp-repo fixture helpers and safe file snapshots
      for deterministic adapter tests
      (`apps/api/src/workspace/test-utils.ts`)
- [x] T014 [S0002] [P] Create adapter unit coverage for root resolution,
      surface classification, missing-file semantics, and protected-write
      rejection
      (`apps/api/src/workspace/workspace-adapter.test.ts`)
- [x] T015 [S0002] Update the API workspace manifest with deterministic
      build, check, and test commands for the adapter contract
      (`apps/api/package.json`)

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
