# Session Specification

**Session ID**: `phase06-session05-specialist-review-surfaces`
**Phase**: 06 - Specialist Workflows, Dashboard Replacement, and Cutover
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 06 Session 02 established one shared specialist workspace in `apps/web`
with URL-backed focus, launch and resume controls, and explicit handoffs.
Phase 06 Session 03 and Session 04 then added the backend-owned
`/tracker-specialist` and `/research-specialist` detail routes that carry the
planning and narrative specialist families. The missing piece is the browser
review layer that turns those bounded contracts into usable operator-facing
surfaces inside the shared workflows shell.

This session adds strict web parsers, focused detail clients, and family-aware
review panels for the remaining specialist workflows. Compare-offers,
follow-up cadence, and rejection-patterns should render planning summaries
from the tracker-specialist contract. Deep research, LinkedIn outreach,
interview prep, training review, and project review should render bounded
narrative summaries from the research-specialist contract.

The goal is to let the operator inspect outputs, warnings, and next actions
without leaving the shared workflows surface or guessing from repo files. The
browser should stay thin, fail closed on contract drift, and reuse the same
explicit handoff model that already exists across scan, batch, application-
help, pipeline, and tracker workspaces.

---

## 2. Objectives

1. Add strict `apps/web` clients and payload parsers for the
   `/tracker-specialist` and `/research-specialist` review contracts.
2. Render family-aware specialist review panels inside the shared workflows
   surface with loading, empty, error, offline, and stale-selection handling.
3. Preserve explicit handoffs to approvals, chat, tracker, pipeline, and
   artifacts without browser-side repo parsing or hidden mutations.
4. Extend smoke and quick-regression coverage for specialist review loading,
   re-entry, degraded states, and handoff behavior.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase06-session02-specialist-workspace-foundation` - provides the
      shared workflows shell, URL-backed focus, and shell handoff seams.
- [x] `phase06-session03-offer-follow-up-and-pattern-contracts` - provides the
      tracker-specialist detail route and bounded planning summaries.
- [x] `phase06-session04-research-and-narrative-specialist-contracts` -
      provides the research-specialist detail route and bounded narrative
      summaries.
- [x] `phase05-session06-application-help-review-and-approvals` - provides
      the nearest browser pattern for bounded draft review, approval handoffs,
      and review-only operator messaging.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for bounded browser behavior, file placement,
  and repo validation gates.
- `.spec_system/CONSIDERATIONS.md` for specialist summary drift, URL-backed
  focus sync, bounded payload growth, thin-browser rules, and canonical
  handoff routing.
- `.spec_system/SECURITY-COMPLIANCE.md` for the clean posture and the rule
  that repo reads, approvals, and mutations remain backend-owned.
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_06/PRD_phase_06.md` for specialist parity,
  workspace deep-linking, and cutover sequencing.
- `apps/web/src/workflows/specialist-workspace-*.ts*` for the existing shared
  workflows shell.
- `apps/web/src/application-help/*.ts*`, `apps/web/src/batch/*.ts*`, and
  `apps/web/src/scan/*.ts*` for current bounded review-surface patterns.
- `apps/api/src/server/tracker-specialist-contract.ts`,
  `apps/api/src/server/tracker-specialist-summary.ts`,
  `apps/api/src/server/research-specialist-contract.ts`, and
  `apps/api/src/server/research-specialist-summary.ts` for the contract shapes
  the browser must parse exactly.
- `scripts/test-app-specialist-workspace.mjs`, `scripts/test-app-shell.mjs`,
  and `scripts/test-all.mjs` for smoke and quick-regression coverage.

### Environment Requirements

- Workspace dependencies installed from the repo root.
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root.
- Existing workflows shell available through `apps/web/src/shell`.
- Existing specialist workspace smoke harness available through
  `scripts/test-app-specialist-workspace.mjs`.
- Existing shell smoke harness available through `scripts/test-app-shell.mjs`.
- Existing repo quick regression gate available through
  `node scripts/test-all.mjs --quick`.

---

## 4. Scope

### In Scope (MVP)

- Add strict browser parsers and fetch clients for the tracker-specialist and
  research-specialist detail routes.
- Add one shared web hook that selects the correct detail family from the
  specialist workspace summary and keeps detail fetches aligned with mode and
  session focus.
- Render planning-family and narrative-family review panels inside the shared
  workflows surface with bounded summaries, warnings, packet guidance, and
  explicit next actions.
- Preserve explicit handoffs back to approvals, chat, tracker, pipeline, and
  artifact review where the backend contract exposes them.
- Cover loading, empty, offline, error, stale-selection, approval-paused,
  rejected, resumed, and completed review states in browser smoke coverage.

### Out of Scope (Deferred)

- Backend contract or tool changes for tracker-specialist or
  research-specialist routes - _Reason: Sessions 03 and 04 already own those
  API surfaces._
- New workflow modes, prompt changes, or specialist-catalog ownership updates
  - _Reason: this session should consume the existing backend routing model._
- Dashboard home replacement, settings cutover, or final operator messaging
  work - _Reason: Session 06 owns the final cutover surface._
- Reworking application-help, scan, batch, pipeline, or tracker workspaces
  beyond borrowed UI patterns - _Reason: those surfaces are already complete
  and should remain stable._

---

## 5. Technical Approach

### Architecture

Create one detail-parser and client pair for each backend contract family:
`tracker-specialist` and `research-specialist`. The browser should parse each
payload through a strict fail-closed decoder so contract drift shows up as a
controlled error state instead of partial rendering. These clients should stay
read-only and only consume bounded summaries from `apps/api`.

Create a shared `use-specialist-review` hook that reads the currently selected
workflow from the existing specialist workspace summary, resolves which detail
family applies, and fetches the matching detail payload for the selected mode
or session. The hook should preserve the last known good snapshot for offline
fallback, abort in-flight requests on focus changes, and clear or revalidate
detail state on stale-selection recovery and resume actions.

Update the shared workflows surface so it can render specialized review
content without leaving the `workflows` shell surface. The existing launch
panel and selected-workflow state remain the entry point. New planning and
narrative review panels then render the detail payload, while a shared review
rail exposes explicit handoffs to approvals, chat, tracker, pipeline, and
artifacts when those actions are valid.

### Design Patterns

- Fail-closed browser parsing: decode each contract family in its own parser
  instead of loosely typing payloads in React components.
- Shared family-aware hook: centralize family selection, fetch lifecycle,
  stale-selection recovery, and offline snapshot behavior.
- Thin browser review surfaces: keep workflow inference, repo reads, and
  approval-sensitive logic in `apps/api`, not in React state.
- Explicit handoff routing: reuse existing shell openers instead of creating
  hidden navigation or browser-owned mutation paths.
- URL-backed re-entry: preserve selected mode and session as the source of
  truth when refreshing, resuming, or reopening the workflows surface.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing workspace client and hook patterns in `apps/web/src`
- Existing inline-style shell composition used across current review surfaces
- Existing Playwright-based browser smoke harnesses in `scripts/`
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                          | Purpose                                                                                       | Est. Lines |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/workflows/tracker-specialist-review-types.ts`   | Strict parsers and helpers for tracker-specialist review payloads                             | ~260       |
| `apps/web/src/workflows/tracker-specialist-review-client.ts`  | Focus-aware GET client for `/tracker-specialist`                                              | ~220       |
| `apps/web/src/workflows/research-specialist-review-types.ts`  | Strict parsers and helpers for research-specialist review payloads                            | ~320       |
| `apps/web/src/workflows/research-specialist-review-client.ts` | Focus-aware GET client for `/research-specialist`                                             | ~220       |
| `apps/web/src/workflows/use-specialist-review.ts`             | Shared family-aware review hook with abort, fallback, and revalidation behavior               | ~340       |
| `apps/web/src/workflows/tracker-specialist-review-panel.tsx`  | Planning-family review panel for compare-offers, follow-up, and patterns                      | ~280       |
| `apps/web/src/workflows/research-specialist-review-panel.tsx` | Narrative-family review panel for research, outreach, interview, training, and project review | ~340       |
| `apps/web/src/workflows/specialist-workspace-review-rail.tsx` | Shared rail for approvals, chat, tracker, pipeline, and artifact handoffs                     | ~240       |

### Files to Modify

| File                                                           | Changes                                                                                                     | Est. Lines |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/workflows/specialist-workspace-surface.tsx`      | Compose the new review hook, family panels, and shared review rail                                          | ~140       |
| `apps/web/src/workflows/use-specialist-workspace.ts`           | Revalidate or clear review state on refresh, resume, and selection changes                                  | ~140       |
| `apps/web/src/workflows/specialist-workspace-client.ts`        | Extend focus helpers for detail re-entry and shell handoffs                                                 | ~80        |
| `apps/web/src/workflows/specialist-workspace-types.ts`         | Add family helpers and shared detail-routing support types                                                  | ~80        |
| `apps/web/src/workflows/specialist-workspace-state-panel.tsx`  | Align selected-workflow messaging with the new review surfaces                                              | ~120       |
| `apps/web/src/workflows/specialist-workspace-detail-rail.tsx`  | Limit the generic rail to empty-state and fallback guidance once review panels exist                        | ~80        |
| `apps/web/src/workflows/specialist-workspace-launch-panel.tsx` | Refine ready, degraded, and blocked messaging for review-capable workflows                                  | ~90        |
| `apps/web/src/shell/operator-shell.tsx`                        | Keep specialist detail handoffs inside the workflows surface unless another surface is explicitly requested | ~70        |
| `scripts/test-app-specialist-workspace.mjs`                    | Add smoke coverage for planning and narrative review families                                               | ~260       |
| `scripts/test-app-shell.mjs`                                   | Add shell smoke coverage for workflows deep-link re-entry and review handoffs                               | ~140       |
| `scripts/test-all.mjs`                                         | Track the new web review files in quick regression and ASCII coverage                                       | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Compare-offers, follow-up cadence, and rejection-pattern workflows can
      render typed planning summaries inside the shared workflows surface.
- [ ] Deep research, LinkedIn outreach, interview prep, training review, and
      project review can render typed narrative summaries or draft guidance
      inside the shared workflows surface.
- [ ] Specialist review surfaces keep approvals, chat, tracker, pipeline, and
      artifact handoffs explicit and backend-owned.
- [ ] Selected mode and session focus survive refresh or re-entry without
      rendering stale detail from the wrong workflow family.

### Testing Requirements

- [ ] `npm run app:web:check` passes after the new review parsers and panels
      are added.
- [ ] `npm run app:web:build` passes after the workflows surface changes.
- [ ] `scripts/test-app-specialist-workspace.mjs` covers planning-family and
      narrative-family review states plus handoffs.
- [ ] `scripts/test-app-shell.mjs` covers workflows deep links and detail
      reopening from shell-level handoffs.
- [ ] `node scripts/test-all.mjs --quick` stays green with the added files and
      smoke coverage.

### Non-Functional Requirements

- [ ] Browser review payloads remain bounded and do not read repo files
      directly.
- [ ] Unsupported or drifted contract payloads fail closed with explicit
      browser error states.
- [ ] Review controls remain accessible, disabled when invalid, and clear
      about manual-review or manual-send boundaries.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Keep only one detail fetch active for the selected workflow family at a
  time.
- Treat mode and session focus as the source of truth; do not let panel state
  drift into a second client-owned selection model.
- Reuse application-help, scan, and batch interaction patterns where they fit
  instead of inventing a second review language.

### Potential Challenges

- Two contract families with different shapes: mitigate with separate parser
  files and a discriminated family union in the shared hook.
- Stale detail after selection changes or session recovery: mitigate with
  request aborts, explicit snapshot invalidation rules, and URL-backed focus.
- Handoff sprawl across multiple shell surfaces: mitigate with one shared rail
  that maps backend-owned next actions to existing shell openers.

### Relevant Considerations

- [P05] **Specialist summary drift**: Keep browser parsers, API payloads, and
  smoke fixtures aligned whenever specialist review fields change.
- [P05-apps/web] **URL-backed focus sync**: Preserve query-driven selection,
  stale-selection recovery, and cleanup for refresh and re-entry.
- [P05] **Bounded payload growth**: Render compact review models, not raw
  packets or transcripts.
- [P05] **Thin browser surfaces**: Keep workflow inference in API contracts,
  not in React state or repo parsing.
- [P05] **Canonical handoff routing**: Reuse shared backend-owned handoff
  routes back into chat, tracker, pipeline, and artifact review.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Showing stale planning or narrative detail after the user changes workflow
  mode or selected session.
- Leaving handoff controls enabled when the detail payload is offline, blocked,
  or missing required state.
- Letting parallel refresh or resume activity create duplicate fetches, lost
  notices, or out-of-order detail rendering.

---

## 9. Testing Strategy

### Unit Tests

- No standalone `apps/web` unit-test runner is currently configured; parser
  correctness should be enforced through strict decoders plus `app:web:check`
  and smoke fixtures.

### Integration Tests

- Extend `scripts/test-app-specialist-workspace.mjs` for planning-family and
  narrative-family detail loading, handoffs, stale-selection recovery, and
  degraded states.
- Extend `scripts/test-app-shell.mjs` for workflows deep links, detail
  reopening, and shell-level specialist handoffs.
- Keep `node scripts/test-all.mjs --quick` aligned with the new web review
  files and smoke coverage.

### Manual Testing

- Select one tracker-specialist workflow and verify review content, warnings,
  and tracker or pipeline handoffs.
- Select one research-specialist workflow and verify narrative packet review,
  manual-send guidance, and artifact or chat handoffs.
- Refresh or reopen the workflows surface with mode and session focus set and
  confirm stale detail does not persist.

### Edge Cases

- Switching mode while a detail request is in flight
- Selected session missing after refresh or resume
- Offline fallback after a previously successful review load
- Approval-paused, rejected, degraded, and completed specialist states

---

## 10. Dependencies

### External Libraries

- React 19 - existing `apps/web` rendering surface
- Playwright - existing browser smoke harness under `scripts/`

### Internal Dependencies

- `apps/api` tracker-specialist and research-specialist routes
- Existing shell focus and handoff helpers in `apps/web/src/shell`
- Existing specialist workspace summary route and client state

### Other Sessions

- **Depends on**: `phase06-session02-specialist-workspace-foundation`,
  `phase06-session03-offer-follow-up-and-pattern-contracts`,
  `phase06-session04-research-and-narrative-specialist-contracts`
- **Depended by**:
  `phase06-session06-dashboard-replacement-maintenance-and-cutover`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
