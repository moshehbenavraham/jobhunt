# Task Checklist

**Session ID**: `phase03-session01-operator-shell-and-navigation-foundation`
**Total Tasks**: 16
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
| Setup | 3 | 0 | 3 |
| Foundation | 5 | 0 | 5 |
| Implementation | 4 | 0 | 4 |
| Testing | 4 | 0 | 4 |
| **Total** | **16** | **0** | **16** |

---

## Setup (3 tasks)

Establish the typed shell contract and the bounded backend summary it will
consume before building UI chrome.

### apps/web

- [x] T001 [S0301] [P] Create typed surface ids, badge models, and shell
      summary types with types matching declared contract and exhaustive enum
      handling (`apps/web/src/shell/shell-types.ts`)
- [x] T003 [S0301] [P] Create the operator-shell client for read-only summary
      fetches with timeout, retry/backoff, and failure-path handling
      (`apps/web/src/shell/operator-shell-client.ts`)

### apps/api

- [x] T002 [S0301] Create the bounded operator-shell summary helper that
      composes startup, session, and approval signals with bounded pagination,
      validated filters, and deterministic ordering
      (`apps/api/src/server/operator-shell-summary.ts`)

---

## Foundation (5 tasks)

Add the API contract plus the reusable shell chrome needed to host later Phase
03 surfaces.

### apps/api

- [x] T004 [S0301] Create the GET-only operator-shell route with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/operator-shell-route.ts`)
- [x] T005 [S0301] Register the operator-shell route in the shared route
      registry with deterministic ordering (`apps/api/src/server/routes/index.ts`)

### apps/web

- [x] T006 [S0301] [P] Create the navigation rail for Startup, Chat,
      Onboarding, Approvals, and Settings with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/shell/navigation-rail.tsx`)
- [x] T007 [S0301] [P] Create the shared status strip for readiness and
      active-work badges with explicit loading, empty, error, and offline
      states (`apps/web/src/shell/status-strip.tsx`)
- [x] T008 [S0301] Implement the operator-shell hook that syncs URL-hash
      navigation, summary refresh, and degraded-state recovery with cleanup on
      scope exit for all acquired resources
      (`apps/web/src/shell/use-operator-shell.ts`)

---

## Implementation (4 tasks)

Compose the shell layout, embed the existing startup diagnostics surface, and
replace the bootstrap-only web entrypoint.

### apps/web

- [x] T009 [S0301] [P] Create the shared placeholder surface for not-yet-built
      Phase 03 views with state reset or revalidation on re-entry
      (`apps/web/src/shell/surface-placeholder.tsx`)
- [x] T010 [S0301] Implement the operator shell container that composes
      navigation, shared status, startup diagnostics, and placeholder surfaces
      with explicit loading, empty, error, and offline states
      (`apps/web/src/shell/operator-shell.tsx`)
- [x] T011 [S0301] Replace the bootstrap-only app entry with the operator shell
      composition and startup-surface handoff with state reset or revalidation
      on re-entry (`apps/web/src/App.tsx`)
- [x] T012 [S0301] Adapt the startup status panel for in-shell layout, compact
      status cards, and shared refresh affordances with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/boot/startup-status-panel.tsx`)

---

## Testing (4 tasks)

Add contract and browser coverage, then wire the new shell files into the
existing regression gates.

### apps/api

- [x] T013 [S0301] [P] Extend the HTTP server route tests for operator-shell
      ready, missing-prerequisite, and active-work badge states with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T014 [S0301] [P] Create browser smoke coverage for shell boot,
      navigation, and offline or runtime-error states with explicit loading,
      empty, error, and offline states (`scripts/test-app-shell.mjs`)
- [x] T015 [S0301] [P] Update the quick regression suite and ASCII coverage for
      the new shell files and smoke script with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T016 [S0301] Run web typecheck, web build, API runtime tests, shell
      smoke coverage, and quick regressions, then verify ASCII-only session
      deliverables with state reset or revalidation on re-entry
      (`apps/web/src/shell/`, `apps/api/src/server/`, `scripts/test-app-shell.mjs`,
      `scripts/test-all.mjs`)

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

Run the `implement` workflow step to begin AI-led implementation. After a
successful `plansession` run, `implement` is always the next workflow command.
