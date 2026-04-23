# CONVENTIONS.md

## Guiding Principles

- Optimize for readability over cleverness
- Code is written once, read many times
- Consistency beats personal preference
- If it can be automated, automate it
- When writing code: Make NO assumptions. Do not be lazy. Pattern match precisely. Do not skim when you need detailed info from documents. Validate systematically.

## UX Recovery Principles

- The UX PRD (`PRD_UX.md`) is the visual and interaction spec of record
- Every UI session must pass through `sculpt-ui` before implementation
- Operator-facing copy must be terse, scannable, and jargon-free
- Design tokens are the single source of truth for visual values
- Screenshot review against the UX PRD is mandatory before session completion
- No internal build-process language in any user-visible string

## Naming

- Be descriptive over concise: `getUserById` > `getUser` > `fetch`
- Booleans read as questions: `isActive`, `hasPermission`, `shouldRetry`
- Functions describe actions: `calculateTotal`, `validateInput`, `sendNotification`
- Avoid abbreviations unless universally understood (`id`, `url`, `config` are fine)
- Match domain language--use the same terms as product/design/stakeholders

## Copy Rules (User-Facing Strings)

### Banned Terms in `apps/web/src`

These terms must never appear in user-visible UI strings:

`phase`, `session`, `payload`, `endpoint`, `contract`, `surface`,
`route message`, `artifact review surface`, `canonical`

### Replacement Guidance

- Describe what this area is for
- Describe what the person can do next
- Describe what result exists now
- Describe what is blocked and why
- Write for a stressed operator doing triage, not for an AI narrating state

## Files & Structure

- One concept per file where practical
- File names reflect their primary export or purpose
- Group by feature/domain, not by type (prefer `/orders/api.ts` over `/api/orders.ts`)
- Keep nesting shallow--if you're 4+ levels deep, reconsider

## Design Tokens

- All visual values live in `apps/web/src/styles/tokens.css`
- Components consume tokens via CSS custom properties, never raw values
- Token categories: color, typography, spacing, radius, border, shadow, layout
- PRD palette: mineral paper base, deep ink chrome, disciplined cobalt accent, restrained status colors
- Typography: Space Grotesk (headings), IBM Plex Sans (body), IBM Plex Mono (code/data)

## Functions & Modules

- Functions do one thing
- If a function needs a comment explaining what it does, consider renaming it
- Keep functions short enough to read without scrolling
- Avoid side effects where possible; be explicit when they exist

## Comments

- Explain _why_, not _what_
- Delete commented-out code--that's what git is for
- TODOs include context: `// TODO(name): reason, ticket if applicable`
- Update or remove comments when code changes

## Error Handling

- Fail fast and loud in development
- Fail gracefully in production
- Errors should be actionable--include context for debugging
- Don't swallow errors silently

## Database Layer

### Connection

- Connection string source: `DATABASE_URL` env var
- SQLite operational store in `apps/api`
- Separate connection URLs for: app, migrations, tests

### Migrations

- Tool: Drizzle / raw SQL
- Location: `apps/api/src/store/migrations/`
- CRITICAL: Never modify a migration already applied to shared environments
- Every migration must have a reverse/down

### Models / Schema

- Location: `apps/api/src/store/schema/`
- Required columns: timestamps, soft delete where appropriate

### Queries

- Parameterized only (no string concatenation)
- N+1 prevention strategy: batch queries where possible

## Testing

- Test behavior, not implementation
- A test's name should describe the scenario and expectation
- If it's hard to test, the design might need rethinking
- Flaky tests get fixed or deleted--never ignored

## Git & Version Control

- Commit messages: imperative mood, concise (`Add user validation` not `Added some validation stuff`)
- One logical change per commit
- Branch names: `type/short-description` (e.g., `feat/user-auth`, `fix/cart-total`)
- Keep commits atomic enough to revert safely

## Pull Requests

- Small PRs get better reviews
- Description explains the _what_ and _why_--reviewers can see the _how_
- Link relevant tickets/context
- Review your own PR before requesting others

## Code Review

- Critique code, not people
- Ask questions rather than make demands
- Approve when it's good enough, not perfect
- Nitpicks are labeled as such

## Dependencies

- Fewer dependencies = less risk
- Justify additions; prefer well-maintained, focused libraries
- Pin versions; update intentionally

## Local Dev Tools

| Category      | Tool                             | Config                                                      |
| ------------- | -------------------------------- | ----------------------------------------------------------- |
| Formatter     | Prettier                         | `.prettierrc`                                               |
| Linter        | ESLint                           | `eslint.config.*`                                           |
| Type Safety   | TypeScript strict                | `tsconfig.json`                                             |
| Testing       | Vitest                           | `vitest.config.ts`                                          |
| Bundler       | Vite                             | `vite.config.ts`                                            |
| Database      | SQLite (better-sqlite3)          | `apps/api`                                                  |
| Observability | pino (api), browser logger (web) | `apps/api/src/logger.ts`, `apps/web/src/logger.ts`, `logs/` |
| Git Hooks     | husky + lint-staged              | `.husky/pre-commit`, `.lintstagedrc.mjs`                    |
| Copy Check    | `scripts/check-app-ui-copy.mjs`  | CI + validate                                               |

## CI/CD

| Bundle       | Status     | Workflow                                                         |
| ------------ | ---------- | ---------------------------------------------------------------- |
| Code Quality | configured | `.github/workflows/quality.yml`                                  |
| Build & Test | configured | `.github/workflows/test.yml`                                     |
| Security     | configured | `codeql.yml`, `dependency-review.yml`, `sbom.yml`                |
| Integration  | configured | `.github/workflows/integration.yml`                              |
| Operations   | configured | `deploy.yml`, `release.yml`, `dependabot.yml`, `stale.yml`, etc. |

Platform: GitHub Actions
Monorepo strategy: single workflows, npm-based task delegation

## Infrastructure

| Component       | Package  | Provider         | Details                                                             |
| --------------- | -------- | ---------------- | ------------------------------------------------------------------- |
| Health          | apps/api | Node HTTP server | `/health` endpoint with DB, agent runtime, operational store checks |
| Health          | apps/web | (not deployed)   | Static SPA -- no server-side health endpoint needed                 |
| Rate Limiting   | apps/api | In-process       | IP-based, 5 req/10s default, configurable via env vars              |
| Backup          | (shared) | Local filesystem | `npm run backup:run`, SQLite copy, 7-day retention, `--verify` flag |
| Backup Schedule | (shared) | Cron             | `npm run backup:install-cron`                                       |
| Deploy          | (shared) | GitHub Actions   | `.github/workflows/deploy.yml`, webhook trigger on push to main     |
| Local Dev       | apps/api | tsx              | `npm run app:api:dev` or `npm run app:api:serve`                    |
| Local Dev       | apps/web | Vite             | `npm run app:web:dev`                                               |

Platform notes:

- No hosting platform configured yet (no Docker, Vercel, Fly, or Coolify)
- WAF deferred until a hosting platform is selected
- Deploy workflow gracefully skips when `DEPLOY_WEBHOOK_URL` secret is not set
- Platform health probes will be configured alongside hosting platform selection

## When In Doubt

- Ask
- Leave it better than you found it
- Ship, learn, iterate

## Workspace Structure

| Package | Path     | Stack            | Formatter | Linter | Types | Testing   | Observability  | Git Hooks           |
| ------- | -------- | ---------------- | --------- | ------ | ----- | --------- | -------------- | ------------------- |
| web     | apps/web | TypeScript React | Prettier  | ESLint | tsc   | -         | browser logger | husky + lint-staged |
| api     | apps/api | TypeScript Node  | Prettier  | ESLint | tsc   | node:test | pino           | husky + lint-staged |

### Cross-Package Rules

- Import from sibling packages via workspace aliases, not relative paths
- Shared types live in a dedicated shared/common package
- Each package owns its own tests; integration tests live at repo root
- Changes spanning multiple packages require explicit cross-package session scope

### Database Ownership

| Database          | Owner Package | Type   | Shared By          |
| ----------------- | ------------- | ------ | ------------------ |
| operational store | apps/api      | SQLite | apps/web (via API) |

- Migrations live in the owner package
- Consuming packages use the owner's API, not direct DB access
