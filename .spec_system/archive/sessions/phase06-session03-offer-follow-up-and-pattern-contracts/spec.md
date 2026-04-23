# Session Specification

**Session ID**: `phase06-session03-offer-follow-up-and-pattern-contracts`
**Phase**: 06 - Specialist Workflows, Dashboard Replacement, and Cutover
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 06 Sessions 01 and 02 established the shared specialist workspace
contract and the browser foundation that can launch or resume specialist
work. The remaining application-history workflows still stop at a tooling-gap
boundary, though. `compare-offers`, `follow-up-cadence`, and
`rejection-patterns` all have checked-in mode prompts and repo-owned tracker
or report artifacts, but the app still has no typed backend contract for
their review state, no dedicated detail route, and no specialist-owned tool
surface that can move them from shell fallback to app-owned parity.

This session makes those planning-heavy workflows app-owned in `apps/api`.
The backend should add a typed tracker-specialist tool surface that can
resolve compare-offers context from saved tracker and report artifacts, run
the checked-in follow-up and pattern-analysis scripts through the bounded tool
adapter, and normalize their outputs into one stable contract family. A new
detail route should then expose one focused application-history specialist
summary that overlays normalized analysis packets with session, job, approval,
and failure state from the operational store.

The main goal is to move these workflows from "tooling-gap" to "ready"
without widening the browser trust boundary. Compare-offers, follow-up
cadence, and rejection-pattern review should stay backend-owned, use bounded
payloads, and point Session 05 at one dedicated detail surface instead of
browser-side markdown parsing or shell-only script follow-through.

---

## 2. Objectives

1. Add a typed tracker-specialist tool surface for compare-offers context
   resolution plus normalized follow-up cadence and rejection-pattern
   analysis over repo-owned artifacts.
2. Add one bounded tracker-specialist summary contract and GET route that
   exposes selected workflow or session detail, normalized results, warnings,
   next actions, and resumable run state for application-history workflows.
3. Promote `compare-offers`, `follow-up-cadence`, and
   `rejection-patterns` from tooling-gap to ready specialist routes with
   dedicated-detail metadata and explicit allowed-tool policies.
4. Add API, tool, and route coverage for missing-input, empty-history,
   degraded-analysis, resumed, and completed planning-workflow outcomes so
   Session 05 can build review UI on stable backend semantics.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session02-chat-console-and-session-resume` - provides launch,
      resume, and recent-session semantics this specialist detail contract
      must align with.
- [x] `phase04-session05-tracker-workspace-and-integrity-actions` - provides
      tracker parsing, report-header, and focused-row patterns the new
      application-history specialist summary should reuse.
- [x] `phase05-session03-batch-supervisor-contract` - proves the bounded
      summary plus warning-state pattern this session should mirror for a
      dedicated specialist detail route.
- [x] `phase05-session05-application-help-draft-contract` - provides the
      closest precedent for a backend-owned specialist tool surface plus one
      dedicated review contract in `apps/api`.
- [x] `phase06-session01-specialist-workflow-intake-and-result-contracts` -
      provides the shared specialist workspace contract and launch or resume
      route this session will upgrade from tooling-gap to ready.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic routes, bounded payloads,
  no-new-dependency expectations, and repo validation gates
- `.spec_system/CONSIDERATIONS.md` for specialist summary drift, markdown
  parser fragility, bounded payload growth, and thin-browser rules
- `.spec_system/SECURITY-COMPLIANCE.md` for the clean posture and the
  requirement to keep repo reads, script execution, and specialist review
  state backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/archive/phases/phase_06/PRD_phase_06.md` for specialist parity and
  dashboard-replacement sequencing
- `modes/ofertas.md`, `modes/followup.md`, and `modes/patterns.md` for the
  three planning-oriented workflow contracts
- `scripts/followup-cadence.mjs`, `scripts/analyze-patterns.mjs`,
  `scripts/test-followup-cadence.mjs`, and `scripts/test-analyze-patterns.mjs`
  for existing deterministic application-history analysis behavior
- `apps/api/src/server/tracker-workspace-contract.ts` and
  `apps/api/src/server/tracker-workspace-summary.ts` for tracker and report
  parsing utilities this specialist route should reuse
- `apps/api/src/tools/script-execution-adapter.ts`,
  `apps/api/src/tools/default-tool-scripts.ts`, and
  `apps/api/src/runtime/service-container.test.ts` for bounded script
  execution and allowlist coverage
- `apps/api/src/orchestration/specialist-catalog.ts`,
  `apps/api/src/server/specialist-workspace-summary.ts`, and
  `apps/api/src/server/routes/specialist-workspace-action-route.ts` for
  specialist readiness and detail-surface handoff expectations

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`,
  `npm run app:api:test:runtime`, and `npm run app:api:test:tools` available
  from the repo root
- Existing HTTP runtime harness available in
  `apps/api/src/server/http-server.test.ts`
- Existing script regression coverage available through
  `node scripts/test-followup-cadence.mjs` and
  `node scripts/test-analyze-patterns.mjs`
- Existing repo quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add a typed tracker-specialist tool surface for compare-offers context
  resolution plus script-backed follow-up cadence and rejection-pattern
  analysis normalization.
- Add one GET tracker-specialist route that returns selected or latest
  workflow detail, normalized result payloads, warnings, next actions, and
  resumable run state through a bounded summary.
- Promote `compare-offers`, `follow-up-cadence`, and
  `rejection-patterns` to ready specialist routing with one dedicated detail
  surface path and explicit allowed-tool policies.
- Surface explicit missing-input, empty-history, degraded-analysis,
  resumable-session, and completed-result states without exposing raw tracker
  markdown or raw script output to the browser.
- Cover compare-offers, follow-up cadence, and rejection-pattern specialist
  flows in tool tests, runtime tests, and quick regression coverage.

### Out of Scope (Deferred)

- Browser review panels, shell route wiring, and workflow-specific React
  surfaces for application-history specialist detail - _Reason: Session 05
  owns the operator-facing specialist review UI._
- Deep research, outreach, interview-prep, training-review, and
  project-review contracts - _Reason: Session 04 owns the narrative-oriented
  specialist backend surface._
- Tracker row mutations or tracker cleanup actions beyond the existing
  tracker workspace - _Reason: this session focuses on planning workflow
  review contracts, not tracker-maintenance UX._
- Changes to the checked-in compare-offers rubric or follow-up and patterns
  mode guidance - _Reason: this session should consume current repo logic
  rather than redefine it._
- Dashboard replacement and cutover decisions - _Reason: those remain Phase
  06 Sessions 05 and 06 work._

---

## 5. Technical Approach

### Architecture

Create a new `apps/api/src/tools/tracker-specialist-tools.ts` module with a
typed tool surface for planning-oriented application-history workflows. One
tool should resolve compare-offers context from report numbers, report paths,
company or role hints, and tracker-linked artifacts into one normalized
comparison packet. Two script-backed tools should run
`scripts/followup-cadence.mjs` and `scripts/analyze-patterns.mjs` through the
existing bounded script execution adapter, then normalize JSON output into
stable API shapes instead of leaking raw stdout into browser contracts.

Create a new `apps/api/src/server/tracker-specialist-contract.ts` module plus
`apps/api/src/server/tracker-specialist-summary.ts` and a
`/tracker-specialist` GET route. The summary builder should select the
focused or latest session for `compare-offers`, `follow-up-cadence`, or
`rejection-patterns`, read the latest normalized application-history result
packet, overlay session, job, approval, and recent-failure state from the
operational store, and return one bounded payload for browser review.
Selection must stay deterministic: explicit `mode` first, explicit
`sessionId` next, then the latest matching session, then a stable workflow
fallback.

Update `apps/api/src/orchestration/specialist-catalog.ts` so the tracker
specialist becomes ready for these three workflows only after the typed tool
surface exists. Each workflow should point to one dedicated detail surface
path, expose a ready tool policy, and drop its missing-capability placeholder
state. The shared specialist workspace can then hand off to a dedicated
application-history detail surface without changing the browser trust
boundary.

### Design Patterns

- Script normalization at the tool boundary: parse and validate script output
  in `apps/api`, never in React
- Dedicated specialist detail surface: keep one bounded detail route for the
  application-history family instead of embedding full results in the shared
  workspace payload
- App-owned analysis packet model: store one normalized result packet per
  focused planning workflow rather than depending on raw transcripts or
  repeated shell commands
- Specialist catalog as source of truth: make readiness, detail-surface
  metadata, and tool policies live with workflow ownership
- Deterministic focus and fallback: explicit `mode` and `sessionId` win
  before latest-session and catalog fallback behavior

### Technology Stack

- TypeScript Node server modules in `apps/api`
- Existing `zod` validation and route patterns
- Existing tracker parsing and report-header utilities
- Existing script execution adapter and default script allowlist
- Existing operational store repositories and runtime tests
- Existing Node test runner and repo quick regression gate
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                     | Purpose                                                                                                   | Est. Lines |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/tools/tracker-specialist-tools.ts`         | Define compare-offers context lookup plus follow-up and pattern-analysis normalization tools              | ~380       |
| `apps/api/src/server/tracker-specialist-contract.ts`     | Define application-history specialist summary, warning, next-action, and result payload shapes            | ~280       |
| `apps/api/src/server/tracker-specialist-summary.ts`      | Build the bounded tracker-specialist summary from normalized packets, session state, and runtime overlays | ~440       |
| `apps/api/src/server/routes/tracker-specialist-route.ts` | Expose the GET tracker-specialist endpoint with bounded query validation                                  | ~140       |
| `apps/api/src/tools/tracker-specialist-tools.test.ts`    | Lock compare-offers context resolution plus follow-up and pattern-analysis tool behavior                  | ~320       |
| `apps/api/src/server/tracker-specialist-summary.test.ts` | Lock summary composition for missing-input, degraded, resumed, and completed planning states              | ~280       |

### Files to Modify

| File                                                       | Changes                                                                                                 | Est. Lines |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/tools/default-tool-suite.ts`                 | Register the new tracker-specialist tools in the default API tool suite                                 | ~20        |
| `apps/api/src/tools/default-tool-scripts.ts`               | Add allowlisted follow-up and pattern-analysis scripts with bounded timeouts                            | ~40        |
| `apps/api/src/tools/index.ts`                              | Export the new tracker-specialist tool module through the tools barrel                                  | ~20        |
| `apps/api/src/orchestration/specialist-catalog.ts`         | Promote compare-offers, follow-up cadence, and rejection patterns to ready with detail-surface metadata | ~120       |
| `apps/api/src/orchestration/specialist-catalog.test.ts`    | Cover ready routing, tool policies, and detail-surface metadata for application-history workflows       | ~80        |
| `apps/api/src/server/routes/index.ts`                      | Register the new tracker-specialist detail route in deterministic order                                 | ~20        |
| `apps/api/src/server/http-server.test.ts`                  | Add GET route coverage for missing-input, degraded, resumed, completed, and invalid-query states        | ~320       |
| `apps/api/src/server/specialist-workspace-summary.test.ts` | Update shared workspace expectations for ready planning workflows and dedicated detail handoffs         | ~80        |
| `apps/api/src/runtime/service-container.test.ts`           | Extend default script-allowlist coverage for new tracker-specialist script execution                    | ~80        |
| `scripts/test-all.mjs`                                     | Add tracker-specialist files to quick regression and ASCII coverage tracking                            | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `compare-offers`, `follow-up-cadence`, and `rejection-patterns` launch
      through ready specialist routes with typed tool policies instead of
      reporting tooling gaps.
- [ ] Browser clients can fetch one typed tracker-specialist summary for the
      selected or latest planning workflow session, normalized result data,
      warnings, and next actions.
- [ ] Follow-up cadence and rejection-pattern analysis no longer require
      shell-only script execution to reach reviewable app state.
- [ ] Compare-offers context resolution can normalize saved tracker or report
      references and explicit offer hints without browser access to repo
      files.
- [ ] Shared specialist workspace handoffs can point to one dedicated
      application-history detail surface for these workflows.

### Testing Requirements

- [ ] Tool tests cover compare-offers context matching, follow-up cadence
      normalization, rejection-pattern normalization, empty-history handling,
      and degraded script output.
- [ ] Summary tests cover missing-input, no-result-yet, degraded, resumed,
      and completed states across compare-offers, follow-up cadence, and
      rejection-pattern workflows.
- [ ] HTTP runtime tests cover invalid query input plus ready, degraded,
      resumed, and completed tracker-specialist route payloads.
- [ ] Shared specialist workspace tests cover ready planning workflows and
      dedicated-detail handoff expectations after the routing upgrade.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, `npm run app:api:test:tools`,
      `node scripts/test-followup-cadence.mjs`,
      `node scripts/test-analyze-patterns.mjs`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Payloads remain bounded to one selected workflow or session plus one
      normalized analysis result instead of raw tracker markdown, raw script
      stdout, or unbounded transcripts.
- [ ] The browser never reads `data/applications.md`, `data/follow-ups.md`,
      or `reports/` directly to derive planning-workflow state.
- [ ] Script execution stays bounded by the existing allowlist, timeout, and
      failure-reporting rules in the tool execution layer.
- [ ] Specialist catalog metadata remains the single source of truth for
      readiness, detail-surface metadata, and allowed-tool policies.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Reuse tracker-workspace parsing and report-header utilities instead of
  creating a second application-history parser stack.
- Normalize follow-up and pattern-analysis script output at the tool boundary
  so the browser never sees raw stdout or ad hoc status text.
- Keep the dedicated detail surface backend-owned and bounded; Session 05 can
  build UI on top of it without changing workflow ownership.

### Potential Challenges

- Compare-offers inputs may mix report numbers, report paths, tracker rows,
  and manual offer labels: mitigate with deterministic matching rules and
  explicit missing-input warnings.
- Script-backed analysis can return empty or degraded output when tracker
  history is sparse: mitigate with validated normalization and explicit
  degraded-state payloads.
- Upgrading three workflows from tooling-gap to ready changes shared
  specialist workspace expectations: mitigate with catalog and workspace test
  updates in the same session.

### Relevant Considerations

- [P05] **Specialist summary drift**: Keep tracker-specialist tools, summary
  payloads, and later browser parsers aligned as planning workflows move to
  ready.
- [P05-apps/api] **Markdown parser fragility**: Reuse existing tracker and
  report parsing helpers and keep fixture coverage current when parsing
  assumptions change.
- [P05] **Bounded payload growth**: Return one focused planning result and
  explicit next actions instead of raw report bodies or unbounded analysis
  history.
- [P05] **Thin browser surfaces**: Keep tracker reads, script execution, and
  workflow interpretation in `apps/api`.
- [P05] **Canonical handoff routing**: Reuse the shared specialist workspace
  handoff model when pointing to the new application-history detail surface.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Mixed compare-offers inputs resolving to the wrong tracker or report
  records after refresh or re-entry
- Follow-up or pattern-analysis script failures collapsing into silent empty
  state instead of explicit degraded guidance
- Ready-state routing changes causing stale shared-workspace expectations or
  broken dedicated-detail handoffs

---

## 9. Testing Strategy

### Unit Tests

- Validate compare-offers context matching and deterministic offer ordering
- Validate follow-up cadence and rejection-pattern output normalization and
  degraded-state handling
- Validate tracker-specialist summary focus selection, warning classification,
  and next-action mapping

### Integration Tests

- Exercise GET `/tracker-specialist` against the HTTP runtime with `mode` and
  `sessionId` filters
- Verify ready specialist routing exposes the expected tool catalog for the
  three planning workflows
- Verify the default script allowlist includes the new bounded follow-up and
  pattern-analysis entries

### Manual Testing

- Query `/tracker-specialist?mode=follow-up-cadence` and verify empty-history
  or degraded states are explicit
- Query `/tracker-specialist?mode=rejection-patterns` and verify normalized
  recommendations and threshold guidance stay bounded
- Launch `compare-offers` from the shared specialist workspace and confirm the
  backend advertises a dedicated detail surface rather than a tooling gap

### Edge Cases

- Invalid `mode` or empty `sessionId`
- Compare-offers request with fewer than two usable offer references
- Tracker exists but `data/follow-ups.md` is missing or empty
- Pattern-analysis script succeeds with sparse or partially missing report
  links
- Latest session exists for one planning workflow while another mode is
  explicitly requested

---

## 10. Dependencies

### External Libraries

- `zod` - schema validation for tracker-specialist query and tool input

### Internal Dependencies

- `apps/api/src/orchestration/specialist-catalog.ts`
- `apps/api/src/server/specialist-workspace-summary.ts`
- `apps/api/src/server/tracker-workspace-summary.ts`
- `apps/api/src/tools/script-execution-adapter.ts`
- `apps/api/src/tools/default-tool-scripts.ts`
- `apps/api/src/store/`
- `scripts/followup-cadence.mjs`
- `scripts/analyze-patterns.mjs`

### Other Sessions

- **Depends on**: `phase03-session02-chat-console-and-session-resume`,
  `phase04-session05-tracker-workspace-and-integrity-actions`,
  `phase05-session03-batch-supervisor-contract`,
  `phase05-session05-application-help-draft-contract`,
  `phase06-session01-specialist-workflow-intake-and-result-contracts`
- **Depended by**: `phase06-session05-specialist-review-surfaces`,
  `phase06-session06-dashboard-replacement-maintenance-and-cutover`

---

## Next Steps

Run the `implement` workflow step next to build the tracker-specialist tools,
detail contract, summary route, and ready specialist routing for the
application-history workflows in `apps/api`.
