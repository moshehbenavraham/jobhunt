# Session Specification

**Session ID**: `phase04-session01-evaluation-result-contract`
**Phase**: 04 - Evaluation, Artifacts, and Tracker Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 04 starts with a missing backend contract. The shell can already launch
or resume evaluation-oriented sessions, and the backend already owns typed
tools, durable jobs, approvals, observability, report reservation, PDF
generation, and tracker staging. What it still cannot do is hand the browser
one bounded evaluation result payload that says, in a single place, whether a
run is pending, running, paused for approval, failed, or ready for artifact
review.

This session keeps the work in `apps/api`. The backend should grow a typed
evaluation-result read model and route that compose runtime session state, job
state, latest checkpoint, approval context, failure summaries, and
artifact-readiness signals for `single-evaluation` and `auto-pipeline`
sessions. The route must stay read-only, health-aware, and bounded. It should
not expose raw stdout, report contents, or direct filesystem internals to the
browser.

The result gives later Phase 04 sessions a stable API contract for the
signature run-to-artifact handoff. Session 02 can render an artifact rail on
top of a single payload, and later report, pipeline, tracker, and parity work
can reuse the same state model instead of rebuilding artifact logic in React
or scraping repo-owned files.

---

## 2. Objectives

1. Define a typed evaluation-result contract that normalizes session, job,
   approval, artifact, warning, and closeout state for `single-evaluation`
   and `auto-pipeline`.
2. Add a bounded read-only API route that returns one evaluation result summary
   without requiring the browser to parse stdout, job logs, or repo files.
3. Expose explicit pending, running, approval-paused, failed, completed, and
   degraded result states with score, legitimacy, report, PDF, tracker, and
   warning fields where applicable.
4. Add contract coverage for workflow selection, query validation, and the
   main runtime outcome states that later web sessions will depend on.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session03-evaluation-pdf-and-tracker-tools` - provides the
      typed report, PDF, and tracker tool contracts the result packet must
      align with.
- [x] `phase03-session02-chat-console-and-session-resume` - provides the
      session and job summary patterns that this route must complement instead
      of duplicating.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      approval-state summary and resume expectations that paused evaluation
      results must expose explicitly.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic route design, validation,
  and bounded payload expectations
- `.spec_system/CONSIDERATIONS.md` for durable workflow fan-out, thin browser
  surface, and parser-drift concerns
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_04/PRD_phase_04.md` for the artifact-packet and
  run-to-artifact handoff requirements
- `apps/api/src/server/chat-console-summary.ts`,
  `apps/api/src/server/approval-inbox-summary.ts`, and
  `apps/api/src/server/settings-summary.ts` for bounded read-model patterns
- `apps/api/src/job-runner/workflow-job-contract.ts`,
  `apps/api/src/store/run-metadata-repository.ts`, and
  `apps/api/src/observability/observability-service.ts` for stored result,
  checkpoint, warning, and failure semantics

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`, and
  `npm run app:api:test:runtime` available from the repo root
- Operational store fixture helpers and HTTP server test harness available
  through the existing `apps/api` test suite
- Existing route registry and server boot path available for contract testing

---

## 4. Scope

### In Scope (MVP)

- Define one backend-owned evaluation result payload for
  `single-evaluation` and `auto-pipeline` sessions.
- Surface report, PDF, tracker-addition, approval, score, legitimacy, warning,
  and failure state through explicit typed fields.
- Normalize pending, running, approval-paused, failed, completed, and degraded
  states without relying on browser-side stdout parsing.
- Reuse runtime store, checkpoint, and observability data so the browser can
  fetch one bounded summary per session.
- Add route and HTTP contract coverage for query validation, workflow
  filtering, and the main result-state transitions.

### Out of Scope (Deferred)

- Browser rendering of the artifact rail or evaluation console updates -
  _Reason: Session 02 owns the web surface._
- Report markdown viewing or artifact browsing - _Reason: Session 03 owns those
  dedicated read surfaces._
- Pipeline queue review or tracker mutation actions - _Reason: Sessions 04 and
  05 own those workspaces and mutation paths._
- Full JD and URL auto-pipeline execution parity - _Reason: Session 06 closes
  the end-to-end parity loop after the read contract exists._

---

## 5. Technical Approach

### Architecture

Add a new evaluation-result server module in `apps/api/src/server/` that
defines the route contract and builds a bounded summary from the operational
store plus observability. The summary builder should resolve one relevant
evaluation session, inspect its active or most recent job, load the latest run
checkpoint and terminal result when present, attach pending approval and latest
failure context, and normalize artifact readiness into one browser-safe
envelope.

The route should be GET-only and read-only. Query handling should allow an
explicit `sessionId` and a bounded preview limit for timeline or checkpoint
context, with a deterministic fallback to the most recent
`single-evaluation` or `auto-pipeline` session when a caller does not provide
one. Unsupported workflows, empty history, missing sessions, and unavailable
operational-store states should stay explicit instead of silently returning a
misleading success packet.

Artifact readiness should be contract-driven rather than stringly typed. The
summary needs explicit per-artifact states for report, PDF, and tracker
addition, plus top-level evaluation states such as `pending`, `running`,
`waiting-for-approval`, `failed`, `completed`, and `degraded`. Score,
legitimacy, warnings, approval review context, and closeout readiness should
be present only when supported by stored job or checkpoint data.

### Design Patterns

- Bounded read model: return one compact summary plus small preview fields
  instead of exposing raw run metadata or unbounded logs.
- Contract-first normalization: map job status, checkpoint state, approval
  state, and artifact existence into explicit enums before the response is
  serialized.
- Read-only route surface: keep evaluation-result reads separate from launch,
  resume, or mutation flows.
- Session-centric lookup: let later browser surfaces request evaluation state
  by session rather than inventing new artifact identifiers.
- Failure-explicit envelopes: distinguish failed, approval-paused, and
  degraded results instead of collapsing them into one generic error state.

### Technology Stack

- TypeScript Node server modules in `apps/api`
- Existing `zod` route-validation patterns
- SQLite-backed operational store summaries in `apps/api/src/store/`
- Existing observability event summaries and checkpoint persistence
- Node standard library path and filesystem helpers for bounded artifact
  existence checks

---

## 6. Deliverables

### Files to Create

| File                                                    | Purpose                                                                                        | Est. Lines |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/evaluation-result-contract.ts`     | Define typed evaluation-result states, artifact packet shapes, and route payload enums         | ~220       |
| `apps/api/src/server/evaluation-result-summary.ts`      | Build the bounded evaluation summary from sessions, jobs, checkpoints, approvals, and failures | ~340       |
| `apps/api/src/server/routes/evaluation-result-route.ts` | Expose the GET-only evaluation-result endpoint with query validation                           | ~120       |

### Files to Modify

| File                                      | Changes                                                                                                | Est. Lines |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| `apps/api/src/server/routes/index.ts`     | Register the evaluation-result route in deterministic order                                            | ~20        |
| `apps/api/src/server/http-server.test.ts` | Add contract coverage for pending, running, waiting, failed, completed, degraded, and validation paths | ~320       |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Browser clients can fetch one typed evaluation-result summary for a
      `single-evaluation` or `auto-pipeline` session.
- [ ] Completed or degraded summaries include explicit report, PDF, tracker,
      warning, score, and legitimacy fields when those signals exist.
- [ ] Approval-paused summaries expose review context without requiring a
      second approval-only lookup first.
- [ ] Failed summaries expose bounded failure context and do not rely on raw
      stdout or report-body parsing.
- [ ] Empty or unsupported states remain explicit and do not silently pretend
      an artifact packet exists.

### Testing Requirements

- [ ] HTTP runtime-contract tests cover pending, running, approval-paused,
      failed, completed, and degraded summaries.
- [ ] HTTP runtime-contract tests cover explicit `sessionId` selection,
      latest-session fallback, unsupported workflows, and invalid query input.
- [ ] `npm run app:api:check`, `npm run app:api:build`, and
      `npm run app:api:test:runtime` pass after integration.

### Non-Functional Requirements

- [ ] The route remains read-only and does not trigger evaluation, merge,
      verify, or artifact writes.
- [ ] Payloads stay bounded and do not expose raw stdout, raw report content,
      or unbounded event history.
- [ ] Summary fields stay aligned with existing evaluation, PDF, and tracker
      result semantics already stored by the backend.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Route input is schema-validated and error responses remain explicit
- [ ] Evaluation-result states are deterministic across the same stored input

---

## 8. Implementation Notes

### Key Considerations

- This route should summarize stored runtime state, not invent a new execution
  layer for evaluation work.
- The summary needs to tolerate current parity gaps gracefully because full
  auto-pipeline closeout does not land until Session 06.
- Artifact readiness should be based on stored result fields plus bounded
  existence checks, not on parsing markdown or PDF content.

### Potential Challenges

- Mixed result semantics between `single-evaluation` and `auto-pipeline`:
  mitigate with a common contract plus explicit nullability for fields that are
  not yet available.
- Distinguishing degraded results from outright failures: mitigate with
  explicit artifact-state enums and warning arrays rather than a binary pass or
  fail flag.
- Payload drift ahead of Session 02 frontend work: mitigate with stable enums,
  explicit state names, and strict route tests now.

### Relevant Considerations

- [P02-apps/api] **Tool catalog drift**: Keep artifact and warning fields
  aligned with the existing evaluation, PDF, and tracker tool semantics.
- [P02-apps/api] **Durable workflow fan-out**: Read runtime state from the
  existing session, job, and checkpoint boundary instead of adding a parallel
  orchestration path.
- [P03-apps/web] **Frontend parser and fixture drift**: Emit stable enums,
  explicit nullability, and bounded payloads so Session 02 can fail closed on
  contract drift.
- [P03-apps/web] **Bounded polling payloads**: Keep timeline and checkpoint
  preview narrow so later polling surfaces do not fetch oversized result data.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Artifact-ready payloads claim success even when one artifact path is missing
  on disk.
- Approval-paused runs collapse into generic failures and lose review context.
- Degraded outcomes hide warnings and mislead later web surfaces into showing a
  false green state.

---

## 9. Testing Strategy

### Unit Tests

- Exercise result-state normalization for pending, running, waiting, failed,
  completed, and degraded job records through the route-level harness.
- Exercise artifact packet mapping for report, PDF, and tracker states with
  explicit null and missing-path cases.

### Integration Tests

- Verify the HTTP route returns the expected payload for
  `single-evaluation` and `auto-pipeline` sessions.
- Verify approval, failure, and unsupported-workflow cases stay explicit.
- Verify query validation, latest-session fallback, and bounded preview
  handling.

### Manual Testing

- Start the API server, seed or reuse evaluation-session fixtures, and inspect
  the route response for one running, one waiting, one failed, and one
  completed case.

### Edge Cases

- Session exists but has no job yet
- Session has multiple jobs and the latest relevant result must win
- Completed result has a report path but missing PDF or tracker addition
- Waiting session has approval context but no terminal result yet
- Caller requests a non-evaluation workflow session

---

## 10. Dependencies

### External Libraries

- `zod` - existing route query validation and contract parsing
- Node standard library `fs` and `path` - bounded artifact-path existence
  checks

### Internal Dependencies

- `apps/api/src/server/chat-console-summary.ts`
- `apps/api/src/server/approval-inbox-summary.ts`
- `apps/api/src/job-runner/workflow-job-contract.ts`
- `apps/api/src/store/run-metadata-repository.ts`
- `apps/api/src/observability/observability-service.ts`

### Other Sessions

- **Depends on**: `phase02-session03-evaluation-pdf-and-tracker-tools`,
  `phase03-session02-chat-console-and-session-resume`,
  `phase03-session04-approval-inbox-and-human-review-flow`
- **Depended by**: `phase04-session02-evaluation-console-and-artifact-handoff`,
  `phase04-session03-report-viewer-and-artifact-browser`,
  `phase04-session04-pipeline-review-workspace`,
  `phase04-session05-tracker-workspace-and-integrity-actions`,
  `phase04-session06-auto-pipeline-parity-and-regression`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
