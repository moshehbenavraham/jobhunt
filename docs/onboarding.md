# Onboarding

Use this checklist for a new checkout:

1. Install dependencies.
2. Copy `config/profile.example.yml` to `config/profile.yml`.
3. Copy `config/portals.example.yml` to `config/portals.yml`.
4. Copy `profile/cv.example.md` to `profile/cv.md`, then edit it.
5. If you have public proof points, optionally copy `profile/article-digest.example.md` to `profile/article-digest.md`.
6. Run `npm run doctor`.
7. If you plan to use the repo-owned OpenAI runtime flow, run `npm run auth:openai -- login`.
8. Run `npm run app:validate` to check the app surface and live boot path.
9. Start `npm run app:web:dev` and `npm run app:api:serve` from the repo root.
10. Use the app shell first for missing-file repair, approvals, settings,
    report viewing, pipeline review, tracker workspace, and application-help.
11. Use `codex` only for the legacy CLI workflow if you need it.

If the app reports missing onboarding files, use the onboarding surface to
review the gap list and apply the checked-in repair templates instead of
editing everything manually.

For the full setup path, see [Setup Guide](SETUP.md).

For file ownership and required user-layer inputs, see
[Data Contract](DATA_CONTRACT.md).

For profile, targeting, and repo-safe personalization, see
[Customization Guide](CUSTOMIZATION.md).

For command details, see [Scripts Reference](SCRIPTS.md).
