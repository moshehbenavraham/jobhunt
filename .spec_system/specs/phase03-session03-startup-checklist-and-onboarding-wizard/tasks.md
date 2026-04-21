# Task Checklist

**Session ID**: `phase03-session03-startup-checklist-and-onboarding-wizard`
**Total Tasks**: 18
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

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 4 | 0 | 4 |
| Foundation | 5 | 0 | 5 |
| Implementation | 5 | 0 | 5 |
| Testing | 4 | 0 | 4 |
| **Total** | **18** | **0** | **18** |

---

## Setup (4 tasks)

Establish the bounded onboarding read model and explicit repair command before
building browser state.

### apps/api

- [x] T001 [S0303] Create the bounded onboarding summary helper that composes
      startup diagnostics and repair-preview state with bounded target lists
      and deterministic ordering (`apps/api/src/server/onboarding-summary.ts`)
- [x] T002 [S0303] Create the GET-only onboarding summary route with
      schema-validated input and explicit error mapping
      (`apps/api/src/server/routes/onboarding-route.ts`)
- [x] T003 [S0303] Create the POST onboarding-repair route for explicit
      template-backed repairs with idempotency protection, transaction
      boundaries, and compensation on failure
      (`apps/api/src/server/routes/onboarding-repair-route.ts`)
- [x] T004 [S0303] Register the onboarding summary and repair routes in the
      shared route registry with deterministic ordering
      (`apps/api/src/server/routes/index.ts`)

---

## Foundation (5 tasks)

Define client-side contracts and reusable rendering primitives for the
Onboarding surface.

### apps/web

- [x] T005 [S0303] [P] Create typed onboarding payloads, repair target enums,
      and view-state contracts with types matching declared contract and
      exhaustive enum handling (`apps/web/src/onboarding/onboarding-types.ts`)
- [x] T006 [S0303] [P] Create the onboarding client for summary fetches and
      explicit repair requests with timeout, retry-backoff, and failure-path
      handling (`apps/web/src/onboarding/onboarding-client.ts`)
- [x] T007 [S0303] Implement the onboarding wizard hook for refresh, target
      selection, and in-flight repair locking with cleanup on scope exit for
      all acquired resources
      (`apps/web/src/onboarding/use-onboarding-wizard.ts`)
- [x] T008 [S0303] [P] Create onboarding checklist cards for required,
      optional, and runtime blockers with explicit loading, empty, error, and
      offline states (`apps/web/src/onboarding/onboarding-checklist.tsx`)
- [x] T009 [S0303] [P] Create the repair preview list with canonical path,
      template source, and ready or already-present or template-missing states
      with types matching declared contract and exhaustive enum handling
      (`apps/web/src/onboarding/repair-preview-list.tsx`)

---

## Implementation (5 tasks)

Compose the wizard UI, wire it into the shell, and add startup-to-onboarding
handoff behavior.

### apps/web

- [x] T010 [S0303] [P] Create the repair confirmation panel for explicit
      target selection and repair submission with duplicate-trigger prevention
      while in-flight and platform-appropriate accessibility labels, focus
      management, and input support
      (`apps/web/src/onboarding/repair-confirmation-panel.tsx`)
- [x] T011 [S0303] [P] Create the readiness handoff card for post-repair next
      steps with explicit loading, empty, error, and offline states
      (`apps/web/src/onboarding/readiness-handoff-card.tsx`)
- [x] T012 [S0303] Implement the onboarding wizard surface that composes
      checklist, repair preview, confirmation controls, and readiness handoff
      with state reset or revalidation on re-entry
      (`apps/web/src/onboarding/onboarding-wizard-surface.tsx`)
- [x] T013 [S0303] Replace the Onboarding placeholder in the operator shell
      with the live onboarding wizard surface with state reset or revalidation
      on re-entry (`apps/web/src/shell/operator-shell.tsx`)
- [x] T014 [S0303] Adapt the startup diagnostics panel with an Open onboarding
      handoff and repair-refresh status copy with platform-appropriate
      accessibility labels, focus management, and input support
      (`apps/web/src/boot/startup-status-panel.tsx`)

---

## Testing (4 tasks)

Verify route behavior, browser flows, and repo-level setup regression gates.

### apps/api

- [x] T015 [S0303] [P] Extend the HTTP server contract tests for onboarding
      summary and repair flows, including already-present, invalid-target, and
      template-missing cases, with schema-validated input and explicit error
      mapping (`apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T016 [S0303] [P] Create browser smoke coverage for guided checklist,
      repair preview selection, repair success, and duplicate-submit behavior
      with explicit loading, empty, error, and offline states
      (`scripts/test-app-onboarding.mjs`)
- [x] T017 [S0303] [P] Update the quick regression suite and ASCII coverage
      for the new onboarding files and smoke script with deterministic
      ordering (`scripts/test-all.mjs`)
- [x] T018 [S0303] Run web typecheck, web build, API runtime tests, onboarding
      smoke coverage, doctor, and quick regressions, then verify ASCII-only
      session deliverables with duplicate-trigger prevention while in-flight
      (`apps/web/src/onboarding/`, `apps/web/src/boot/`,
      `apps/api/src/server/`, `scripts/test-app-onboarding.mjs`,
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
