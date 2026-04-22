# Session Specification

**Session ID**: `phase03-session04-approval-inbox-and-human-review-flow`
**Phase**: 03 - Chat, Onboarding, and Approvals UX
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 03 already has a working operator shell, a live chat console, and a
guided onboarding wizard, but the Approvals surface is still only a
placeholder. The next missing capability is a dedicated human-review inbox:
one place where the operator can inspect pending approvals, understand why a
run paused, approve or reject with confidence, and recover interrupted work
without dropping to raw store inspection or ad hoc CLI usage.

This session should keep the browser thin. `apps/web` gains an
`apps/web/src/approvals/` module that renders a bounded queue, selected
approval context, decision controls, and interrupted-run review states inside
the existing shell. `apps/api` adds only the read and decision routes needed
to expose approval context and to resolve pending approvals through the
existing approval-runtime, observability, and orchestration contracts. The UI
must not invent a second approval state machine or a parallel resume path.

The result should be a real Approval badge -> Inbox -> Decision -> Resume
handoff. Operators can see what triggered review, inspect session, job, and
trace context, approve or reject explicitly, and observe whether work
resumes, fails, or remains blocked. Session 05 can then close the phase on top
of a shell that already handles the full Phase 03 review loop.

---

## 2. Objectives

1. Replace the Approvals placeholder with a dedicated inbox that shows pending
   approvals, selected review context, and interrupted-run handoff states.
2. Add thin backend contracts for approval-inbox reads and approve or reject
   decisions without bypassing the existing approval-runtime, observability,
   or durable job-runner ownership.
3. Reuse the existing orchestration resume contract for interrupted sessions so
   approval review and run recovery stay on one backend-owned path.
4. Add route, runtime, and browser validation for pending, empty, stale,
   approved, rejected, and resume-handoff flows.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session04-durable-job-runner` - provides queued, waiting,
      failed, and resumable job lifecycle behavior.
- [x] `phase01-session05-approval-and-observability-contract` - provides
      pending approval persistence, idempotent resolution, and runtime event
      history.
- [x] `phase02-session05-router-and-specialist-agent-topology` - provides the
      orchestrated launch and resume path that interrupted sessions must reuse.
- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell frame, approvals surface slot, and global approval badge.
- [x] `phase03-session02-chat-console-and-session-resume` - provides selected
      session context, waiting-for-approval states, and the current resume
      handoff contract.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic route design, validation,
  and path ownership rules
- `.spec_system/CONSIDERATIONS.md` for payload-size discipline, resume-path
  safety, and approval-state reuse guidance
- `.spec_system/PRD/PRD.md` and `.spec_system/PRD/PRD_UX.md` for approval
  inbox behavior, context drawer expectations, and resume visibility
- `apps/api/src/approval-runtime/approval-runtime-service.ts` for canonical
  approval resolution behavior
- `apps/api/src/server/chat-console-summary.ts` and
  `apps/api/src/server/routes/orchestration-route.ts` for selected-session
  detail and resume handoff behavior
- `apps/web/src/chat/` and `apps/web/src/shell/` for the current shell,
  waiting-state, and surface composition contract

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- `npm run app:api:test:runtime`, `npm run app:api:test:approval-runtime`, and
  `npm run app:api:test:orchestration` available for route and runtime
  verification
- `npm run doctor` and `node scripts/test-all.mjs --quick` available for
  repo-level regression checks
- Existing Playwright dependency available for browser smoke coverage

---

## 4. Scope

### In Scope (MVP)

- The Approvals surface becomes a dedicated inbox inside the existing shell.
- The inbox shows pending approvals, bounded selected-approval context, and
  interrupted-session handoff information without exposing raw store rows.
- The backend provides a bounded read model that combines approval request
  details, session and job state, recent timeline events, and failure context.
- Users can approve or reject through an explicit decision action backed by
  the canonical approval-runtime service.
- Users can hand interrupted sessions back to the existing orchestration resume
  flow from the same review surface.
- Empty, loading, offline, stale, already-resolved, and failed states render
  explicitly.

### Out of Scope (Deferred)

- Broad workflow parity beyond approval checkpoints and interrupted-run review
  - _Reason: this session only owns the approval inbox and human review loop._
- Batch review dashboards or bulk approval actions - _Reason: batch review
  belongs to later parity phases._
- Free-form reviewer notes, comments, or audit editing - _Reason: no checked-in
  contract owns those artifacts today._
- Settings, auth maintenance, or broader environment diagnostics - _Reason:
  Session 05 owns the settings and maintenance surface._
- Report, PDF, tracker, or artifact viewers - _Reason: those belong to later
  parity phases._

---

## 5. Technical Approach

### Architecture

Add a new `apps/web/src/approvals/` module that owns inbox polling, approval
selection, decision submission, resume handoff, and stale-state refresh. The
surface stays inside the existing operator shell rather than introducing a new
router tree. The web layer should render queue and detail state from a bounded
backend summary and should not reconstruct approval or session lifecycle rules
locally.

On the backend, add a bounded `approval-inbox-summary` read model plus two
route endpoints under `apps/api/src/server/routes/`: a GET route that returns
queue data plus selected approval context, and a POST route that resolves a
pending approval as approved or rejected. The GET path must remain read-only.
The POST path must delegate resolution to `approvalRuntime.resolveApproval()`
so approval record updates, waiting-job transitions, and session synchronization
continue to happen in one canonical place.

Interrupted-run recovery should reuse the existing `POST /orchestration`
resume path from Session 02 instead of adding a second resume route. The
approval inbox client can call that existing contract after the operator
chooses to resume an eligible session. After any approve, reject, or resume
attempt, the inbox should re-fetch backend state so the shell reflects the
live runtime rather than optimistic browser guesses.

### Design Patterns

- Read model plus explicit decision route: keep inbox inspection read-only
  until the operator explicitly resolves an approval.
- Approval-runtime reuse: resolve decisions through the existing runtime
  service instead of adding route-local store mutations.
- Resume via canonical orchestration: hand interrupted work back to the
  backend-owned resume contract rather than inventing a second session runner.
- Bounded context payloads: return queue summaries plus one selected detail
  payload at a time to keep polling deterministic and fast.
- Revalidation after mutation: refresh queue and selected detail from the API
  after any decision or resume attempt.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing shell and chat surfaces in `apps/web/src/shell/` and
  `apps/web/src/chat/`
- TypeScript Node server routes in `apps/api`
- Existing approval-runtime, durable job-runner, observability, and
  orchestration services in `apps/api`
- Existing Playwright dependency for browser smoke coverage

---

## 6. Deliverables

### Files to Create

| File                                                      | Purpose                                                                                   | Est. Lines |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/approvals/approval-inbox-types.ts`          | Define inbox payloads, decision enums, and review-state contracts                         | ~180       |
| `apps/web/src/approvals/approval-inbox-client.ts`         | Fetch inbox summaries, submit approval decisions, and hand interrupted sessions to resume | ~190       |
| `apps/web/src/approvals/use-approval-inbox.ts`            | Manage polling, selection, decision locking, and refresh state                            | ~250       |
| `apps/web/src/approvals/approval-queue-list.tsx`          | Render pending-approval rows and empty or loading states                                  | ~180       |
| `apps/web/src/approvals/approval-context-panel.tsx`       | Render request details, session or job metadata, and trace context                        | ~210       |
| `apps/web/src/approvals/approval-decision-bar.tsx`        | Render approve or reject controls and resolution messaging                                | ~160       |
| `apps/web/src/approvals/interrupted-run-panel.tsx`        | Render resumable waiting or failed sessions tied to the inbox context                     | ~180       |
| `apps/web/src/approvals/approval-inbox-surface.tsx`       | Compose the full approval inbox inside the operator shell                                 | ~240       |
| `apps/api/src/server/approval-inbox-summary.ts`           | Build the bounded approval queue, selected context, and interrupted-session read model    | ~260       |
| `apps/api/src/server/routes/approval-inbox-route.ts`      | Expose the GET-only approval inbox summary endpoint                                       | ~110       |
| `apps/api/src/server/routes/approval-resolution-route.ts` | Expose the POST approve or reject endpoint for pending approvals                          | ~140       |
| `scripts/test-app-approval-inbox.mjs`                     | Run browser smoke checks for queue, decision, stale, and resume-handoff behavior          | ~300       |

### Files to Modify

| File                                      | Changes                                                                                                         | Est. Lines |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/shell/operator-shell.tsx`   | Replace the Approvals placeholder with the live approval inbox surface                                          | ~70        |
| `apps/web/src/chat/run-status-panel.tsx`  | Add approval-review and interrupted-run handoff affordances into the Approvals surface                          | ~80        |
| `apps/web/src/shell/status-strip.tsx`     | Align approval badge and handoff copy with the dedicated inbox state                                            | ~70        |
| `apps/api/src/server/routes/index.ts`     | Register the approval inbox and approval resolution routes in deterministic order                               | ~30        |
| `apps/api/src/server/http-server.test.ts` | Add route coverage for inbox summaries, approval resolution, stale-state handling, and resume handoff readiness | ~280       |
| `scripts/test-all.mjs`                    | Add Session 04 files and approval-inbox smoke coverage to the quick regression suite                            | ~90        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Pending approvals are visible from the app shell without direct database
      inspection.
- [ ] Selected approval detail shows why review is required plus relevant
      session, job, and trace context.
- [ ] Users can approve or reject from the inbox and see the resulting run
      state or explicit failure outcome.
- [ ] Interrupted runs can hand off to the same backend-owned resume path from
      the approval review surface.
- [ ] Empty, stale, already-resolved, rejected, and offline states are
      explicit instead of leaving the operator in ambiguous UI state.

### Testing Requirements

- [ ] HTTP server tests cover approval-inbox summary reads, approval
      resolution outcomes, stale or already-resolved approvals, and invalid
      input handling.
- [ ] Browser smoke coverage verifies queue rendering, context inspection,
      approve, reject, stale-resolution, and resume-handoff behavior.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `npm run app:api:test:runtime`, `npm run app:api:test:approval-runtime`,
      `npm run app:api:test:orchestration`,
      `node scripts/test-app-approval-inbox.mjs`, `npm run doctor`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] GET inbox summary requests do not mutate repo or app-owned state.
- [ ] Approval decisions stay idempotent and route exclusively through the
      canonical approval-runtime service.
- [ ] Inbox polling payloads remain bounded and deterministic.
- [ ] All new and modified files remain ASCII-only and use Unix LF line
      endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Approval and resume logic stay sourced from backend-owned contracts
- [ ] Browser code does not expose raw store rows or duplicate approval state
      transitions

---

## 8. Implementation Notes

### Key Considerations

- Approval resolution must stay inside `approvalRuntime.resolveApproval()` so
  waiting jobs, session state, and audit events remain synchronized.
- Resume actions from the inbox should call the existing orchestration route
  rather than inventing a second browser-only resume path.
- The inbox summary should stay narrow: return bounded queue state plus one
  selected detail payload instead of full historical session dumps.
- Post-decision UI state must be revalidated from the backend before claiming
  that work resumed or failed.

### Potential Challenges

- Context stitching across approvals, sessions, jobs, and events can become
  noisy or expensive: mitigate with bounded queries and deterministic
  selection rules.
- Approved waiting work may not look resumed immediately if the runner has not
  reclaimed the job yet: mitigate with explicit intermediate copy and refresh.
- A selected approval can go stale between fetch and decision: mitigate with
  explicit stale or already-resolved error payloads and UI refresh hooks.

### Relevant Considerations

- [P02-apps/api] **Durable workflow fan-out**: Keep approve or reject effects
  inside the existing approval-runtime and durable runner contract; do not add
  a second queue or executor path.
- [P02-apps/api] **Catalog-driven routing**: Resume actions must call the
  existing orchestration contract so workflow eligibility stays deterministic
  and checked-in.
- [P00] **Live contract payload size**: Keep inbox summary payloads bounded so
  polling remains fast and review surfaces do not depend on large derived
  payloads.
- [P02-apps/api] **Resume first orchestration**: Reuse live session state and
  runtime envelopes instead of rebuilding interrupted-run heuristics in the
  browser.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Resolving an approval that was already handled elsewhere or whose underlying
  job already failed
- Double submitting approve or reject or resume actions while requests remain
  in flight
- Showing stale context after a decision and leaving the operator unsure
  whether the run resumed, failed, or still waits

---

## 9. Testing Strategy

### Unit Tests

- Validate summary-model mapping for pending approvals, selected detail, and
  interrupted-session state
- Validate approval-inbox client parsing and decision-result normalization

### Integration Tests

- Verify approval-inbox routes return deterministic queue and selected detail
  payloads for pending and empty states
- Verify approval resolution updates approval, waiting job, and session state
  through the approval-runtime service
- Verify interrupted-session resume handoff continues to use the existing
  orchestration contract

### Manual Testing

- Open the Approvals surface with at least one pending approval, inspect the
  selected context, approve, and confirm the queue and run state refresh
- Reject a pending approval and confirm explicit rejected-state messaging plus
  no hidden browser retries
- Open an interrupted session from the inbox and confirm resume handoff back
  into the backend-owned workflow path

### Edge Cases

- No pending approvals but one or more interrupted sessions still need review
- Approval already resolved or missing by the time the operator selects it
- Multiple approvals for one session with deterministic ordering and selection
- API goes offline after the last successful inbox refresh

---

## 10. Dependencies

### External Libraries

- React: 19.x
- Zod: 4.x
- Playwright: 1.59.x

### Other Sessions

- **Depends on**: `phase01-session04-durable-job-runner`,
  `phase01-session05-approval-and-observability-contract`,
  `phase02-session05-router-and-specialist-agent-topology`,
  `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase03-session02-chat-console-and-session-resume`
- **Depended by**: `phase03-session05-settings-and-maintenance-surface`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
