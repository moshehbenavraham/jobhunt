# Development

## Start With These Docs

- [Contributing](CONTRIBUTING.md)
- [Customization Guide](CUSTOMIZATION.md)
- [Support](SUPPORT.md)
- [Data Contract](DATA_CONTRACT.md)

## Common Checks

```bash
npm run doctor
npm run sync-check
npm run verify
npm run app:validate
node scripts/test-all.mjs --quick
```

## Working Notes

- Keep repo changes aligned with `AGENTS.md`.
- Keep user-layer data and shared system changes separated.
- Update the relevant docs when scripts or workflows change.
- Use the existing scripts instead of adding duplicate workflows.
- Use `npm run app:web:dev` and `npm run app:api:serve` when working on the
  app surfaces for startup, onboarding, evaluation, approvals, settings,
  reports, pipeline review, tracker workspace, scan review, batch workspace,
  specialist workspace, and application-help.
- Keep the API route contract and the web shell in sync when adding a new
  operator surface.

## Useful References

- [Contributing](CONTRIBUTING.md)
- [Support](SUPPORT.md)
- [Customization Guide](CUSTOMIZATION.md)
- [Architecture](ARCHITECTURE.md)
- [Scripts Reference](SCRIPTS.md)
- [Onboarding](onboarding.md)
