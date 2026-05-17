# Runbooks

This directory holds short operational runbooks for the app bootstrap and
support flow.

## Current coverage

- Startup and boot smoke checks
- Missing prerequisite handling
- Repo-root and workspace validation failures
- Offline or invalid API responses in the web shell
- OpenAI Codex account-auth, transport, provider, prompt, and app-readiness
  failures

## Useful commands

```bash
npm run app:boot:test
npm run app:validate
npm run doctor
npm run auth:openai -- status
npm run codex:smoke -- --json
npm run agents:codex:smoke -- --json
```

## Related docs

- [OpenAI Codex Agent Runtime Runbook](openai-codex-agent-runtime.md)
- [OpenAI Codex Agent Runtime](../OPENAI_CODEX_AGENT_RUNTIME.md)
- [Support](../SUPPORT.md)
- [Setup Guide](../SETUP.md)
- [Architecture](../ARCHITECTURE.md)
