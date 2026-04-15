# Session 02: Version Ownership Normalization

**Session ID**: `phase00-session02-version-ownership-normalization`
**Status**: Not Started
**Estimated Tasks**: ~12-16
**Estimated Duration**: 2-4 hours

---

## Objective

Normalize repo version ownership around root `VERSION` so updater behavior and
validation gates resolve the same canonical version.

---

## Scope

### In Scope (MVP)

- Align root `VERSION`, `package.json`, updater logic, and validation checks
- Remove or stop reading legacy `docs/VERSION`
- Verify update checks report the real local version after normalization

### Out of Scope

- Release automation beyond the current updater and test harness
- Public docs wording changes unrelated to version ownership

---

## Prerequisites

- [ ] Session 01 completed
- [ ] Canonical version file ownership confirmed

---

## Deliverables

1. One canonical version source wired into updater and validation paths.
2. Removal of legacy version-path dependencies that cause drift.

---

## Success Criteria

- [ ] `node scripts/update-system.mjs check` reports the same local version as
      root `VERSION`
- [ ] Validation no longer requires `docs/VERSION`
- [ ] Repo-owned version references have one authoritative source
