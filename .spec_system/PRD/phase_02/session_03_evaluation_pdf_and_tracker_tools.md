# Session 03: Evaluation, PDF, and Tracker Tools

**Session ID**: `phase02-session03-evaluation-pdf-and-tracker-tools`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~16
**Estimated Duration**: 2-4 hours

---

## Objective

Wrap the core evaluate-to-artifact path as typed backend tools so later phases
can trigger job extraction, evaluation, PDF generation, and tracker-safe
artifact updates without depending on Codex-specific shell orchestration.

---

## Scope

### In Scope (MVP)

- Add typed tools for JD or URL intake, single evaluation, auto-pipeline
  primitives, ATS PDF generation, and report-artifact discovery
- Add tracker-integrity helpers for TSV staging, merge, verify, and related
  maintenance commands needed by the evaluation flow
- Reuse the constrained execution adapters from Session 01 plus the guarded
  workspace rules for artifact writes
- Add validation coverage for artifact paths, tracker write discipline, and
  deterministic warning or error mapping

### Out of Scope

- Scan, batch, and pipeline-review async workflows
- Compare-offers and late specialist workflows
- Operator-facing report or tracker UI

---

## Prerequisites

- [ ] Session 01 tool registry and execution policy completed
- [ ] Session 02 workspace and startup tools completed

---

## Deliverables

1. Typed evaluation, PDF, and artifact-discovery tool wrappers
2. Tracker-safe mutation helpers that preserve TSV-first and merge-then-verify
   discipline
3. Validation coverage for the main evaluation-to-artifact contract

---

## Success Criteria

- [ ] Backend tools can run the core evaluation and PDF path with typed inputs
      and deterministic outputs
- [ ] Tracker additions, merge behavior, and verification remain aligned with
      existing repo rules
- [ ] Later parity work can reuse these tools without embedding shell commands
      or tracker logic inside UI flows
