#!/usr/bin/env bash
set -euo pipefail

# jobhunt batch runner - standalone orchestrator for codex exec workers
# Reads batch-input.tsv, delegates each offer to a codex exec worker,
# tracks state in batch-state.tsv for resumability.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BATCH_DIR="$SCRIPT_DIR"
INPUT_FILE="$BATCH_DIR/batch-input.tsv"
STATE_FILE="$BATCH_DIR/batch-state.tsv"
PROMPT_FILE="$BATCH_DIR/batch-prompt.md"
RESULT_SCHEMA_FILE="$BATCH_DIR/worker-result.schema.json"
LOGS_DIR="$BATCH_DIR/logs"
TRACKER_DIR="$BATCH_DIR/tracker-additions"
REPORTS_DIR="$PROJECT_DIR/reports"
LOCK_FILE="$BATCH_DIR/batch-runner.pid"
STATE_LOCK_DIR="$BATCH_DIR/.batch-state.lock"
STATE_LOCK_PID_FILE="$STATE_LOCK_DIR/pid"
STATE_LOCK_TIMEOUT_SECONDS=30
MAIN_PID="${BASHPID:-$$}"

# Defaults
PARALLEL=1
DRY_RUN=false
RETRY_FAILED=false
START_FROM=0
MAX_RETRIES=2
MIN_SCORE=0

usage() {
  cat << 'USAGE'
jobhunt batch runner - process job offers in batch via codex exec workers
Uses your default Codex CLI configuration.

Usage: batch-runner.sh [OPTIONS]

Options:
  --parallel N         Number of parallel workers (default: 1)
  --dry-run            Show what would be processed, don't execute
  --retry-failed       Only retry retryable infrastructure failures
  --start-from N       Start from offer ID N (skip earlier IDs)
  --max-retries N      Max retry attempts per offer (default: 2)
  --min-score N        Skip PDF/tracker for offers scoring below N (default: 0 = off)
  -h, --help           Show this help

Files:
  batch-input.tsv      Input offers (id, url, source, notes)
  batch-state.tsv      Processing state (auto-managed)
  batch-prompt.md      Prompt template for workers
  logs/                Per-offer logs
  tracker-additions/   Tracker lines for post-batch merge

Examples:
  # Dry run to see pending offers
  ./batch-runner.sh --dry-run

  # Process all pending
  ./batch-runner.sh

  # Retry only failed offers
  ./batch-runner.sh --retry-failed

  # Process 2 at a time starting from ID 10
  ./batch-runner.sh --parallel 2 --start-from 10
USAGE
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --parallel)
      PARALLEL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --retry-failed)
      RETRY_FAILED=true
      shift
      ;;
    --start-from)
      START_FROM="$2"
      shift 2
      ;;
    --max-retries)
      MAX_RETRIES="$2"
      shift 2
      ;;
    --min-score)
      MIN_SCORE="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Lock file to prevent double execution
acquire_lock() {
  if [[ -f "$LOCK_FILE" ]]; then
    local old_pid
    old_pid=$(cat "$LOCK_FILE")
    if kill -0 "$old_pid" 2> /dev/null; then
      echo "ERROR: Another batch-runner is already running (PID $old_pid)"
      echo "If this is stale, remove $LOCK_FILE"
      exit 1
    else
      echo "WARN: Stale lock file found (PID $old_pid not running). Removing."
      rm -f "$LOCK_FILE"
    fi
  fi
  echo "$MAIN_PID" > "$LOCK_FILE"
}

release_lock() {
  if [[ "${BASHPID:-$$}" != "$MAIN_PID" ]]; then
    return
  fi
  rm -f "$LOCK_FILE"
}

trap release_lock EXIT

# Validate prerequisites
check_prerequisites() {
  if [[ ! -f "$INPUT_FILE" ]]; then
    echo "ERROR: $INPUT_FILE not found. Add offers first."
    exit 1
  fi

  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "ERROR: $PROMPT_FILE not found."
    exit 1
  fi

  if [[ ! -f "$RESULT_SCHEMA_FILE" ]]; then
    echo "ERROR: $RESULT_SCHEMA_FILE not found."
    exit 1
  fi

  if ! command -v codex &> /dev/null; then
    echo "ERROR: 'codex' CLI not found in PATH."
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    echo "ERROR: 'jq' is required to validate worker results."
    exit 1
  fi

  if ! jq empty "$RESULT_SCHEMA_FILE" > /dev/null 2>&1; then
    echo "ERROR: $RESULT_SCHEMA_FILE is not valid JSON."
    exit 1
  fi

  mkdir -p "$LOGS_DIR" "$TRACKER_DIR" "$REPORTS_DIR"
}

# Initialize state file if it doesn't exist
init_state() {
  if [[ ! -f "$STATE_FILE" ]]; then
    printf 'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n' > "$STATE_FILE"
  fi
}

acquire_state_lock() {
  local waited=0
  local max_waits=$((STATE_LOCK_TIMEOUT_SECONDS * 10))

  while true; do
    if mkdir "$STATE_LOCK_DIR" 2> /dev/null; then
      if printf '%s\n' "${BASHPID:-$$}" > "$STATE_LOCK_PID_FILE"; then
        return 0
      fi
      rm -f "$STATE_LOCK_PID_FILE" 2> /dev/null || true
      rmdir "$STATE_LOCK_DIR" 2> /dev/null || true
      echo "ERROR: Failed to initialize state lock metadata at $STATE_LOCK_DIR"
      return 1
    fi

    if [[ ! -d "$STATE_LOCK_DIR" ]]; then
      echo "ERROR: Failed to create state lock directory $STATE_LOCK_DIR"
      return 1
    fi

    if [[ -f "$STATE_LOCK_PID_FILE" ]]; then
      local lock_pid
      lock_pid=$(cat "$STATE_LOCK_PID_FILE" 2> /dev/null || true)
      if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2> /dev/null; then
        rm -f "$STATE_LOCK_PID_FILE"
        if rmdir "$STATE_LOCK_DIR" 2> /dev/null; then
          echo "WARN: Recovered stale state lock (PID $lock_pid not running)."
          continue
        fi
      fi
    fi

    if ((waited >= max_waits)); then
      echo "ERROR: Timed out waiting for state lock at $STATE_LOCK_DIR"
      echo "If no batch-runner worker is active, remove the stale lock directory."
      return 1
    fi

    sleep 0.1
    ((waited += 1))
  done
}

release_state_lock() {
  rm -f "$STATE_LOCK_PID_FILE" 2> /dev/null || true
  rmdir "$STATE_LOCK_DIR" 2> /dev/null || true
}

run_with_state_lock() {
  acquire_state_lock || return $?

  local status=0
  if "$@"; then
    status=0
  else
    status=$?
  fi

  release_state_lock
  return "$status"
}

# Get status of an offer from state file
get_status() {
  local id="$1"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "none"
    return
  fi
  local status
  status=$(awk -F'\t' -v id="$id" '$1 == id { print $3 }' "$STATE_FILE")
  echo "${status:-none}"
}

# Get retry count for an offer
get_retries() {
  local id="$1"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "0"
    return
  fi
  local retries
  retries=$(awk -F'\t' -v id="$id" '$1 == id { print $9 }' "$STATE_FILE")
  echo "${retries:-0}"
}

get_error() {
  local id="$1"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "-"
    return
  fi
  local error
  error=$(awk -F'\t' -v id="$id" '$1 == id { print $8 }' "$STATE_FILE")
  echo "${error:--}"
}

# Calculate next report number.
# Caller must hold STATE_LOCK_DIR while this runs.
next_report_num_unlocked() {
  local max_num=0
  if [[ -d "$REPORTS_DIR" ]]; then
    for f in "$REPORTS_DIR"/*.md; do
      [[ -f "$f" ]] || continue
      local basename
      basename=$(basename "$f")
      local num="${basename%%-*}"
      [[ "$num" =~ ^[0-9]+$ ]] || continue
      num=$((10#$num)) # Remove leading zeros for arithmetic
      if ((num > max_num)); then
        max_num=$num
      fi
    done
  fi
  # Also check state file for assigned report numbers
  if [[ -f "$STATE_FILE" ]]; then
    while IFS=$'\t' read -r _ _ _ _ _ rnum _ _ _; do
      [[ "$rnum" == "report_num" || "$rnum" == "-" || -z "$rnum" ]] && continue
      local n=$((10#$rnum))
      if ((n > max_num)); then
        max_num=$n
      fi
    done < "$STATE_FILE"
  fi
  printf '%03d' $((max_num + 1))
}

# Update or insert state for an offer.
# Caller must hold STATE_LOCK_DIR while this runs.
update_state_unlocked() {
  local id="$1" url="$2" status="$3" started="$4" completed="$5" report_num="$6" score="$7" error="$8" retries="$9"

  if [[ ! -f "$STATE_FILE" ]]; then
    init_state
  fi

  local tmp="$STATE_FILE.tmp"
  local found=false

  # Write header
  head -1 "$STATE_FILE" > "$tmp"

  # Process existing lines
  while IFS=$'\t' read -r sid surl sstatus sstarted scompleted sreport sscore serror sretries; do
    [[ "$sid" == "id" ]] && continue # skip header
    if [[ "$sid" == "$id" ]]; then
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$id" "$url" "$status" "$started" "$completed" "$report_num" "$score" "$error" "$retries" >> "$tmp"
      found=true
    else
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$sid" "$surl" "$sstatus" "$sstarted" "$scompleted" "$sreport" "$sscore" "$serror" "$sretries" >> "$tmp"
    fi
  done < "$STATE_FILE"

  if [[ "$found" == "false" ]]; then
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$id" "$url" "$status" "$started" "$completed" "$report_num" "$score" "$error" "$retries" >> "$tmp"
  fi

  mv "$tmp" "$STATE_FILE"
}

update_state() {
  run_with_state_lock update_state_unlocked "$@"
}

reserve_report_num_unlocked() {
  local id="$1" url="$2" started="$3" retries="$4"

  local report_num=""
  if report_num=$(next_report_num_unlocked); then
    update_state_unlocked "$id" "$url" "processing" "$started" "-" "$report_num" "-" "-" "$retries"
  fi

  printf '%s\n' "$report_num"
}

reserve_report_num() {
  run_with_state_lock reserve_report_num_unlocked "$@"
}

escape_sed_replacement() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//|/\\|}"
  printf '%s' "$value"
}

normalize_state_message_text() {
  local value="$1"
  value="${value//$'\r'/ }"
  value="${value//$'\n'/ }"
  value="${value//$'\t'/ }"
  value=$(printf '%s' "$value" | awk '{$1=$1; print}')
  printf '%.200s\n' "$value"
}

structured_result_status() {
  local result_file="$1"
  jq -r '.status' "$result_file"
}

structured_result_score() {
  local result_file="$1"
  jq -r 'if .score == null then "-" else (.score | tostring) end' "$result_file"
}

structured_result_warning_count() {
  local result_file="$1"
  jq -r '(.warnings // []) | length' "$result_file"
}

structured_result_warning_summary() {
  local result_file="$1"
  local summary
  summary=$(jq -r '
    [(.warnings // [])[] | select(type == "string") | gsub("\\s+"; " ")
      | gsub("^ +| +$"; "") | select(length > 0)]
    | unique
    | join("; ")
  ' "$result_file")
  summary=$(normalize_state_message_text "$summary")
  if [[ -z "$summary" ]]; then
    summary="warning details unavailable"
  fi
  printf '%s\n' "$summary"
}

structured_result_error_summary() {
  local result_file="$1"
  local summary
  summary=$(jq -r '.error // ""' "$result_file")
  summary=$(normalize_state_message_text "$summary")
  if [[ -z "$summary" ]]; then
    summary="worker reported failure without an error summary"
  fi
  printf '%s\n' "$summary"
}

classify_structured_result() {
  local result_file="$1"
  local worker_status
  worker_status=$(structured_result_status "$result_file")

  case "$worker_status" in
    completed | partial | failed)
      printf '%s\n' "$worker_status"
      ;;
    *)
      echo "Unknown worker status in result file: $worker_status"
      return 1
      ;;
  esac
}

structured_result_state_summary() {
  local result_file="$1" worker_status="$2"

  case "$worker_status" in
    completed)
      printf '%s\n' "-"
      ;;
    partial)
      printf 'warnings: %s\n' "$(structured_result_warning_summary "$result_file")"
      ;;
    failed)
      printf 'semantic: %s\n' "$(structured_result_error_summary "$result_file")"
      ;;
    *)
      echo "Unhandled structured result status for state summary: $worker_status"
      return 1
      ;;
  esac
}

infrastructure_failure_summary() {
  local exit_code="$1" contract_error="$2" event_log_file="$3"
  local detail=""

  if [[ -n "$contract_error" ]]; then
    detail=$(normalize_state_message_text "$contract_error")
  else
    detail=$(tail -5 "$event_log_file" 2> /dev/null || true)
    detail=$(normalize_state_message_text "$detail")
  fi

  if [[ -z "$detail" ]]; then
    detail="worker exited without a usable result artifact"
  fi

  printf 'infrastructure: exit %s; %s\n' "$exit_code" "$detail"
}

is_retryable_failed_row() {
  local error="$1" retries="$2"

  if [[ ! "$retries" =~ ^[0-9]+$ ]]; then
    retries=0
  fi

  if [[ "$error" == infrastructure:* ]] && ((retries < MAX_RETRIES)); then
    return 0
  fi

  return 1
}

state_summary_bucket() {
  local status="$1" error="$2" retries="$3"

  case "$status" in
    completed)
      printf '%s\n' "completed"
      ;;
    partial)
      printf '%s\n' "partial"
      ;;
    skipped)
      printf '%s\n' "skipped"
      ;;
    failed)
      if is_retryable_failed_row "$error" "$retries"; then
        printf '%s\n' "retryable-failed"
      else
        printf '%s\n' "failed"
      fi
      ;;
    *)
      printf '%s\n' "pending"
      ;;
  esac
}

validate_worker_result_contract() {
  local result_file="$1" expected_id="$2" expected_report_num="$3"

  if [[ ! -s "$result_file" ]]; then
    echo "Missing or empty worker result file: $result_file"
    return 1
  fi

  if ! jq empty "$result_file" > /dev/null 2>&1; then
    echo "Worker result file is not valid JSON: $result_file"
    return 1
  fi

  if ! jq -e \
    --arg expected_id "$expected_id" \
    --arg expected_report_num "$expected_report_num" '
      def nonEmptyString: type == "string" and length > 0;
      def legitimacy:
        . == "High Confidence"
        or . == "Proceed with Caution"
        or . == "Suspicious";
      def reportPath: type == "string" and test("^reports/.+\\.md$");
      def pdfPath: type == "string" and test("^output/.+\\.pdf$");
      def trackerPath:
        type == "string" and test("^batch/tracker-additions/.+\\.tsv$");
      def warningArray:
        type == "array"
        and all(.[]; nonEmptyString)
        and ((unique | length) == length);
      def emptyWarnings:
        warningArray and length == 0;
      def nonEmptyWarnings:
        warningArray and length > 0;
      def hasRequiredFields:
        has("status")
        and has("id")
        and has("report_num")
        and has("company")
        and has("role")
        and has("score")
        and has("legitimacy")
        and has("pdf")
        and has("report")
        and has("tracker")
        and has("warnings")
        and has("error");
      def onlyExpectedFields:
        (keys | sort)
        == [
          "company",
          "error",
          "id",
          "legitimacy",
          "pdf",
          "report",
          "report_num",
          "role",
          "score",
          "status",
          "tracker",
          "warnings"
        ];
      hasRequiredFields
      and onlyExpectedFields
      and (.id == $expected_id)
      and (.report_num == $expected_report_num)
      and (.company | nonEmptyString)
      and (.role | nonEmptyString)
      and (
        (
          .status == "completed"
          and (.score | type) == "number"
          and (.legitimacy | legitimacy)
          and (.pdf | pdfPath)
          and (.report | reportPath)
          and (.tracker | trackerPath)
          and (.warnings | emptyWarnings)
          and .error == null
        )
        or (
          .status == "partial"
          and (.score | type) == "number"
          and (.legitimacy | legitimacy)
          and ((.pdf == null) or (.pdf | pdfPath))
          and (.report | reportPath)
          and ((.tracker == null) or (.tracker | trackerPath))
          and (.warnings | nonEmptyWarnings)
          and (.pdf == null or .tracker == null)
          and .error == null
        )
        or (
          .status == "failed"
          and .score == null
          and .legitimacy == null
          and .pdf == null
          and ((.report == null) or (.report | reportPath))
          and .tracker == null
          and (.warnings | emptyWarnings)
          and (.error | nonEmptyString)
        )
      )
    ' "$result_file" > /dev/null 2>&1; then
    echo "Worker result file failed contract validation: $result_file"
    return 1
  fi
}

# Process a single offer
process_offer() {
  local id="$1" url="$2" source="$3" notes="$4"

  local started_at
  started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local retries
  retries=$(get_retries "$id")
  local report_num
  report_num=$(reserve_report_num "$id" "$url" "$started_at" "$retries")
  local date
  date=$(date +%Y-%m-%d)
  local jd_file="/tmp/batch-jd-${id}.txt"
  local result_file="$LOGS_DIR/${report_num}-${id}.result.json"
  local last_message_file="$LOGS_DIR/${report_num}-${id}.last-message.json"
  local event_log_file="$LOGS_DIR/${report_num}-${id}.log"
  local resolved_prompt
  resolved_prompt=$(mktemp "$BATCH_DIR/.resolved-prompt-${id}-${report_num}-XXXXXX.md")

  echo "--- Processing offer #$id: $url (report $report_num, attempt $((retries + 1)))"

  rm -f "$result_file" "$last_message_file" "$event_log_file"

  # Prepare system prompt with placeholders resolved
  # Escape sed delimiter characters in variables to prevent substitution breakage
  local esc_url esc_jd_file esc_report_num esc_date esc_id esc_result_file
  esc_url="$(escape_sed_replacement "$url")"
  esc_jd_file="$(escape_sed_replacement "$jd_file")"
  esc_report_num="$(escape_sed_replacement "$report_num")"
  esc_date="$(escape_sed_replacement "$date")"
  esc_id="$(escape_sed_replacement "$id")"
  esc_result_file="$(escape_sed_replacement "$result_file")"
  sed \
    -e "s|{{URL}}|${esc_url}|g" \
    -e "s|{{JD_FILE}}|${esc_jd_file}|g" \
    -e "s|{{REPORT_NUM}}|${esc_report_num}|g" \
    -e "s|{{DATE}}|${esc_date}|g" \
    -e "s|{{ID}}|${esc_id}|g" \
    -e "s|{{RESULT_FILE}}|${esc_result_file}|g" \
    "$PROMPT_FILE" > "$resolved_prompt"

  # Launch codex exec worker from the repo root with an explicit result contract.
  local exit_code=0
  codex exec \
    -C "$PROJECT_DIR" \
    --dangerously-bypass-approvals-and-sandbox \
    --output-schema "$RESULT_SCHEMA_FILE" \
    --output-last-message "$last_message_file" \
    --json \
    - < "$resolved_prompt" > "$event_log_file" 2>&1 || exit_code=$?

  # Cleanup resolved prompt
  rm -f "$resolved_prompt"

  local completed_at
  completed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  if [[ $exit_code -eq 0 ]]; then
    local contract_error=""
    if ! contract_error=$(validate_worker_result_contract "$result_file" "$id" "$report_num"); then
      exit_code=1
    fi
  fi

  if [[ $exit_code -eq 0 ]]; then
    local worker_status
    if ! worker_status=$(classify_structured_result "$result_file"); then
      contract_error="$worker_status"
      exit_code=1
    fi
  fi

  if [[ $exit_code -eq 0 ]]; then
    local score="-"
    score=$(structured_result_score "$result_file")

    # Check min-score gate
    if [[ "$score" != "-" && -n "$score" ]] && (($(echo "$MIN_SCORE > 0" | bc -l))); then
      if (($(echo "$score < $MIN_SCORE" | bc -l))); then
        update_state "$id" "$url" "skipped" "$started_at" "$completed_at" "$report_num" "$score" "below-min-score" "$retries"
        echo "    Skipped (score: $score < min-score: $MIN_SCORE)"
        return
      fi
    fi

    local final_status
    final_status="$worker_status"
    local state_error
    state_error=$(structured_result_state_summary "$result_file" "$worker_status")

    update_state "$id" "$url" "$final_status" "$started_at" "$completed_at" "$report_num" "$score" "$state_error" "$retries"

    case "$final_status" in
      completed)
        echo "    Completed (worker status: $worker_status, score: $score, report: $report_num)"
        ;;
      partial)
        local warning_count
        warning_count=$(structured_result_warning_count "$result_file")
        echo "    Partial (worker status: $worker_status, score: $score, report: $report_num, warnings: $warning_count)"
        ;;
      failed)
        echo "    Failed (worker status: $worker_status, report: $report_num)"
        ;;
      *)
        echo "    ERROR: Unhandled final state $final_status"
        return 1
        ;;
    esac
  else
    retries=$((retries + 1))
    local error_msg
    error_msg=$(infrastructure_failure_summary "$exit_code" "${contract_error:-}" "$event_log_file")
    update_state "$id" "$url" "failed" "$started_at" "$completed_at" "$report_num" "-" "$error_msg" "$retries"
    if is_retryable_failed_row "$error_msg" "$retries"; then
      echo "    Failed (retryable infrastructure failure, attempt $retries, exit code $exit_code)"
    else
      echo "    Failed (terminal infrastructure failure, attempt $retries, exit code $exit_code)"
    fi
  fi
}

# Merge tracker additions into applications.md
merge_tracker() {
  echo ""
  echo "=== Merging tracker additions ==="
  node "$PROJECT_DIR/scripts/merge-tracker.mjs"
  echo ""
  echo "=== Verifying pipeline integrity ==="
  node "$PROJECT_DIR/scripts/verify-pipeline.mjs" || echo "Warning: Verification found issues (see above)"
}

# Print summary
print_summary() {
  echo ""
  echo "=== Batch Summary ==="

  if [[ ! -f "$STATE_FILE" ]]; then
    echo "No state file found."
    return
  fi

  local total=0 completed=0 partial=0 failed=0 retryable_failed=0 skipped=0 pending=0
  local score_sum=0 score_count=0

  while IFS=$'\t' read -r sid _ sstatus _ _ _ sscore serror sretries; do
    [[ "$sid" == "id" ]] && continue
    total=$((total + 1))

    case "$(state_summary_bucket "$sstatus" "$serror" "$sretries")" in
      completed)
        completed=$((completed + 1))
        ;;
      partial)
        partial=$((partial + 1))
        ;;
      failed)
        failed=$((failed + 1))
        ;;
      retryable-failed)
        retryable_failed=$((retryable_failed + 1))
        ;;
      skipped)
        skipped=$((skipped + 1))
        ;;
      *)
        pending=$((pending + 1))
        ;;
    esac

    if [[ "$sscore" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
      score_sum=$(echo "$score_sum + $sscore" | bc 2> /dev/null || echo "$score_sum")
      score_count=$((score_count + 1))
    fi
  done < "$STATE_FILE"

  echo "Total: $total | Completed: $completed | Partial: $partial | Failed: $failed | Retryable Failed: $retryable_failed | Skipped: $skipped | Pending: $pending"

  if ((score_count > 0)); then
    local avg
    avg=$(echo "scale=1; $score_sum / $score_count" | bc 2> /dev/null || echo "N/A")
    echo "Average score: $avg/5 ($score_count scored)"
  fi
}

# Main
main() {
  check_prerequisites

  if [[ "$DRY_RUN" == "false" ]]; then
    acquire_lock
  fi

  init_state

  # Count input offers (skip header, ignore blank lines)
  local total_input
  total_input=$(tail -n +2 "$INPUT_FILE" | grep -c '[^[:space:]]' 2> /dev/null || true)
  total_input="${total_input:-0}"

  if ((total_input == 0)); then
    echo "No offers in $INPUT_FILE. Add offers first."
    exit 0
  fi

  echo "=== jobhunt batch runner ==="
  echo "Parallel: $PARALLEL | Max retries: $MAX_RETRIES"
  echo "Input: $total_input offers"
  echo ""

  # Build list of offers to process
  local -a pending_ids=()
  local -a pending_urls=()
  local -a pending_sources=()
  local -a pending_notes=()

  while IFS=$'\t' read -r id url source notes; do
    [[ "$id" == "id" ]] && continue # skip header
    [[ -z "$id" || -z "$url" ]] && continue

    # Guard against non-numeric id values
    [[ "$id" =~ ^[0-9]+$ ]] || continue

    # Skip if before start-from
    if ((id < START_FROM)); then
      continue
    fi

    local status
    status=$(get_status "$id")
    local retries
    retries=$(get_retries "$id")
    local error
    error=$(get_error "$id")

    if [[ "$RETRY_FAILED" == "true" ]]; then
      if [[ "$status" != "failed" ]]; then
        continue
      fi
      if ! is_retryable_failed_row "$error" "$retries"; then
        continue
      fi
    else
      if [[ "$status" == "completed" || "$status" == "partial" || "$status" == "skipped" ]]; then
        continue
      fi
      if [[ "$status" == "failed" ]]; then
        if ! is_retryable_failed_row "$error" "$retries"; then
          if [[ "$error" == infrastructure:* ]]; then
            echo "SKIP #$id: infrastructure failure exhausted max retries"
          else
            echo "SKIP #$id: semantic failure is terminal"
          fi
          continue
        fi
      fi
    fi

    pending_ids+=("$id")
    pending_urls+=("$url")
    pending_sources+=("$source")
    pending_notes+=("$notes")
  done < "$INPUT_FILE"

  local pending_count=${#pending_ids[@]}

  if ((pending_count == 0)); then
    echo "No offers to process."
    print_summary
    exit 0
  fi

  echo "Pending: $pending_count offers"
  echo ""

  # Dry run: just list
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "=== DRY RUN (no processing) ==="
    for i in "${!pending_ids[@]}"; do
      local status
      status=$(get_status "${pending_ids[$i]}")
      echo "  #${pending_ids[$i]}: ${pending_urls[$i]} [${pending_sources[$i]}] (status: $status)"
    done
    echo ""
    echo "Would process $pending_count offers"
    exit 0
  fi

  # Process offers
  if ((PARALLEL <= 1)); then
    # Sequential processing
    for i in "${!pending_ids[@]}"; do
      process_offer "${pending_ids[$i]}" "${pending_urls[$i]}" "${pending_sources[$i]}" "${pending_notes[$i]}"
    done
  else
    # Parallel processing with job control
    local running=0
    local -a pids=()
    local -a pid_ids=()

    for i in "${!pending_ids[@]}"; do
      # Wait if we're at parallel limit
      while ((running >= PARALLEL)); do
        # Wait for any child to finish
        for j in "${!pids[@]}"; do
          if ! kill -0 "${pids[$j]}" 2> /dev/null; then
            wait "${pids[$j]}" 2> /dev/null || true
            unset 'pids[j]'
            unset 'pid_ids[j]'
            running=$((running - 1))
          fi
        done
        # Compact arrays
        pids=("${pids[@]}")
        pid_ids=("${pid_ids[@]}")
        sleep 1
      done

      # Launch worker in background
      process_offer "${pending_ids[$i]}" "${pending_urls[$i]}" "${pending_sources[$i]}" "${pending_notes[$i]}" &
      pids+=($!)
      pid_ids+=("${pending_ids[$i]}")
      running=$((running + 1))
    done

    # Wait for remaining workers
    for pid in "${pids[@]}"; do
      wait "$pid" 2> /dev/null || true
    done
  fi

  # Merge tracker additions
  merge_tracker

  # Print summary
  print_summary
}

main "$@"
