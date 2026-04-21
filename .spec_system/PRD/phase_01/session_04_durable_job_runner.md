# Session 04: Durable Job Runner

**Session ID**: `phase01-session04-durable-job-runner`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~16
**Estimated Duration**: 2-4 hours

---

## Objective

Implement the background job runner that can enqueue work, persist lifecycle
transitions, and resume interrupted long-running runs without duplicating side
effects.

---

## Scope

### In Scope (MVP)

- Define job and run lifecycle states for queued, running, failed, completed,
  and resumable work
- Build the queue, executor, and persistence wiring needed for background runs
- Persist session and run state transitions through the SQLite operational
  store
- Add recovery and retry behavior suitable for local single-user execution

### Out of Scope

- Workflow-specific evaluation or scan logic
- Approval UI surfaces
- Typed tool wrappers beyond the minimum runtime hooks needed for the runner

---

## Prerequisites

- [ ] Session 01 API runtime completed
- [ ] Session 02 SQLite operational store completed
- [ ] Session 03 agent runtime bootstrap completed

---

## Deliverables

1. Background job runner and durable state machine for `apps/api`
2. Persistent run and session lifecycle handling for resumable work
3. Backend tests or smoke checks for enqueue, resume, retry, and terminal
   failure behavior

---

## Success Criteria

- [ ] Long-running jobs can be enqueued, started, resumed, retried, and marked
      failed or completed in structured state
- [ ] Restarting the local backend does not lose in-flight job metadata
- [ ] Recovery paths avoid duplicating completed side effects when resuming
