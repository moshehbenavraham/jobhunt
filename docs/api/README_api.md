# API Docs

This directory documents API-specific app runtime contracts. The package-level
README lives at [apps/api/README_api.md](../../apps/api/README_api.md).

For the full OpenAI account-auth and agent-runtime architecture, use
[OpenAI Codex Agent Runtime](../OPENAI_CODEX_AGENT_RUNTIME.md) as the source
of truth. This page only documents the API payload surfaces that expose that
runtime.

## Runtime Routes

| Route            | Method        | Purpose                                                                                              |
| ---------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `/health`        | `GET`, `HEAD` | Compact startup health and agent-runtime readiness.                                                  |
| `/startup`       | `GET`, `HEAD` | Full startup diagnostics, prompt contract, app state, workspace, and agent runtime details.          |
| `/settings`      | `GET`, `HEAD` | Settings summary with auth state, runtime config, maintenance commands, tools, and workflow support. |
| `/orchestration` | `POST`        | Workflow launch or resume path that uses the agent runtime during launch.                            |

## `/health`

Relevant agent-runtime fields:

- `startupStatus`: top-level startup state. Agent-runtime values are
  `auth-required`, `expired-auth`, `invalid-auth`, `prompt-failure`, and
  `ready`.
- `status`: health envelope state, `ok`, `degraded`, or `error`.
- `agentRuntime.status`: aggregate agent runtime readiness.
- `agentRuntime.promptState`: baseline prompt readiness or `null`.
- `agentRuntime.authPath`: auth path inspected by the API runtime.
- `agentRuntime.message`: status-specific recovery message.

Auth and prompt degradation return HTTP 200 with `status: "degraded"`.
`runtime-error` returns HTTP 503.

## `/startup`

Relevant agent-runtime fields:

- `diagnostics.agentRuntime.auth`: account id, auth path, expiry, message,
  next steps, and auth state.
- `diagnostics.agentRuntime.config`: resolved auth path, base URL, model,
  originator, and override flags.
- `diagnostics.agentRuntime.prompt`: baseline prompt source state,
  missing/empty source keys, workflow metadata, and issues.
- `diagnostics.promptContract`: prompt source order, workflow routes, and
  supported workflow metadata.
- `health`: the compact health object also returned by `/health`.

Startup diagnostics are read-only. They inspect stored auth and prompt
prerequisites but do not refresh credentials and do not contact the Codex
backend.

## `/settings`

Relevant agent-runtime fields:

- `auth.auth`: same auth readiness shape as startup diagnostics.
- `auth.config`: resolved app runtime config and override flags.
- `auth.status`: aggregate agent runtime readiness.
- `auth.message`: current runtime message.
- `maintenance.commands`: bounded command list including auth status, auth
  login, auth refresh, doctor, and quick regression.
- `support.prompt`: prompt source and supported workflow summary.
- `support.workflows`: workflow route status and tooling gap summary.

Query params:

- `toolLimit`: integer from 1 to 10
- `workflowLimit`: integer from 1 to 10

## `/orchestration`

Launch request:

```json
{
  "kind": "launch",
  "workflow": "single-evaluation",
  "sessionId": null,
  "context": null
}
```

Resume request:

```json
{
  "kind": "resume",
  "sessionId": "session-id"
}
```

For launch requests, the orchestration service bootstraps the agent runtime
after route selection. A blocked runtime appears as:

```json
{
  "runtime": {
    "auth": null,
    "code": "auth-required",
    "message": "Stored OpenAI account credentials are required at <path>.",
    "prompt": null,
    "status": "blocked"
  }
}
```

The exact envelope is shaped for the chat-console command payload, so consumers
should treat `runtime.status`, `runtime.code`, `route.status`, and `message`
as the stable inspection points.

## App State And Auth State

- App-owned runtime state lives in `.jobhunt-app/`.
- Stored OpenAI account credentials live in `data/openai-account-auth.json` by
  default.
- `/health`, `/startup`, and `/settings` may read both locations.
- Startup diagnostics do not create `.jobhunt-app/app.db`; explicit store
  initialization paths create the operational store.
- The API runtime can read a different auth fixture with
  `JOBHUNT_API_OPENAI_AUTH_PATH`.

## Deterministic Test Env

Use these env vars for app-runtime fixtures:

```bash
JOBHUNT_API_OPENAI_AUTH_PATH=/tmp/auth/openai-account-auth.json
JOBHUNT_API_OPENAI_BASE_URL=http://127.0.0.1:4318/backend-api
JOBHUNT_API_OPENAI_ORIGINATOR=jobhunt-api-test
JOBHUNT_API_OPENAI_MODEL=openai-codex/gpt-5.4-mini
```

Run:

```bash
npm run app:api:test:agent-runtime
npm run app:boot:test
```

## Related Docs

- [OpenAI Codex Agent Runtime](../OPENAI_CODEX_AGENT_RUNTIME.md)
- [OpenAI Account Auth](../OPENAI_ACCOUNT_AUTH.md)
- [Scripts Reference](../SCRIPTS.md)
- [Setup Guide](../SETUP.md)
- [Architecture](../ARCHITECTURE.md)
