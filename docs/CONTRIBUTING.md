# Contributing to Job-Hunt

Job-Hunt is a Codex-primary repo. The live contributor workflow runs through
`codex`, `AGENTS.md`, the checked-in skills, and the repo-owned scripts. Keep
changes small, factual, and aligned with the existing data contract.

If your local environment is not ready yet, stop here and follow the
[Setup Guide](SETUP.md) first.

## Before You Change Anything

- Open an issue first for larger changes when possible.
- Keep user-layer data out of commits.
- Update docs when behavior changes.
- Do not reintroduce alternate-runtime wording for standard repo flows.

User-layer files stay local and should not be committed. That includes
`profile/cv.md`, `profile/article-digest.md`, `config/portals.yml`, `config/profile.yml`,
`modes/_profile.md`, generated PDFs, reports, and tracker data created for
your personal search.

## Contributor Workflow

1. Start from `develop` when it exists; otherwise branch from `main`.
2. Use `codex` from the repo root for interactive repo workflows and keep
   behavior aligned with `AGENTS.md` plus the checked-in docs and scripts.
3. Keep commits focused and explain behavior changes in the PR summary.
4. Update the owning docs, scripts, or templates when the runtime contract
   changes.
5. Include the validation commands you ran before asking for review.

## Branch Conventions

- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new work
- `fix/*` - bug fixes

## Commit Style

Use conventional commits:

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`

## Pull Request Process

1. Create a branch from `develop` when that branch exists, otherwise branch from `main`.
2. Make focused commits.
3. Update tests and docs for behavior changes.
4. Open a PR with a clear summary and validation notes.
5. Address feedback before merging.

## Validation Guide

Run the smallest set of checks that proves your change, then include those
results in the PR notes.

- `npm run doctor` - run after a fresh clone, after setup-path changes, or
  when diagnosing environment issues.
- `npm run sync-check` - run when you change setup guidance, profile/CV
  expectations, or the user-layer data contract.
- `npm run verify` - run when you change tracker, merge, normalization,
  reports, or pipeline integrity behavior.
- `node scripts/test-all.mjs --quick` - baseline regression gate for docs,
  runtime-contract, and script changes before review.

## Useful References

```bash
npm run doctor
npm run sync-check
npm run verify
node scripts/test-all.mjs --quick
```

- [Setup Guide](SETUP.md)
- [Architecture](ARCHITECTURE.md)
- [Scripts Reference](SCRIPTS.md)
- [Support Guide](SUPPORT.md)
- [Security Policy](SECURITY.md)
