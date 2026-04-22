# Task Checklist

**Session ID**: `phase04-session05-tracker-workspace-and-integrity-actions`
**Total Tasks**: 19
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-22

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other `[P]` tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 6      | 6      | 0         |
| Testing        | 5      | 5      | 0         |
| **Total**      | **19** | **19** | **0**     |

---

## Setup (3 tasks)

Define the tracker-workspace contract and browser-facing parsing boundary
before wiring the new shell surface.

### apps/api

- [x] T001 [S0405] [P] Create typed tracker-workspace payloads, filters,
      canonical-status options, warnings, and action-result shapes with types
      matching declared contract and exhaustive enum handling
      (`apps/api/src/server/tracker-workspace-contract.ts`)

### apps/web

- [x] T002 [S0405] [P] Create browser tracker-workspace payload types and
      parser helpers with types matching declared contract and exhaustive enum
      handling (`apps/web/src/tracker/tracker-workspace-types.ts`)
- [x] T003 [S0405] Create the tracker-workspace client and URL-backed focus or
      action helpers with timeout, retry-backoff, and failure-path handling
      (`apps/web/src/tracker/tracker-workspace-client.ts`)

---

## Foundation (5 tasks)

Build the bounded tracker summary model and attach it to a real shell surface.

### apps/api

- [x] T004 [S0405] Create tracker table parsing and line-preserving
      status-update helpers with exhaustive header validation and deterministic
      row mapping (`apps/api/src/server/tracker-table.ts`)
- [x] T005 [S0405] Create tracker-workspace summary scaffolding for bounded
      row previews, pending TSV summary, selected detail, and warning seeds
      with bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/tracker-workspace-summary.ts`)
- [x] T006 [S0405] Create the GET-only tracker-workspace route and register it
      in the shared route registry with schema-validated input and explicit
      error mapping (`apps/api/src/server/routes/tracker-workspace-route.ts`,
      `apps/api/src/server/routes/index.ts`)

### apps/web

- [x] T007 [S0405] [P] Create the tracker-workspace hook for selected-row
      refresh, mutation notices, and request cleanup on scope exit for all
      acquired resources (`apps/web/src/tracker/use-tracker-workspace.ts`)
- [x] T008 [S0405] [P] Register the tracker shell surface, placeholder
      exhaustiveness, and navigation affordance with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/surface-placeholder.tsx`)

---

## Implementation (6 tasks)

Keep tracker review and integrity actions backend-owned, deterministic, and
aligned with the canonical repo contracts.

### apps/api

- [x] T009 [S0405] Implement tracker row parsing, report or PDF enrichment,
      canonical status option loading, and stale-selection fallbacks with
      bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/server/tracker-workspace-summary.ts`,
      `apps/api/src/server/tracker-table.ts`)
- [x] T010 [S0405] Extend tracker integrity tools with canonical row-status
      update mutation, conflict detection, and line-preserving writes with
      idempotency protection, transaction boundaries, and compensation on
      failure (`apps/api/src/tools/tracker-integrity-tools.ts`)
- [x] T011 [S0405] Create the tracker-workspace action route for status
      updates plus merge, verify, normalize, and dedup commands with
      duplicate-trigger prevention while in-flight and explicit warning mapping
      (`apps/api/src/server/routes/tracker-workspace-action-route.ts`,
      `apps/api/src/tools/tracker-integrity-tools.ts`)

### apps/web

- [x] T012 [S0405] [P] Create the tracker-workspace surface for bounded list or
      detail review, pending TSV context, action notices, and explicit
      loading, empty, error, and offline states
      (`apps/web/src/tracker/tracker-workspace-surface.tsx`)
- [x] T013 [S0405] Wire the tracker workspace into the existing shell frame
      and shared report handoff behavior with state reset or revalidation on
      re-entry (`apps/web/src/shell/operator-shell.tsx`,
      `apps/web/src/tracker/tracker-workspace-client.ts`)
- [x] T014 [S0405] Implement status controls, maintenance actions, and refresh
      reconciliation with duplicate-trigger prevention while in-flight plus
      state reset or revalidation on re-entry
      (`apps/web/src/tracker/use-tracker-workspace.ts`,
      `apps/web/src/tracker/tracker-workspace-surface.tsx`)

---

## Testing (5 tasks)

Verify the tracker summary contract, status mutation behavior, and repo-level
regression gates.

### apps/api

- [x] T015 [S0405] [P] Extend tracker integrity tool coverage for canonical
      status update, row-conflict handling, and maintenance warning pass-through
      with schema-validated input and explicit error mapping
      (`apps/api/src/tools/tracker-integrity-tools.test.ts`)
- [x] T016 [S0405] [P] Extend HTTP runtime-contract coverage for missing
      tracker data, parsed rows, invalid query or action rejection, canonical
      status enforcement, and maintenance warning outcomes with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T017 [S0405] [P] Add browser smoke coverage for tracker navigation, row
      selection, status updates, maintenance actions, and report link-out with
      explicit loading, empty, error, and offline states
      (`scripts/test-app-tracker-workspace.mjs`,
      `scripts/test-app-shell.mjs`)
- [x] T018 [S0405] [P] Update the quick regression suite and ASCII coverage for
      tracker-workspace files and smoke scripts with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T019 [S0405] Run API and web checks or builds, tracker-workspace smoke
      coverage, and quick regressions, then verify ASCII-only session
      deliverables (`apps/api/src/server/tracker-workspace-contract.ts`,
      `apps/api/src/server/tracker-workspace-summary.ts`,
      `apps/api/src/server/routes/tracker-workspace-route.ts`,
      `apps/api/src/server/routes/tracker-workspace-action-route.ts`,
      `apps/web/src/tracker/`, `scripts/test-app-tracker-workspace.mjs`,
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

Run the `validate` workflow step next.
