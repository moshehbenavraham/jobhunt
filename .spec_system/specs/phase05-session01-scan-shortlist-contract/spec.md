# Session Specification

**Session ID**: `phase05-session01-scan-shortlist-contract`
**Phase**: 05 - Scan, Batch, and Application-Help Parity
**Status**: Complete
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 04 finished the bounded evaluation, report, pipeline, and tracker review
contracts, but portal scan parity is still missing at the API layer. The repo
already has durable `scan-portals` workflow execution, `data/pipeline.md`
shortlist output, and `data/scan-history.tsv` dedup history, yet the browser
still has no typed backend summary for launcher state, active run progress, or
review-ready shortlist candidates.

This session creates that contract in `apps/api`. The backend should read the
canonical shortlist and pending pipeline data, join it with scan-history and
runtime job state, and expose one bounded summary that tells the browser what
scan state exists, which candidates deserve attention, where duplicates or
warnings exist, and what follow-through actions are possible. The browser
should not parse `data/pipeline.md`, inspect raw job logs, or infer next steps
from free-form text.

The result is the foundation for Phase 05. Session 02 can build the `/scan`
workspace on one stable read model, and Session 03 can reuse the same backend-
owned candidate handoff metadata when batch supervision becomes app-owned.

---

## 2. Objectives

1. Add a typed scan-review contract that exposes launcher readiness, active or
   recent scan state, bounded shortlist candidates, duplicate hints, and
   explicit follow-through metadata through one API surface.
2. Parse `data/pipeline.md` and `data/scan-history.tsv` into a backend-owned
   shortlist read model that highlights fit signals, duplicate context,
   freshness, and warning states without browser-side repo parsing.
3. Add explicit backend support for shortlist follow-through decisions by
   returning evaluate and batch-seed handoff metadata plus a server-owned
   ignore or restore action path.
4. Add API coverage for empty, duplicate-heavy, approval-paused, degraded, and
   review-ready shortlist states so Session 02 can build UI on a stable
   contract.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session04-scan-pipeline-and-batch-tools` - provides the typed
      scan and batch workflow ownership this session must surface instead of
      replacing.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      runtime approval model that active scan review must reflect.
- [x] `phase04-session04-pipeline-review-workspace` - provides bounded
      shortlist and queue parsing patterns that this session should reuse for
      scan review.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic contracts, route design,
  no-new-dependency expectations, and repo-level validation gates
- `.spec_system/CONSIDERATIONS.md` for parser drift, thin-browser boundaries,
  bounded payload limits, and canonical handoff routing expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  requirement to keep repo reads and sensitive actions backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_05/PRD_phase_05.md` for Phase 05 scan parity and
  shortlist review requirements
- `scripts/scan.mjs`, `data/pipeline.md`, and `data/scan-history.tsv` for the
  canonical shortlist and dedup contracts this session must render
- `apps/api/src/tools/scan-workflow-tools.ts` and
  `apps/api/src/job-runner/workflow-job-contract.ts` for the durable scan
  payload and result shapes that summary state must reflect
- `apps/api/src/server/pipeline-review-summary.ts` and
  `apps/api/src/server/tracker-workspace-summary.ts` for bounded summary and
  selected-detail patterns already used elsewhere in the app
- `apps/api/src/store/` and `apps/api/src/server/routes/` for runtime-state
  reads, approval context, and route registration patterns

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`, and
  `npm run app:api:test:runtime` available from the repo root
- Existing HTTP runtime harness available in `apps/api/src/server/http-server.test.ts`
- Existing repo quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add one GET scan-review route that returns launcher state, active or recent
  run state, shortlist candidate previews, and selected candidate detail.
- Parse the `## Shortlist` and `## Pending` sections of `data/pipeline.md`
  into bounded shortlist candidates with bucket, rank, and fit-reason signals.
- Join shortlist candidates with `data/scan-history.tsv` to surface duplicate
  hints, freshness, and prior-seen context.
- Surface scan runtime states for idle, queued, running, approval-paused,
  completed, and degraded outcomes using operational store data plus scan job
  result summaries.
- Return explicit evaluate and batch-seed handoff metadata for each candidate
  without writing browser-owned follow-through state.
- Add one backend action path for ignore or restore so candidate hiding is
  backend-owned and does not mutate user-layer pipeline or history files.
- Cover empty files, missing shortlist sections, stale selection, duplicate-
  heavy results, and degraded scan outcomes in automated tests.

### Out of Scope (Deferred)

- `/scan` workspace layout, shortlist cards, sticky action shelf behavior, and
  shell navigation wiring - _Reason: Session 02 owns the browser surface._
- Batch composer, item-matrix review, retry controls, and merge or verify
  actions - _Reason: Sessions 03 and 04 own batch supervision._
- Direct writes to `batch/batch-input.tsv` from shortlist review - _Reason:
  this session only returns bounded batch-seed metadata._
- Generic specialist-workspace infrastructure or dashboard replacement -
  _Reason: those are Phase 06 concerns._

---

## 5. Technical Approach

### Architecture

Add a new server summary module in `apps/api/src/server/` for scan review. The
summary builder should read the canonical pipeline and scan-history files
through existing workspace boundaries, parse the shortlist section into ranked
candidate previews, and use the pending queue plus scan-history rows to derive
duplicate context and freshness notes. The payload must stay bounded: return a
limited list of candidate previews plus one selected-detail record rather than
streaming full shortlist text or raw scan logs.

Runtime state should come from the operational store, not ad hoc log parsing.
The summary should locate the active or latest `scan-portals` session, inspect
its active job, pending approval, and last completed result, and translate
those into explicit launcher, progress, completed, or degraded states for the
browser. The result summary should surface counts and warnings from the typed
scan workflow result, while approval-paused and failed runs stay visible as
first-class states instead of collapsing into generic inactivity.

Shortlist follow-through should stay backend-owned. Each candidate should
return explicit evaluate and batch-seed handoff metadata the browser can pass
to later app surfaces, plus ignore or restore capability through a POST route.
Ignore state should live in operational session context under a namespaced
scan-review key so the app can hide candidates without mutating `data/pipeline.md`
or `data/scan-history.tsv`. This keeps user-layer files canonical while still
allowing operator-owned review decisions inside the app.

### Design Patterns

- Backend-owned shortlist read model: parse repo files once on the server and
  expose one typed summary to the browser
- Bounded list-plus-detail payload: limit candidate previews and return one
  selected candidate record for focused review
- Runtime overlay on repo state: combine scan job status, approvals, and last
  result with the canonical shortlist files instead of inventing a second scan
  source of truth
- Session-scoped ignore state: store hidden candidate URLs in operational
  context rather than mutating user-layer files
- Handoff metadata over browser inference: return evaluate and batch-seed
  payloads directly from the API instead of rebuilding them in React

### Technology Stack

- TypeScript Node server modules in `apps/api`
- Existing `zod` validation and route patterns
- Existing workspace boundary helpers for repo-owned file reads
- Existing operational store repositories for session, job, and approval state
- Existing Node test runner and repo quick regression gate
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                     | Purpose                                                                                         | Est. Lines |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/scan-review-contract.ts`            | Define launcher, run-state, shortlist candidate, warning, and handoff payload shapes            | ~260       |
| `apps/api/src/server/scan-review-summary.ts`             | Parse shortlist and scan history, join runtime state, and build the bounded scan-review summary | ~460       |
| `apps/api/src/server/routes/scan-review-route.ts`        | Expose the GET scan-review endpoint with bounded query validation                               | ~140       |
| `apps/api/src/server/routes/scan-review-action-route.ts` | Expose POST ignore or restore actions for shortlist candidates                                  | ~180       |
| `apps/api/src/server/scan-review-summary.test.ts`        | Lock shortlist parsing, dedup hints, ignore filtering, and runtime state composition            | ~280       |

### Files to Modify

| File                                      | Changes                                                                                               | Est. Lines |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/routes/index.ts`     | Register the new scan-review routes in deterministic order                                            | ~20        |
| `apps/api/src/server/http-server.test.ts` | Add GET and POST route coverage for empty, duplicate-heavy, approval-paused, and degraded scan states | ~420       |
| `scripts/test-all.mjs`                    | Add new scan-review files to quick regression and ASCII coverage lists                                | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Browser clients can fetch one typed summary for scan launcher readiness,
      active or recent run state, shortlist candidates, and selected detail.
- [ ] Shortlist candidates expose explicit fit, rank, dedup, freshness,
      warning, and evaluate or batch-seed follow-through fields without
      browser-side repo parsing.
- [ ] Ignore or restore behavior is backend-owned, bounded, and does not
      mutate `data/pipeline.md` or `data/scan-history.tsv`.
- [ ] Approval-paused, completed, degraded, and empty scan states remain
      explicit and reviewable instead of collapsing into generic idle state.

### Testing Requirements

- [ ] Summary tests cover missing shortlist sections, empty history, duplicate-
      heavy candidates, ignored-candidate filtering, and selected-url detail.
- [ ] HTTP runtime tests cover invalid query input, invalid action input,
      active run state, approval-paused state, degraded result state, and
      ready shortlist state.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, and `node scripts/test-all.mjs --quick`
      pass after integration.

### Non-Functional Requirements

- [ ] Payloads remain bounded by preview limits and selected-detail focus
      rather than exposing raw shortlist text or logs.
- [ ] The browser never reads repo files directly for scan review.
- [ ] Repo writes remain fail-closed and backend-owned; the only new mutation
      surface is session-scoped ignore or restore state in operational data.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- `scripts/scan.mjs` already exports shortlist parsing helpers, but the API
  contract must remain bounded and deterministic even if script wording drifts.
- `data/pipeline.md` shortlist only shows the top ranked slice, so selected
  detail should not imply full-history coverage when only bounded shortlist
  data exists.
- Ignore state must remain app-owned operational data and must not rewrite
  user-layer files just to support UI review behavior.

### Potential Challenges

- Shortlist parser drift: mitigate by adding dedicated summary tests against
  representative shortlist and pending file shapes.
- Runtime-state ambiguity when no active scan exists: mitigate by explicitly
  separating idle, completed, degraded, and approval-paused states.
- Duplicate-heavy results growing noisy: mitigate by capping preview payloads
  and summarizing dedup context instead of returning raw scan-history rows.

### Relevant Considerations

- [P04] **Review-focus contract drift**: Keep scan follow-through metadata
  backend-owned so Session 02 does not invent new client inference rules.
- [P04-apps/api] **Markdown parser fragility**: Coordinate `data/pipeline.md`
  shortlist parsing with dedicated summary tests and HTTP fixtures.
- [P04] **Bounded parity payloads**: Cap shortlist preview and selected detail
  so polling surfaces stay fast and predictable.
- [P04] **Read-only browser boundary**: Keep repo-file access and shortlist
  mutation decisions backend-owned.
- [P04] **Thin browser surfaces**: Put duplicate classification and follow-
  through metadata in the API contract rather than React state.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Runtime scan state and shortlist file state can drift after resume or
  degraded completion, causing the browser to show the wrong next step.
- Duplicate context can overwhelm shortlist review unless it is summarized into
  bounded candidate signals instead of raw file detail.
- Follow-through actions can become inconsistent if evaluate, batch-seed, and
  ignore capabilities are inferred differently across surfaces.

---

## 9. Testing Strategy

### Unit Tests

- Verify shortlist parsing, pending queue joins, dedup hint generation, ignore
  filtering, and selected-detail resolution in `scan-review-summary.test.ts`.

### Integration Tests

- Verify GET and POST route payloads, runtime state transitions, approval-
  paused summaries, degraded closeout, and invalid request handling in
  `http-server.test.ts`.

### Manual Testing

- Start the local API, launch a scan, confirm launcher state changes to
  running, and inspect completed or degraded summary output from the new route.
- Ignore one shortlisted candidate, refresh the route, and confirm the
  candidate stays hidden until restored.

### Edge Cases

- Missing `## Shortlist` section in `data/pipeline.md`
- Empty or missing `data/scan-history.tsv`
- Selected candidate URL not present in the current bounded shortlist page
- Approval-paused scan run with no completed result yet
- Degraded scan result with warnings but no new shortlist additions

---

## 10. Dependencies

### External Libraries

- Existing `zod` validation already in the repo
- No new dependencies

### Other Sessions

- **Depends on**: `phase02-session04-scan-pipeline-and-batch-tools`,
  `phase03-session04-approval-inbox-and-human-review-flow`,
  `phase04-session04-pipeline-review-workspace`
- **Depended by**: `phase05-session02-scan-review-workspace`,
  `phase05-session03-batch-supervisor-contract`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
