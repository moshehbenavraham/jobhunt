# PRD Phase 06: Specialist Workflows, Dashboard Replacement, and Cutover

**Status**: In Progress
**Sessions**: 6
**Estimated Duration**: 8-12 days

**Progress**: 2/6 sessions (33%)

---

## Overview

Phase 06 closes the remaining parity gaps between the repo's Codex-primary
workflow and the app-owned runtime. Phase 05 established bounded scan, batch,
and application-help summaries plus review surfaces. What still remains is the
specialist workflow set, the dashboard-equivalent operator views, and the final
cutover work needed to make the app the default single-user path.

This phase should keep the same architectural discipline established in Phases
04 and 05. Specialist workflows must stay backend-owned, bounded, and
approval-aware. Browser surfaces should render typed summaries, route explicit
actions, and avoid direct repo parsing or hidden workflow inference. The phase
ends when a single operator can use the app for normal daily operation without
launching `codex`, while preserving the repo-owned file contract and no-submit
boundary.

---

## Progress Tracker

| Session | Name                                            | Status      | Est. Tasks | Validated  |
| ------- | ----------------------------------------------- | ----------- | ---------- | ---------- |
| 01      | Specialist Workflow Intake and Result Contracts | Complete    | ~12-25     | 2026-04-22 |
| 02      | Specialist Workspace Foundation                 | Complete    | ~12-25     | 2026-04-22 |
| 03      | Offer, Follow-Up, and Pattern Contracts         | Not Started | ~12-25     | -          |
| 04      | Research and Narrative Specialist Contracts     | Not Started | ~12-25     | -          |
| 05      | Specialist Review Surfaces                      | Not Started | ~12-25     | -          |
| 06      | Dashboard Replacement, Maintenance, and Cutover | Not Started | ~12-25     | -          |

---

## Completed Sessions

1. Session 01: Specialist Workflow Intake and Result Contracts
2. Session 02: Specialist Workspace Foundation

---

## Upcoming Sessions

- Session 03: Offer, Follow-Up, and Pattern Contracts

---

## Objectives

1. Bring the remaining specialist workflows behind typed app-owned contracts,
   bounded summaries, and explicit launch or resume paths.
2. Deliver shared and specialist-specific review surfaces that preserve the
   browser trust boundary while replacing the remaining dashboard and shell
   fallbacks.
3. Finalize settings, maintenance, update-check, and onboarding surfaces so
   the app becomes the primary single-user operator path.
4. Validate end-to-end parity and make a documented cutover decision for the
   legacy Go dashboard and Codex CLI onboarding path.

---

## Prerequisites

- Phase 05 completed
- Existing quick regression gate remains green enough to extend
- The legacy Go dashboard remains available for parity comparison until cutover
- Repo-owned scripts, templates, and tracker contracts remain the source of
  truth during the migration

---

## Technical Considerations

### Architecture

Keep the thin-browser pattern from Phases 04 and 05. Specialist workflow
inference, repo reads, approvals, and mutations stay owned by `apps/api`,
while `apps/web` renders typed summaries, route-owned actions, and explicit
handoffs. Reuse shared shell, navigation, and review patterns where possible
instead of building one-off specialist surfaces.

### Technologies

- React 19 with TypeScript in `apps/web`
- TypeScript Node runtime in `apps/api`
- `@openai/agents` through the repo-owned account-auth bridge
- SQLite operational state under `.jobhunt-app/`
- Existing repo scripts, templates, and mode prompts
- Playwright-backed smoke coverage and live workflow helpers

### Risks

- Specialist summary drift across many workflow families: mitigate with typed
  contracts, fixture-backed tests, and shared parser utilities.
- Hidden dashboard or CLI dependencies during cutover: mitigate with explicit
  parity checks and app-owned maintenance surfaces before retirement decisions.
- Payload growth as specialist flows accumulate more context: mitigate with
  bounded summaries, focused detail views, and backend-selected handoff data.
- Browser trust-boundary regression: mitigate by keeping repo writes,
  approval-sensitive actions, and workflow mutations behind backend routes.
- Final cutover regressions across existing scan, batch, and tracker flows:
  mitigate by keeping smoke coverage and quick regression gates current.

### Relevant Considerations

- [P05] **Specialist summary drift**: Keep API payloads, browser parsers, and
  smoke fixtures aligned as the remaining workflows land.
- [P05-apps/api] **Markdown parser fragility**: Coordinate markdown and sidecar
  parser changes with fixture and route-test updates.
- [P05-apps/web] **URL-backed focus sync**: Reuse query-driven selection and
  stale-selection recovery for specialist and dashboard views.
- [P05] **Bounded payload growth**: Prefer compact read models over raw
  artifact exposure or unbounded polling state.
- [P05] **Thin browser surfaces**: Keep workflow inference in API contracts,
  not in React state or direct repo parsing.
- [P05] **Canonical handoff routing**: Reuse the shared backend-owned handoff
  model across chat, specialist workspaces, and dashboard replacement views.
- [P05] **Read-only browser boundary**: Keep repo writes and sensitive actions
  backend-owned and fail closed.

---

## Success Criteria

Phase complete when:

- [ ] All 6 sessions completed
- [ ] Operators can run the remaining specialist workflows from the app
      without dropping back to Codex or shell-driven review
- [ ] Dashboard-equivalent status, review, and maintenance views exist in the
      app and cover the legacy daily operator path
- [ ] Settings, update-check, and onboarding surfaces no longer treat `codex`
      as the primary single-user entry point
- [ ] Final parity validation and cutover notes document whether the Go
      dashboard can be retired or kept as a secondary surface

---

## Dependencies

### Depends On

- Phase 05: Scan, Batch, and Application-Help Parity

### Enables

- PRD completion and maintenance-only follow-through
