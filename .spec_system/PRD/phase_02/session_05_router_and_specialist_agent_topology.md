# Session 05: Router and Specialist Agent Topology

**Session ID**: `phase02-session05-router-and-specialist-agent-topology`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Define the router and initial specialist agent orchestration layer that selects
workflows, composes prompt bundles, and calls the new typed tool surfaces
through one backend-owned runtime contract.

---

## Scope

### In Scope (MVP)

- Define the router or orchestrator service that maps user intent and workflow
  state onto prompt bundles, agent roles, and tool availability
- Add the initial specialist-agent boundaries for evaluation, scan, tracker,
  application-help or research, and batch-supervision work
- Reuse the typed tools, prompt-loader, approval-runtime, job-runner, and
  observability services instead of free-form shell or prompt branching
- Add validation coverage for workflow selection, bounded tool access,
  specialist handoff, and deterministic orchestration failures

### Out of Scope

- Web chat and conversation UX
- Full parity implementation for every specialist workflow
- Dashboard replacement and late-phase review surfaces

---

## Prerequisites

- [ ] Session 01 tool registry and execution policy completed
- [ ] Session 02 workspace and startup tools completed
- [ ] Session 03 evaluation, PDF, and tracker tools completed
- [ ] Session 04 scan, pipeline, and batch tools completed

---

## Deliverables

1. Router or orchestrator service with explicit workflow and specialist mapping
2. Initial specialist-agent definitions with bounded tool-access policy
3. Validation and smoke coverage for tool-driven orchestration paths

---

## Success Criteria

- [ ] Workflow routing is explicit and deterministic rather than shell-driven
- [ ] Specialist agents can only reach the typed tools and prompt bundles they
      are supposed to use
- [ ] Later UX phases can start and resume runs through one backend
      orchestration surface without depending on Codex-specific behavior
