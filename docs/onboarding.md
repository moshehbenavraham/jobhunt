# Onboarding

Use this checklist for a new checkout:

1. Install dependencies.
2. Copy `config/profile.example.yml` to `config/profile.yml`.
3. Copy `config/portals.example.yml` to `config/portals.yml`.
4. Copy `profile/cv.example.md` to `profile/cv.md`, then edit it.
5. If you have public proof points, optionally copy `profile/article-digest.example.md` to `profile/article-digest.md`.
6. Run `npm run doctor`.
7. If you plan to use the repo-owned OpenAI runtime flow, run `npm run auth:openai -- login`.
8. Start `codex` from the repo root.
9. Paste a JD or URL and follow the generated workflow.

For the full setup path, see [Setup Guide](SETUP.md).

For file ownership and required user-layer inputs, see
[Data Contract](DATA_CONTRACT.md).

For profile, targeting, and repo-safe personalization, see
[Customization Guide](CUSTOMIZATION.md).

For command details, see [Scripts Reference](SCRIPTS.md).
