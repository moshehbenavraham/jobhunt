# Session Specification

**Session ID**: `phase05-session05-application-help-draft-contract`
**Phase**: 05 - Scan, Batch, and Application-Help Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 05 Sessions 01-04 established bounded scan and batch contracts plus the
browser workspaces that consume them, but `application-help` is still blocked
at the API boundary. The repo already has `modes/apply.md`, saved reports,
tailored PDF artifacts, approval runtime, and resumable session records, yet
the app cannot expose report-backed draft answers, warnings, or review state
through one canonical summary. Session 06 cannot build the shell experience
until that backend contract exists.

This session makes application-help app-owned in `apps/api`. The backend
should add typed tools that can locate the best matching report and PDF
context, extract any saved draft-answer section, and persist structured
application-help draft packets into app-owned state instead of leaving draft
content buried in chat text. A new summary route should then join those draft
packets with application-help session, job, approval, and failure state from
the operational store so the browser can review one bounded payload.

The no-submit boundary is the core constraint. Candidate-facing outputs must
remain explicit drafts for human review, cover letters must stay manual follow-
up until the checked-in cover-letter flow exists, and approval or rejection
state must remain visible and resumable instead of hiding in logs. Once this
session lands, Session 06 can render application-help inside the shell on one
stable API contract and a ready specialist route.

---

## 2. Objectives

1. Add a typed application-help tool surface that resolves report-backed role
   context and persists structured draft packets in app-owned state.
2. Add one bounded application-help summary contract that exposes matched
   report and PDF context, latest draft packet, warnings, next-review
   guidance, and resumable run state for the selected or latest session.
3. Promote `application-help` from tooling-gap to ready specialist routing by
   wiring the new tools into the research specialist catalog without widening
   the no-submit boundary.
4. Add API and tool coverage for missing-context, draft-ready, approval-
   paused, rejected, resumed, and completed application-help outcomes so
   Session 06 can build UI on stable backend semantics.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session02-chat-console-and-session-resume` - provides launch,
      resume, and recent-session semantics this summary must align with.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      approval visibility and resolution model application-help must surface.
- [x] `phase04-session02-evaluation-console-and-artifact-handoff` - provides
      the report and PDF artifact handoff patterns application-help should
      reuse instead of re-inventing.
- [x] `phase04-session06-auto-pipeline-parity-and-regression` - provides the
      current report-focus and artifact-review assumptions this session should
      preserve when matching reports.
- [x] `phase05-session03-batch-supervisor-contract` - proves the Phase 05
      pattern of one bounded review summary plus explicit warning and state
      semantics in `apps/api`.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic contracts, bounded payloads,
  no-new-dependency expectations, and repo-level validation gates
- `.spec_system/CONSIDERATIONS.md` for thin-browser rules, payload bounds,
  parser drift, and shared handoff expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  requirement to keep repo reads and candidate-facing state backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_05/PRD_phase_05.md` for Phase 05 application-help
  parity and approval-checkpoint requirements
- `modes/apply.md` for the live application-helper workflow contract and the
  no-submit rule for candidate-facing answers
- `docs/ongoing-projects/2026-04-17-cover-letter-support-gap.md` for the
  current manual-follow-up requirement when a form requests a cover letter
- `apps/api/src/orchestration/specialist-catalog.ts` and
  `apps/api/src/server/chat-console-summary.ts` for specialist readiness and
  workflow-launch messaging
- `apps/api/src/server/evaluation-result-summary.ts`,
  `apps/api/src/server/report-viewer-summary.ts`, and
  `apps/api/src/tools/evaluation-artifact-tools.ts` for report and PDF
  metadata patterns this session should reuse
- `apps/api/src/store/`, `apps/api/src/approval-runtime/`, and
  `apps/api/src/server/routes/` for session, job, approval, failure, and route
  composition patterns already used in the app

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`,
  `npm run app:api:test:runtime`, and `npm run app:api:test:tools` available
  from the repo root
- Existing HTTP runtime harness available in
  `apps/api/src/server/http-server.test.ts`
- Existing repo quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add typed tools that can match application-help input to saved reports and
  PDF artifacts, extract any saved `## H) Draft Application Answers` context,
  and persist structured draft packets in app-owned state.
- Add one GET application-help route that returns selected or latest session
  context, latest draft packet, approval or rejection state, warnings, and
  next-review guidance through a bounded summary.
- Surface explicit no-submit messaging, cover-letter manual-follow-up state,
  missing-context warnings, and resumable session status without exposing raw
  chat transcripts to the browser.
- Promote `application-help` to a ready specialist route with a minimal typed
  tool policy that supports report-backed draft generation.
- Cover missing-report, no-draft-yet, approval-paused, rejected, resumed, and
  completed states in automated tests.

### Out of Scope (Deferred)

- Application-help shell layout, launch form, draft review UI, and approval
  resolution UX - _Reason: Session 06 owns the browser surface._
- Generic specialist-workspace infrastructure for research, interview, or
  outreach flows - _Reason: those remain Phase 06 work._
- Automatic cover-letter generation or upload artifacts - _Reason: the
  checked-in cover-letter support gap is still unresolved._
- Tracker status mutation after the user confirms submission - _Reason: this
  session focuses on draft and review state, not post-submit mutations._
- Any browser-owned form filling or application submission behavior -
  _Reason: the no-submit rule remains absolute._

---

## 5. Technical Approach

### Architecture

Create a new `apps/api/src/tools/application-help-tools.ts` module with a
small typed surface for application-help. One tool should resolve report-backed
context from saved reports, report numbers, company or role hints, and output
PDF filenames. Another tool should persist structured draft packets under
`.jobhunt-app/application-help/` so candidate-facing draft state lives in
app-owned data instead of raw model transcripts or browser state. The tool
payloads should remain explicit about no-submit status, manual cover-letter
follow-up, and report provenance.

Create a new `apps/api/src/server/application-help-summary.ts` module plus a
`/application-help` route. The summary builder should select the focused or
latest `application-help` session, read its latest persisted draft packet,
overlay session, job, approval, and recent-failure state from the operational
store, and return one bounded payload for browser review. Session selection
must stay deterministic: explicit `sessionId` first, then the most recently
updated application-help session.

Specialist routing should become ready only after the typed tool surface
exists. Update the research specialist policy in
`apps/api/src/orchestration/specialist-catalog.ts` to allow the new
application-help tools plus the existing profile and artifact helpers, while
preserving the no-submit boundary and not widening write access beyond
app-state draft packets.

### Design Patterns

- App-owned draft packet store: persist candidate-facing draft state under
  `.jobhunt-app/` instead of deriving it from chat history
- Report-backed context lookup: match saved reports and PDF artifacts before
  the browser renders draft-review state
- Bounded session-plus-draft summary: return one focused session and one latest
  draft packet rather than unbounded transcript or event history
- Shared specialist-route ownership: flip `application-help` to ready through
  the existing specialist catalog instead of adding a parallel launch path
- Explicit no-submit messaging: keep draft status, manual cover-letter gaps,
  and review ownership visible in the contract itself

### Technology Stack

- TypeScript Node server modules in `apps/api`
- Existing `zod` validation and route patterns
- Existing workspace adapter and app-state mutation helpers
- Existing operational store repositories and approval runtime
- Existing Node test runner and repo quick regression gate
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                   | Purpose                                                                                               | Est. Lines |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/tools/application-help-tools.ts`         | Define typed report-context lookup and app-state draft-packet persistence tools for application-help  | ~340       |
| `apps/api/src/server/application-help-contract.ts`     | Define application-help summary, draft packet, warning, and next-review payload shapes                | ~260       |
| `apps/api/src/server/application-help-summary.ts`      | Build the bounded application-help summary from session state, approvals, failures, and draft packets | ~420       |
| `apps/api/src/server/routes/application-help-route.ts` | Expose the GET application-help endpoint with bounded query validation                                | ~140       |
| `apps/api/src/tools/application-help-tools.test.ts`    | Lock tool inputs, report matching, section extraction, and app-state draft-packet behavior            | ~280       |
| `apps/api/src/server/application-help-summary.test.ts` | Lock summary composition for missing-context, approval, rejection, resume, and completed states       | ~260       |

### Files to Modify

| File                                                    | Changes                                                                                        | Est. Lines |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/tools/default-tool-suite.ts`              | Register the new application-help tools in the default API tool suite                          | ~20        |
| `apps/api/src/tools/index.ts`                           | Export the new application-help tool module through the tools barrel                           | ~20        |
| `apps/api/src/orchestration/specialist-catalog.ts`      | Promote `application-help` to ready and define its allowed typed tool surface                  | ~80        |
| `apps/api/src/orchestration/specialist-catalog.test.ts` | Cover ready routing and tool catalog output for application-help                               | ~60        |
| `apps/api/src/server/routes/index.ts`                   | Register the new application-help summary route in deterministic order                         | ~20        |
| `apps/api/src/server/http-server.test.ts`               | Add GET route coverage for draft-ready, approval-paused, rejected, resumed, and invalid states | ~320       |
| `scripts/test-all.mjs`                                  | Add application-help files to quick regression and ASCII coverage tracking                     | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `application-help` launches route to a ready specialist with a typed tool
      surface instead of reporting a tooling gap.
- [ ] Browser clients can fetch one typed summary for the selected or latest
      application-help session, matched report and PDF context, latest draft
      packet, warnings, and resume guidance.
- [ ] Candidate-facing draft packets remain explicitly marked as drafts for
      human review, and the contract never implies submit-ready automation.
- [ ] Cover-letter requests remain explicit manual follow-up items until the
      dedicated cover-letter workflow exists.
- [ ] Approval-paused, rejected, resumed, and completed application-help
      states remain visible and reviewable instead of collapsing into generic
      session status.

### Testing Requirements

- [ ] Tool tests cover report matching, saved-answer extraction, packet
      persistence, missing-context handling, and manual cover-letter flags.
- [ ] Summary tests cover missing-context, no-draft-yet, approval-paused,
      rejected, resumed, and completed application-help states.
- [ ] HTTP runtime tests cover invalid query input plus ready, approval-
      paused, rejected, resumed, and completed route payloads.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, `npm run app:api:test:tools`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Draft packets live only in app-owned state and do not require browser
      parsing of raw chat transcripts.
- [ ] Payloads remain bounded to one focused session and one latest draft
      packet rather than unbounded logs or full report bodies.
- [ ] The browser never reads `reports/` or `.jobhunt-app/` files directly for
      application-help review.
- [ ] Repo writes remain fail-closed; the only new mutation surface is
      application-help draft state under the existing `app-state` boundary.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- `modes/apply.md` assumes the flow can reuse saved report context and prior
  draft answers when available. The typed tool surface should expose those
  facts directly instead of forcing the browser or model to rediscover them.
- The current cover-letter policy is still a documented support gap. Surface
  manual-follow-up state explicitly instead of fabricating a generated
  artifact.
- Candidate-facing outputs are working drafts. The contract must keep the
  human-review boundary explicit in summary messaging and draft-packet fields.

### Potential Challenges

- Report matching may be ambiguous or absent:
  return explicit missing-context state and warnings instead of guessing the
  wrong report.
- Existing reports may not include `## H) Draft Application Answers`:
  treat that as an empty prior-draft state, not a parsing failure.
- Multiple draft packets may exist for one session:
  choose the latest packet deterministically by timestamp and session ID.

### Relevant Considerations

- [P04] **Thin browser surfaces**: Keep report matching, draft selection, and
  warning logic backend-owned instead of recreating workflow inference in the
  browser.
- [P04] **Bounded parity payloads**: Return only the focused session and latest
  draft packet so application-help polling stays fast.
- [P04-apps/api] **Repo file contract stability**: Coordinate report parsing
  with fixture-backed tests so markdown drift does not silently break
  application-help context lookup.
- [P04] **Read-only browser boundary**: Keep report reads and app-state draft
  reads on the server side and fail closed.
- [P04] **Smoke suite coverage**: Add application-help contract coverage when
  the new route and specialist state land.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- The summary matches the wrong report and surfaces draft answers for the wrong
  role.
- Rejection or approval state becomes detached from the latest visible draft
  packet and the browser cannot explain what to resume.
- The contract hides the draft-only boundary and makes candidate-facing output
  look final instead of review-required.

---

## 9. Testing Strategy

### Unit Tests

- Match reports by report number, company, role, and artifact filenames with
  deterministic fallback ordering
- Extract saved draft-answer sections, report metadata, and cover-letter
  follow-up cues from markdown safely
- Persist and reload app-state draft packets with stable revision metadata
- Compose application-help session, job, approval, and failure overlays into
  explicit summary states

### Integration Tests

- Exercise GET application-help summaries through the HTTP harness for missing-
  context, draft-ready, approval-paused, rejected, resumed, and completed
  states
- Exercise ready specialist-route coverage so `application-help` exposes the
  new tool catalog instead of missing capabilities

### Manual Testing

- Seed a saved report and PDF, then confirm the context tool resolves the
  correct report metadata and any existing draft-answer block
- Persist a draft packet and confirm the summary route exposes draft items,
  no-submit messaging, and cover-letter manual-follow-up state
- Seed pending approval or rejection state for an application-help session and
  confirm the summary explains what to review or resume

### Edge Cases

- Missing or ambiguous report match
- Reports without saved draft-answer sections
- Sessions with no persisted draft packet yet
- Sessions with pending approvals or rejected jobs
- Multiple draft packet revisions for the same session

---

## 10. Dependencies

### External Libraries

- `zod`: existing validation and contract parsing
- Node.js standard library modules for file, path, and JSON handling

### Other Sessions

- **Depends on**: `phase03-session02-chat-console-and-session-resume`
- **Depends on**: `phase03-session04-approval-inbox-and-human-review-flow`
- **Depends on**: `phase04-session02-evaluation-console-and-artifact-handoff`
- **Depends on**: `phase04-session06-auto-pipeline-parity-and-regression`
- **Depends on**: `phase05-session03-batch-supervisor-contract`
- **Depended by**: `phase05-session06-application-help-review-and-approvals`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
