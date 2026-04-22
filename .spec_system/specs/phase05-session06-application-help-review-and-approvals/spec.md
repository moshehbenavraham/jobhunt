# Session Specification

**Session ID**: `phase05-session06-application-help-review-and-approvals`
**Phase**: 05 - Scan, Batch, and Application-Help Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 05 Sessions 02-05 closed the scan workspace, batch supervision, and the
backend-owned application-help contract, but the operator shell still has no
dedicated way to launch or review application-help work. Today the workflow
can route through chat and the API can expose bounded draft-review state, yet
the browser still lacks a first-class surface for draft packets, warnings,
approval pauses, rejected follow-through, and resumable handoff.

This session adds the missing application-help workspace in `apps/web`. The
browser should consume the bounded `/application-help` summary, render matched
report and PDF context, show staged draft answers and next-review guidance, and
keep one selected or latest application-help session recoverable through the
URL. Launch and resume should reuse the existing chat-command route instead of
creating a second browser-owned orchestration path.

The no-submit boundary remains the core product rule. The new surface must keep
draft status explicit, route approval work through the existing inbox, and hand
operators back into chat, artifacts, or approvals without implying automated
submission or browser-owned file access. When this session lands, Phase 05 will
have complete scan, batch, and application-help operator parity inside the app.

---

## 2. Objectives

1. Add a typed application-help workspace in `apps/web` that renders the
   Session 05 summary contract without browser-side workflow inference.
2. Add URL-backed application-help session focus, polling, and launch or resume
   actions so operators can recover review context across refresh and shell
   navigation.
3. Keep approval, rejection, resume, report, and artifact handoffs explicit in
   the browser while preserving backend ownership and the repo's no-submit
   rule.
4. Add browser smoke coverage for missing-context, no-draft-yet, draft-ready,
   approval-paused, rejected, resumed, completed, and latest-fallback flows so
   Phase 06 can build on a stable specialist surface.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell registry and mounting seams this workspace must extend.
- [x] `phase03-session02-chat-console-and-session-resume` - provides the
      launch and resume command path this surface should reuse.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      approval review and interrupted-run surface application-help must hand off
      to.
- [x] `phase04-session03-report-viewer-and-artifact-browser` - provides the
      report and PDF artifact handoff path this workspace should reuse.
- [x] `phase05-session04-batch-jobs-workspace-and-run-detail` - provides the
      current Phase 05 pattern for thin browser workspaces, URL focus, and
      cross-surface handoff.
- [x] `phase05-session05-application-help-draft-contract` - provides the
      bounded `/application-help` summary and staged draft-packet contract this
      session must consume.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic browser contracts,
  no-new-dependency expectations, and repo-level validation gates
- `.spec_system/CONSIDERATIONS.md` for thin-browser rules, bounded payloads,
  URL-backed focus cleanup, and smoke-coverage expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  requirement to keep repo reads and draft storage backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_05/PRD_phase_05.md` for Phase 05 parity goals and
  specialist-workspace UX expectations
- `.spec_system/PRD/phase_05/session_06_application_help_review_and_approvals.md`
  for the session stub and deliverable boundaries
- `apps/api/src/server/application-help-contract.ts`,
  `apps/api/src/server/application-help-summary.ts`, and
  `apps/api/src/server/routes/application-help-route.ts` for the canonical
  summary shapes and route behavior
- `apps/web/src/chat/`, `apps/web/src/approvals/`, `apps/web/src/reports/`,
  `apps/web/src/scan/`, `apps/web/src/batch/`, and `apps/web/src/shell/` for
  browser parsing, launch or resume seams, and shell handoff patterns already
  used in the app
- `scripts/test-app-shell.mjs` and the Playwright smoke harness for browser
  regression coverage

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- Playwright Chromium available for `scripts/test-app-application-help.mjs`
  and `scripts/test-app-shell.mjs`
- Existing quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add a dedicated application-help shell surface with launch input, latest or
  selected session review, staged draft answers, warning state, approval
  awareness, and explicit next-review guidance.
- Consume the bounded `/application-help` GET summary through strict browser
  parsers, URL-backed `sessionId` focus, and polling behavior tied to resumable
  or review-pending states.
- Reuse the existing chat command route for launch and resume instead of adding
  a second browser-owned orchestration path.
- Reuse existing shell handoffs so operators can move from application-help
  review into approvals, report viewer, or chat session context without losing
  focus.
- Add browser smoke coverage for latest-fallback, draft-ready,
  approval-paused, rejected, resumed, completed, and offline application-help
  review flows.

### Out of Scope (Deferred)

- Changes to the backend application-help summary or draft-packet contract -
  _Reason: Session 05 already owns the API boundary._
- Automatic application submission, browser form filling, or tracker mutation
  after user submission - _Reason: the repo's no-submit rule remains absolute._
- Cover-letter generation, upload automation, or cover-letter artifact support -
  _Reason: that repo gap is still unresolved and remains manual follow-up._
- Generic specialist-workspace infrastructure for other workflows -
  _Reason: broader specialist routing remains Phase 06 work._
- Dashboard replacement and cutover work - _Reason: those belong to Phase 06._

---

## 5. Technical Approach

### Architecture

Create a new `apps/web/src/application-help/` package that mirrors the scan and
batch workspace structure: one strict contract parser, one browser client, one
state hook, and one composed surface with smaller presentation panels. The
client should fetch the bounded `/application-help` summary, parse only declared
fields, and keep one focused `applicationHelpSessionId` query value in the URL
so the browser can recover the current application-help review state on refresh
or shell re-entry.

Launch and resume should stay on the existing command route instead of creating
an application-help-only runner API. The new hook can reuse the chat-console
command submission seam to launch a new `application-help` workflow or resume a
selected session, then revalidate the application-help summary and route the
operator into the correct shell surface. This keeps orchestration ownership
backend-side and avoids parallel browser logic.

The application-help workspace should present three coordinated areas. A launch
panel should hold request input, last refresh state, and the no-submit review
boundary. A draft-review panel should show staged answer items, warnings, and
next-review guidance for missing-context, no-draft-yet, draft-ready,
approval-paused, rejected, resumed, and completed states. A context rail should
show matched report and PDF metadata, approval or failure detail, and explicit
handoff controls into approvals, artifacts, or chat.

### Design Patterns

- Strict browser parsing: treat the application-help contract as the only source
  of review, warning, and next-action truth
- URL-backed session focus: keep the selected or latest application-help
  session recoverable across refresh, re-entry, and shell navigation
- Shared command-route ownership: reuse the existing chat launch or resume path
  instead of adding workflow-specific browser orchestration
- Thin browser surface: keep report reads, draft-packet storage, approvals, and
  session orchestration behind backend routes
- Explicit no-submit messaging: keep review-required and submission-disallowed
  state visible in the workspace copy itself

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing browser fetch helpers, `AbortController`, and URL-focus patterns
- Existing chat-console command route for launch and resume operations
- Existing shell, approval-inbox, and report-viewer handoff seams
- Existing Playwright smoke-test harness
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                              | Purpose                                                                                            | Est. Lines |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/application-help/application-help-types.ts`         | Define strict parser helpers, review-state enums, warning items, and focus helpers for the browser | ~320       |
| `apps/web/src/application-help/application-help-client.ts`        | Fetch application-help summaries, sync URL focus, and reuse chat-command launch or resume seams    | ~340       |
| `apps/web/src/application-help/use-application-help.ts`           | Coordinate summary refresh, polling, focus state, and launch or resume notices                     | ~340       |
| `apps/web/src/application-help/application-help-launch-panel.tsx` | Render request input, refresh state, latest-session summary, and explicit no-submit copy           | ~240       |
| `apps/web/src/application-help/application-help-draft-panel.tsx`  | Render staged answer items, warning state, review notes, and next-review messaging                 | ~300       |
| `apps/web/src/application-help/application-help-context-rail.tsx` | Render matched report metadata, PDF state, approval detail, failure detail, and handoff actions    | ~320       |
| `apps/web/src/application-help/application-help-surface.tsx`      | Compose the full application-help workspace layout and shell-facing callbacks                      | ~260       |
| `scripts/test-app-application-help.mjs`                           | Browser smoke coverage for launch, review, approval, rejection, resume, and latest-fallback flows  | ~340       |

### Files to Modify

| File                                                | Changes                                                                                         | Est. Lines |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/shell/shell-types.ts`                 | Register the application-help surface in the shell registry and keep surface parsing exhaustive | ~40        |
| `apps/web/src/shell/navigation-rail.tsx`            | Add application-help navigation copy and runtime-aware badge behavior                           | ~60        |
| `apps/web/src/shell/surface-placeholder.tsx`        | Keep placeholder handling exhaustive after the new surface is added                             | ~30        |
| `apps/web/src/shell/operator-shell.tsx`             | Mount the application-help surface and wire approval, artifact, and chat handoff callbacks      | ~120       |
| `apps/web/src/approvals/approval-inbox-surface.tsx` | Add application-help review handoff from the shared approvals surface                           | ~40        |
| `apps/web/src/approvals/interrupted-run-panel.tsx`  | Add application-help review return path for paused or resumed sessions                          | ~70        |
| `scripts/test-app-shell.mjs`                        | Extend shell smoke coverage for application-help navigation and cross-surface handoffs          | ~220       |
| `scripts/test-all.mjs`                              | Add application-help workspace smoke and ASCII coverage to the quick regression suite           | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operators can open a dedicated application-help surface in the shell,
      launch or resume the workflow, and keep review context visible
      throughout the run.
- [ ] Draft outputs, warnings, review notes, approval pauses, rejection state,
      and next-review guidance remain explicit in the browser instead of
      collapsing into chat-only context.
- [ ] Operators can move from application-help review into approvals, artifact
      review, or chat session context without losing the selected session.
- [ ] The application-help workspace keeps draft review explicit and never
      implies submit-ready automation or browser-owned filesystem access.

### Testing Requirements

- [ ] Browser smoke coverage covers latest-fallback, draft-ready,
      approval-paused, rejected, resumed, completed, and offline
      application-help flows.
- [ ] Shell smoke coverage covers application-help navigation plus artifact,
      approval, and chat handoffs from the new surface.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `node scripts/test-app-application-help.mjs`,
      `node scripts/test-app-shell.mjs`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Browser code never reads `reports/` or `.jobhunt-app/` directly for
      application-help review.
- [ ] Application-help payloads remain bounded to one selected or latest
      session plus one latest draft packet instead of raw transcript or report
      dumps.
- [ ] URL-backed session focus survives refresh and re-entry with stale-session
      recovery instead of hidden browser-only state.
- [ ] Launch and resume controls prevent duplicate submissions while requests
      are in flight and revalidate correctly after repeated entry.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Reuse the backend-owned application-help summary contract exactly as exposed
  by Session 05 instead of adding browser inference.
- Keep launch and resume on the existing chat-command route so workflow
  ownership stays backend-side.
- Keep the no-submit boundary and manual cover-letter follow-up visible in the
  application-help surface copy itself.

### Potential Challenges

- Launch and resume drift: reuse the existing command route and do not create a
  second application-help runner seam.
- Stale session focus after approval resolution: keep URL-backed focus and
  revalidation logic explicit in the hook.
- Rejected versus failed state confusion: show approval, failure, and next-step
  guidance separately so the operator can tell what action is required.

### Relevant Considerations

- [P04] **Review-focus contract drift**: Reuse backend-owned application-help
  summary fields and shell handoff patterns instead of adding browser inference
  paths.
- [P04-apps/web] **URL-backed focus sync**: Preserve cleanup, refresh, and
  re-entry handling when adding application-help session focus.
- [P04] **Bounded parity payloads**: Keep the application-help workspace bound
  to one selected or latest session and one staged draft packet.
- [P04] **Smoke suite coverage**: Add or extend browser smoke coverage when the
  new application-help surface and handoff controls land.
- [P04] **Read-only browser boundary**: Keep report reads, draft packet access,
  and approval state backend-owned and fail closed in the browser.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Losing application-help session focus after approval resolution, resume, or
  refresh
- Rendering stale or partial draft-review state that implies submission
  readiness when review is still required
- Creating split launch or resume behavior between the application-help surface,
  chat command path, and approval inbox

---

## 9. Testing Strategy

### Unit Tests

- Keep parser and focus logic isolated so contract and URL helpers can be
  exercised deterministically by the browser smoke harness and any focused
  parser assertions added during implementation.

### Integration Tests

- Add `scripts/test-app-application-help.mjs` coverage for latest-fallback,
  draft-ready, approval-paused, rejected, resumed, completed, and offline
  flows.
- Extend `scripts/test-app-shell.mjs` to verify navigation and handoff routes
  between application-help, approvals, artifacts, and chat.
- Run `npm run app:web:check`, `npm run app:web:build`, and
  `node scripts/test-all.mjs --quick` after integration.

### Manual Testing

- Launch a new application-help request from the shell and confirm the surface
  keeps the selected session visible after refresh.
- Load a latest-fallback review state with no explicit `sessionId` and confirm
  the shell recovers the correct session.
- Open an approval-paused or rejected application-help session, hand off into
  the approval inbox, and confirm the operator can return to the review surface
  without losing context.

### Edge Cases

- `sessionId` missing or invalid in the URL
- Missing-context state when no report or PDF match exists
- No-draft-yet state before a staged packet exists
- Offline or error state after the last good application-help summary
- Re-entry after a rejected or resumed session updates its state

---

## 10. Dependencies

### External Libraries

- Existing React 19 and TypeScript browser runtime only
- Existing Playwright smoke-test harness

### Other Sessions

- **Depends on**: `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase03-session02-chat-console-and-session-resume`,
  `phase03-session04-approval-inbox-and-human-review-flow`,
  `phase04-session03-report-viewer-and-artifact-browser`,
  `phase05-session04-batch-jobs-workspace-and-run-detail`,
  `phase05-session05-application-help-draft-contract`
- **Depended by**: Phase 06 specialist workflow sessions and dashboard-cutover
  work that assume application-help parity already exists in the shell

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
