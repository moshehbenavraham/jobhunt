# Session Specification

**Session ID**: `phase03-session01-operator-shell-and-navigation-foundation`
**Phase**: 03 - Chat, Onboarding, and Approvals UX
**Status**: Not Started
**Created**: 2026-04-21
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 02 completed the backend runtime that the app will rely on, but the web
package is still only a bootstrap diagnostics screen. The next missing layer is
the operator shell itself: one navigable frame that can keep startup readiness,
active work, pending approvals, and the current session context visible while
later sessions add richer chat and review surfaces inside it.

This session establishes that shell foundation in `apps/web` without adding a
heavy router or duplicating repo logic in browser state. The web app should
gain a stable navigation model, shared status regions, and placeholder surfaces
for startup, chat, onboarding, approvals, and settings, while continuing to
render the existing startup diagnostics as the canonical readiness surface.

Because the shell needs live badges and activity context, this session also
adds a thin read-only backend summary contract in `apps/api`. That summary must
reuse the existing startup, approval, and operational-store surfaces instead of
leaking raw database rows or inventing a parallel runtime model. The result is
the first operator-facing app frame that future Phase 03 sessions can extend
without rebuilding navigation or shared status behavior.

---

## 2. Objectives

1. Define a stable operator-shell navigation model for startup, chat,
   onboarding, approvals, and settings without introducing a new routing
   dependency.
2. Add a thin backend summary contract that exposes readiness and active-work
   badges from existing API-owned services.
3. Replace the bootstrap-only web screen with a reusable shell that embeds the
   current startup diagnostics surface and future-surface placeholders.
4. Add shell smoke coverage for first load, navigation, offline, and runtime
   error states so later Phase 03 work extends a validated foundation.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session04-boot-path-and-validation` - provides the existing app
      shell bootstrap contract and no-mutation validation surface.
- [x] `phase01-session03-agent-runtime-bootstrap` - provides prompt and auth
      readiness summaries the shell must surface.
- [x] `phase01-session05-approval-and-observability-contract` - provides the
      approval metadata and runtime diagnostics surfaces needed for active-work
      badges.
- [x] `phase02-session02-workspace-and-startup-tool-suite` - provides the
      startup inspection and onboarding-readiness contracts the startup surface
      already renders.
- [x] `phase02-session05-router-and-specialist-agent-topology` - provides the
      current session and workflow-handoff context later Phase 03 surfaces will
      attach to.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for read-first browser behavior, deterministic
  validation, and path ownership rules
- `.spec_system/CONSIDERATIONS.md` for startup freshness, payload size, and
  reuse-over-duplication guidance
- `.spec_system/PRD/PRD.md` and `.spec_system/PRD/PRD_UX.md` for shell scope,
  navigation intent, and visual direction
- `apps/web/src/App.tsx` plus `apps/web/src/boot/` for the current bootstrap
  UI contract
- `apps/api/src/server/routes/startup-route.ts`,
  `apps/api/src/server/routes/runtime-approvals-route.ts`, and
  `apps/api/src/server/routes/runtime-diagnostics-route.ts` for reusable read
  models the shell summary should compose

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- `npm run app:api:test:runtime` available for route-contract validation
- Local browser smoke coverage runnable with the repo's existing Playwright
  dependency

---

## 4. Scope

### In Scope (MVP)

- The operator can move between the core Phase 03 surfaces from one shared
  shell without losing readiness and active-work context.
- The web shell reads a bounded backend summary for badges and shared status
  instead of deriving activity from raw browser-only assumptions.
- The startup diagnostics surface remains the canonical readiness view and is
  rendered inside the new shell as the Startup surface.
- Chat, onboarding, approvals, and settings each have stable placeholder
  surfaces so later sessions can add feature logic without revisiting shell
  structure.
- Shell loading, offline, and runtime-error states are explicit and testable.

### Out of Scope (Deferred)

- Chat submission, transcript streaming, or session-resume execution controls
  - _Reason: Session 02 owns the chat console and resume flow._
- Onboarding preview or repair mutations - _Reason: Session 03 owns explicit
  onboarding repair behavior._
- Approval decision actions or approval-detail workflows - _Reason: Session 04
  owns the approval inbox and human review actions._
- Settings actions that mutate auth or maintenance state - _Reason: Session 05
  owns settings and maintenance affordances._
- Artifact, tracker, scan, or batch review surfaces - _Reason: those belong to
  later parity phases._

---

## 5. Technical Approach

### Architecture

Add a new `apps/web/src/shell/` module that owns navigation state, shell
summary fetching, shared status presentation, and the top-level operator
layout. Navigation should stay dependency-light by using typed surface ids plus
URL hash synchronization instead of adding a router package. The operator shell
should compose the existing startup diagnostics hook for the Startup surface
and a second read-only shell-summary hook for shared header and badge state.

On the backend, add a small `operator-shell` summary helper and route under
`apps/api/src/server/`. The summary should compose existing startup
diagnostics, active-session state, and pending-approval counts into a bounded
view model with deterministic ordering and no raw store leakage. The route
should remain GET-only and reuse the current API service container rather than
introducing another service graph.

The shell must remain read-first. Placeholder surfaces may show pending-work
counts, blocked-state copy, and future-session affordances, but they must not
submit work or mutate repo state in this session. Startup remains the only
fully populated surface, and it should render in the new layout without losing
refresh behavior or readiness detail.

### Design Patterns

- URL-backed shell state: use typed surface ids plus browser hash state so the
  shell is reload-safe without a new routing dependency.
- Thin backend view model: expose only counts, ids, and summary fields needed
  by the shell header and navigation badges.
- Read-first composition: preserve the existing startup diagnostics payload as
  the detailed source of truth while the shell summary stays narrow.
- Placeholder-first extensibility: create stable surfaces now so later Phase 03
  sessions can add behavior without reworking layout.
- Explicit degraded states: keep offline, missing-prerequisite, and runtime
  error states first-class in both summary and shell rendering.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Vite in `apps/web`
- TypeScript Node server routes in `apps/api`
- Existing startup diagnostics, approval runtime, and operational-store
  contracts in `apps/api`
- Existing Playwright dependency for browser smoke coverage

---

## 6. Deliverables

### Files to Create

| File                                                 | Purpose                                                                                      | Est. Lines |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/shell/shell-types.ts`                  | Define typed surface ids, summary types, and shell navigation config                         | ~80        |
| `apps/web/src/shell/operator-shell-client.ts`        | Fetch and normalize the read-only shell summary contract                                     | ~120       |
| `apps/web/src/shell/use-operator-shell.ts`           | Manage shell summary loading, refresh, and URL-hash navigation state                         | ~170       |
| `apps/web/src/shell/navigation-rail.tsx`             | Render the shell navigation rail and badge-bearing surface links                             | ~160       |
| `apps/web/src/shell/status-strip.tsx`                | Render the shared header status region for readiness and active-work summaries               | ~140       |
| `apps/web/src/shell/surface-placeholder.tsx`         | Render consistent placeholder surfaces for not-yet-implemented Phase 03 views                | ~110       |
| `apps/web/src/shell/operator-shell.tsx`              | Compose navigation, status, startup surface, and placeholder surfaces into the new app frame | ~260       |
| `apps/api/src/server/operator-shell-summary.ts`      | Build the bounded shell summary view model from startup, session, and approval data          | ~180       |
| `apps/api/src/server/routes/operator-shell-route.ts` | Expose the GET-only shell summary endpoint for the web shell                                 | ~80        |
| `scripts/test-app-shell.mjs`                         | Run browser smoke checks for shell boot, navigation, and degraded-state rendering            | ~240       |

### Files to Modify

| File                                         | Changes                                                                            | Est. Lines |
| -------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/App.tsx`                       | Replace the bootstrap-only page with the new operator shell entrypoint             | ~120       |
| `apps/web/src/boot/startup-status-panel.tsx` | Adapt the existing diagnostics panel to render cleanly inside the shell surface    | ~150       |
| `apps/api/src/server/routes/index.ts`        | Register the operator-shell route in the existing route registry                   | ~20        |
| `apps/api/src/server/http-server.test.ts`    | Add contract coverage for the new shell summary route and active-work badge states | ~220       |
| `scripts/test-all.mjs`                       | Add Session 01 files and shell smoke coverage to the quick regression suite        | ~80        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Users can navigate between Startup, Chat, Onboarding, Approvals, and
      Settings from one operator shell.
- [ ] Shared status regions show readiness and active-work badges from
      backend-owned data, not duplicated browser-only logic.
- [ ] The Startup surface keeps rendering the existing diagnostics payload and
      refresh affordance inside the new shell.
- [ ] Placeholder surfaces preserve context and do not pretend to execute
      workflows that are not implemented yet.
- [ ] The shell remains usable through first-load, missing-prerequisite,
      offline, and runtime-error states.

### Testing Requirements

- [ ] HTTP server tests cover the operator-shell summary route for ready,
      missing-prerequisite, and active-work badge scenarios.
- [ ] Browser smoke coverage verifies shell boot, navigation, and degraded
      state rendering.
- [ ] `npm run app:web:check`, `npm run app:web:build`, and
      `npm run app:api:test:runtime` pass after integration.
- [ ] `node scripts/test-app-shell.mjs` and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] The shell summary payload stays narrow and does not expose raw session,
      approval, or job records.
- [ ] Navigation adds no new runtime dependency beyond browser primitives
      already available in the app.
- [ ] The web shell stays read-only with respect to repo-owned user-layer
      files in this session.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Shared status behavior is derived from existing API contracts
- [ ] `scripts/test-all.mjs --quick` covers the new Session 01 files

---

## 8. Implementation Notes

### Key Considerations

- The existing startup payload already contains the detailed readiness data the
  shell needs. Session 01 should embed that surface, not recreate it.
- Later Phase 03 sessions need stable placeholders and layout slots more than
  they need feature-complete surfaces right now.
- The backend already has enough state to summarize pending approvals and live
  runtime activity; the shell summary should reuse that state instead of
  creating another operational model.
- The shell foundation should preserve the repo's local-first, read-first
  contract and stay safe on partially configured workspaces.

### Potential Challenges

- Shell summary drift from live backend contracts: mitigate with one small
  API-owned summary helper and route tests.
- Navigation state becoming sticky or invalid after reload: mitigate with typed
  surface ids and hash normalization that falls back to Startup.
- Degraded-state copy becoming inconsistent across shared header and surface
  body: mitigate with one shell hook that owns summary-state classification.
- Placeholder surfaces looking actionable before their workflows exist:
  mitigate with explicit "not available yet" language and no mutation
  controls.

### Relevant Considerations

- [P00] **Repo-bound startup freshness**: surface readiness and missing-file
  counts from the live startup contract rather than cached UI assumptions.
- [P00] **Read-first boot surface**: keep the shell summary and shell render
  path metadata-only and mutation-free.
- [P00] **Live contract payload size**: keep the shell summary narrow so the
  shared header loads quickly and does not duplicate the full startup payload.
- [P00] **Canonical live surface**: treat `AGENTS.md`, `.codex/skills/`,
  `modes/`, and the existing API routes as the source of truth.
- [P00] **Contract reuse over parallel bootstrap logic**: extend the current
  startup and runtime surfaces instead of inventing a second boot path.
- [P00] **Validator-first closeout**: land Session 01 with route tests, shell
  smoke coverage, and quick-suite updates in the same change.
- [P02-apps/api] **Durable workflow fan-out**: active-work badges should read
  current state without creating new enqueue or resume side effects.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- The shell loses readiness or pending-work context when the operator changes
  surfaces or refreshes the page.
- The header shows stale counts after the API becomes unavailable or returns a
  runtime error.
- Placeholder surfaces imply actions are available before later sessions add
  the required backend workflows.

---

## 9. Testing Strategy

### Unit Tests

- Validate shell summary classification and count shaping through the route
  contract inputs exercised in server tests.
- Validate shell navigation normalization so unknown or missing surface ids
  resolve back to Startup.

### Integration Tests

- Verify the new GET-only operator-shell route returns bounded summary data for
  ready and missing-prerequisite workspaces.
- Verify runtime-context fixtures can surface active-work badges without
  leaking raw store rows.
- Verify the web shell renders startup diagnostics inside the new shared frame
  and keeps badge state visible while navigating.

### Manual Testing

- Start the API and web app, load the shell, and move through all five shell
  surfaces while confirming the shared header and navigation badges remain
  visible.
- Remove or restore required onboarding files in a fixture workspace and
  confirm the shell summary and Startup surface both reflect the live state.
- Stop the API after an initial successful load and confirm the shell shows a
  degraded offline state without dropping the last successful summary.

### Edge Cases

- Unknown URL hash or empty hash on first load
- API unavailable before the first summary response
- API becomes unavailable after a successful summary load
- Workspace missing onboarding files while the operational store is absent
- Pending approvals exist while the startup surface is otherwise ready

---

## 10. Dependencies

### External Libraries

- `react` and `react-dom` - existing UI runtime for the web shell
- `playwright` - existing browser automation dependency used for shell smoke
  coverage

### Other Sessions

- **Depends on**: `phase00-session04-boot-path-and-validation`,
  `phase01-session03-agent-runtime-bootstrap`,
  `phase01-session05-approval-and-observability-contract`,
  `phase02-session02-workspace-and-startup-tool-suite`,
  `phase02-session05-router-and-specialist-agent-topology`
- **Depended by**: `phase03-session02-chat-console-and-session-resume`,
  `phase03-session03-startup-checklist-and-onboarding-wizard`,
  `phase03-session04-approval-inbox-and-human-review-flow`,
  `phase03-session05-settings-and-maintenance-surface`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
