# Session Specification

**Session ID**: `phase00-session04-boot-path-and-validation`
**Phase**: 00 - Foundation and Repo Contract
**Status**: Complete
**Created**: 2026-04-21
**Package**: cross-cutting (`apps/web`, `apps/api`)
**Package Stack**: TypeScript React + TypeScript Node

---

## 1. Session Overview

This session turns the Phase 00 contracts into the first minimal runnable app
path across both packages. Sessions 01-03 established the workspace scaffold,
repo boundary rules, and prompt-loading contract. What is still missing is a
live boot path that proves the web shell can reach the API, the API can
inspect the live repo without mutating user files, and the bootstrap contract
is visible as an explicit status surface instead of CLI-only output.

The implementation should add a small HTTP server in `apps/api` that exposes a
health endpoint plus a read-only startup diagnostics payload built from the
workspace and prompt contracts. In parallel, `apps/web` should replace the
static scaffold copy with a bootstrap status screen that fetches and renders
that payload using explicit loading, error, offline, and missing-prerequisite
states. The goal is not full workflow execution. The goal is to prove the app
can boot against a live repo clone and make startup state inspectable.

This session is next because it is the only remaining incomplete Phase 00
session after the prompt-loading contract. It unlocks later runtime and UX
work by proving that path resolution, prompt summaries, and missing-file
diagnostics can cross the package boundary in a deterministic and validated
way.

---

## 2. Objectives

1. Expose a minimal API boot surface that reports health and startup
   diagnostics from the live repo without mutating any user-layer files.
2. Replace the web placeholder with a startup page that renders actionable
   bootstrap state from the API using explicit loading, ready, error, and
   offline states.
3. Add a deterministic local boot path and validation harness that proves the
   web and API packages work together from the repo root.
4. Lock Phase 00 with contract-focused regression coverage before Phase 01
   begins deeper runtime work.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session01-monorepo-app-skeleton` - provides the workspace
      layout, package tooling, and app-owned state boundary.
- [x] `phase00-session02-workspace-adapter-contract` - provides typed repo
      surface resolution and missing-file classification.
- [x] `phase00-session03-prompt-loading-contract` - provides inspectable
      prompt summaries and routing metadata for boot diagnostics.

### Required Tools/Knowledge

- `AGENTS.md` startup checklist and read-first workspace rules
- `.spec_system/CONVENTIONS.md` for package structure and validation approach
- Existing API diagnostics and prompt summary exports in `apps/api/src/`
- Existing Vite React scaffold in `apps/web/src/`

### Environment Requirements

- Node.js and npm installed for the repo workspace
- Write access to `apps/web/`, `apps/api/`, `scripts/`, and `.spec_system/`
- Live repo clone available for local boot validation
- User-layer files preserved as read-only inputs during bootstrap checks

---

## 4. Scope

### In Scope (MVP)

- API can start a minimal local server that exposes deterministic `/health`
  and `/startup` JSON responses for the live repo.
- API startup diagnostics can report repo resolution, missing prerequisites,
  prompt-contract summary, and mutation policy without creating user files.
- Web can fetch the startup payload and render clear operator-facing state for
  ready, missing-file, failure, and offline conditions.
- Repo can validate the cross-package boot path through automated checks that
  fail when diagnostics drift or bootstrap begins mutating user-layer files.

### Out of Scope (Deferred)

- Workflow execution, run timelines, or report generation - *Reason: later
  phases own runtime job execution and artifact flows.*
- Approval inbox, onboarding forms, or tracker editing UI - *Reason: Phase 03
  owns operator-facing onboarding and approval UX.*
- OpenAI account auth bootstrapping or agent orchestration - *Reason: later
  runtime phases own transport and agent wiring after the boot contract is
  proven.*

---

## 5. Technical Approach

### Architecture

Keep the boot path thin and contract-first. The API should reuse the existing
`getStartupDiagnostics()` surface rather than inventing a second bootstrap
model. Add a small `apps/api/src/server/` module that turns the diagnostics
into HTTP responses, keeps routing explicit, and separates one-shot CLI
diagnostics from long-lived server startup.

The web package should add a small bootstrap feature slice rather than grow
`App.tsx` into a monolith. A typed client should fetch the API startup payload
with bounded timeout behavior, a hook should own fetch lifecycle and status
state, and presentational components should render diagnostics in a way that
stays usable when the API is unavailable or required files are missing.

Validation should stay repo-owned and deterministic. Reuse package checks plus
one repo-level smoke harness that builds the app, launches the API server on
an ephemeral port, fetches the boot endpoints, and confirms startup checks do
not mutate user-layer files.

### Design Patterns

- Contract reuse first: derive HTTP startup output from the existing workspace
  and prompt contracts.
- Thin server boundary: keep request routing small and map failures to
  explicit status responses.
- Feature-sliced UI bootstrap: separate fetch logic, state, and rendering in
  `apps/web`.
- Repo-level smoke validation: prove cross-package boot from the root instead
  of isolated package-only checks.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- React 19 and Vite 8 in `apps/web`
- Node standard library HTTP primitives for the minimal server
- Existing workspace and prompt modules in `apps/api/src/`
- Existing repo quick-suite harness in `scripts/test-all.mjs`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/server/startup-status.ts` | Serialize startup diagnostics into HTTP-safe boot payloads | ~120 |
| `apps/api/src/server/http-server.ts` | Minimal HTTP server for `/health` and `/startup` responses | ~170 |
| `apps/api/src/server/index.ts` | Server bootstrap exports separate from CLI diagnostics | ~30 |
| `apps/api/src/server/http-server.test.ts` | Package-local endpoint and no-mutation tests | ~180 |
| `apps/web/src/boot/startup-types.ts` | Shared client-side startup payload types | ~60 |
| `apps/web/src/boot/startup-client.ts` | Fetch client with timeout and typed error mapping | ~110 |
| `apps/web/src/boot/use-startup-diagnostics.ts` | Hook for loading, ready, error, and offline boot states | ~110 |
| `apps/web/src/boot/startup-status-panel.tsx` | Main diagnostics renderer for startup summary and prompt contract state | ~170 |
| `apps/web/src/boot/missing-files-list.tsx` | Focused renderer for onboarding-blocking prerequisites | ~80 |
| `scripts/test-app-bootstrap.mjs` | Repo-level boot smoke harness for API and web integration | ~180 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/index.ts` | Keep CLI diagnostics and server entry wiring explicit | ~50 |
| `apps/api/package.json` | Add deterministic server and boot-contract test commands | ~12 |
| `apps/web/src/App.tsx` | Replace placeholder content with the bootstrap status screen | ~120 |
| `apps/web/vite.config.ts` | Add local API proxy or base-origin handling for boot requests | ~30 |
| `package.json` | Add root boot smoke and validation commands | ~12 |
| `scripts/test-all.mjs` | Register the cross-package boot harness in the repo quick suite | ~25 |

---

## 7. Success Criteria

### Functional Requirements

- [x] The app can boot against a live repo clone with deterministic path
      resolution across `apps/web` and `apps/api`.
- [x] API startup checks expose repo resolution, prompt summary, and missing
      prerequisite diagnostics without mutating user-layer files.
- [x] Web bootstrap UI renders explicit loading, ready, missing-file, error,
      and offline states from the API startup payload.
- [x] The minimal health surface makes bootstrap failures inspectable without
      relying on CLI-only output.

### Testing Requirements

- [x] Package-local tests cover API health and startup routes, invalid-path or
      failure mapping, and no-mutation guarantees.
- [x] `npm run app:check` passes after the boot path is introduced.
- [x] Repo quick validation includes the new boot smoke harness and passes.
- [x] Manual verification confirms the web shell can load diagnostics from the
      live API server on a local repo clone.

### Non-Functional Requirements

- [x] Bootstrap remains read-first with no user-layer writes.
- [x] Startup responses are deterministic and small enough for debugging.
- [x] Web boot UI stays accessible and actionable when the API is unavailable
      or prerequisites are missing.

### Quality Gates

- [x] All files ASCII-encoded
- [x] Unix LF line endings
- [x] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Session 03 already exposes prompt summaries; this session should publish
  those summaries through a boot surface, not rebuild prompt logic.
- The repo boundary remains file-based. Missing prerequisites are useful
  diagnostics, but bootstrap must not create, rewrite, or delete user-layer
  files.
- The UX goal is clarity, not polish. The startup page should help the
  operator understand whether the app is ready and what is missing.

### Potential Challenges

- Cross-package drift: API payload shape and web rendering can diverge if
  types are duplicated. Keep a narrow payload contract and validate it.
- False readiness: a green health check can hide missing prerequisites unless
  `/startup` stays richer than `/health`.
- Hidden mutation: startup helpers may be tempted to auto-create app state or
  user files. Keep bootstrap read-first and assert that in tests.

### Relevant Considerations

- [P00] **Canonical live surface**: keep `AGENTS.md`, `modes/`, `docs/`, and
  the workspace adapter as the authoritative bootstrap inputs.
- [P02] **Trust boundary is file-based**: use temp fixtures and snapshots to
  prove startup checks do not mutate real user data.
- [P02] **Live contract first**: reuse checked-in workspace and prompt
  contracts instead of new bootstrap-only path logic.
- [P03] **OpenAI account runtime is product-coupled**: keep this session
  focused on local boot diagnostics and avoid coupling health checks to
  external auth behavior.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- The web shell reports "ready" while the API is unreachable or prerequisites
  are missing.
- The API server hides diagnostics failures behind one generic health result.
- Bootstrap code mutates user-layer files or app-owned state during read-only
  checks.

---

## 9. Testing Strategy

### Unit Tests

- Validate API health and startup responses, including failure-path mapping and
  no-mutation assertions.
- Validate startup client timeout and status normalization in `apps/web`.

### Integration Tests

- Launch the built API server on an ephemeral port and fetch `/health` plus
  `/startup` from the repo-level smoke harness.
- Build the web package against the same boot contract to catch payload drift.

### Manual Testing

- Run the API server locally, open the web app, and confirm the startup page
  shows ready state on a healthy repo clone.
- Temporarily simulate missing required files in a fixture and confirm the UI
  reports actionable onboarding gaps instead of a generic failure.

### Edge Cases

- API unavailable at page load
- Required files missing while optional artifacts remain absent
- Repo path resolution failure outside the expected workspace root
- Stale startup payload after the API restarts or the page retries

---

## 10. Dependencies

### External Libraries

- None expected beyond the existing workspace dependencies
- Node standard library HTTP primitives
- Existing React and Vite packages already in the repo

### Other Sessions

- **Depends on**: `phase00-session01-monorepo-app-skeleton`,
  `phase00-session02-workspace-adapter-contract`,
  `phase00-session03-prompt-loading-contract`
- **Depended by**: the first Phase 01 runtime sessions that need a live API
  bootstrap and health surface before adding jobs, tools, or approvals

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
