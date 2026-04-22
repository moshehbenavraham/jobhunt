# Task Checklist

**Session ID**: `phase03-session05-settings-and-maintenance-surface`
**Total Tasks**: 19
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-22

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
| Setup          | 4      | 4      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 5      | 5      | 0         |
| Testing        | 5      | 5      | 0         |
| **Total**      | **19** | **19** | **0**     |

---

## Setup (4 tasks)

Establish the read-only settings summary, updater adapter, and route contract
before wiring browser state.

### apps/api

- [x] T001 [S0305] Create the read-only settings update-check helper that
      executes `update-system.mjs check` with timeout, retry-backoff, and
      failure-path handling (`apps/api/src/server/settings-update-check.ts`)
- [x] T002 [S0305] Create the bounded settings summary helper that composes
      startup diagnostics, prompt support, tool-catalog preview, maintenance
      commands, and updater state with bounded pagination, validated filters,
      and deterministic ordering (`apps/api/src/server/settings-summary.ts`)
- [x] T003 [S0305] Create the GET-only settings route with preview-limit query
      validation, schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/settings-route.ts`)
- [x] T004 [S0305] Register the settings route in the shared route registry
      with deterministic ordering (`apps/api/src/server/routes/index.ts`)

---

## Foundation (5 tasks)

Define client-side contracts and reusable rendering primitives for the
Settings surface.

### apps/web

- [x] T005 [S0305] [P] Create typed settings payloads, update-check enums, and
      maintenance-command contracts with types matching declared contract and
      exhaustive enum handling (`apps/web/src/settings/settings-types.ts`)
- [x] T006 [S0305] [P] Create the settings client for summary fetches and
      preview-limit requests with timeout, retry-backoff, and failure-path
      handling (`apps/web/src/settings/settings-client.ts`)
- [x] T007 [S0305] Implement the settings hook for refresh, stale-summary
      fallback, and shell-summary resync callbacks with cleanup on scope exit
      for all acquired resources
      (`apps/web/src/settings/use-settings-surface.ts`)
- [x] T008 [S0305] [P] Create the settings runtime card for startup and
      operational-store readiness with explicit loading, empty, error, and
      offline states (`apps/web/src/settings/settings-runtime-card.tsx`)
- [x] T009 [S0305] [P] Create the settings workspace card for repo paths,
      writable roots, and current-session context with types matching declared
      contract and exhaustive enum handling
      (`apps/web/src/settings/settings-workspace-card.tsx`)

---

## Implementation (5 tasks)

Compose the settings UI, wire it into the shell, and keep maintenance actions
read-only.

### apps/web

- [x] T010 [S0305] [P] Create the settings auth card for auth state, next-step
      guidance, and runtime config with explicit loading, empty, error, and
      offline states (`apps/web/src/settings/settings-auth-card.tsx`)
- [x] T011 [S0305] [P] Create the settings support card for prompt workflow
      coverage and tool-catalog preview with explicit loading, empty, error,
      and offline states (`apps/web/src/settings/settings-support-card.tsx`)
- [x] T012 [S0305] [P] Create the settings maintenance card for updater states
      and terminal maintenance commands with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/settings/settings-maintenance-card.tsx`)
- [x] T013 [S0305] Implement the settings surface that composes runtime,
      workspace, auth, support, and maintenance cards with state reset or
      revalidation on re-entry
      (`apps/web/src/settings/settings-surface.tsx`)
- [x] T014 [S0305] Replace the Settings placeholder in the operator shell with
      the live settings surface and cross-surface handoff callbacks with state
      reset or revalidation on re-entry (`apps/web/src/shell/operator-shell.tsx`)

---

## Testing (5 tasks)

Verify route behavior, browser flows, and repo-level regression gates.

### apps/api

- [x] T015 [S0305] [P] Extend the HTTP server contract tests for settings
      summary, preview-limit validation, and updater states including
      `up-to-date`, `update-available`, `dismissed`, and `offline`, with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T016 [S0305] [P] Create browser smoke coverage for settings rendering,
      auth guidance, updater visibility, and maintenance command cards with
      explicit loading, empty, error, and offline states
      (`scripts/test-app-settings.mjs`)
- [x] T017 [S0305] [P] Update shell smoke coverage so the Settings surface
      loads inside the shared shell, survives refresh or re-entry, and keeps
      the shell chrome live (`scripts/test-app-shell.mjs`)
- [x] T018 [S0305] [P] Update the quick regression suite and ASCII coverage
      for the new settings files and smoke script with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T019 [S0305] Run web typecheck, web build, API runtime and tools tests,
      settings smoke, shell smoke, doctor, and quick regressions, then verify
      ASCII-only session deliverables (`apps/web/src/settings/`,
      `apps/api/src/server/`, `scripts/test-app-settings.mjs`,
      `scripts/test-app-shell.mjs`, `scripts/test-all.mjs`)

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

Run the `validate` workflow step to verify the completed session before moving
to `updateprd`.
