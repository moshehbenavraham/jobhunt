# Setup Guide

## Prerequisites

- Codex CLI installed and available on your PATH
- Node.js 18 or newer
- Optional: Go 1.21 or newer for the dashboard TUI

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
Chromium, `profile/cv.md`, `config/profile.yml`, and `config/portals.yml`. If it reports an
issue, fix the listed item and rerun the command.

### 5. Start the repo in Codex

```bash
codex
```

From the repo root, paste a JD or URL and follow the workflow from the generated reports.

## Follow-up Verification

Run these after the initial setup path is working:

```bash
npm run sync-check
npm run verify
```

## Optional Dashboard

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..
```
