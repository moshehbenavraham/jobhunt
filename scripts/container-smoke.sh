#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "Container smoke: setup doctor"
npm run doctor

echo "Container smoke: deterministic scan fixtures"
node scripts/test-scan.mjs

echo "Container smoke: browser-backed PDF contract"
node scripts/test-pdf-pipeline.mjs

echo "Container smoke passed"
