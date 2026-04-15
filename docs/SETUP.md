# Setup Guide

## Prerequisites

- Codex CLI installed and available on your PATH
- Node.js 18 or newer
- Optional: Go 1.21 or newer for the dashboard TUI

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/santifer/career-ops.git
cd career-ops
npm install
npx playwright install chromium
```

### 2. Configure your profile and portals

```bash
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
```

Fill in:

- your name and contact details
- target roles
- salary target
- portals you want scanned

### 3. Add your CV

Create `cv.md` in the project root. If you have public proof points, add `article-digest.md` too.

### 4. Validate the setup

```bash
npm run doctor
```

`npm run doctor` validates Node.js, installed dependencies, Playwright
Chromium, `cv.md`, `config/profile.yml`, and `portals.yml`. If it reports an
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
