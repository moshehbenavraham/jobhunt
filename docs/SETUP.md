# Setup Guide

## Prerequisites

- Node.js 18 or newer
- Optional: Codex CLI for the legacy CLI workflow
- Optional: Go 1.21 or newer for the secondary dashboard TUI

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/moshehbenavraham/jobhunt.git
cd jobhunt
npm install
npx playwright install chromium
```

### 2. Configure your profile and portals

```bash
cp config/profile.example.yml config/profile.yml
cp config/portals.example.yml config/portals.yml
```

Fill in:

- your name and contact details
- target roles
- salary target
- portals you want scanned

### 3. Add your CV

```bash
cp profile/cv.example.md profile/cv.md
```

Then edit `profile/cv.md` with your experience.

If you have public proof points, optionally bootstrap a proof-point file:

```bash
cp profile/article-digest.example.md profile/article-digest.md
```

You only need `profile/article-digest.md` when you have public metrics or case
studies you want reused across evaluations.

### 4. Validate the setup

```bash
npm run doctor
```

`npm run doctor` validates Node.js, installed dependencies, Playwright
Chromium, `profile/cv.md`, `config/profile.yml`, and `config/portals.yml`.
It also reports whether the repo already has stored OpenAI account auth and
which auth command to run next. If it reports an issue, fix the listed item and
rerun the command.

### 5. Log in with your OpenAI account

Jobhunt's repo-owned OpenAI runtime path uses stored OpenAI account auth. The
project does not use `OPENAI_API_KEY` for normal onboarding or smoke tests.

```bash
npm run auth:openai -- login
```

Useful follow-ups:

```bash
npm run auth:openai -- status
npm run auth:openai -- refresh
npm run auth:openai -- reauth
npm run auth:openai -- logout
```

If you want a direct repo-owned runtime check after login, run:

```bash
npm run agents:codex:smoke -- --json
```

### 6. Start the app surface

```bash
npm run app:validate
```

The app surface gives you the primary local operator runtime:

- `npm run app:web:dev` for the React shell
- `npm run app:api:serve` for the long-lived API server
- `npm run app:boot:test` for the live repo-root smoke test

The shell now includes the operator home landing, onboarding repair, approval
review, and settings surfaces on top of startup diagnostics, so
`npm run app:validate` is the preferred first runtime check after setup.

From the repo root, the legacy `codex` workflow still works for CLI-based
job-search operations, and the dashboard still exists as a secondary review
path, but the app surface is now the preferred boot path for the local runtime
contract.

## Follow-up Verification

Run these after the initial setup path is working:

```bash
npm run sync-check
npm run verify
npm run app:boot:test
npm run app:validate
npm run auth:openai -- status
```

## Optional Secondary Dashboard

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..
```
