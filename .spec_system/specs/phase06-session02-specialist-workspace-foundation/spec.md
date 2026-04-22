# Session Specification

**Session ID**: `phase06-session02-specialist-workspace-foundation`
**Phase**: 06 - Specialist Workflows, Dashboard Replacement, and Cutover
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 06 Session 01 established a shared backend contract for the remaining
specialist workflows, but the browser still has no app-owned place to launch,
resume, inspect, or re-enter that work. The operator shell currently exposes
chat, scan, batch, application-help, pipeline, tracker, and settings surfaces,
yet specialist work still falls back to generic chat routing or settings-only
support previews. That leaves a parity gap for compare-offers, follow-up,
rejection-patterns, deep research, outreach, interview prep, training review,
and project review.

This session adds the shared specialist workspace foundation in `apps/web`.
The new surface should consume the bounded `specialist-workspace` summary and
action routes from Session 01, render typed workflow inventory plus selected
state, and expose explicit launch, resume, approval, detail-surface, and chat
handoffs without browser-side repo parsing. The shell should gain a stable
`workflows` surface that feels native beside scan, batch, and application-help
instead of behaving like a temporary launcher.

The scope stays intentionally foundational. Session 02 should establish the
shared browser contract, URL-backed focus behavior, loading and degraded state
handling, and the review-frame scaffolding needed for later Phase 06 work.
Sessions 03 and 04 will extend backend summaries for specific workflow
families, and Session 05 will turn this shared frame into richer
workflow-specific review surfaces.

---

## 2. Objectives

1. Add a typed specialist workspace browser surface that renders workflow
   inventory, selected specialist state, warnings, and explicit next actions
   from the Session 01 API contract.
2. Add URL-backed specialist focus and shell integration so mode selection,
   selected session context, refresh, and re-entry remain deterministic across
   navigation and page reloads.
3. Reuse the backend-owned specialist action route for launch and resume
   behavior, while keeping dedicated detail-surface, approval, and chat
   handoffs explicit in the browser.
4. Add browser smoke coverage for ready, tooling-gap, running, waiting,
   dedicated-detail, approval, and stale-selection specialist workspace flows
   so later Phase 06 sessions can extend a stable shell foundation.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell registry, navigation frame, and mounted-surface pattern this
      session must extend.
- [x] `phase03-session02-chat-console-and-session-resume` - provides shared
      resumable session focus and chat handoff behavior that specialist
      launches should reuse.
- [x] `phase04-session02-evaluation-console-and-artifact-handoff` - provides
      the bounded run-state and handoff language this workspace should mirror.
- [x] `phase05-session02-scan-review-workspace` - provides the closest
      `apps/web` list-plus-detail review pattern with URL-backed focus and
      shell-mounted workflow handoff behavior.
- [x] `phase05-session04-batch-jobs-workspace-and-run-detail` - provides the
      bounded run-panel and detail-rail composition pattern for resumable
      workflow workspaces.
- [x] `phase05-session06-application-help-review-and-approvals` - provides the
      specialist-style review and dedicated detail-surface pattern this shared
      workspace must coexist with.
- [x] `phase06-session01-specialist-workflow-intake-and-result-contracts` -
      provides the canonical browser contract, action route, and workflow
      metadata this session must consume without changing ownership.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic browser contracts, shell
  integration rules, and no-new-dependency expectations
- `.spec_system/CONSIDERATIONS.md` for specialist summary drift, URL-backed
  focus sync, bounded payloads, thin-browser rules, and canonical handoff
  routing expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the clean posture and the
  requirement to keep repo reads, approvals, and sensitive actions
  backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/archive/phases/phase_06/PRD_phase_06.md` for shell, deep-link, and
  specialist parity requirements
- `apps/api/src/server/specialist-workspace-contract.ts` and
  `apps/api/src/server/specialist-workspace-summary.ts` for the typed payloads,
  filters, run-state semantics, and action-response shapes the browser must
  parse strictly
- `apps/web/src/scan/`, `apps/web/src/batch/`, and
  `apps/web/src/application-help/` for browser fetch, URL focus, polling, and
  review-surface composition patterns already used in the app
- `apps/web/src/shell/` for surface registration, navigation, and mounted
  shell callbacks
- `scripts/test-app-shell.mjs` and the existing Playwright harness for browser
  smoke coverage expectations

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- Playwright Chromium available for `scripts/test-app-shell.mjs` and the new
  specialist workspace smoke coverage
- Existing quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add a dedicated specialist workspace inside the operator shell with one
  workflow inventory, one selected specialist state view, and explicit next
  actions driven entirely by bounded backend contracts.
- Consume the `specialist-workspace` GET summary and POST action routes through
  strict browser parsers and namespaced URL-backed focus helpers for selected
  mode and selected session.
- Reuse explicit shell handoffs for chat, approvals, and dedicated detail
  surfaces instead of creating browser-owned workflow routing or repo reads.
- Keep support-state messaging explicit for ready, tooling-gap, waiting,
  degraded, completed, stale-selection, and missing-session specialist states.
- Add browser smoke coverage for specialist workspace navigation, launch,
  resume, handoff, and recovery behavior.

### Out of Scope (Deferred)

- Workflow-specific compare-offers, follow-up, patterns, research, outreach,
  interview, training, or project result layouts - _Reason: Sessions 03, 04,
  and 05 own those deeper specialist summaries and review panels._
- Changes to the Session 01 backend contract beyond browser-consumption needs -
  _Reason: Session 01 already owns the API surface._
- Dashboard replacement, update-check polish, and cutover decisions -
  _Reason: those remain Session 06 work._
- Direct browser reads of repo-owned markdown, tracker files, or generated
  artifacts - _Reason: the browser trust boundary stays fail-closed and
  backend-owned._

---

## 5. Technical Approach

### Architecture

Create a new `apps/web/src/workflows/` package that mirrors the patterns used
by scan, batch, and application-help: one strict contract parser, one client,
one state hook, and one composed workspace with smaller presentation panels.
The client should fetch the bounded specialist workspace summary, submit launch
and resume actions to the specialist workspace action route, and keep focus in
the URL through dedicated query parameters for selected mode and selected
session.

The shell should gain a new `workflows` surface in `apps/web/src/shell/`.
Navigation should expose the surface as a first-class operator area rather than
burying specialist work in chat or settings previews. Inside the workspace, the
browser should present three coordinated areas: a workflow inventory and launch
panel, a selected specialist run-state panel, and a handoff rail for
approvals, chat, and dedicated detail surfaces such as application-help. These
views should consume only the API contract from Session 01 and should never
infer readiness by reading repo files directly.

Run-state behavior should stay shared and explicit. The hook should poll only
while the selected specialist session is active or waiting, reconcile stale
mode or session selections on refresh, and map launch or resume responses into
clear notices and revalidation behavior. When the backend indicates a
dedicated-detail surface, such as application-help, the specialist workspace
should hand off there rather than duplicating layout or business logic.

### Design Patterns

- Strict browser parsing: treat the Session 01 specialist workspace contract as
  the only source of truth for workflow inventory, selection, run state, and
  next actions
- URL-backed focus: keep selected mode and selected session recoverable across
  refresh, re-entry, and shell navigation
- Shared workspace frame: reuse scan, batch, and application-help composition
  patterns instead of building one-off specialist shells
- Explicit handoff routing: open chat, approvals, and dedicated detail surfaces
  through shell-owned callbacks rather than browser guesses
- Thin browser boundary: keep launches, resumes, approvals, and repo access
  behind backend routes and typed action responses

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing browser fetch helpers, `AbortController`, `startTransition`, and
  `useDeferredValue`
- Existing shell surface registry and URL-focus patterns
- Existing Playwright smoke harness and repo quick regression gate
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                           | Purpose                                                                                                            | Est. Lines |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| `apps/web/src/workflows/specialist-workspace-types.ts`         | Define strict specialist-workspace payload parsers, query-param helpers, and action-response types for the browser | ~360       |
| `apps/web/src/workflows/specialist-workspace-client.ts`        | Fetch workspace summaries, submit launch or resume actions, and sync URL-backed specialist focus                   | ~380       |
| `apps/web/src/workflows/use-specialist-workspace.ts`           | Coordinate refresh, polling, selection recovery, notices, and action lifecycle state                               | ~340       |
| `apps/web/src/workflows/specialist-workspace-launch-panel.tsx` | Render workflow inventory, intake hints, support-state messaging, and launch entry points                          | ~260       |
| `apps/web/src/workflows/specialist-workspace-state-panel.tsx`  | Render selected workflow run state, result availability, warnings, and resume affordances                          | ~260       |
| `apps/web/src/workflows/specialist-workspace-detail-rail.tsx`  | Render dedicated-detail, approval, chat, and review handoffs for the selected workflow                             | ~240       |
| `apps/web/src/workflows/specialist-workspace-surface.tsx`      | Compose the specialist workspace layout and shell-facing interaction seams                                         | ~280       |
| `scripts/test-app-specialist-workspace.mjs`                    | Browser smoke coverage for workflows navigation, launch, resume, dedicated-detail, and recovery flows              | ~360       |

### Files to Modify

| File                                         | Changes                                                                                          | Est. Lines |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| `apps/web/src/shell/shell-types.ts`          | Register the workflows shell surface and keep shell parsing exhaustive                           | ~40        |
| `apps/web/src/shell/navigation-rail.tsx`     | Add workflows navigation copy and specialist-aware badge behavior                                | ~70        |
| `apps/web/src/shell/operator-shell.tsx`      | Mount the specialist workspace and wire shell-owned chat, approval, and detail-surface callbacks | ~120       |
| `apps/web/src/shell/surface-placeholder.tsx` | Keep placeholder handling exhaustive after the workflows surface is added                        | ~40        |
| `scripts/test-app-shell.mjs`                 | Extend shell smoke coverage for workflows navigation and cross-surface handoffs                  | ~180       |
| `scripts/test-all.mjs`                       | Add specialist workspace smoke and ASCII coverage to the quick regression suite                  | ~50        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operators can open a dedicated workflows surface in the shell, select a
      specialist mode, and inspect bounded state without opening raw repo
      artifacts.
- [ ] Ready specialist workflows can launch or resume through the
      backend-owned specialist workspace action route from inside the shared
      workspace.
- [ ] Tooling-gap, waiting, degraded, stale-selection, and missing-session
      states remain explicit and actionable in the browser.
- [ ] Dedicated detail-surface, approval, and chat handoffs stay explicit and
      route through shell-owned callbacks instead of browser-inferred paths.

### Testing Requirements

- [ ] Browser smoke coverage covers ready, tooling-gap, running or waiting,
      dedicated-detail, approval-handoff, and stale-selection specialist
      workspace flows.
- [ ] Shell smoke coverage covers workflows navigation, mounted rendering, and
      specialist handoffs into chat or application-help.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `node scripts/test-app-specialist-workspace.mjs`,
      `node scripts/test-app-shell.mjs`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Browser code never reads repo files directly for specialist workspace
      state.
- [ ] Workspace payloads remain bounded by one selected specialist detail and
      typed workflow inventory instead of raw artifact dumps.
- [ ] URL-backed focus survives refresh and re-entry with deterministic
      stale-selection recovery.
- [ ] Launch and resume controls prevent duplicate submissions while a request
      is in flight.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Session 01 already returns workflow inventory, selected state, warnings,
  result availability, and action routes. The browser should consume those
  payloads directly instead of rebuilding specialist routing from chat or
  settings state.
- The shell already owns cross-surface navigation. Specialist workspace
  callbacks should reuse that seam for chat, approvals, and application-help
  handoffs instead of inventing a second navigation model.
- Application-help already has a dedicated review surface. The shared
  specialist workspace should treat that as a routed detail surface, not a
  duplicated layout.

### Potential Challenges

- Contract drift between Session 01 API payloads and browser parsers:
  mitigate with strict type guards, fail-closed parsing, and smoke fixtures.
- Focus-state collisions across shell surfaces: mitigate with namespaced query
  parameters and deterministic reconciliation on refresh and re-entry.
- Ambiguous specialist support states for tooling-gap workflows: mitigate with
  explicit warning copy, next-action mapping, and disabled launch controls.

### Relevant Considerations

- [P05] **Specialist summary drift**: Keep browser parsers, workflow copy, and
  smoke fixtures aligned with the Session 01 API contract.
- [P05-apps/web] **URL-backed focus sync**: Preserve query-state cleanup,
  refresh recovery, and stale-selection repair when the new workflows surface
  is added.
- [P05] **Bounded payload growth**: Keep the shared workspace limited to typed
  inventory plus one selected detail instead of exposing raw specialist
  artifacts.
- [P05] **Thin browser surfaces**: Keep workflow inference in API contracts,
  not in React state or browser-side repo parsing.
- [P05] **Canonical handoff routing**: Reuse the same backend-owned handoff
  model already established by chat, scan, batch, and application-help.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- Stale query state selects a missing mode or session after refresh and leaves
  the workspace in an ambiguous state.
- Duplicate launch or resume clicks create conflicting specialist sessions or
  hide the true in-flight state from the operator.
- Dedicated-detail, approval, or tooling-gap states render as vague status text
  instead of explicit next actions and bounded handoffs.

---

## 9. Testing Strategy

### Unit Tests

- Validate specialist-workspace payload parsing, mode or session focus helpers,
  and fail-closed handling for unexpected enum or warning values.
- Validate notice mapping for launch, resume, tooling-gap, degraded, and
  missing-session action responses.

### Integration Tests

- Exercise shell-mounted workflows navigation, summary fetch, selected-mode
  reconciliation, and specialist handoffs into chat or application-help.
- Exercise polling and revalidation paths for running and waiting specialist
  sessions.

### Manual Testing

- Open the workflows surface, switch between specialist modes, refresh the
  page, and confirm selected mode or session focus survives without hidden
  browser state.
- Launch or resume a specialist run, confirm duplicate-trigger guards, and
  verify explicit handoff behavior for chat, approvals, and dedicated detail
  surfaces.

### Edge Cases

- Requested mode is no longer supported by the backend summary.
- Requested session no longer exists for the selected mode.
- Selected workflow is tooling-gap or degraded and must remain reviewable but
  not launchable.
- Browser goes offline after a previously successful specialist summary load.

---

## 10. Dependencies

### External Libraries

- React 19: mounted workspace surface and state coordination
- Playwright: browser smoke coverage through the existing test harness

### Other Sessions

- **Depends on**: `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase03-session02-chat-console-and-session-resume`,
  `phase04-session02-evaluation-console-and-artifact-handoff`,
  `phase05-session02-scan-review-workspace`,
  `phase05-session04-batch-jobs-workspace-and-run-detail`,
  `phase05-session06-application-help-review-and-approvals`,
  `phase06-session01-specialist-workflow-intake-and-result-contracts`
- **Depended by**: `phase06-session05-specialist-review-surfaces`,
  `phase06-session06-dashboard-replacement-maintenance-and-cutover`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
