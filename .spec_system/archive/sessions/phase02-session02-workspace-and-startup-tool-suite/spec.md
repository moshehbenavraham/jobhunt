# Session Specification

**Session ID**: `phase02-session02-workspace-and-startup-tool-suite`
**Phase**: 02 - Typed Tools and Agent Orchestration
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 01 delivered the read-first startup diagnostics, workspace boundary, and
prompt-loading contracts that the future app shell depends on. Phase 02
Session 01 then created the typed tool registry, execution service, and
permission-aware adapters. What is still missing is a default tool suite that
turns those runtime primitives into backend-owned startup and onboarding
capabilities the app can call directly.

This session creates the first real workflow-facing tool catalog in `apps/api`
for startup diagnostics, workspace inspection, prompt and profile summaries,
artifact discovery, and guarded onboarding repair. The tools should stay
read-first by default, reuse the existing workspace and prompt contracts, and
limit user-layer writes to explicit template-backed repair paths.

This is the correct next session because the authoritative analyzer now marks
Phase 02 Session 01 complete and identifies Session 02 as the first remaining
incomplete candidate in the current phase. Session 03 depends on these startup
and workspace tools, and Session 05 also depends on this inspection and repair
surface before router work can begin.

---

## 2. Objectives

1. Expose typed backend tools for startup diagnostics, required-file status,
   prompt-contract inspection, and workspace artifact discovery in `apps/api`.
2. Add deterministic profile and workspace summary helpers that future
   onboarding and settings UX can call without re-reading raw repo files ad
   hoc.
3. Add guarded onboarding repair tools that create missing required user-layer
   files from checked-in templates and the tracker skeleton without overwriting
   existing data.
4. Register the new tool suite in the shared API service container and add
   validation coverage for read-only inspection, legacy-fallback handling, and
   bounded repair flows.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session02-workspace-adapter-contract` - provides the repo-root
      workspace boundary, path classification, and guarded write contract this
      session must reuse.
- [x] `phase00-session03-prompt-loading-contract` - provides workflow routing
      and prompt-source ordering that startup inspection tools should summarize
      instead of duplicating.
- [x] `phase01-session03-agent-runtime-bootstrap` - provides startup
      diagnostics and auth-readiness summaries that the new tools should expose.
- [x] `phase02-session01-tool-registry-and-execution-policy` - provides the
      tool registry, execution envelopes, workspace mutation adapter, and
      approval-aware execution contract this suite plugs into.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic CLI behavior, TypeScript
  module structure, and validation expectations
- `.spec_system/CONSIDERATIONS.md` for single-boundary runtime guidance,
  read-first diagnostics, and best-effort observability rules
- Existing startup and workspace modules in `apps/api/src/index.ts`,
  `apps/api/src/workspace/`, and `apps/api/src/prompt/`
- Checked-in onboarding templates in `config/*.example.yml`,
  `modes/_profile.template.md`, and `profile/cv.example.md`

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- Repo-owned template and example files available from the checked-in tree
- `apps/api` runtime tests and boot smoke path runnable from the repo root
- Temp workspace fixtures available for tool and repair-path validation

---

## 4. Scope

### In Scope (MVP)

- Backend code can inspect startup readiness, required-file gaps, prompt
  contract metadata, and workspace artifact directories without hidden writes.
- Backend code can summarize profile and targeting sources from the canonical
  workspace surfaces instead of exposing raw file dumps by default.
- Backend code can preview and apply bounded onboarding repairs for missing
  `profile/cv.md`, `config/profile.yml`, `config/portals.yml`,
  `modes/_profile.md`, and `data/applications.md` using checked-in defaults.
- The shared API service container can publish this startup and workspace tool
  catalog as the default backend tool surface for later UX and routing work.

### Out of Scope (Deferred)

- Evaluation, PDF, tracker-merge, scan, pipeline, and batch tools - _Reason:
  Sessions 03 and 04 own those workflow-specific tool suites._
- Updater apply or rollback flows and other repo-wide maintenance mutations -
  _Reason: this session stays focused on read-first startup and bounded
  onboarding repair._
- Chat-shell onboarding UX, settings screens, or operator-facing approvals -
  _Reason: Phase 03 owns user-facing interaction flows._

---

## 5. Technical Approach

### Architecture

Add a default startup and workspace tool suite under `apps/api/src/tools/`
that composes existing runtime services instead of shelling out to repo
scripts. Startup inspection tools should call the startup-diagnostics service,
prompt summary helpers, and workspace adapter directly so the app can inspect
auth readiness, onboarding gaps, workflow support, and artifact directories on
one backend-owned path.

Onboarding repair should be the only write-capable part of this session. Keep
that write path narrow by mapping specific missing user-layer files to
checked-in example or template sources plus one tracker skeleton file. The
tool should refuse overwrites, route writes through the existing workspace
mutation adapter, and describe exactly which destination paths it intends to
create before a side effect proceeds.

To avoid ad hoc file access, extend the workspace contract with readable
template surfaces and a small onboarding-template mapping layer. Then register
the resulting tool definitions in the default service-container setup so later
sessions can assume a stable startup and onboarding catalog without passing
custom tool definitions into every test or runtime entrypoint.

### Design Patterns

- Read-first inspection surface: diagnostics and summaries should never create
  user-layer files or initialize app state as a side effect.
- Template-backed repair mapping: missing required files map to explicit
  checked-in sources or a single tracker skeleton owned by the repo.
- Summary projection helpers: convert raw YAML, markdown, and directory reads
  into deterministic backend summaries with stable ordering.
- Default tool-suite registration: service-container callers should get one
  shared startup and workspace tool catalog without custom boot wiring.
- Guarded mutation boundary: route every repair write through the existing
  mutation adapter and approval-aware tool execution path.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing `zod` dependency for tool input and output validation
- Existing workspace adapter and startup-diagnostics service in `apps/api`
- Existing prompt summary and workflow registry modules in `apps/api/src/prompt`
- Existing `js-yaml` workspace dependency for deterministic profile and portal
  summaries when structured parsing is needed

---

## 6. Deliverables

### Files to Create

| File                                                     | Purpose                                                                                | Est. Lines |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/workspace/onboarding-template-contract.ts` | Map repairable startup files to checked-in templates or tracker skeleton content       | ~150       |
| `apps/api/src/tools/startup-inspection-tools.ts`         | Define startup diagnostics and prompt-contract inspection tools                        | ~180       |
| `apps/api/src/tools/profile-summary.ts`                  | Summarize profile, portals, CV, and article-digest sources for onboarding and settings | ~170       |
| `apps/api/src/tools/workspace-discovery-tools.ts`        | Define required-file, artifact, and workflow-support inspection tools                  | ~180       |
| `apps/api/src/tools/onboarding-repair-tools.ts`          | Define template-backed preview and repair tools for missing onboarding files           | ~220       |
| `apps/api/src/tools/default-tool-suite.ts`               | Assemble the Session 02 startup and workspace tool definitions                         | ~80        |
| `apps/api/src/tools/startup-inspection-tools.test.ts`    | Cover startup diagnostics and prompt-contract inspection behavior                      | ~170       |
| `apps/api/src/tools/workspace-discovery-tools.test.ts`   | Cover profile summaries, legacy CV fallback, and deterministic artifact listing        | ~180       |
| `apps/api/src/tools/onboarding-repair-tools.test.ts`     | Cover repair preview, bounded writes, approval handling, and overwrite refusal         | ~220       |
| `data/applications.example.md`                           | Provide the checked-in tracker skeleton for onboarding repair flows                    | ~15        |

### Files to Modify

| File                                             | Changes                                                                        | Est. Lines |
| ------------------------------------------------ | ------------------------------------------------------------------------------ | ---------- |
| `apps/api/src/workspace/workspace-types.ts`      | Add template surface keys and onboarding-template metadata types               | ~90        |
| `apps/api/src/workspace/workspace-contract.ts`   | Register readable template surfaces and canonical repair targets               | ~140       |
| `apps/api/src/workspace/workspace-adapter.ts`    | Expose template-surface access through the shared workspace adapter            | ~40        |
| `apps/api/src/workspace/index.ts`                | Export the new onboarding-template helpers                                     | ~20        |
| `apps/api/src/tools/index.ts`                    | Export the Session 02 tool-suite modules                                       | ~20        |
| `apps/api/src/runtime/service-container.ts`      | Register the default startup and workspace tool suite in shared runtime wiring | ~90        |
| `apps/api/src/runtime/service-container.test.ts` | Verify default tool registration, reuse, and catalog availability              | ~120       |
| `apps/api/README_api.md`                         | Document startup inspection tools, repair limits, and validation path          | ~50        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Backend tools can inspect startup diagnostics, auth readiness, prompt
      contract metadata, and required-file gaps without mutating the workspace.
- [ ] Backend tools can summarize profile and artifact state from canonical
      workspace surfaces with deterministic ordering and legacy CV fallback.
- [ ] Missing required onboarding files can be previewed and repaired from
      checked-in templates or tracker skeleton content without overwriting
      existing user data.
- [ ] The shared API service container exposes the Session 02 startup and
      workspace tool suite by default.

### Testing Requirements

- [ ] Package tests cover startup diagnostics inspection, prompt summary
      projection, profile summary parsing, artifact discovery ordering, repair
      preview, and no-overwrite behavior.
- [ ] Repair-path tests cover missing required files, legacy `cv.md` fallback,
      and explicit failure mapping when templates or destinations are invalid.
- [ ] `npm run app:api:test:tools`, `npm run app:api:test:runtime`,
      `npm run app:api:build`, and `npm run app:boot:test` pass after
      integration.

### Non-Functional Requirements

- [ ] Inspection tools remain read-first and do not create `.jobhunt-app/` or
      user-layer files as a side effect.
- [ ] Repair outputs are deterministic, template-backed, and bounded to the
      explicit onboarding file set.
- [ ] Tool outputs keep stable field ordering and avoid raw unbounded file
      dumps by default.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Keep startup inspection on the same backend runtime boundary that already
  powers `/startup`; do not introduce a second path that reads state
  differently.
- Reuse workspace surfaces and prompt registries as the source of truth so tool
  summaries cannot drift from the repo contract.
- Treat onboarding repair as an explicit data-creation workflow, not a hidden
  side effect of diagnostics or service initialization.

### Potential Challenges

- Template drift: repair mappings can diverge from the checked-in example files
  if file ownership is spread across tool modules instead of centralized.
- Legacy path handling: `cv.md` fallback needs deterministic summary behavior
  without confusing repair targets that should still prefer `profile/cv.md`.
- Summary inflation: inspection tools can become raw file-export helpers unless
  outputs stay intentionally small and stable.

### Relevant Considerations

- [P01] **Single runtime boundary**: keep startup inspection, prompt summary,
  and tool registration on one backend-owned path.
- [P01] **Read-first diagnostics**: separate inspection from initialization so
  startup and onboarding tools never hide writes.
- [P01-apps/api] **Auth/provider readiness coupling**: surface readiness state
  and remediation hints without trying to refresh auth during inspection.
- [P01] **Best-effort observability**: tool lifecycle events should remain
  metadata-only and must not block repair or inspection completion.
- [P01] **Registry-backed routing**: register these tools in the shared default
  catalog instead of injecting ad hoc definitions at each call site.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Repair tools overwriting or partially creating user-layer files during
  missing-file recovery
- Inspection tools causing hidden writes or store initialization during
  supposedly read-only startup checks
- Summary helpers drifting from canonical prompt and workspace contracts or
  returning unstable ordering

---

## 9. Testing Strategy

### Unit Tests

- Validate profile and portal summary parsing, template mapping, and prompt
  contract projection helpers.
- Validate tool definitions for startup inspection, artifact discovery, and
  repair preview output shapes.

### Integration Tests

- Execute the Session 02 tool suite through the real tool execution service and
  shared service container.
- Verify repair flows create only the expected files and reuse the existing
  approval-aware workspace mutation path.

### Manual Testing

- Exercise the default tool catalog against a fixture repo with missing
  onboarding files, then confirm the preview and repair outputs are stable and
  bounded.
- Smoke the boot path after registration changes to confirm startup routes and
  tool defaults still compose through one container.

### Edge Cases

- Legacy `cv.md` present while `profile/cv.md` is missing
- Required template surface missing or unreadable
- Existing destination file present when a repair is requested
- Empty artifact directories and missing optional user-layer files

---

## 10. Dependencies

### External Libraries

- `zod`: input validation for inspection and repair tool definitions
- `js-yaml`: structured profile and portal summary parsing

### Other Sessions

- **Depends on**: `phase00-session02-workspace-adapter-contract`,
  `phase00-session03-prompt-loading-contract`,
  `phase01-session03-agent-runtime-bootstrap`,
  `phase02-session01-tool-registry-and-execution-policy`
- **Depended by**: `phase02-session03-evaluation-pdf-and-tracker-tools`,
  `phase02-session05-router-and-specialist-agent-topology`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
