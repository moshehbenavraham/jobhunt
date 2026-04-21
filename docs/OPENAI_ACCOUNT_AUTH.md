# OpenAI Account Auth

This document defines the repo's supported OpenAI runtime contract.

## Contract

Jobhunt uses OpenAI account authentication for all repo-owned OpenAI runtime
paths.

Supported behavior:

- `npm run auth:openai -- login` for first-run setup
- stored credentials in `data/openai-account-auth.json`
- raw Codex transport through `npm run codex:smoke`
- `@openai/agents` runtime through `npm run agents:codex:smoke`

Unsupported behavior:

- `OPENAI_API_KEY` onboarding
- OpenAI Platform API key fallback for the main runtime path

## Main Components

| Surface          | Path                                                  | Purpose                                |
| ---------------- | ----------------------------------------------------- | -------------------------------------- |
| Auth CLI         | `scripts/openai-account-auth.mjs`                     | Login, status, refresh, reauth, logout |
| Auth core        | `scripts/lib/openai-account-auth/oauth.mjs`           | PKCE login and token exchange          |
| Storage          | `scripts/lib/openai-account-auth/storage.mjs`         | Locked credential reads and writes     |
| Transport        | `scripts/lib/openai-account-auth/codex-transport.mjs` | Authenticated Codex SSE client         |
| Provider adapter | `scripts/lib/openai-account-auth/agents-provider.mjs` | `@openai/agents` provider wiring       |
| Raw smoke CLI    | `scripts/openai-codex-smoke.mjs`                      | Transport validation                   |
| Agents smoke CLI | `scripts/openai-agents-codex-smoke.mjs`               | Provider validation                    |

## Runtime Flow

```text
npm run auth:openai -- login
  -> auth.openai.com OAuth flow
  -> data/openai-account-auth.json
  -> scripts/lib/openai-account-auth/codex-transport.mjs
     -> https://chatgpt.com/backend-api/codex/responses
  -> scripts/lib/openai-account-auth/agents-provider.mjs
     -> @openai/agents
```

## Commands

```bash
npm run auth:openai -- login
npm run auth:openai -- status
npm run auth:openai -- refresh
npm run auth:openai -- reauth
npm run auth:openai -- logout
npm run codex:smoke -- --json
npm run agents:codex:smoke -- --json
npm run agents:codex:smoke -- --json --stream
```

## Runtime Details

### OAuth behavior

- OAuth authorize URL: `https://auth.openai.com/oauth/authorize`
- OAuth token URL: `https://auth.openai.com/oauth/token`
- default redirect URI: `http://localhost:1455/auth/callback`
- the CLI supports both localhost callback handling and manual pasted-code
  fallback
- the stored credential includes `chatgpt_account_id` extracted from the JWT

### Transport behavior

- backend URL: `https://chatgpt.com/backend-api/codex/responses`
- transport type: SSE first
- required request headers:
  - `Authorization: Bearer <token>`
  - `chatgpt-account-id`
  - `originator`
  - `OpenAI-Beta: responses=experimental`
- the transport auto-refreshes expired stored credentials before request
- one unauthorized request is allowed to refresh and retry once

### Provider behavior

- provider family name: `openai-codex`
- accepted model forms:
  - `openai-codex/<model>`
  - `openai-codex:<model>`
  - bare model ids in provider-owned call sites
- default model: `gpt-5.4-mini`

## Known Constraints

- This ChatGPT-account path requires `instructions` in request payloads.
- `gpt-5-codex` is currently rejected on this path. Use `gpt-5.4-mini`
  unless live validation proves another model is stable.
- The live backend may leave `response.output` empty in `response.completed`.
  The repo transport normalizes the terminal payload from earlier streamed
  output-item events before handing the response to `@openai/agents`.
- The top-level `@openai/agents` package may print:
  `No API key provided for OpenAI tracing exporter. Exports will be skipped`
  when tracing is not configured. This warning is currently expected and does
  not mean the account-authenticated runtime path is using an API key.

## Recovery Rules

- Missing auth: run `npm run auth:openai -- login`
- Expired auth: run `npm run auth:openai -- refresh`
- Invalid auth file: run `npm run auth:openai -- logout`, then
  `npm run auth:openai -- login`
- Fresh runtime validation after auth change: run
  `npm run agents:codex:smoke -- --json`

## Validation

The repo keeps dedicated auth-path regressions in:

- `scripts/test-openai-account-auth.mjs`
- `scripts/test-openai-codex-transport.mjs`
- `scripts/test-openai-agents-provider.mjs`
- `scripts/test-maintenance-scripts.mjs`

The broad repo gate remains:

```bash
node scripts/test-all.mjs --quick
```
