# Session 01: Evaluation Result Contract

**Session ID**: `phase04-session01-evaluation-result-contract`
**Status**: Complete
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours
**Package**: apps/api

---

## Objective

Expose a typed backend contract for evaluation runs that reports artifact
status, warnings, and closeout state without requiring the browser to parse raw
logs or repo files.

---

## Scope

### In Scope (MVP)

- Define a bounded evaluation summary for single-evaluation and auto-pipeline
  sessions
- Surface report, PDF, tracker-addition, approval, and warning state in one
  canonical API contract
- Add route and contract tests for pending, running, waiting, failed, and
  completed evaluation outcomes

### Out of Scope

- New browser surfaces for report or tracker review
- Full auto-pipeline parity closeout

---

## Prerequisites

- [x] `phase02-session03-evaluation-pdf-and-tracker-tools`
- [x] `phase03-session02-chat-console-and-session-resume`
- [x] `phase03-session04-approval-inbox-and-human-review-flow`

---

## Deliverables

1. API read model for evaluation artifact packet state
2. Route support for bounded evaluation result summaries
3. Contract coverage for artifact-ready, waiting, failed, and degraded states

---

## Success Criteria

- [ ] Browser clients can fetch evaluation artifact state from one typed API
      summary
- [ ] Completed evaluation summaries include explicit report, PDF, tracker, and
      warning fields
- [ ] No evaluation UI depends on raw stdout or direct repo-file parsing
