#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/tmp/cron"
LOG_FILE="$LOG_DIR/scan.log"

export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

mkdir -p "$LOG_DIR"

{
  echo
  echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z %z') :: jobhunt scheduled scan ==="
  cd "$PROJECT_ROOT"
  npm run scan
} >> "$LOG_FILE" 2>&1
