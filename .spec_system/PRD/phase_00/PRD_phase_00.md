# PRD Phase 00: Foundation and Repo Contract

**Status**: In Progress
**Sessions**: 4
**Estimated Duration**: 3-5 days

**Progress**: 2/4 sessions (50%)

---

## Overview

Establish the web and API app skeleton, lock the repo boundary for the new
runtime, and prove the app can boot against the current workspace without
mutating user artifacts. This phase turns the PRD's phase-00 goals into a
concrete monorepo package plan plus the backend contracts that later phases
will build on.

---

## Progress Tracker

| Session | Name | Status | Est. Tasks | Validated |
|---------|------|--------|------------|-----------|
| 01 | Monorepo App Skeleton | Complete | ~14 | 2026-04-21 |
| 02 | Workspace Adapter Contract | Complete | ~15 | 2026-04-21 |
| 03 | Prompt Loading Contract | Not Started | ~14 | - |
| 04 | Boot Path and Validation | Not Started | ~13 | - |

---

## Completed Sessions

1. Session 01: Monorepo App Skeleton
2. Session 02: Workspace Adapter Contract

---

## Upcoming Sessions

- Session 03: Prompt Loading Contract

---

## Objectives

1. Establish the `apps/web` and `apps/api` package structure for the local app.
2. Formalize canonical repo path access, prompt loading, and app-owned state
   boundaries.
3. Prove the app can boot against the repo with a deterministic validation
   path and no user-data mutation on startup.

---

## Prerequisites

- Master PRD and UX PRD reviewed for the app-parity effort
- Existing repo data contract and instruction surfaces treated as canonical
- No prior implementation phase required

---

## Technical Considerations

### Architecture

Phase 00 should create the minimum app scaffold needed for later runtime work:
two packages (`apps/web` and `apps/api`), an app-owned state root under
`.jobhunt-app/`, a backend-owned workspace adapter for repo reads and writes,
and a prompt-loading contract that explicitly resolves checked-in instruction
files such as `AGENTS.md`, `modes/_shared.md`, `modes/_profile.md`, and the
selected mode file.

### Technologies

- React in `apps/web` for the future primary operator surface
- Node.js and TypeScript in `apps/api` for the local backend and adapters
- Existing repo docs, scripts, templates, and mode files as canonical inputs
- Repo validation commands such as `npm run doctor` and
  `node scripts/test-all.mjs --quick`

### Risks

- Prompt drift: if the app bypasses checked-in mode files, behavior will fork
- Hidden state split: if app bootstrap writes domain data, debugging will get
  harder before parity is even in place
- Scaffold sprawl: package setup can overrun the phase unless each session
  stays focused on a single contract

### Relevant Considerations

- [P00] **Canonical live surface**: treat `AGENTS.md`, `.codex/skills/`, and
  `docs/` as the live instruction sources when defining loaders and links
- [P02] **Trust boundary is file-based**: keep the backend adapter explicit and
  avoid broad shell semantics in app-facing flows
- [P00] **Validator-first closeout**: wire contract checks alongside the new
  bootstrap path so drift is visible early
- [P02] **Live contract first**: prefer checked-in repo contracts over narrative
  summaries when deciding what the app should load

---

## Success Criteria

Phase complete when:

- [ ] All 4 sessions are completed
- [ ] `apps/web` and `apps/api` exist with a coherent package/tooling baseline
- [ ] The backend can resolve canonical repo surfaces through an explicit
      workspace adapter
- [ ] Prompt and profile sources load from checked-in files in a deterministic
      order
- [ ] The app can boot against the repo and validate its contract without
      mutating user-layer artifacts

---

## Dependencies

### Depends On

- `.spec_system/PRD/PRD.md`
- `.spec_system/PRD/PRD_UX.md`
- `docs/DATA_CONTRACT.md`

### Enables

- Phase 01: Backend Runtime and Job Infrastructure
