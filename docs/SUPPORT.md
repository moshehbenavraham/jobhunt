# Getting Help

career-ops is a local-first, Codex-primary project maintained in limited time.
The fastest way to get help is to use the right support path and include only
the diagnostics needed to reproduce the problem.

## Where to Ask

| Need                              | Best path                                                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Setup or validation issue**     | Read [SETUP.md](SETUP.md), rerun `npm run doctor`, then ask in [GitHub Discussions](https://github.com/santifer/career-ops/discussions) or [Discord](https://discord.gg/8pRpHETxa4) with the failing step |
| **Reproducible bug**              | Open a [GitHub Issue](https://github.com/santifer/career-ops/issues) with steps, expected behavior, actual behavior, and validation notes                                                                 |
| **Feature idea or docs gap**      | Open a [GitHub Issue](https://github.com/santifer/career-ops/issues) or start in [GitHub Discussions](https://github.com/santifer/career-ops/discussions)                                                 |
| **Contributor workflow question** | Start with [CONTRIBUTING.md](CONTRIBUTING.md), then ask in [GitHub Discussions](https://github.com/santifer/career-ops/discussions) or [Discord](https://discord.gg/8pRpHETxa4)                           |
| **Security vulnerability**        | Email `hi@santifer.io` and follow [SECURITY.md](SECURITY.md); do not open a public issue                                                                                                                  |

## Before Opening an Issue

1. Search existing issues and discussions first.
2. Rerun the exact command that failed from the repo root so you can capture
   the current output.
3. For setup or environment problems, run `npm run doctor`.
4. For tracker, report, or pipeline integrity problems, run `npm run verify`.
5. For setup-data or profile-contract problems, run `npm run sync-check`.
6. If you are reporting a contributor-facing regression after local changes,
   run `node scripts/test-all.mjs --quick`.

## Include These Details

- your OS and version
- `node -v`
- whether `npm install` and `npx playwright install chromium` completed
- the exact command you ran and the directory you ran it from
- the relevant validation output from `npm run doctor`, `npm run verify`,
  `npm run sync-check`, or `node scripts/test-all.mjs --quick`
- a short repro sequence and the smallest useful error excerpt

## Do Not Include

- full CV contents, `config/profile.yml`, `portals.yml`, or generated reports
- secrets, tokens, cookies, or private job materials
- public details for a security issue; email them instead

## What Not to Use GitHub Issues For

- General questions about job searching
- Requests for personal career advice
- Support for modified forks or unofficial distributions
- Asking the maintainer to review your CV

These will be closed and redirected to the appropriate channel.
