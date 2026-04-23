# Session Specification

**Session ID**: `phase05-session03-batch-supervisor-contract`
**Phase**: 05 - Scan, Batch, and Application-Help Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 05 Session 02 proved that scan review can hand strong candidates into
batch follow-through, but the app still has no dedicated backend contract for
batch supervision. The repo already owns `batch/batch-input.tsv`,
`batch/batch-state.tsv`, durable batch tools, and executor semantics, yet the
browser still cannot inspect draft rows, active batch progress, retryable
failures, or closeout readiness from one bounded API surface. Session 04 is
blocked until this read model exists.

This session creates that contract in `apps/api`. The backend should parse the
canonical batch input and state files, enrich item detail from worker result
sidecars under `batch/logs/`, and overlay active runtime session, job,
checkpoint, and approval state from the operational store. The result should
be one bounded summary that tells the browser what draft exists, which batch
items need attention, what the selected item detail looks like, and which next
actions are safe.

Explicit batch controls must remain backend-owned. Resume run-pending work,
retry failed infrastructure rows, and merge or verify closeout should flow
through typed route actions that reuse the existing batch and tracker tools
with duplicate-submit guards and explicit accepted or already-queued feedback.
Once this session lands, Session 04 can build the `/batch` workspace on one
stable contract instead of recreating batch semantics in React.

---

## 2. Objectives

1. Add a typed batch-supervisor contract that exposes draft composition,
   active or recent run state, bounded item-matrix data, selected item detail,
   warnings, and closeout action availability through one API surface.
2. Parse `batch/batch-input.tsv`, `batch/batch-state.tsv`, and
   `batch/logs/*.result.json` into a backend-owned read model that preserves
   retry eligibility, partial-result warnings, artifact metadata, and
   deterministic item ordering without browser-side repo parsing.
3. Add explicit backend support for run-pending resume, retry-failed, merge,
   and verify actions by wrapping the existing batch and tracker tools behind
   route-owned validation, idempotency guards, and clear action feedback.
4. Add API coverage for draft-only, queued, running, approval-paused,
   retryable-failed, partial-warning, merge-blocked, and completed batch
   states so Session 04 can build UI on a stable contract.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session04-durable-job-runner` - provides the operational job,
      checkpoint, and status lifecycle this session must surface instead of
      re-implementing.
- [x] `phase02-session04-scan-pipeline-and-batch-tools` - provides the typed
      batch workflow tools and executor semantics that action routes must
      reuse.
- [x] `phase04-session05-tracker-workspace-and-integrity-actions` - provides
      merge and verify action patterns plus warning mapping that batch closeout
      should reuse.
- [x] `phase05-session02-scan-review-workspace` - proves batch follow-through
      now needs a dedicated supervision contract instead of chat-only handoff.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic routes, bounded payloads,
  and no-new-dependency expectations
- `.spec_system/CONSIDERATIONS.md` for parser drift, thin-browser boundaries,
  and payload growth control
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  requirement to keep repo reads and sensitive actions backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_05/PRD_phase_05.md` for Phase 05 batch supervision
  requirements and the batch-management flow
- `batch/batch-input.tsv`, `batch/batch-state.tsv`,
  `batch/logs/*.result.json`, `batch/worker-result.schema.json`, and
  `batch/README-batch.md` for the canonical batch draft, state, and result
  contracts
- `apps/api/src/tools/batch-workflow-tools.ts`,
  `apps/api/src/tools/tracker-integrity-tools.ts`,
  `apps/api/src/job-runner/workflow-job-contract.ts`, and
  `apps/api/src/job-runner/workflow-job-executors.ts` for tool reuse and
  executor semantics this session must mirror
- `apps/api/src/server/scan-review-contract.ts`,
  `apps/api/src/server/scan-review-summary.ts`,
  `apps/api/src/server/tracker-workspace-contract.ts`, and
  `apps/api/src/server/routes/tracker-workspace-action-route.ts` for bounded
  summary and action-route patterns already used in the app
- `apps/api/src/store/` and `apps/api/src/runtime/service-container.ts` for
  session, job, approval, checkpoint, and tool-execution access patterns

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`, and
  `npm run app:api:test:runtime` available from the repo root
- Existing HTTP runtime harness available in
  `apps/api/src/server/http-server.test.ts`
- Existing repo quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add one GET batch-supervisor route that returns draft batch composition,
  active or recent run state, bounded item previews, selected item detail, and
  explicit action availability.
- Parse `batch/batch-input.tsv` and `batch/batch-state.tsv` into a canonical
  item-matrix read model that preserves item order, retry semantics, retries,
  scores, coarse status, and draft-vs-run overlays.
- Enrich batch items from `batch/logs/*.result.json` so partial results,
  report or PDF artifacts, tracker additions, legitimacy, and warning details
  remain visible without browser log scraping.
- Surface runtime session, job, approval, and checkpoint state for queued,
  running, waiting, failed, and completed batch runs using operational-store
  data instead of shell assumptions.
- Add one backend action route for run-pending resume, retry-failed, merge,
  and verify controls with idempotent semantics and explicit warning feedback.
- Cover empty input, missing state files, stale selected item focus, partial
  results, retryable infrastructure failures, approval-paused runs, and
  closeout warnings in automated tests.

### Out of Scope (Deferred)

- `/batch` workspace layout, matrix presentation, polling behavior, and shell
  navigation wiring - _Reason: Session 04 owns the browser surface._
- Broad browser mutation of `batch/batch-input.tsv` or importer workflows -
  _Reason: this session focuses on supervision of the canonical batch draft
  and run state, not authoring new batch inputs._
- Changes to `batch/batch-runner.sh`, `batch/batch-prompt.md`, or
  `batch/worker-result.schema.json` - _Reason: the existing batch worker
  contract remains the source of truth for this phase._
- Application-help flows, generic specialist routing, or dashboard
  replacement - _Reason: those are owned by later Phase 05 or Phase 06
  sessions._

---

## 5. Technical Approach

### Architecture

Add a new batch-supervisor server module in `apps/api/src/server/` that reads
the canonical batch input and state files through existing repo-path
boundaries. The summary builder should parse `batch/batch-input.tsv` into
draft rows, overlay `batch/batch-state.tsv` onto matching item IDs, and return
one bounded matrix plus one selected-item record instead of exposing raw TSV
content to the browser. Item ordering should stay deterministic by item ID,
with summary counts and filters derived on the server.

Runtime state should come from the operational store, not ad hoc polling of
shell artifacts. The summary should locate the active or latest
`batch-evaluation` session, inspect its active job, pending approval, last
checkpoint, and terminal result, and translate those into explicit queued,
running, waiting, failed, or completed states. When a worker result sidecar
exists under `batch/logs/{report}-{id}.result.json`, parse it with the
existing `batchWorkerResultSchema` so warning details, legitimacy, report
paths, PDF paths, and tracker paths stay structured and backend-owned.

Batch controls should stay route-owned. A new POST action route should call
`start-batch-evaluation` for run-pending resume, call
`retry-batch-evaluation-failures` for retry-only mode, and reuse the existing
tracker integrity tools for merge and verify closeout. Action routes should
use deterministic request validation, in-flight duplicate guards, and explicit
accepted-vs-already-queued messaging so Session 04 can trigger safe controls
without browser-owned tool orchestration.

### Design Patterns

- Backend-owned batch read model: parse repo files and runtime state once on
  the server, then expose one typed summary
- Bounded matrix-plus-detail payload: cap item previews and return one
  selected-item record for focused review
- Runtime overlay on repo state: combine batch input, batch state, result
  sidecars, checkpoints, and approval state without inventing a second batch
  source of truth
- Route-owned tool execution: keep resume, retry, merge, and verify actions in
  the API layer instead of surfacing tool details to the browser
- Result-sidecar enrichment over raw log scraping: recover structured warnings
  and artifact metadata from authoritative JSON results whenever available

### Technology Stack

- TypeScript Node server modules in `apps/api`
- Existing `zod` validation and route patterns
- Existing operational store repositories and service container accessors
- Existing batch workflow tools and tracker integrity tools
- Existing Node test runner and repo quick regression gate
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                          | Purpose                                                                                                     | Est. Lines |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/batch-supervisor-contract.ts`            | Define batch-supervisor payloads, item states, warning codes, action availability, and action results       | ~260       |
| `apps/api/src/server/batch-supervisor-summary.ts`             | Parse batch draft and state files, enrich item detail, overlay runtime state, and build the bounded summary | ~520       |
| `apps/api/src/server/routes/batch-supervisor-route.ts`        | Expose the GET batch-supervisor endpoint with bounded query validation                                      | ~140       |
| `apps/api/src/server/routes/batch-supervisor-action-route.ts` | Expose POST resume, retry, merge, and verify actions with duplicate-submit guards                           | ~220       |
| `apps/api/src/server/batch-supervisor-summary.test.ts`        | Lock batch parsing, runtime overlays, warning states, and action availability                               | ~320       |

### Files to Modify

| File                                      | Changes                                                                                                                | Est. Lines |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/routes/index.ts`     | Register the new batch-supervisor routes in deterministic order                                                        | ~20        |
| `apps/api/src/server/http-server.test.ts` | Add GET and POST route coverage for draft, running, waiting, retryable-failed, merge-warning, and invalid-input states | ~420       |
| `scripts/test-all.mjs`                    | Add the new batch-supervisor files to quick regression and ASCII coverage lists                                        | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Browser clients can fetch one typed summary for batch draft readiness,
      active or recent run state, bounded item previews, selected item detail,
      and closeout action availability.
- [ ] Batch item detail exposes retry eligibility, warnings, scores, report
      metadata, and artifact readiness without browser-side repo parsing.
- [ ] Resume run-pending, retry-failed, merge, and verify controls stay
      backend-owned, explicit, and safe to re-trigger without duplicate side
      effects.
- [ ] Approval-paused, retryable-failed, partial-warning, merge-blocked, and
      completed states remain explicit and reviewable instead of collapsing
      into generic batch status.

### Testing Requirements

- [ ] Summary tests cover empty draft files, missing state files, result-sidecar
      enrichment, retry eligibility, selected-item focus, and warning
      classification.
- [ ] HTTP runtime tests cover invalid query input, invalid action input,
      queued or running state, approval-paused state, retry-failed state,
      partial-warning state, and merge-warning outcomes.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, and `node scripts/test-all.mjs --quick`
      pass after integration.

### Non-Functional Requirements

- [ ] Payloads remain bounded by preview limits and selected-item focus rather
      than exposing raw TSV files or event logs.
- [ ] The browser never reads `batch/` files directly for batch supervision.
- [ ] Repo writes remain fail-closed and backend-owned; the only new mutation
      surface is the typed action route that reuses existing tool contracts.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- The batch executor already defines selection and retry semantics through
  `selectBatchRows()` and `batch-state.tsv`; this session should mirror those
  rules instead of inventing parallel batch-status logic.
- `batch-state.tsv` only stores coarse status, retries, score, and report
  number. Use worker result sidecars and runtime checkpoint or result data when
  richer warning or artifact detail is needed.
- Batch closeout may already have attempted merge and verify automatically.
  Surface pending tracker additions and closeout warnings explicitly instead of
  assuming the run already reached a clean final state.

### Potential Challenges

- Result sidecars may be missing, malformed, or stale:
  fall back to `batch-state.tsv` for coarse row state and mark item detail
  degraded instead of fabricating warnings or artifacts.
- Repeated action clicks may enqueue overlapping work:
  use in-flight action keys and accepted-vs-already-queued responses to keep
  action semantics idempotent at the route level.
- Mixed historical and active runs can make the latest batch state ambiguous:
  prefer active `batch-evaluation` sessions first, then the most recently
  updated completed or failed session with deterministic ordering.

### Relevant Considerations

- [P04] **Review-focus contract drift**: Keep batch item detail, action
  availability, and selected-item state backend-owned so Session 04 does not
  infer workflow state from multiple sources.
- [P04-apps/api] **Markdown parser fragility**: Coordinate batch input, state,
  and result-sidecar parsing with fixture-backed tests and explicit input
  errors.
- [P04] **Bounded parity payloads**: Cap item previews and selected detail so
  polling remains fast and payloads do not grow into raw artifact readers.
- [P04] **Read-only browser boundary**: Keep batch file reads plus merge and
  verify controls backend-owned and fail-closed.
- [P04] **Bounded read models**: Reuse one typed summary per surface so the
  browser stays simple and contract drift surfaces early.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Duplicate action submissions enqueue overlapping resume, retry, merge, or
  verify work.
- Active batch runs lose explicit waiting or approval state and appear idle or
  complete too early.
- Partial-result detail degrades into generic failure messaging when result
  sidecars or checkpoint context drift.

---

## 9. Testing Strategy

### Unit Tests

- Parse `batch/batch-input.tsv` and `batch/batch-state.tsv` into deterministic
  draft and item-matrix models
- Parse `batch/logs/*.result.json` into warning, legitimacy, and artifact
  detail while handling missing or malformed result files safely
- Overlay runtime session, job, checkpoint, and approval state onto batch
  items and top-level summary state
- Derive action availability and warning classification for draft, retryable,
  waiting, and merge-warning scenarios

### Integration Tests

- Exercise GET batch-supervisor summaries through the HTTP harness for draft,
  running, waiting, retryable-failed, partial-warning, and closeout-warning
  states
- Exercise POST batch-supervisor actions for run-pending resume, retry-failed,
  merge, and verify requests, including invalid input, already-running guards,
  and warning pass-through

### Manual Testing

- Start from a draft-only batch input and confirm the summary exposes draft
  counts, selected item detail, and a safe run-pending control
- Resume or retry a batch with failed and partial rows and confirm counts,
  warnings, and selected-item detail refresh correctly
- Trigger merge and verify after completed or partial rows and confirm closeout
  warnings stay explicit

### Edge Cases

- Missing `batch/batch-input.tsv` or `batch/batch-state.tsv`
- Malformed or missing result sidecars for otherwise completed items
- Retryable infrastructure failures mixed with completed, partial, or skipped
  rows
- Approval-paused or waiting batch sessions with stale selected-item focus
- Duplicate action submissions while a prior action is still in flight

---

## 10. Dependencies

### External Libraries

- `zod`: existing validation and contract parsing
- Node.js standard library modules for file and path handling

### Other Sessions

- **Depends on**: `phase05-session02-scan-review-workspace`
- **Depended by**: `phase05-session04-batch-jobs-workspace-and-run-detail`
- **Depended by**: `phase05-session05-application-help-draft-contract`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
