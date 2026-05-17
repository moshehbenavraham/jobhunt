# Standalone OpenAI Codex Agent Runtime

This guide explains how to reuse the Job-Hunt OpenAI Codex account-auth and
agent-runtime pattern in a different Node or TypeScript project.

It is not an official SDK guide, and it must not be treated as a stable public
OpenAI API contract. The reusable pattern is repo-owned OAuth credential
storage plus a transport/provider adapter for the current ChatGPT account Codex
backend.

## What This System Is

The system provides:

- OpenAI account OAuth login with PKCE and refresh-token storage
- local credential status inspection
- authenticated SSE requests to the Codex responses backend
- a custom `@openai/agents` model provider
- an optional app-side readiness and bootstrap service pattern
- fake-auth and fake-backend testing patterns

The system does not provide:

- OpenAI Platform API key onboarding
- multi-user hosted auth
- a stable public backend contract
- production secret management
- a package boundary that can be imported without path adaptation

## Product Coupling

The current implementation depends on these product endpoints:

- `https://auth.openai.com/oauth/authorize`
- `https://auth.openai.com/oauth/token`
- `https://chatgpt.com/backend-api/codex/responses`

Because the Codex backend shape is product-coupled, a new project must keep
live smoke tests and fake-backend fixture tests close to the integration.

## Prerequisites

- Node.js 18 or newer
- npm or another package manager
- local filesystem access for credential storage
- dependencies from this repo's `package.json`:
  - `@openai/agents`
  - `@openai/agents-core`
  - `@openai/agents-openai`
- a browser or manual-code path for OAuth login

`@openai/agents-core` and `@openai/agents-openai` are imported by
`scripts/lib/openai-account-auth/agents-provider.mjs`. They may arrive as
transitive packages in this repo, but a standalone project should declare them
explicitly if it imports those modules directly.

## Copy Map

Copy-as-is candidates:

| Source                                                | Why                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `scripts/lib/openai-account-auth/common.mjs`          | Auth constants, default path helpers, PKCE helpers, JWT account-id extraction, and callback HTML.  |
| `scripts/lib/openai-account-auth/oauth.mjs`           | OAuth flow, token exchange, refresh, localhost callback, and manual fallback.                      |
| `scripts/lib/openai-account-auth/storage.mjs`         | Locked JSON credential storage and status normalization.                                           |
| `scripts/lib/openai-account-auth/codex-transport.mjs` | SSE transport, auth headers, refresh retry, error normalization, and terminal output augmentation. |
| `scripts/lib/openai-account-auth/agents-provider.mjs` | `@openai/agents` provider adapter and model-name normalization.                                    |
| `scripts/lib/openai-account-auth/index.mjs`           | Export surface for the auth stack.                                                                 |
| `data/openai-account-auth.example.json`               | Safe credential-file shape reference.                                                              |

Adapt-required candidates:

| Source                                                | Replace                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/openai-account-auth.mjs`                     | CLI name, help text, default root resolution, and any project-specific command docs.                                                  |
| `scripts/openai-codex-smoke.mjs`                      | npm script name, default prompt, and recovery command strings.                                                                        |
| `scripts/openai-agents-codex-smoke.mjs`               | npm script name, default prompt, and recovery command strings.                                                                        |
| `apps/api/src/agent-runtime/*`                        | TypeScript path aliases, repo-root resolution, prompt loader dependency, workspace adapter dependency, and runtime payload contracts. |
| `apps/api/src/server/startup-status.ts`               | Startup status names and HTTP payload shape.                                                                                          |
| `apps/api/src/server/settings-summary.ts`             | Settings route shape and maintenance command list.                                                                                    |
| `apps/api/src/orchestration/orchestration-service.ts` | Workflow routing, prompt bundle semantics, session storage, and tool catalog integration.                                             |

## Minimum Integration Boundary

A different project needs these boundaries:

1. Credential path resolver: where the auth JSON file lives.
2. Auth CLI: login, status, refresh, reauth, logout.
3. Transport wrapper: raw prompt or prebuilt Responses request data.
4. Optional provider setup: register the Codex provider with `@openai/agents`.
5. Optional readiness service: inspect stored credentials and any project-local
   prompt prerequisites.
6. Tests: fake credential file and fake backend.

Keep the Job-Hunt prompt loader, workspace adapter, startup payloads, settings
payloads, and orchestration session store out of a standalone project unless
you also port their surrounding contracts.

## Raw Transport Example

```js
import { runCodexTextPrompt } from './openai-account-auth/index.mjs';

const result = await runCodexTextPrompt({
  authPath: './data/openai-account-auth.json',
  baseUrl: 'https://chatgpt.com/backend-api',
  instructions: 'You are terse.',
  model: 'gpt-5.4-mini',
  prompt: 'Reply with the single word PONG.',
});

console.log(result.text);
```

Use this first in a new project. It proves the credential file, headers, SSE
parser, refresh path, and backend URL before adding app-level abstractions.

## Agents Provider Example

```js
import { Agent, run } from '@openai/agents';
import { configureDefaultOpenAICodexModelProvider } from './openai-account-auth/index.mjs';

configureDefaultOpenAICodexModelProvider({
  authPath: './data/openai-account-auth.json',
  baseUrl: 'https://chatgpt.com/backend-api',
  originator: 'my-project',
});

const agent = new Agent({
  name: 'Smoke test',
  instructions: 'Reply with concise plain text.',
  model: 'openai-codex/gpt-5.4-mini',
});

const result = await run(agent, 'Reply with the single word PONG.');
console.log(result.finalOutput);
```

Accepted model forms are:

- `openai-codex/<model>`
- `openai-codex:<model>`
- bare model ids in provider-owned call sites

## Readiness Service Example

```js
import {
  createOpenAICodexModelProvider,
  getStoredCredentialsStatus,
} from './openai-account-auth/index.mjs';

export async function inspectRuntimeReadiness(options = {}) {
  const authPath = options.authPath || './data/openai-account-auth.json';
  const status = await getStoredCredentialsStatus({ authPath });

  if (!status.authenticated) {
    return {
      authPath: status.authPath,
      message:
        status.reason === 'invalid'
          ? 'Stored OpenAI account credentials are invalid.'
          : 'Stored OpenAI account credentials are required.',
      state: status.reason === 'invalid' ? 'invalid-auth' : 'auth-required',
    };
  }

  if (status.expired) {
    return {
      accountId: status.accountId,
      authPath: status.authPath,
      expiresAt: status.expiresAt,
      message: 'Stored OpenAI account credentials are expired.',
      state: 'expired-auth',
    };
  }

  return {
    accountId: status.accountId,
    authPath: status.authPath,
    expiresAt: status.expiresAt,
    message: 'Stored OpenAI account credentials are ready.',
    provider: createOpenAICodexModelProvider({
      authPath: status.authPath,
      defaultModel: options.model || 'gpt-5.4-mini',
      originator: options.originator || 'my-project',
    }),
    state: 'ready',
  };
}
```

In an app, return the provider only from a bootstrap path. Keep simple
readiness endpoints read-only so they do not refresh credentials or contact
the live backend.

## Credential Storage Contract

Use the same JSON shape as `data/openai-account-auth.example.json`:

```json
{
  "version": 1,
  "provider": "openai-codex",
  "updatedAt": "2026-04-20T00:00:00.000Z",
  "credentials": {
    "accessToken": "<access-token>",
    "refreshToken": "<refresh-token>",
    "expiresAt": 1770000000000,
    "accountId": "<chatgpt-account-id>"
  }
}
```

Security rules:

- never commit a real credential file
- commit only example files with placeholder tokens
- store the real file outside public source control paths when possible
- write files with owner-only permissions when the host supports it
- avoid printing access tokens except in explicit local debugging commands
- redact prompt bodies, request bodies, transcripts, and tokens from logs

## Testing Strategy

Start with fixtures:

1. Fake credential file with placeholder access token, refresh token, account
   id, and future `expiresAt`.
2. Missing credential path.
3. Invalid credential JSON.
4. Expired credential JSON.
5. Fake Codex backend route at `/backend-api/codex/responses`.
6. 401 once, then success after refresh.
7. 429 usage-limit payload.
8. 500 retryable payload.
9. SSE stream ending before completion.
10. `response.completed` with empty `output` but earlier output-item events.

In Job-Hunt, the executable references are:

- `scripts/test-openai-account-auth.mjs`
- `scripts/test-openai-codex-transport.mjs`
- `scripts/test-openai-agents-provider.mjs`
- `apps/api/src/agent-runtime/*.test.ts`
- `scripts/test-app-bootstrap.mjs`

## Migration Checklist From API Keys

1. Remove primary-runtime assumptions that require `OPENAI_API_KEY`.
2. Add an account-auth CLI with login, status, refresh, reauth, and logout.
3. Add local credential storage with an example file and real-file gitignore
   coverage.
4. Replace SDK default HTTP calls with the Codex transport or provider.
5. Add a read-only readiness endpoint or command.
6. Separate missing auth, invalid auth, expired auth, prompt failure, and ready
   states.
7. Add smoke tests for raw transport and `@openai/agents`.
8. Add fake backend tests for headers, request body, streaming, refresh, and
   backend drift.
9. Update setup docs so login and validation commands are first-class.
10. Document the product-coupled backend and keep live validation close.

## Porting TODO List

For a new project:

1. Copy `scripts/lib/openai-account-auth/` into a project-owned module path.
2. Decide the real credential path and replace Job-Hunt default path wording.
3. Adapt `scripts/openai-account-auth.mjs` into your CLI.
4. Adapt `scripts/openai-codex-smoke.mjs` and
   `scripts/openai-agents-codex-smoke.mjs` into your smoke scripts.
5. Add package scripts for login, status, raw smoke, and agents smoke.
6. Add `.gitignore` coverage for the real credential file.
7. Add fake credential and fake backend tests.
8. Add an app readiness service only after the CLI and smoke scripts pass.
9. Add a runbook for auth and backend drift.
10. Keep this warning in your docs: this is a product-coupled integration, not
    an official stable public API.

## Related Job-Hunt Docs

- [OpenAI Codex Agent Runtime](OPENAI_CODEX_AGENT_RUNTIME.md)
- [OpenAI Account Auth](OPENAI_ACCOUNT_AUTH.md)
- [OpenAI Codex Agent Runtime Examples](examples/openai-codex-agent-runtime.md)
- [OpenAI Codex Agent Runtime Runbook](runbooks/openai-codex-agent-runtime.md)
