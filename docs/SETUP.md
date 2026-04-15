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

### 2. Validate the environment

```bash
npm run doctor
```

### 3. Configure your profile

```bash
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
```

Fill in:

- your name and contact details
- target roles
- salary target
- portals you want scanned

### 4. Add your CV

Create `cv.md` in the project root. If you have public proof points, add `article-digest.md` too.

### 5. Start the repo in Codex

```bash
codex
```

From the repo root, paste a JD or URL and follow the workflow from the generated reports.

## Verify Setup

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
