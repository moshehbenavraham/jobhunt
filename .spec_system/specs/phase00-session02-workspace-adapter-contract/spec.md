# Session Specification

**Session ID**: `phase00-session02-workspace-adapter-contract`
**Phase**: 00 - Foundation and Repo Contract
**Status**: Not Started
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

This session turns the API scaffold from Session 01 into the typed workspace
contract that later runtime work can depend on. Right now `apps/api` can find
the repo root and report minimal startup diagnostics, but it does not yet have
one explicit place to classify repo surfaces, enforce the user-versus-system
boundary, or explain what "missing file" means for onboarding versus normal
runtime.

The implementation should create a backend-owned workspace adapter under
`apps/api` that maps canonical repo surfaces, tags them by ownership and
criticality, and exposes guarded read and write helpers. The adapter must stay
inspectable and deterministic: later prompt-loading, onboarding, tracker, and
artifact flows should call one contract instead of repeating path math or file
policy decisions in scattered helpers.

This session is next because it is the earliest incomplete Phase 00 session
whose prerequisite is already satisfied, and Session 03 explicitly depends on
it. Prompt loading cannot be planned cleanly until the backend has a typed
surface map and boundary rules for the files it will load.

---

## 2. Objectives

1. Define a canonical surface registry for the repo files and directories the
   app runtime will read or write, including ownership, startup criticality,
   and missing-file behavior.
2. Implement a typed workspace adapter in `apps/api` that resolves repo
   surfaces deterministically and blocks invalid file access by default.
3. Distinguish onboarding-blocking missing files from optional runtime
   artifacts so later startup and workflow code can report the right action.
4. Add package-local validation for path resolution, boundary enforcement, and
   missing-file semantics before Session 03 builds prompt loading on top.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session01-monorepo-app-skeleton` - provides the `apps/api`
      package scaffold, repo-root helpers, and app-state ownership baseline.

### Required Tools/Knowledge

- `AGENTS.md` as the canonical runtime instruction surface
- `docs/DATA_CONTRACT.md` as the authoritative user/system boundary reference
- Existing API scaffold files in `apps/api/src/config/`

### Environment Requirements

- Node.js and npm installed for the current repo workspace
- Write access to `apps/api/` and `.spec_system/`
- Existing user-layer files preserved as read-first inputs unless a later
  workflow explicitly allows mutation

---

## 4. Scope

### In Scope (MVP)

- Backend can classify canonical repo surfaces such as profile files, mode
  files, data artifacts, reports, and app-owned state using one typed registry.
- Backend can resolve repo-relative file targets through one adapter API
  instead of ad hoc path joins or process-relative guesses.
- Backend can read required and optional workspace files with explicit missing
  results suitable for onboarding, startup checks, and later prompt loading.
- Backend can guard writes so app-owned state is allowed, protected surfaces
  are rejected, and any future allowed repo writes pass through an explicit
  policy gate.
- API startup diagnostics can summarize required missing files without
  creating, modifying, or deleting user-layer content.

### Out of Scope (Deferred)

- Prompt composition and mode routing - _Reason: Session 03 owns the
  prompt-loading contract that consumes this adapter._
- UI onboarding flows or forms - _Reason: Phase 03 owns the operator-facing
  onboarding and approvals UX._
- Background job persistence, tracker mutation, or artifact generation -
  _Reason: later phases own those workflow-specific write paths._

---

## 5. Technical Approach

### Architecture

Build the adapter as a small set of focused modules under
`apps/api/src/workspace/` instead of one oversized utility file. The contract
should begin with a canonical surface registry that lists known repo files and
directories, their ownership layer, whether they are required at startup, and
whether missing data should be treated as an onboarding gap, an optional
artifact absence, or a hard runtime error.

The adapter should sit on top of the repo-root helpers from Session 01 and the
existing `.jobhunt-app/` ownership helper. Reads should be deterministic and
typed by declared surface metadata. Writes should be explicit, policy-driven,
and conservative by default: app-owned state remains writable, protected or
unknown repo targets are rejected, and later workflow-specific exceptions can
be added through the same contract instead of bypassing it.

Package-local tests should exercise temp-repo fixtures rather than real user
artifacts. That keeps the trust boundary file-based, makes missing-file
behavior easy to verify, and gives Session 03 a stable adapter contract to
reuse without re-deciding path ownership.

### Design Patterns

- Registry-first surface mapping: define repo surfaces once and derive adapter
  behavior from metadata instead of duplicating path rules.
- Explicit ownership classification: distinguish `user`, `system`, and
  `app-owned` paths at the adapter boundary.
- Conservative write policy: reject writes unless a target is app-owned or
  explicitly allowed by the contract.
- Package-local validation: keep contract tests close to `apps/api` so
  workspace behavior stays inspectable and deterministic.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Node standard library for file-system and path handling
- Existing repo-root helpers in `apps/api/src/config/`
- Node built-in test runner for package-local contract validation

---

## 6. Deliverables

### Files to Create

| File                                               | Purpose                                                            | Est. Lines |
| -------------------------------------------------- | ------------------------------------------------------------------ | ---------- |
| `apps/api/src/workspace/workspace-types.ts`        | Shared surface, ownership, and result types for the adapter        | ~70        |
| `apps/api/src/workspace/workspace-contract.ts`     | Canonical registry of repo surfaces and policy metadata            | ~180       |
| `apps/api/src/workspace/workspace-errors.ts`       | Typed adapter errors for boundary and missing-file cases           | ~90        |
| `apps/api/src/workspace/workspace-boundary.ts`     | Path-layer classification and protected-target checks              | ~110       |
| `apps/api/src/workspace/missing-file-policy.ts`    | Startup versus optional missing-file evaluation helpers            | ~90        |
| `apps/api/src/workspace/workspace-read.ts`         | Deterministic file-read helpers keyed by contract metadata         | ~130       |
| `apps/api/src/workspace/workspace-write.ts`        | Guarded write helpers for app-owned and explicitly allowed targets | ~140       |
| `apps/api/src/workspace/workspace-summary.ts`      | Adapter summaries for diagnostics and preflight callers            | ~80        |
| `apps/api/src/workspace/workspace-adapter.ts`      | Public workspace adapter facade and exported API                   | ~120       |
| `apps/api/src/workspace/index.ts`                  | Package-local barrel export for workspace modules                  | ~20        |
| `apps/api/src/workspace/test-utils.ts`             | Temp-repo fixture helpers for contract tests                       | ~100       |
| `apps/api/src/workspace/workspace-adapter.test.ts` | Package-local tests for resolution, policy, and missing-file rules | ~180       |

### Files to Modify

| File                                    | Changes                                                                 | Est. Lines |
| --------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| `apps/api/package.json`                 | Add package-local contract test command(s)                              | ~10        |
| `apps/api/src/config/repo-paths.ts`     | Expose canonical directory anchors and normalized repo-relative helpers | ~60        |
| `apps/api/src/config/app-state-root.ts` | Reuse adapter ownership checks for app-owned path assertions            | ~50        |
| `apps/api/src/index.ts`                 | Surface adapter summary data in startup diagnostics                     | ~50        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] The adapter can resolve canonical repo surfaces deterministically from
      the repo root.
- [ ] The adapter classifies file targets as user-layer, system-layer, or
      app-owned with no ambiguous fallbacks.
- [ ] Required missing startup files are reported explicitly and separately
      from optional artifacts such as reports or tracker outputs.
- [ ] Invalid write attempts outside allowed ownership rules are rejected
      before any file mutation occurs.

### Testing Requirements

- [ ] Package-local tests cover root resolution, ownership classification,
      missing-file semantics, and protected-write rejection.
- [ ] `npm run check --workspace @jobhunt/api` passes after the adapter is
      introduced.
- [ ] `npm run test --workspace @jobhunt/api` passes for the compiled adapter
      contract tests.
- [ ] Manual verification confirms startup diagnostics do not create or mutate
      user-layer files.

### Non-Functional Requirements

- [ ] Adapter behavior is deterministic on a clean checkout.
- [ ] All paths are repo-root-relative and use explicit metadata rather than
      implicit process state.
- [ ] Contract helpers remain narrow enough for Session 03 to consume without
      duplicating path or ownership logic.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- The repo already has strong user/system boundary guidance in
  `docs/DATA_CONTRACT.md`, so the adapter should import or encode that policy
  once rather than hand-copying path decisions into later workflows.
- Session 01 already proved repo-root and app-state resolution. This session
  should build on those helpers instead of replacing them.
- Session 03 will load `AGENTS.md`, shared modes, profile data, and
  workflow-specific mode files through this adapter, so missing-file behavior
  must be explicit before prompt loading begins.

### Potential Challenges

- Broad repo surface area: keep the first contract focused on canonical,
  already-known paths instead of trying to model every possible future file.
- Over-permissive writes: default-deny write behavior and make exceptions
  explicit in metadata.
- Legacy path handling: preserve support for accepted legacy user files such as
  root `cv.md` without turning the adapter into an open-ended alias system.

### Relevant Considerations

- [P00] **Canonical live surface**: Anchor the adapter to `AGENTS.md`,
  `.codex/skills/`, `docs/`, `modes/`, and the current repo file contract.
- [P02] **Trust boundary is file-based**: Keep file ownership checks explicit
  and validate them with temp fixtures rather than real user data.
- [P02] **Live contract first**: Prefer checked-in data-contract rules over
  narrative summaries when classifying paths.
- [P00] **Validator-first closeout**: Add package-local contract tests as part
  of the same session that introduces the adapter.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- The adapter permits writes outside `.jobhunt-app/` or later approved targets
  because ownership checks are too loose.
- Missing-file handling hides the difference between onboarding gaps and
  expected absent artifacts.
- Callers keep bypassing the adapter because the public surface is fragmented
  or incomplete.

---

## 9. Testing Strategy

### Unit Tests

- Verify the surface registry returns stable ownership and missing-file policy
  metadata for required and optional paths.
- Verify boundary classification rejects unknown or escaping paths.
- Verify the adapter returns explicit missing-file results for onboarding
  requirements and optional artifacts.

### Integration Tests

- Verify the public adapter facade resolves repo surfaces from temp-repo
  fixtures using the same anchor logic as the live repo.
- Verify guarded writes allow app-owned state and reject protected targets
  before mutation.

### Manual Testing

- Run `npm run check --workspace @jobhunt/api`.
- Run `npm run test --workspace @jobhunt/api`.
- Run the API startup diagnostics and confirm no user-layer files are created
  or modified.

### Edge Cases

- Legacy root `cv.md` exists alongside canonical `profile/cv.md`
- Optional report or tracker artifact is absent on a clean checkout
- Caller attempts a path escape with `..` or a non-canonical relative path

---

## 10. Dependencies

### External Libraries

- Node standard library only for file-system and path handling
- Existing TypeScript toolchain already present in `apps/api`

### Other Sessions

- **Depends on**: `phase00-session01-monorepo-app-skeleton`
- **Depended by**: `phase00-session03-prompt-loading-contract`,
  `phase00-session04-boot-path-and-validation`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
