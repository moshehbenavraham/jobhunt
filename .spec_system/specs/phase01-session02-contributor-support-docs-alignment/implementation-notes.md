# Implementation Notes

**Session ID**: `phase01-session02-contributor-support-docs-alignment`
**Started**: 2026-04-15 09:39
**Last Updated**: 2026-04-15 09:45

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 20 / 20 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

---

## Task Log

### Task T001 - Review the Phase 01 goals, Session 02 stub, Session 01 handoff, and phase ownership boundaries

**Started**: 2026-04-15 09:39
**Completed**: 2026-04-15 09:39
**Duration**: 1 minute

**Notes**:

- Reviewed the Session 02 stub, Session 02 spec, and Session 01 handoff summary to confirm this session is limited to contributor and support docs.
- Confirmed Session 01 already owns public onboarding in `README.md` and `docs/SETUP.md`, while Session 03 and later phases still own customization, policy, batch, and metadata cleanup.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged phase boundary confirmation and prior-session handoff context

### Task T002 - Capture the live contributor and support docs baseline plus drift inventory from root and docs surfaces

**Started**: 2026-04-15 09:39
**Completed**: 2026-04-15 09:39
**Duration**: 1 minute

**Notes**:

- Captured the live root contributor entrypoint as a short pointer plus four quick rules, with no explicit setup or support routing.
- Captured `docs/CONTRIBUTING.md` as the detailed contributor guide with current checks `npm run doctor`, `npm run sync-check`, and `npm run verify`, but without enough framing for the active Codex workflow.
- Captured `docs/SUPPORT.md` drift: it asks reporters to name a generic CLI, uses broken docs-local links to `docs/SETUP.md` and `SECURITY.md`, and does not ask for the repo-specific diagnostics already exposed by the validator surface.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - recorded the live contributor/support baseline and drift inventory

### Task T003 - Create the session notes scaffold for contributor/support wording decisions, corrected links, and deferred findings

**Started**: 2026-04-15 09:39
**Completed**: 2026-04-15 09:39
**Duration**: 1 minute

**Notes**:

- Created the session-local implementation notes scaffold with progress metrics, environment verification, and a durable task log.
- Reserved this file for the final wording decisions, corrected link map, and deferred follow-up items after the docs edits and validation runs.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - created the session notes scaffold and initial progress structure

### Task T004 - Verify the live validation command surface and command names exposed through package.json

**Started**: 2026-04-15 09:39
**Completed**: 2026-04-15 09:39
**Duration**: 1 minute

**Notes**:

- Confirmed `package.json` exposes `doctor`, `sync-check`, `verify`, `merge`, `pdf`, `scan`, `update:check`, `update`, `rollback`, and `liveness`.
- Confirmed the contributor/support docs for this session should reference the live validation path as `npm run doctor`, `npm run sync-check`, and `npm run verify`, with `codex` as the interactive runtime entrypoint.
- Noted that `node scripts/test-all.mjs --quick` is a direct repo test gate cited by the session spec even though it is not wrapped by an npm script.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the live command surface used by contributor and support docs

### Task T005 - Verify the current setup, scripts, architecture, and security docs targets that contributor/support pages should link to

**Started**: 2026-04-15 09:39
**Completed**: 2026-04-15 09:39
**Duration**: 1 minute

**Notes**:

- Reviewed `docs/SETUP.md`, `docs/SCRIPTS.md`, `docs/ARCHITECTURE.md`, and `docs/SECURITY.md` from their live repo locations.
- Confirmed docs inside `docs/` must link with same-directory targets such as `SETUP.md`, `SCRIPTS.md`, `ARCHITECTURE.md`, and `SECURITY.md` rather than repo-root-relative paths.
- Confirmed the setup guide now carries the canonical clone-to-`codex` path from Session 01, while the scripts and architecture references are the right destinations for deeper contributor detail.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the verified docs targets and relative-link rules

### Task T006 - Map the root contributor entrypoint to the detailed guide and the intended support escalation path

**Started**: 2026-04-15 09:39
**Completed**: 2026-04-15 09:39
**Duration**: 1 minute

**Notes**:

- Confirmed root `CONTRIBUTING.md` should remain a thin entrypoint that points to `docs/CONTRIBUTING.md` for the full workflow.
- Mapped the desired quick path as contributor guide first, setup guide for environment problems, and support guide for routing setup, bug, feature, and security help after a contributor has followed the documented workflow.
- Preserved the intentionally shorter depth of root `CONTRIBUTING.md` so it does not become a second full guide.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - recorded the intended entrypoint and escalation path

### Task T007 - Map contributor and support wording drift, including stale runtime language and broken docs-local relative links

**Started**: 2026-04-15 09:39
**Completed**: 2026-04-15 09:39
**Duration**: 1 minute

**Notes**:

- Confirmed `docs/SUPPORT.md` still asks for "the CLI you're using (Claude Code, OpenCode, etc.)", which conflicts with the Codex-primary runtime contract.
- Confirmed `docs/SUPPORT.md` uses broken docs-local links: `docs/SETUP.md` should be `SETUP.md`, and `SECURITY.md` must be linked relative to the `docs/` directory.
- Confirmed contributor wording drift is softer: `docs/CONTRIBUTING.md` already names the right validation commands, but it needs clearer Codex-primary framing, link hygiene, and explicit support routing.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the concrete wording drift and link breakage to fix in this session

### Task T008 - Refresh the root contributor entrypoint so it stays concise, Codex-primary, and consistent with the docs guide

**Started**: 2026-04-15 09:40
**Completed**: 2026-04-15 09:40
**Duration**: 1 minute

**Notes**:

- Kept root `CONTRIBUTING.md` as a thin entrypoint, but added explicit Codex-primary framing so the runtime contract matches the detailed guide.
- Added direct routing to `docs/SETUP.md` and `docs/SUPPORT.md` so the short root entrypoint still sends contributors to the correct next surface when they are not ready to submit code yet.

**Files Changed**:

- `CONTRIBUTING.md` - added concise Codex-primary framing plus setup and support routing
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the root contributor entrypoint update

### Task T009 - Rewrite the docs/CONTRIBUTING.md introduction and pre-submit guidance around the live Codex workflow

**Started**: 2026-04-15 09:41
**Completed**: 2026-04-15 09:42
**Duration**: 1 minute

**Notes**:

- Reframed the contributor guide around the live Codex workflow, naming `codex`, `AGENTS.md`, checked-in skills, and repo-owned scripts as the active path.
- Added explicit contributor workflow guidance so the guide explains when to stop and use the setup path instead of assuming every contributor is already fully configured.

**Files Changed**:

- `docs/CONTRIBUTING.md` - rewrote the introduction, pre-change guidance, and contributor workflow sections around the live Codex runtime
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the contributor guide runtime-framing update

### Task T010 - Update contributor validation guidance with the current repo checks and when contributors should run them

**Started**: 2026-04-15 09:41
**Completed**: 2026-04-15 09:42
**Duration**: 1 minute

**Notes**:

- Replaced the unlabeled checks block with a validation guide that explains when contributors should run `npm run doctor`, `npm run sync-check`, `npm run verify`, and `node scripts/test-all.mjs --quick`.
- Kept the guidance tied to the live command surface already exposed by the repo instead of inventing new helper commands.

**Files Changed**:

- `docs/CONTRIBUTING.md` - added the validation guide and preserved the command block for quick copy/paste use
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the contributor validation guidance update

### Task T011 - Tighten contributor cross-links to setup, architecture, and scripts docs from the correct relative paths

**Started**: 2026-04-15 09:41
**Completed**: 2026-04-15 09:42
**Duration**: 1 minute

**Notes**:

- Replaced the old help section with a references section that points to `SETUP.md`, `ARCHITECTURE.md`, `SCRIPTS.md`, `SUPPORT.md`, and `SECURITY.md` from the correct docs-local paths.
- Preserved `docs/CONTRIBUTING.md` as the detailed contributor guide without duplicating the content owned by those linked documents.

**Files Changed**:

- `docs/CONTRIBUTING.md` - corrected and expanded the docs-local reference links
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the contributor cross-link cleanup

### Task T012 - Rewrite docs/SUPPORT.md help-routing table and pre-issue checklist to match the Codex-primary runtime

**Started**: 2026-04-15 09:43
**Completed**: 2026-04-15 09:44
**Duration**: 1 minute

**Notes**:

- Reframed the support guide around the live Codex-primary workflow and split help requests by setup, bug, feature, contributor workflow, and security routing.
- Replaced the generic support wording with actionable pre-issue steps tied to the repo's existing validator and test surfaces.

**Files Changed**:

- `docs/SUPPORT.md` - rewrote the help-routing table and pre-issue checklist around the live support paths
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the support routing rewrite

### Task T013 - Update docs/SUPPORT.md requested diagnostics so setup and bug reports ask for actionable environment details

**Started**: 2026-04-15 09:43
**Completed**: 2026-04-15 09:44
**Duration**: 1 minute

**Notes**:

- Replaced the stale request for a generic CLI name with concrete diagnostics: OS, Node version, install status, exact command, relevant validation output, and a short repro.
- Added privacy guardrails so reporters are told not to paste user-layer data, generated personal artifacts, or secrets into public channels.

**Files Changed**:

- `docs/SUPPORT.md` - updated the requested diagnostics and local-first privacy guidance
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the support diagnostics update

### Task T014 - Fix docs/SUPPORT.md docs-local links for setup and security help from the perspective of the docs directory

**Started**: 2026-04-15 09:43
**Completed**: 2026-04-15 09:44
**Duration**: 1 minute

**Notes**:

- Corrected the support guide's docs-local links so the setup and security references resolve from inside `docs/`.
- Preserved external GitHub support link while removing the broken `docs/SETUP.md` target.

**Files Changed**:

- `docs/SUPPORT.md` - fixed the docs-local setup and security links
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - logged the support link corrections

## Final Wording Decisions

- Root `CONTRIBUTING.md` stays a thin entrypoint and now routes readers to the
  detailed contributor, setup, and support docs without duplicating deeper
  process text.
- `docs/CONTRIBUTING.md` is the authoritative contributor guide for the live
  Codex workflow, including when to run `npm run doctor`,
  `npm run sync-check`, `npm run verify`, and
  `node scripts/test-all.mjs --quick`.
- `docs/SUPPORT.md` is now a routing and diagnostics document that asks for
  repo-specific environment details and avoids generic multi-CLI prompts.

## Corrected Link Map

| Source                 | Target                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| `CONTRIBUTING.md`      | `docs/CONTRIBUTING.md`, `docs/SETUP.md`, `docs/SUPPORT.md`               |
| `docs/CONTRIBUTING.md` | `SETUP.md`, `ARCHITECTURE.md`, `SCRIPTS.md`, `SUPPORT.md`, `SECURITY.md` |
| `docs/SUPPORT.md`      | `SETUP.md`, `CONTRIBUTING.md`, `SECURITY.md`                             |

## Deferred Findings

- Customization, policy, and broader runtime cleanup remain owned by Phase 01
  Session 03.
- Batch-runtime wording, issue-template normalization, and broader metadata
  cleanup remain out of scope for this session.
- The repo gate exposed package-lock version drift unrelated to the docs text;
  this session fixed the minimal lockfile mismatch so the required regression
  suite could pass cleanly.

### Task T015 - Record the final wording decisions, corrected link map, and deferred follow-up items in session notes

**Started**: 2026-04-15 09:45
**Completed**: 2026-04-15 09:45
**Duration**: 1 minute

**Notes**:

- Recorded the final wording decisions for the root contributor entrypoint,
  the authoritative contributor guide, and the support diagnostics surface.
- Added a corrected link map and explicit deferred-scope notes so later
  sessions can continue cleanup without reopening these docs.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - added the final wording decisions, corrected link map, and deferred findings

### Task T016 - Run targeted rg checks across touched docs for stale alternate-runtime wording and broken internal link targets

**Started**: 2026-04-15 09:44
**Completed**: 2026-04-15 09:45
**Duration**: 1 minute

**Notes**:

- Ran targeted `rg` checks across `CONTRIBUTING.md`, `docs/CONTRIBUTING.md`,
  and `docs/SUPPORT.md` for `claude`, `opencode`, and broken docs-local paths.
- Confirmed there were no stale alternate-runtime hits in the touched docs.
- Confirmed there were no `docs/SETUP.md` or `docs/SECURITY.md` references
  left inside the `docs/` surfaces, and the expected relative links to
  `SETUP.md`, `ARCHITECTURE.md`, `SCRIPTS.md`, `SUPPORT.md`, and
  `SECURITY.md` are present.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - recorded the clean `rg` scans for runtime wording and link targets

### Task T017 - Run npm run doctor and confirm the support/setup guidance still matches live behavior

**Started**: 2026-04-15 09:44
**Completed**: 2026-04-15 09:44
**Duration**: 1 minute

**Notes**:

- Ran `npm run doctor` successfully after the docs edits.
- Confirmed the setup and support guidance still matches the live validator
  behavior for Node.js, dependencies, Playwright Chromium, `profile/cv.md`,
  `config/profile.yml`, `portals.yml`, fonts, and the auto-created output
  directories.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - recorded the passing doctor validation run

### Task T018 - Run node scripts/test-all.mjs --quick and confirm the docs updates do not regress the repo gate

**Started**: 2026-04-15 09:44
**Completed**: 2026-04-15 09:45
**Duration**: 1 minute

**Notes**:

- Ran `node scripts/test-all.mjs --quick` and initially found pre-existing
  version drift: `package-lock.json` still reported `1.5.7` while `VERSION`
  and `package.json` already reported `1.5.8`.
- Updated the two lockfile version fields to `1.5.8`, reran the suite, and
  confirmed the repo gate finished with `74 passed, 0 failed, 0 warnings`.
- Confirmed the validator runtime contract test still points successful doctor
  output at `codex`.

**Files Changed**:

- `package-lock.json` - aligned the lockfile version metadata with `VERSION` and `package.json` so the repo gate passes
- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - recorded the quick-suite failure, minimal fix, and passing rerun

### Task T019 - Manually review the path from onboarding to contributing to support and confirm the cross-links and escalation guidance are consistent

**Started**: 2026-04-15 09:45
**Completed**: 2026-04-15 09:45
**Duration**: 1 minute

**Notes**:

- Read `CONTRIBUTING.md`, `docs/CONTRIBUTING.md`, and `docs/SUPPORT.md` in
  order and confirmed the path is coherent: root entrypoint -> detailed guide
  -> setup/support routing as needed.
- Confirmed the setup path still points into `docs/SETUP.md`, the contributor
  guide carries the live validation surface, and the support guide routes
  setup, bug, feature, workflow, and security requests cleanly.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - recorded the final manual read-through result

### Task T020 - Validate ASCII encoding and Unix LF line endings across the touched docs and session notes

**Started**: 2026-04-15 09:45
**Completed**: 2026-04-15 09:45
**Duration**: 1 minute

**Notes**:

- Ran ASCII validation across the touched docs, tasks, and session notes and
  got `ASCII_OK`.
- Ran CRLF detection across the same files and got `LF_OK`.

**Files Changed**:

- `.spec_system/specs/phase01-session02-contributor-support-docs-alignment/implementation-notes.md` - recorded the ASCII and line-ending validation results
