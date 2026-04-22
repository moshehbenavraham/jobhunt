# Cutover Note

## Summary

Status: Complete on 2026-04-22

Session 06 moved the primary local operator path into the app-owned shell.
Ready workspaces now land on `home`, missing-prerequisite workspaces are
intercepted into onboarding, and settings plus docs now treat the app as the
primary runtime while keeping terminal-owned maintenance explicit.

## Parity Matrix

| Surface                  | App Status | Evidence                                                                            | Remaining Gap |
| ------------------------ | ---------- | ----------------------------------------------------------------------------------- | ------------- |
| Operator home            | Ready      | `npm run app:api:test:runtime`; `node scripts/test-app-shell.mjs`                   | None blocking |
| Onboarding intercept     | Ready      | `node scripts/test-app-shell.mjs`; `node scripts/test-app-onboarding.mjs`           | None blocking |
| Settings and maintenance | Ready      | `node scripts/test-app-settings.mjs`; `npm run app:check`                           | None blocking |
| Queue closeout           | Ready      | `node scripts/test-app-shell.mjs`; `node scripts/test-app-auto-pipeline-parity.mjs` | None blocking |
| Artifact review          | Ready      | `node scripts/test-app-shell.mjs`; `node scripts/test-app-auto-pipeline-parity.mjs` | None blocking |
| Specialist workflows     | Ready      | `node scripts/test-app-shell.mjs`; `node scripts/test-all.mjs --quick`              | None blocking |

## Evidence

### Runtime and Navigation

- Ready workspaces now resolve the blank shell hash to `#home` instead of
  startup diagnostics.
- Explicit `#home` navigation is redirected to `#onboarding` when required
  onboarding files are missing.
- Operator-home cards hand off into the existing approvals, pipeline, tracker,
  artifacts, settings, chat, scan, batch, application-help, and workflows
  surfaces without browser-side repo parsing.
- Home refresh keeps the last good snapshot during offline failures instead of
  blanking the surface.

### Regression Coverage

- `npm run app:api:test:runtime`
- `npm run app:check`
- `npm run app:web:build`
- `node scripts/test-app-shell.mjs`
- `node scripts/test-app-settings.mjs`
- `node scripts/test-app-onboarding.mjs`
- `node scripts/test-app-auto-pipeline-parity.mjs`
- `node scripts/test-all.mjs --quick`

### Documentation Alignment

- `README.md` now describes the app shell and operator home as the primary
  local runtime.
- `docs/SETUP.md` and `docs/CONTRIBUTING.md` now point operators and
  contributors to the app-first path.
- `docs/README-docs.md` links this cutover note from the docs index.
- `dashboard/README-dashboard.md` now frames the Go dashboard as a secondary
  path instead of the default operator entry point.

## Remaining Gaps

- No automated blocking parity gaps were found in Session 06 validation.
- Manual dogfooding is still recommended before deleting the Go dashboard
  implementation outright.

## Dashboard Decision

Decision: keep the Go dashboard as a documented secondary surface for now.

Rationale:

- The app shell now provides the primary daily operator path with automated
  parity coverage.
- Dashboard removal itself was explicitly out of scope for Session 06.
- A later cleanup session can retire the dashboard once manual operator usage
  confirms the app-first path is stable enough to remove the fallback.

## Follow-Up Notes

- If a later phase retires the dashboard, remove the remaining dashboard docs,
  prune any no-longer-needed regression fixtures, and rerun the full
  phase-transition workflow after the removal patch.
