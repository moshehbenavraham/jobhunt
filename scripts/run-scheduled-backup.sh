#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/tmp/cron"
LOG_FILE="$LOG_DIR/backup.log"

export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

mkdir -p "$LOG_DIR"

{
  echo
  echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z %z') :: jobhunt scheduled backup ==="
  cd "$PROJECT_ROOT"
  npm run backup:run -- --verify
} >> "$LOG_FILE" 2>&1
