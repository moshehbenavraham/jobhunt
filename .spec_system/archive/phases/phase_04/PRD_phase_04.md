# PRD Phase 04: Evaluation, Artifacts, and Tracker Parity

**Status**: Complete
**Sessions**: 6
**Estimated Duration**: 6-9 days

**Progress**: 6/6 sessions (100%)

---

## Overview

Phase 04 turns the current shell, typed tool catalog, and durable runtime into
the first complete operator loop the app can own end to end. The focus is the
evaluate-to-artifact path: a pasted JD or live job URL should move from launch
through verification, evaluation, report writing, PDF generation, and tracker
closeout with bounded summaries and durable outputs at every step.

The repo already has the core script and tool foundations for this work. What
is missing is the contract that joins them into operator-facing evaluation,
report, pipeline, and tracker experiences without reopening shell access,
duplicating repo logic in React, or weakening tracker integrity rules.

---

## Progress Tracker

| Session | Name                                    | Status      | Est. Tasks | Validated |
| ------- | --------------------------------------- | ----------- | ---------- | --------- |
| 01      | Evaluation Result Contract              | Complete    | ~12-25     | Yes       |
| 02      | Evaluation Console and Artifact Handoff | Complete    | ~12-25     | Yes       |
| 03      | Report Viewer and Artifact Browser      | Complete    | ~12-25     | Yes       |
| 04      | Pipeline Review Workspace               | Complete    | ~12-25     | Yes       |
| 05      | Tracker Workspace and Integrity Actions | Complete    | ~12-25     | Yes       |
| 06      | Auto-Pipeline Parity and Regression     | Complete    | ~12-25     | Yes       |

---

## Completed Sessions

- Session 01: Evaluation Result Contract
- Session 02: Evaluation Console and Artifact Handoff
- Session 03: Report Viewer and Artifact Browser
- Session 04: Pipeline Review Workspace
- Session 05: Tracker Workspace and Integrity Actions
- Session 06: Auto-Pipeline Parity and Regression

---

## Upcoming Sessions

- None. Phase 04 is complete.

---

## Objectives

1. Deliver a typed evaluation-to-artifact contract that exposes report, PDF,
   tracker, and warning state without parsing raw logs or repo files in the
   browser.
2. Add dedicated operator surfaces for evaluation results, report review,
   pipeline review, and tracker maintenance inside the existing shell.
3. Preserve repo-owned integrity rules for report headers, PDF placement,
   staged tracker additions, merge-and-verify closeout, and live posting
   verification.

---

## Prerequisites

- Phase 03 completed
- Phase 02 evaluation, PDF, tracker, and scan tool sessions remain green
- `node scripts/test-all.mjs --quick` and browser smoke harnesses remain
  usable as parity gates

---

## Technical Considerations

### Architecture

Reuse typed backend tools and durable job summaries as the only write path.
New browser surfaces should consume bounded API read models and explicit
mutation routes instead of reading repo files directly or rebuilding workflow
logic in React state.

### Technologies

- React 19 with TypeScript in `apps/web`
- TypeScript Node runtime in `apps/api`
- `@openai/agents` via the repo-owned account-auth bridge
- SQLite operational state under `.jobhunt-app/`
- Playwright-backed verification and PDF generation
- Existing repo scripts, templates, and tracker utilities

### Risks

- Artifact-summary drift between API payloads and browser parsers:
  mitigate with shared contracts, strict payload parsing, and fixture-backed
  tests.
- Tracker integrity regressions during status edits or merge and verify
  closeout:
  mitigate by routing all changes through canonical backend tools and showing
  validator warnings explicitly.
- Payload bloat or duplicate-submit races in new review surfaces:
  mitigate with bounded preview payloads, selected-detail read models, and
  idempotent mutation guards.

### Relevant Considerations

- [P02-apps/api] **Tool catalog drift**: Keep workflow-specific routes and
  summaries aligned with the registered evaluation and tracker tool set.
- [P02-apps/api] **Durable workflow fan-out**: Preserve the existing enqueue
  and executor boundary as evaluation closeout expands.
- [P03-apps/web] **Frontend parser and fixture drift**: Update browser parsers,
  fake API fixtures, and backend summaries together.
- [P03-apps/web+apps/api] **Interaction race guards**: Apply explicit
  duplicate-submit and idempotence protections to tracker and closeout
  mutations.
- [P03-apps/web] **Shell-wide refresh reuse**: Reuse shared shell refresh paths
  instead of creating isolated state refresh logic for parity surfaces.

---

## Success Criteria

Phase complete when:

- [x] All 6 sessions completed
- [x] JD text and ATS URL workflows produce report, PDF, and tracker artifacts
      with explicit review state in the app
- [x] Operators can inspect reports, pipeline rows, tracker rows, and workflow
      warnings without leaving the app
- [x] Tracker edits and closeout controls preserve canonical status rules and
      merge-and-verify semantics

---

## Dependencies

### Depends On

- Phase 03: Chat, Onboarding, and Approvals UX

### Enables

- Phase 05: Scan, Batch, and Application-Help Parity
