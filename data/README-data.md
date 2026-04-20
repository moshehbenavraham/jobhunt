# Data

This directory stores mutable job-search working data.

- Typical contents include the applications tracker, pipeline inbox, scan history, and follow-up records.
- `follow-ups.example.md` is an optional starter file; the follow-up mode can create `follow-ups.md` automatically on first use.
- `openai-account-auth.example.json` shows the committed credential-file shape used by the OpenAI account auth flow.
- `openai-account-auth.example.json.lock` shows the lock-file shape only; the real `.lock` file is runtime-only and ephemeral.
- Treat these files as user data, not system files.
