# Implementation Notes

**Session ID**: `phase06-session06-dashboard-replacement-maintenance-and-cutover`
**Package**: cross-cutting (`apps/web`, `apps/api`)
**Started**: 2026-04-22 21:24
**Last Updated**: 2026-04-22 22:21

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 20 / 20 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### 2026-04-22 - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T001 - Create operator-home summary scaffolding

**Started**: 2026-04-22 21:24
**Completed**: 2026-04-22 21:31
**Duration**: 7 minutes

Implemented the new backend-owned `operator-home-summary.ts` contract with
bounded card types, explicit handoff actions, and exhaustive action-surface
selectors for readiness, live work, approvals, closeout, artifacts, and
maintenance.

**Files changed**:

- `apps/api/src/server/operator-home-summary.ts`

**Behavioral quality checks**:

- [x] Failure path completeness: summary sections degrade to explicit card
      messages instead of failing silently.
- [x] Contract alignment: action IDs, surfaces, and bounded preview shapes are
      explicit in the summary payload types.

---

### Task T002 - Create operator-home route scaffolding and registry entry

**Started**: 2026-04-22 21:31
**Completed**: 2026-04-22 21:32
**Duration**: 1 minute

Added the `/operator-home` route with schema-validated preview-limit query
parameters and registered it in the API route registry.

**Files changed**:

- `apps/api/src/server/routes/operator-home-route.ts`
- `apps/api/src/server/routes/index.ts`

**Behavioral quality checks**:

- [x] Trust boundary enforcement: route input is validated with bounded integer
      coercion before summary composition runs.
- [x] Failure path completeness: invalid query payloads map to explicit bad
      request responses.

---

### Task T005 - Implement operator-home summary composition

**Started**: 2026-04-22 21:24
**Completed**: 2026-04-22 21:33
**Duration**: 9 minutes

Completed the operator-home summary composition over existing operator-shell,
pipeline, tracker, artifact, and settings summaries, including per-section
timeout, retry, backoff, and degraded-card handling. Verified the new API
surface with `npx tsc -p apps/api/tsconfig.json --noEmit`.

**Files changed**:

- `apps/api/src/server/operator-home-summary.ts`

**Behavioral quality checks**:

- [x] External dependency resilience: section loading uses bounded timeout and
      retry/backoff settings.
- [x] Failure path completeness: section load failures degrade individual cards
      while preserving a valid root payload.
- [x] Contract alignment: summary cards reuse existing bounded server summary
      contracts instead of inventing browser-owned repo parsing.

---

### Task T003 - Create operator-home payload parsers and client scaffolding

**Started**: 2026-04-22 21:33
**Completed**: 2026-04-22 21:37
**Duration**: 4 minutes

Added the web-side operator-home payload types, strict parsers, and the GET
client wrapper with timeout and retry handling. Verified the new files with
`npx tsc -p apps/web/tsconfig.json --noEmit`.

**Files changed**:

- `apps/web/src/shell/operator-home-types.ts`
- `apps/web/src/shell/operator-home-client.ts`

**Behavioral quality checks**:

- [x] Contract alignment: the browser parser enforces the server-declared card,
      action, and maintenance enums.
- [x] Failure path completeness: invalid JSON and invalid payloads map to
      explicit client errors instead of partial rendering.

---

### Task T004 - Create the cutover note scaffold and parity matrix headings

**Started**: 2026-04-22 21:37
**Completed**: 2026-04-22 21:38
**Duration**: 1 minute

Created the checked-in cutover note scaffold with the parity matrix headings,
evidence sections, and dashboard decision placeholder that Session 06 will
fill before validation.

**Files changed**:

- `docs/CUTOVER.md`

**Behavioral quality checks**:

- [x] Contract alignment: the cutover note now exists at the path named in the
      session spec and can be referenced by later doc updates.

---

### Task T008 - Implement the operator-home hook

**Started**: 2026-04-22 21:38
**Completed**: 2026-04-22 21:41
**Duration**: 3 minutes

Implemented `use-operator-home.ts` with abortable fetches, strict snapshot
restore, refresh handling, online retry, and cleanup for in-flight requests on
scope exit.

**Files changed**:

- `apps/web/src/shell/use-operator-home.ts`

**Behavioral quality checks**:

- [x] Resource cleanup: abort controllers and listeners are cleared on unmount.
- [x] State freshness on re-entry: the hook revalidates when the home surface
      becomes active again.
- [x] Failure path completeness: offline and error states preserve the last
      known good snapshot instead of blanking the surface.

---

### Task T009 - Implement shell surface registry and default landing resolution

**Started**: 2026-04-22 21:41
**Completed**: 2026-04-22 21:43
**Duration**: 2 minutes

Added `home` to the shell surface registry and updated `use-operator-shell.ts`
to default ready workspaces to the home surface while revalidating onboarding
intercepts on re-entry.

**Files changed**:

- `apps/web/src/shell/shell-types.ts`
- `apps/web/src/shell/use-operator-shell.ts`

**Behavioral quality checks**:

- [x] State freshness on re-entry: onboarding-to-home and blank-hash defaulting
      now revalidate against the latest startup status.
- [x] Failure path completeness: missing-prerequisite workspaces are routed
      back into onboarding instead of trapping on diagnostics.

---

### Task T010 - Create the operator-home surface

**Started**: 2026-04-22 21:41
**Completed**: 2026-04-22 21:44
**Duration**: 3 minutes

Built the new operator-home surface with readiness, live work, approvals,
closeout, artifacts, and maintenance cards plus explicit loading, empty,
offline, and error states.

**Files changed**:

- `apps/web/src/shell/operator-home-surface.tsx`

**Behavioral quality checks**:

- [x] Failure path completeness: every empty, offline, and error path renders a
      visible explanation instead of a blank surface.
- [x] Accessibility and platform compliance: buttons stay keyboard reachable and
      the active heading receives focus on mount.

---

### Task T011 - Integrate the operator-home surface into the shell frame

**Started**: 2026-04-22 21:43
**Completed**: 2026-04-22 21:46
**Duration**: 3 minutes

Mounted the operator-home surface into the shell, wired action handoffs into
existing surfaces, added the home item to the navigation rail, and updated the
status strip copy to treat the app-owned home as the primary landing path.

**Files changed**:

- `apps/web/src/shell/operator-shell.tsx`
- `apps/web/src/shell/navigation-rail.tsx`
- `apps/web/src/shell/status-strip.tsx`
- `apps/web/src/shell/surface-placeholder.tsx`

**Behavioral quality checks**:

- [x] Accessibility and platform compliance: navigation and action buttons keep
      existing hash, button, and heading semantics.
- [x] Contract alignment: home actions reuse the existing focus-sync helpers for
      approvals, pipeline, tracker, reports, scan, batch, chat, and workflows.

---

### Task T012 - Implement default-launch and onboarding intercept behavior

**Started**: 2026-04-22 21:41
**Completed**: 2026-04-22 21:46
**Duration**: 5 minutes

Completed the launch-path behavior so ready workspaces land on `home`, missing
prerequisites force an onboarding intercept, and repaired workspaces can return
to the app-owned daily path without staying pinned to startup diagnostics.
Verified the shell changes with `npx tsc -p apps/web/tsconfig.json --noEmit`.

**Files changed**:

- `apps/web/src/shell/use-operator-shell.ts`
- `apps/web/src/shell/operator-shell.tsx`

**Behavioral quality checks**:

- [x] State freshness on re-entry: repaired workspaces can transition from
      onboarding back to home after the next successful shell refresh.
- [x] Failure path completeness: missing-prerequisite workspaces redirect
      cleanly into onboarding instead of leaving users on startup diagnostics.

---

### Task T007 - Implement backend-owned settings and onboarding copy helpers

**Started**: 2026-04-22 21:46
**Completed**: 2026-04-22 21:48
**Duration**: 2 minutes

Aligned the backend settings and onboarding summaries so they describe the app
shell and operator home as the primary runtime while keeping maintenance and
repair actions explicit and terminal-owned where required.

**Files changed**:

- `apps/api/src/server/settings-summary.ts`
- `apps/api/src/server/onboarding-summary.ts`

**Behavioral quality checks**:

- [x] Contract alignment: settings and onboarding route copy now points to the
      app-owned landing path instead of the legacy startup or CLI flow.
- [x] Failure path completeness: missing prerequisites and repaired-state
      messages both include the correct next step.

---

### Task T013 - Polish settings maintenance and runtime cards

**Started**: 2026-04-22 21:46
**Completed**: 2026-04-22 21:48
**Duration**: 2 minutes

Updated the settings maintenance and runtime cards to make terminal-only
actions explicit, keep the dashboard secondary, and reinforce the operator home
as the default runtime entry point.

**Files changed**:

- `apps/web/src/settings/settings-maintenance-card.tsx`
- `apps/web/src/settings/settings-runtime-card.tsx`

**Behavioral quality checks**:

- [x] Accessibility and platform compliance: button labels remain explicit and
      the maintenance heading focus flow is preserved.
- [x] Contract alignment: settings copy matches the backend summary wording and
      the app-primary runtime posture.

---

### Task T014 - Polish onboarding readiness handoff copy

**Started**: 2026-04-22 21:46
**Completed**: 2026-04-22 21:48
**Duration**: 2 minutes

Changed the onboarding handoff so repaired workspaces return to the operator
home instead of pointing back at chat or startup as the default next step.

**Files changed**:

- `apps/web/src/onboarding/readiness-handoff-card.tsx`
- `apps/web/src/onboarding/onboarding-wizard-surface.tsx`
- `apps/web/src/shell/operator-shell.tsx`

**Behavioral quality checks**:

- [x] State freshness on re-entry: the handoff now targets the same `home`
      surface that `use-operator-shell` resolves for ready workspaces.
- [x] Accessibility and platform compliance: the handoff action remains a
      labelled button with the same disabled-state rules.

---

### Task T015 - Update primary operator docs and dashboard messaging

**Started**: 2026-04-22 21:48
**Completed**: 2026-04-22 21:49
**Duration**: 1 minute

Updated repo-facing docs so the app shell and operator home are the primary
boot path, with the Go dashboard and legacy Codex workflow framed as secondary
paths. Verified the app packages afterward with `npm run app:check`.

**Files changed**:

- `README.md`
- `docs/SETUP.md`
- `docs/CONTRIBUTING.md`
- `docs/README-docs.md`
- `dashboard/README-dashboard.md`

**Behavioral quality checks**:

- [x] Contract alignment: setup, contributing, docs index, and dashboard docs
      now point to the same primary runtime.
- [x] Failure path completeness: secondary paths remain documented explicitly
      instead of being implied or hidden.

---

### Task T006 - Implement operator-home route responses and API coverage

**Started**: 2026-04-22 21:50
**Completed**: 2026-04-22 21:54
**Duration**: 4 minutes

Extended the API route tests so `/operator-home` now covers bounded preview
limit forwarding, invalid-query rejection, and degraded-card payload delivery
without failing the route.

**Files changed**:

- `apps/api/src/server/routes/operator-home-route.ts`
- `apps/api/src/server/http-server.test.ts`

**Behavioral quality checks**:

- [x] Trust boundary enforcement: preview-limit query input is still bounded by
      schema validation at the route edge.
- [x] Failure path completeness: degraded-card payloads now have explicit route
      coverage instead of relying on integration assumptions.

---

### Task T017 - Extend operator-home summary and route coverage

**Started**: 2026-04-22 21:54
**Completed**: 2026-04-22 21:59
**Duration**: 5 minutes

Added dedicated operator-home summary tests for bounded artifact and closeout
previews, retry behavior, timeout degradation, and app-primary maintenance
copy. Also fixed the typed report-viewer fixture literals so the runtime test
build stayed green.

**Files changed**:

- `apps/api/src/server/operator-home-summary.test.ts`
- `apps/api/src/server/http-server.test.ts`

**Behavioral quality checks**:

- [x] External dependency resilience: retries and timeout-degradation paths now
      have explicit test coverage.
- [x] Contract alignment: the new summary tests lock the literal enum values
      used by artifacts and maintenance payloads.

---

### Task T018 - Extend shell smoke coverage for home landing and intercepts

**Started**: 2026-04-22 21:59
**Completed**: 2026-04-22 22:06
**Duration**: 7 minutes

Reworked the shell smoke harness around the new default `home` landing path.
The fake API now serves operator-home and onboarding payloads, the smoke covers
ready-home landing, `#home` onboarding interception when prerequisites are
missing, home-to-surface handoffs, and stale-snapshot behavior for both shell
and home refreshes.

**Files changed**:

- `scripts/test-app-shell.mjs`

**Behavioral quality checks**:

- [x] State freshness on re-entry: the shell smoke now exercises ready-to-home
      and missing-to-onboarding transitions through real hash navigation.
- [x] Failure path completeness: the home surface stale-snapshot behavior is
      explicitly covered after a successful load.

---

### Task T019 - Extend settings, onboarding, parity, and quick-regression coverage

**Started**: 2026-04-22 22:06
**Completed**: 2026-04-22 22:15
**Duration**: 9 minutes

Updated the remaining smoke harnesses and the quick-regression file list so
they align with the app-first shell copy and the new shared status-strip
heading. The onboarding smoke now hands repaired workspaces into home, the
auto-pipeline smoke asserts parity copy from home, and the quick gate tracks
the new operator-home files plus the checked-in cutover note.

**Files changed**:

- `scripts/test-app-settings.mjs`
- `scripts/test-app-onboarding.mjs`
- `scripts/test-app-auto-pipeline-parity.mjs`
- `scripts/test-app-chat-console.mjs`
- `scripts/test-app-approval-inbox.mjs`
- `scripts/test-all.mjs`

**Behavioral quality checks**:

- [x] Contract alignment: smoke fixtures and assertions now match the app-first
      shell language introduced by Session 06.
- [x] Failure path completeness: onboarding-to-home and auto-pipeline parity
      paths now have explicit browser coverage instead of relying on shell-only
      tests.

---

### Task T020 - Run validation and resolve final regression blockers

**Started**: 2026-04-22 22:15
**Completed**: 2026-04-22 22:21
**Duration**: 6 minutes

Ran the full Session 06 validation set and fixed the last blockers the quick
gate exposed. The runtime contract initially failed because the new summary
test fixture widened a literal `kind` field to `string`, and the quick gate
then caught stale heading expectations in the chat-console and approval-inbox
smokes plus a pre-existing root version drift. Those were resolved before the
final green run.

**Files changed**:

- `apps/api/src/server/operator-home-summary.test.ts`
- `scripts/test-app-chat-console.mjs`
- `scripts/test-app-approval-inbox.mjs`
- `package.json`

**Validation run**:

- `npm run app:api:test:runtime`
- `npm run app:check`
- `npm run app:web:build`
- `node scripts/test-app-shell.mjs`
- `node scripts/test-app-settings.mjs`
- `node scripts/test-app-onboarding.mjs`
- `node scripts/test-app-auto-pipeline-parity.mjs`
- `node scripts/test-all.mjs --quick`

**Behavioral quality checks**:

- [x] Contract alignment: the runtime build and the quick gate now both pass
      against the final operator-home contract.
- [x] Failure path completeness: the final validation covers API, shell, home,
      onboarding, settings, closeout, and quick-gate regression paths.

---

### Task T016 - Record cutover evidence and dashboard decision

**Started**: 2026-04-22 22:18
**Completed**: 2026-04-22 22:21
**Duration**: 3 minutes

Replaced the cutover scaffold with the final parity matrix, validation
evidence, and the Session 06 dashboard decision: the app shell is now the
primary runtime, while the Go dashboard remains a documented secondary
fallback until a later cleanup session removes it.

**Files changed**:

- `docs/CUTOVER.md`

**Behavioral quality checks**:

- [x] Contract alignment: the cutover note now matches the final shell, docs,
      and validation state of Session 06.
- [x] Failure path completeness: remaining gaps are recorded explicitly as
      non-blocking manual follow-up rather than hidden behind a blanket
      "complete" claim.

---
