#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/dashboard"
BINARY_PATH="$DASHBOARD_DIR/career-dashboard"

if ! command -v go > /dev/null 2>&1; then
  echo "Error: Go is not installed or not on PATH." >&2
  echo "Install Go, then run ./scripts/ux.sh again." >&2
  exit 1
fi

if [ ! -d "$DASHBOARD_DIR" ]; then
  echo "Error: dashboard directory not found at $DASHBOARD_DIR" >&2
  exit 1
fi

(
  cd "$DASHBOARD_DIR"
  go build -o "$BINARY_PATH" .
)

has_path_flag=0
for arg in "$@"; do
  case "$arg" in
    --path | --path=*)
      has_path_flag=1
      ;;
  esac
done

if [ "$has_path_flag" -eq 1 ]; then
  exec "$BINARY_PATH" "$@"
fi

exec "$BINARY_PATH" --path "$PROJECT_ROOT" "$@"
