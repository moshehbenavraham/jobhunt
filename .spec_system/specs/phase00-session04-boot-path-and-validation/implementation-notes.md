# Implementation Notes

**Session ID**: `phase00-session04-boot-path-and-validation`
**Package**: cross-cutting (`apps/web`, `apps/api`)
**Started**: 2026-04-21 03:10
**Last Updated**: 2026-04-21 03:25

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 15 / 15 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Task Log

### [2026-04-21] - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

### Task T002 - Update the API workspace manifest with explicit server and boot-contract validation commands

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:16
**Duration**: 6 minutes

**Notes**:

- Added dedicated API server and boot-contract test commands to keep the long-lived boot surface separate from the CLI diagnostics entrypoint.
- Kept the existing package-local build and prompt-contract flows intact.

**Files Changed**:

- `apps/api/package.json` - Added `serve` and `test:boot-contract` scripts for the server runtime and targeted route coverage.

### Task T003 - Update local API-origin or proxy handling for deterministic cross-package boot requests

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:16
**Duration**: 6 minutes

**Notes**:

- Added a deterministic `/api` proxy target with a configurable `JOBHUNT_API_ORIGIN` override for local boot wiring.
- Preserved the existing web dev and preview ports.

**Files Changed**:

- `apps/web/vite.config.ts` - Added the local API proxy with stable path rewriting.

### Task T004 - Create startup-status serializers around the existing diagnostics contract with explicit error mapping and read-first payload shaping

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:16
**Duration**: 6 minutes

**Notes**:

- Added a read-only startup payload serializer that derives ready, missing-prerequisites, and runtime-error states from the existing diagnostics contract.
- Added deterministic missing-file sorting and explicit error payload mapping for repo-root and timeout failures.

**Files Changed**:

- `apps/api/src/server/startup-status.ts` - Added HTTP-safe health, startup, and error payload shaping helpers.

**BQC Fixes**:

- Failure path completeness: Added explicit runtime and timeout error payload mapping for the server boot surface (`apps/api/src/server/startup-status.ts`).
- Contract alignment: Normalized missing-file ordering and shared status derivation so `/health` and `/startup` stay aligned (`apps/api/src/server/startup-status.ts`).

### Task T005 - Create the minimal HTTP server for /health and /startup with bounded request handling and explicit failure responses

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:16
**Duration**: 6 minutes

**Notes**:

- Added a Node HTTP server with explicit route handling, method validation, no-store JSON responses, and bounded diagnostics execution.
- Kept the server thin by delegating payload shaping to the serializer layer and diagnostics reads to the existing API contract.

**Files Changed**:

- `apps/api/src/server/http-server.ts` - Added the minimal boot server, response helpers, and startup lifecycle wrapper.

**BQC Fixes**:

- Failure path completeness: Added structured 404, 405, 500, and runtime-error responses instead of generic request failures (`apps/api/src/server/http-server.ts`).
- External dependency resilience: Added request and diagnostics timeouts so the startup surface cannot wait indefinitely (`apps/api/src/server/http-server.ts`).

### Task T006 - Create server exports and entry wiring so one-shot CLI diagnostics stay separate from long-lived boot serving

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:16
**Duration**: 6 minutes

**Notes**:

- Split the long-lived server entry into `src/server/index.ts` while keeping `src/index.ts` as the one-shot CLI diagnostics module.
- Exposed boot-surface metadata from the diagnostics contract so CLI and HTTP callers inspect the same startup surface.

**Files Changed**:

- `apps/api/src/index.ts` - Updated session metadata and added explicit boot-surface details to the diagnostics payload.
- `apps/api/src/server/index.ts` - Added the server CLI entrypoint with environment-driven host, port, and repo-root handling.

**BQC Fixes**:

- Resource cleanup: Added explicit SIGINT and SIGTERM shutdown handling for the long-lived server entrypoint (`apps/api/src/server/index.ts`).
- Failure path completeness: Kept CLI and server startup failures explicit and service-scoped in stderr output (`apps/api/src/index.ts`, `apps/api/src/server/index.ts`).

### Task T007 - Create shared startup payload types and a fetch client with timeout handling and deterministic status normalization

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:16
**Duration**: 6 minutes

**Notes**:

- Added runtime-checked client-side payload parsing so the browser does not trust the startup API boundary implicitly.
- Added timeout and offline normalization to keep browser state explicit when the local API is down or returns invalid data.

**Files Changed**:

- `apps/web/src/boot/startup-types.ts` - Added the web-side startup payload model and structural parsers.
- `apps/web/src/boot/startup-client.ts` - Added endpoint resolution, timeout control, and typed offline or error mapping.

**BQC Fixes**:

- Trust boundary enforcement: Added structural payload parsing for startup responses before the UI reads diagnostics (`apps/web/src/boot/startup-types.ts`).
- Failure path completeness: Added deterministic offline, timeout, invalid JSON, and invalid payload handling in the client (`apps/web/src/boot/startup-client.ts`).

### Task T008 - Create the boot-state hook with explicit loading, ready, error, and offline states plus state reset on re-entry

**Started**: 2026-04-21 03:16
**Completed**: 2026-04-21 03:21
**Duration**: 5 minutes

**Notes**:

- Added a refreshable diagnostics hook that tracks loading, ready, missing-prerequisites, error, and offline states without reusing stale requests.
- Reset state by lifecycle and aborted in-flight work on re-entry so React Strict Mode does not leave stale updates behind.

**Files Changed**:

- `apps/web/src/boot/use-startup-diagnostics.ts` - Added request lifecycle ownership, abort handling, and state normalization for the bootstrap surface.

**BQC Fixes**:

- Resource cleanup: Added abort-controller cleanup for every in-flight diagnostics request (`apps/web/src/boot/use-startup-diagnostics.ts`).
- State freshness on re-entry: Reset request identity on remount and abort stale fetches before starting a new lifecycle (`apps/web/src/boot/use-startup-diagnostics.ts`).
- Duplicate action prevention: Disabled refresh initiation while an initial load or refresh is already active (`apps/web/src/boot/use-startup-diagnostics.ts`).

### Task T009 - Create the missing-files list component with accessible labels and deterministic ordering for onboarding-blocking prerequisites

**Started**: 2026-04-21 03:16
**Completed**: 2026-04-21 03:21
**Duration**: 5 minutes

**Notes**:

- Added a focused missing-files renderer with stable alphabetical ordering by canonical repo-relative path.
- Used explicit headings and list labels so onboarding blockers are readable with assistive technology.

**Files Changed**:

- `apps/web/src/boot/missing-files-list.tsx` - Added the missing-surface renderer and per-tone section styling.

**BQC Fixes**:

- Accessibility and platform compliance: Added labelled sections and lists for each class of missing prerequisite surface (`apps/web/src/boot/missing-files-list.tsx`).
- Contract alignment: Ordered missing surfaces deterministically so repeated refreshes do not reshuffle the same blockers (`apps/web/src/boot/missing-files-list.tsx`).

### Task T010 - Create the startup-status panel for health, repo resolution, prompt summary, and diagnostic sections with keyboard-safe refresh behavior

**Started**: 2026-04-21 03:16
**Completed**: 2026-04-21 03:21
**Duration**: 5 minutes

**Notes**:

- Added a diagnostics panel that renders health, repo contract, prompt contract, and detailed missing-surface sections from one startup payload.
- Kept refresh behavior keyboard-safe with a real button and clear loading feedback.

**Files Changed**:

- `apps/web/src/boot/startup-status-panel.tsx` - Added the main diagnostics renderer, summary cards, and expandable prompt detail sections.

**BQC Fixes**:

- Accessibility and platform compliance: Used semantic headings, live status text, and a button-based refresh control instead of custom key handling (`apps/web/src/boot/startup-status-panel.tsx`).
- Failure path completeness: Kept runtime blockers and onboarding gaps visible as first-class sections instead of collapsing them into one generic summary (`apps/web/src/boot/startup-status-panel.tsx`).

### Task T011 - Update the web shell to render actionable bootstrap states instead of the static scaffold copy with explicit loading, empty, error, and offline states

**Started**: 2026-04-21 03:16
**Completed**: 2026-04-21 03:21
**Duration**: 5 minutes

**Notes**:

- Replaced the static scaffold page with an operator-facing startup screen that renders empty, loading, missing-prerequisites, offline, and error states explicitly.
- Preserved a clear handoff path by showing diagnostics panels when data exists and targeted fallback cards when it does not.

**Files Changed**:

- `apps/web/src/App.tsx` - Replaced the placeholder scaffold screen with the bootstrap state shell and diagnostics rendering flow.

**BQC Fixes**:

- State freshness on re-entry: Rendered UI from the hook lifecycle state instead of keeping scaffold-era placeholder copy alive after remounts (`apps/web/src/App.tsx`).
- Failure path completeness: Added dedicated UI states for empty, loading, offline, and bootstrap-contract errors so the shell never falls back to a misleading ready screen (`apps/web/src/App.tsx`).

### Task T012 - Update startup diagnostics to expose the boot payload shape and keep all repo checks read-first with no user-layer mutation

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:21
**Duration**: 11 minutes

**Notes**:

- Added explicit boot-surface metadata to the diagnostics contract so CLI and HTTP callers inspect the same startup shape.
- Kept repo inspection on the existing workspace adapter summary path, which remains read-only and avoids app-state creation.

**Files Changed**:

- `apps/api/src/index.ts` - Added boot-surface metadata and updated the session identity for the Phase 00 boot path contract.

**BQC Fixes**:

- Contract alignment: Added explicit boot-surface metadata to the startup diagnostics payload instead of leaving the HTTP contract implicit (`apps/api/src/index.ts`).
- Failure path completeness: Kept service-scoped startup failures explicit in the CLI entrypoint while preserving read-only diagnostics behavior (`apps/api/src/index.ts`).

### Task T001 - Update root workspace scripts for coordinated app boot and validation commands

**Started**: 2026-04-21 03:10
**Completed**: 2026-04-21 03:25
**Duration**: 15 minutes

**Notes**:

- Added root-level boot smoke and validation commands so the repo can launch and verify the new cross-package boot path from one surface.
- Kept the existing workspace-specific web and API commands intact while adding the new server entrypoint script.

**Files Changed**:

- `package.json` - Added root boot smoke and validation scripts alongside the new API server launcher.

### Task T013 - Create API server coverage for health and startup routes, repo-resolution failures, and no-mutation guarantees

**Started**: 2026-04-21 03:21
**Completed**: 2026-04-21 03:25
**Duration**: 4 minutes

**Notes**:

- Added package-local server tests that cover ready, missing-prerequisites, and invalid-repo-root responses.
- Verified startup requests do not create `.jobhunt-app` or mutate user-layer files in fixture-based runs.

**Files Changed**:

- `apps/api/src/server/http-server.test.ts` - Added route coverage for health, startup, and explicit repo-root failure mapping.

**BQC Fixes**:

- Failure path completeness: Added direct coverage for degraded and hard-failure startup responses instead of relying on manual smoke checks (`apps/api/src/server/http-server.test.ts`).
- Resource cleanup: Closed the HTTP server handles and fixture workspaces in every test path (`apps/api/src/server/http-server.test.ts`).

### Task T014 - Create the repo boot smoke harness that launches the built API server, checks HTTP diagnostics, and verifies the web package still builds against the live contract

**Started**: 2026-04-21 03:21
**Completed**: 2026-04-21 03:25
**Duration**: 4 minutes

**Notes**:

- Added a repo-level smoke harness that builds both packages, launches the built API server on a free local port, and validates the live startup payload from the repo root.
- Snapshotted user-layer files and app-state metadata before and after the smoke run to prove the bootstrap path stays read-first.

**Files Changed**:

- `scripts/test-app-bootstrap.mjs` - Added the repo boot smoke harness and live no-mutation checks.

**BQC Fixes**:

- Failure path completeness: The harness fails with explicit diagnostics if the API never becomes healthy or returns a drifted startup payload (`scripts/test-app-bootstrap.mjs`).
- Resource cleanup: Added graceful child-process shutdown and port-allocation cleanup in the repo smoke path (`scripts/test-app-bootstrap.mjs`).

### Task T015 - Register the boot smoke harness in the repo quick suite and run cross-package checks plus ASCII validation on all new bootstrap files

**Started**: 2026-04-21 03:21
**Completed**: 2026-04-21 03:25
**Duration**: 4 minutes

**Notes**:

- Registered the new boot smoke harness in the repo quick suite and added a dedicated ASCII guard for the bootstrap files introduced by this session.
- Updated the existing scaffold regression to track the new Phase 00 boot session id and the explicit startup path metadata.

**Files Changed**:

- `scripts/test-all.mjs` - Added the app bootstrap smoke stage and bootstrap-file ASCII validation.
- `scripts/test-app-scaffold.mjs` - Updated scaffold assertions to the session 04 boot diagnostics contract.
- `package.json` - Added root validation wiring for the new smoke harness.

**BQC Fixes**:

- Contract alignment: Added quick-suite coverage that exercises the same live boot surface the web UI now consumes (`scripts/test-all.mjs`, `scripts/test-app-scaffold.mjs`).
- Failure path completeness: Added ASCII validation so new bootstrap files fail fast if they drift from the session encoding rules (`scripts/test-all.mjs`).

## Verification

- [x] `npm run test:boot-contract --workspace @jobhunt/api`
- [x] `npm run app:api:build`
- [x] `npm run app:web:build`
- [x] `npm run app:boot:test`
- [x] `node scripts/test-app-scaffold.mjs`
- [x] `node scripts/test-all.mjs --quick`

## Session Summary

- Added a minimal API boot server with deterministic `/health` and `/startup` JSON surfaces.
- Replaced the web placeholder with a typed bootstrap status screen covering loading, ready, missing-prerequisites, offline, and runtime-error states.
- Added package-local and repo-level regression coverage proving the live boot path stays read-first and ASCII-clean.
