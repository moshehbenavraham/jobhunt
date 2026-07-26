#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "exec" ]]; then
  echo "mock-codex-exec: expected 'exec' subcommand" >&2
  exit 64
fi
shift

invocation_file="${MOCK_CODEX_INVOCATION_FILE:-}"
fixture_file="${MOCK_CODEX_FIXTURE:-}"
exit_code="${MOCK_CODEX_EXIT_CODE:-0}"
write_result="${MOCK_CODEX_WRITE_RESULT:-true}"

cd_dir=""
output_schema=""
last_message_file=""
json_mode=false
prompt_source=""
raw_args=("$@")

while [[ $# -gt 0 ]]; do
  case "$1" in
    -C | --cd)
      cd_dir="$2"
      shift 2
      ;;
    --output-schema)
      output_schema="$2"
      shift 2
      ;;
    -c | --config)
      shift 2
      ;;
    -o | --output-last-message)
      last_message_file="$2"
      shift 2
      ;;
    --json)
      json_mode=true
      shift
      ;;
    --dangerously-bypass-approvals-and-sandbox)
      shift
      ;;
    --)
      shift
      break
      ;;
    -)
      prompt_source="-"
      shift
      break
      ;;
    -*)
      shift
      ;;
    *)
      prompt_source="$1"
      shift
      break
      ;;
  esac
done

if [[ "$prompt_source" == "-" || -p /dev/stdin ]]; then
  prompt_text="$(cat)"
else
  prompt_text="$prompt_source"
fi

result_file="$(printf '%s\n' "$prompt_text" | sed -n 's/^RESULT_FILE:[[:space:]]*//p' | head -1)"

if [[ -n "$invocation_file" ]]; then
  args_json='[]'
  for arg in "${raw_args[@]}"; do
    args_json="$(jq -cn --argjson current "$args_json" --arg value "$arg" '$current + [$value]')"
  done
  jq -n \
    --arg cwd "$cd_dir" \
    --arg schema "$output_schema" \
    --arg last_message "$last_message_file" \
    --arg prompt "$prompt_text" \
    --arg result_file "$result_file" \
    --arg pwd "$(pwd)" \
    --argjson args "$args_json" \
    --argjson json_mode "$json_mode" \
    '{
      cwd: $cwd,
      schema: $schema,
      lastMessage: $last_message,
      prompt: $prompt,
      resultFile: $result_file,
      pwd: $pwd,
      json: $json_mode,
      args: $args
    }' > "$invocation_file"
fi

if [[ "$json_mode" == "true" ]]; then
  printf '{"type":"session.started","cwd":"%s"}\n' "${cd_dir:-$(pwd)}"
fi

if [[ -n "$fixture_file" && "$write_result" == "true" ]]; then
  if [[ -n "$result_file" ]]; then
    cp "$fixture_file" "$result_file"
  fi
  if [[ -n "$last_message_file" ]]; then
    cp "$fixture_file" "$last_message_file"
  fi
  pdf_path="$(jq -r '.pdf // empty' "$fixture_file")"
  if [[ -n "$pdf_path" ]]; then
    mkdir -p "$(dirname "$pdf_path")"
    printf '%%PDF-1.7\nfixture\n' > "$pdf_path"
    printf '{"validation":{"valid":true}}\n' > "${pdf_path%.pdf}.manifest.json"
  fi
  report_path="$(jq -r '.report // empty' "$fixture_file")"
  if [[ -n "$report_path" ]]; then
    mkdir -p "$(dirname "$report_path")"
    printf '# Fixture report\n' > "$report_path"
  fi
  tracker_path="$(jq -r '.tracker // empty' "$fixture_file")"
  if [[ -n "$tracker_path" ]]; then
    mkdir -p "$(dirname "$tracker_path")"
    printf '1\t2026-04-15\tExample AI\tSenior AI Engineer\tEvaluated\t4.6/5\tYes\treport\tfixture\n' > "$tracker_path"
  fi
fi

if [[ "$json_mode" == "true" ]]; then
  printf '{"type":"session.completed","exit_code":%s}\n' "$exit_code"
fi

exit "$exit_code"
