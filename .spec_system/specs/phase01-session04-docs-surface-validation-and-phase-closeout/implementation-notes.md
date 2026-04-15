# Implementation Notes

**Session ID**: `phase01-session04-docs-surface-validation-and-phase-closeout`
**Started**: 2026-04-15 10:18
**Last Updated**: 2026-04-15 10:26

---

## Session Progress

| Metric              | Value   |
| ------------------- | ------- |
| Tasks Completed     | 20 / 20 |
| Estimated Remaining | 0 hours |
| Blockers            | 0       |

---

## Environment Verified

- [x] Prerequisites confirmed via `check-prereqs.sh --json --env`
- [x] Required tools confirmed: `node`, `npm`, `rg`, `bash`, `jq`, `git`
- [x] Current session resolved via `analyze-project.sh --json`
- [x] Session directory present with `spec.md` and `tasks.md`

## Baseline Audit

### Secondary Docs Surface

- `docs/README-docs.md` exposes setup, architecture, scripts, contributing,
  onboarding, development, environments, and deployment, but it does not map
  the final Phase 01 surfaces for support, customization, or legal and policy
  guidance.
- `docs/onboarding.md` still tells readers to run `npm run doctor` before
  creating `profile/cv.md`, `config/profile.yml`, and `portals.yml`, which conflicts
  with `README.md` and `docs/SETUP.md`.
- `docs/onboarding.md` links only to `SETUP.md` and `SCRIPTS.md`, leaving the
  user-layer data contract and customization guidance undiscoverable from this
  setup helper.
- `docs/development.md` lists common checks and a short notes section, but it
  does not route contributors to the authoritative contributing, support, and
  customization pages that Sessions 02 and 03 aligned.

### Reference Surface Used For Comparison

- `README.md` defines the canonical first-run order: install, copy example
  files, create `profile/cv.md`, then run `npm run doctor`, then launch `codex`.
- `docs/SETUP.md` matches that order and names the required user-layer files.
- `docs/CONTRIBUTING.md`, `docs/SUPPORT.md`, `docs/CUSTOMIZATION.md`, and
  `docs/LEGAL_DISCLAIMER.md` are the authoritative Phase 01 docs that the
  secondary surfaces need to expose cleanly.

## Residual Runtime-Reference Inventory

| File                                                 | Legacy Reference                                                                                                             | Owning Phase | Reason Deferred                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `batch/README-batch.md`                              | Docs still describe `claude -p` workers and require the `claude` CLI                                                         | Phase 02     | Batch runtime migration owns the worker runtime and operator docs                   |
| `batch/batch-runner.sh`                              | Usage text, prerequisite checks, and worker launch still require `claude -p`                                                 | Phase 02     | Runtime conversion belongs to the batch execution workstream                        |
| `modes/batch.md`                                     | Conductor and worker flow still models `claude -p` orchestration                                                             | Phase 02     | Batch-mode operating contract stays with the Phase 02 runtime rewrite               |
| `modes/oferta.md`                                    | Role-evaluation guidance still uses `WebSearch` wording                                                                      | Phase 03     | Mode prompt normalization owns legacy tool-name cleanup                             |
| `modes/contacto.md`                                  | Outreach guidance still uses `WebSearch` wording                                                                             | Phase 03     | Mode prompt normalization owns legacy tool-name cleanup                             |
| `modes/interview-prep.md`                            | Interview prep still asks for `WebSearch` queries                                                                            | Phase 03     | Mode prompt normalization owns legacy tool-name cleanup                             |
| `modes/_shared.md`                                   | Shared guidance still names `WebSearch`, `WebFetch`, and `browser_*` tools                                                   | Phase 03     | Shared prompt normalization is deferred out of the docs closeout phase              |
| `modes/_profile.md` and `modes/_profile.template.md` | Profile guidance still says to use `WebSearch` for market data                                                               | Phase 03     | Profile prompt wording belongs with the broader prompt cleanup pass                 |
| `modes/auto-pipeline.md` and `modes/pipeline.md`     | Extraction order still uses `browser_navigate`, `browser_snapshot`, `WebFetch`, and `WebSearch` names                        | Phase 03     | Pipeline-mode prompt normalization is later-phase prompt work                       |
| `modes/scan.md`                                      | Scan workflow still uses `WebSearch`, `WebFetch`, `browser_navigate`, `browser_snapshot`, and `/jobhunt pipeline` wording | Phase 03     | Scanner prompt normalization is out of scope for Phase 01 docs closeout             |
| `modes/apply.md` and `modes/followup.md`             | Next-step guidance still uses `/jobhunt ...` slash-command wording                                                        | Phase 03     | Workflow wording normalization belongs to the prompt cleanup phase                  |
| `scripts/scan.mjs`                                   | User-facing output still says `Run /jobhunt pipeline`                                                                     | Phase 03     | Runtime wording cleanup for helper output is not part of this docs sweep            |
| `batch/batch-prompt.md`                              | Batch prompt still names `WebFetch` and `WebSearch` explicitly                                                               | Phase 03     | Batch prompt normalization is deferred even though batch runtime itself is Phase 02 |
| `.github/ISSUE_TEMPLATE/bug_report.yml`              | CLI placeholder still suggests `Claude Code, OpenCode, Codex`                                                                | Phase 03     | Issue-template metadata cleanup remains outside the docs-owned scope                |

## Closeout Notes

### Final Docs Index Map

- `docs/README-docs.md` now exposes the Phase 01 docs surface through four
  sections: Start Here, Contributor and Support, Policy and Governance, and
  Reference.
- The docs index now includes direct links to setup, onboarding, data
  contract, customization, contributing, support, security, code of conduct,
  legal disclaimer, governance, and third-party connection guidance.

### Corrected Secondary Routes

- `docs/onboarding.md` now mirrors the canonical setup order from `README.md`
  and `docs/SETUP.md`: install, copy example files, create `profile/cv.md`, add
  optional proof points, run `npm run doctor`, then launch `codex`.
- `docs/onboarding.md` now routes readers directly to `docs/SETUP.md`,
  `docs/DATA_CONTRACT.md`, `docs/CUSTOMIZATION.md`, and `docs/SCRIPTS.md`.
- `docs/development.md` now routes contributors directly to
  `docs/CONTRIBUTING.md`, `docs/SUPPORT.md`, `docs/CUSTOMIZATION.md`, and
  `docs/DATA_CONTRACT.md` before listing common checks and reference docs.

### Remaining Low-Risk Items

- No new in-scope closeout items remain beyond the explicitly deferred
  Phase 02 and Phase 03 runtime-reference ledger above.

### Validation Expectations For Handoff

- `validate` should confirm the touched docs no longer tell users to run
  `npm run doctor` before creating the required user-layer files.
- `validate` should confirm the touched docs-local links resolve from within
  the `docs/` directory.
- `validate` should rerun `node scripts/test-all.mjs --quick` and carry the
  residual Phase 02 and Phase 03 ledger forward without reopening scope.

## Validation Summary

- Targeted `rg` checks show `docs/onboarding.md` now lists example-file copies
  and `profile/cv.md` creation before `npm run doctor`, matching `README.md` and
  `docs/SETUP.md`.
- A local markdown-link existence check passed for `README.md`,
  `docs/README-docs.md`, `docs/onboarding.md`, and `docs/development.md`.
- Manual review of the touched docs against `README.md`, `docs/SETUP.md`,
  `docs/CONTRIBUTING.md`, `docs/SUPPORT.md`, `docs/CUSTOMIZATION.md`, and
  `docs/LEGAL_DISCLAIMER.md` confirmed the routing and wording are aligned.
- `node scripts/test-all.mjs --quick` passed with 74 checks passed, 0 failed,
  and 0 warnings.
- `file` reports the touched docs and session notes as ASCII text, and the
  CRLF scan returned `NO_CRLF`.

---

## Contract Sources Reviewed

- `docs/prev-prd/PRD-codex-convert.md`
- `.spec_system/PRD/phase_01/PRD_phase_01.md`
- `.spec_system/PRD/phase_01/session_04_docs_surface_validation_and_phase_closeout.md`
- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/spec.md`
- `docs/CONVENTIONS.md`
- `docs/CONSIDERATIONS.md`
- `.spec_system/specs/phase01-session03-customization-and-policy-runtime-cleanup/IMPLEMENTATION_SUMMARY.md`

---

## Task Log

### 2026-04-15 - Session Start

**Environment verified**:

- [x] Prerequisites confirmed
- [x] Tools available
- [x] Directory structure ready

### Task T001 - Review the Phase 01 goals, Session 04 stub, and prior session handoff boundaries

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:18
**Duration**: 0 minutes

**Notes**:

- Reviewed the master PRD, Phase 01 PRD, Session 04 stub, Session 04 spec, and Session 03 closeout notes together.
- Confirmed this session stays limited to docs-surface closeout, cross-link alignment, and a residual drift ledger.
- Confirmed Phase 02 owns batch-runtime wording and Phase 03 owns prompt and metadata normalization.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - created the session-local implementation log

### Task T002 - Capture the live secondary-docs baseline and remaining runtime-drift inventory

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:18
**Duration**: 0 minutes

**Notes**:

- Captured the baseline drift in `docs/README-docs.md`, `docs/onboarding.md`, and `docs/development.md` against the aligned Phase 01 reference docs.
- Recorded the initial deferred runtime inventory for later classification so the closeout edits stay narrow.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - added the secondary-docs baseline and initial residual inventory

### Task T003 - Create the session notes scaffold for index fixes, residual phase handoff, and closeout evidence

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:18
**Duration**: 0 minutes

**Notes**:

- Structured the session notes around the exact closeout outputs required by the spec: baseline audit, residual inventory, closeout notes, validation summary, and a task-by-task log.
- Kept the notes format aligned with the prior session artifacts for consistent validation handoff.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - completed the session notes scaffold

### Task T004 - Verify the Phase 01 closeout objectives and later-phase ownership boundaries against the master PRD

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:18
**Duration**: 0 minutes

**Notes**:

- Verified in `docs/prev-prd/PRD-codex-convert.md` and `.spec_system/PRD/phase_01/PRD_phase_01.md` that Phase 01 owns docs and entrypoint alignment only.
- Confirmed batch-runtime conversion remains Phase 02 work and prompt and metadata normalization remains Phase 03 work.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the PRD boundary verification

### Task T005 - Verify the conventions and considerations that govern docs closeout, validator alignment, and explicit deferrals

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:18
**Duration**: 0 minutes

**Notes**:

- Verified in `docs/CONVENTIONS.md` that docs changes should stay anchored to live repo paths, remove drift, and validate with `node scripts/test-all.mjs --quick`.
- Verified in `docs/CONSIDERATIONS.md` that residual legacy references must remain explicitly deferred and that the validator surface and no-telemetry posture must stay intact.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the conventions and considerations review

### Task T006 - Audit the docs index surface for missing Phase 01 pages and weak routing paths

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:18
**Duration**: 0 minutes

**Notes**:

- Audited `docs/README-docs.md` against the aligned Phase 01 docs and confirmed it is missing direct routes to support, customization, and legal or policy pages.
- Confirmed the current docs index needs a stronger "start here" structure so readers can discover the final Phase 01 docs set from one entrypoint.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the docs index audit

### Task T007 - Audit secondary docs surfaces for stale onboarding order and incomplete routing guidance

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:18
**Duration**: 0 minutes

**Notes**:

- Audited `docs/onboarding.md` against `README.md` and `docs/SETUP.md` and confirmed the checklist still places `npm run doctor` before the required user-layer files exist.
- Confirmed the onboarding helper needs explicit routes to setup, data-contract, and customization guidance so the setup path does not dead-end on a short checklist.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the onboarding audit

### Task T008 - Audit repo-wide residual runtime references and classify each finding into Phase 02 or Phase 03 ownership

**Started**: 2026-04-15 10:18
**Completed**: 2026-04-15 10:20
**Duration**: 2 minutes

**Notes**:

- Ran targeted repo-wide `rg` scans across `batch/`, `modes/`, `.github/`, `docs/`, `scripts/`, and the prior residual report to identify unresolved runtime references.
- Classified batch-runtime execution files under Phase 02 and prompt or metadata wording drift under Phase 03, including the one split case in `batch/batch-prompt.md`.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - replaced the placeholder residual inventory with a file-level Phase 02 and Phase 03 ledger

### Task T009 - Expand the docs index so the final Phase 01 surfaces are discoverable from one entrypoint

**Started**: 2026-04-15 10:22
**Completed**: 2026-04-15 10:22
**Duration**: 0 minutes

**Notes**:

- Expanded `docs/README-docs.md` into audience-based sections for setup, contributor support, policy, and reference material.
- Added direct routes to support, customization, data contract, legal, security, and code-of-conduct pages without reopening the already aligned docs themselves.

**Files Changed**:

- `docs/README-docs.md` - expanded the docs map to expose the full Phase 01 docs surface
- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the docs index update

### Task T010 - Reorder the onboarding checklist so required user-layer files are created before `npm run doctor`

**Started**: 2026-04-15 10:22
**Completed**: 2026-04-15 10:22
**Duration**: 0 minutes

**Notes**:

- Reordered `docs/onboarding.md` so the setup helper now mirrors `README.md` and `docs/SETUP.md`: copy examples, create `profile/cv.md`, optionally add `article-digest.md`, then run `npm run doctor`.
- Kept the checklist lightweight while matching the live validator contract.

**Files Changed**:

- `docs/onboarding.md` - corrected the onboarding sequence so validation happens after required files exist
- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the onboarding order fix

### Task T011 - Tighten onboarding links to the authoritative setup, data-contract, and customization docs

**Started**: 2026-04-15 10:22
**Completed**: 2026-04-15 10:22
**Duration**: 0 minutes

**Notes**:

- Added direct links from `docs/onboarding.md` to `docs/SETUP.md`, `docs/DATA_CONTRACT.md`, `docs/CUSTOMIZATION.md`, and `docs/SCRIPTS.md`.
- This keeps the onboarding helper as a short checklist while routing readers to the authoritative docs for details and personalization.

**Files Changed**:

- `docs/onboarding.md` - added the authoritative setup, data-contract, customization, and scripts routes
- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the onboarding link update

### Task T012 - Refresh development references so contributors can reach the current contributing, support, and customization surfaces

**Started**: 2026-04-15 10:22
**Completed**: 2026-04-15 10:22
**Duration**: 0 minutes

**Notes**:

- Expanded `docs/development.md` into a contributor routing page with direct links to contributing, customization, support, and the data contract.
- Added `node scripts/test-all.mjs --quick` to the common checks so the page matches the repo's baseline validation guidance.

**Files Changed**:

- `docs/development.md` - refreshed contributor routes and common validation references
- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - logged the development page refresh

### Task T013 - Record the final docs index map and corrected secondary-doc routes in session notes

**Started**: 2026-04-15 10:24
**Completed**: 2026-04-15 10:24
**Duration**: 0 minutes

**Notes**:

- Captured the final docs index structure and the corrected onboarding and development routes in the closeout section above.
- Kept the notes focused on the touched routing surfaces rather than restating already aligned Phase 01 docs.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - recorded the final docs map and route corrections

### Task T014 - Record the residual runtime-reference inventory with explicit Phase 02 versus Phase 03 ownership in session notes

**Started**: 2026-04-15 10:24
**Completed**: 2026-04-15 10:24
**Duration**: 0 minutes

**Notes**:

- Finalized the residual ledger in a file-level table that splits Phase 02 batch-runtime work from Phase 03 prompt and metadata normalization.
- Kept the deferred inventory visible in the session artifact so later phases inherit concrete file targets instead of rediscovering drift.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - finalized the Phase 02 and Phase 03 handoff ledger

### Task T015 - Record the Phase 01 closeout notes, unresolved low-risk items, and validation expectations for handoff

**Started**: 2026-04-15 10:24
**Completed**: 2026-04-15 10:24
**Duration**: 0 minutes

**Notes**:

- Recorded the closeout rationale, the absence of new in-scope residual items, and the exact checks the `validate` step should run next.
- Kept the handoff aligned with the spec by treating the deferred Phase 02 and Phase 03 ledger as the only remaining runtime drift.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - added the final closeout and validation handoff notes

### Task T016 - Run targeted `rg` checks so touched docs no longer tell users to run `npm run doctor` before required files exist

**Started**: 2026-04-15 10:25
**Completed**: 2026-04-15 10:25
**Duration**: 0 minutes

**Notes**:

- Ran targeted `rg` checks across `docs/onboarding.md`, `README.md`, and `docs/SETUP.md` for the setup-order terms.
- Confirmed the touched onboarding helper now shows example-file copies and `profile/cv.md` creation before `npm run doctor`.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - recorded the targeted grep validation

### Task T017 - Run a local markdown-link existence check across the touched README/docs surfaces

**Started**: 2026-04-15 10:25
**Completed**: 2026-04-15 10:25
**Duration**: 0 minutes

**Notes**:

- Ran a local Node-based markdown-link existence check against `README.md`, `docs/README-docs.md`, `docs/onboarding.md`, and `docs/development.md`.
- The local-link check returned `OK`, with no missing relative targets.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - recorded the local link-check result

### Task T018 - Manually review the docs index and secondary pages against the established Phase 01 reference surfaces

**Started**: 2026-04-15 10:25
**Completed**: 2026-04-15 10:25
**Duration**: 0 minutes

**Notes**:

- Reread the touched docs beside `README.md`, `docs/SETUP.md`,
  `docs/CONTRIBUTING.md`, `docs/SUPPORT.md`, `docs/CUSTOMIZATION.md`, and
  `docs/LEGAL_DISCLAIMER.md`.
- Confirmed the docs index exposes the final Phase 01 surfaces and the two
  secondary routing pages now point to the authoritative setup,
  contributor-support, and customization guidance.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - recorded the manual review outcome

### Task T019 - Run `node scripts/test-all.mjs --quick` and confirm the closeout edits keep the repo validator green

**Started**: 2026-04-15 10:25
**Completed**: 2026-04-15 10:26
**Duration**: 1 minute

**Notes**:

- Ran `node scripts/test-all.mjs --quick`.
- The repo gate passed with 74 checks passed, 0 failed, and 0 warnings.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - recorded the quick-test result

### Task T020 - Validate ASCII encoding and Unix LF line endings across the touched docs and session notes

**Started**: 2026-04-15 10:26
**Completed**: 2026-04-15 10:26
**Duration**: 0 minutes

**Notes**:

- Ran `file -b` on `docs/README-docs.md`, `docs/onboarding.md`,
  `docs/development.md`, and this implementation-notes file; each reports
  `ASCII text`.
- Ran a CRLF scan across the same files and the result was `NO_CRLF`.

**Files Changed**:

- `.spec_system/specs/phase01-session04-docs-surface-validation-and-phase-closeout/implementation-notes.md` - recorded the encoding and line-ending validation
