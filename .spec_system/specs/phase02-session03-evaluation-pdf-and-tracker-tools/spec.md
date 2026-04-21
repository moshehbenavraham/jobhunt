# Session Specification

**Session ID**: `phase02-session03-evaluation-pdf-and-tracker-tools`
**Phase**: 02 - Typed Tools and Agent Orchestration
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 02 Session 01 created the typed tool registry, execution envelopes,
script adapter, and workspace mutation boundary. Session 02 then exposed the
first default startup and onboarding tool catalog. What the backend still lacks
is the evaluation-to-artifact tool surface that later parity phases and router
work depend on for real workflow execution.

This session adds the core evaluation, PDF, report-artifact, and
tracker-integrity tools in `apps/api`. The goal is to let later workflows
accept a job URL or pasted JD, bootstrap the correct prompt workflow, generate
or inspect the report and PDF artifacts, and preserve the existing TSV-first
tracker discipline without falling back to raw shell orchestration.

This is the correct next session because Session 04 depends on these
evaluation, PDF, and tracker primitives before scan or batch tools can reuse
them, and Session 05 depends on them before router or specialist agents can
compose higher-level workflow plans. The Phase 02 session state also needed to
be repaired so the spec system reflects the already-completed Session 02 work
before planning Session 03.

---

## 2. Objectives

1. Expose typed backend tools for ATS URL extraction, raw JD intake, and
   prompt-workflow bootstrap for `single-evaluation` and `auto-pipeline`.
2. Add typed artifact tools for report writing and discovery plus ATS PDF
   generation with repo-relative path validation.
3. Add tracker-safe tools for TSV staging and the merge, verify, normalize,
   and dedup closeout path without bypassing existing repo rules.
4. Register the Session 03 tool suite and default script allowlist in the
   shared runtime, then validate the full evaluation-to-artifact contract with
   package and repo gates.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session02-workspace-adapter-contract` - provides the workspace
      boundary and guarded mutation rules that artifact and tracker tools must
      reuse.
- [x] `phase00-session03-prompt-loading-contract` - provides workflow routing
      and prompt-source resolution for `single-evaluation` and
      `auto-pipeline`.
- [x] `phase01-session03-agent-runtime-bootstrap` - provides authenticated
      prompt bootstrap and provider readiness that evaluation workflow tools
      must surface deterministically.
- [x] `phase02-session01-tool-registry-and-execution-policy` - provides the
      typed tool execution, script allowlist, and approval-aware runtime
      envelopes this session builds on.
- [x] `phase02-session02-workspace-and-startup-tool-suite` - provides the
      default tool-suite registration pattern and workspace inspection helpers
      this session extends.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic script behavior, repo-root
  path rules, and validation expectations
- `.spec_system/CONSIDERATIONS.md` for registry-first contracts, boot drift,
  and validator-first closeout guidance
- `docs/WORKFLOW_CHECKLIST.md` for the canonical evaluate -> report -> PDF ->
  tracker flow
- `scripts/extract-job.mjs`, `scripts/generate-pdf.mjs`,
  `scripts/merge-tracker.mjs`, and `scripts/verify-pipeline.mjs` as the
  existing durable workflow building blocks
- `templates/states.yml`, `reports/`, `output/`, and `batch/tracker-additions/`
  as the live artifact contract surfaces

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- Playwright Chromium available through the repo dependency stack for PDF
  generation
- `apps/api` build, tool tests, runtime tests, and boot smoke runnable from the
  repo root
- Fixture-friendly temp workspaces available for report, PDF, and tracker-path
  validation

---

## 4. Scope

### In Scope (MVP)

- Backend tools can accept a supported ATS URL or raw JD input and normalize it
  into deterministic evaluation input data.
- Backend tools can bootstrap the `single-evaluation` and `auto-pipeline`
  prompt workflows without executing raw shell commands or leaking provider
  errors.
- Backend tools can reserve, write, and list report and PDF artifacts using
  canonical repo-relative paths and the guarded workspace mutation contract.
- Backend tools can stage tracker TSV additions and run merge, verify,
  normalize, and dedup helpers through an allowlisted script surface.
- The shared API service container exposes these Session 03 tools and default
  script definitions by default.

### Out of Scope (Deferred)

- Scan, pipeline-review, and batch orchestration tools - _Reason: Session 04
  owns the scan, pipeline, and batch tool suite._
- Router and specialist-agent composition - _Reason: Session 05 owns agent
  routing and specialist topology._
- Operator-facing report or tracker UI - _Reason: later parity phases own the
  user-facing surfaces._
- Live application help, outreach, interview prep, and other specialist
  workflows - _Reason: those remain in later phases._

---

## 5. Technical Approach

### Architecture

Extend the default `apps/api` tool catalog with Session 03 modules that cover
evaluation intake, workflow bootstrap, report artifacts, PDF generation, and
tracker closeout. Use the existing tool execution service as the single entry
point, and add a default script allowlist for repo-owned commands such as
`extract-job`, `generate-pdf`, `merge-tracker`, `verify-pipeline`,
`normalize-statuses`, and `dedup-tracker`.

Evaluation intake should stay deterministic. Supported ATS URLs should route
through the script adapter and normalize the extracted JSON into a stable tool
result. Raw JD text should bypass ATS extraction and still produce a typed
evaluation payload. Prompt-workflow tools should reuse the agent-runtime
bootstrap service so auth-required, prompt-missing, and unsupported-workflow
states map onto explicit backend envelopes instead of ad hoc provider errors.

Artifact tools should not guess paths at runtime. Extend the workspace
registry with report and tracker-addition ownership so report writes, TSV
staging, and artifact discovery stay repo-relative and policy-aware. PDF
generation should wrap the existing Playwright script through the allowlisted
script adapter, and tracker closeout tools should preserve the current
merge-then-verify discipline while exposing warnings and deterministic failure
codes.

### Design Patterns

- Default script allowlist: keep repo-script execution explicit and
  registry-backed instead of open-ended shell dispatch.
- Split intake from artifact writes: normalize evaluation input before
  generating any report, PDF, or tracker side effects.
- Artifact path contracts: reserve and validate canonical repo-relative paths
  before writing reports, PDFs, or tracker TSVs.
- Tracker-closeout reuse: wrap merge, verify, normalize, and dedup through the
  same typed execution surface rather than copying their semantics.
- Metadata-only observability: record tool lifecycle data without persisting
  raw prompt, report, or PDF contents.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing `zod` dependency for tool input and output schemas
- Existing agent-runtime bootstrap service for prompt workflow readiness
- Existing script adapter and workspace mutation adapter from Session 01
- Existing Playwright-backed PDF script and tracker maintenance scripts in the
  repo

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/tools/default-tool-scripts.ts` | Define the default script allowlist for evaluation, PDF, and tracker commands | ~80 |
| `apps/api/src/tools/evaluation-intake-tools.ts` | Define ATS URL extraction and raw JD intake tools | ~180 |
| `apps/api/src/tools/evaluation-workflow-tools.ts` | Define workflow bootstrap tools for `single-evaluation` and `auto-pipeline` | ~180 |
| `apps/api/src/tools/evaluation-artifact-tools.ts` | Define report path reservation, report writes, and artifact discovery tools | ~220 |
| `apps/api/src/tools/pdf-generation-tools.ts` | Define ATS PDF generation tools backed by the allowlisted script adapter | ~180 |
| `apps/api/src/tools/tracker-integrity-tools.ts` | Define tracker TSV staging and merge or verify maintenance tools | ~220 |
| `apps/api/src/tools/evaluation-intake-tools.test.ts` | Cover ATS extraction, raw JD intake, and deterministic error mapping | ~170 |
| `apps/api/src/tools/evaluation-workflow-tools.test.ts` | Cover prompt bootstrap readiness, auth failures, and workflow routing | ~170 |
| `apps/api/src/tools/evaluation-artifact-tools.test.ts` | Cover report-path validation, writes, and artifact discovery ordering | ~200 |
| `apps/api/src/tools/pdf-generation-tools.test.ts` | Cover PDF tool input validation and script-dispatch behavior | ~160 |
| `apps/api/src/tools/tracker-integrity-tools.test.ts` | Cover TSV staging, merge or verify dispatch, and warning propagation | ~220 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/workspace/workspace-types.ts` | Add artifact and tracker-addition surface metadata used by Session 03 tools | ~80 |
| `apps/api/src/workspace/workspace-contract.ts` | Register canonical report and tracker-addition ownership and mutation targets | ~120 |
| `apps/api/src/workspace/workspace-boundary.ts` | Enforce the new tracker-addition and report-artifact authorization rules | ~60 |
| `apps/api/src/workspace/workspace-summary.ts` | Keep internal artifact surfaces out of startup summaries where appropriate | ~30 |
| `apps/api/src/tools/default-tool-suite.ts` | Register the Session 03 evaluation, PDF, and tracker tools in the default catalog | ~40 |
| `apps/api/src/tools/index.ts` | Export the Session 03 tool modules and default script definitions | ~20 |
| `apps/api/src/runtime/service-container.ts` | Merge the default Session 03 script allowlist into the shared tool execution service | ~40 |
| `apps/api/src/runtime/service-container.test.ts` | Verify default tool and script registration plus reuse semantics | ~120 |
| `apps/api/README_api.md` | Document evaluation, PDF, and tracker tool boundaries and validation commands | ~60 |
| `scripts/test-all.mjs` | Add ASCII and quick-suite coverage for the Session 03 tool files | ~40 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Backend tools can normalize a supported ATS URL or raw JD text into a
      deterministic evaluation input payload.
- [ ] Backend tools can bootstrap `single-evaluation` and `auto-pipeline`
      workflows through the authenticated agent-runtime contract with explicit
      auth and prompt failure mapping.
- [ ] Backend tools can reserve, write, and discover report artifacts and
      invoke ATS PDF generation through validated repo-relative paths.
- [ ] Backend tools can stage tracker TSV additions and run merge, verify,
      normalize, and dedup helpers without bypassing the tracked repo contract.
- [ ] The shared API service container exposes the Session 03 tool catalog and
      default script allowlist by default.

### Testing Requirements

- [ ] Package tests cover ATS extraction, raw JD fallback, workflow bootstrap
      failures, report-path validation, PDF tool dispatch, and tracker closeout
      warning or error mapping.
- [ ] Runtime tests verify the default Session 03 tool catalog and script
      allowlist are available through the shared service container.
- [ ] `npm run app:api:test:tools`, `npm run app:api:test:runtime`,
      `npm run app:api:build`, `npm run app:boot:test`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Script-backed tools expose deterministic stdout or stderr mapping and do
      not allow arbitrary script execution.
- [ ] Report, PDF, and tracker writes stay repo-relative, approval-aware, and
      free of partial-write drift on failure.
- [ ] Observability remains metadata-only and does not persist raw report
      contents, prompt contents, or PDF bytes.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] All new tool modules have direct test coverage
- [ ] `scripts/test-all.mjs --quick` covers the new Session 03 files

---

## 8. Implementation Notes

### Key Considerations

- The repo does not have a single monolithic evaluation script, so the session
  should split input normalization, prompt bootstrap, artifact writes, and
  tracker closeout into explicit backend tools instead of hiding them behind one
  opaque command.
- Tracker additions must remain TSV-first and merge-then-verify; direct edits
  to `data/applications.md` stay out of scope for individual evaluation tools.
- Default script names and timeout behavior must stay in sync with the checked-
  in repo scripts or the allowlist will drift.

### Potential Challenges

- Missing agent auth or prompt prerequisites: map bootstrap failures onto
  stable tool envelopes before any artifact write is attempted.
- Report or tracker path collisions: reserve canonical repo-relative paths and
  reject conflicting writes instead of silently overwriting them.
- Script-backed closeout warnings: surface merge or verify warnings without
  collapsing the whole tool result into a generic failure when recovery is still
  possible.

### Relevant Considerations

- [P00] **Prompt and boot contract drift**: keep `scripts/test-app-scaffold.mjs`
  and `scripts/test-all.mjs` aligned when Session 03 extends the default tool
  surface.
- [P00-apps/api] **Workspace registry coupling**: add report and
  tracker-addition ownership through the checked-in workspace registry instead
  of ad hoc path checks.
- [P00] **Registry-first contracts**: default tool registration and script
  allowlists should stay explicit and auditable.
- [P00] **Validator-first closeout**: package validation and repo quick-suite
  coverage should land in the same session as the new tool files.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- Duplicate report or tracker writes when a tool is retried after partial
  progress.
- Auth, prompt, or ATS extraction failures surfacing too late, after artifact
  paths have already been reserved or written.
- Script timeout or tracker-verify failures leaving operators without a clear
  recovery path or warning envelope.

---

## 9. Testing Strategy

### Unit Tests

- Validate ATS extraction, raw JD intake, and unsupported-host behavior.
- Validate workflow bootstrap tool mapping for auth-required, prompt-missing,
  prompt-empty, and unsupported-workflow states.
- Validate report-path reservation, report writes, PDF dispatch inputs, and TSV
  staging semantics.

### Integration Tests

- Verify the shared service container exposes the Session 03 default tool
  catalog and script allowlist together.
- Exercise tracker closeout tools against fixture workspaces that contain
  `reports/`, `output/`, `batch/tracker-additions/`, and
  `data/applications.md`.
- Verify `node scripts/test-all.mjs --quick` covers the new Session 03 files.

### Manual Testing

- Run a fixture-backed supported ATS URL through intake, workflow bootstrap,
  report write, PDF generation, tracker TSV staging, and merge or verify.
- Run a raw JD input through the same path without ATS extraction.
- Confirm failed bootstrap and closeout cases return explicit tool envelopes
  without hidden writes.

### Edge Cases

- Supported ATS URL with extraction failure and raw JD fallback unavailable.
- Existing report or tracker-addition path already present when a write is
  requested.
- Tracker merge succeeds with warnings and verify reports pending or duplicate
  issues.
- PDF generation command times out or returns a non-zero exit code.

---

## 10. Dependencies

### External Libraries

- `zod` - existing schema validation for tool contracts
- `playwright` - existing ATS PDF generation dependency used by the repo script

### Other Sessions

- **Depends on**: `phase02-session01-tool-registry-and-execution-policy`,
  `phase02-session02-workspace-and-startup-tool-suite`
- **Depended by**: `phase02-session04-scan-pipeline-and-batch-tools`,
  `phase02-session05-router-and-specialist-agent-topology`

---

## Next Steps

Run the `implement` workflow step next. After a successful `plansession` run,
`implement` is always the next workflow command.
