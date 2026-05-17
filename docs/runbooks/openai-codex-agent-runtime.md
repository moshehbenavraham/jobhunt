# OpenAI Codex Agent Runtime Runbook

Use this runbook when the OpenAI Codex account-auth runtime, API agent runtime,
startup diagnostics, settings summary, or orchestration bootstrap is degraded.

Canonical reference:
[OpenAI Codex Agent Runtime](../OPENAI_CODEX_AGENT_RUNTIME.md).

## First Checks

Run these from the repo root:

```bash
npm run auth:openai -- status
npm run app:boot:test
```

If the API server is already running:

```bash
curl -s http://127.0.0.1:5172/health
curl -s http://127.0.0.1:5172/startup
curl -s http://127.0.0.1:5172/settings
```

Use `/health` for a compact status and `/startup` for full diagnostics.

## Missing Stored Auth File

Symptoms:

- `/health` or `/startup` reports `startupStatus: "auth-required"`
- `diagnostics.agentRuntime.auth.state` is `auth-required`
- smoke commands report no stored OpenAI account credentials

Likely owner file:

- `apps/api/src/agent-runtime/openai-account-provider.ts`
- `scripts/lib/openai-account-auth/storage.mjs`

Fastest reproduce command:

```bash
npm run auth:openai -- status
```

Recovery:

```bash
npm run auth:openai -- login
```

Validation:

```bash
npm run agents:codex:smoke -- --json
npm run app:boot:test
```

Escalate if login succeeds but status still points at a different auth path.
Check `JOBHUNT_OPENAI_ACCOUNT_AUTH_PATH` and `JOBHUNT_API_OPENAI_AUTH_PATH`.

## Invalid Auth File

Symptoms:

- `/startup` reports `invalid-auth`
- auth status says the stored auth file is invalid
- smoke commands fail before contacting the backend

Likely owner file:

- `scripts/lib/openai-account-auth/storage.mjs`

Fastest reproduce command:

```bash
npm run auth:openai -- status
```

Recovery:

```bash
npm run auth:openai -- logout
npm run auth:openai -- login
```

Validation:

```bash
npm run codex:smoke -- --json
```

Escalate if a freshly written file is invalid. Compare the file shape to
`data/openai-account-auth.example.json` without sharing real token values.

## Expired Auth

Symptoms:

- `/startup` reports `expired-auth`
- `diagnostics.agentRuntime.auth.expiresAt` is in the past
- `npm run auth:openai -- status` recommends refresh or reauth

Likely owner file:

- `scripts/lib/openai-account-auth/storage.mjs`
- `scripts/lib/openai-account-auth/oauth.mjs`

Fastest reproduce command:

```bash
npm run auth:openai -- status
```

Recovery:

```bash
npm run auth:openai -- refresh
```

If refresh fails:

```bash
npm run auth:openai -- reauth
```

Validation:

```bash
npm run agents:codex:smoke -- --json
```

Escalate if refresh consistently fails with a token exchange error after
reauth. The OAuth endpoint, client id, or refresh-token policy may have drifted.

## Refresh Failure

Symptoms:

- `npm run auth:openai -- refresh` exits non-zero
- a live request fails while attempting to refresh expired credentials
- transport errors mention refresh or token exchange failure

Likely owner file:

- `scripts/lib/openai-account-auth/oauth.mjs`
- `scripts/lib/openai-account-auth/codex-transport.mjs`

Fastest reproduce command:

```bash
npm run auth:openai -- refresh
```

Recovery:

```bash
npm run auth:openai -- reauth
```

Validation:

```bash
npm run auth:openai -- status
npm run codex:smoke -- --json
```

Escalate with the non-token error message only. Do not paste access tokens or
refresh tokens into issues, logs, or docs.

## First Request Returns Unauthorized

Symptoms:

- raw or agents smoke fails with HTTP 401
- auth status may still report `ready`
- a first request retries once after refresh, then fails again

Likely owner file:

- `scripts/lib/openai-account-auth/codex-transport.mjs`

Fastest reproduce command:

```bash
npm run codex:smoke -- --json
```

Recovery:

```bash
npm run auth:openai -- reauth
```

Validation:

```bash
npm run codex:smoke -- --json
npm run agents:codex:smoke -- --json
```

Escalate if reauth succeeds but live smoke still returns 401. Check account
entitlements, account id extraction, and whether the backend expects different
headers.

## Backend SSE Or Response Shape Changed

Symptoms:

- smoke tests fail after auth succeeds
- errors mention truncated stream, missing final response, missing output, or
  unknown response shape
- fake backend tests pass but live smoke fails

Likely owner file:

- `scripts/lib/openai-account-auth/codex-transport.mjs`
- `scripts/lib/openai-account-auth/agents-provider.mjs`

Fastest reproduce command:

```bash
npm run codex:smoke -- --json
```

Recovery:

There is no credential recovery for backend-shape drift. Capture the structured
error payload, update the fake backend fixture, then update the parser or
provider adapter.

Validation:

```bash
npm run app:api:test:agent-runtime
npm run test:quick
```

Escalate if the backend now requires new request headers, different request
body fields, or a different terminal event type.

## Empty Output In `response.completed`

Symptoms:

- live backend emits streamed text, but the terminal response payload has an
  empty `output` array
- `@openai/agents` cannot derive final output

Likely owner file:

- `scripts/lib/openai-account-auth/codex-transport.mjs`

Fastest reproduce command:

```bash
npm run agents:codex:smoke -- --json --stream
```

Recovery:

The transport already augments terminal output from earlier output-item events.
If the issue returns, add a fixture that captures the new event order and
extend the augmentation logic.

Validation:

```bash
npm run app:api:test:agent-runtime
npm run agents:codex:smoke -- --json --stream
```

Escalate if the backend stops emitting output-item events entirely.

## `@openai/agents` Tracing Warning

Symptoms:

- console prints `No API key provided for OpenAI tracing exporter. Exports will
be skipped`
- the smoke command otherwise returns `ok: true`

Likely owner file:

- `scripts/lib/openai-account-auth/agents-provider.mjs`

Fastest reproduce command:

```bash
npm run agents:codex:smoke -- --json
```

Recovery:

None needed when the command succeeds. This warning is currently expected when
tracing is not configured and does not mean the primary runtime is using an API
key.

Validation:

```bash
npm run agents:codex:smoke -- --json
```

Escalate only if the warning becomes a hard failure or the package changes its
provider registration behavior.

## Prompt Bundle Missing Or Empty

Symptoms:

- `/startup` reports `prompt-failure`
- `diagnostics.agentRuntime.auth.state` is `ready`
- `diagnostics.agentRuntime.prompt.state` is `missing` or `empty`
- orchestration returns a blocked runtime with `prompt-missing` or
  `prompt-empty`

Likely owner file:

- `apps/api/src/agent-runtime/agent-runtime-service.ts`
- `apps/api/src/prompt/`
- the missing or empty file named in the payload

Fastest reproduce command:

```bash
npm run app:boot:test
```

Recovery:

Restore the missing or empty prompt prerequisite. Common baseline files are:

- `AGENTS.md`
- `modes/_shared.md`
- `modes/_profile.md`
- `config/profile.yml`
- `profile/cv.md`

Validation:

```bash
npm run app:boot:test
npm run app:api:test:agent-runtime
```

Escalate if the file exists and is non-empty but the prompt loader still marks
it missing. Check repo-root resolution and prompt source mapping.

## Auth Ready But Workflow Launch Fails

Symptoms:

- `/startup` says `ready`
- `/settings` says auth is ready
- launching a workflow still returns a blocked or unsupported state

Likely owner file:

- `apps/api/src/orchestration/orchestration-service.ts`
- `apps/api/src/orchestration/workflow-router.ts`
- `apps/api/src/agent-runtime/agent-runtime-service.ts`

Fastest reproduce command:

```bash
curl -s -X POST http://127.0.0.1:5172/orchestration \
  -H 'content-type: application/json' \
  -d '{"kind":"launch","workflow":"single-evaluation","context":null}'
```

Recovery:

Inspect the returned `runtime.code`, `route.status`, and prompt details. Fix
the workflow route or prompt source that the payload names. Do not treat this
as an auth issue unless the runtime code is an auth code.

Validation:

```bash
npm run app:api:test:orchestration
npm run app:boot:test
```

Escalate if route and prompt states are ready but provider bootstrap fails.

## Fake Backend Tests Pass But Live Smoke Fails

Symptoms:

- `npm run app:api:test:agent-runtime` passes
- `npm run app:boot:test` passes
- `npm run codex:smoke -- --json` or `npm run agents:codex:smoke -- --json`
  fails

Likely owner file:

- live integration: `scripts/lib/openai-account-auth/codex-transport.mjs`
- fake fixture: `scripts/test-openai-codex-transport.mjs` or
  `scripts/test-openai-agents-provider.mjs`

Fastest reproduce command:

```bash
npm run codex:smoke -- --json
```

Recovery:

Classify the live failure:

- auth: reauth and validate account id
- usage limit: wait until the reset time or use a different eligible account
- unsupported model: use `gpt-5.4-mini`
- invalid request: compare request body and headers to the current backend
- backend drift: update fixtures, parser, and docs together

Validation:

```bash
npm run codex:smoke -- --json
npm run agents:codex:smoke -- --json
npm run app:api:test:agent-runtime
```

Escalate if the live backend rejects the documented default model, removes SSE,
or changes auth headers.
