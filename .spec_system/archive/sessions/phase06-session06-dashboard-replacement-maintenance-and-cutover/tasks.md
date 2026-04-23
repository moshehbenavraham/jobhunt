# Task Checklist

**Session ID**: `phase06-session06-dashboard-replacement-maintenance-and-cutover`
**Total Tasks**: 20
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
| Setup          | 4      | 4      | 0         |
| Foundation     | 5      | 5      | 0         |
| Implementation | 7      | 7      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **20** | **20** | **0**     |

---

## Setup (4 tasks)

Lock the new operator-home surface, route, and cutover note scaffolding before
the session changes default shell behavior.

### apps/api

- [x] T001 [S0606] [P] Create operator-home summary scaffolding, bounded card
      types, and next-action selectors with types matching declared contract
      and exhaustive enum handling
      (`apps/api/src/server/operator-home-summary.ts`)
- [x] T002 [S0606] [P] Create operator-home route scaffolding and registry
      entry with schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/operator-home-route.ts`,
      `apps/api/src/server/routes/index.ts`)

### apps/web

- [x] T003 [S0606] [P] Create operator-home payload parsers and client
      scaffolding with types matching declared contract and exhaustive enum
      handling (`apps/web/src/shell/operator-home-types.ts`,
      `apps/web/src/shell/operator-home-client.ts`)

### docs

- [x] T004 [S0606] [P] Create the cutover note scaffold and parity matrix
      headings (`docs/CUTOVER.md`)

---

## Foundation (5 tasks)

Build the backend summary composition, shell landing rules, and copy ownership
the final closeout path depends on.

### apps/api

- [x] T005 [S0606] Implement operator-home summary composition for readiness,
      live work, approvals, closeout, artifacts, and maintenance state with
      timeout, retry/backoff, and failure-path handling
      (`apps/api/src/server/operator-home-summary.ts`)
- [x] T006 [S0606] Implement operator-home route responses and API coverage
      for ready, degraded, and invalid-query states with schema-validated
      input and explicit error mapping
      (`apps/api/src/server/routes/operator-home-route.ts`,
      `apps/api/src/server/http-server.test.ts`)
- [x] T007 [S0606] Implement backend-owned settings and onboarding copy
      helpers so app-primary guidance stays consistent with terminal-only
      actions (`apps/api/src/server/settings-summary.ts`,
      `apps/api/src/server/onboarding-summary.ts`)

### apps/web

- [x] T008 [S0606] Implement the operator-home hook for abortable fetch,
      offline snapshot reuse, and refresh lifecycle with cleanup on scope exit
      for all acquired resources (`apps/web/src/shell/use-operator-home.ts`)
- [x] T009 [S0606] Implement shell surface registry and default landing
      resolution for the home surface with state reset or revalidation on
      re-entry (`apps/web/src/shell/shell-types.ts`,
      `apps/web/src/shell/use-operator-shell.ts`)

---

## Implementation (7 tasks)

Render the dashboard-equivalent landing surface, wire explicit handoffs, and
finish the cutover-facing copy and docs.

### apps/web

- [x] T010 [S0606] [P] Create the operator-home surface for readiness, active
      work, approvals, closeout, artifacts, and maintenance cards with
      explicit loading, empty, error, and offline states
      (`apps/web/src/shell/operator-home-surface.tsx`)
- [x] T011 [S0606] Integrate the operator-home surface into the shell frame,
      navigation rail, and status strip with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/shell/operator-shell.tsx`,
      `apps/web/src/shell/navigation-rail.tsx`,
      `apps/web/src/shell/status-strip.tsx`)
- [x] T012 [S0606] Implement default-launch and onboarding intercept behavior
      so missing prerequisites redirect cleanly without trapping ready users
      on diagnostics with state reset or revalidation on re-entry
      (`apps/web/src/shell/use-operator-shell.ts`,
      `apps/web/src/shell/operator-shell.tsx`)
- [x] T013 [S0606] Polish settings maintenance and runtime cards so updater
      guidance, dashboard status, and terminal actions stay explicit without
      treating Codex as the primary entry point with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/settings/settings-maintenance-card.tsx`,
      `apps/web/src/settings/settings-runtime-card.tsx`)
- [x] T014 [S0606] Polish onboarding readiness handoff copy so repaired
      workspaces route back into the app-owned daily path with state reset or
      revalidation on re-entry
      (`apps/web/src/onboarding/readiness-handoff-card.tsx`)

### docs

- [x] T015 [S0606] Update primary operator docs and dashboard messaging to
      make the app boot path primary and the Go dashboard or Codex workflow
      secondary (`README.md`, `docs/SETUP.md`, `docs/CONTRIBUTING.md`,
      `docs/README-docs.md`, `dashboard/README-dashboard.md`)
- [x] T016 [S0606] Record parity evidence, remaining gaps, and the dashboard
      cutover decision in the checked-in cutover note (`docs/CUTOVER.md`)

---

## Testing (4 tasks)

Lock the final landing path with route tests, smoke coverage, and the repo
quick-regression gate.

### apps/api

- [x] T017 [S0606] [P] Extend operator-home summary and route coverage for
      preview limits, degraded states, and app-primary copy with timeout,
      retry/backoff, and failure-path handling
      (`apps/api/src/server/operator-home-summary.test.ts`,
      `apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T018 [S0606] [P] Extend shell smoke coverage for home landing,
      onboarding intercept, and cross-surface handoffs with explicit loading,
      empty, error, and offline states (`scripts/test-app-shell.mjs`)
- [x] T019 [S0606] [P] Extend settings, onboarding, auto-pipeline, and quick-
      regression coverage for app-primary messaging and cutover docs with
      deterministic ordering (`scripts/test-app-settings.mjs`,
      `scripts/test-app-onboarding.mjs`,
      `scripts/test-app-auto-pipeline-parity.mjs`,
      `scripts/test-all.mjs`)
- [x] T020 [S0606] Run app checks, web build, API runtime tests, shell,
      settings, onboarding, and auto-pipeline smoke, and the repo quick
      regression gate (`apps/api/src/server/operator-home-summary.ts`,
      `apps/web/src/shell/operator-home-surface.tsx`,
      `scripts/test-app-shell.mjs`, `scripts/test-app-settings.mjs`,
      `scripts/test-app-onboarding.mjs`,
      `scripts/test-app-auto-pipeline-parity.mjs`, `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] `implementation-notes.md` updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `validate` workflow step.
