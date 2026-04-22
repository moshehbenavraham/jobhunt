# Session Specification

**Session ID**: `phase06-session01-specialist-workflow-intake-and-result-contracts`
**Phase**: 06 - Specialist Workflows, Dashboard Replacement, and Cutover
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 05 established bounded API contracts for scan review, batch
supervision, and application-help, but the remaining specialist workflows
still have no shared backend surface for browser launch, resume, or status
inspection. Today the app can describe route readiness through chat or
settings, yet `/workflows/:mode` still lacks one API model for compare-offers,
follow-up cadence, rejection patterns, deep research, outreach, interview
prep, training review, and project review. Session 02 cannot build the shared
specialist workspace until `apps/api` exposes that common contract family.

This session creates the shared specialist workspace contract in `apps/api`.
The backend should define reusable workflow descriptors, intake metadata,
shared run and result states, warnings, approval overlays, and dedicated
detail-surface hints that specialist browser surfaces can consume without
inferring behavior from chat payloads or repo files. A GET summary route
should list the remaining specialist workflows and expose one selected
workflow or session view with deterministic focus rules.

Launch and resume behavior also needs a workspace-owned entry point. This
session should add a POST action route that wraps the existing orchestration
service and specialist catalog behind bounded launch or resume responses,
including ready, blocked, duplicate, degraded, and completed outcomes. The
result is a stable API seam that Session 02 can render immediately while
Sessions 03 and 04 layer workflow-specific result contracts on top of it.

---

## 2. Objectives

1. Add a shared specialist workspace contract that models workflow families,
   intake requirements, launch support, warnings, run state, and bounded
   result availability for the remaining specialist workflows.
2. Add a specialist workspace summary route that lists supported workflows,
   selected workflow detail, latest session or approval overlays, and shared
   handoff metadata without browser-side repo parsing or chat-payload
   inference.
3. Add a specialist workspace action route that wraps launch and resume
   through one bounded response family with explicit ready, blocked, degraded,
   and duplicate-trigger feedback.
4. Extend specialist catalog metadata and automated coverage so Session 02 can
   build `/workflows/:mode` against one stable API contract while Sessions 03
   and 04 plug in workflow-specific result summaries.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session05-router-and-specialist-agent-topology` - provides the
      specialist boundaries, workflow routing model, and tool-scope ownership
      this session must reuse.
- [x] `phase03-session02-chat-console-and-session-resume` - provides launch,
      resume, and recent-session semantics the shared specialist workspace
      must align with.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      approval visibility and interrupted-run patterns specialist summaries
      must expose.
- [x] `phase05-session03-batch-supervisor-contract` - proves the bounded
      summary plus action-route pattern this session should mirror for a
      shared specialist surface.
- [x] `phase05-session05-application-help-draft-contract` - provides the most
      recent specialist-style API contract and detail route the shared
      workspace should point to instead of duplicating.
- [x] `phase05-session06-application-help-review-and-approvals` - proves the
      review-state handoff and approval-aware specialist workflow expectations
      Phase 06 should keep consistent.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic routes, bounded payloads,
  no-new-dependency expectations, and repo validation gates
- `.spec_system/CONSIDERATIONS.md` for specialist summary drift, payload
  bounds, thin-browser rules, and shared handoff expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the clean posture and the
  requirement to keep approvals, repo reads, and sensitive actions
  backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_06/PRD_phase_06.md` for specialist workspace and
  Phase 06 parity goals
- `modes/ofertas.md`, `modes/followup.md`, `modes/patterns.md`,
  `modes/deep.md`, `modes/contacto.md`, `modes/interview-prep.md`,
  `modes/training.md`, and `modes/project.md` for the remaining specialist
  workflow contracts this shared surface must cover
- `apps/api/src/orchestration/specialist-catalog.ts`,
  `apps/api/src/orchestration/orchestration-service.ts`, and
  `apps/api/src/server/routes/orchestration-route.ts` for existing specialist
  routing and launch semantics
- `apps/api/src/server/application-help-contract.ts`,
  `apps/api/src/server/scan-review-contract.ts`, and
  `apps/api/src/server/batch-supervisor-contract.ts` for bounded contract and
  route patterns already used in the app
- `apps/api/src/store/`, `apps/api/src/server/http-server.test.ts`, and
  `scripts/test-all.mjs` for operational-store overlays and API regression
  coverage expectations

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

- Add a shared `specialist-workspace` contract for workflow descriptors,
  intake hints, shared run state, warnings, approval overlays, and dedicated
  detail-surface metadata.
- Add one GET specialist workspace route that returns workflow inventory,
  selected workflow detail, latest session overlays, and bounded result
  availability for the remaining specialist workflows.
- Add one POST specialist workspace action route that accepts launch or resume
  requests, wraps orchestration handoff behind bounded response envelopes, and
  preserves explicit blocked or degraded outcomes.
- Extend specialist catalog metadata so the backend can describe workflow
  family, summary availability, detail-surface paths, and support status from
  one source of truth.
- Cover idle, running, waiting, degraded, completed, blocked, duplicate, and
  invalid-input specialist workspace states in automated tests.

### Out of Scope (Deferred)

- Workflow-specific compare-offers, follow-up, patterns, research, outreach,
  interview, training, or project result parsing - _Reason: Sessions 03 and
  04 own the specialist-specific backend summaries._
- React routes, loaders, and UI state for `/workflows/:mode` - _Reason:
  Session 02 owns the browser workspace foundation._
- Dashboard replacement, settings polish, and cutover decisions - _Reason:
  those remain Phase 06 Sessions 05 and 06 work._
- New mode prompts or workflow business logic in `modes/*.md` - _Reason: this
  session focuses on API contracts and shared runtime surfaces, not prompt
  rewrites._

---

## 5. Technical Approach

### Architecture

Create a new `apps/api/src/server/specialist-workspace-contract.ts` module to
define the shared specialist workspace payloads. The contract should cover
workflow descriptors, workspace family metadata, bounded intake hints, shared
run states, result-availability states, warnings, approval overlays, and
launch or resume action responses. It should be broad enough for Session 02 to
render the workspace shell and for Sessions 03 and 04 to plug in
workflow-specific detail without breaking the top-level shape.

Create a new `apps/api/src/server/specialist-workspace-summary.ts` module plus
`/specialist-workspace` GET route. The summary builder should derive workflow
inventory from the specialist catalog and prompt route map, then overlay
selected-session, job, approval, and recent-failure state from the operational
store. Selection must stay deterministic: explicit `mode` first, explicit
`sessionId` next, then the latest matching specialist session, then a stable
catalog fallback. When a dedicated specialist detail surface already exists,
such as `application-help`, return a bounded pointer to that route instead of
copying its full payload.

Create a new `/specialist-workspace/action` POST route that wraps the existing
orchestration service. This route should accept launch or resume requests,
apply deterministic request validation, guard duplicate in-flight actions, and
map orchestration handoff into workspace-specific response envelopes. When a
workflow is still blocked or only partially supported, the response should
stay explicit about support status and next action instead of falling back to
chat-console-specific payloads.

Extend `apps/api/src/orchestration/specialist-catalog.ts` so specialist
workspace metadata lives with the existing route policy. The catalog should
remain the source of truth for labels, support status, allowed tool preview,
workflow family, and detail-surface hints. The shared workspace summary should
reuse that metadata instead of rebuilding workflow identity in another module.

### Design Patterns

- Catalog-as-source-of-truth: keep workflow identity, support state, and tool
  preview metadata in the specialist catalog
- Bounded workspace index plus selected detail: list all specialist workflows
  but return one focused detail view per request
- Route-owned orchestration handoff: keep launch and resume semantics behind
  the API instead of exposing chat payloads directly to the browser
- Shared runtime overlay: derive run, approval, and failure state from the
  operational store instead of separate client-owned logic
- Explicit blocked and degraded states: return bounded warnings and next steps
  instead of silent null fields or browser guesses

### Technology Stack

- TypeScript Node server modules in `apps/api`
- Existing `zod` validation and route patterns
- Existing orchestration service and specialist catalog
- Existing operational store repositories and startup-status helpers
- Existing Node test runner and repo quick regression gate
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                              | Purpose                                                                                                         | Est. Lines |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/specialist-workspace-contract.ts`            | Define shared specialist workflow descriptors, shared run or result states, warnings, and action envelopes      | ~320       |
| `apps/api/src/server/specialist-workspace-summary.ts`             | Build workflow inventory, selected detail, and run or approval or failure overlays for the specialist workspace | ~460       |
| `apps/api/src/server/routes/specialist-workspace-route.ts`        | Expose the GET specialist workspace endpoint with bounded query validation                                      | ~140       |
| `apps/api/src/server/routes/specialist-workspace-action-route.ts` | Expose POST launch or resume specialist actions with duplicate-trigger guards                                   | ~220       |
| `apps/api/src/server/specialist-workspace-summary.test.ts`        | Lock workflow mapping, selection rules, and shared idle or running or waiting or degraded or completed states   | ~320       |

### Files to Modify

| File                                                    | Changes                                                                                                         | Est. Lines |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/orchestration/specialist-catalog.ts`      | Add shared workspace metadata for remaining specialist workflows, support states, and detail-surface hints      | ~140       |
| `apps/api/src/orchestration/specialist-catalog.test.ts` | Cover new workspace metadata and route expectations for the remaining specialist workflows                      | ~80        |
| `apps/api/src/server/routes/index.ts`                   | Register specialist workspace routes in deterministic order                                                     | ~20        |
| `apps/api/src/server/http-server.test.ts`               | Add GET and POST route coverage for launch, resume, blocked, duplicate, stale-session, and invalid-input states | ~340       |
| `scripts/test-all.mjs`                                  | Add specialist workspace files to quick regression and ASCII coverage tracking                                  | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Browser clients can fetch one shared specialist workspace summary for
      the remaining specialist workflows, selected mode, latest session state,
      warnings, and result availability.
- [ ] Browser clients can launch or resume specialist workflows through one
      backend-owned action route and receive bounded ready, blocked, degraded,
      or duplicate-trigger feedback.
- [ ] Shared specialist state exposes explicit idle, running, waiting,
      degraded, and completed states with approval and failure overlays
      instead of raw chat or repo parsing in the browser.
- [ ] Workflow descriptors expose stable family, label, intake, and
      detail-surface metadata reusable by Session 02 and later specialist
      result contracts.

### Testing Requirements

- [ ] Summary tests cover workflow inventory, focus selection, idle, running,
      waiting, degraded, and completed specialist workspace states.
- [ ] HTTP runtime tests cover GET and POST specialist workspace routes across
      launch, resume, blocked workflow, duplicate request, stale session, and
      invalid-input cases.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, and `node scripts/test-all.mjs --quick`
      pass after integration.

### Non-Functional Requirements

- [ ] Payloads remain bounded to workflow inventory plus one selected detail
      rather than exposing raw chat payloads, transcripts, or repo artifacts.
- [ ] The browser never reads repo files directly to determine specialist
      workspace status or result availability.
- [ ] Specialist catalog metadata remains the single source of truth for
      shared workspace labels, support states, and detail-surface hints.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Keep `application-help` as the first concrete specialist detail surface and
  point to it from the shared workspace rather than duplicating its payload.
- Preserve the thin-browser boundary by keeping workflow support inference,
  approval overlays, and orchestration handoff composition in `apps/api`.
- Keep blocked and degraded specialist modes explicit so Session 02 can render
  stable UX without guessing from null data.

### Potential Challenges

- Shared contract drift across many specialist workflows: mitigate by storing
  workflow identity and support metadata in the specialist catalog and testing
  it directly.
- Stale mode or session focus after refresh or deep link: mitigate with
  deterministic selection rules and explicit stale-selection messaging.
- Action re-entry collisions from repeated launch or resume clicks: mitigate
  with duplicate-trigger guards and explicit already-in-flight responses.

### Relevant Considerations

- [P05] **Specialist summary drift**: Keep catalog metadata, API payloads, and
  future browser parsers aligned so the shared workspace stays stable.
- [P05-apps/web] **URL-backed focus sync**: Keep mode and session selection
  deterministic so deep links and refresh recovery remain reliable.
- [P05] **Bounded payload growth**: Point to dedicated detail surfaces when
  they exist instead of copying unbounded artifact content into the shared
  workspace payload.
- [P05] **Thin browser surfaces**: Keep workflow inference, repo reads, and
  approval-sensitive state backend-owned.
- [P05] **Canonical handoff routing**: Reuse existing orchestration ownership
  instead of creating a parallel launch model for specialist workspaces.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Duplicate launch or resume requests causing conflicting in-flight specialist
  actions
- Stale deep links resolving to the wrong specialist mode or session after
  refresh
- Blocked or degraded specialist workflows rendering as silent empty state
  instead of explicit next-step guidance

---

## 9. Testing Strategy

### Unit Tests

- Validate specialist catalog workspace metadata and support-state mapping
- Validate summary focus selection, run-state derivation, and warning
  classification
- Validate action-response mapping for ready, blocked, duplicate, and
  stale-session outcomes

### Integration Tests

- Exercise GET `/specialist-workspace` against the HTTP runtime with mode and
  session filters
- Exercise POST `/specialist-workspace/action` for launch and resume requests
  against a real service container
- Verify shared workspace payloads can point to existing detail surfaces such
  as `application-help` without copying raw detail payloads

### Manual Testing

- Query the specialist workspace endpoint with and without `mode` or
  `sessionId` filters and verify deterministic selection
- Launch a ready specialist workflow and confirm the action response returns
  bounded handoff metadata
- Attempt a blocked or stale specialist action and confirm the API returns
  explicit blocked or missing-session guidance

### Edge Cases

- Invalid workflow mode or empty `sessionId`
- Selected session exists but does not match the requested specialist mode
- Pending approval with no active job
- Recent failure with no dedicated detail surface yet
- Existing detail surface available for one workflow but not the others

---

## 10. Dependencies

### External Libraries

- `zod` - schema validation for specialist workspace query and action input

### Internal Dependencies

- `apps/api/src/orchestration/specialist-catalog.ts`
- `apps/api/src/orchestration/orchestration-service.ts`
- `apps/api/src/prompt/workflow-mode-map.ts`
- `apps/api/src/store/`
- `apps/api/src/server/startup-status.ts`
- `apps/api/src/server/application-help-contract.ts`

### Other Sessions

- **Depends on**: `phase02-session05-router-and-specialist-agent-topology`,
  `phase03-session02-chat-console-and-session-resume`,
  `phase03-session04-approval-inbox-and-human-review-flow`,
  `phase05-session03-batch-supervisor-contract`,
  `phase05-session05-application-help-draft-contract`,
  `phase05-session06-application-help-review-and-approvals`
- **Depended by**: `phase06-session02-specialist-workspace-foundation`,
  `phase06-session03-offer-follow-up-and-pattern-contracts`,
  `phase06-session04-research-and-narrative-specialist-contracts`,
  `phase06-session05-specialist-review-surfaces`

---

## Next Steps

Run the `implement` workflow step next to build the shared specialist
workspace contract, summary route, and action route in `apps/api`.
