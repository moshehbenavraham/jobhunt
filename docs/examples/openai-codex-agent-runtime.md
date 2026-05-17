# OpenAI Codex Agent Runtime Examples

These examples are documentation-only snippets for maintainers and standalone
adopters. The executable source of truth remains the tests named at the end of
this file.

Do not paste real access tokens into examples, fixtures, or issue reports.

## Raw Transport

```js
import { runCodexTextPrompt } from '../../scripts/lib/openai-account-auth/index.mjs';

const result = await runCodexTextPrompt({
  authPath: './data/openai-account-auth.json',
  baseUrl: 'https://chatgpt.com/backend-api',
  instructions: 'You are terse.',
  model: 'gpt-5.4-mini',
  prompt: 'Reply with the single word PONG.',
});

console.log(result.text);
```

Expected success shape:

```json
{
  "authPath": "./data/openai-account-auth.json",
  "requestUrl": "https://chatgpt.com/backend-api/codex/responses",
  "requestId": "<request-id>",
  "model": "gpt-5.4-mini",
  "text": "PONG",
  "responseStatus": "completed"
}
```

## Provider Registration

```js
import { Agent, run } from '@openai/agents';
import { configureDefaultOpenAICodexModelProvider } from '../../scripts/lib/openai-account-auth/index.mjs';

configureDefaultOpenAICodexModelProvider({
  authPath: './data/openai-account-auth.json',
  baseUrl: 'https://chatgpt.com/backend-api',
  originator: 'pi',
});

const agent = new Agent({
  name: 'Codex provider smoke',
  instructions: 'Reply with concise plain text.',
  model: 'openai-codex/gpt-5.4-mini',
});

const result = await run(agent, 'Reply with the single word PONG.');
console.log(result.finalOutput);
```

## Readiness Inspection

```js
import {
  createAgentRuntimeConfig,
  inspectOpenAIAccountReadiness,
} from '../../apps/api/src/agent-runtime/index.js';

const config = createAgentRuntimeConfig(
  {
    authPath: './data/openai-account-auth.json',
    baseUrl: 'https://chatgpt.com/backend-api',
    model: 'gpt-5.4-mini',
    originator: 'pi',
  },
  {
    repoRoot: process.cwd(),
  },
);

const readiness = await inspectOpenAIAccountReadiness(config);
console.log(readiness.state);
```

In the app, use `createAgentRuntimeService().getReadiness()` instead of
importing lower-level readiness helpers directly.

## Fake Auth Fixture

```json
{
  "version": 1,
  "provider": "openai-codex",
  "updatedAt": "2026-04-20T00:00:00.000Z",
  "credentials": {
    "accessToken": "fixture-access-token",
    "refreshToken": "fixture-refresh-token",
    "expiresAt": 1770000000000,
    "accountId": "acct-fixture"
  }
}
```

Fixture variants:

- missing: no file at the auth path
- invalid: JSON without a valid `credentials` object
- expired: valid shape with `expiresAt` in the past
- ready: valid shape with `expiresAt` in the future

## Fake Backend Fixture

The fake backend should accept `POST /backend-api/codex/responses`, verify
headers, and return `text/event-stream`.

Minimum success stream:

```text
data: {"type":"response.created","response":{"id":"resp_fixture","status":"in_progress"}}

data: {"type":"response.output_text.delta","delta":"PONG"}

data: {"type":"response.completed","response":{"id":"resp_fixture","status":"completed","model":"gpt-5.4-mini","usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}

```

The transport should also be tested with terminal responses that have empty
`response.output` plus earlier output-item events.

## Status Examples

Missing auth:

```json
{
  "accountId": null,
  "expiresAt": null,
  "message": "Stored OpenAI account credentials are required at <path>.",
  "nextSteps": ["npm run auth:openai -- login"],
  "state": "auth-required",
  "updatedAt": null
}
```

Invalid auth:

```json
{
  "accountId": null,
  "expiresAt": null,
  "message": "Stored OpenAI account credentials are invalid at <path>.",
  "nextSteps": [
    "npm run auth:openai -- logout",
    "npm run auth:openai -- login"
  ],
  "state": "invalid-auth",
  "updatedAt": null
}
```

Expired auth:

```json
{
  "accountId": "acct-fixture",
  "expiresAt": 1700000000000,
  "message": "Stored OpenAI account credentials are expired at <path>.",
  "nextSteps": [
    "npm run auth:openai -- refresh",
    "npm run auth:openai -- reauth"
  ],
  "state": "expired-auth",
  "updatedAt": "2026-04-20T00:00:00.000Z"
}
```

Ready auth:

```json
{
  "accountId": "acct-fixture",
  "expiresAt": 1770000000000,
  "message": "Stored OpenAI account credentials are ready at <path>.",
  "nextSteps": [
    "npm run codex:smoke -- --json",
    "npm run agents:codex:smoke -- --json"
  ],
  "state": "ready",
  "updatedAt": "2026-04-20T00:00:00.000Z"
}
```

Aggregate prompt failure:

```json
{
  "status": "prompt-failure",
  "message": "Prompt bootstrap is blocked because required prompt prerequisites are missing.",
  "prompt": {
    "state": "missing",
    "missingSources": ["profile-cv"],
    "emptySources": [],
    "issues": ["Missing prompt prerequisite: profile-cv"]
  }
}
```

## Executable References

- `scripts/test-openai-account-auth.mjs`
- `scripts/test-openai-codex-transport.mjs`
- `scripts/test-openai-agents-provider.mjs`
- `apps/api/src/agent-runtime/openai-account-provider.test.ts`
- `apps/api/src/agent-runtime/agent-runtime-service.test.ts`
- `scripts/test-app-bootstrap.mjs`
