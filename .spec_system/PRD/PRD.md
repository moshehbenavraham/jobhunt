# Job-Hunt - Product Requirements Document

## Overview

Job-Hunt is currently a local-first, Codex-primary repository whose durable
value lives in checked-in instructions, deterministic scripts, templates,
tracker discipline, and generated artifacts. The product logic already exists
in repo-owned files such as `AGENTS.md`, `modes/*.md`, `scripts/*.mjs`,
`templates/`, and the tracker and report artifacts under `data/`, `reports/`,
and `output/`.

This PRD defines the work required to replace manual `codex` and `codex exec`
usage as the primary single-user runtime with an app-owned experience backed by
OpenAI's Agents SDK. The target is not a greenfield rewrite. The target is a
local web app with a typed backend, resumable jobs, explicit approvals, and a
UI that preserves the current workflow coverage and file contracts while making
the runtime explicit, testable, and app-owned.

The migration stays local-first and reversible during initial parity. Repo
files remain the source of truth for domain data, while the new app owns
operational state, orchestration, and user interaction.

## Current State Summary

Today the repo is organized around this runtime model:

- Interactive use starts with `codex` from the repo root
- Batch execution runs through `codex exec` workers in `batch/batch-runner.sh`
- Checked-in instructions live in `AGENTS.md`, `.codex/skills/`, and
  `modes/*.md`
- Deterministic product logic lives in repo-owned scripts and templates
- The dashboard is a Go TUI over the same repo files

Repo surface area that materially affects scope:

- `42` top-level `scripts/` files
- `21` top-level `modes/` files
- Structured batch worker contracts in `batch/`
- A Go dashboard that reads the same tracker and report artifacts

Architecturally, the current repo already separates deterministic product logic
from agent orchestration reasonably well:

- `scripts/*.mjs` handle extraction, scanning, PDF generation, tracker merge,
  verification, and maintenance
- `reports/`, `output/`, `batch/tracker-additions/`, and
  `data/applications.md` are durable artifacts
- `templates/` and `modes/` encode business logic and output expectations

What Codex currently provides is the implicit runtime:

- Startup checklist execution
- Mode routing
- Tool access
- Conversation continuity
- Approvals and human-in-the-loop pauses
- Long-running orchestration
- Interactive reasoning over repo files

Replacing Codex therefore means reifying this runtime into application code.

## Product Goal

Build a full single-user Job-Hunt app with feature parity against the current
Codex-primary workflow, while preserving the existing local-first data contract
and deterministic artifact generation.

The app should:

- Replace manual `codex` startup as the primary operator path
- Preserve current reports, PDFs, tracker additions, and verification rules
- Expose current workflows through an app UI and local API
- Run long tasks asynchronously with resumable status and approval handling
- Keep user data local to the machine by default
- Remain compatible with the repo's current file-based surfaces during the
  migration

## Delivery Estimate

For one strong full-stack engineer, the realistic scope for this PRD is:

- `4-8 weeks` for a full single-user app with feature parity
- `3-5 major workstreams`
- `7` implementation phases
- Roughly `26-37` total sessions using the Apex Spec cadence of one clear
  objective per 2-4 hour session

This estimate assumes:

- Reuse of the existing Node scripts and Playwright setup
- A web app plus local backend, not a cloud multi-tenant system
- No rewrite of the current scanner, PDF, tracker, or report logic

## Goals

1. Replace Codex CLI as the primary runtime for single-user operation.
2. Preserve the current repo-owned business logic, file outputs, and tracker
   integrity rules.
3. Convert implicit prompt- and CLI-driven behavior into explicit app-owned
   agents, tools, jobs, and UI flows.
4. Provide a first-class app UI for chat, pipeline review, report viewing,
   batch runs, approvals, and maintenance actions.
5. Support resumable long-running workflows with user-visible progress and
   human-in-the-loop checkpoints.
6. Keep the migration local-first, testable, and reversible until parity is
   proven.

## Non-Goals

- Multi-user auth, tenancy, or cloud-hosted collaboration
- Replacing the current user-layer file contract with a database-first model
- Auto-submitting job applications on the user's behalf
- Rewriting scanner, PDF, report, tracker, or liveness logic from scratch
- Mobile apps, billing, full cloud sync, or SaaS account management

## Product Definition

### User Model

Single operator, single workspace, local machine, local repo clone.

The app is allowed to maintain app-owned state, but the repo remains the source
of truth for Job-Hunt artifacts and user-layer content during the migration.

### Target Experience

The user launches the app and can:

- Complete onboarding if required files are missing
- Paste a JD or job URL into chat and run the full pipeline
- Trigger evaluation-only, scan, PDF, tracker, deep research, apply-help,
  interview-prep, patterns, project review, training review, and follow-up
  flows
- Compare multiple evaluated roles or offers before deciding where to invest
  time
- Inspect generated reports and PDFs
- Review and update tracker status
- Run batch jobs and observe structured progress
- Approve sensitive actions when needed

The app, not Codex CLI, owns:

- Routing
- Session memory
- Tool registration
- Background execution
- Error reporting
- Status surfaces

## Users and Use Cases

### Primary Users

- **Single Job-Hunt operator**: One person using a local repo clone as the
  source of truth for profile data, job artifacts, tracker updates, and
  workflow execution.

### Key Use Cases

1. Operator launches the app, satisfies missing prerequisites, and completes
   onboarding without reading CLI-only instructions.
2. Operator pastes a JD or live job URL and runs the full auto-pipeline from
   extraction through report, PDF trigger, and tracker TSV generation.
3. Operator reviews pipeline entries, reports, PDFs, tracker state, and batch
   progress from dedicated app surfaces.
4. Operator runs scan, batch, application-help, research, interview-prep,
   follow-up, offer-comparison, and other specialist flows with resumable
   status and approvals.
5. Operator resumes interrupted runs, approvals, and conversations without
   losing workflow context.

## In-Scope Feature Parity

The app must reach parity for these current surfaces:

### Startup and Onboarding

- Update check behavior equivalent to `scripts/update-system.mjs check`
- Required-file detection for:
  - `profile/cv.md`
  - `config/profile.yml`
  - `modes/_profile.md`
  - `config/portals.yml`
- Onboarding flow that creates missing user-layer files from existing examples

### Core Workflows

- Raw JD or URL full auto-pipeline
- Single evaluation
- Compare offers
- Portal scan
- PDF generation
- Live application help
- Pipeline processing
- Tracker review and status editing
- Deep company research
- LinkedIn outreach drafting
- Interview prep
- Training or certification review
- Project idea review
- Follow-up cadence
- Rejection pattern analysis

### Batch Processing

- Multi-offer processing with background workers
- Structured per-offer state
- Durable result artifacts
- Tracker merge and verification

### Review Surfaces

- Pipeline and tracker list
- Progress and status overview
- Report viewer
- Artifact links
- Job-level failure and warning visibility

### Human-In-The-Loop Requirements

- No auto-submit behavior
- Explicit draft status for candidate-facing outputs
- Approval gates for sensitive actions where applicable

## Requirements

### MVP Requirements

- Single operator can complete startup checks and onboarding when required
  user-layer files are missing from the local workspace.
- Single operator can paste a JD or live job URL and run the full auto-pipeline
  through report generation, PDF trigger, and tracker-addition output.
- Single operator can run evaluation-only, scan, pipeline processing, tracker
  review, deep research, application-help, interview-prep, follow-up,
  patterns, project review, training review, and compare-offers workflows from
  the app UI.
- Single operator can create, monitor, retry, and resume batch jobs with
  structured per-item state and durable result artifacts.
- Single operator can inspect generated reports, PDFs, pipeline entries,
  tracker data, and warning states from dedicated review surfaces.
- Single operator can approve, reject, and resume sensitive actions when human
  review is required.
- System can preserve repo file outputs as canonical domain data while storing
  only operational app state in SQLite.
- System can execute long-running evaluation, scan, PDF, and batch workflows
  asynchronously with resumable status and durable logs.
- System can expose logs, traces, and run metadata sufficient to debug
  failures without relying on raw model output alone.
- System can run through repo-owned OpenAI account auth and Agents SDK
  orchestration without requiring `OPENAI_API_KEY` or manual Codex startup.

### Deferred Requirements

- Single operator can use dashboard-equivalent views in the web app strongly
  enough to retire the Go dashboard after parity validation.
- Single operator can use a packaged desktop shell only after the web-first
  deployment path proves sufficient.
- Maintainer can introduce a versioned migration away from legacy batch or file
  contracts only after initial parity is proven.

### Functional Requirements

#### FR1. Onboarding Parity

The app must reproduce the current startup checklist and onboarding behavior
without requiring manual CLI interpretation.

#### FR2. Auto-Pipeline Parity

Given a pasted job URL or JD text, the app must be able to:

- Extract the JD
- Verify posting status when the input is a live URL
- Run evaluation A-G
- Save the report
- Generate the PDF
- Update tracker additions
- Surface manual follow-ups when needed

#### FR3. Batch Parity

The app must preserve the structured batch semantics already encoded in:

- `batch/batch-runner.sh`
- `batch/batch-state.tsv`
- `batch/worker-result.schema.json`

The implementation may change, but the observable result contract should remain
compatible until a deliberate contract migration is approved.

#### FR4. Artifact Parity

Generated files must remain deterministic and discoverable in their current
locations unless a migration path is explicitly designed and versioned.

This includes current report and workflow invariants such as:

- Report headers preserving `**URL:**` and `**Legitimacy:**`
- Tracker additions remaining TSV-first before merge
- Scan and follow-up workflows continuing to use their existing file surfaces
  such as `data/pipeline.md`, `data/scan-history.tsv`, and `data/follow-ups.md`

#### FR5. Tracker Integrity

The app must preserve:

- TSV-first tracker additions for new evaluations
- Merge-then-verify workflow
- Status normalization rules
- Duplicate detection expectations

#### FR6. Session Continuity

Users must be able to resume app conversations and interrupted runs without
losing workflow context.

#### FR7. Background Execution

Long-running jobs must not block the UI request lifecycle.

#### FR8. Approval Handling

The app must support explicit pause and resume behavior for human-review steps.

#### FR9. Observability

The app must expose enough logs, traces, and run metadata to debug failures
without reading raw model output blindly.

#### FR10. Compare-Offers Parity

The app must preserve the current ability to compare multiple evaluated roles
or offers side by side using existing report artifacts and user-provided offer
details.

## Non-Functional Requirements

- **Performance**: Requests that launch evaluation, scan, PDF, or batch work
  return after job creation and do not block on long-running execution.
- **Security**: All repo artifact writes go through backend-owned typed tools
  or workspace adapters, and raw shell access is never exposed directly to end
  user prompt space.
- **Privacy**: Canonical Job-Hunt domain data remains in existing repo file
  surfaces during initial parity migration, while SQLite stores only
  operational app state under `.jobhunt-app/`.
- **Reliability**: Interrupted conversations, approval-gated runs, and
  background jobs can be resumed from persisted state without re-running
  completed steps.
- **Operability**: Primary single-user operation requires only a local repo
  clone, repo-owned OpenAI account login, and the local app runtime; no hosted
  multi-user service or `OPENAI_API_KEY` setup is required.
- **Determinism**: Output paths, tracker updates, merge semantics, and report
  headers remain consistent with current repo contracts until a versioned
  migration is explicitly approved.

## Constraints and Dependencies

- The product remains single-user and local-first for the full parity effort.
- Existing repo files remain canonical for domain data during migration,
  including `profile/`, `config/`, `data/`, `reports/`, `output/`, `jds/`, and
  `batch/tracker-additions/`.
- `docs/DATA_CONTRACT.md` remains the source of truth for user-layer versus
  system-layer boundaries.
- The runtime must reuse the repo-owned OpenAI account auth path documented in
  `docs/OPENAI_ACCOUNT_AUTH.md` and implemented in
  `scripts/lib/openai-account-auth/`.
- The app should wrap existing repo scripts, templates, and modes rather than
  rewrite their deterministic logic.
- Playwright-backed verification and repo-owned liveness helpers remain the
  preferred verification path for URL-based workflows.
- No workflow may auto-submit job applications on the operator's behalf.

## Proposed Architecture

### Recommendation

Build a local web app with a Node.js and TypeScript backend and a React
frontend. Wrap it in Electron or Tauri later only if desktop packaging becomes
necessary.

This repo is already Node- and Playwright-native. TypeScript aligns with the
current OpenAI Agents SDK for JavaScript and avoids introducing a parallel
Python service boundary.

### High-Level Architecture

```text
Frontend (React)
  -> Local API server (Node.js and TypeScript)
     -> Repo-owned OpenAI account auth (`scripts/lib/openai-account-auth/`)
     -> Agent runtime (`@openai/agents` via custom Codex provider)
     -> Typed tool adapters around `scripts/*.mjs`
     -> Background job runner
     -> Session / approval / job store (SQLite)
     -> Repo workspace adapter
        -> reports/
        -> output/
        -> data/
        -> batch/
        -> profile/
        -> config/
```

### Core Components

#### Frontend App

Primary UI surfaces:

- Chat and workflow console
- Onboarding wizard
- Pipeline and tracker page
- Report viewer
- Batch jobs page
- Scan review page
- Settings page
- Approval prompts and interruptions

#### Local API Server

Owns:

- Authless single-user app session
- Route handlers for workflows
- Job scheduling
- Run persistence
- Repo workspace access
- Guardrails around tools and filesystem writes

#### Agent Runtime

Use `@openai/agents` as the primary orchestration layer for interactive and
multi-step workflows.

Use the repo-owned OpenAI account auth path documented in
`docs/OPENAI_ACCOUNT_AUTH.md` and implemented under
`scripts/lib/openai-account-auth/` as the required model-access layer for the
Agents SDK.

Use direct Responses API calls only where the full SDK loop adds no value, such
as small one-shot classification or extraction helpers.

#### Tool Adapter Layer

Prefer typed function tools over exposing a general-purpose shell.

Examples:

- `run_update_check`
- `run_sync_check`
- `extract_job`
- `run_liveness_check`
- `run_scan`
- `generate_pdf`
- `merge_tracker`
- `verify_pipeline`
- `read_profile_sources`
- `write_report`
- `write_tracker_addition`
- `open_report`
- `list_pipeline_entries`
- `update_tracker_status`

#### Background Job Runner

Owns:

- Async evaluation jobs
- Batch evaluation fan-out
- Scan jobs
- PDF jobs
- Retries and terminal failure states

#### App State Store

Use SQLite for app-owned operational state:

- Conversations and sessions
- Background jobs
- Approvals and interruptions
- UI metadata
- Cached run summaries

Do not migrate the core user-layer files into SQLite during the initial parity
migration.

#### Workspace Adapter

A thin repo-aware layer that resolves paths, enforces user and system
boundaries, and exposes deterministic read and write primitives to the agent
runtime.

## Data Model Strategy

### Source-of-Truth Policy

Keep the current file-based contract as the source of truth for domain data.
`docs/DATA_CONTRACT.md` remains the authoritative superset for what is
user-layer versus system-layer.

At minimum, the app must treat these current file surfaces as canonical:

- `profile/cv.md`
- `profile/article-digest.md`
- `config/profile.yml`
- `modes/_profile.md`
- `config/portals.yml`
- `data/pipeline.md`
- `data/scan-history.tsv`
- `data/follow-ups.md`
- `interview-prep/story-bank.md`
- `interview-prep/*.md`
- `jds/*`
- `reports/*`
- `output/*`
- `batch/tracker-additions/*`
- `data/applications.md`

### App-Owned State

Store only operational app state outside the repo artifacts:

- UI sessions
- Background run state
- Approval state
- Trace IDs and telemetry references
- Optimistic cache for list views

Suggested location:

- `.jobhunt-app/app.db`
- `.jobhunt-app/logs/`

This keeps the migration reversible and preserves compatibility with the Go
dashboard and existing maintenance scripts until the app fully replaces them.

## Agent Design

### Recommended Topology

Use one router or orchestrator agent plus a small number of specialist agents.

#### Router Agent

Responsibilities:

- Detect user intent
- Select the correct workflow
- Gather missing inputs
- Hand off to the correct specialist

#### Specialist Agents

- Onboarding agent
- Evaluation agent
- Scan agent
- Application-help agent
- Tracker agent
- Research, interview, and follow-up agent
- Batch supervisor agent

### Prompt Source Strategy

Do not bury product behavior in opaque strings inside the backend.

The checked-in prompt system should remain explicit and repo-owned:

- `AGENTS.md` stays as global policy input
- `modes/*.md` remain durable workflow contracts
- App-owned prompt wrappers may compose these files, but should not silently
  replace them

This keeps the current product logic inspectable and diffable.

## Tooling Strategy

### Preferred Approach

Use explicit backend tools that call the existing scripts and helpers.

Why:

- More deterministic than a generic shell
- Easier to test
- Easier to permission
- Easier to log and retry
- Preserves current script boundaries

### Raw Shell Policy

Raw shell access should be an implementation fallback, not a primary product
tool. If used at all, keep it server-owned and unavailable to end-user prompt
space except through constrained wrappers.

### Browser and Playwright Policy

Use backend-owned Playwright flows first.

Do not make arbitrary computer-use browsing the primary implementation path for
current repo workflows unless a workflow truly requires open-ended page
interaction. The current repo already has deterministic browser-backed logic
for specific tasks, and the app should preserve that bias.

For URL-based workflows, preserve the current verification bias:

- Browser-backed live posting verification first when available
- Repo-owned liveness helpers second
- Weaker fetch and search fallback only when the stronger checks are
  unavailable

## UI Requirements

### Required App Surfaces

#### Chat and Run Console

- Accept free-form user input
- Display workflow selection and progress
- Show generated outputs and follow-up tasks
- Support resumable conversations

#### Pipeline Page

- Show current applications
- Filter by status
- Sort by score, date, and urgency
- Open report and PDF artifacts
- Edit status

#### Report Viewer

- Render markdown reports
- Show header metadata
- Support long reports cleanly

#### Batch Page

- Create batch inputs
- Show per-item state
- Expose retries, warnings, and failures
- Surface structured worker results

#### Scan Review Page

- Run scan
- Inspect shortlist and pending items
- Launch evaluation from shortlisted roles

#### Settings and Profile Page

- Edit or open user-layer files
- Show missing prerequisites
- Expose update check and maintenance actions

#### Approval UI

- Show pending approvals or interruptions
- Allow approve, reject, and resume
- Show why the action needs review

## Required OpenAI Runtime Architecture

As of the source planning document dated `2026-04-20`, the current OpenAI docs
describe the default Agents SDK OpenAI path in API-key and client terms. That
is not the supported auth model for this project.

Project requirements:

- OpenAI account login is the primary and only supported OpenAI access path
- OpenAI Platform API key setup is not part of normal onboarding
- No API-key fallback is treated as supported project behavior
- `docs/OPENAI_ACCOUNT_AUTH.md` is the source-of-truth auth and runtime
  contract for repo-owned OpenAI access
- `scripts/lib/openai-account-auth/` is the required implementation basis for
  Agents SDK model access, transport, refresh, and credential storage unless it
  is deliberately superseded in-place

Required runtime use:

- Agents SDK only as the orchestration and runtime layer
- A custom account-authenticated Codex provider for model access
- Pi-style login, refresh, storage, account-id extraction, and Codex transport
  adapted into app-owned infrastructure
- Explicit sessions for persistent single-user conversations
- Prefer a local or custom session backend by default for local-first parity;
  evaluate `OpenAIConversationsSession` only if server-managed memory is a
  deliberate product choice
- Background mode or equivalent long-running job handling for evaluation and
  batch work where request timeouts would otherwise be a risk

Architecture implications:

- The app must not depend on `OPENAI_API_KEY` for development, onboarding, or
  primary runtime execution
- The app should extend or directly reuse the checked-in account-auth stack,
  not introduce a parallel OpenAI auth implementation with different runtime
  behavior

## Recommended 7-Phase Plan

Planning assumptions for this PRD:

- `1 session = 1 spec = 1 clear objective = 2-4 hours = ~12-25 tasks`
- `1 phase = 3-8 sessions`
- Recommended total scope: `26-37 sessions` across `7 phases`

### Phase 00: Foundation and Repo Contract

- Objective: establish the app skeleton and lock the repo and app boundary
- Sessions: `4`
- Key outcomes: backend and frontend package structure, app-owned state
  directory, repo workspace adapter, prompt-loading contract from checked-in
  files
- Exit: the app can boot against the repo and resolve canonical paths without
  mutating user artifacts

### Phase 01: Backend Runtime and Job Infrastructure

- Objective: make the runtime explicit and resumable before building broad UI
  parity
- Sessions: `5`
- Key outcomes: local Node.js and TypeScript API, SQLite store, background job
  runner, sessions, approvals, logs, traces
- Exit: long-running runs can start, persist, resume, and fail in a structured
  way

### Phase 02: Typed Tools and Agent Orchestration

- Objective: replace implicit shell-heavy orchestration with app-owned tools
  and agent wiring
- Sessions: `5`
- Key outcomes: typed wrappers around existing scripts, deterministic error
  mapping, router and specialist agent topology, unit coverage for tool
  wrappers
- Exit: the app runtime can call repo logic safely without depending on
  Codex-specific execution semantics

### Phase 03: Chat, Onboarding, and Approvals UX

- Objective: make the app usable as the primary operator surface for startup
  and interactive runs
- Sessions: `5`
- Key outcomes: chat and run console, startup checklist, onboarding wizard,
  approval UI, resumable conversations, settings basics
- Exit: a user can launch the app, satisfy prerequisites, start a run, and
  resume interrupted work

### Phase 04: Evaluation, Artifacts, and Tracker Parity

- Objective: land the core evaluate-to-artifact loop end to end
- Sessions: `6`
- Key outcomes: auto-pipeline, single evaluation, PDF generation triggers,
  report viewer, pipeline and tracker page, tracker status editing, merge and
  verify semantics
- Exit: the main JD and URL workflow produces the same durable artifacts and
  tracker behavior as the current Codex-primary path

### Phase 05: Scan, Batch, and Application-Help Parity

- Objective: cover the highest-value async and review-heavy workflows
- Sessions: `4-6`
- Key outcomes: portal scan flows, shortlist review, batch orchestration and
  state visibility, failure and retry handling, application-help flows,
  approval checkpoints
- Exit: the app can run the current scan and batch loops without requiring the
  existing batch runner UX

### Phase 06: Specialist Workflows, Dashboard Replacement, and Cutover

- Objective: close the remaining parity gaps and make the app the primary
  single-user operator path
- Sessions: `4-6`
- Key outcomes: parity for deep research, outreach, interview-prep, training,
  project review, follow-up, patterns, dashboard-equivalent views, settings and
  maintenance polish, deprecation decision for the Go dashboard
- Exit: the app satisfies this PRD's definition of done and `codex` is no
  longer required for normal single-user operation

## Phases

This system delivers the product via phases. Each phase is implemented via
multiple 2-4 hour sessions (12-25 tasks each).

| Phase | Name                                                     | Sessions | Status      |
| ----- | -------------------------------------------------------- | -------- | ----------- |
| 00    | Foundation and Repo Contract                             | 4        | Complete    |
| 01    | Backend Runtime and Job Infrastructure                   | 5        | Complete    |
| 02    | Typed Tools and Agent Orchestration                      | 5        | Complete    |
| 03    | Chat, Onboarding, and Approvals UX                       | 5        | Complete    |
| 04    | Evaluation, Artifacts, and Tracker Parity                | 6        | In Progress |
| 05    | Scan, Batch, and Application-Help Parity                 | 4-6      | Not Started |
| 06    | Specialist Workflows, Dashboard Replacement, and Cutover | 4-6      | Not Started |

## Phase 00: Foundation and Repo Contract

### Objectives

1. Establish the app skeleton and lock the repo and app boundary.
2. Define the frontend and backend package structure and workspace adapter.
3. Codify prompt-loading and repo path resolution from checked-in files.

### Completed Sessions

1. Session 01: Monorepo App Skeleton
2. Session 02: Workspace Adapter Contract
3. Session 03: Prompt Loading Contract
4. Session 04: Boot Path and Validation

Session artifacts were archived to `.spec_system/archive/phases/phase_00/`.

## Technical Stack

- React - primary local web UI for chat, review, approvals, and settings
- Node.js and TypeScript - local API, typed tool wrappers, and background jobs
- `@openai/agents` with repo-owned account auth - orchestration runtime for
  multi-step workflows without API-key-only assumptions
- SQLite - app-owned operational state for sessions, jobs, approvals, and UI
  metadata
- Playwright - live posting verification and browser-backed workflow helpers
- Existing repo scripts, templates, and modes - durable business logic and
  artifact contracts
- Go dashboard - legacy operator surface to preserve until replacement views
  are validated

## Package Map

| Package | Path     | Stack               | Purpose                                                                           |
| ------- | -------- | ------------------- | --------------------------------------------------------------------------------- |
| web     | apps/web | TypeScript, React   | Primary app UI for chat, review surfaces, approvals, and settings                 |
| api     | apps/api | TypeScript, Node.js | Local API, agent runtime, job orchestration, workspace adapter, and SQLite access |

## Migration Plan

### Phase 00: Foundation and Repo Contract

- Completed backend and frontend package structure
- Added app-owned state directory
- Formalized repo workspace adapter
- Codified prompt-loading strategy from existing files

Archived phase artifacts live under `.spec_system/archive/phases/phase_00/`.

### Phase 01: Backend Runtime and Job Infrastructure

- Completed the Node.js and TypeScript API
- Added the SQLite store for sessions, jobs, and approvals
- Implemented the background job runner
- Integrated the checked-in OpenAI account auth and provider stack from
  `scripts/lib/openai-account-auth/`
- Added trace and log plumbing

Archived phase artifacts live under `.spec_system/archive/phases/phase_01/`.

### Phase 02: Typed Tools and Agent Orchestration

- Wrap existing scripts as explicit tools
- Preserve current file outputs
- Add deterministic error mapping
- Add unit coverage for tool wrappers
- Wire router and specialist agent boundaries

Archived phase artifacts live under `.spec_system/archive/phases/phase_02/`.

### Phase 03: Chat, Onboarding, and Approvals UX

- Implement chat and run console
- Implement startup checklist and onboarding wizard
- Implement resumable conversations and approval prompts
- Add settings basics for prerequisite visibility and maintenance actions
- Phase 03 complete; archived under `.spec_system/archive/phases/phase_03/`.

Progress: 5/5 sessions complete.

### Phase 04: Evaluation, Artifacts, and Tracker Parity

- Completed Session 01: typed evaluation result contract and bounded
  evaluation-result route in `apps/api`
- Completed Session 02: evaluation console and artifact handoff in `apps/web`
- Implement auto-pipeline and evaluation flows
- Implement report viewer
- Preserve PDF generation triggers and output placement
- Implement pipeline and tracker page
- Preserve tracker-addition and verification semantics
- Session plan defined under `.spec_system/PRD/phase_04/`.

Progress: 2/6 sessions complete.

### Phase 05: Scan, Batch, and Application-Help Parity

- Implement scan flows and shortlist review
- Replace batch runner UI and orchestration
- Support application-help flows and approval checkpoints
- Add job-level failure, warning, retry, and resume visibility

### Phase 06: Specialist Workflows, Dashboard Replacement, and Cutover

- Implement remaining specialist flows:
  - Compare offers
  - Deep company research
  - LinkedIn outreach drafting
  - Interview prep
  - Training or certification review
  - Project idea review
  - Follow-up cadence
  - Rejection pattern analysis
- Reach parity with current Go dashboard views
- Finalize settings, maintenance, and update-check surfaces
- Decide whether to retire or keep the Go dashboard as a secondary operator
  surface
- Remove Codex CLI from primary onboarding
- Run final parity validation and close migration gaps

## Success Criteria

- [ ] A single operator can use Job-Hunt primarily through the app without
      launching `codex`
- [ ] The main workflows have app parity with the current Codex-primary path
- [ ] Reports, PDFs, tracker additions, and verification still work through the
      existing file contract
- [ ] Long-running runs are resumable and visible in the UI
- [ ] Approvals are explicit, recoverable, and observable
- [ ] The app runtime is testable enough to validate artifact parity, workflow
      parity, and failure semantics before cutover

## Validation Strategy

### Artifact-Level Parity

Create golden-path tests that compare:

- Report creation
- Report header invariants such as `URL` and `Legitimacy`
- Tracker TSV creation
- Merge and verify behavior
- PDF generation triggers and file placement
- Scan, pipeline, and follow-up file placement and update semantics

### Workflow Parity

For each major mode, verify that the app can complete the same workflow class
that the current Codex path supports.

This should explicitly include:

- Auto-pipeline from a pasted URL
- Scan -> shortlist -> pipeline round-trip
- Compare-offers review from existing artifacts
- Follow-up tracking round-trip with `data/follow-ups.md`

### Failure Semantics

Test:

- Missing profile inputs
- Partial batch results
- Infrastructure failures
- Resumable approvals
- Invalid tracker writes
- Conflicting or stale job-verification signals

### UX Validation

Verify that a single operator can complete the main loop entirely in the app:

- Onboard
- Scan
- Evaluate
- Open report
- Update tracker
- Run batch
- Resume interrupted job

## Risks

- **Prompt drift**: If the app silently bypasses `modes/*.md`, product logic
  will fork. Mitigation: keep prompt logic checked in and load existing mode
  files explicitly.
- **Overpowered tooling**: If the model gets a broad shell instead of typed
  tools, determinism and safety will regress. Mitigation: prefer explicit
  backend tools and keep shell behind backend control only.
- **Hidden state split**: If SQLite and repo files become competing sources of
  truth, debugging becomes painful. Mitigation: keep repo files canonical for
  domain data and reserve SQLite for operational state only.
- **Browser automation fragility**: Application-help flows can become brittle
  if migrated to open-ended computer use too early. Mitigation: preserve
  backend-owned Playwright helpers first and adopt open-ended computer use only
  where deterministic flows are insufficient.
- **Scope inflation**: "Full app" can expand into multi-user SaaS work.
  Mitigation: keep scope strictly single-user and local-first.

## Assumptions

- Existing Node scripts, templates, prompts, and Playwright helpers are
  reusable through typed adapters rather than rewrites.
- The repo file contract remains canonical during initial parity migration.
- The first shipped experience can be a local web app without immediate desktop
  packaging.
- The repo-owned OpenAI account auth stack remains the supported basis for
  Agents SDK access.
- The single-user local-first scope stays fixed until parity and validation are
  complete.

## Open Questions

1. Should the first shipped app remain web-only, or should it launch
   immediately inside Electron or Tauri?
2. Should the Go dashboard remain supported after parity, or be deprecated once
   the web pipeline page is stable?
3. Should batch workers keep writing the exact current state files, or should
   the app introduce a versioned state contract after initial parity?
4. Which session backend should own conversation memory: custom local storage,
   `OpenAIConversationsSession`, or a hybrid model?

## Recommendation

Ship this as a local web app first.

Keep the current repo file contract intact. Build a TypeScript backend around
the Agents SDK, explicit tool wrappers, SQLite-backed operational state, and a
React frontend. Reach feature parity before considering a database-first or
multi-user evolution.

This gives Job-Hunt a real app surface without throwing away the parts of the
repo that already work.

## Definition of Done

This PRD is satisfied when all of the following are true:

- A single user can use Job-Hunt primarily through the app without launching
  `codex`
- The main workflows have app parity with the current Codex-primary path
- Reports, PDFs, tracker additions, and verification still work
- Long-running runs are resumable and visible in the UI
- Approvals are explicit and recoverable
- The app runtime is observable and testable
- Codex CLI is no longer required for primary single-user operation

## External Runtime References

These references informed the runtime assumptions captured in the source
planning document:

- Agents SDK overview:
  `https://platform.openai.com/docs/guides/agents-sdk/`
- Agents SDK JS running agents:
  `https://openai.github.io/openai-agents-js/guides/running-agents/`
- Agents SDK JS sessions:
  `https://openai.github.io/openai-agents-js/guides/sessions/`
- Agents SDK JS tools:
  `https://openai.github.io/openai-agents-js/guides/tools/`
- Background mode:
  `https://developers.openai.com/api/docs/guides/background`
