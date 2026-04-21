# Task Checklist

**Session ID**: `phase00-session04-boot-path-and-validation`
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

Initial boot-path configuration and workspace preparation.

### repo root

- [x] T001 [S0004] Update root workspace scripts for coordinated app boot and
      validation commands (`package.json`)

### apps/api

- [x] T002 [S0004] Update the API workspace manifest with explicit server and
      boot-contract validation commands (`apps/api/package.json`)

### apps/web

- [x] T003 [S0004] Update local API-origin or proxy handling for deterministic
      cross-package boot requests (`apps/web/vite.config.ts`)

---

## Foundation (4 tasks)

Core boot-surface contracts for the API and web packages.

### apps/api

- [x] T004 [S0004] [P] Create startup-status serializers around the existing
      diagnostics contract with explicit error mapping and read-first payload
      shaping (`apps/api/src/server/startup-status.ts`)
- [x] T005 [S0004] [P] Create the minimal HTTP server for `/health` and
      `/startup` with bounded request handling and explicit failure responses
      (`apps/api/src/server/http-server.ts`)
- [x] T006 [S0004] Create server exports and entry wiring so one-shot CLI
      diagnostics stay separate from long-lived boot serving
      (`apps/api/src/server/index.ts`, `apps/api/src/index.ts`)

### apps/web

- [x] T007 [S0004] [P] Create shared startup payload types and a fetch client
      with timeout handling and deterministic status normalization
      (`apps/web/src/boot/startup-types.ts`,
      `apps/web/src/boot/startup-client.ts`)

---

## Implementation (5 tasks)

User-visible bootstrap behavior across the web shell and API diagnostics.

### apps/web

- [x] T008 [S0004] Create the boot-state hook with explicit loading, ready,
      error, and offline states plus state reset on re-entry
      (`apps/web/src/boot/use-startup-diagnostics.ts`)
- [x] T009 [S0004] [P] Create the missing-files list component with accessible
      labels and deterministic ordering for onboarding-blocking prerequisites
      (`apps/web/src/boot/missing-files-list.tsx`)
- [x] T010 [S0004] [P] Create the startup-status panel for health, repo
      resolution, prompt summary, and diagnostic sections with keyboard-safe
      refresh behavior (`apps/web/src/boot/startup-status-panel.tsx`)
- [x] T011 [S0004] Update the web shell to render actionable bootstrap states
      instead of the static scaffold copy with explicit loading, empty, error,
      and offline states (`apps/web/src/App.tsx`)

### apps/api

- [x] T012 [S0004] Update startup diagnostics to expose the boot payload shape
      and keep all repo checks read-first with no user-layer mutation
      (`apps/api/src/index.ts`)

---

## Testing (3 tasks)

Deterministic cross-package verification and repo-gate integration.

### apps/api

- [x] T013 [S0004] [P] Create API server coverage for health and startup
      routes, repo-resolution failures, and no-mutation guarantees
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T014 [S0004] [P] Create the repo boot smoke harness that launches the
      built API server, checks HTTP diagnostics, and verifies the web package
      still builds against the live contract (`scripts/test-app-bootstrap.mjs`)
- [x] T015 [S0004] Register the boot smoke harness in the repo quick suite and
      run cross-package checks plus ASCII validation on all new bootstrap
      files (`scripts/test-all.mjs`, `package.json`)

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
