# Task Checklist

**Session ID**: `phase02-session02-workspace-and-startup-tool-suite`
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
| Implementation | 4      | 4      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **15** | **15** | **0**     |

---

## Setup (3 tasks)

Startup repair sources and workspace metadata needed before tool definitions can
land.

### apps/api

- [x] T001 [S0202] Create the onboarding template contract and tracker skeleton
      source for repairable startup files (`apps/api/src/workspace/onboarding-template-contract.ts`,
      `data/applications.example.md`)
- [x] T002 [S0202] Extend workspace surface keys and contract metadata with
      readable template surfaces and canonical repair targets
      (`apps/api/src/workspace/workspace-types.ts`,
      `apps/api/src/workspace/workspace-contract.ts`)
- [x] T003 [S0202] Expose the new onboarding-template helpers through the
      shared workspace boundary without widening raw path access
      (`apps/api/src/workspace/workspace-adapter.ts`,
      `apps/api/src/workspace/index.ts`)

---

## Foundation (4 tasks)

Typed inspection and repair tool definitions built on the existing runtime
contracts.

### apps/api

- [x] T004 [S0202] Create startup inspection tools for startup diagnostics and
      prompt-contract summaries with schema-validated input and explicit error
      mapping (`apps/api/src/tools/startup-inspection-tools.ts`)
- [x] T005 [S0202] [P] Create profile summary helpers that parse profile,
      portals, CV, and article-digest sources into deterministic settings
      summaries with types matching declared contracts and exhaustive enum
      handling (`apps/api/src/tools/profile-summary.ts`)
- [x] T006 [S0202] [P] Create workspace discovery tools for required-file
      status, artifact directories, and workflow-support summaries with bounded
      pagination, validated filters, and deterministic ordering
      (`apps/api/src/tools/workspace-discovery-tools.ts`)
- [x] T007 [S0202] Create onboarding repair tools that map missing user-layer
      files to template-backed writes with idempotency protection, transaction
      boundaries, and compensation on failure
      (`apps/api/src/tools/onboarding-repair-tools.ts`)

---

## Implementation (4 tasks)

Default catalog registration and runtime integration for the new startup tool
surface.

### apps/api

- [x] T008 [S0202] Create the default startup and workspace tool-suite factory
      and package exports for shared runtime registration
      (`apps/api/src/tools/default-tool-suite.ts`,
      `apps/api/src/tools/index.ts`)
- [x] T009 [S0202] Wire the shared API service container to publish the
      Session 02 tool catalog by default with cleanup on scope exit for all
      acquired resources (`apps/api/src/runtime/service-container.ts`)
- [x] T010 [S0202] Update runtime coverage for default tool registration,
      catalog stability, and lazy reuse semantics with state reset or
      revalidation on re-entry
      (`apps/api/src/runtime/service-container.test.ts`)
- [x] T011 [S0202] Update the API package guide with the new inspection and
      repair tool boundaries, default catalog, and repair safety rules
      (`apps/api/README_api.md`)

---

## Testing (4 tasks)

Verification and regression coverage for read-first inspection and bounded
repair behavior.

### apps/api

- [x] T012 [S0202] [P] Add startup inspection coverage for diagnostics,
      prompt-contract projection, and auth-readiness passthrough without hidden
      writes (`apps/api/src/tools/startup-inspection-tools.test.ts`)
- [x] T013 [S0202] [P] Add workspace discovery coverage for profile summaries,
      legacy CV fallback, artifact listing, and deterministic ordering
      (`apps/api/src/tools/workspace-discovery-tools.test.ts`)
- [x] T014 [S0202] [P] Add onboarding repair coverage for template-backed
      preview, approval-required execution, and no-overwrite behavior for
      existing user files (`apps/api/src/tools/onboarding-repair-tools.test.ts`)

### repo root

- [x] T015 [S0202] Run API tool tests, runtime tests, boot smoke, build, and
      ASCII verification for Session 02 deliverables (`apps/api/src/tools/`,
      `apps/api/src/runtime/service-container.test.ts`,
      `data/applications.example.md`)

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
