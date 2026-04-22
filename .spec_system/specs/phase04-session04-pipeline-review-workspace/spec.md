# Session Specification

**Session ID**: `phase04-session04-pipeline-review-workspace`
**Phase**: 04 - Evaluation, Artifacts, and Tracker Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 04 Session 03 completed the report viewer, but the operator still cannot
review the live pipeline queue inside the app. `data/pipeline.md` remains a
markdown-only surface for pending and processed opportunities, so the operator
cannot filter or sort rows, inspect a selected queue item, or move directly
from evaluation closeout into the queue that Session 05 and Session 06 depend
on.

This session adds a bounded read model for the pipeline workspace without
widening browser access. The backend should parse `data/pipeline.md`, expose
shortlist context plus pending and processed row summaries, resolve processed
rows to their report and PDF artifacts when possible, and classify warning
states that matter during review. The browser should consume that one typed
summary through a new pipeline shell surface with filter, sort, selection, and
report-viewer handoff behavior.

The result gives Phase 04 a real queue-review surface inside the shell. Session
05 can build tracker maintenance on top of a stable pipeline read model, and
Session 06 can close full auto-pipeline parity without queue review still
living in raw markdown.

---

## 2. Objectives

1. Add a typed, read-only pipeline-review contract that exposes shortlist
   context, pending and processed row previews, selected detail, and warning or
   artifact signals through one bounded API route.
2. Add a dedicated pipeline shell surface that supports filter, sort, row
   selection, and explicit loading, empty, offline, and stale-selection states.
3. Wire review-ready evaluation handoff into the new pipeline workspace through
   URL-backed report-number or URL focus and existing report-viewer link-out
   patterns.
4. Add API and browser coverage for pipeline parsing, processed-row artifact
   enrichment, invalid query handling, and stale or missing selection behavior.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session04-scan-pipeline-and-batch-tools` - provides the
      canonical pipeline file ownership and queue-processing semantics this
      session must render without changing.
- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell frame and navigation registry that the pipeline workspace
      extends.
- [x] `phase04-session01-evaluation-result-contract` - provides typed closeout,
      report-number, score, and warning signals used to hand off into queue
      review.
- [x] `phase04-session02-evaluation-console-and-artifact-handoff` - provides
      the evaluation artifact rail that should open the pipeline workspace once
      closeout is review-ready.
- [x] `phase04-session03-report-viewer-and-artifact-browser` - provides the
      report-viewer handoff target and read-only artifact patterns the pipeline
      surface should reuse.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic routing, no-new-dependency
  expectations, and bounded API behavior
- `.spec_system/CONSIDERATIONS.md` for thin-browser rules, payload limits, and
  parser or fixture drift risks
- `.spec_system/SECURITY-COMPLIANCE.md` for the current no-new-write-path
  posture that this read-only surface must preserve
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_04/PRD_phase_04.md` for pipeline review and
  operator-loop parity requirements
- `apps/api/src/workspace/workspace-contract.ts` and `data/pipeline.md` for
  canonical pipeline surface ownership and live markdown structure
- `apps/api/src/server/report-viewer-summary.ts` and
  `apps/api/src/server/report-viewer-contract.ts` for report-number to artifact
  resolution and header extraction patterns
- `apps/web/src/chat/evaluation-artifact-rail.tsx`,
  `apps/web/src/chat/chat-console-surface.tsx`, and
  `apps/web/src/reports/report-viewer-client.ts` for handoff and focus patterns
- `apps/web/src/shell/` for surface registration, navigation, and shell-owned
  frame composition

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`,
  `npm run app:api:test:runtime`, `npm run app:web:check`, and
  `npm run app:web:build` available from the repo root
- Existing runtime HTTP harness and browser smoke harness available under
  `apps/api/src/server/http-server.test.ts` and `scripts/`
- `node scripts/test-all.mjs --quick` available for repo-level regressions

---

## 4. Scope

### In Scope (MVP)

- Add one read-only API route for pipeline review that parses `data/pipeline.md`
  into shortlist context, pending rows, processed rows, and selected detail.
- Support bounded filter, sort, pagination, and selection state for queue
  review.
- Resolve processed rows to report and PDF artifact availability when the repo
  contains matching checked-in artifacts.
- Classify review warnings for missing artifacts, stale selection, low-score
  rows, and caution or suspicious legitimacy states without inventing tracker
  mutation state.
- Add a dedicated shell surface for queue review and wire review-ready
  evaluation handoff into it.
- Link selected processed rows into the existing report-viewer surface when a
  checked-in report is available.
- Add API and browser coverage for missing pipeline data, invalid queries,
  parsed queue states, and stale focus handling.

### Out of Scope (Deferred)

- Tracker status edits, merge, verify, normalize, or dedup actions - _Reason:
  Session 05 owns tracker maintenance and mutation paths._
- Queue-processing launches, scan orchestration, batch retries, or job controls
  - _Reason: this session is read-only review, not workflow execution._
- PDF rendering or browser-owned file serving - _Reason: this session exposes
  PDF readiness and paths, not a general artifact host._
- Rewriting the pipeline markdown contract or replacing `data/pipeline.md` as
  the user-layer source of truth - _Reason: the app must render the existing
  contract, not invent a new one._

---

## 5. Technical Approach

### Architecture

Add a new read-only pipeline-review server module in `apps/api/src/server/`
that reads the canonical `pipelineInbox` workspace surface and translates the
markdown into a bounded queue summary. The route should parse shortlist
metadata, pending rows, and processed rows; support selection by report number
or URL; and expose only a limited page of row previews plus one selected-detail
payload. Processed rows should attempt to reconcile report artifacts by report
number, then derive score, legitimacy, verification, and PDF availability from
the matched report header when present.

The browser should gain a new `apps/web/src/pipeline/` package with strict
payload parsing, URL-backed focus helpers, a list-plus-detail hook, and a new
pipeline shell surface. Focus state should live in search params plus the new
`#pipeline` shell hash so the workspace can be refreshed, deep-linked, and
re-entered deterministically. The surface should render shortlist context,
bounded queue rows, explicit detail panels, warning chips, and report-viewer
link-out behavior without parsing markdown in React.

Handoff behavior should reuse existing shell conventions. When an evaluation
closeout becomes review-ready, the chat artifact rail should open the pipeline
surface with report-number focus when available. When a selected pipeline row
has a report artifact, the surface should open the existing report-viewer
surface instead of inventing a second report renderer. No new write paths, job
launch paths, or tracker mutations should be added in this session.

### Design Patterns

- Markdown-to-read-model parser: convert the canonical pipeline markdown into
  typed queue previews without exposing raw document parsing to the browser.
- List-plus-detail contract: keep queue payloads bounded while pairing them
  with one selected-detail summary.
- Report-number reconciliation: resolve processed rows to report artifacts
  through deterministic report-number matching before reading headers.
- URL-backed focus handoff: preserve section, sort, selection, and pagination
  across refresh and navigation without hidden browser-only state.
- Strict parser boundary: fail closed on payload drift before React renders
  partial queue data.
- Thin browser surface: keep parsing, artifact resolution, and warning
  classification in the API layer.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- TypeScript Node server modules in `apps/api`
- Existing `zod` route-validation patterns
- Existing workspace surface registry and repo-path helpers in `apps/api`
- Existing report-viewer header parsing patterns in `apps/api/src/server/`
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/server/pipeline-review-contract.ts` | Define queue filters, row-preview and selected-detail payloads, artifact states, and warning shapes | ~240 |
| `apps/api/src/server/pipeline-review-summary.ts` | Parse pipeline markdown, reconcile processed rows to artifacts, and build the bounded queue summary | ~420 |
| `apps/api/src/server/routes/pipeline-review-route.ts` | Expose the GET-only pipeline-review endpoint with query validation | ~120 |
| `apps/web/src/pipeline/pipeline-review-types.ts` | Define strict parser helpers and typed pipeline-review payloads for the browser | ~240 |
| `apps/web/src/pipeline/pipeline-review-client.ts` | Fetch pipeline summaries and manage URL-backed pipeline focus | ~200 |
| `apps/web/src/pipeline/use-pipeline-review.ts` | Coordinate queue refresh, selection, filter, sort, and focus cleanup | ~240 |
| `apps/web/src/pipeline/pipeline-review-surface.tsx` | Render shortlist context, queue rows, selected detail, and explicit state handling | ~360 |
| `scripts/test-app-pipeline-review.mjs` | Browser smoke coverage for pipeline navigation, selection, filtering, and report-viewer handoff | ~260 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/server/routes/index.ts` | Register the pipeline-review route in deterministic order | ~20 |
| `apps/api/src/server/http-server.test.ts` | Add runtime-contract coverage for parsed queue states, invalid queries, and artifact or warning enrichment | ~280 |
| `apps/web/src/shell/shell-types.ts` | Register the new pipeline surface and keep shell parsing deterministic | ~80 |
| `apps/web/src/shell/navigation-rail.tsx` | Add navigation copy and badge handling for the pipeline surface | ~90 |
| `apps/web/src/shell/surface-placeholder.tsx` | Keep shell placeholder handling exhaustive after the new surface is added | ~40 |
| `apps/web/src/shell/operator-shell.tsx` | Render the pipeline workspace and expose shared open-pipeline or open-report callbacks | ~140 |
| `apps/web/src/chat/chat-console-surface.tsx` | Thread the pipeline handoff callback into the evaluation artifact rail | ~50 |
| `apps/web/src/chat/evaluation-artifact-rail.tsx` | Turn pipeline review from deferred copy into a real in-app handoff | ~110 |
| `apps/web/src/chat/evaluation-result-types.ts` | Extend handoff intent typing with pipeline-focus metadata | ~50 |
| `scripts/test-app-chat-console.mjs` | Update chat-console smoke expectations for live pipeline handoff | ~80 |
| `scripts/test-app-shell.mjs` | Update shell smoke coverage for the new pipeline surface | ~60 |
| `scripts/test-all.mjs` | Add the new pipeline-review smoke script and ASCII coverage to quick regressions | ~40 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operators can review pending and processed pipeline entries inside the app
      without opening `data/pipeline.md` directly.
- [ ] Selected pipeline detail shows row state, score, legitimacy, report or
      PDF availability, and warning signals when the row has processed
      artifacts.
- [ ] Queue filters, sorting, and selection remain explicit and deterministic
      across refresh and navigation.
- [ ] Review-ready evaluation closeout can open the pipeline workspace with a
      matching processed row in focus when report metadata is available.
- [ ] Selected processed rows can hand off into the existing report-viewer
      surface when a checked-in report exists.

### Testing Requirements

- [ ] HTTP runtime-contract tests cover missing pipeline data, invalid query
      rejection, parsed pending and processed rows, selected-detail resolution,
      and warning classification.
- [ ] Browser smoke coverage covers pipeline surface navigation, filter and
      sort behavior, selected-detail rendering, evaluation handoff, and
      report-viewer link-out behavior.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, `npm run app:web:check`,
      `npm run app:web:build`, `node scripts/test-app-pipeline-review.mjs`,
      and `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] All route inputs are schema-validated and payload sizes remain bounded.
- [ ] The browser never parses pipeline markdown or reads repo files directly.
- [ ] Processed-row artifact reads stay constrained to canonical report and
      output paths.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Browser parser types stay aligned with the route contract
- [ ] Missing pipeline, stale-selection, and missing-artifact states are
      explicit in both API and UI

---

## 8. Implementation Notes

### Key Considerations

- Treat `data/pipeline.md` as the canonical queue source. The app should render
  it, not replace it.
- Pending rows and processed rows do not carry the same metadata. The summary
  must remain explicit about which signals are unavailable for pending items.
- Warning state should derive from repo-visible facts such as score, report
  presence, PDF presence, legitimacy, and stale focus. Do not invent tracker
  mutation state or liveness claims the queue does not prove.

### Potential Challenges

- Heterogeneous markdown sections: use strict section parsing and explicit empty
  or missing-section behavior instead of best-effort guesses.
- Stale evaluation handoff: if report-number focus does not match a pipeline
  row yet, surface an explicit no-match state rather than silently selecting a
  different row.
- Artifact drift: processed rows may reference reports with missing PDFs or
  deleted files, so enrichment must degrade to warnings instead of failing the
  entire queue payload.

### Relevant Considerations

- [P00-apps/api] **Workspace registry coupling**: Read pipeline and artifact
  surfaces through registry-owned helpers instead of ad hoc path checks.
- [P03-apps/web] **Frontend parser and fixture drift**: Update backend summary,
  browser parser, and smoke fixtures together.
- [P03-apps/web] **Bounded polling payloads**: Keep queue previews and selected
  detail split so the shell does not poll unbounded payloads.
- [P03-apps/web] **Strict payload parsing**: Fail closed when the queue
  contract drifts instead of rendering partial or inconsistent state.
- [P03-apps/web+apps/api] **Shell-wide refresh reuse**: Reuse shared shell and
  focus patterns rather than creating isolated pipeline-only state machines.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:
- Selection drift after filter, sort, or refresh causes the operator to review
  the wrong row.
- Processed rows show false-ready artifact state because report-number matching
  or PDF verification is wrong.
- Empty, offline, or stale-selection states collapse into blank UI and hide the
  next useful review action.

---

## 9. Testing Strategy

### Unit Tests

- Queue-section parsing for shortlist, pending, and processed sections
- Processed-row artifact enrichment and report-number matching
- Warning classification for low-score, missing-artifact, and caution or
  suspicious legitimacy states
- Browser parser validation and focus-helper normalization

### Integration Tests

- HTTP route validation for filter, sort, selection, and bounded pagination
- Selected-detail resolution for report-number and URL focus inputs
- Shell and chat handoff plumbing for pipeline navigation

### Manual Testing

- Open the pipeline surface from shell navigation and verify shortlist context
- Filter and sort queue rows, then confirm selected detail stays deterministic
- Open a processed row with a ready report and hand off into the report viewer
- Trigger review-ready evaluation handoff from chat and confirm the pipeline
  surface opens with the expected row focused

### Edge Cases

- Missing `data/pipeline.md` or missing `## Pending` or `## Processed` sections
- Duplicate URLs or processed rows without a matching report artifact
- Processed rows with `PDF: not generated` or deleted PDF files
- Evaluation handoff report number that does not yet exist in the pipeline
- Low-score rows and caution or suspicious legitimacy states that should remain
  browseable but clearly warned

---

## 10. Dependencies

### External Libraries

- React 19 and the existing TypeScript workspace toolchain
- `zod` for query validation
- No new dependencies

### Other Sessions

- **Depends on**: `phase02-session04-scan-pipeline-and-batch-tools`,
  `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase04-session01-evaluation-result-contract`,
  `phase04-session02-evaluation-console-and-artifact-handoff`,
  `phase04-session03-report-viewer-and-artifact-browser`
- **Depended by**: `phase04-session05-tracker-workspace-and-integrity-actions`,
  `phase04-session06-auto-pipeline-parity-and-regression`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
