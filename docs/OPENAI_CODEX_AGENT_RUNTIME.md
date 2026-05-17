# OpenAI Codex Agent Runtime

This is the maintainer guide for the Job-Hunt OpenAI Codex account-auth and
agent-runtime subsystem on the `ux-pass` branch. It explains how the stored
OpenAI account login, raw Codex transport, `@openai/agents` provider, API
runtime bridge, prompt bootstrap, startup diagnostics, settings summary, and
workflow orchestration fit together.

Use this guide when you are changing runtime behavior inside this repository.
Use [Standalone OpenAI Codex Agent Runtime](STANDALONE_OPENAI_CODEX_AGENT_RUNTIME.md)
when you want to reuse the pattern in another project.

## Scope

The repo-owned runtime uses stored OpenAI account credentials. The primary
runtime does not use `OPENAI_API_KEY`.

This subsystem is product-coupled to:

- `https://auth.openai.com/oauth/authorize`
- `https://auth.openai.com/oauth/token`
- `https://chatgpt.com/backend-api/codex/responses`

Treat the backend shape as an integration contract owned by the current
product surface, not as a stable public API. The smoke tests and fake backend
fixtures exist to catch drift quickly.

## Runtime Map

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

## Component Ownership

| Owner                 | Path                                                                                                                                                                                             | Responsibility                                                                                                                                          | Test Coverage                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Auth CLI              | `scripts/openai-account-auth.mjs`                                                                                                                                                                | User-facing login, status, refresh, reauth, logout, and debug token printing.                                                                           | `scripts/test-openai-account-auth.mjs`                       |
| OAuth core            | `scripts/lib/openai-account-auth/oauth.mjs`                                                                                                                                                      | PKCE authorization flow, localhost callback, manual-code fallback, token exchange, and refresh.                                                         | `scripts/test-openai-account-auth.mjs`                       |
| Shared auth constants | `scripts/lib/openai-account-auth/common.mjs`                                                                                                                                                     | Auth URLs, default credential path, callback host env, JWT account-id extraction, and helper parsing.                                                   | `scripts/test-openai-account-auth.mjs`                       |
| Credential storage    | `scripts/lib/openai-account-auth/storage.mjs`                                                                                                                                                    | Locked read, write, clear, status, refresh, validation, and example record shape.                                                                       | `scripts/test-openai-account-auth.mjs`                       |
| Raw Codex transport   | `scripts/lib/openai-account-auth/codex-transport.mjs`                                                                                                                                            | Authenticated SSE calls, request body/header construction, expired-token refresh, one 401 refresh retry, SSE parsing, and terminal output augmentation. | `scripts/test-openai-codex-transport.mjs`                    |
| Agents provider       | `scripts/lib/openai-account-auth/agents-provider.mjs`                                                                                                                                            | `@openai/agents` model provider, model-name normalization, Responses client adapter, default provider registration, retry advice, and provider close.   | `scripts/test-openai-agents-provider.mjs`                    |
| Auth stack exports    | `scripts/lib/openai-account-auth/index.mjs`                                                                                                                                                      | Public module boundary for scripts and the API bridge.                                                                                                  | Auth and provider tests                                      |
| Raw smoke CLI         | `scripts/openai-codex-smoke.mjs`                                                                                                                                                                 | Direct text prompt validation through the raw transport.                                                                                                | `scripts/test-openai-codex-transport.mjs`                    |
| Agents smoke CLI      | `scripts/openai-agents-codex-smoke.mjs`                                                                                                                                                          | `@openai/agents` validation through the account-auth provider.                                                                                          | `scripts/test-openai-agents-provider.mjs`                    |
| App runtime config    | `apps/api/src/agent-runtime/agent-runtime-config.ts`                                                                                                                                             | App-layer env vars, defaults, validation, and override flags.                                                                                           | `apps/api/src/agent-runtime/agent-runtime-config.test.ts`    |
| App runtime contract  | `apps/api/src/agent-runtime/agent-runtime-contract.ts`                                                                                                                                           | Auth, prompt, readiness, bootstrap status, and error-code types.                                                                                        | Agent runtime and HTTP tests                                 |
| App account bridge    | `apps/api/src/agent-runtime/openai-account-provider.ts`                                                                                                                                          | Typed import of the auth module, defaults, auth readiness mapping, and configured provider creation.                                                    | `apps/api/src/agent-runtime/openai-account-provider.test.ts` |
| App runtime service   | `apps/api/src/agent-runtime/agent-runtime-service.ts`                                                                                                                                            | Readiness inspection, baseline prompt checks, prompt loading, bootstrap errors, provider cache, and provider cleanup.                                   | `apps/api/src/agent-runtime/agent-runtime-service.test.ts`   |
| Service container     | `apps/api/src/runtime/service-container.ts`                                                                                                                                                      | Cached shared service instances used by startup, settings, tools, and orchestration.                                                                    | `apps/api/src/server/http-server.test.ts` and package tests  |
| Startup status        | `apps/api/src/server/startup-status.ts`                                                                                                                                                          | Maps agent runtime readiness into `/health` and `/startup` status and HTTP behavior.                                                                    | `apps/api/src/server/http-server.test.ts`                    |
| Settings summary      | `apps/api/src/server/settings-summary.ts`                                                                                                                                                        | Surfaces auth summary, config overrides, support metadata, and maintenance commands.                                                                    | `apps/api/src/server/http-server.test.ts` and settings tests |
| HTTP routes           | `apps/api/src/server/routes/health-route.ts`, `apps/api/src/server/routes/startup-route.ts`, `apps/api/src/server/routes/settings-route.ts`, `apps/api/src/server/routes/orchestration-route.ts` | Public API surfaces that expose readiness or use the runtime.                                                                                           | `apps/api/src/server/http-server.test.ts`                    |
| Orchestration         | `apps/api/src/orchestration/orchestration-service.ts`                                                                                                                                            | Turns runtime bootstrap into typed workflow handoff envelopes without storing raw prompt text.                                                          | `apps/api/src/orchestration/orchestration-service.test.ts`   |

## Flow Details

### Login

`npm run auth:openai -- login` starts the PKCE flow, opens or prints an
authorization URL, accepts the localhost callback or a pasted authorization
code, exchanges the code for tokens, extracts the ChatGPT account id from the
JWT, and writes `data/openai-account-auth.json` with mode `0600` semantics
through the storage helper.

The default credential path is owned by `scripts/lib/openai-account-auth/common.mjs`.
The file shape is documented in `data/openai-account-auth.example.json`.

### Readiness Check

The API bridge imports `scripts/lib/openai-account-auth/index.mjs`, reads the
auth defaults, applies app-layer env overrides, and calls
`getStoredCredentialsStatus`. Readiness checks do not call the live Codex
backend and do not refresh credentials.

### Provider Creation

`apps/api/src/agent-runtime/agent-runtime-service.ts` creates a provider only
after auth is ready and prompt bootstrap has resolved. It caches the provider
by module import path, auth path, base URL, originator, and model. When the
cache key changes, the old provider is closed.

### Model Request

The provider wraps the `@openai/agents-openai` Responses model with a custom
client. The client maps `responses.create` calls into
`scripts/lib/openai-account-auth/codex-transport.mjs`, which sends an SSE
request to the Codex backend with:

- `Authorization: Bearer <access token>`
- `chatgpt-account-id`
- `originator`
- `OpenAI-Beta: responses=experimental`
- `accept: text/event-stream`
- `content-type: application/json`

### Refresh And Retry

The raw transport refreshes expired stored credentials before the first
request. If a live request returns HTTP 401 and the transport loaded the
credentials from storage, it refreshes once and retries once. Explicit
credentials passed in options do not get the storage-backed retry.

### Prompt Bootstrap

Readiness checks inspect baseline prompt prerequisites:

- `AGENTS.md`
- `modes/_shared.md`
- `modes/_profile.md`
- `config/profile.yml`
- `profile/cv.md`

Bootstrap for a workflow loads a workflow-specific prompt bundle through the
prompt loader. Missing or empty prompt sources block runtime bootstrap even
when auth is ready.

### Close

`AgentRuntimeService.close()` closes the cached provider. The API service
container registers that cleanup task so server disposal closes provider-owned
model resources.

## State Reference

### Auth States

Defined in `apps/api/src/agent-runtime/agent-runtime-contract.ts`.

| State           | Produced By                                               | Meaning                                                        | Recovery                                                                  |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `auth-required` | Missing stored credential file.                           | The auth path does not contain usable credentials.             | `npm run auth:openai -- login`                                            |
| `invalid-auth`  | Credential file exists but cannot normalize.              | The JSON shape is corrupt or not the expected provider record. | `npm run auth:openai -- logout`, then `npm run auth:openai -- login`      |
| `expired-auth`  | Stored `expiresAt` is less than or equal to current time. | Stored access token is expired.                                | `npm run auth:openai -- refresh`, or `npm run auth:openai -- reauth`      |
| `ready`         | Valid stored credentials with future `expiresAt`.         | Startup may continue to prompt checks.                         | `npm run codex:smoke -- --json` or `npm run agents:codex:smoke -- --json` |

### Prompt States

Defined in `apps/api/src/agent-runtime/agent-runtime-contract.ts`.

| State                  | Meaning                                                       | Runtime Effect                                                         |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `missing`              | A required prompt source is absent.                           | Readiness becomes `prompt-failure`; bootstrap throws `prompt-missing`. |
| `empty`                | A required prompt source exists but has no content.           | Readiness becomes `prompt-failure`; bootstrap throws `prompt-empty`.   |
| `unsupported-workflow` | The requested workflow cannot be routed by the prompt loader. | Bootstrap throws `unsupported-workflow`.                               |
| `ready`                | Baseline or workflow prompt inputs are usable.                | Runtime may proceed.                                                   |

### Aggregate Readiness

Defined in `apps/api/src/agent-runtime/agent-runtime-contract.ts` and mapped by
`apps/api/src/server/startup-status.ts`.

| Readiness Status | Startup Status   | HTTP Status | Meaning                                                       |
| ---------------- | ---------------- | ----------- | ------------------------------------------------------------- |
| `auth-required`  | `auth-required`  | 200         | App is live but credentials are missing.                      |
| `expired-auth`   | `expired-auth`   | 200         | App is live but stored credentials are expired.               |
| `invalid-auth`   | `invalid-auth`   | 200         | App is live but stored credentials are invalid.               |
| `prompt-failure` | `prompt-failure` | 200         | Auth is ready, but prompt prerequisites are missing or empty. |
| `ready`          | `ready`          | 200         | Auth, prompts, and boot prerequisites are ready.              |

Startup can also return `missing-prerequisites` for onboarding gaps and
`runtime-error` for corrupt app state or missing system files. `runtime-error`
maps to HTTP 503.

### Bootstrap Error Codes

Defined in `apps/api/src/agent-runtime/agent-runtime-contract.ts`.

| Code                        | Meaning                                                |
| --------------------------- | ------------------------------------------------------ |
| `auth-required`             | Bootstrap blocked by missing auth.                     |
| `expired-auth`              | Bootstrap blocked by expired auth.                     |
| `invalid-auth`              | Bootstrap blocked by invalid auth.                     |
| `prompt-empty`              | Bootstrap blocked by an empty prompt source.           |
| `prompt-missing`            | Bootstrap blocked by a missing prompt source.          |
| `provider-bootstrap-failed` | Auth and prompts passed, but provider creation failed. |
| `unsupported-workflow`      | Requested workflow has no supported prompt route.      |

## Configuration Reference

| Env Var                              | Layer        | Default                                             | Source                                               | Notes                                                                             |
| ------------------------------------ | ------------ | --------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `JOBHUNT_OPENAI_ACCOUNT_AUTH_PATH`   | Auth scripts | `data/openai-account-auth.json` under the repo root | `scripts/lib/openai-account-auth/common.mjs`         | Used by auth CLI and raw transport default path.                                  |
| `JOBHUNT_OPENAI_OAUTH_CALLBACK_HOST` | Auth scripts | `127.0.0.1`                                         | `scripts/lib/openai-account-auth/common.mjs`         | Host used by the OAuth localhost callback server.                                 |
| `JOBHUNT_API_OPENAI_AUTH_PATH`       | API runtime  | Auth module default path                            | `apps/api/src/agent-runtime/agent-runtime-config.ts` | Resolved relative to repo root when not absolute. Overrides only the API runtime. |
| `JOBHUNT_API_OPENAI_BASE_URL`        | API runtime  | `https://chatgpt.com/backend-api`                   | Auth module export                                   | Trailing slashes are trimmed. Tests point this at fake backends.                  |
| `JOBHUNT_API_OPENAI_ORIGINATOR`      | API runtime  | `pi`                                                | Auth module export                                   | Sent as the Codex `originator` header.                                            |
| `JOBHUNT_API_OPENAI_MODEL`           | API runtime  | `gpt-5.4-mini`                                      | Auth module export                                   | Provider accepts bare ids, `openai-codex/<id>`, and `openai-codex:<id>`.          |

Override precedence:

1. Explicit service construction options in tests.
2. API env vars for the app bridge.
3. Auth module defaults exported from `scripts/lib/openai-account-auth/index.mjs`.

The auth CLI and app runtime have separate env var namespaces on purpose. Use
`JOBHUNT_OPENAI_ACCOUNT_AUTH_PATH` when running auth scripts directly. Use
`JOBHUNT_API_OPENAI_AUTH_PATH` when you want the API server to read a fixture
or alternate credential file.

## API Payload Fields

`GET /health` returns a compact health payload. Relevant fields:

- `startupStatus`: `ready`, `auth-required`, `expired-auth`, `invalid-auth`,
  `prompt-failure`, `missing-prerequisites`, or `runtime-error`
- `status`: `ok`, `degraded`, or `error`
- `agentRuntime.status`: the aggregate agent runtime readiness status
- `agentRuntime.promptState`: baseline prompt state or `null`
- `agentRuntime.authPath`: the auth path inspected by the API runtime

`GET /startup` returns the full diagnostics payload. Relevant fields:

- `diagnostics.agentRuntime.auth`: auth readiness details
- `diagnostics.agentRuntime.config`: resolved runtime config and override flags
- `diagnostics.agentRuntime.prompt`: prompt readiness details
- `diagnostics.promptContract`: prompt route and source metadata
- `health`: the same compact health object returned by `/health`

`GET /settings` returns the settings summary. Relevant fields:

- `auth.auth`: auth readiness details
- `auth.config`: resolved app runtime config and override flags
- `auth.status`: aggregate runtime readiness
- `maintenance.commands`: bounded command list including auth and regression
  checks
- `support.prompt`, `support.tools`, and `support.workflows`: support metadata
  for the settings surface

`POST /orchestration` uses the runtime service when launching workflows. A
blocked runtime appears in the orchestration envelope as
`runtime.status: "blocked"` with an auth or prompt code.

## Validation Ladder

Run the smallest check that answers your question, then climb only when needed.

| Layer                     | Command                                | What It Proves                                                                                                 |
| ------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Stored auth metadata      | `npm run auth:openai -- status`        | Auth file exists, normalizes, and is not expired.                                                              |
| Raw transport live path   | `npm run codex:smoke -- --json`        | Stored account auth can call the Codex SSE backend.                                                            |
| Agents provider live path | `npm run agents:codex:smoke -- --json` | The `@openai/agents` provider adapter can run a model call.                                                    |
| API runtime unit tests    | `npm run app:api:test:agent-runtime`   | Config, readiness, prompt failures, provider bootstrap, and fake backend behavior.                             |
| Live app boot smoke       | `npm run app:boot:test`                | `/health` and `/startup` expose the expected runtime fields without contacting the backend during diagnostics. |
| Full app validation       | `npm run app:validate`                 | App package checks, runtime package tests, store tests, and boot smoke.                                        |
| Broad quick gate          | `npm run test:quick`                   | Repo-wide quick regression suite.                                                                              |

Live smoke commands require real stored account auth unless you pass fixture
options directly to the underlying scripts. The app tests use fake credentials
and fake Codex backends.

## Common Maintenance Tasks

| Task                                          | Start Here                                 | Expected Follow-up                                                                          |
| --------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User cannot start runtime after clone.        | `npm run doctor`                           | `npm run auth:openai -- login`, then `npm run app:start`                                    |
| Auth file exists but app is degraded.         | `npm run auth:openai -- status`            | Refresh, reauth, or fix prompt prerequisites based on `/startup`.                           |
| Backend request fails.                        | `npm run codex:smoke -- --json`            | Inspect `CodexTransportError.kind`, `code`, `status`, and recovery commands.                |
| Agents path fails but raw transport works.    | `npm run agents:codex:smoke -- --json`     | Check provider adapter and `@openai/agents` version drift.                                  |
| Startup says auth ready but workflow fails.   | `GET /startup`, then `POST /orchestration` | Inspect prompt state and bootstrap error code.                                              |
| Fake backend tests pass but live smoke fails. | `npm run codex:smoke -- --json`            | Treat as account, entitlement, usage-limit, model, or backend drift until proven otherwise. |

For step-by-step incident handling, see
[OpenAI Codex Agent Runtime Runbook](runbooks/openai-codex-agent-runtime.md).

## Testing Map

| Test                                                         | Guards                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `scripts/test-openai-account-auth.mjs`                       | OAuth parsing, storage, status, refresh, CLI status, logout, and expired states.                              |
| `scripts/test-openai-codex-transport.mjs`                    | Request body, headers, SSE parsing, refresh retry, error parsing, and raw smoke behavior.                     |
| `scripts/test-openai-agents-provider.mjs`                    | Model normalization, provider registration, streamed and non-streamed agents runs, and backend adapter shape. |
| `apps/api/src/agent-runtime/agent-runtime-config.test.ts`    | Env var normalization, base URL validation, model/originator validation, and override flags.                  |
| `apps/api/src/agent-runtime/openai-account-provider.test.ts` | Missing, invalid, expired, ready auth state mapping and provider bootstrap through fake backend.              |
| `apps/api/src/agent-runtime/agent-runtime-service.test.ts`   | Readiness summaries, prompt missing states, bootstrap, provider cache, and fake backend requests.             |
| `apps/api/src/orchestration/orchestration-service.test.ts`   | Runtime blocked vs ready handoffs, prompt redaction, and session/job integration.                             |
| `apps/api/src/server/http-server.test.ts`                    | `/health`, `/startup`, `/settings`, orchestration-facing runtime fields, and no startup mutation.             |
| `scripts/test-app-bootstrap.mjs`                             | Live API boot behavior with fake auth and fake backend override env vars.                                     |
| `scripts/test-maintenance-scripts.mjs`                       | Script command surfaces and maintenance helpers.                                                              |

## Change-Safety Checklist

Before changing this subsystem:

1. Identify the owning component in the component table.
2. Confirm whether the change affects auth scripts, raw transport, provider
   adapter, API bridge, startup payloads, settings payloads, or orchestration.
3. Update this guide and the smaller linked docs instead of duplicating
   source-of-truth details.
4. Keep real tokens out of logs, fixtures, docs, and test output.
5. Keep `data/openai-account-auth.json` uncommitted; use
   `data/openai-account-auth.example.json` for shape references.
6. Preserve the distinction between auth-layer env vars and API-layer env vars.
7. Preserve read-only startup diagnostics: `/health` and `/startup` must not
   refresh credentials or contact the live backend.
8. Preserve prompt redaction: orchestration must not persist raw prompt text,
   source contents, or live provider handles.
9. Run the smallest focused test first, then climb the validation ladder.
10. Run `git diff --check` before handing off docs.

## Related Docs

- [OpenAI Account Auth](OPENAI_ACCOUNT_AUTH.md)
- [Standalone OpenAI Codex Agent Runtime](STANDALONE_OPENAI_CODEX_AGENT_RUNTIME.md)
- [API Docs](api/README_api.md)
- [API Package README](../apps/api/README_api.md)
- [OpenAI Codex Agent Runtime Runbook](runbooks/openai-codex-agent-runtime.md)
- [OpenAI Codex Agent Runtime Examples](examples/openai-codex-agent-runtime.md)
