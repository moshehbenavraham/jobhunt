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
    -C|--cd)
      cd_dir="$2"
      shift 2
      ;;
    --output-schema)
      output_schema="$2"
      shift 2
      ;;
    -o|--output-last-message)
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
fi

if [[ "$json_mode" == "true" ]]; then
  printf '{"type":"session.completed","exit_code":%s}\n' "$exit_code"
fi

exit "$exit_code"
