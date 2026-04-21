# Session Specification

**Session ID**: `phase03-session02-chat-console-and-session-resume`
**Phase**: 03 - Chat, Onboarding, and Approvals UX
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 03 Session 01 replaced the bootstrap-only screen with a real operator
shell, but the shell still routes the core Chat surface to a placeholder. The
next missing capability is the primary run console itself: one surface where
the operator can launch supported workflows, see deterministic runtime state,
and reopen recent or interrupted sessions without dropping back to the CLI or
direct database inspection.

This session turns the Chat surface into that console while keeping ownership
clear. `apps/web` should gain a workflow composer, a recent-session resume
list, and a structured run-status and timeline surface. `apps/api` should add
only the thin read and command contracts needed to expose recent resumable
sessions and to hand launch or resume requests into the existing orchestration
service. The new contracts must reuse Phase 02 runtime, routing, and durable
job boundaries instead of recreating orchestration logic in the browser.

The result should be the first usable operator workflow surface in the app.
Users can start a supported request, see whether the run is ready, blocked by
auth, blocked by tooling gaps, waiting for approval, running, or failed, and
resume recent sessions through the same backend-owned path. Later Phase 03
work can then layer onboarding repair, approvals, and settings on top of an
already-working console.

---

## 2. Objectives

1. Replace the Chat placeholder with a run console that can launch supported
   workflows and resume recent sessions from the app shell.
2. Add thin backend contracts for recent session summaries and orchestration
   launch or resume requests without bypassing the existing router, session
   lifecycle, or durable job runner.
3. Show deterministic console states for ready, auth-required, tooling-gap,
   waiting-for-approval, running, and failed outcomes.
4. Add route, repository, and browser validation so the console lands with
   tested launch, resume, and structured error presentation behavior.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session04-boot-path-and-validation` - provides the live startup
      payload and no-mutation boot contract the console must continue to
      respect.
- [x] `phase01-session04-durable-job-runner` - provides resumable queued,
      running, waiting, and failed job behavior.
- [x] `phase01-session05-approval-and-observability-contract` - provides
      approval summaries and structured runtime event visibility.
- [x] `phase02-session05-router-and-specialist-agent-topology` - provides the
      workflow router, specialist mapping, and orchestration handoff contract.
- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell frame, shared status strip, and stable Chat surface slot.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic route design, path
  ownership, and validation expectations
- `.spec_system/CONSIDERATIONS.md` for live-contract reuse, payload-size
  discipline, and resume-path safety
- `.spec_system/PRD/PRD.md` and `.spec_system/PRD/PRD_UX.md` for run console
  behavior, recent-session resume expectations, and interaction states
- `apps/web/src/shell/operator-shell.tsx` and `apps/web/src/shell/` for the
  current shell composition contract
- `apps/api/src/orchestration/` and `apps/api/src/store/` for launch, resume,
  session, job, and approval ownership

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- `npm run app:api:test:runtime` and `npm run app:api:test:orchestration`
  available for route and orchestration verification
- Existing Playwright dependency available for browser smoke coverage

---

## 4. Scope

### In Scope (MVP)

- The Chat surface becomes the primary run console inside the existing shell.
- The operator can compose a supported workflow request, submit it once, and
  see a deterministic launch outcome.
- The console can list recent active, waiting, failed, and recently completed
  sessions in bounded deterministic order and resume eligible sessions.
- The console can show structured status and timeline context derived from
  backend-owned route, runtime, session, job, and approval data.
- Workflow availability and tooling-gap messaging stay aligned with the live
  prompt and specialist routing contract.

### Out of Scope (Deferred)

- Streaming transcript tokens or free-form assistant chat history - _Reason:
  Session 02 only needs structured run launch and resume behavior, not full
  conversational rendering._
- Onboarding repair preview or mutation flows - _Reason: Session 03 owns the
  startup checklist and onboarding wizard._
- Approval approve or reject actions - _Reason: Session 04 owns the approval
  inbox and human review controls._
- Artifact review, report viewing, tracker editing, or workflow-specific
  result UIs - _Reason: those belong to later parity phases._
- A full router or deep-link system beyond the existing shell surface and
  bounded selected-session state - _Reason: Session 02 should not expand shell
  routing scope._

---

## 5. Technical Approach

### Architecture

Add a `apps/web/src/chat/` module that owns the chat console read model,
workflow composer state, recent-session selection, polling, and launch or
resume actions. The console should remain a surface inside the existing shell,
not a separate route tree. Selected-session state can be URL-backed with a
small query-param or hash-adjacent convention if needed, but the shell's
surface ownership stays unchanged.

On the backend, add two thin HTTP contracts under `apps/api/src/server/`:
one read model for the chat console summary and one POST route for
orchestration launch or resume requests. The read model should combine prompt
workflow support, specialist route readiness, recent runtime sessions, latest
job summaries, and pending approvals into a bounded payload that the web
console can poll safely. The command route should validate input and then call
the existing orchestration service directly, returning a normalized handoff
envelope rather than exposing store internals.

Recent-session summaries should come from the operational store, not ad hoc
in-memory state. Extend the session repository with a bounded recent-session
query, then compose job and approval summaries per session inside the console
read model. Ordering must be deterministic, and resume eligibility must be
derived from the stored session and job state instead of frontend guesses.

### Design Patterns

- Read model plus command route: split recent console state from launch and
  resume mutations so polling stays read-only.
- Contract-driven UI state: map backend route and runtime envelopes into a
  fixed set of console states instead of scattered component heuristics.
- Resume-first orchestration: reuse the existing orchestration service for both
  launch and resume so approvals and runtime state stay durable.
- Bounded polling: refresh recent-session and selected-session state on a
  narrow interval only while active or waiting work exists.
- Duplicate-submit prevention: gate launch and resume actions while a request
  is in flight so the console cannot enqueue duplicates by accident.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing shell surface composition in `apps/web/src/shell/`
- TypeScript Node server routes in `apps/api`
- Existing orchestration service, workflow router, and session lifecycle in
  `apps/api/src/orchestration/`
- Existing SQLite-backed operational store in `apps/api/src/store/`
- Existing Playwright dependency for browser smoke coverage

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/web/src/chat/chat-console-types.ts` | Define console payloads, workflow options, and deterministic UI state types | ~150 |
| `apps/web/src/chat/chat-console-client.ts` | Fetch console summaries and submit orchestration launch or resume requests | ~170 |
| `apps/web/src/chat/use-chat-console.ts` | Manage polling, draft state, selection, and in-flight launch or resume state | ~240 |
| `apps/web/src/chat/workflow-composer.tsx` | Render the primary run composer with workflow shortcut and preflight copy | ~190 |
| `apps/web/src/chat/recent-session-list.tsx` | Render recent resumable sessions and selection controls | ~180 |
| `apps/web/src/chat/run-status-panel.tsx` | Render deterministic state chips and route or runtime summaries | ~170 |
| `apps/web/src/chat/run-timeline.tsx` | Render the selected session timeline and approval or failure context | ~210 |
| `apps/web/src/chat/chat-console-surface.tsx` | Compose the full Chat surface inside the operator shell | ~230 |
| `apps/api/src/server/chat-console-summary.ts` | Build the bounded read model for workflows, recent sessions, and selected-session detail | ~260 |
| `apps/api/src/server/routes/chat-console-route.ts` | Expose the GET-only console summary endpoint | ~90 |
| `apps/api/src/server/routes/orchestration-route.ts` | Expose the POST launch or resume orchestration endpoint | ~110 |
| `scripts/test-app-chat-console.mjs` | Run browser smoke checks for console launch, resume, and degraded-state behavior | ~260 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/web/src/shell/operator-shell.tsx` | Replace the Chat placeholder with the live chat console surface | ~80 |
| `apps/api/src/store/store-contract.ts` | Add the bounded recent-session repository contract needed by the console read model | ~30 |
| `apps/api/src/store/session-repository.ts` | Implement deterministic recent-session queries for the console read model | ~120 |
| `apps/api/src/store/repositories.test.ts` | Cover recent-session ordering and limit behavior | ~110 |
| `apps/api/src/server/routes/index.ts` | Register the console summary and orchestration routes in deterministic order | ~25 |
| `apps/api/src/server/http-server.test.ts` | Add route coverage for console summary and launch or resume envelopes | ~260 |
| `scripts/test-all.mjs` | Add Session 02 files and browser smoke coverage to the quick regression suite | ~80 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Users can open the Chat surface and submit a supported workflow request
      from the app shell.
- [ ] Users can see recent resumable sessions with deterministic state,
      selected-session detail, and resume controls.
- [ ] Launch and resume actions flow through backend orchestration contracts
      and return structured route, runtime, session, job, and approval state.
- [ ] The console surfaces explicit ready, auth-required, tooling-gap,
      waiting-for-approval, running, and failed states without CLI-only copy.
- [ ] Unsupported or blocked workflows fail explicitly with route-backed
      messaging rather than browser-side guesses.

### Testing Requirements

- [ ] Store repository tests cover recent-session ordering and bounded limits.
- [ ] HTTP server tests cover GET console summary and POST orchestration launch
      or resume flows, including blocked and missing-session cases.
- [ ] Browser smoke coverage verifies chat-console rendering, duplicate-submit
      prevention, and resume-state rendering.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `npm run app:api:test:runtime`, `npm run app:api:test:orchestration`,
      `node scripts/test-app-chat-console.mjs`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Console summary payloads stay bounded and do not expose raw database rows
      or unbounded event streams.
- [ ] Chat surface polling stops cleanly when the surface unmounts or when no
      active work remains.
- [ ] Launch and resume actions prevent duplicate enqueue attempts while the
      previous request is still in flight.
- [ ] All new and modified files remain ASCII-only and use Unix LF line
      endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Workflow status and availability stay sourced from backend-owned
      contracts
- [ ] Quick-suite coverage is updated in the same change as the new console
      surface

---

## 8. Implementation Notes

### Key Considerations

- The shell already owns navigation and shared readiness. Session 02 should
  slot into the existing Chat surface instead of revisiting shell structure.
- Workflow launch and resume are already modeled in the orchestration service.
  The web app needs a thin HTTP bridge and a bounded read model, not new
  orchestration rules.
- Recent-session visibility should focus on resumable operator value, not on
  reproducing every raw store table in the browser.
- The console must stay honest about blocked states. If the runtime is auth
  blocked or the workflow is in tooling-gap status, the UI should say so
  directly.

### Potential Challenges

- Mapping orchestration envelopes into a stable UI state machine: mitigate with
  one typed console-state model shared by the client, hook, and status panel.
- Recent-session payloads growing too wide: mitigate with a bounded recent list
  and one selected-session detail section instead of dumping full history.
- Resume actions targeting stale or terminal sessions: mitigate with backend
  validation plus explicit `session-not-found` and non-resumable state copy.
- Duplicate launches on fast repeated input: mitigate with in-flight submit
  locks at the hook and composer boundary.

### Relevant Considerations

- [P00] **Repo-bound startup freshness**: derive workflow support and auth
  readiness from live startup and routing state, not hardcoded web constants.
- [P00] **Read-first boot surface**: keep the console summary GET route
  metadata-only and mutation-free.
- [P00] **Live contract payload size**: keep recent-session and selected-session
  detail bounded so the console can poll safely.
- [P00] **Contract reuse over parallel bootstrap logic**: reuse the existing
  orchestration and startup services rather than creating a browser-owned
  runtime path.
- [P02-apps/api] **Tool catalog drift**: workflow shortcuts and tooling-gap
  messaging should stay aligned with the specialist catalog and prompt support.
- [P02-apps/api] **Durable workflow fan-out**: launch and resume must preserve
  the single orchestration and job-runner enqueue boundary.
- [P02-apps/api] **Resume first orchestration**: recent-session reopen flows
  should reuse live session records rather than synthesize new session ids.
- [P02-apps/api] **Silent fallthrough**: unsupported and blocked requests must
  surface explicit route-backed reasons in the console.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- The operator triggers the same workflow multiple times because submit state
  or resume state is not locked correctly.
- The Chat surface shows stale session or approval state after the selected
  session changes or the API goes offline.
- Tooling-gap, auth-blocked, and session-not-found cases collapse into a vague
  generic error instead of a deterministic operator-visible state.

---

## 9. Testing Strategy

### Unit Tests

- Validate recent-session repository ordering and limit behavior so the console
  read model stays deterministic.
- Validate console state classification so route and runtime envelopes map into
  the expected UI states.

### Integration Tests

- Verify the GET console summary route returns bounded workflow and recent
  session data for ready, waiting, and failed-runtime fixtures.
- Verify the POST orchestration route returns structured launch and resume
  envelopes for ready, tooling-gap, auth-blocked, and session-not-found cases.
- Verify the selected-session console payload reflects job and pending approval
  state without leaking raw store rows.

### Manual Testing

- Start the API and web app, open the Chat surface, submit a supported request,
  and confirm the console transitions through loading and into a structured
  launch result.
- Seed one waiting session and one failed session, then confirm the recent list
  renders both deterministically and resume works only for the eligible entry.
- Stop the API after a successful summary load and confirm the console shows an
  offline or degraded state without erasing the last known session context.
- Force an auth-blocked runtime and confirm the composer surfaces an explicit
  blocked state instead of pretending the workflow can start.

### Edge Cases

- Empty draft submission
- Repeated submit clicks while a launch is already pending
- Resume requested for a session that no longer exists
- Workflow route returns tooling-gap for a supported prompt shortcut
- Selected session changes while polling is in flight
- API unavailable before the first console summary response

---

## 10. Dependencies

### External Libraries

- `react` and `react-dom` - existing UI runtime for the chat console surface
- `zod` - existing request validation for the new API routes
- `playwright` - existing browser automation dependency for console smoke
  coverage

### Other Sessions

- **Depends on**: `phase00-session04-boot-path-and-validation`,
  `phase01-session04-durable-job-runner`,
  `phase01-session05-approval-and-observability-contract`,
  `phase02-session05-router-and-specialist-agent-topology`,
  `phase03-session01-operator-shell-and-navigation-foundation`
- **Depended by**: `phase03-session04-approval-inbox-and-human-review-flow`,
  `phase03-session05-settings-and-maintenance-surface`, and later Phase 04
  evaluation and artifact parity work

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
