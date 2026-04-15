# Batch Processing

Process multiple job offers through repo-owned orchestration and `codex exec`
workers. The runner keeps the existing input TSV, report numbering, tracker
merge flow, and resumable state file; only the worker runtime and result
contract changed.

For the high-level system view, see [Architecture](../docs/ARCHITECTURE.md).

## Quick Start

1. Add offers to `batch/batch-input.tsv`:

   ```tsv
   id	url	source	notes
   1	https://jobs.example.com/role-a	LinkedIn
   2	https://boards.greenhouse.io/company/role-b	Greenhouse	priority
   ```

2. Preview the pending work:

   ```bash
   ./batch/batch-runner.sh --dry-run
   ```

3. Run the batch:

   ```bash
   ./batch/batch-runner.sh
   ```

4. If the run reports retryable infrastructure failures, retry only those
   rows:

   ```bash
   ./batch/batch-runner.sh --retry-failed
   ```

5. Re-run the closeout scripts manually if you need to inspect or recover the
   batch after editing tracker additions:

   ```bash
   node scripts/merge-tracker.mjs
   node scripts/verify-pipeline.mjs
   ```

At the end of every non-dry-run batch, the runner calls the merge and verify
scripts automatically and then prints a summary bucketed as Completed, Partial,
Failed, Retryable Failed, Skipped, and Pending.

## Prerequisites

- Repo root checkout with the normal Job-Hunt setup completed
- `codex` in `PATH`
- `jq` in `PATH`
- Node.js for the merge, verify, and validation scripts
- A populated `batch/batch-input.tsv`

Use `npm run doctor` before a large batch if you want the broader repo health
check.

## Input And State Files

### `batch/batch-input.tsv`

The runner expects tab-separated rows with this header:

```tsv
id	url	source	notes
```

- `id` must be numeric and stable across reruns
- `url` is required
- `source` and `notes` are passed through to the worker prompt context

### `batch/batch-state.tsv`

The runner initializes this file if it does not exist:

```tsv
id	url	status	started_at	completed_at	report_num	score	error	retries
```

The `status` column stores the runner's persisted state. Some operator-facing
summary buckets are derived from `status` plus the `error` and `retries`
columns:

| Stored status | Meaning                                                    |
| ------------- | ---------------------------------------------------------- |
| `processing`  | Report number reserved and worker launched                 |
| `completed`   | Worker emitted a valid completed result                    |
| `partial`     | Worker emitted a valid partial result with warnings        |
| `failed`      | Semantic failure or infrastructure failure                 |
| `skipped`     | Score fell below `--min-score` after a valid worker result |

The summary line prints `Retryable Failed` for rows stored as `failed` whose
`error` starts with `infrastructure:` and whose retry count is still below
`--max-retries`.

## Runner Options

| Flag              | Default | Description                                            |
| ----------------- | ------- | ------------------------------------------------------ |
| `--parallel N`    | `1`     | Number of concurrent `codex exec` workers              |
| `--dry-run`       | off     | List the rows that would run without launching workers |
| `--retry-failed`  | off     | Retry only retryable infrastructure failures           |
| `--start-from N`  | `0`     | Skip offer IDs below `N`                               |
| `--max-retries N` | `2`     | Retry budget for infrastructure failures               |
| `--min-score N`   | `0`     | Mark rows as `skipped` when the score is below `N`     |

## Runtime Flow

1. `batch/batch-runner.sh` reads `batch-input.tsv` and `batch-state.tsv`.
2. For each runnable row, it reserves the next report number and writes a
   `processing` row to `batch-state.tsv`.
3. It resolves `batch/batch-prompt.md` placeholders into a temporary prompt
   file, including the final result path under `batch/logs/`.
4. It launches the worker from the repo root:

   ```bash
   codex exec \
     -C "$PROJECT_DIR" \
     --dangerously-bypass-approvals-and-sandbox \
     --output-schema batch/worker-result.schema.json \
     --output-last-message batch/logs/{report_num}-{id}.last-message.json \
     --json \
     - < resolved-prompt.md > batch/logs/{report_num}-{id}.log 2>&1
   ```

5. The worker writes its final structured JSON to
   `batch/logs/{report_num}-{id}.result.json` and the same final message is
   captured in `batch/logs/{report_num}-{id}.last-message.json`.
6. The runner validates the result contract, updates `batch-state.tsv`, and
   keeps the per-offer event log in `batch/logs/{report_num}-{id}.log`.
7. After all runnable rows finish, the runner executes:

   ```bash
   node scripts/merge-tracker.mjs
   node scripts/verify-pipeline.mjs
   ```

## Directory Layout

```text
batch/
  batch-runner.sh            # Standalone orchestrator
  batch-prompt.md            # Worker prompt template
  worker-result.schema.json  # Structured result contract
  batch-input.tsv            # Input offers you manage
  batch-state.tsv            # Runner-managed resumable state
  logs/                      # Per-offer artifacts
    001-1.log               # codex exec event log
    001-1.result.json       # authoritative worker result
    001-1.last-message.json # captured final message
  tracker-additions/         # Worker-produced TSV rows
    merged/                  # Rows already merged into applications.md
```

## Structured Result Contract

The worker result schema is defined in `batch/worker-result.schema.json`.
Every successful worker invocation must emit exactly one of these result types:

| Worker status | Required semantics                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `completed`   | Numeric score, legitimacy, report path, PDF path, tracker path, no warnings, `error: null`                                  |
| `partial`     | Numeric score, legitimacy, report path, at least one warning, and either `pdf` or `tracker` set to `null`                   |
| `failed`      | Semantic failure: `score`, `legitimacy`, `pdf`, and `tracker` are `null`; `error` is a non-empty string; `report` may exist |

Infrastructure failures are not a worker status. They happen when the worker
exits non-zero or does not leave a valid result artifact. The runner stores
those rows as `failed` with an `error` message prefixed by `infrastructure:`.

## State Semantics And Retry Behavior

| Case                                                  | Stored status | Retry behavior                             | Operator expectation                                                                  |
| ----------------------------------------------------- | ------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Fully successful run                                  | `completed`   | Terminal                                   | Report, PDF, and tracker TSV all exist                                                |
| Main evaluation succeeded but PDF or tracker degraded | `partial`     | Terminal                                   | Report exists; inspect `warnings` and decide whether to repair artifacts manually     |
| Semantic evaluation failure                           | `failed`      | Terminal                                   | Check the `semantic:` error summary in `batch-state.tsv` and the report if one exists |
| Worker crash, bad JSON, or missing result artifact    | `failed`      | Retryable until `retries >= --max-retries` | Inspect the event log and rerun with `--retry-failed`                                 |
| Valid result below `--min-score`                      | `skipped`     | Terminal                                   | No downstream tracker or PDF work should proceed for that row                         |

Normal reruns skip rows already stored as `completed`, `partial`, or `skipped`.
Normal reruns also skip semantic failures and exhausted infrastructure
failures. `--retry-failed` only selects retryable infrastructure failures.

## Merge And Verification Flow

Workers never edit `data/applications.md` directly. They write one TSV per
offer into `batch/tracker-additions/`, and the runner closes out with the
repo-owned merge and verify scripts:

```bash
node scripts/merge-tracker.mjs
node scripts/verify-pipeline.mjs
```

Use these scripts again after manual tracker cleanup or after moving pending
TSVs back into place for reprocessing.

## Validation And Troubleshooting

Use the quick repo gate after doc or runner changes:

```bash
node scripts/test-all.mjs --quick
```

Useful troubleshooting patterns:

- Empty or malformed `batch/logs/*.result.json`: the runner will classify the
  row as an infrastructure failure and include a summary in the `error`
  column.
- Pending TSVs left in `batch/tracker-additions/`: rerun
  `node scripts/merge-tracker.mjs` and then `node scripts/verify-pipeline.mjs`.
- Status drift or duplicate tracker rows: use
  `node scripts/normalize-statuses.mjs` or `node scripts/dedup-tracker.mjs`,
  then rerun verification.
- Stale `batch-runner.pid` or `.batch-state.lock/`: confirm no worker is
  active, then remove the stale lock artifact and rerun the batch.
