# Session 05: Approval and Observability Contract

**Session ID**: `phase01-session05-approval-and-observability-contract`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~13
**Estimated Duration**: 2-4 hours

---

## Objective

Add approval pause and resume semantics plus structured logs and traces so runs
can be inspected and safely continued before Phase 02 expands the runtime into
typed tool orchestration.

---

## Scope

### In Scope (MVP)

- Define approval records, pause points, and resume or reject transitions
- Correlate API requests, jobs, sessions, and approvals through structured log
  and trace metadata
- Expose backend diagnostics suitable for pending, failed, and resumed work
- Preserve the read-first and no-stdout-scraping discipline from earlier
  phases

### Out of Scope

- Approval user interface work
- Workflow-specific prompts or decision policies
- Cross-phase tool wrapper implementation

---

## Prerequisites

- [ ] Session 02 SQLite operational store completed
- [ ] Session 04 durable job runner completed

---

## Deliverables

1. Approval state model and pause or resume contract for background runs
2. Structured log and trace pipeline for API and job execution
3. Diagnostics endpoints or summaries for pending approvals and failed runs

---

## Success Criteria

- [ ] Runs can pause for approval and resume or reject cleanly through durable
      backend state
- [ ] Logs and traces can be correlated to sessions, jobs, and approvals
- [ ] Operators can inspect pending or failed runtime work without reading raw
      stdout output
