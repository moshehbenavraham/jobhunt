# 2026-05-17 OpenAI Codex Agent Runtime Documentation Plan

## Context

The `ux-pass` branch contains the most mature implementation of the repo-owned
OpenAI Codex account-auth and agent-runtime system.

Two documentation audiences now need first-class support:

- maintainers extending this repository
- developers who want to reuse the same pattern in a different project

Current documentation is useful but uneven. `docs/OPENAI_ACCOUNT_AUTH.md`
documents the OAuth/account-auth layer well, and `apps/api/README_api.md`
mentions the app-side agent-runtime bridge. The standalone system story is not
yet complete enough for a new maintainer or external adopter to understand the
design, integration points, operational states, test harness, and extraction
boundary without reading source.

This plan is documentation-only. It should not change runtime behavior unless a
documentation pass exposes a small naming, command, or script-reference defect
that blocks accurate docs.

## Goal

Bring documentation quality to:

- 10/10 for maintainers inside Job-Hunt
- 10/10 for standalone reuse in a completely different project

The final docs should let someone:

1. understand the system design in one pass
2. run and validate the local system without source spelunking
3. debug common auth, transport, provider, and app-readiness failures
4. extract the reusable pieces into a different Node or TypeScript project
5. know which parts are product-coupled, experimental, or repo-specific

## Current Baseline

### Strong Existing Docs

- `docs/OPENAI_ACCOUNT_AUTH.md` documents OAuth setup, credential storage, raw
  Codex transport, `@openai/agents` provider validation, known constraints, and
  recovery commands.
- `README.md` and `docs/SETUP.md` mention `npm run auth:openai -- login`,
  smoke tests, and the app boot path.
- `apps/api/README_api.md` identifies `src/agent-runtime/` and the environment
  overrides used by the app-side bridge.
- `docs/ARCHITECTURE.md` links the OpenAI account runtime to the app boot
  surface.
- Test files exist for the lower-level auth stack and app-side agent runtime.

### Main Gaps

- No single maintainer guide explains how OAuth, credential storage, transport,
  provider adapter, API agent runtime, prompt loader, orchestration, startup,
  and settings fit together.
- No standalone extraction guide explains what to copy, what to replace, what
  depends on Job-Hunt paths, and what can remain generic.
- No complete configuration reference covers both auth-layer env vars and
  app-layer env vars in one place.
- No state-machine reference maps `auth-required`, `expired-auth`,
  `invalid-auth`, `prompt-failure`, and `ready` to source code, API payloads,
  UI messaging, and recovery commands.
- No command matrix covers CLI smoke tests, app boot tests, package tests, and
  direct API checks as one validation ladder.
- `npm run app:start` exists on `ux-pass`, but primary docs still mostly
  describe starting web and API servers separately.
- `docs/api/README_api.md` is only a placeholder and does not document the
  agent-runtime API payload shape.
- The documentation audit in `.spec_system/docs-audit.md` focused on Phase 02
  UX surfaces and does not evaluate the OpenAI Codex agent runtime as a
  standalone subsystem.

## 10/10 Rubric

### Maintainer Documentation

Maintainer docs are 10/10 when they provide:

1. One canonical architecture narrative with a diagram-level flow from login to
   model-provider bootstrap.
2. A file ownership map for every runtime component.
3. A precise configuration reference for env vars, defaults, and override
   precedence.
4. A readiness and failure-state reference that matches code and tests.
5. A validation ladder from fastest local checks to full app validation.
6. A runbook for missing, expired, invalid, unauthorized, backend-drift, and
   prompt-bootstrap failures.
7. A testing map that names each relevant test file and what behavior it guards.
8. A change-safety checklist for future edits to OAuth, storage, transport,
   provider, agent runtime, and app routes.
9. Updated README, setup, architecture, scripts, and API docs with consistent
   command names.
10. No duplicated source-of-truth drift between docs.

### Standalone Reuse Documentation

Standalone docs are 10/10 when they provide:

1. A clear statement of what is reusable and what is Job-Hunt-specific.
2. A dependency and runtime prerequisite list for a new project.
3. A copy map for reusable files and the minimum adapter boundary.
4. A minimal integration example for raw transport use.
5. A minimal integration example for `@openai/agents` provider use.
6. A minimal integration example for app-side readiness inspection.
7. A credential storage contract and security notes for non-Job-Hunt projects.
8. A test-fixture strategy using fake auth and fake Codex backend tests.
9. A migration checklist from `OPENAI_API_KEY` assumptions to account auth.
10. Explicit warnings about product coupling to `auth.openai.com` and
    `chatgpt.com/backend-api/codex/responses`.

## Documentation Workstreams

### Workstream 1: Canonical Maintainer Guide

Create:

- `docs/OPENAI_CODEX_AGENT_RUNTIME.md`

Required contents:

- audience and scope
- system diagram:

```text
npm run auth:openai -- login
  -> scripts/lib/openai-account-auth/oauth.mjs
  -> data/openai-account-auth.json
  -> scripts/lib/openai-account-auth/codex-transport.mjs
  -> scripts/lib/openai-account-auth/agents-provider.mjs
  -> apps/api/src/agent-runtime/openai-account-provider.ts
  -> apps/api/src/agent-runtime/agent-runtime-service.ts
  -> startup/settings/orchestration/tool bootstrap surfaces
```

- component table with owner, path, responsibility, and test coverage
- runtime flow for login, readiness check, provider creation, model request,
  refresh, retry, and close
- state map for auth, prompt, and aggregate readiness states
- configuration reference covering:
  - `JOBHUNT_OPENAI_ACCOUNT_AUTH_PATH`
  - `JOBHUNT_OPENAI_OAUTH_CALLBACK_HOST`
  - `JOBHUNT_API_OPENAI_AUTH_PATH`
  - `JOBHUNT_API_OPENAI_BASE_URL`
  - `JOBHUNT_API_OPENAI_ORIGINATOR`
  - `JOBHUNT_API_OPENAI_MODEL`
- validation ladder:
  - `npm run auth:openai -- status`
  - `npm run codex:smoke -- --json`
  - `npm run agents:codex:smoke -- --json`
  - `npm run app:api:test:agent-runtime`
  - `npm run app:boot:test`
  - `npm run app:validate`
- change-safety checklist

Acceptance criteria:

- A maintainer can identify the owning file for any auth/runtime behavior in
  under one minute.
- Every documented command exists in `package.json`.
- Every documented readiness state exists in code.

### Workstream 2: Standalone Extraction Guide

Create:

- `docs/STANDALONE_OPENAI_CODEX_AGENT_RUNTIME.md`

Required contents:

- what this system is and is not
- external project prerequisites
- dependency map:
  - Node runtime
  - `@openai/agents`
  - `@openai/agents-core`
  - `@openai/agents-openai`
  - local filesystem credential storage
- reusable source map:
  - `scripts/openai-account-auth.mjs`
  - `scripts/openai-codex-smoke.mjs`
  - `scripts/openai-agents-codex-smoke.mjs`
  - `scripts/lib/openai-account-auth/*.mjs`
  - optional app bridge pattern from `apps/api/src/agent-runtime/*`
- Job-Hunt-specific seams to replace:
  - repo root resolution
  - default credential path
  - npm script names
  - startup and settings route payloads
  - prompt loader and workflow orchestration dependencies
- three integration examples:
  - raw text prompt through transport
  - `@openai/agents` provider registration
  - app readiness service wrapping stored account auth
- testing strategy:
  - fake credential file
  - fake Codex backend
  - missing, invalid, expired, refresh, retry, and streaming fixtures
- security and storage guidance:
  - never commit real `data/openai-account-auth.json`
  - keep example shape only
  - avoid printing access tokens except explicit debugging
- product-coupling and drift warnings

Acceptance criteria:

- A developer can create a TODO list for porting the subsystem without reading
  source code first.
- The guide distinguishes copy-as-is modules from adapt-required modules.
- The guide avoids implying this is an official stable OpenAI public API.

### Workstream 3: API And App Runtime Reference

Create or expand:

- `docs/api/README_api.md`
- `apps/api/README_api.md`

Required contents:

- `/health` and `/startup` agent-runtime fields
- settings route auth summary behavior
- orchestration bootstrap dependency on the agent runtime
- what the API does when auth is missing versus when prompt sources are missing
- app runtime env var examples for deterministic tests
- relationship between `.jobhunt-app/` state and `data/openai-account-auth.json`

Acceptance criteria:

- A maintainer can inspect an API payload and know which runtime layer produced
  each auth/readiness field.
- The API docs link to the canonical maintainer guide instead of duplicating
  detailed OAuth behavior.

### Workstream 4: Operator And Setup Docs Alignment

Update:

- `README.md`
- `docs/SETUP.md`
- `docs/SCRIPTS.md`
- `docs/ARCHITECTURE.md`
- `docs/README-docs.md`
- `docs/runbooks/README_runbooks.md`

Required changes:

- Add `npm run app:start` as the preferred one-command local launch path if it
  remains the intended command.
- Keep separate `npm run app:web:dev` and `npm run app:api:serve` as explicit
  development commands.
- Link the new maintainer and standalone guides.
- Replace vague "runtime flow" wording with exact doc links.
- Add a troubleshooting entry for auth-ready but prompt-blocked states.
- Ensure the app-primary path, Codex CLI legacy path, and repo-owned account
  auth path are described consistently.

Acceptance criteria:

- Root README answers "how do I start this?" with one command.
- Setup docs answer "how do I authenticate and validate model access?"
- Scripts docs answer "which command tests which layer?"
- Architecture docs answer "where does this subsystem sit?"

### Workstream 5: Runbooks And Troubleshooting

Create:

- `docs/runbooks/openai-codex-agent-runtime.md`

Required scenarios:

- no stored auth file
- invalid auth file
- expired auth
- refresh failure
- first request returns unauthorized
- backend returns an SSE or response shape change
- `response.completed` has empty output
- `@openai/agents` tracing warning appears
- prompt bundle is missing or empty
- app shows auth-ready but workflow launch still fails
- fake backend tests pass but live smoke test fails

Each scenario should include:

- symptoms
- likely owner file
- fastest command to reproduce
- recovery command
- validation command
- escalation notes

Acceptance criteria:

- A maintainer can triage common runtime failures without reading tests first.
- Each scenario points to a verification command, not just a fix command.

### Workstream 6: Examples And Test Fixture Guide

Create:

- `docs/examples/openai-codex-agent-runtime.md`

Required examples:

- raw transport minimal usage
- provider registration minimal usage
- readiness inspection minimal usage
- fake backend fixture shape
- fake auth fixture shape
- expected JSON status examples for missing, expired, invalid, and ready auth

Acceptance criteria:

- Examples are short enough to copy into a scratch project.
- Examples do not include real tokens or account ids.
- Examples reference existing tests as the complete executable source of truth.

### Workstream 7: Documentation Quality Gate

Update or add validation in the existing test/docs audit path:

- extend `scripts/test-all.mjs` documentation checks, or add a focused docs
  check script if that is cleaner
- update `.spec_system/docs-audit.md` after the documentation update

Required checks:

- new docs are linked from `docs/README-docs.md`
- every documented npm command exists in `package.json`
- every referenced source file exists
- no docs instruct users to use `OPENAI_API_KEY` for the primary runtime
- no docs claim the product-coupled backend is a stable public API

Acceptance criteria:

- Future docs drift around this subsystem fails a deterministic check.
- The check runs in the same broad validation path maintainers already use.

## Proposed Implementation Sessions

### Session 1: Maintainer Runtime Guide

Scope:

- Create `docs/OPENAI_CODEX_AGENT_RUNTIME.md`
- Update `docs/ARCHITECTURE.md`
- Update `docs/README-docs.md`

Validation:

- `npm run app:api:test:agent-runtime`
- `npm run agents:codex:smoke -- --json` if live auth is available

### Session 2: Standalone Reuse Guide And Examples

Scope:

- Create `docs/STANDALONE_OPENAI_CODEX_AGENT_RUNTIME.md`
- Create `docs/examples/openai-codex-agent-runtime.md`
- Link from docs index

Validation:

- verify all referenced files exist
- verify examples use placeholders only

### Session 3: API, Setup, Scripts, And Runbook Alignment

Scope:

- Expand `docs/api/README_api.md`
- Expand `apps/api/README_api.md`
- Update `README.md`, `docs/SETUP.md`, `docs/SCRIPTS.md`
- Create `docs/runbooks/openai-codex-agent-runtime.md`
- Add `app:start` docs if it remains the intended one-command launcher

Validation:

- `npm run app:boot:test`
- `npm run app:validate`

### Session 4: Drift Guard And Documentation Audit

Scope:

- Add or extend deterministic docs checks
- Update `.spec_system/docs-audit.md`
- Run broad validation

Validation:

- `node scripts/test-all.mjs --quick`
- any focused docs check added in this session

## Source Files To Review Before Writing Final Docs

Core auth stack:

- `scripts/openai-account-auth.mjs`
- `scripts/openai-codex-smoke.mjs`
- `scripts/openai-agents-codex-smoke.mjs`
- `scripts/lib/openai-account-auth/common.mjs`
- `scripts/lib/openai-account-auth/oauth.mjs`
- `scripts/lib/openai-account-auth/storage.mjs`
- `scripts/lib/openai-account-auth/codex-transport.mjs`
- `scripts/lib/openai-account-auth/agents-provider.mjs`
- `scripts/lib/openai-account-auth/index.mjs`

App runtime bridge:

- `apps/api/src/agent-runtime/agent-runtime-config.ts`
- `apps/api/src/agent-runtime/agent-runtime-contract.ts`
- `apps/api/src/agent-runtime/openai-account-provider.ts`
- `apps/api/src/agent-runtime/agent-runtime-service.ts`
- `apps/api/src/runtime/service-container.ts`
- `apps/api/src/server/startup-status.ts`
- `apps/api/src/server/settings-summary.ts`
- `apps/api/src/server/routes/settings-route.ts`
- `apps/api/src/server/routes/startup-route.ts`
- `apps/api/src/server/routes/health-route.ts`
- `apps/api/src/orchestration/orchestration-service.ts`

Tests:

- `scripts/test-openai-account-auth.mjs`
- `scripts/test-openai-codex-transport.mjs`
- `scripts/test-openai-agents-provider.mjs`
- `scripts/test-maintenance-scripts.mjs`
- `apps/api/src/agent-runtime/*.test.ts`
- `apps/api/src/server/http-server.test.ts`
- `scripts/test-app-bootstrap.mjs`

Existing docs:

- `docs/OPENAI_ACCOUNT_AUTH.md`
- `docs/ARCHITECTURE.md`
- `docs/SCRIPTS.md`
- `docs/SETUP.md`
- `README.md`
- `apps/api/README_api.md`
- `docs/api/README_api.md`
- `docs/runbooks/README_runbooks.md`

## Definition Of Done

- Maintainer documentation score reaches 10/10 against this plan's rubric.
- Standalone reuse documentation score reaches 10/10 against this plan's
  rubric.
- All new docs are linked from `docs/README-docs.md`.
- No primary-runtime doc tells users to configure `OPENAI_API_KEY`.
- `app:start`, app server, and smoke-test command guidance is internally
  consistent.
- Every documented file path and npm command is verified.
- Product coupling and drift risk are documented explicitly.
- Validation commands are recorded in the final documentation update summary.

## Open Questions

- Should the standalone guide describe a future extracted npm package, or only
  a copy-into-project pattern for now?
- Should `npm run app:start` become the single canonical launch command, or
  remain a convenience wrapper alongside separate web/API server commands?
- Should docs checks live in `scripts/test-all.mjs`, a new `scripts/check-docs`
  command, or both?
- Should the standalone examples stay documentation-only, or should they become
  executable fixtures under `docs/examples/` or `scripts/test-fixtures/`?

## Session Update - 2026-05-17 qimpl

Completed documentation-only implementation:

- Created `docs/OPENAI_CODEX_AGENT_RUNTIME.md` as the canonical maintainer
  guide with architecture flow, ownership table, state reference,
  configuration reference, API payload fields, validation ladder, testing map,
  and change-safety checklist.
- Created `docs/STANDALONE_OPENAI_CODEX_AGENT_RUNTIME.md` with copy map,
  adapt-required seams, standalone examples, storage contract, testing
  strategy, migration checklist, and product-coupling warnings.
- Created `docs/runbooks/openai-codex-agent-runtime.md` with the requested
  auth, transport, provider, prompt, and live-backend drift scenarios.
- Created `docs/examples/openai-codex-agent-runtime.md` with raw transport,
  provider registration, readiness, fake auth, fake backend, and state payload
  examples.
- Expanded `docs/api/README_api.md` and `apps/api/README_api.md` so API
  payload fields link back to the canonical runtime guide instead of
  duplicating OAuth details.
- Updated `README.md`, `docs/SETUP.md`, `docs/SCRIPTS.md`,
  `docs/ARCHITECTURE.md`, `docs/README-docs.md`,
  `docs/runbooks/README_runbooks.md`, `docs/examples/README-examples.md`, and
  `docs/OPENAI_ACCOUNT_AUTH.md` to link the new docs and document
  `npm run app:start` as the preferred one-command local launch path.

Deliberately not completed in this documentation-only qimpl session:

- No runtime code was changed.
- No deterministic docs-check script was added.
- `.spec_system/docs-audit.md` was not changed because this qimpl pass kept
  spec-system files read-only.

Current remaining work:

- Decide whether to add a docs drift guard in `scripts/test-all.mjs` or a
  separate docs-check script.
- Decide whether the examples should remain documentation-only or become
  executable fixtures.
- Run the full validation ladder when live auth is available.
