# CONVENTIONS.md

## Guiding Principles

- Preserve the repo's business logic while changing the runtime contract around it.
- Prefer repo-owned scripts, prompts, and templates over ephemeral agent behavior.
- Keep commands deterministic, inspectable, and easy to validate on a clean checkout.
- Make no assumptions about paths, versions, or docs; verify the live repo state first.

## Runtime Surfaces

- `AGENTS.md` is the canonical persistent instruction surface for the repo.
- Checked-in Codex skills live under `.codex/skills/`; do not add required companion docs unless they exist and are referenced intentionally.
- Keep the user/system boundary from `docs/DATA_CONTRACT.md` intact when updating prompts, docs, or scripts.

## JavaScript and Node.js

- Use ESM `.mjs` patterns for repo scripts unless there is a strong repo-wide reason to introduce another module format.
- Prefer Node standard library modules before adding dependencies.
- Resolve paths from `import.meta.url`, explicit project-root helpers, or known repo anchors instead of process-relative guesses.
- Keep script behavior deterministic on empty user data when a safe no-op is the intended behavior.
- When output needs to be machine-readable, keep stdout parseable and move diagnostics to stderr.

## CLI and Script Design

- Use exit code `0` for success and non-zero codes for actionable failure.
- Print primary command results to stdout and warnings/errors to stderr.
- Keep flags long-form and descriptive, and align command naming with existing npm scripts where practical.
- Commands that mutate repo state should report what changed and where.
- Prefer checked-in repo scripts or runtime-neutral capability language over vendor-specific CLI UX metaphors in docs and prompts.

## Shell Scripts

- Target portable Bash and use `set -euo pipefail` unless there is a documented reason not to.
- Prefer `printf` over `echo` when formatting or portability matters.
- Quote variables and paths consistently.
- Use `rg` or existing repo scripts before slower ad hoc scans.

## Go Dashboard

- Follow Effective Go naming and keep package names short and lower-case.
- Return errors with context instead of panicking in normal dashboard flows.
- Keep UI state transitions explicit and easy to trace.
- Avoid duplicating business logic already owned by Node.js scripts or shared data files.

## Files and Structure

- Keep personalization in user-layer files and shared behavior in system-layer files.
- Update the file that already owns a behavior before creating a new doc, script, or helper.
- Store durable workflow rules in `AGENTS.md`, mode files, templates, or repo scripts, not scattered README fragments.
- Remove dead references to files or directories that do not exist in the repo.

## Naming

- Use camelCase for JavaScript identifiers, PascalCase for Go exported types, and kebab-case for file names unless an existing convention overrides it.
- Name scripts by action and outcome, such as `merge-tracker.mjs` or `check-liveness.mjs`.
- Booleans should read like questions: `isActive`, `hasDiff`, `shouldUpdate`.

## Functions and Modules

- Keep functions small enough to understand in one pass.
- Separate parsing, decision logic, and side effects when writing CLI scripts.
- Prefer pure helpers for classification, normalization, and path resolution logic.
- Reuse existing utilities before creating parallel validation or path-handling code.

## Error Handling

- Fail fast on missing system prerequisites and report the exact missing path or command.
- When user data may legitimately be absent, degrade gracefully and explain the next setup step.
- Include enough context in errors to diagnose path, version, or command mismatches quickly.
- Do not swallow subprocess failures; surface the failing command or stage.

## Documentation and Prompts

- Default documentation examples to `codex` for primary flows.
- Describe capabilities in runtime-neutral language unless a specific command is required by the implementation.
- Keep `README.md`, setup docs, updater messaging, and mode files aligned on the same canonical runtime.
- When a path is authoritative, name it exactly and avoid duplicating slightly different references elsewhere.

## Dependencies

- Prefer agent-neutral repo logic over new wrapper tools.
- Keep `package-lock.json` committed and update it intentionally with dependency changes.
- Add npm or Go dependencies only when the built-in runtime or existing packages cannot cover the need.
- Any migration dependency must directly support Codex-primary behavior, validation, or batch execution.

## Testing and Validation

- Run syntax checks such as `node --check` for touched Node.js scripts.
- Use `node scripts/test-all.mjs --quick` as the baseline regression gate for repo-drift and contract changes.
- Re-run `npm run doctor` when setup or onboarding paths change.
- Validate batch-runner changes with real `codex exec` invocations before declaring the migration complete.

## Versioning and Release Paths

- Keep one canonical version source and make any mirrors or derived docs pull from it.
- Updater logic, tests, package metadata, and user-facing version docs must reference the same source of truth.
- Do not hide version drift behind hardcoded fallback values.
- Release-path changes must preserve user data directories and the documented data contract.

## Local Dev Tools

| Category      | Tool                                          | Config                                         |
| ------------- | --------------------------------------------- | ---------------------------------------------- |
| Formatter     | Prettier                                      | .prettierrc                                    |
| Linter        | Biome                                         | biome.json                                     |
| Type Safety   | `npm run typecheck`                           | apps/web/tsconfig.json, apps/api/tsconfig.json |
| Testing       | `node scripts/test-all.mjs`, `npm run doctor` | repo scripts                                   |
| Coverage      | `npm run coverage`                            | `c8`, `go test -cover`                         |
| Observability | pino                                          | apps/api/src/logger.ts                         |
| Git Hooks     | husky + lint-staged                           | .husky/pre-commit, .lintstagedrc.mjs           |
| Database      | not configured                                | -                                              |

## Infrastructure

| Surface   | Command                                               | Details                                                                                                     |
| --------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Health    | `npm run doctor && node scripts/test-all.mjs --quick` | Repo health gate; validates setup, version consistency, and dashboard build                                 |
| Coverage  | `npm run coverage`                                    | Measures Node script coverage via `c8` and dashboard package coverage via `go test -cover`                  |
| Security  | `npm run app:boot:test`                               | API startup server rate limits burst traffic per client and returns HTTP 429 after the configured window    |
| Backup    | `npm run backup:run`                                  | Timestamped SQLite backups in `.jobhunt-app/backups/` with 7-day retention; use `--verify` to restore-check |
| Backup Schedule | `npm run backup:install-cron`                   | Installs the repo-managed daily backup cron entry at `05:15` local time and writes logs to `tmp/cron/backup.log` |
| Local Dev | `npm run dashboard`                                   | Preferred launcher for the Go TUI dashboard; builds in `dashboard/` and defaults `--path` to the repo root  |

## CI/CD

| Bundle       | Status     | Workflow                                                                                                | Strategy                                                               |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Code Quality | configured | `.github/workflows/quality.yml`                                                                         | Repo-wide npm workspace lint, format, and quick regression validation  |
| Build & Test | configured | `.github/workflows/test.yml`                                                                            | Repo-wide quick regression gate on pull requests                       |
| Security     | configured | `.github/workflows/codeql.yml`, `.github/workflows/dependency-review.yml`, `.github/workflows/sbom.yml` | JavaScript/TypeScript plus Go analysis matrix and PR dependency review |
| Integration  | configured | `.github/workflows/integration.yml`                                                                     | Repo-wide doctor, Playwright Chromium, verify, and sync-check gates    |
| Operations   | configured | `.github/workflows/release.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`               | Main-branch release automation plus webhook deploy placeholder         |

- `DEPLOY_WEBHOOK_URL` and `DEPLOY_HEALTHCHECK_URL` enable the deploy workflow's production webhook trigger and `/health` smoke test. Without them, `.github/workflows/deploy.yml` exits cleanly as a documented placeholder.

## When In Doubt

- Inspect the live repo state before editing docs or paths.
- Prefer removing drift over adding compatibility layers.
- Keep Codex-primary defaults explicit.
- Leave the repo easier to validate than you found it.
