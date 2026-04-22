# PRD Phase 05: Scan, Batch, and Application-Help Parity

**Status**: In Progress
**Sessions**: 6
**Estimated Duration**: 7-10 days

**Progress**: 5/6 sessions (83%)

---

## Overview

Phase 05 extends the Phase 04 shell from evaluation parity into the repo's
highest-value async workflows. The app already has typed scan and batch tools,
durable jobs, approvals, and bounded report, pipeline, and tracker surfaces.
What it does not yet have is an operator-owned way to run portal scans, review
shortlists, supervise batch jobs, retry failures, or complete application-help
flows without falling back to the legacy batch runner or Codex-led review.

This phase closes that gap by reusing the same backend-owned summary pattern
from Phase 04. Scan, batch, and application-help work should stay bounded,
approval-aware, and resumable. The browser should review typed state and call
explicit backend actions; repo writes, tracker closeout, and sensitive actions
must remain server-owned and fail closed.

---

## Progress Tracker

| Session | Name                                  | Status      | Est. Tasks | Validated  |
| ------- | ------------------------------------- | ----------- | ---------- | ---------- |
| 01      | Scan Shortlist Contract               | Completed   | ~12-25     | 2026-04-22 |
| 02      | Scan Review Workspace                 | Completed   | ~12-25     | 2026-04-22 |
| 03      | Batch Supervisor Contract             | Completed   | ~12-25     | 2026-04-22 |
| 04      | Batch Jobs Workspace and Run Detail   | Completed   | ~12-25     | 2026-04-22 |
| 05      | Application-Help Draft Contract       | Completed   | ~12-25     | 2026-04-22 |
| 06      | Application-Help Review and Approvals | Not Started | ~12-25     | -          |

---

## Completed Sessions

1. Session 01: Scan Shortlist Contract
2. Session 02: Scan Review Workspace
3. Session 03: Batch Supervisor Contract
4. Session 04: Batch Jobs Workspace and Run Detail

---

## Upcoming Sessions

- Session 06: Application-Help Review and Approvals

---

## Objectives

1. Expose typed backend contracts for scan shortlist state, batch item state,
   and application-help draft state so browser surfaces stay bounded and
   deterministic.
2. Add app-owned operator surfaces for scan review, batch supervision, retry
   and resume flows, and application-help draft review without reopening shell
   or direct repo access in the browser.
3. Preserve repo-owned file contracts and approval boundaries for scan history,
   reports, PDFs, tracker TSVs, tracker merge and verify, and candidate-facing
   outputs.
4. Keep the new async workflows covered by smoke and quick regression gates so
   Phase 06 can focus on the remaining specialist gaps instead of repairing
   core scan or batch parity.

---

## Prerequisites

- Phase 04 completed
- Phase 02 scan and batch tool suites remain green
- Phase 03 approval inbox and shell runtime remain stable
- `node scripts/test-all.mjs --quick` remains usable as a phase gate

---

## Technical Considerations

### Architecture

Extend the backend-owned read-model and mutation-route pattern from Phase 04.
Scan, batch, and application-help surfaces should consume typed API summaries,
not infer workflow state from repo files or raw logs in React. Durable job
state, approval checkpoints, retry controls, and merge-plus-verify actions
stay owned by `apps/api`, while `apps/web` focuses on review, selection, and
explicit operator actions.

### Technologies

- React 19 with TypeScript in `apps/web`
- TypeScript Node runtime in `apps/api`
- `@openai/agents` through the repo-owned account-auth bridge
- SQLite operational state under `.jobhunt-app/`
- Existing repo scripts, templates, and mode prompts
- Playwright-backed browser smoke coverage and live workflow helpers

### Risks

- Scan shortlist and pipeline parser drift: mitigate with strict contracts,
  fixture-backed summary tests, and smoke coverage for shortlist handoff.
- Batch item-state ambiguity or retry races: mitigate with bounded item models,
  explicit action states, and backend-owned idempotent mutations.
- Application-help approval or draft-state confusion: mitigate with explicit
  draft packets, approval IDs, resumable state, and a no-submit contract.
- Payload growth in long-running async workflows: mitigate with paged or
  selected-detail summaries instead of raw artifact reads.

### Relevant Considerations

- [P04] **Review-focus contract drift**: Reuse backend-owned handoff models for
  scan, batch, and application-help instead of adding browser inference paths.
- [P04-apps/api] **Markdown parser fragility**: Coordinate repo-parser changes
  with fixture and route-test updates.
- [P04] **Bounded parity payloads**: Keep shortlist, batch matrix, and draft
  summaries capped so polling remains fast.
- [P04] **Smoke suite coverage**: Add or update scan, batch, and
  application-help smoke flows whenever a new surface or action lands.
- [P04] **Read-only browser boundary**: Keep repo writes, tracker mutations,
  and sensitive workflow actions behind backend routes and tools.

---

## Success Criteria

Phase complete when:

- [ ] All 6 sessions completed
- [ ] Operators can run portal scans, review shortlist candidates, and send
      selected roles into evaluation or batch follow-through from the app
- [ ] Operators can create or resume batch jobs, inspect warnings, retry
      failed items, and complete merge-plus-verify without the legacy batch
      runner UX
- [ ] Operators can complete application-help flows with explicit draft outputs
      and approval checkpoints while preserving the no-submit rule
- [ ] The new scan, batch, and application-help paths stay covered by smoke
      tests and the quick regression gate

---

## Dependencies

### Depends On

- Phase 04: Evaluation, Artifacts, and Tracker Parity

### Enables

- Phase 06: Specialist Workflows, Dashboard Replacement, and Cutover
