# Session Specification

**Session ID**: `phase04-session06-auto-pipeline-parity-and-regression`
**Phase**: 04 - Evaluation, Artifacts, and Tracker Parity
**Status**: Complete
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 04 Sessions 01-05 established the evaluation-result contract plus the
report, pipeline, and tracker review surfaces, but the main auto-pipeline path
is still not fully app-owned. Raw JD launches and live job-URL launches both
enter the shell, yet the runtime still treats their origin too generically:
launch context is not normalized for parity, liveness and extraction facts are
not surfaced as first-class review signals, and cross-surface handoff still
depends on partial browser inference instead of one backend-owned focus model.

This session closes that gap from the API boundary outward. The backend should
sanitize evaluation launch context so raw JD text never becomes durable session
metadata, preserve canonical URL metadata when the request really is a live
posting, and extend the evaluation-result summary with input provenance,
verification status, and one deterministic review-focus envelope for report,
pipeline, and tracker follow-through. The existing browser surfaces should
consume those explicit signals instead of guessing from prompt text, artifact
paths, or incomplete local state.

Once this session lands, Phase 04 can exit cleanly. The main JD and live-URL
auto-pipeline paths will both produce explicit report, PDF, tracker, and
verification state; pipeline and tracker handoffs will land on the correct
review target; and the parity slice will be protected by dedicated regression
coverage instead of optimism.

---

## 2. Objectives

1. Normalize and sanitize `auto-pipeline` launch context so raw JD requests do
   not persist prompt bodies while live job URLs preserve canonical source
   metadata for downstream review focus.
2. Extend the evaluation-result contract with backend-owned input provenance,
   liveness or extraction verification, and report, pipeline, or tracker review
   focus for raw JD and live-URL sessions.
3. Wire the existing report, pipeline, and tracker surfaces to consume that
   review-focus contract without browser-side prompt parsing or path inference.
4. Add regression coverage for raw JD and live-URL auto-pipeline flows,
   including degraded closeout, pending tracker additions, and phase-exit quick
   gates.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase04-session01-evaluation-result-contract` - provides the bounded
      evaluation-result route that this session extends with verification and
      review-focus signals.
- [x] `phase04-session02-evaluation-console-and-artifact-handoff` - provides
      the artifact rail and evaluation-shell patterns that must now consume
      backend-owned parity signals.
- [x] `phase04-session03-report-viewer-and-artifact-browser` - provides the
      report-review surface and focus handoff path that parity must target.
- [x] `phase04-session04-pipeline-review-workspace` - provides report-number
      and URL-based queue review that the evaluation handoff should reuse.
- [x] `phase04-session05-tracker-workspace-and-integrity-actions` - provides
      tracker review, pending TSV summaries, and maintenance actions that the
      auto-pipeline closeout must now hand off into directly.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic contracts, bounded payloads,
  no-new-dependency expectations, and repo-level regression gates
- `.spec_system/CONSIDERATIONS.md` for parser drift, mutation guardrails,
  bounded polling, and thin-browser guidance
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  requirement to avoid persisting raw JD text or widening workspace access
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_04/PRD_phase_04.md` for end-to-end evaluation,
  artifact, and tracker parity requirements
- `apps/api/src/orchestration/` for launch or resume routing, session context,
  and authenticated runtime bootstrap behavior
- `apps/api/src/server/evaluation-result-summary.ts` and
  `apps/api/src/server/tracker-workspace-summary.ts` for the current read-model
  seams that need parity alignment
- `apps/api/src/tools/evaluation-intake-tools.ts`,
  `apps/api/src/tools/liveness-check-tools.ts`, and
  `apps/api/src/tools/evaluation-artifact-tools.ts` for the canonical ATS,
  liveness, report, PDF, and tracker semantics this session must surface
- `apps/web/src/chat/`, `apps/web/src/pipeline/`, and `apps/web/src/tracker/`
  for the shell surfaces that should consume backend-owned review focus
- `scripts/test-app-chat-console.mjs`, `scripts/test-app-shell.mjs`, and
  `scripts/test-all.mjs` for browser and repo-level regression wiring

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`,
  `npm run app:api:test:runtime`, `npm run app:api:test:orchestration`, and
  `npm run app:api:test:tools` available from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- Existing runtime HTTP harness and browser smoke harness available under
  `apps/api/src/server/http-server.test.ts` and `scripts/`
- `node scripts/test-all.mjs --quick` available for repo-level phase-exit
  regressions

---

## 4. Scope

### In Scope (MVP)

- Normalize `auto-pipeline` launch context into raw JD versus live-URL input
  provenance and persist only safe, review-relevant metadata.
- Prevent raw JD text from being stored in session context, evaluation-result
  summaries, or related diagnostics payloads.
- Extend evaluation-result summaries with verification state for live job URLs
  and one backend-owned review-focus envelope for report, pipeline, and tracker
  follow-through.
- Extend tracker review to accept report-number handoff and resolve it against
  an existing tracker row or a pending TSV addition when the closeout has not
  merged yet.
- Reuse the existing report-viewer and pipeline-review focus models instead of
  inventing new surface-specific inference rules.
- Add raw JD and live-URL regression coverage for happy-path and degraded
  closeout behavior, including missing PDF or tracker artifacts and pending
  tracker additions.

### Out of Scope (Deferred)

- Scan, batch, and application-help parity work - _Reason: Phase 05 owns those
  workflow families._
- New browser-owned artifact serving or PDF rendering surfaces - _Reason: this
  session aligns closeout and handoff, not new artifact-hosting behavior._
- Replacing the current specialist topology or introducing a second evaluation
  execution path - _Reason: parity should reuse the existing evaluation
  specialist and typed tool surface._
- Dashboard retirement, specialist workflow expansion, or cutover planning -
  _Reason: those are reserved for Phase 06._

---

## 5. Technical Approach

### Architecture

Add a small orchestration-side normalization layer in `apps/api/src/orchestration/`
for evaluation launches. That helper should inspect the launch context for
`single-evaluation` and `auto-pipeline`, classify the request as raw JD text or
job URL, canonicalize live URLs, and emit only safe metadata for persistence.
Raw JD sessions should keep enough provenance to distinguish the flow, but they
must not store prompt bodies or copy user-provided JD content into durable
session context.

Extend the evaluation-result contract in `apps/api/src/server/` with explicit
input provenance, verification summary, and review-focus fields. The summary
builder should combine sanitized session context with job result, checkpoint,
artifact, and warning signals to produce one typed closeout envelope that says
what the input was, what verification was attempted or observed, and where the
operator should land next for report, pipeline, or tracker review. The browser
should not infer those destinations from prompt text or artifact paths.

Tracker parity should stay bounded and deterministic. The tracker workspace
already understands merged tracker rows plus pending TSV additions, so this
session should extend that summary with report-number-based focus and pending
addition matching rather than inventing a second tracker handoff surface. When
the evaluation closeout only has a staged tracker TSV, the tracker surface
should still show the correct pending addition rather than forcing the user to
search manually.

The browser changes should be thin. Chat, shell, and tracker clients should
parse the new contract, render explicit verification and handoff states, and
route to the existing report, pipeline, and tracker surfaces using backend-
owned focus data. Regression coverage should center on one raw JD path and one
live-URL path so Phase 04 ends with a stable parity slice instead of many
partial assumptions.

### Design Patterns

- Sanitized launch context: persist workflow-relevant metadata, not raw prompt
  bodies
- Backend-owned review focus: derive one canonical handoff target in the API
  and reuse it across surfaces
- Verification-first closeout: treat URL liveness and extraction status as
  first-class review signals instead of hidden implementation detail
- Pending-addition aware tracker handoff: resolve report-number focus against
  merged tracker rows and staged TSVs before the browser renders
- Phase-exit parity slice: lock one raw JD path and one live-URL path with
  dedicated regression tests

### Technology Stack

- TypeScript Node server modules in `apps/api`
- React 19 with TypeScript in `apps/web`
- Existing `zod` route-validation and browser parser patterns
- Existing orchestration, evaluation-result, pipeline-review, and
  tracker-workspace route modules
- Existing Playwright-backed browser smoke harness under `scripts/`
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                      | Purpose                                                                                                                          | Est. Lines |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/orchestration/evaluation-launch-context.ts` | Normalize evaluation launch input into safe raw-JD or job-URL provenance without persisting prompt bodies                        | ~180       |
| `apps/api/src/server/evaluation-review-focus.ts`          | Derive verification state and backend-owned report, pipeline, and tracker review focus from session context plus runtime signals | ~260       |
| `scripts/test-app-auto-pipeline-parity.mjs`               | Browser smoke coverage for raw JD and live-URL auto-pipeline parity across report, pipeline, and tracker handoffs                | ~260       |

### Files to Modify

| File                                                       | Changes                                                                                    | Est. Lines |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| `apps/api/src/orchestration/orchestration-contract.ts`     | Add typed evaluation launch-context metadata shapes used by session lifecycle and tests    | ~80        |
| `apps/api/src/orchestration/session-lifecycle.ts`          | Persist sanitized evaluation launch metadata instead of raw prompt text                    | ~140       |
| `apps/api/src/server/evaluation-result-contract.ts`        | Add input-provenance, verification, and review-focus contract shapes                       | ~140       |
| `apps/api/src/server/evaluation-result-summary.ts`         | Populate the new parity fields from sanitized context, runtime signals, and artifact state | ~260       |
| `apps/api/src/server/tracker-workspace-contract.ts`        | Add report-number handoff and pending-addition focus shapes                                | ~120       |
| `apps/api/src/server/tracker-workspace-summary.ts`         | Resolve report-number tracker focus against merged rows and staged TSV additions           | ~220       |
| `apps/api/src/server/routes/tracker-workspace-route.ts`    | Accept and validate report-number tracker handoff queries                                  | ~60        |
| `apps/api/src/server/http-server.test.ts`                  | Add raw JD and live-URL parity coverage for evaluation-result and tracker-workspace routes | ~360       |
| `apps/api/src/orchestration/session-lifecycle.test.ts`     | Cover raw-JD redaction and canonical URL metadata persistence                              | ~180       |
| `apps/api/src/orchestration/orchestration-service.test.ts` | Cover sanitized launch context through ready and blocked evaluation handoffs               | ~140       |
| `apps/api/src/tools/liveness-check-tools.test.ts`          | Lock the liveness-summary states used by the new parity contract                           | ~120       |
| `apps/web/src/chat/evaluation-result-types.ts`             | Parse input-provenance, verification, and review-focus fields in the browser               | ~120       |
| `apps/web/src/chat/evaluation-artifact-rail.tsx`           | Render verification state and tracker handoff from backend-owned review focus              | ~160       |
| `apps/web/src/chat/chat-console-surface.tsx`               | Thread tracker handoff callbacks through the chat surface                                  | ~40        |
| `apps/web/src/tracker/tracker-workspace-types.ts`          | Parse tracker report-number focus and pending-addition detail                              | ~120       |
| `apps/web/src/tracker/tracker-workspace-client.ts`         | Sync report-number tracker focus into URL-backed shell state                               | ~120       |
| `apps/web/src/tracker/use-tracker-workspace.ts`            | Reconcile report-number tracker focus, refresh, and selection state                        | ~100       |
| `apps/web/src/tracker/tracker-workspace-surface.tsx`       | Render pending-addition focus and explicit auto-pipeline closeout review notices           | ~160       |
| `apps/web/src/shell/operator-shell.tsx`                    | Wire tracker handoff alongside existing report and pipeline handoffs                       | ~40        |
| `scripts/test-app-chat-console.mjs`                        | Extend chat smoke fixtures and assertions for verification and tracker handoff             | ~120       |
| `scripts/test-app-shell.mjs`                               | Extend shell smoke coverage for tracker handoff re-entry                                   | ~60        |
| `scripts/test-all.mjs`                                     | Add Session 06 parity smoke and ASCII coverage to the quick regression gate                | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Auto-pipeline launches persist sanitized input provenance that
      distinguishes raw JD text from live job URLs without storing raw prompt
      bodies in durable session context.
- [ ] Evaluation-result summaries expose explicit input provenance, verification
      state, and backend-owned review focus for report, pipeline, and tracker
      follow-through.
- [ ] Live-URL auto-pipeline runs can hand off deterministically to pipeline
      review and tracker review using canonical report-number or URL focus.
- [ ] Raw JD auto-pipeline runs remain review-ready without fabricating URL or
      liveness state they do not have.
- [ ] Tracker handoff can land on an existing tracker row or a matching pending
      TSV addition when the closeout has not merged yet.

### Testing Requirements

- [ ] Session-lifecycle and orchestration tests cover raw-JD redaction,
      canonical URL metadata persistence, and unchanged behavior for
      non-evaluation workflows.
- [ ] HTTP runtime-contract tests cover raw JD and live-URL evaluation-result
      summaries, degraded closeout, tracker report-number focus, and pending
      TSV selection.
- [ ] Browser smoke coverage covers raw JD and live-URL artifact handoff into
      report, pipeline, and tracker surfaces.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, `npm run app:api:test:orchestration`,
      `npm run app:api:test:tools`, `npm run app:web:check`,
      `npm run app:web:build`, `node scripts/test-app-auto-pipeline-parity.mjs`,
      and `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Raw JD or prompt text is not persisted in session context,
      evaluation-result payloads, or related diagnostics read models.
- [ ] Browser surfaces do not infer review focus from prompt text or local
      filesystem inspection.
- [ ] Tracker and evaluation payloads remain bounded and deterministic.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Verification and review-focus semantics remain backend-owned and
      test-covered
- [ ] Phase 04 exits without unresolved parity gaps in the main auto-pipeline
      path

---

## 8. Implementation Notes

### Key Considerations

- The current launch flow already sends `promptText` through the orchestration
  request. This session should preserve launch behavior while preventing raw JD
  text from becoming durable session state.
- Verification state should stay factual and bounded. Report only what the
  runtime or typed tools prove for live URLs; raw JD sessions should remain
  explicit about not having URL verification.
- Review-focus logic belongs in the API because report-number matching, URL
  canonicalization, tracker pending-addition matching, and artifact readiness
  are all repo-owned concerns.

### Potential Challenges

- Redacting raw JD text without breaking resume or review flows: mitigate with
  a dedicated launch-context normalizer that stores only safe metadata.
- Matching tracker handoff when the closeout is staged but not merged: mitigate
  with report-number focus against both parsed tracker rows and pending TSV
  additions.
- Contract drift across API, browser parsers, and smoke fixtures: mitigate with
  strict types, dedicated parity fixtures, and quick-suite registration in the
  same session.

### Relevant Considerations

- [P00] **Prompt and boot contract drift**: keep the new parity fields aligned
  with smoke fixtures and quick-suite registration whenever the launch or
  result contracts change.
- [P02-apps/api] **Tool catalog drift**: verification and artifact signals
  should still derive from the existing evaluation and tracker tool surfaces,
  not a parallel execution path.
- [P03-apps/web] **Frontend parser and fixture drift**: update the strict chat
  and tracker parsers together with backend payload changes.
- [P03-apps/web] **Bounded polling payloads**: keep evaluation and tracker
  payloads list-plus-detail and avoid shipping raw session context or file
  bodies.
- [P03-apps/web+apps/api] **Interaction race guards**: tracker handoff and
  refresh behavior must stay deterministic when evaluation closeout and tracker
  state change close together.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- Auto-pipeline review handoff lands on the wrong pipeline row or tracker item
  because report-number or URL focus is derived differently in each surface.
- Raw JD prompt text leaks into stored session context or API read models while
  trying to preserve input provenance.
- Degraded closeout looks complete because verification or missing-artifact
  states are hidden behind a generic completed badge.

---

## 9. Testing Strategy

### Unit Tests

- Evaluation launch-context normalization for raw JD text versus live job URLs
- Review-focus derivation for report, pipeline, and tracker destinations
- Tracker pending-addition parsing and report-number focus resolution
- Browser parser validation for the new evaluation-result and tracker fields

### Integration Tests

- Orchestration launch or resume flows that verify sanitized context
  persistence
- Evaluation-result route summaries for raw JD, live URL, completed, degraded,
  and unsupported verification states
- Tracker-workspace route behavior for report-number focus, staged TSV
  selection, and stale focus handling

### Manual Testing

- Launch one raw JD auto-pipeline run and confirm report, pipeline, and tracker
  review states remain explicit without any fabricated URL verification data.
- Launch one live job-URL auto-pipeline run and confirm the evaluation surface
  shows verification state plus deterministic handoff into pipeline and tracker
  review.
- Re-open tracker review from an evaluation result with only a staged TSV and
  confirm the pending addition is visible without manual search.

### Edge Cases

- Raw JD launches with no URL or report number yet
- Live job-URL runs where liveness is uncertain, expired, or offline
- Degraded closeout with report ready but PDF or tracker artifact missing
- Tracker handoff before merge and verify has created a canonical
  `data/applications.md` row
- Re-entry into report, pipeline, or tracker surfaces after refresh or manual
  closeout actions

---

## 10. Dependencies

### External Libraries

- `zod`: existing route validation and parser boundary in `apps/api` and
  `apps/web`
- `react`: existing shell surface runtime in `apps/web`
- Existing repo-owned Playwright smoke harness in `scripts/`
- No new dependencies

### Other Sessions

- **Depends on**: `phase04-session01-evaluation-result-contract`,
  `phase04-session02-evaluation-console-and-artifact-handoff`,
  `phase04-session03-report-viewer-and-artifact-browser`,
  `phase04-session04-pipeline-review-workspace`,
  `phase04-session05-tracker-workspace-and-integrity-actions`
- **Depended by**: Phase 05 session planning and phase-exit workflow steps

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
