# Session Specification

**Session ID**: `phase06-session04-research-and-narrative-specialist-contracts`
**Phase**: 06 - Specialist Workflows, Dashboard Replacement, and Cutover
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 06 Session 03 moved the application-history specialist family to a
backend-owned detail surface, but the narrative workflows still stop at the
shared specialist workspace with tooling-gap placeholders. Deep research,
LinkedIn outreach, interview prep, training review, and project review all
have checked-in mode prompts and some durable repo artifacts, yet the app has
no typed backend contract for their review state, no dedicated detail route,
and no shared packet model for draft or narrative outputs.

This session makes those workflows app-owned in `apps/api`. The backend should
add one research-specialist tool surface that can resolve saved report or
profile context, stage bounded narrative result packets, and load those packets
back into one stable contract family. A dedicated `/research-specialist` GET
route should then expose focused review state, packet content, warnings,
approval overlays, and explicit next actions for all five workflows.

The main goal is to move these workflows from "tooling-gap" to "ready"
without widening the browser trust boundary. Session 05 can then build review
surfaces on top of one dedicated narrative detail contract instead of browser
guessing, raw prompt output, or shell-only follow-through.

---

## 2. Objectives

1. Add a typed research-specialist tool surface for context resolution plus
   bounded packet staging and loading across deep research, LinkedIn outreach,
   interview prep, training review, and project review.
2. Add one bounded research-specialist summary contract and GET route that
   exposes selected workflow or session detail, normalized packet content,
   warnings, approval state, and resumable run metadata for narrative
   specialist workflows.
3. Promote `deep-company-research`, `linkedin-outreach`, `interview-prep`,
   `training-review`, and `project-review` from tooling-gap to ready
   specialist routes with dedicated-detail metadata and explicit allowed-tool
   policies.
4. Add API, tool, and route coverage for missing-input, no-packet-yet,
   approval-paused, rejected, resumed, and completed narrative specialist
   outcomes so Session 05 can build review UI on stable backend semantics.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session05-router-and-specialist-agent-topology` - provides the
      specialist ownership and workflow routing model this session extends.
- [x] `phase03-session02-chat-console-and-session-resume` - provides launch,
      resume, and latest-session behavior the detail route must align with.
- [x] `phase05-session05-application-help-draft-contract` - provides the
      closest precedent for report-backed context lookup, draft packet staging,
      and review-boundary semantics in `apps/api`.
- [x] `phase06-session01-specialist-workflow-intake-and-result-contracts` -
      provides the shared specialist workspace catalog and launch metadata this
      session upgrades from tooling-gap to ready.
- [x] `phase06-session02-specialist-workspace-foundation` - provides the
      browser-side workspace expectations and dedicated-detail handoff pattern
      this session must satisfy.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic routes, bounded payloads,
  no-new-dependency expectations, and repo validation gates
- `.spec_system/CONSIDERATIONS.md` for specialist summary drift, bounded
  payload growth, thin-browser rules, and canonical handoff routing
- `.spec_system/SECURITY-COMPLIANCE.md` for the clean posture and the
  requirement to keep repo reads, packet storage, and approvals backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_06/PRD_phase_06.md` for specialist parity and
  dashboard-replacement sequencing
- `modes/deep.md`, `modes/contacto.md`, `modes/interview-prep.md`,
  `modes/training.md`, and `modes/project.md` for the five narrative workflow
  contracts
- `apps/api/src/tools/application-help-tools.ts`,
  `apps/api/src/server/application-help-contract.ts`, and
  `apps/api/src/server/application-help-summary.ts` for report matching,
  packet staging, and review-state patterns to reuse
- `apps/api/src/orchestration/specialist-catalog.ts`,
  `apps/api/src/server/specialist-workspace-summary.ts`, and
  `apps/api/src/server/routes/specialist-workspace-action-route.ts` for
  specialist readiness and dedicated-detail handoff expectations
- `apps/api/src/prompt/workflow-mode-map.ts` and
  `apps/api/src/prompt/prompt-types.ts` for workflow-to-mode ownership and
  stable prompt metadata
- `interview-prep/story-bank.md` or `interview-prep/story-bank.example.md` for
  optional interview story-bank context

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`,
  `npm run app:api:test:runtime`, and `npm run app:api:test:tools` available
  from the repo root
- Existing HTTP runtime harness available in
  `apps/api/src/server/http-server.test.ts`
- Existing specialist workspace smoke coverage available through
  `scripts/test-app-specialist-workspace.mjs`
- Existing repo quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add a typed research-specialist tool surface for shared context resolution
  plus bounded packet staging and loading across the five narrative workflows.
- Add one GET research-specialist route that returns selected or latest
  workflow detail, normalized packet payloads, warnings, review boundaries,
  approval overlays, and resumable run state through a bounded summary.
- Promote `deep-company-research`, `linkedin-outreach`, `interview-prep`,
  `training-review`, and `project-review` to ready specialist routing with one
  dedicated detail surface path and explicit allowed-tool policies.
- Surface explicit missing-input, no-packet-yet, approval-paused, rejected,
  resumable-session, and completed-result states without exposing raw prompt
  transcripts, raw repo files, or browser-side parsing.
- Cover narrative specialist flows in tool tests, runtime tests, shared
  workspace tests, and quick regression coverage.

### Out of Scope (Deferred)

- Browser review panels and workflow-specific React surfaces for the narrative
  detail route - _Reason: Session 05 owns the operator-facing specialist review
  UI._
- Application-help detail-route changes - _Reason: application-help already has
  its own dedicated detail contract and should remain stable._
- Tracker-status parity, dashboard replacement, or settings cutover work -
  _Reason: those remain separate Session 05 and Session 06 work._
- New prompt content, new repo workflow modes, or changes to the no-submit
  policy - _Reason: this session should consume current repo logic rather than
  redefine it._

---

## 5. Technical Approach

### Architecture

Create a new `apps/api/src/tools/research-specialist-tools.ts` module with a
shared narrative tool surface for the five research-specialist workflows. One
tool should resolve bounded context from company or role hints, saved reports,
prompt-route metadata, optional interview story-bank files, and existing
packet state. Another tool should validate and persist one normalized packet
per workflow session under `.jobhunt-app/research-specialist/<sessionId>/`
so the browser can review stable app-owned summaries instead of raw runtime
output.

Create a new `apps/api/src/server/research-specialist-contract.ts` module plus
`apps/api/src/server/research-specialist-summary.ts` and a
`/research-specialist` GET route. The summary builder should select the
focused or latest session for the requested workflow, read the latest
normalized narrative packet, overlay session, job, approval, and recent-
failure state from the operational store, and return one bounded payload for
review. Selection must stay deterministic: explicit `mode` first, explicit
`sessionId` next, then the latest matching session, then a stable workflow
fallback.

Update `apps/api/src/orchestration/specialist-catalog.ts` so these five
research-specialist workflows become ready only after the typed tool surface
exists. Each workflow should point to the `/research-specialist` detail
surface, expose a ready tool policy, and drop its current missing-capability
placeholder state. Session 05 can then build narrative review UI on one stable
contract family without changing the browser trust boundary.

### Design Patterns

- Shared packet union at the tool boundary: normalize workflow-specific outputs
  in `apps/api`, never in React
- Dedicated specialist detail surface: keep one bounded narrative detail route
  for the research-specialist family instead of embedding raw packets in the
  shared workspace payload
- App-owned packet storage: persist one normalized narrative packet per
  session under local app state instead of depending on raw transcripts or
  repeated shell commands
- Review boundary by contract: encode manual-review and manual-send constraints
  in the API payload rather than implicit UI copy
- Specialist catalog as source of truth: make readiness, detail-surface
  metadata, and allowed-tool policies live with workflow ownership

### Technology Stack

- TypeScript Node server modules in `apps/api`
- Existing `zod` validation and route patterns
- Existing prompt workflow metadata and prompt-loading surfaces
- Existing application-help packet storage and context-resolution patterns
- Existing operational store repositories and runtime tests
- Existing Node test runner and repo quick regression gate
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                      | Purpose                                                                                                | Est. Lines |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| `apps/api/src/tools/research-specialist-tools.ts`         | Define shared context lookup plus bounded narrative packet staging and loading tools                   | ~420       |
| `apps/api/src/server/research-specialist-contract.ts`     | Define research-specialist summary, warning, review-boundary, and workflow-packet shapes               | ~320       |
| `apps/api/src/server/research-specialist-summary.ts`      | Build the bounded narrative summary from normalized packets, session state, and runtime overlays       | ~480       |
| `apps/api/src/server/routes/research-specialist-route.ts` | Expose the GET research-specialist endpoint with bounded query validation                              | ~140       |
| `apps/api/src/tools/research-specialist-tools.test.ts`    | Lock context resolution plus workflow-specific packet staging and loading behavior                     | ~320       |
| `apps/api/src/server/research-specialist-summary.test.ts` | Lock summary composition for missing-input, approval-paused, rejected, resumed, and completed outcomes | ~320       |

### Files to Modify

| File                                                       | Changes                                                                                                           | Est. Lines |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/tools/default-tool-suite.ts`                 | Register the new research-specialist tools in the default API tool suite                                          | ~20        |
| `apps/api/src/tools/index.ts`                              | Export the new research-specialist tool module through the tools barrel                                           | ~20        |
| `apps/api/src/orchestration/specialist-catalog.ts`         | Promote the five narrative workflows to ready with dedicated-detail metadata and allowed-tool policies            | ~160       |
| `apps/api/src/orchestration/specialist-catalog.test.ts`    | Cover ready routing, tool policies, and detail-surface metadata for research-specialist workflows                 | ~120       |
| `apps/api/src/server/routes/index.ts`                      | Register the new research-specialist detail route in deterministic order                                          | ~20        |
| `apps/api/src/server/http-server.test.ts`                  | Add GET route coverage for missing-input, approval-paused, rejected, resumed, completed, and invalid-query states | ~240       |
| `apps/api/src/server/specialist-workspace-summary.test.ts` | Update shared workspace expectations for ready narrative workflows and dedicated-detail handoffs                  | ~120       |
| `apps/api/src/runtime/service-container.test.ts`           | Extend default tool-suite coverage for the new research-specialist surface                                        | ~80        |
| `scripts/test-all.mjs`                                     | Add research-specialist files to quick regression and ASCII coverage tracking                                     | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `deep-company-research`, `linkedin-outreach`, `interview-prep`,
      `training-review`, and `project-review` launch through ready specialist
      routes with typed tool policies instead of reporting tooling gaps.
- [ ] Browser clients can fetch one typed research-specialist summary for the
      selected or latest narrative workflow session, normalized packet data,
      warnings, and next actions.
- [ ] Narrative workflows no longer depend on shell-only follow-through to
      reach reviewable app state once bounded packets have been staged.
- [ ] Candidate-facing outreach output preserves an explicit manual-send
      boundary and never implies browser-owned submission or sending.
- [ ] Shared specialist workspace handoffs can point to one dedicated
      `/research-specialist` detail surface for the five workflows.

### Testing Requirements

- [ ] Tool tests cover context resolution, packet validation, packet staging or
      loading, missing-input handling, and optional story-bank fallbacks.
- [ ] Summary tests cover missing-input, no-packet-yet, approval-paused,
      rejected, resumed, and completed states across all five workflows.
- [ ] HTTP runtime tests cover invalid query input plus ready, degraded,
      resumed, and completed research-specialist route payloads.
- [ ] Shared specialist workspace tests cover ready narrative workflows and
      dedicated-detail handoff expectations after the routing upgrade.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, `npm run app:api:test:tools`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Payloads remain bounded to one selected workflow or session plus one
      normalized packet instead of raw prompt transcripts, raw repo files, or
      unbounded output history.
- [ ] The browser never reads `interview-prep/`, `.jobhunt-app/`, or other
      repo-owned narrative artifacts directly to derive workflow state.
- [ ] Packet storage stays local under `.jobhunt-app/research-specialist/`
      and review state remains backend-owned.
- [ ] Specialist catalog metadata remains the single source of truth for
      readiness, detail-surface metadata, and allowed-tool policies.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Reuse application-help context resolution and packet-storage patterns before
  creating another prompt or artifact lookup stack.
- Keep packet normalization in the API so the browser receives stable,
  discriminated workflow summaries instead of raw runtime output.
- Use one dedicated `/research-specialist` route so Session 05 can render one
  consistent narrative review surface across multiple workflow types.

### Potential Challenges

- Some narrative workflows have prompt contracts but no guaranteed durable repo
  artifact yet: mitigate with explicit missing-context and no-packet-yet
  states instead of fake completeness.
- LinkedIn outreach is candidate-facing and shareable: mitigate with an
  explicit manual-send review boundary and no hidden send behavior.
- Interview prep may depend on an optional story bank: mitigate with graceful
  fallback when `interview-prep/story-bank.md` is absent.

### Relevant Considerations

- [P05] **Specialist summary drift**: Keep research-specialist tools, summary
  payloads, and later browser parsers aligned as the remaining workflows move
  to ready.
- [P05] **Bounded payload growth**: Return one focused narrative packet and
  explicit next actions instead of raw prompt text or unbounded notes.
- [P05] **Thin browser surfaces**: Keep repo reads, packet writes, and review
  semantics in `apps/api`.
- [P05] **Canonical handoff routing**: Reuse the shared specialist workspace
  handoff model when pointing to the new narrative detail surface.
- [P05] **No-submit boundary**: Keep candidate-facing drafts review-only and
  never drift into browser-owned sending behavior.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Missing saved context collapsing into misleading ready state for deep
  research or interview prep
- LinkedIn outreach drafts implying send-ready behavior instead of explicit
  manual review and manual send
- Workflow-specific packet shapes drifting apart and breaking discriminated
  handling after refresh or session resume

---

## 9. Testing Strategy

### Unit Tests

- Validate shared context resolution across company or role hints, saved
  reports, prompt metadata, and optional story-bank inputs
- Validate workflow-specific packet validation, staging, and loading for the
  five research-specialist workflows
- Validate research-specialist summary focus selection, warning
  classification, review-boundary mapping, and next-action derivation

### Integration Tests

- Exercise GET `/research-specialist` against the HTTP runtime with `mode` and
  `sessionId` filters
- Verify ready specialist routing exposes the expected tool catalog and detail
  surface metadata for the five workflows
- Verify the default tool suite includes the new research-specialist tools and
  keeps deterministic ordering

### Manual Testing

- Query `/research-specialist?mode=deep-company-research` and verify missing
  context or no-packet-yet states stay explicit
- Query `/research-specialist?mode=linkedin-outreach` and verify manual-send
  boundary copy is present in the bounded payload
- Launch `interview-prep` from the shared specialist workspace and confirm the
  backend advertises a dedicated detail surface rather than a tooling gap
- Query `/research-specialist?mode=project-review` with a resumed or rejected
  session fixture and verify next-action guidance is explicit

### Edge Cases

- Invalid `mode` or empty `sessionId`
- Deep research session exists but no bounded packet has been staged yet
- Outreach draft exists but saved report context is ambiguous or missing
- Interview prep story bank is absent while the rest of the context is valid
- Training or project review packet loads for the latest session while another
  workflow is explicitly requested

---

## 10. Dependencies

### External Libraries

- `zod` - schema validation for research-specialist query and tool input

### Internal Dependencies

- `apps/api/src/orchestration/specialist-catalog.ts`
- `apps/api/src/server/specialist-workspace-summary.ts`
- `apps/api/src/server/application-help-summary.ts`
- `apps/api/src/tools/application-help-tools.ts`
- `apps/api/src/prompt/workflow-mode-map.ts`
- `apps/api/src/prompt/prompt-types.ts`
- `apps/api/src/store/`
- `interview-prep/story-bank.md`
- `modes/deep.md`
- `modes/contacto.md`
- `modes/interview-prep.md`
- `modes/training.md`
- `modes/project.md`

### Other Sessions

- **Depends on**: `phase02-session05-router-and-specialist-agent-topology`,
  `phase03-session02-chat-console-and-session-resume`,
  `phase05-session05-application-help-draft-contract`,
  `phase06-session01-specialist-workflow-intake-and-result-contracts`,
  `phase06-session02-specialist-workspace-foundation`
- **Depended by**: `phase06-session05-specialist-review-surfaces`,
  `phase06-session06-dashboard-replacement-maintenance-and-cutover`

---

## Next Steps

Run the `implement` workflow step next to build the research-specialist tools,
detail contract, summary route, and ready specialist routing for the
narrative workflows in `apps/api`.
