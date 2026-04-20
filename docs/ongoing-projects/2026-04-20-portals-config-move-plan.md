# 2026-04-20 Portals Config Move Plan

## Decision

Move the canonical portal-scanner config from root-level `portals.yml` to
`config/portals.yml`.

This is a hard cutover, not a compatibility migration:

- root-level `portals.yml` stops being a supported path
- scripts, onboarding, docs, and tests are updated to expect
  `config/portals.yml`
- no fallback lookup is kept for the old location

Recommended companion change:

- move the example file from `templates/portals.example.yml` to
  `config/portals.example.yml` so the active file and its bootstrap template
  live together

## Why This Move Is Worth Doing

The current repo already uses `config/profile.yml` for structured user
configuration and `profile/` for authored candidate content such as the CV and
proof points.

`portals.yml` behaves like configuration, not profile prose:

- title filters
- tracked companies
- scan-time discovery notes

Putting it under `config/` makes the repo layout more coherent:

- `config/` holds structured user settings
- `profile/` holds user-authored markdown content
- the repo root becomes less cluttered with singleton user files

`profile/` is not the right target because it currently represents authored
candidate artifacts rather than scanner/runtime configuration.

## Scope Summary

The runtime code blast radius is modest. The larger scope is the repo contract:
instructions, onboarding, data contract, examples, and tests.

Primary runtime surfaces that must change:

- `scripts/scan.mjs`
- `scripts/doctor.mjs`
- `scripts/update-system.mjs`
- `scripts/analyze-patterns.mjs`

Primary contract and onboarding surfaces that must change:

- `AGENTS.md`
- `.codex/skills/career-ops/SKILL.md`
- `README.md`
- `docs/SETUP.md`
- `docs/onboarding.md`
- `docs/DATA_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/CUSTOMIZATION.md`
- `docs/SCRIPTS.md`
- `docs/WORKFLOW_CHECKLIST.md`
- `docs/CONTRIBUTING.md`
- `docs/SUPPORT.md`
- `modes/scan.md`
- `modes/patterns.md`

Primary template and test surfaces that must change:

- `templates/portals.example.yml` if retained in place, or move to
  `config/portals.example.yml`
- `templates/README-templates.md`
- `config/README-config.md`
- `scripts/test-scan.mjs`
- `scripts/test-all.mjs`
- `scripts/test-maintenance-scripts.mjs`

## Goals

1. Make `config/portals.yml` the only supported runtime path.
2. Keep the user/system data contract explicit after the move.
3. Keep onboarding and setup commands obvious and consistent.
4. Prevent ambiguous dual-config situations during development.
5. Leave scan behavior unchanged apart from the file location.

## Non-Goals

- no compatibility shim for root-level `portals.yml`
- no scanner behavior changes
- no schema redesign for the portals config
- no merging of portal settings into `config/profile.yml`

## Proposed End State

Canonical user-layer file:

- `config/portals.yml`

Canonical bootstrap template:

- `config/portals.example.yml`

Obsolete path:

- root-level `portals.yml`

Repo mental model after the change:

- `config/profile.yml` and `config/portals.yml` are the two structured
  user-controlled YAML config files
- `profile/cv.md` and `profile/article-digest.md` remain the authored content
  sources

## Implementation Plan

### Session 1. Hard-cut the runtime path and onboarding commands

Focus:

- make the code read the new path
- make setup and validation point to the new path
- remove the old root-level contract from the operator workflow

Implementation targets:

- `scripts/scan.mjs`
- `scripts/doctor.mjs`
- `scripts/update-system.mjs`
- `scripts/analyze-patterns.mjs`
- `AGENTS.md`
- `.codex/skills/career-ops/SKILL.md`
- `README.md`
- `docs/SETUP.md`
- `docs/onboarding.md`
- `modes/scan.md`
- `modes/patterns.md`

Concrete changes:

- change scanner config resolution from `PROJECT_ROOT/portals.yml` to
  `PROJECT_ROOT/config/portals.yml`
- change doctor validation and suggested fix commands to:

```bash
cp config/portals.example.yml config/portals.yml
```

- update updater user-path protection from `portals.yml` to
  `config/portals.yml`
- update user-facing remediation strings, error messages, and scan guidance to
  reference `config/portals.yml`
- update onboarding and setup docs to treat `config/portals.yml` as required
- update mode instructions and checked-in skill instructions to verify the new
  path
- decide and execute one template strategy:
  - preferred: move `templates/portals.example.yml` to
    `config/portals.example.yml`
  - alternative: keep the template in `templates/` but still bootstrap into
    `config/portals.yml`

Acceptance bar:

- `npm run scan` reads only `config/portals.yml`
- `npm run doctor` requires only `config/portals.yml`
- onboarding instructions no longer mention root-level `portals.yml`
- AGENTS and skill startup checks no longer mention the old path

### Session 2. Clean up data-contract docs, examples, and regression coverage

Focus:

- align the repo contract everywhere
- make tests enforce the new layout
- make the new `config/` story self-explanatory

Implementation targets:

- `docs/DATA_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/CUSTOMIZATION.md`
- `docs/SCRIPTS.md`
- `docs/WORKFLOW_CHECKLIST.md`
- `docs/CONTRIBUTING.md`
- `docs/SUPPORT.md`
- `config/README-config.md`
- `templates/README-templates.md`
- `scripts/test-scan.mjs`
- `scripts/test-all.mjs`
- `scripts/test-maintenance-scripts.mjs`

Concrete changes:

- rewrite user-layer references from `portals.yml` to `config/portals.yml`
- update architecture and workflow diagrams so config lives under `config/`
- update customization docs to describe portal targeting as config-layer data
- if the example file moves, update template/config READMEs to reflect the new
  home
- update tests and sandbox fixtures to create `config/portals.yml` instead of a
  root file
- add or update assertions so the main scripts fail clearly when
  `config/portals.yml` is missing
- optionally add a regression assertion that a stray root-level `portals.yml`
  is ignored or flagged, so the repo does not silently support two paths

Acceptance bar:

- all checked-in docs describe the same canonical path
- regression tests no longer rely on root-level `portals.yml`
- no setup or support doc tells the user to create a root-level portals file

## Validation

Minimum validation for the implementation pass:

- `npm run doctor`
- `npm run scan -- --help` or equivalent non-destructive scan smoke check
- targeted regression tests for the touched scripts
- `node scripts/test-all.mjs --quick` if the current baseline allows it

Additional manual verification:

- confirm a fresh onboarding flow uses:
  - `config/profile.yml`
  - `config/portals.yml`
  - `profile/cv.md`
- confirm no remaining actionable repo instructions still point at the old
  root-level path

## Session Notes

### 2026-04-20 Session 1 status

Status: completed

Completed this session:

- hard-cut runtime lookup to `config/portals.yml` in `scripts/scan.mjs`
- updated `scripts/doctor.mjs` to require `config/portals.yml` and suggest
  `cp config/portals.example.yml config/portals.yml`
- updated updater protections and shipped the new config example via
  `scripts/update-system.mjs`
- moved the checked-in example file from `templates/portals.example.yml` to
  `config/portals.example.yml`
- updated active onboarding and operator docs to use the new config path
- updated `.gitignore` so `config/portals.yml` remains user-layer data
- updated direct regression fixtures for scan, doctor, and bootstrap contract
  checks so validation stays green after the cutover

Validation completed:

- `npm run doctor`
- `node scripts/test-scan.mjs`
- `node scripts/test-maintenance-scripts.mjs`
- `node scripts/test-all.mjs --quick`

Notes for the next session:

- Session 2 still owns broader doc and example cleanup in historical planning
  docs and any remaining secondary references outside the active runtime
  contract
- the hard cutover is already live; root-level `portals.yml` is no longer a
  supported path in the runtime

### 2026-04-20 Session 2 status

Status: completed

Completed this session:

- cleaned the last live config doc drift in `config/README-config.md` so the
  `config/` directory contract is self-consistent
- updated historical planning docs that still described root-level
  `portals.yml` or `templates/portals.example.yml` as current paths
- updated the single-user app parity PRD to reflect
  `config/portals.yml` in onboarding and source-of-truth lists
- added a regression in `scripts/test-scan.mjs` that proves a stray root-level
  `portals.yml` does not satisfy the scanner after the hard cutover

Validation completed:

- `node scripts/test-scan.mjs`
- `node scripts/test-all.mjs --quick`

Notes:

- the active repo contract is now consistently documented around
  `config/portals.yml`
- remaining mentions of root-level `portals.yml` in this work file are
  intentional because they describe the migration decision and the completed
  cutover work

## Risks And Sharp Edges

- the biggest risk is partial contract drift: code updated but AGENTS, docs, or
  tests still referring to root-level `portals.yml`
- moving only the active file path but not the example file leaves an awkward
  split onboarding story
- a stale root-level `portals.yml` in a local clone could mislead maintainers
  if scripts silently ignore it without a clear message

## Recommendation

Implement this as a two-session cleanup with a hard cutover to
`config/portals.yml` and, in the same change set, move the example file to
`config/portals.example.yml`.

That gives the repo a cleaner long-term contract than keeping portal config as
the only user YAML file outside `config/`.
