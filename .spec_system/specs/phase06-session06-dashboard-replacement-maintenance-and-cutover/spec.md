# Session Specification

**Session ID**: `phase06-session06-dashboard-replacement-maintenance-and-cutover`
**Phase**: 06 - Specialist Workflows, Dashboard Replacement, and Cutover
**Status**: Complete
**Created**: 2026-04-22
**Package**: cross-cutting (`apps/web`, `apps/api`)
**Package Stack**: TypeScript React + TypeScript Node

---

## 1. Session Overview

Phase 06 Sessions 01-05 moved the remaining specialist workflows into typed
backend contracts and browser review surfaces, but the app still lacks one
clear dashboard-equivalent daily landing path that can replace the Go TUI and
the legacy CLI-first operator habit. The shell exposes status chrome, startup,
settings, and all major workspaces, yet it does not currently provide one
bounded home surface that tells the operator what needs attention next and
where to go from there.

This session closes that gap by adding a backend-owned operator-home summary
and a shell-owned home surface that composes readiness, live work, approvals,
queue closeout, artifacts, and maintenance status into one app-first landing
experience. The browser should stay thin and read-only, while `apps/api`
continues to own repo inspection, bounded summary composition, and handoff
targets.

The same session also finalizes the cutover messaging around settings,
onboarding, and repo docs. The app should become the documented primary local
runtime, while dashboard and terminal workflows remain explicit secondary
paths. The session ends with regression coverage and a checked-in cutover note
that records parity evidence, remaining gaps, and the dashboard decision.

---

## 2. Objectives

1. Add a bounded operator-home API summary and shell surface that cover the
   normal daily operator path without direct repo parsing from the browser.
2. Make the app-owned shell the default landing path while preserving
   onboarding intercept behavior when required files are missing.
3. Finalize settings, update-check, onboarding, and repo-level docs so they
   treat the app as the primary runtime and terminal actions as explicit
   secondary steps.
4. Capture cutover evidence and extend regression coverage for the final
   parity gate before Phase 06 leaves the session loop.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session03-startup-checklist-and-onboarding-wizard` - provides
      the onboarding wizard, repair flow, and readiness handoff seams.
- [x] `phase03-session05-settings-and-maintenance-surface` - provides the
      settings surface, updater visibility, and maintenance command framing.
- [x] `phase04-session03-report-viewer-and-artifact-browser` - provides the
      bounded artifact review surface and report or PDF handoffs.
- [x] `phase04-session04-pipeline-review-workspace` - provides queue review
      summaries and report handoffs for operator closeout work.
- [x] `phase04-session05-tracker-workspace-and-integrity-actions` - provides
      tracker closeout summaries, TSV visibility, and integrity actions.
- [x] `phase05-session02-scan-review-workspace` - provides the scan review
      surface and shortlist handoff patterns used by the daily path.
- [x] `phase05-session04-batch-jobs-workspace-and-run-detail` - provides the
      batch supervision surface and failure or resume patterns.
- [x] `phase05-session06-application-help-review-and-approvals` - provides
      approval-aware bounded review patterns and explicit manual-send
      boundaries.
- [x] `phase06-session05-specialist-review-surfaces` - provides the final
      specialist workspace review surfaces that Session 06 must summarize and
      hand off to.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for bounded browser behavior, path ownership,
  docs alignment, and validation expectations.
- `.spec_system/CONSIDERATIONS.md` for bounded payload growth, thin-browser
  surfaces, URL-backed focus sync, smoke suite upkeep, and canonical handoff
  routing.
- `.spec_system/SECURITY-COMPLIANCE.md` for the clean security posture and the
  requirement that repo reads, approvals, and mutations stay backend-owned.
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/archive/phases/phase_06/PRD_phase_06.md` for dashboard replacement,
  onboarding intercept, and app-primary cutover expectations.
- `apps/api/src/server/*summary.ts` and `apps/web/src/*/*surface.tsx` for the
  established bounded-summary plus thin-surface pattern.
- `scripts/test-app-shell.mjs`, `scripts/test-app-settings.mjs`,
  `scripts/test-app-onboarding.mjs`,
  `scripts/test-app-auto-pipeline-parity.mjs`, and `scripts/test-all.mjs` for
  final regression coverage.

### Environment Requirements

- Workspace dependencies installed from the repo root.
- `npm run app:check` available from the repo root.
- `npm run app:web:build` available from the repo root.
- `npm run app:api:test:runtime` available from the repo root.
- Playwright Chromium available for the app smoke harnesses.
- Existing shell, settings, onboarding, pipeline, tracker, artifact, and
  specialist surfaces available for summary composition and handoff testing.

---

## 4. Scope

### In Scope (MVP)

- Add one backend-owned operator-home summary that composes bounded readiness,
  active-work, approval, closeout, artifact, and maintenance signals for the
  daily operator path.
- Add one shell-owned operator-home surface and make it the default landing
  path for ready workspaces, while preserving onboarding intercept behavior
  when prerequisites are missing.
- Keep all navigation and next actions explicit through existing app surfaces
  such as approvals, chat, workflows, pipeline, tracker, reports, settings,
  and onboarding.
- Finalize settings, updater, onboarding, and shell copy so the app is the
  primary documented runtime and terminal actions remain explicit, not hidden
  behind browser-owned mutations.
- Update repo-facing docs and add a checked-in cutover note that records
  parity evidence, remaining gaps, and the Go dashboard decision.
- Extend API tests, smoke coverage, and the repo quick-regression gate for the
  final closeout path.

### Out of Scope (Deferred)

- New specialist workflow modes, tool contracts, or prompt-routing changes -
  _Reason: Session 06 should consume the workflow set completed in Sessions
  01-05, not reopen product scope._
- Rewriting or deleting the Go dashboard implementation itself - _Reason: this
  session decides the cutover posture; removal can happen later if the
  documented decision warrants it._
- Desktop packaging, Electron shell work, or non-local deployment changes -
  _Reason: these are outside the PRD's parity goal for the current phase._
- Unbounded dashboard analytics, historical trend views, or new repo data
  stores - _Reason: the operator-home summary must stay bounded and local-first._

---

## 5. Technical Approach

### Architecture

Add a new backend summary module in `apps/api` that assembles the operator-home
view from already-owned runtime and repo contracts. It should compose a small
set of bounded cards or sections such as readiness, live work, approvals,
queue closeout, artifacts, and maintenance or update state. The summary should
reuse existing services and summaries where practical, cap preview counts, and
avoid re-exposing raw files or large payloads.

Expose the summary through a dedicated HTTP route in the existing API route
registry. The route should validate bounded query parameters, return the same
startup-derived status model the shell already understands, and fail with
explicit structured errors on drift or invalid input.

Add a new operator-home surface inside the shell layer in `apps/web/src/shell`
using the package's existing client, types, and hook pattern. The surface
should parse the payload strictly, preserve last-known-good data for offline
fallback, and provide explicit handoff controls into existing surfaces rather
than duplicating business logic. Update shell surface resolution so ready
workspaces land on the home surface, while missing prerequisites still steer
the operator into onboarding without hiding the reason.

Finally, tighten copy in the backend summary layer, the shell, the settings
cards, the onboarding handoff, and repo docs so the app is the primary local
runtime. Terminal commands remain visible for auth, updates, backup, doctor,
and rollback, but browser actions stay read-only and explicit. Capture the
result in a checked-in cutover note that can be referenced after Phase 06.

### Design Patterns

- Bounded composed summary: aggregate only the counts, previews, and actions
  needed for the daily operator path.
- Thin browser surface: keep repo reads, summary derivation, and sensitive
  actions in `apps/api`, not in React state.
- Default-home plus guarded intercept: route ready users to the app-owned
  landing path while redirecting missing-prerequisite workspaces to onboarding.
- Explicit handoff routing: reuse existing shell focus helpers and dedicated
  review surfaces rather than creating hidden navigation state.
- Docs as runtime contract: keep README, setup, contributing, and dashboard
  docs aligned on one primary operator path.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- TypeScript Node runtime in `apps/api`
- Existing server summary and route patterns in `apps/api/src/server`
- Existing shell surface, client, and hook patterns in `apps/web/src/shell`
- Existing Playwright-based smoke harnesses in `scripts/`
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                | Purpose                                                                                    | Est. Lines |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| `apps/api/src/server/operator-home-summary.ts`      | Compose the bounded operator-home summary for the daily shell landing path                 | ~320       |
| `apps/api/src/server/operator-home-summary.test.ts` | Lock summary composition, preview limits, and degraded-state behavior                      | ~220       |
| `apps/api/src/server/routes/operator-home-route.ts` | Expose the operator-home summary through a validated HTTP route                            | ~90        |
| `apps/web/src/shell/operator-home-types.ts`         | Strict payload parsers and handoff helpers for the operator-home surface                   | ~220       |
| `apps/web/src/shell/operator-home-client.ts`        | Focus-aware GET client for the operator-home route                                         | ~180       |
| `apps/web/src/shell/use-operator-home.ts`           | Abortable fetch and offline-snapshot hook for the operator-home surface                    | ~220       |
| `apps/web/src/shell/operator-home-surface.tsx`      | Dashboard-equivalent shell surface for readiness, work queues, artifacts, and next actions | ~320       |
| `docs/CUTOVER.md`                                   | Checked-in parity matrix and cutover decision note for the app vs dashboard path           | ~140       |

### Files to Modify

| File                                                  | Changes                                                                    | Est. Lines |
| ----------------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/routes/index.ts`                 | Register the new operator-home route in the API registry                   | ~20        |
| `apps/api/src/server/http-server.test.ts`             | Add end-to-end route coverage for operator-home plus copy-state assertions | ~240       |
| `apps/api/src/server/settings-summary.ts`             | Align settings maintenance guidance and app-primary runtime messaging      | ~70        |
| `apps/api/src/server/onboarding-summary.ts`           | Align onboarding handoff copy with the app-owned daily path                | ~60        |
| `apps/web/src/shell/shell-types.ts`                   | Add the home surface definition and default landing resolution             | ~70        |
| `apps/web/src/shell/use-operator-shell.ts`            | Update default surface and onboarding intercept behavior                   | ~80        |
| `apps/web/src/shell/navigation-rail.tsx`              | Add home navigation and badge treatment for the new landing surface        | ~90        |
| `apps/web/src/shell/status-strip.tsx`                 | Add home-oriented callouts and cutover-friendly operator copy              | ~100       |
| `apps/web/src/shell/operator-shell.tsx`               | Mount the operator-home surface and wire explicit handoffs                 | ~120       |
| `apps/web/src/settings/settings-maintenance-card.tsx` | Refine updater and terminal-action copy for app-primary guidance           | ~60        |
| `apps/web/src/settings/settings-runtime-card.tsx`     | Refine runtime-closeout guidance and dashboard status messaging            | ~60        |
| `apps/web/src/onboarding/readiness-handoff-card.tsx`  | Route repaired workspaces back into the app-owned daily path               | ~70        |
| `README.md`                                           | Promote the app as the default local runtime and adjust dashboard wording  | ~60        |
| `docs/SETUP.md`                                       | Update setup guidance to make the app boot path primary                    | ~50        |
| `docs/CONTRIBUTING.md`                                | Align contributor workflow language with the app-primary runtime           | ~30        |
| `docs/README-docs.md`                                 | Link the cutover note from the docs index                                  | ~20        |
| `dashboard/README-dashboard.md`                       | Clarify the dashboard's post-cutover role                                  | ~20        |
| `scripts/test-app-shell.mjs`                          | Add smoke coverage for home landing, intercept, and handoff flows          | ~220       |
| `scripts/test-app-settings.mjs`                       | Add smoke coverage for app-primary maintenance messaging                   | ~120       |
| `scripts/test-app-onboarding.mjs`                     | Add smoke coverage for readiness handoff and app-owned recovery flow       | ~120       |
| `scripts/test-app-auto-pipeline-parity.mjs`           | Add parity-path coverage for the new home landing and app-first copy       | ~140       |
| `scripts/test-all.mjs`                                | Track the new files and smoke coverage in the quick-regression gate        | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] A ready workspace lands on a dashboard-equivalent app-owned home surface
      instead of defaulting to startup diagnostics.
- [ ] A workspace with missing prerequisites is still routed clearly into the
      onboarding flow without hiding why it was intercepted.
- [ ] The operator-home surface exposes explicit next actions into approvals,
      chat, workflows, pipeline, tracker, reports, settings, and onboarding
      without browser-side repo parsing.
- [ ] Settings, updater, onboarding, and repo docs consistently describe the
      app as the primary local runtime and terminal commands as explicit
      secondary actions.
- [ ] A checked-in cutover note records parity evidence, remaining gaps, and
      whether the Go dashboard stays secondary or can be retired.

### Testing Requirements

- [ ] `npm run app:check` passes after the shell, settings, onboarding, and
      route changes.
- [ ] `npm run app:web:build` passes after the new shell surface is added.
- [ ] `npm run app:api:test:runtime` passes with operator-home summary and
      route coverage.
- [ ] `node scripts/test-app-shell.mjs` passes with home landing and handoff
      coverage.
- [ ] `node scripts/test-app-settings.mjs` passes with maintenance-copy
      coverage.
- [ ] `node scripts/test-app-onboarding.mjs` passes with onboarding handoff
      coverage.
- [ ] `node scripts/test-app-auto-pipeline-parity.mjs` passes with app-first
      parity coverage.
- [ ] `node scripts/test-all.mjs --quick` stays green.

### Non-Functional Requirements

- [ ] Operator-home payloads stay bounded and avoid raw file or raw report
      bodies in the browser.
- [ ] Navigation and handoff behavior survive refresh and re-entry without
      stale selections or hidden state drift.
- [ ] Browser actions remain read-only for updates, auth, backup, and other
      terminal-owned maintenance steps.
- [ ] Docs and in-app messaging do not drift across README, setup, shell,
      onboarding, and settings surfaces.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Keep the operator-home summary bounded. It should summarize what matters
  next, not recreate full tracker, pipeline, or report viewers inside one
  payload.
- Preserve the backend-owned trust boundary for repo reads, approvals, update
  state, and maintenance guidance.
- Make the app-primary cutover visible in both code and docs so the default
  operator story is consistent after this session.

### Potential Challenges

- Summary sprawl: composing too many subsystems could produce a large or slow
  payload. Mitigation: cap previews, reuse existing summary helpers, and keep
  cards narrow.
- Intercept confusion: changing the default landing path could hide startup or
  onboarding blockers. Mitigation: keep status-strip visibility and explicit
  onboarding redirect rules.
- Messaging drift: repo docs and UI copy can diverge easily during cutover.
  Mitigation: update the owning docs and backend-generated copy in the same
  session.

### Relevant Considerations

- [P05] **Bounded payload growth**: The home summary must cap previews and
  counts so shell refresh stays fast.
- [P05] **Smoke suite coverage**: The final landing path needs smoke coverage
  that stays current as the cutover surface changes.
- [P05] **Read-only browser boundary**: Repo writes, approvals, and
  maintenance actions remain backend-owned and fail closed.
- [P05] **Thin browser surfaces**: Keep summary derivation in API contracts,
  not React state.
- [P05] **Canonical handoff routing**: Reuse the shared backend-owned handoff
  model across home, shell, and specialist surfaces.
- [P05-apps/web] **URL-backed focus sync**: Default-home and onboarding
  intercept behavior must cooperate with hash-based surface state and refresh
  semantics.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Home landing shows stale counts or stale next-action targets after refresh.
- Ready and blocked workspaces loop between home, startup, and onboarding.
- Settings or onboarding copy implies browser-owned update or auth mutations.

---

## 9. Testing Strategy

### Unit Tests

- Verify operator-home summary composition, preview limits, and degraded-state
  behavior in `apps/api/src/server/operator-home-summary.test.ts`.
- Verify route validation and structured error handling in
  `apps/api/src/server/http-server.test.ts`.

### Integration Tests

- Exercise the operator-home route through the live API test harness.
- Extend shell, settings, onboarding, and auto-pipeline smoke harnesses for
  the new landing path and app-primary copy.

### Manual Testing

- Launch the shell with a ready workspace and confirm the app lands on home
  with working handoffs.
- Launch with missing onboarding files and confirm onboarding intercept plus
  recovery to the home path after repair.
- Inspect settings and updater messaging to confirm terminal-only maintenance
  actions remain explicit.

### Edge Cases

- Offline refresh after a previously successful home summary load.
- Missing-prerequisite workspace with an explicit `#home` hash in the URL.
- Empty approvals, idle runtime, and no recent artifacts in the home summary.
- Dismissed, offline, and update-available updater states in the same home and
  settings experience.

---

## 10. Dependencies

### External Libraries

- React 19 - existing shell surface composition and state management
- Zod - route query validation in `apps/api`
- Playwright - browser smoke coverage in `scripts/`

### Internal Dependencies

- Existing startup diagnostics and operator-shell summary services
- Existing pipeline, tracker, report, scan, batch, application-help, and
  specialist workspace summaries and shell focus helpers
- Existing updater check integration in `apps/api/src/server/settings-update-check.ts`

### Other Sessions

- **Depends on**: Phase 03 startup and settings work, Phase 04 artifact,
  pipeline, and tracker workspaces, Phase 05 scan, batch, and application-help
  work, and Phase 06 specialist review work.
- **Depended by**: The Phase 06 validation, update-PRD closeout, and later
  phase-transition commands that rely on a documented cutover result.

---

## Next Steps

Session complete. Run `updateprd` if the completion state needs to be
re-applied.
