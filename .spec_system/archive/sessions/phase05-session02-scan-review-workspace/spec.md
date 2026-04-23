# Session Specification

**Session ID**: `phase05-session02-scan-review-workspace`
**Phase**: 05 - Scan, Batch, and Application-Help Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 05 Session 01 established the backend-owned scan-review contract, but
the operator still has no app-owned place to launch scans or review shortlist
results. The shell can show startup, chat, pipeline, tracker, and artifact
surfaces, yet portal scan work still depends on indirect routes instead of a
dedicated review workspace inside the app.

This session adds that missing `/scan` workspace in `apps/web`. The browser
should consume the bounded scan-review summary from Session 01, render shortlist
cards plus one selected-detail rail, and make duplicate context, warnings, and
ignore or restore decisions explicit. The shell should feel like one coherent
operator surface rather than a set of disconnected review tools.

The handoff path matters as much as the rendering. Selected candidates should
launch single-evaluation or batch-evaluation through the existing orchestration
contract and shared chat session focus, not through browser-owned workflow
inference or raw repo writes. That preserves the thin-browser boundary now and
leaves dedicated batch supervision to Sessions 03 and 04.

---

## 2. Objectives

1. Add a typed scan-review browser surface that renders launcher state,
   shortlist candidates, selected detail, warnings, and ignore or restore
   actions from the Session 01 API contract.
2. Add URL-backed scan focus, refresh, and shortlist review behavior so
   selection, filters, and re-entry stay deterministic across refreshes and
   shell navigation.
3. Reuse the existing orchestration and chat session flow for scan launch,
   evaluation handoff, and batch-seed handoff instead of inventing a second
   workflow launcher in the browser.
4. Add browser smoke coverage for empty, warning, ignore or restore,
   evaluation-handoff, and batch-seed handoff flows so later batch sessions can
   build on a stable scan review surface.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell registry and navigation frame this workspace must extend.
- [x] `phase04-session04-pipeline-review-workspace` - provides the bounded
      list-plus-detail review pattern and URL-backed focus behavior this
      workspace should mirror.
- [x] `phase05-session01-scan-shortlist-contract` - provides the canonical
      scan-review API contract, ignore or restore route, and handoff payloads
      this session must consume without changing ownership.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic browser contracts,
  no-new-dependency expectations, and repo-level validation gates
- `.spec_system/CONSIDERATIONS.md` for bounded payloads, URL-backed focus
  cleanup, thin-browser rules, and canonical handoff routing expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  requirement to keep repo reads and sensitive actions backend-owned
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_05/PRD_phase_05.md` for scan, shell, and handoff
  parity requirements
- `apps/api/src/server/scan-review-contract.ts`,
  `apps/api/src/server/scan-review-summary.ts`, and the `/scan-review` routes
  for the bounded shortlist, warning, and handoff shapes already provided
- `apps/web/src/pipeline/`, `apps/web/src/tracker/`, `apps/web/src/chat/`, and
  `apps/web/src/shell/` for browser parsing, URL focus, shell wiring, and
  orchestration-launch patterns already used elsewhere in the app
- `scripts/test-app-shell.mjs` and the existing Playwright smoke harness for
  browser-level contract verification

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- Playwright Chromium available for `scripts/test-app-shell.mjs` and the new
  scan-review smoke coverage
- Existing quick regression gate available through
  `node scripts/test-all.mjs --quick`

---

## 4. Scope

### In Scope (MVP)

- Add a dedicated scan workspace inside the operator shell with launcher
  readiness, active-run messaging, shortlist cards, selected detail, and a
  sticky action shelf.
- Consume the bounded `/scan-review` GET payload plus ignore or restore action
  route through strict browser parsers and URL-backed focus helpers.
- Reuse the shared orchestration route to start `scan-portals`,
  `single-evaluation`, and `batch-evaluation` flows from the scan surface
  using backend-provided handoff payloads.
- Keep shortlist actions and status notices explicit for duplicate-heavy,
  already-pending, approval-paused, degraded, stale-selection, and empty-result
  states.
- Add browser smoke coverage for navigation, shortlist review, ignore or
  restore, and evaluation or batch handoff behavior.

### Out of Scope (Deferred)

- Batch item-matrix review, retry controls, merge, or verify actions -
  _Reason: Sessions 03 and 04 own batch supervision and closeout._
- Any change to the scan-review server contract beyond browser-consumption
  needs - _Reason: Session 01 already owns the backend contract._
- Direct browser writes to `data/pipeline.md`, `data/scan-history.tsv`, or
  batch files - _Reason: repo mutations remain backend-owned and fail closed._
- Generic specialist-workspace routing or dashboard replacement -
  _Reason: those are Phase 06 concerns._

---

## 5. Technical Approach

### Architecture

Create a new `apps/web/src/scan/` package that mirrors the pipeline and tracker
workspace structure: one strict contract parser, one URL-backed client, one
state hook, and one composed surface with smaller presentation panels. The
client should fetch the bounded scan-review summary, parse only declared fields,
and keep shortlist focus in the URL through scan-specific query parameters for
bucket, offset, selected URL, include-ignored state, and optional session
scope.

The scan workspace should present three coordinated areas: a launcher and
runtime panel, a shortlist review grid, and a selected-detail action shelf.
The shortlist panel should show fit bucket, duplicate history, pending overlap,
and warning summaries without reading raw repo files. The action shelf should
render the selected candidate, allow ignore or restore, and expose explicit
evaluate and batch actions using the handoff payloads already returned by the
API.

Workflow launches should stay shared and backend-owned. Instead of inventing a
scan-specific orchestration endpoint, the workspace should reuse the existing
orchestration POST path through the browser client, then sync chat session
focus and switch the shell to the chat surface when a launch succeeds. For
batch seeds, the browser should launch `batch-evaluation` with the backend-
provided selection payload and rely on chat for immediate session visibility
until the dedicated batch workspace arrives in later Phase 05 sessions.

### Design Patterns

- Strict browser parsing: treat the scan-review API contract as the only source
  of shortlist, warning, and handoff truth
- URL-backed list-plus-detail focus: keep scan selection recoverable across
  refresh, re-entry, and cross-surface navigation
- Shared orchestration launch path: reuse the chat and orchestration seam for
  scan, evaluation, and batch launches instead of duplicating workflow logic
- Thin browser surface: keep ignore or restore state, launch actions, and repo
  writes behind backend routes
- Responsive shell composition: reuse the shell frame and existing review
  language so scan feels native to the current operator experience

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing browser fetch helpers, `AbortController`, and URL focus patterns
- Existing orchestration route and chat session summary flow
- Existing shell surface registry and navigation rail
- Playwright-backed browser smoke coverage
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                             | Purpose                                                                                                           | Est. Lines |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/scan/scan-review-types.ts`         | Define strict parser helpers and typed scan-review payloads for the browser                                       | ~320       |
| `apps/web/src/scan/scan-review-client.ts`        | Fetch scan-review summaries, submit ignore or restore actions, launch shared workflows, and sync URL-backed focus | ~360       |
| `apps/web/src/scan/use-scan-review.ts`           | Coordinate scan refresh, selection, action notices, and recovery behavior                                         | ~320       |
| `apps/web/src/scan/scan-review-launch-panel.tsx` | Render launcher readiness, active-run detail, and scan-state warnings                                             | ~220       |
| `apps/web/src/scan/scan-review-shortlist.tsx`    | Render shortlist cards, filters, selection, and ignore-state visibility                                           | ~300       |
| `apps/web/src/scan/scan-review-action-shelf.tsx` | Render selected detail, warning context, and evaluation or batch handoff controls                                 | ~280       |
| `apps/web/src/scan/scan-review-surface.tsx`      | Compose the full scan workspace layout and shell-facing interaction seams                                         | ~280       |
| `scripts/test-app-scan-review.mjs`               | Browser smoke coverage for scan review, ignore or restore, and workflow handoffs                                  | ~340       |

### Files to Modify

| File                                         | Changes                                                                                        | Est. Lines |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/chat/chat-console-client.ts`   | Export shared chat session focus helpers so scan handoffs can land on the right chat context   | ~90        |
| `apps/web/src/chat/use-chat-console.ts`      | Reuse shared chat focus helpers and keep session selection behavior aligned with scan handoffs | ~80        |
| `apps/web/src/shell/shell-types.ts`          | Register the scan surface in the shell registry and keep shell parsing exhaustive              | ~30        |
| `apps/web/src/shell/navigation-rail.tsx`     | Add scan navigation copy and a readiness-aware badge                                           | ~40        |
| `apps/web/src/shell/surface-placeholder.tsx` | Keep placeholder handling exhaustive after the scan surface is added                           | ~30        |
| `apps/web/src/shell/operator-shell.tsx`      | Mount the scan workspace and wire shared chat handoff callbacks                                | ~100       |
| `scripts/test-app-shell.mjs`                 | Extend shell smoke coverage for scan navigation and scan-to-chat handoff                       | ~180       |
| `scripts/test-all.mjs`                       | Add scan-review smoke and ASCII coverage to the quick regression suite                         | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operators can open a dedicated scan workspace in the shell, launch or
      refresh scan review, and inspect shortlist candidates without opening raw
      repo artifacts.
- [ ] Duplicate hints, pending-overlap notes, degraded states, stale
      selections, and ignored-candidate behavior remain explicit and
      actionable in the browser.
- [ ] Selected candidates can launch `single-evaluation` through the shared
      orchestration path and move the shell to the matching chat session.
- [ ] Selected candidates can seed `batch-evaluation` through the shared
      orchestration path without inventing a new batch workspace before Session 04.

### Testing Requirements

- [ ] Browser smoke coverage covers empty, ready, warning, ignore or restore,
      evaluation-handoff, and batch-seed handoff flows.
- [ ] Shell smoke coverage covers scan navigation, surface rendering, and chat
      handoff focus after scan launches.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `node scripts/test-app-scan-review.mjs`, `node scripts/test-app-shell.mjs`,
      and `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Browser code never reads repo files directly for scan review.
- [ ] Scan payloads remain bounded by API-provided limits and one selected
      detail record rather than full shortlist dumps or raw logs.
- [ ] URL-backed scan focus survives refresh and re-entry with stale-selection
      recovery instead of hidden browser-only state.
- [ ] Launch and ignore or restore controls prevent duplicate submissions while
      a request is in flight.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Session 01 already returns evaluate and batch-seed handoff metadata. The
  browser should consume those payloads directly instead of rebuilding prompt
  or selection context.
- The current chat surface already owns orchestration launches and resumable
  session visibility. Scan handoffs should reuse that seam instead of adding a
  second browser-owned workflow launcher.
- Batch supervision is not in scope yet. A successful batch seed from scan
  should land in chat and preserve context until the dedicated batch workspace
  is built later in Phase 05.

### Potential Challenges

- Stale shortlist focus after ignore or restore or after a new scan completes:
  revalidate the selected URL and show explicit fallback messaging.
- Cross-surface focus drift between scan and chat: use one shared URL sync
  helper for chat session focus and one shell-owned surface switch path.
- Overcrowded shortlist or detail panels on smaller screens: keep the layout
  responsive and preserve a clear action shelf without hiding warning context.

### Relevant Considerations

- [P04] **Review-focus contract drift**: Reuse backend-owned handoff and focus
  models instead of inventing scan-specific browser inference.
- [P04-apps/web] **URL-backed focus sync**: Preserve cleanup, refresh, and
  re-entry handling when the scan surface adds another URL-driven review path.
- [P04] **Bounded parity payloads**: Keep shortlist previews capped and rely on
  one selected-detail payload instead of broader browser-side state.
- [P04] **Read-only browser boundary**: Keep repo reads and ignore or restore
  mutations behind backend routes.
- [P04] **Smoke suite coverage**: Extend browser smoke coverage whenever new
  scan review actions or handoff paths land.
- [P04] **Backend-owned review focus**: Apply the same focus and handoff model
  used by report, pipeline, and tracker review.
- [P04] **Strict browser parsing**: Fail closed when the scan-review payload
  drifts from the declared contract.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Duplicate scan, evaluation, or batch launches while the workspace is already
  refreshing or mutating candidate visibility
- Stale selected-detail state after ignore or restore or after a new scan
  result replaces the previous shortlist
- Cross-surface confusion when a scan action launches chat but the browser does
  not preserve the matching session focus

---

## 9. Testing Strategy

### Unit Tests

- Validate scan-review payload parsing, focus query encoding, and action-
  response handling through deterministic fixture assertions in the browser
  smoke harness plus TypeScript exhaustiveness checks.

### Integration Tests

- Verify shell navigation, launcher state rendering, ignore or restore actions,
  selected-detail recovery, and evaluation or batch orchestration handoffs
  against mocked API responses in `scripts/test-app-scan-review.mjs` and
  `scripts/test-app-shell.mjs`.

### Manual Testing

- Launch the app, open the scan surface, refresh shortlist data, ignore a
  candidate, restore it, send one role to evaluation, seed one batch launch,
  and confirm the shell lands in chat with the correct selected session.

### Edge Cases

- Empty shortlist
- Stale selected URL after shortlist refresh
- Approval-paused or degraded scan run summaries
- Duplicate-heavy and already-pending candidates
- Offline API during refresh or action submission
- Double-clicked launch or ignore controls while a request is still pending

---

## 10. Dependencies

### External Libraries

- `react`: existing app dependency for shell surface composition
- `typescript`: existing workspace dependency for strict parser and hook typing
- `playwright`: existing smoke-test dependency for browser regression coverage

### Other Sessions

- **Depends on**:
  `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase04-session04-pipeline-review-workspace`,
  `phase05-session01-scan-shortlist-contract`
- **Depended by**:
  `phase05-session03-batch-supervisor-contract` directly, with
  `phase05-session04-batch-jobs-workspace-and-run-detail` relying on the scan
  handoff behavior established here

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
