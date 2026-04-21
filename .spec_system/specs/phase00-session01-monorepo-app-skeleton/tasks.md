# Task Checklist

**Session ID**: `phase00-session01-monorepo-app-skeleton`
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

| Category       | Total  | Done  | Remaining |
| -------------- | ------ | ----- | --------- |
| Setup          | 3      | 0     | 3         |
| Foundation     | 4      | 0     | 4         |
| Implementation | 5      | 0     | 5         |
| Testing        | 3      | 0     | 3         |
| **Total**      | **15** | **0** | **15**    |

---

## Setup (3 tasks)

Initial configuration and workspace preparation.

### repo root

- [x] T001 [S0001] Update the root workspace manifest and app-specific scripts
      (`package.json`, `biome.json`)
- [x] T002 [S0001] Create the shared TypeScript baseline for both packages
      (`tsconfig.base.json`)
- [x] T003 [S0001] Extend ignore rules for `.jobhunt-app/` and app build
      outputs (`.gitignore`)

---

## Foundation (4 tasks)

Core package structure and config baselines.

### apps/web

- [x] T004 [S0001] [P] Create the web workspace manifest with isolated
      scaffold scripts (`apps/web/package.json`)
- [x] T005 [S0001] [P] Create the web TypeScript and Vite baseline
      (`apps/web/tsconfig.json`, `apps/web/vite.config.ts`)

### apps/api

- [x] T006 [S0001] [P] Create the API workspace manifest with typed scaffold
      scripts (`apps/api/package.json`)
- [x] T007 [S0001] [P] Create the API TypeScript baseline
      (`apps/api/tsconfig.json`)

---

## Implementation (5 tasks)

Minimal app-owned scaffold code with explicit boundaries.

### apps/web

- [x] T008 [S0001] [P] Create the web host document and React mount wiring
      (`apps/web/index.html`, `apps/web/src/main.tsx`)
- [x] T009 [S0001] [P] Create the placeholder app shell with accessible status
      copy and deterministic placeholder state (`apps/web/src/App.tsx`)

### apps/api

- [x] T010 [S0001] [P] Create canonical repo-path helpers with explicit repo
      anchors and failure reporting (`apps/api/src/config/repo-paths.ts`)
- [x] T011 [S0001] Create the app-state root helper with idempotent
      `.jobhunt-app/` ownership checks and no user-layer writes
      (`apps/api/src/config/app-state-root.ts`)
- [x] T012 [S0001] Create the API scaffold entrypoint with explicit startup
      diagnostics and no implicit mutation (`apps/api/src/index.ts`)

---

## Testing (3 tasks)

Verification and repo-gate integration.

### repo root

- [x] T013 [S0001] [P] Document scaffold commands and repo-boundary guarantees
      for developers (`README.md`)
- [x] T014 [S0001] Create the scaffold regression harness covering workspace
      resolution, ignored app state, and no-op user-layer behavior
      (`scripts/test-app-scaffold.mjs`)
- [x] T015 [S0001] Register scaffold coverage in the repo gate and verify the
      command path (`scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the validate workflow step

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
