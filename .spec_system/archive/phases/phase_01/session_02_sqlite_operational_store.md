# Session 02: SQLite Operational Store

**Session ID**: `phase01-session02-sqlite-operational-store`
**Package**: apps/api
**Status**: Not Started
**Estimated Tasks**: ~15
**Estimated Duration**: 2-4 hours

---

## Objective

Add the SQLite-backed operational state layer for sessions, jobs, approvals,
and run metadata without migrating the repo-owned domain artifacts out of their
current file surfaces.

---

## Scope

### In Scope (MVP)

- Define the initial SQLite schema and storage location under `.jobhunt-app/`
- Add backend repository helpers for sessions, jobs, approvals, and run
  metadata
- Keep the source-of-truth boundary explicit between SQLite operational state
  and repo-owned workflow artifacts
- Provide deterministic setup and validation behavior for the new store

### Out of Scope

- Executing long-running jobs
- User-facing database tooling
- Moving tracker, reports, or profile data into SQLite

---

## Prerequisites

- [ ] Session 01 API runtime completed
- [ ] App-owned state root and repo-boundary rules reviewed

---

## Deliverables

1. SQLite schema and initialization path for app-owned runtime state
2. Repository layer for sessions, jobs, approvals, and run metadata
3. Validation coverage for store creation and basic read and write flows

---

## Success Criteria

- [ ] SQLite state initializes inside `.jobhunt-app/` without leaking into
      repo-owned artifact paths
- [ ] Backend code can persist and reload sessions, jobs, approvals, and run
      metadata through typed helpers
- [ ] Missing or corrupt store conditions fail with actionable diagnostics
