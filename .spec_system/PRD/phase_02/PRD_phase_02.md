# PRD Phase 02: Typed Tools and Agent Orchestration

**Status**: In Progress
**Sessions**: 5
**Estimated Duration**: 4-6 days

**Progress**: 1/5 sessions (20%)

---

## Overview

Build the backend-owned tool and orchestration layer that sits between the
existing repo logic and the future app UX. This phase turns the Phase 01
runtime into a deterministic execution surface that can validate inputs, call
checked-in scripts and workspace helpers through typed contracts, and wire a
router plus specialist agents without depending on Codex-specific shell
semantics.

The goal is not full workflow parity yet. The goal is to make later phases use
stable tool wrappers, durable job executors, and explicit agent boundaries
instead of re-creating orchestration logic inside UI code or free-form prompt
space.

---

## Progress Tracker

| Session | Name                                 | Status      | Est. Tasks | Validated |
|---------|--------------------------------------|-------------|------------|-----------|
| 01 | Tool Registry and Execution Policy | Complete | ~15 | 2026-04-21 |
| 02 | Workspace and Startup Tool Suite | Not Started | ~14 | - |
| 03 | Evaluation, PDF, and Tracker Tools | Not Started | ~16 | - |
| 04 | Scan, Pipeline, and Batch Tools | Not Started | ~15 | - |
| 05 | Router and Specialist Agent Topology | Not Started | ~14 | - |

---

## Completed Sessions

- `phase02-session01-tool-registry-and-execution-policy`
---

## Upcoming Sessions

- Session 02: Workspace and Startup Tool Suite

---

## Objectives

1. Establish one typed execution surface for repo scripts and workspace
   mutations with deterministic validation and error mapping.
2. Cover the startup, evaluation, artifact, tracker, scan, pipeline, and batch
   primitives that later UX phases need for parity.
3. Wire a router plus bounded specialist agents on top of the Phase 01 runtime,
   approval, and observability contracts.

---

## Prerequisites

- Phase 01 completed and archived
- `apps/api` runtime, job-runner, approval-runtime, and observability services
  treated as canonical
- Existing repo scripts, modes, templates, and data-contract rules treated as
  authoritative

---

## Technical Considerations

### Architecture

Keep tool invocation and agent orchestration inside `apps/api`. The backend
should expose a registry-backed tool catalog, typed input and output schemas,
workspace-aware mutation helpers, and constrained script adapters. Agent
orchestration should reuse the existing prompt-loader, service container,
durable job runner, approval runtime, and observability services rather than
introducing a second runtime path.

### Technologies

- Node.js and TypeScript in `apps/api`
- Existing workspace adapter and prompt-loader modules from Phases 00 and 01
- Existing repo scripts under `scripts/` as the deterministic workflow basis
- Existing Playwright and liveness helpers for browser-backed verification
- Existing validation commands such as `npm run app:validate` and
  `node scripts/test-all.mjs --quick`

### Risks

- Tool drift: wrappers can fork from live script behavior if contracts are too
  lossy or normalize away important warnings
- Approval bypass: mutation-capable tools must preserve approval and
  observability boundaries instead of creating side effects directly
- Scope creep: tool coverage can sprawl into Phase 03-06 UX work unless
  session boundaries stay strict

### Relevant Considerations

- [P01] **Single runtime boundary**: keep tool selection, service wiring, and
  agent orchestration on one backend-owned path
- [P01-apps/api] **Auth/provider readiness coupling**: surface actionable
  readiness failures when a tool or agent needs authenticated runtime state
- [P01] **Best-effort observability**: tool runs should emit metadata-only
  events without blocking durable job execution
- [P01-apps/api] **Duplicate execution guardrails**: preserve lease ownership,
  idempotent approval resolution, and checkpoint-aware retries for tool-driven
  jobs
- [P01] **Registry-backed routing**: use explicit registries for tool and agent
  selection rather than ad hoc branching

---

## Success Criteria

Phase complete when:

- [ ] All 5 sessions completed
- [ ] Backend-owned typed tools can call repo logic without exposing raw shell
      access to end-user prompt space
- [ ] Tool execution returns deterministic validation, warning, and error
      shapes suitable for UI and runtime diagnostics
- [ ] Router and specialist agents can select workflows and call typed tools
      through one orchestrated backend surface
- [ ] Later parity phases can reuse these contracts without reintroducing
      Codex-specific execution semantics

---

## Dependencies

### Depends On

- Phase 01: Backend Runtime and Job Infrastructure

### Enables

- Phase 03: Chat, Onboarding, and Approvals UX
- Phase 04: Evaluation, Artifacts, and Tracker Parity
- Phase 05: Scan, Batch, and Application-Help Parity
- Phase 06: Specialist Workflows, Dashboard Replacement, and Cutover
