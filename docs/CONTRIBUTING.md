# Contributing to Career-Ops

Career-Ops is driven by Codex CLI plus the checked-in repo instructions. Keep changes small, factual, and aligned with the existing data contract.

## Before You Submit

- Open an issue first for larger changes when possible.
- Keep user-layer data out of commits.
- Update docs when behavior changes.
- Run the relevant validation scripts before asking for review.

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

## Useful Checks

```bash
npm run doctor
npm run sync-check
npm run verify
```

## Need Help

- [Setup Guide](SETUP.md)
- [Architecture](ARCHITECTURE.md)
- [Scripts Reference](SCRIPTS.md)
