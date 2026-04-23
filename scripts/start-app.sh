#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

API_HOST="${JOBHUNT_API_HOST:-127.0.0.1}"
API_PUBLIC_HOST="${JOBHUNT_API_PUBLIC_HOST:-127.0.0.1}"
API_PORT="${JOBHUNT_API_PORT:-5172}"
WEB_HOST="${JOBHUNT_WEB_HOST:-0.0.0.0}"
WEB_PUBLIC_HOST="${JOBHUNT_WEB_PUBLIC_HOST:-127.0.0.1}"
WEB_PORT="${JOBHUNT_WEB_PORT:-4175}"
API_ORIGIN="${JOBHUNT_API_ORIGIN:-http://${API_PUBLIC_HOST}:${API_PORT}}"
HEALTH_ATTEMPTS="${JOBHUNT_HEALTH_ATTEMPTS:-80}"
HEALTH_INTERVAL_SECONDS="${JOBHUNT_HEALTH_INTERVAL_SECONDS:-0.5}"
NETWORK_LINK_LIMIT="${JOBHUNT_NETWORK_LINK_LIMIT:-5}"
RUNTIME_DIR="${JOBHUNT_APP_RUNTIME_DIR:-$PROJECT_ROOT/tmp/app}"
HEALTH_DIR="$RUNTIME_DIR/health"

API_LOG_FILE="$RUNTIME_DIR/jobhunt-api.log"
WEB_LOG_FILE="$RUNTIME_DIR/jobhunt-web.log"
API_PID_FILE="$RUNTIME_DIR/jobhunt-api.pid"
WEB_PID_FILE="$RUNTIME_DIR/jobhunt-web.pid"

if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  GREEN="$(printf '\033[32m')"
  CYAN="$(printf '\033[36m')"
  BLUE="$(printf '\033[34m')"
  MAGENTA="$(printf '\033[35m')"
  YELLOW="$(printf '\033[33m')"
  RED="$(printf '\033[31m')"
  RESET="$(printf '\033[0m')"
else
  BOLD=""
  DIM=""
  GREEN=""
  CYAN=""
  BLUE=""
  MAGENTA=""
  YELLOW=""
  RED=""
  RESET=""
fi

banner() {
  printf '%s' "$CYAN"
  cat << 'ART'

        /\        /\        /\        /\
       /  \      /  \      /  \      /  \
      /____\____/____\____/____\____/____\
      \    /    \    /    \    /    \    /
       \  /      \  /      \  /      \  /
        \/        \/        \/        \/

       _       ____  ____  _   _ _   _ _   _ _____
      | | ___ | __ )|  _ \| | | | | | | \ | |_   _|
   _  | |/ _ \|  _ \| |_) | |_| | | | |  \| | | |
  | |_| | (_) | |_) |  __/|  _  | |_| | |\  | | |
   \___/ \___/|____/|_|   |_| |_|\___/|_| \_| |_|

ART
  printf '%s' "$RESET"
  printf '%s%sLocal launch control: clear the deck, light the path.%s\n\n' "$BOLD" "$MAGENTA" "$RESET"
}

section() {
  printf '\n%s%s==>%s %s\n' "$BOLD" "$BLUE" "$RESET" "$1"
}

pass() {
  printf '%s[ok]%s %s\n' "$GREEN" "$RESET" "$1"
}

warn() {
  printf '%s[warn]%s %s\n' "$YELLOW" "$RESET" "$1"
}

fail_line() {
  printf '%s[fail]%s %s\n' "$RED" "$RESET" "$1" >&2
}

die() {
  fail_line "$1"
  exit 1
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" > /dev/null 2>&1; then
    die "Missing required command: $command_name"
  fi
}

ensure_port_tool() {
  if command -v ss > /dev/null 2>&1; then
    return 0
  fi

  if command -v lsof > /dev/null 2>&1; then
    return 0
  fi

  if command -v fuser > /dev/null 2>&1; then
    return 0
  fi

  die "Need ss, lsof, or fuser to clear app ports."
}

port_pids() {
  local port="$1"

  if command -v ss > /dev/null 2>&1; then
    ss -ltnp 2> /dev/null |
      awk -v port="$port" '{ part_count = split($4, parts, ":"); if (parts[part_count] == port) print $0 }' |
      grep -Eo 'pid=[0-9]+' |
      cut -d= -f2 |
      sort -u || true
    return 0
  fi

  if command -v lsof > /dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2> /dev/null | sort -u || true
    return 0
  fi

  fuser -n tcp "$port" 2> /dev/null |
    tr ' ' '\n' |
    awk 'NF > 0' |
    sort -u || true
}

clear_port() {
  local label="$1"
  local port="$2"
  local pids=()
  local alive=()
  local pid

  mapfile -t pids < <(port_pids "$port")

  if [ "${#pids[@]}" -eq 0 ]; then
    pass "$label port $port is clear."
    return 0
  fi

  warn "Clearing $label port $port from PID(s): ${pids[*]}"
  kill -TERM "${pids[@]}" 2> /dev/null || true

  for _ in $(seq 1 20); do
    alive=()
    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2> /dev/null; then
        alive+=("$pid")
      fi
    done

    if [ "${#alive[@]}" -eq 0 ]; then
      pass "$label port $port released."
      return 0
    fi

    sleep 0.25
  done

  warn "Force clearing $label port $port from PID(s): ${alive[*]}"
  kill -KILL "${alive[@]}" 2> /dev/null || true
  sleep 0.25

  mapfile -t pids < <(port_pids "$port")
  if [ "${#pids[@]}" -ne 0 ]; then
    die "$label port $port is still occupied by PID(s): ${pids[*]}"
  fi

  pass "$label port $port released."
}

tail_log() {
  local label="$1"
  local log_file="$2"

  printf '\n%sLast %s log lines:%s\n' "$DIM" "$label" "$RESET" >&2
  if [ -f "$log_file" ]; then
    tail -n 30 "$log_file" >&2
  else
    printf 'No log file found at %s\n' "$log_file" >&2
  fi
}

start_service() {
  local label="$1"
  local pid_file="$2"
  local log_file="$3"
  local launcher_pid
  shift 3

  : > "$log_file"

  if command -v setsid > /dev/null 2>&1; then
    # shellcheck disable=SC2016
    setsid bash -c 'cd "$1" || exit 1; shift; exec "$@"' _ "$PROJECT_ROOT" "$@" \
      >> "$log_file" 2>&1 < /dev/null &
  else
    # shellcheck disable=SC2016
    nohup bash -c 'cd "$1" || exit 1; shift; exec "$@"' _ "$PROJECT_ROOT" "$@" \
      >> "$log_file" 2>&1 < /dev/null &
  fi

  launcher_pid="$!"
  printf '%s\n' "$launcher_pid" > "$pid_file"
  sleep 0.2

  if ! kill -0 "$launcher_pid" 2> /dev/null; then
    tail_log "$label" "$log_file"
    die "$label exited during startup."
  fi

  pass "$label launched as PID $launcher_pid."
}

validate_api_health() {
  node - "$1" << 'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

if (payload.ok !== true || payload.status !== 'ok') {
  process.exit(1);
}

const startupStatus = payload.startupStatus ?? 'unknown';
const agentStatus = payload.agentRuntime?.status ?? 'unknown';
console.log(`${payload.service ?? 'api'}: startup=${startupStatus}, agent=${agentStatus}`);
NODE
}

validate_startup_proxy() {
  node - "$1" << 'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

if (!payload || typeof payload !== 'object' || !payload.service) {
  process.exit(1);
}

console.log(`${payload.service}: ${payload.status ?? payload.startupStatus ?? 'reachable'}`);
NODE
}

validate_web_html() {
  grep -qi '<div id="root"' "$1"
}

wait_for_check() {
  local label="$1"
  local url="$2"
  local output_file="$3"
  local pid_file="$4"
  local log_file="$5"
  local checker="$6"
  local pid
  local summary

  for _ in $(seq 1 "$HEALTH_ATTEMPTS"); do
    if curl -fsS --max-time 2 "$url" > "$output_file" 2> "$output_file.err"; then
      if summary="$("$checker" "$output_file" 2> /dev/null)"; then
        if [ -n "$summary" ]; then
          pass "$label healthy: $summary"
        else
          pass "$label healthy."
        fi
        return 0
      fi
    fi

    pid="$(cat "$pid_file" 2> /dev/null || true)"
    if [ -n "$pid" ] && ! kill -0 "$pid" 2> /dev/null; then
      tail_log "$label" "$log_file"
      die "$label process exited before becoming healthy."
    fi

    sleep "$HEALTH_INTERVAL_SECONDS"
  done

  tail_log "$label" "$log_file"
  die "$label did not become healthy at $url"
}

network_urls() {
  if [ "$WEB_HOST" != "0.0.0.0" ]; then
    return 0
  fi

  hostname -I 2> /dev/null |
    tr ' ' '\n' |
    awk -v port="$WEB_PORT" -v limit="$NETWORK_LINK_LIMIT" '
      NF > 0 && $0 !~ /^127\./ && $0 !~ /:/ {
        if (limit != 0 && count >= limit) {
          next
        }
        printf "http://%s:%s/\n", $0, port
        count++
      }
    '
}

print_links() {
  local local_web_url="http://${WEB_PUBLIC_HOST}:${WEB_PORT}/"
  local api_health_url="${API_ORIGIN}/health"
  local startup_proxy_url="${local_web_url}api/startup"
  local network_url

  printf '\n%s' "$GREEN"
  cat << 'ART'
        __        __   _                            _ _            
        \ \      / /__| | ___ ___  _ __ ___   ___  | (_) ___  ___ 
         \ \ /\ / / _ \ |/ __/ _ \| '_ ` _ \ / _ \ | | |/ _ \/ __|
          \ V  V /  __/ | (_| (_) | | | | | |  __/ | | |  __/\__ \
           \_/\_/ \___|_|\___\___/|_| |_| |_|\___| |_|_|\___||___/
ART
  printf '%s\n' "$RESET"

  printf '%sLinks%s\n' "$BOLD" "$RESET"
  printf '  Web shell:     %s%s%s\n' "$CYAN" "$local_web_url" "$RESET"
  printf '  API health:    %s%s%s\n' "$CYAN" "$api_health_url" "$RESET"
  printf '  Startup proxy: %s%s%s\n' "$CYAN" "$startup_proxy_url" "$RESET"

  while IFS= read -r network_url; do
    [ -n "$network_url" ] || continue
    printf '  Network:       %s%s%s\n' "$CYAN" "$network_url" "$RESET"
  done < <(network_urls)

  printf '\n%sRuntime%s\n' "$BOLD" "$RESET"
  printf '  API PID: %s  log: %s\n' "$(cat "$API_PID_FILE")" "$API_LOG_FILE"
  printf '  Web PID: %s  log: %s\n' "$(cat "$WEB_PID_FILE")" "$WEB_LOG_FILE"
}

main() {
  banner
  require_command npm
  require_command node
  require_command curl
  ensure_port_tool

  if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    die "node_modules is missing. Run npm ci before starting the app."
  fi

  mkdir -p "$RUNTIME_DIR" "$HEALTH_DIR"

  section "Clearing launch ports"
  clear_port "API" "$API_PORT"
  clear_port "Web" "$WEB_PORT"

  section "Starting services"
  start_service "API" "$API_PID_FILE" "$API_LOG_FILE" \
    env \
    JOBHUNT_API_REPO_ROOT="$PROJECT_ROOT" \
    JOBHUNT_API_HOST="$API_HOST" \
    JOBHUNT_API_PORT="$API_PORT" \
    npm run app:api:serve

  wait_for_check \
    "API" \
    "${API_ORIGIN}/health" \
    "$HEALTH_DIR/api-health.json" \
    "$API_PID_FILE" \
    "$API_LOG_FILE" \
    validate_api_health

  start_service "Web" "$WEB_PID_FILE" "$WEB_LOG_FILE" \
    env \
    JOBHUNT_API_ORIGIN="$API_ORIGIN" \
    npm run dev --workspace @jobhunt/web -- --host "$WEB_HOST" --port "$WEB_PORT"

  wait_for_check \
    "Web" \
    "http://${WEB_PUBLIC_HOST}:${WEB_PORT}/" \
    "$HEALTH_DIR/web.html" \
    "$WEB_PID_FILE" \
    "$WEB_LOG_FILE" \
    validate_web_html

  wait_for_check \
    "Startup proxy" \
    "http://${WEB_PUBLIC_HOST}:${WEB_PORT}/api/startup" \
    "$HEALTH_DIR/startup-proxy.json" \
    "$WEB_PID_FILE" \
    "$WEB_LOG_FILE" \
    validate_startup_proxy

  print_links
}

main "$@"
