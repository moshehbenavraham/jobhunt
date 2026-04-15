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

| Category      | Tool                                          | Config       |
| ------------- | --------------------------------------------- | ------------ |
| Formatter     | Prettier                                      | .prettierrc  |
| Linter        | not configured                                | -            |
| Type Safety   | not configured                                | -            |
| Testing       | `node scripts/test-all.mjs`, `npm run doctor` | repo scripts |
| Observability | not configured                                | -            |
| Git Hooks     | not configured                                | -            |
| Database      | not configured                                | -            |

## Infrastructure

| Surface | Command | Details |
| ------- | ------- | ------- |
| Health  | `npm run doctor && node scripts/test-all.mjs --quick` | Repo health gate; validates setup, version consistency, and dashboard build coverage |
| Local Dev | `cd dashboard && go build -o career-dashboard . && ./career-dashboard --path ..` | Manual launch path for the Go TUI dashboard; run from the `dashboard/` directory |

## When In Doubt

- Inspect the live repo state before editing docs or paths.
- Prefer removing drift over adding compatibility layers.
- Keep Codex-primary defaults explicit.
- Leave the repo easier to validate than you found it.
