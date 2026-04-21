# Implementation Notes

**Session ID**: `phase03-session03-startup-checklist-and-onboarding-wizard`
**Package**: `apps/web`
**Started**: 2026-04-22 00:17
**Last Updated**: 2026-04-22 00:49

---

## Session Progress

| Metric | Value |
|--------|-------|
| Tasks Completed | 18 / 18 |
| Estimated Remaining | 0 hours |
| Blockers | 0 |

## Validation

- Result: PASS
- Validated: 2026-04-22
- Notes: Session artifacts, web and API checks, onboarding smoke coverage, doctor, and quick regression suite passed.

---

## Task Log

### 2026-04-22 - Session Start

**Environment verified**:
- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T001 - Create the bounded onboarding summary helper

**Started**: 2026-04-22 00:18
**Completed**: 2026-04-22 00:22
**Duration**: 4 minutes

**Notes**:
- Added a backend-owned onboarding read model that composes startup checklist
  state with preview-onboarding-repair output and deterministic target
  ordering.
- Kept repair execution route-owned by reusing the existing onboarding repair
  tools through a direct guarded mutation context instead of adding a second
  browser-side write path.

**Files Changed**:
- `apps/api/src/server/onboarding-summary.ts` - added onboarding summary and
  explicit repair helpers plus structured preview and repair payloads

**BQC Fixes**:
- Duplicate action prevention: added in-flight repair reservations keyed by
  repo root and requested targets (`apps/api/src/server/onboarding-summary.ts`)
- Contract alignment: kept checklist and repair preview data sourced from the
  existing startup diagnostics and onboarding repair tool definitions
  (`apps/api/src/server/onboarding-summary.ts`)
- Failure path completeness: surfaced structured repair conflict and tool
  failure states for the route layer to map explicitly
  (`apps/api/src/server/onboarding-summary.ts`)

**Out-of-Scope Files** (files outside declared package):
- `apps/api/src/server/onboarding-summary.ts` - the onboarding surface needs a
  thin backend read and command helper even though the session header names
  `apps/web`

---

### Task T002 - Create the GET-only onboarding summary route

**Started**: 2026-04-22 00:19
**Completed**: 2026-04-22 00:22
**Duration**: 3 minutes

**Notes**:
- Added a read-only onboarding route that validates the optional bounded
  target list before reading summary state.
- Kept the request surface narrow to the canonical onboarding repair targets
  already declared in the workspace contract.

**Files Changed**:
- `apps/api/src/server/routes/onboarding-route.ts` - added the GET onboarding
  summary route and query validation

**BQC Fixes**:
- Trust boundary enforcement: validated requested target lists before the
  summary helper reads preview state
  (`apps/api/src/server/routes/onboarding-route.ts`)

**Out-of-Scope Files** (files outside declared package):
- `apps/api/src/server/routes/onboarding-route.ts` - the web onboarding wizard
  needs a typed backend summary endpoint

---

### Task T003 - Create the POST onboarding-repair route

**Started**: 2026-04-22 00:19
**Completed**: 2026-04-22 00:22
**Duration**: 3 minutes

**Notes**:
- Added an explicit confirmation-only repair route that validates the JSON
  body and requested targets before any mutation runs.
- Mapped already-present, template-missing, and generic repair failures to
  stable JSON error codes so the browser can render them without guessing.

**Files Changed**:
- `apps/api/src/server/routes/onboarding-repair-route.ts` - added the POST
  onboarding repair route and structured error mapping

**BQC Fixes**:
- Duplicate action prevention: repair requests require explicit confirmation
  and inherit the backend in-flight reservation guard
  (`apps/api/src/server/routes/onboarding-repair-route.ts`,
  `apps/api/src/server/onboarding-summary.ts`)
- Failure path completeness: invalid JSON, invalid targets, conflicts, and
  template/config problems now return explicit JSON responses
  (`apps/api/src/server/routes/onboarding-repair-route.ts`)

**Out-of-Scope Files** (files outside declared package):
- `apps/api/src/server/routes/onboarding-repair-route.ts` - the wizard needs a
  bounded backend mutation endpoint for template-backed repairs

---

### Task T004 - Register the onboarding routes

**Started**: 2026-04-22 00:21
**Completed**: 2026-04-22 00:22
**Duration**: 1 minute

**Notes**:
- Registered the onboarding summary and repair routes in deterministic order
  alongside the existing startup, shell, and orchestration surfaces.
- Re-ran API typecheck after route registration to verify there was no route
  signature drift.

**Files Changed**:
- `apps/api/src/server/routes/index.ts` - registered onboarding summary and
  repair routes with the shared registry

**Out-of-Scope Files** (files outside declared package):
- `apps/api/src/server/routes/index.ts` - the web package depends on the API
  route registry exposing the new onboarding endpoints

---

### Task T015 - Extend the HTTP server contract tests

**Started**: 2026-04-22 00:22
**Completed**: 2026-04-22 00:24
**Duration**: 2 minutes

**Notes**:
- Added onboarding summary coverage for bounded target filters plus read-only
  startup checklist and repair preview composition.
- Added explicit repair-route coverage for success, already-present, invalid
  target, and template-missing outcomes, then verified the full runtime
  contract suite with `npm run app:api:test:runtime`.

**Files Changed**:
- `apps/api/src/server/http-server.test.ts` - added onboarding summary and
  repair route contract coverage plus fixture helpers

**BQC Fixes**:
- Trust boundary enforcement: route tests now lock query and body validation
  behavior to the declared onboarding target set
  (`apps/api/src/server/http-server.test.ts`)
- Failure path completeness: route tests now cover success, conflict, invalid
  target, and template-missing repair outcomes
  (`apps/api/src/server/http-server.test.ts`)

**Out-of-Scope Files** (files outside declared package):
- `apps/api/src/server/http-server.test.ts` - backend contract coverage is
  required before the frontend wizard can target the onboarding endpoints

---

### Task T005 - Create typed onboarding payloads and enums

**Started**: 2026-04-22 00:24
**Completed**: 2026-04-22 00:27
**Duration**: 3 minutes

**Notes**:
- Added a dedicated onboarding contract module for summary, repair, checklist,
  preview, and API error payloads.
- Included parser helpers that fail fast on unsupported repair targets,
  preview reasons, health states, and startup statuses.

**Files Changed**:
- `apps/web/src/onboarding/onboarding-types.ts` - added onboarding payload
  types, repair target enums, and parser helpers

**BQC Fixes**:
- Contract alignment: frontend onboarding state now validates the backend
  summary and repair contracts instead of assuming raw JSON shapes
  (`apps/web/src/onboarding/onboarding-types.ts`)

---

### Task T006 - Create the onboarding client

**Started**: 2026-04-22 00:27
**Completed**: 2026-04-22 00:28
**Duration**: 1 minute

**Notes**:
- Added dedicated summary and repair client calls with timeout handling,
  bounded retry-backoff, and explicit error payload parsing.
- Limited repair retries to rate-limited responses so the browser does not
  blindly replay a potentially mutating request after ambiguous failures.

**Files Changed**:
- `apps/web/src/onboarding/onboarding-client.ts` - added onboarding summary and
  repair fetch helpers plus explicit client error handling

**BQC Fixes**:
- External dependency resilience: summary requests retry with bounded backoff,
  and repair requests only retry when the server rate-limits before accepting
  work (`apps/web/src/onboarding/onboarding-client.ts`)
- Failure path completeness: invalid JSON, invalid payloads, offline, timeout,
  and route error envelopes now surface explicit client errors
  (`apps/web/src/onboarding/onboarding-client.ts`)

---

### Task T007 - Implement the onboarding wizard hook

**Started**: 2026-04-22 00:28
**Completed**: 2026-04-22 00:29
**Duration**: 1 minute

**Notes**:
- Added the stateful onboarding hook that owns summary refresh, selected
  repair targets, in-flight repair state, and post-repair revalidation.
- Reconciled selection against the current ready target list so stale targets
  do not survive after the backend summary changes.

**Files Changed**:
- `apps/web/src/onboarding/use-onboarding-wizard.ts` - added summary and repair
  orchestration, target selection, and state cleanup logic

**BQC Fixes**:
- Resource cleanup: summary and repair abort controllers are released on
  unmount and superseded requests (`apps/web/src/onboarding/use-onboarding-wizard.ts`)
- Duplicate action prevention: the hook blocks repair re-entry while a repair
  is already in flight (`apps/web/src/onboarding/use-onboarding-wizard.ts`)
- State freshness on re-entry: summary reloads on mount and target selection is
  revalidated against the latest backend-ready target list
  (`apps/web/src/onboarding/use-onboarding-wizard.ts`)

---

### Task T008 - Create onboarding checklist cards

**Started**: 2026-04-22 00:29
**Completed**: 2026-04-22 00:29
**Duration**: 1 minute

**Notes**:
- Added a checklist section that renders required files, optional starters,
  and runtime blockers from backend-owned summary data.
- Included explicit loading, empty, error, and offline fallback copy so the
  shell never leaves the user with a blank surface.

**Files Changed**:
- `apps/web/src/onboarding/onboarding-checklist.tsx` - added checklist cards
  and fallback states for the onboarding wizard

---

### Task T009 - Create the repair preview list

**Started**: 2026-04-22 00:29
**Completed**: 2026-04-22 00:30
**Duration**: 1 minute

**Notes**:
- Added a repair preview list that shows destination path, template source,
  reason badge, and selection controls for ready targets only.
- Kept reason handling exhaustive so already-present and template-missing
  states render as explicit locked rows rather than falling through silently.

**Files Changed**:
- `apps/web/src/onboarding/repair-preview-list.tsx` - added the repair preview
  list, selection controls, and reason-specific copy

**BQC Fixes**:
- Contract alignment: preview-row rendering is keyed by the backend reason enum
  and repair target enum with no implicit fallthrough
  (`apps/web/src/onboarding/repair-preview-list.tsx`)

---

### Task T010 - Create the repair confirmation panel

**Started**: 2026-04-22 00:30
**Completed**: 2026-04-22 00:31
**Duration**: 1 minute

**Notes**:
- Added explicit selection summary, select-all and clear actions, and a single
  confirmation button for template-backed repairs.
- Focus moves to the live status region when repair state changes so keyboard
  users get immediate feedback after submit, success, or failure.

**Files Changed**:
- `apps/web/src/onboarding/repair-confirmation-panel.tsx` - added the explicit
  repair confirmation controls and focus-managed live status region

**BQC Fixes**:
- Duplicate action prevention: repair submission disables while a repair is
  running (`apps/web/src/onboarding/repair-confirmation-panel.tsx`)
- Accessibility and platform compliance: the panel exposes explicit labels and
  focuses the live status region when state changes
  (`apps/web/src/onboarding/repair-confirmation-panel.tsx`)

---

### Task T011 - Create the readiness handoff card

**Started**: 2026-04-22 00:31
**Completed**: 2026-04-22 00:31
**Duration**: 1 minute

**Notes**:
- Added a handoff card that translates live missing counts into next-step
  guidance for startup review, continued onboarding, or chat handoff.
- Included explicit loading, empty, error, and offline copy so the bottom of
  the wizard remains informative even while data is unavailable.

**Files Changed**:
- `apps/web/src/onboarding/readiness-handoff-card.tsx` - added the readiness
  handoff card and next-step actions

---

### Task T012 - Implement the onboarding wizard surface

**Started**: 2026-04-22 00:31
**Completed**: 2026-04-22 00:32
**Duration**: 1 minute

**Notes**:
- Composed the onboarding checklist, repair preview, confirmation panel, and
  readiness handoff into a single operator shell surface.
- Kept the shell thin by delegating data refresh and repair orchestration to
  the onboarding hook instead of reimplementing the contract in the component.

**Files Changed**:
- `apps/web/src/onboarding/onboarding-wizard-surface.tsx` - composed the full
  onboarding surface and refresh affordances

**BQC Fixes**:
- State freshness on re-entry: the surface mounts through the wizard hook so
  each shell re-entry reloads backend state instead of reusing stale browser
  assumptions (`apps/web/src/onboarding/onboarding-wizard-surface.tsx`)

---

### Task T013 - Replace the onboarding placeholder in the shell

**Started**: 2026-04-22 00:32
**Completed**: 2026-04-22 00:32
**Duration**: 1 minute

**Notes**:
- Replaced the Session 03 placeholder branch with the live onboarding wizard.
- Hooked successful repairs into both startup and operator-shell refresh paths
  so badges, shell status, and onboarding data all revalidate from live state.

**Files Changed**:
- `apps/web/src/shell/operator-shell.tsx` - mounted the onboarding wizard and
  wired refresh plus surface-navigation callbacks

**BQC Fixes**:
- State freshness on re-entry: shell surface switching now remounts the live
  onboarding surface and refreshes shell-wide state after repairs
  (`apps/web/src/shell/operator-shell.tsx`)

---

### Task T014 - Adapt the startup diagnostics panel

**Started**: 2026-04-22 00:32
**Completed**: 2026-04-22 00:33
**Duration**: 1 minute

**Notes**:
- Added an onboarding handoff button and copy that explain how to move from
  diagnostics into the explicit repair workflow.
- Clarified that startup must be refreshed after repairs so the shell keeps the
  missing-file counts aligned with the live repo state.

**Files Changed**:
- `apps/web/src/boot/startup-status-panel.tsx` - added the onboarding handoff
  affordance and repair-refresh messaging

**BQC Fixes**:
- Accessibility and platform compliance: the new onboarding handoff action uses
  explicit button labels and remains disabled only when the panel has no
  onboarding work to hand off (`apps/web/src/boot/startup-status-panel.tsx`)

---

### Task T016 - Create browser smoke coverage for onboarding

**Started**: 2026-04-22 00:33
**Completed**: 2026-04-22 00:45
**Duration**: 12 minutes

**Notes**:
- Added a dedicated Playwright smoke script that drives the startup handoff
  into onboarding against a fake API and verifies loading, repair success,
  duplicate-submit prevention, empty, error, and offline states.
- Tightened the smoke fixture until it matched the live web payload parsers and
  the button accessibility names used by the onboarding UI.

**Files Changed**:
- `scripts/test-app-onboarding.mjs` - added onboarding browser smoke coverage
  with a fake API server and repair request assertions

**BQC Fixes**:
- Duplicate action prevention: browser smoke now asserts that a rapid double
  click still produces exactly one repair request
  (`scripts/test-app-onboarding.mjs`)
- Failure path completeness: browser smoke now covers loading, empty, error,
  and offline onboarding summary states
  (`scripts/test-app-onboarding.mjs`)

**Out-of-Scope Files** (files outside declared package):
- `scripts/test-app-onboarding.mjs` - repo-level smoke coverage belongs at the
  root test-script layer

---

### Task T017 - Update the quick regression suite and ASCII coverage

**Started**: 2026-04-22 00:45
**Completed**: 2026-04-22 00:46
**Duration**: 1 minute

**Notes**:
- Added the onboarding smoke script to the quick regression suite.
- Extended ASCII validation to cover the new onboarding API files, onboarding
  web module, and onboarding smoke script in deterministic order.

**Files Changed**:
- `scripts/test-all.mjs` - registered onboarding smoke coverage and added the
  new onboarding files to ASCII validation

**Out-of-Scope Files** (files outside declared package):
- `scripts/test-all.mjs` - repo-level regression coverage belongs to the root
  validation suite

---

### Task T018 - Run the required validation commands

**Started**: 2026-04-22 00:46
**Completed**: 2026-04-22 00:49
**Duration**: 3 minutes

**Notes**:
- Re-ran the required validation gates for this session:
  `npm run app:web:check`
  `npm run app:web:build`
  `npm run app:api:test:runtime`
  `node scripts/test-app-onboarding.mjs`
  `npm run doctor`
  `node scripts/test-all.mjs --quick`
- Verified that the quick suite's ASCII validation passed for all new backend,
  frontend, and smoke-test deliverables.

**Files Changed**:
- `apps/web/src/onboarding/` - validated by typecheck, build, and quick suite
- `apps/web/src/boot/startup-status-panel.tsx` - validated by build and quick suite
- `apps/web/src/shell/operator-shell.tsx` - validated by build and quick suite
- `apps/api/src/server/` - validated by API runtime tests and quick suite
- `scripts/test-app-onboarding.mjs` - validated directly and by quick suite
- `scripts/test-all.mjs` - validated by syntax check and quick suite

---
