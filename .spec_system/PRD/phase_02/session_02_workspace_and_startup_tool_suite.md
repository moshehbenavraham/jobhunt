# Session 02: Workspace and Startup Tool Suite

**Session ID**: `phase02-session02-workspace-and-startup-tool-suite`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Expose read-first startup, onboarding, and workspace-inspection tools that let
the future app inspect prerequisites, summarize repo state, and repair missing
user-layer files through existing templates and workspace rules.

---

## Scope

### In Scope (MVP)

- Add typed tools for startup-check inspection, required-file status, prompt
  and profile summaries, and workspace artifact discovery
- Add guarded onboarding repair tools that create missing user-layer files from
  existing examples and templates
- Reuse the workspace adapter and prompt-loader contracts instead of open-coded
  file access in tool handlers
- Add validation coverage for read-only inspection, missing-file repair, and
  data-contract-safe write boundaries

### Out of Scope

- Evaluation, PDF, tracker, scan, or batch execution tools
- Chat-shell onboarding UX
- Specialist agent orchestration

---

## Prerequisites

- [ ] Session 01 tool registry and execution policy completed
- [ ] Phase 00 workspace and prompt contracts reviewed

---

## Deliverables

1. Startup and workspace-inspection tool suite for app boot and routing
2. Template-backed onboarding repair tools for required user-layer files
3. Validation coverage for safe reads, guarded writes, and missing-file flows

---

## Success Criteria

- [ ] Backend tools can inspect startup readiness and workspace state without
      hidden writes
- [ ] Missing required files can be repaired through bounded template-backed
      tool calls
- [ ] Later UX work can drive onboarding and settings flows without adding new
      ad hoc file-access logic
