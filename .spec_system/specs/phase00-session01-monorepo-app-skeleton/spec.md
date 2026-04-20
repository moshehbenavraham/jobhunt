# Session Specification

**Session ID**: `phase00-session01-monorepo-app-skeleton`
**Phase**: 00 - Foundation and Repo Contract
**Status**: Complete
**Created**: 2026-04-21
**Package**: cross-cutting (`apps/web`, `apps/api`)
**Package Stack**: TypeScript React + TypeScript Node

---

## 1. Session Overview

This session creates the first app-owned scaffold for the local parity effort.
The repo currently has no `apps/` directory, no workspace wiring, and no
explicit `.jobhunt-app/` runtime boundary. Phase 00 cannot move into adapter,
prompt-loading, or boot-path work until those package and tooling anchors
exist.

The implementation should add the smallest useful monorepo skeleton: root
workspace wiring, baseline package manifests for `apps/web` and `apps/api`,
minimal typed entrypoints, and an explicit contract for app-owned runtime
state. The goal is not feature work. The goal is to create stable file and
tooling seams without mutating tracker, report, profile, or other user-layer
artifacts.

This session matters because every later parity session depends on explicit
package boundaries. Session 02 needs an API home for the workspace adapter,
Session 03 needs an API home for prompt loading, and Session 04 needs both
packages wired well enough to prove boot and validation behavior.

---

## 2. Objectives

1. Establish repo-root workspace tooling that can manage `apps/web` and
   `apps/api` from the existing npm-based root.
2. Create minimal TypeScript package skeletons and entrypoints for the web and
   API packages without committing to deeper runtime behavior.
3. Define `.jobhunt-app/` as the app-owned state root with explicit ignore
   rules and backend-owned path helpers.
4. Preserve the current Codex-primary scripts, data contract, and user-layer
   files while adding scaffold validation coverage.

---

## 3. Prerequisites

### Required Sessions

- None. This is the entry session for Phase 00 and unlocks Sessions 02-04.

### Required Tools/Knowledge

- `docs/DATA_CONTRACT.md` and `AGENTS.md` as the canonical repo boundary
- Existing root npm tooling in `package.json`
- Current lint and validation surfaces in `biome.json` and
  `scripts/test-all.mjs`

### Environment Requirements

- Node.js and npm installed for the current repo
- Write access to the repo root and `.spec_system/`
- Existing user-layer files left untouched during scaffold setup

---

## 4. Scope

### In Scope (MVP)

- Developer can create `apps/web` and `apps/api` package shells under one
  workspace while keeping existing repo scripts usable from the root.
- System can define `.jobhunt-app/` as the only app-owned write target in this
  session, with lazy bootstrap behavior and ignore rules.
- Developer can run minimal package-level dev, build, or check commands that
  prove the scaffold is wired without introducing workflow execution.
- Repo can add scaffold-focused validation coverage that detects accidental
  drift or user-layer mutation.

### Out of Scope (Deferred)

- Workspace adapter logic, prompt loading, or mode routing - *Reason: Sessions
  02 and 03 own those contracts.*
- SQLite schema design, background jobs, and approval flows - *Reason: Phase 01
  and later phases own operational runtime behavior.*
- Full app UI, live API endpoints, or boot diagnostics - *Reason: Session 04
  owns the minimal runnable boot path.*

---

## 5. Technical Approach

### Architecture

Use the existing root npm project as the workspace coordinator and add
monorepo-aware scripts there instead of creating a parallel bootstrap flow.
Introduce a shared TypeScript base config at the repo root, then let
`apps/web` and `apps/api` inherit from it with package-local configs and
scripts.

`apps/web` should stay intentionally small: a minimal React shell and its
tooling baseline only. `apps/api` should expose a typed bootstrap entrypoint
and path helpers for repo-root resolution plus `.jobhunt-app/` ownership. No
task in this session should write tracker rows, reports, PDFs, profile data, or
other user-layer files.

Validation should extend the existing repo gate instead of adding an isolated
test runner. The implementation should prove that the scaffold resolves from
the repo root, keeps the app-state boundary explicit, and leaves user-layer
artifacts untouched on install and basic checks.

### Design Patterns

- Root-owned workspace orchestration: keep multi-package control in the
  existing root `package.json` so repo validation stays centralized.
- Explicit path ownership: place `.jobhunt-app/` handling behind API helpers
  rather than ad hoc path strings.
- Placeholder-first scaffolding: add only enough React and API code to prove
  structure and defer runtime behavior to later sessions.
- Validator-first closeout: expand `scripts/test-all.mjs` alongside the
  scaffold so contract drift is visible immediately.

### Technology Stack

- npm workspaces at the repo root
- Shared TypeScript configuration from `tsconfig.base.json`
- React-based minimal shell in `apps/web`
- Node ESM TypeScript scaffold in `apps/api`
- Existing repo validation via `npm run doctor` and
  `node scripts/test-all.mjs --quick`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `tsconfig.base.json` | Shared TypeScript baseline for both app packages | ~25 |
| `apps/web/package.json` | Web package manifest and scripts | ~30 |
| `apps/web/tsconfig.json` | Web package TypeScript config | ~20 |
| `apps/web/vite.config.ts` | Web build and dev tooling baseline | ~20 |
| `apps/web/index.html` | Minimal web shell host document | ~20 |
| `apps/web/src/main.tsx` | React mount entrypoint | ~20 |
| `apps/web/src/App.tsx` | Placeholder shell component | ~50 |
| `apps/api/package.json` | API package manifest and scripts | ~30 |
| `apps/api/tsconfig.json` | API package TypeScript config | ~20 |
| `apps/api/src/config/repo-paths.ts` | Canonical repo-root and app path helpers | ~50 |
| `apps/api/src/config/app-state-root.ts` | App-owned state-root contract helper | ~50 |
| `apps/api/src/index.ts` | Minimal typed API scaffold entrypoint | ~40 |
| `scripts/test-app-scaffold.mjs` | Regression harness for scaffold boundary checks | ~120 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `package.json` | Add workspaces plus app-specific root scripts | ~30 |
| `package-lock.json` | Capture intentional workspace dependency changes | generated |
| `biome.json` | Extend lint coverage to the new app paths if required | ~10 |
| `.gitignore` | Ignore `.jobhunt-app/` and package build outputs | ~10 |
| `README.md` | Document scaffold commands and repo boundary expectations | ~20 |
| `scripts/test-all.mjs` | Register the scaffold regression harness in the repo gate | ~20 |

---

## 7. Success Criteria

### Functional Requirements

- [x] Root workspace tooling resolves `apps/web` and `apps/api` from the repo
      root.
- [x] `apps/web` and `apps/api` each expose a minimal entrypoint plus package
      scripts suitable for later sessions.
- [x] `.jobhunt-app/` is the only app-owned write target introduced in this
      session, and it is handled through explicit API helpers.
- [x] Existing repo scripts and user-layer artifacts remain untouched by
      scaffold bootstrap behavior.

### Testing Requirements

- [x] Scaffold regression coverage is added and passing.
- [x] `node scripts/test-all.mjs --quick` passes with scaffold checks enabled.
- [x] Manual verification confirms no user-layer files are created or modified
      by workspace install, check, or build commands.

### Non-Functional Requirements

- [x] Scaffold behavior is deterministic on a clean checkout.
- [x] All new paths are repo-root-relative and match monorepo package
      boundaries.
- [x] The session does not hide runtime behavior behind undocumented side
      effects or transitive path guesses.

### Quality Gates

- [x] All files ASCII-encoded
- [x] Unix LF line endings
- [x] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- The repo already uses npm, Biome, Prettier, and root validation scripts, so
  the scaffold should extend those surfaces instead of introducing a parallel
  toolchain.
- No `apps/` directory exists today, so the session must create the package
  structure from scratch and keep it isolated from current tracker and report
  flows.
- Session 02 depends on `apps/api`, so the API scaffold must already provide a
  stable home for path and ownership contracts.

### Potential Challenges

- Workspace drift with existing root scripts: keep new commands namespaced and
  additive rather than rewriting current jobhunt scripts.
- Premature runtime choices: keep the API entrypoint typed and minimal instead
  of locking in server or storage architecture too early.
- Dependency churn: keep the initial app dependency set narrow and update the
  lockfile intentionally.

### Relevant Considerations

- [P00] **Canonical live surface**: Keep the scaffold anchored to
  `AGENTS.md`, `.codex/skills/`, `docs/`, and the current root scripts rather
  than introducing alternative runtime metadata.
- [P02] **Trust boundary is file-based**: Treat repo access as an explicit API
  concern and avoid ad hoc file writes outside `.jobhunt-app/`.
- [P02] **Live contract first**: Use checked-in repo paths and current data
  contract rules as the authoritative input to scaffold design.
- [P00] **Validator-first closeout**: Add scaffold verification to the existing
  repo gate in the same session as the new package structure.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- Scaffold code writes into user-layer files during package bootstrap or first
  run.
- Repo-path helpers rely on process-relative guesses instead of explicit repo
  anchors.
- Placeholder entrypoints grow hidden behavior before the workspace and prompt
  contracts are defined.

---

## 9. Testing Strategy

### Unit Tests

- Verify repo-root and `.jobhunt-app/` path helpers handle missing directories
  deterministically.
- Verify scaffold boundary helpers reject user-layer write targets.

### Integration Tests

- Run root workspace commands that exercise package manifests, shared
  TypeScript config, and package-local build or check scripts.
- Add a regression harness that validates no user-layer files are created or
  modified by scaffold checks.

### Manual Testing

- Install workspace dependencies from the repo root.
- Run the web build or check command and confirm the placeholder shell renders.
- Run the API scaffold command and confirm startup diagnostics do not create
  tracker, report, or profile artifacts.

### Edge Cases

- `.jobhunt-app/` is missing on first run.
- Commands are launched from the repo root instead of from the package
  directory.
- Existing user-layer files are present but must remain untouched.

---

## 10. Dependencies

### External Libraries

- React and React DOM: minimal web shell rendering
- Vite: lightweight web package dev and build entrypoint
- TypeScript: shared compile and type-check baseline
- tsx or equivalent TypeScript runner: minimal API scaffold execution

### Other Sessions

- **Depends on**: None
- **Depended by**: `phase00-session02-workspace-adapter-contract`,
  `phase00-session03-prompt-loading-contract`,
  `phase00-session04-boot-path-and-validation`

---

## Next Steps

Run the `plansession` workflow step to begin Session 02.
