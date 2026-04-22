# Session Specification

**Session ID**: `phase04-session02-evaluation-console-and-artifact-handoff`
**Phase**: 04 - Evaluation, Artifacts, and Tracker Parity
**Status**: Complete
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 04 Session 01 created the backend-owned evaluation-result contract, but
the operator shell still treats the Chat surface as a generic launch-and-resume
console. The next missing capability is the signature run-to-artifact handoff:
after an evaluation starts, pauses, fails, or completes, the shell should make
that state legible in one place without requiring the browser to infer artifact
readiness from generic session status or raw repo paths.

This session keeps the work in `apps/web`. The chat surface should begin
consuming the new evaluation-result payload for `single-evaluation` and
`auto-pipeline` sessions, then render an evaluation-first console around it:
explicit state messaging, a compact artifact packet, score and legitimacy
signals, warning preview, and clear next actions for approvals and follow-on
review surfaces. The browser must stay thin. It should not recreate workflow
logic, parse report files, or guess whether an artifact is usable.

The result gives Phase 04 its first operator-visible artifact handoff. Session
03 can then build a dedicated report viewer on top of already-structured
handoff state, Session 04 can wire pipeline review on top of stable handoff
intents, and Session 06 can close parity without the shell still collapsing
everything into one generic "ready" state.

---

## 2. Objectives

1. Fetch and parse the Session 01 evaluation-result contract from the Chat
   surface for the selected or most recent evaluation session.
2. Show explicit pending, running, approval-paused, failed, completed, and
   degraded evaluation states inside the existing shell.
3. Render a compact artifact packet that exposes report, PDF, tracker, score,
   legitimacy, warning, and closeout readiness without leaving the evaluation
   console.
4. Provide deterministic handoff affordances for approvals, report review, PDF
   artifact follow-through, and future pipeline review without inventing a new
   browser-owned routing or artifact-serving layer.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session02-chat-console-and-session-resume` - provides the shell
      chat surface, recent-session selection, and launch or resume behavior
      this session extends.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      approval surface and focus handoff conventions for paused runs.
- [x] `phase04-session01-evaluation-result-contract` - provides the bounded
      evaluation-result payload the web console must consume directly.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic frontend contracts, bounded
  polling, and validation expectations
- `.spec_system/CONSIDERATIONS.md` for parser-drift, duplicate-submit, and
  thin-browser guidance
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_04/PRD_phase_04.md` for the run-to-artifact handoff
  and artifact-rail requirements
- `apps/web/src/chat/` for the current console composition, polling, and
  selected-session patterns
- `apps/web/src/approvals/approval-inbox-client.ts` for canonical approvals
  surface focus handoff
- `apps/api/src/server/evaluation-result-contract.ts` and
  `apps/api/src/server/routes/evaluation-result-route.ts` for the new backend
  contract and query semantics

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- `node scripts/test-app-chat-console.mjs` available for browser smoke
  coverage
- `node scripts/test-all.mjs --quick` available for repo-level regression
  checks

---

## 4. Scope

### In Scope (MVP)

- Extend the chat surface with evaluation-result polling tied to the selected
  or launched session.
- Show explicit launch, running, waiting-for-approval, failed, completed, and
  degraded result states in the console.
- Render a compact artifact packet or rail for report, PDF, tracker, score,
  legitimacy, warning, and closeout state.
- Reuse the existing approvals surface for paused-run review handoff.
- Surface deterministic handoff intents for report viewer and pipeline review
  without implementing those full surfaces yet.
- Add browser and fixture coverage for the main evaluation-result states and
  handoff affordances.

### Out of Scope (Deferred)

- Full report markdown reading - _Reason: Session 03 owns the dedicated report
  viewer._
- Dedicated pipeline workspace or tracker editing - _Reason: Sessions 04 and
  05 own those review and mutation surfaces._
- New backend artifact-serving or filesystem-browsing routes - _Reason:
  Session 02 consumes the bounded result contract; it does not widen the API
  surface._
- Replacing the current chat session summary contract - _Reason: the
  evaluation-result payload should complement, not replace, the existing chat
  console summary and launch or resume flow._

---

## 5. Technical Approach

### Architecture

Add a small evaluation-result companion module under `apps/web/src/chat/`.
This module should define strict payload parsing for the Session 01 contract,
fetch the summary for the selected or most recent evaluation session, and
render the artifact packet UI. The existing chat console hook remains the
orchestrator for launch, resume, selection, and polling, but it now also owns
the lifecycle of one evaluation-result request tied to the selected session.

The chat surface should keep the current shell composition: workflow composer,
run-status panel, recent sessions, and timeline remain in place. The new
artifact rail docks into that layout and reads only bounded backend fields:
artifact states, score, legitimacy, warning preview, closeout summary, and
approval handoff. The browser should not inspect report contents, traverse the
workspace, or infer readiness from path strings beyond displaying explicit
backend-provided states.

Handoff behavior should stay explicit and deterministic. Approval-paused runs
reuse `syncApprovalInboxFocus()` to move the operator into the existing
Approvals surface. Report-viewer, PDF, and pipeline-review actions should be
rendered as handoff affordances driven by contract state: enabled when the
artifact or follow-on context is ready, disabled with explanatory copy when the
destination surface is not yet available, and never presented as if the
browser can read local artifacts directly when it cannot.

### Design Patterns

- Companion read model: pair the existing chat-console summary with one
  evaluation-result summary instead of overloading the launch or resume
  contract.
- Strict parser boundary: fail closed when the evaluation-result payload drifts
  rather than rendering partial artifact state silently.
- Selection-coupled polling: revalidate artifact state only for the active or
  selected evaluation session and stop work cleanly when selection changes.
- Explicit handoff affordances: show what the operator can do next without
  pretending future review surfaces already exist.
- Thin browser surface: keep routing, artifact ownership, and readiness
  semantics backend-owned.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing chat console surface and hook in `apps/web/src/chat/`
- Existing approvals focus helper in `apps/web/src/approvals/`
- Session 01 evaluation-result route in `apps/api`
- Existing Playwright-backed smoke test harness in `scripts/test-app-chat-console.mjs`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/web/src/chat/evaluation-result-types.ts` | Define strict parser helpers and typed evaluation-result payloads for the web console | ~220 |
| `apps/web/src/chat/evaluation-result-client.ts` | Fetch the bounded evaluation-result summary with timeout, retry, and explicit offline handling | ~140 |
| `apps/web/src/chat/evaluation-artifact-rail.tsx` | Render the artifact packet, warning preview, closeout summary, and handoff affordances | ~260 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/web/src/chat/use-chat-console.ts` | Add selected-session evaluation-result loading, polling coordination, and revalidation behavior | ~170 |
| `apps/web/src/chat/run-status-panel.tsx` | Map evaluation-result states into explicit evaluation-first status copy and approvals handoff actions | ~120 |
| `apps/web/src/chat/chat-console-surface.tsx` | Dock the artifact rail into the chat layout and shift copy toward the evaluation-first console | ~140 |
| `scripts/test-app-chat-console.mjs` | Extend the fake API and browser smoke checks for evaluation-result states and handoff affordances | ~240 |
| `scripts/test-all.mjs` | Keep quick regression and ASCII coverage aligned with the new chat files and smoke script | ~40 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] The Chat surface fetches evaluation-result state for the selected or most
      recent `single-evaluation` or `auto-pipeline` session.
- [ ] Pending, running, approval-paused, failed, completed, and degraded
      states are explicit in the console and do not collapse into one generic
      ready state.
- [ ] Report, PDF, tracker, score, legitimacy, warning, and closeout signals
      are visible in one bounded artifact packet.
- [ ] Approval-paused runs can hand off directly to the existing Approvals
      surface.
- [ ] Report-viewer, PDF, and pipeline-review affordances stay explicit about
      whether follow-on review is ready, deferred, or unavailable.

### Testing Requirements

- [ ] Browser smoke coverage exercises running, approval-paused, completed,
      degraded, failed, and offline evaluation-result states.
- [ ] Browser smoke coverage exercises artifact-handoff affordances and
      duplicate-submit protection while the console is busy.
- [ ] `npm run app:web:check`, `npm run app:web:build`, and
      `node scripts/test-app-chat-console.mjs` pass after integration.
- [ ] `node scripts/test-all.mjs --quick` remains green after the new files
      are added to the regression gate.

### Non-Functional Requirements

- [ ] The web console stays parser-driven and does not read repo files or raw
      report content directly.
- [ ] Polling stays bounded to the selected or active evaluation session and
      cleans up on selection changes.
- [ ] All UI states remain explicit for loading, empty, error, and offline
      behavior where remote data is involved.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Strict payload parsing fails closed on contract drift
- [ ] Handoff actions are duplicate-safe while requests or refreshes are
      in-flight

---

## 8. Implementation Notes

### Key Considerations

- The current chat session summary is still useful for launch, resume, and
  timeline state. Session 02 should layer the evaluation-result payload on top
  of it, not replace it.
- Artifact paths from the backend are review signals, not permission for the
  browser to browse the local filesystem directly.
- Future report-viewer and pipeline sessions should be able to reuse the
  handoff intent decisions made here instead of redefining them.

### Potential Challenges

- Parser drift between the Session 01 API payload and the new web types:
  mitigate with strict parsing and smoke fixtures that cover the main result
  states.
- Racing summary and evaluation-result refreshes when selection changes:
  mitigate with shared request invalidation and selection-coupled revalidation
  in the chat hook.
- Misleading action buttons for unavailable destinations: mitigate with
  explicit disabled states and explanatory copy instead of fake links.

### Relevant Considerations

- [P03-apps/web] **Frontend parser and fixture drift**: keep the new
  evaluation-result parser, chat smoke fixtures, and backend contract aligned.
- [P03-apps/web+apps/api] **Interaction race guards**: protect launch,
  refresh, and handoff actions against duplicate user input while async work is
  in flight.
- [P03-apps/web] **Thin browser surfaces**: keep the artifact rail derived from
  backend summaries instead of moving workflow or file logic into React state.
- [P00] **Live contract payload size**: consume the bounded preview fields from
  Session 01 and do not widen the payload in the browser.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:
- Selection changes could show stale artifact state if refresh cleanup is not
  correct.
- Approval and handoff buttons could double-fire if synchronous interaction
  guards are missing.
- Future-surface actions could imply capabilities that do not exist yet unless
  unavailable states are explicit.

---

## 9. Testing Strategy

### Unit Tests

- Validate the evaluation-result parser against completed, degraded, failed,
  approval-paused, and empty payload shapes.
- Validate handoff-affordance derivation for ready, missing, pending, and
  deferred artifact states.

### Integration Tests

- Use the browser smoke harness to cover evaluation-result polling, selected
  session changes, approvals handoff, and offline refresh behavior.
- Keep the quick regression suite aware of the new chat files and smoke script.

### Manual Testing

- Launch a `single-evaluation` run and confirm the artifact rail moves from
  pending or running to an explicit artifact handoff.
- Select a paused session and confirm the approvals action opens the existing
  Approvals surface with the correct focus.
- Load a degraded result and confirm missing artifacts and warnings remain
  explicit instead of looking complete.

### Edge Cases

- No evaluation-result summary exists yet for the selected session
- The selected session is not an evaluation workflow
- Artifacts are pending or missing while the session itself is otherwise
  complete
- The API goes offline after a successful prior payload
- The operator clicks launch, refresh, or handoff controls repeatedly during an
  in-flight request

---

## 10. Dependencies

### External Libraries

- `react` - existing UI runtime for the shell surface
- `vite` - existing browser build and local dev runtime
- `playwright` - existing browser smoke harness used by the repo-level checks

### Internal Dependencies

- `apps/web/src/chat/chat-console-types.ts`
- `apps/web/src/chat/chat-console-client.ts`
- `apps/web/src/approvals/approval-inbox-client.ts`
- `apps/api/src/server/evaluation-result-contract.ts`
- `apps/api/src/server/routes/evaluation-result-route.ts`

### Other Sessions

- **Depends on**: `phase04-session01-evaluation-result-contract`
- **Depended by**: `phase04-session03-report-viewer-and-artifact-browser`,
  `phase04-session04-pipeline-review-workspace`,
  `phase04-session06-auto-pipeline-parity-and-regression`

---

## Next Steps

Run the `implement` workflow step next to build the evaluation-first chat
console and artifact handoff surface.
