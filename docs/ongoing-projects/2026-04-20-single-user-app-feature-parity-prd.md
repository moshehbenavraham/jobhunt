# 2026-04-20 Single-User App Feature-Parity PRD

## Recommended 7-Phase Plan

Planning assumption for this PRD:

- `1 session = 1 spec = 1 clear objective = 2-4 hours = ~12-25 tasks`
- `1 phase = 3-8 sessions`
- recommended total scope: `26-37 sessions` across `7 phases`

### Phase 1: foundation and repo contract

- Objective: establish the app skeleton and lock the repo/app boundary.
- Sessions: `3-4`
- Key outcomes: backend/frontend package structure, app-owned state
  directory, repo workspace adapter, prompt-loading contract from checked-in
  files.
- Exit: the app can boot against the repo and resolve canonical paths without
  mutating user artifacts.

### Phase 2: backend runtime and job infrastructure

- Objective: make the runtime explicit and resumable before building broad UI
  parity.
- Sessions: `4-5`
- Key outcomes: local Node/TypeScript API, SQLite store, background job
  runner, sessions, approvals, logs, traces.
- Exit: long-running runs can start, persist, resume, and fail in a structured
  way.

### Phase 3: typed tools and agent orchestration

- Objective: replace implicit shell-heavy orchestration with app-owned tools
  and agent wiring.
- Sessions: `4-5`
- Key outcomes: typed wrappers around existing scripts, deterministic error
  mapping, router/specialist agent topology, unit coverage for tool wrappers.
- Exit: the app runtime can call repo logic safely without depending on
  Codex-specific execution semantics.

### Phase 4: chat, onboarding, and approvals UX

- Objective: make the app usable as the primary operator surface for startup
  and interactive runs.
- Sessions: `3-5`
- Key outcomes: chat/run console, startup checklist, onboarding wizard,
  approval UI, resumable conversations, settings basics.
- Exit: a user can launch the app, satisfy prerequisites, start a run, and
  resume interrupted work.

### Phase 5: evaluation, artifacts, and tracker parity

- Objective: land the core evaluate-to-artifact loop end to end.
- Sessions: `4-6`
- Key outcomes: auto-pipeline, single evaluation, PDF generation triggers,
  report viewer, pipeline/tracker page, tracker status editing, merge and
  verify semantics.
- Exit: the main JD/URL workflow produces the same durable artifacts and
  tracker behavior as the current Codex-primary path.

### Phase 6: scan, batch, and application-help parity

- Objective: cover the highest-value async and review-heavy workflows.
- Sessions: `4-6`
- Key outcomes: portal scan flows, shortlist review, batch orchestration and
  state visibility, failure/retry handling, application-help flows, approval
  checkpoints.
- Exit: the app can run the current scan and batch loops without requiring the
  existing batch runner UX.

### Phase 7: specialist workflows, dashboard replacement, and cutover

- Objective: close the remaining parity gaps and make the app the primary
  single-user operator path.
- Sessions: `4-6`
- Key outcomes: parity for deep research, outreach, interview-prep, training,
  project review, follow-up, patterns, dashboard-equivalent views, settings
  and maintenance polish, deprecation decision for the Go dashboard.
- Exit: the app satisfies the PRD definition of done and `codex` is no longer
  required for normal single-user operation.

## Overview

jobhunt is currently a local-first, Codex-primary repository. The product's
durable value lives in its checked-in instructions, deterministic scripts,
templates, tracker discipline, and generated artifacts, not in the Codex CLI
itself.

This PRD defines the scope required to replace `codex` / `codex exec` as the
primary runtime with a full single-user application backed by OpenAI's Agents
SDK. The target is not a greenfield rewrite. The target is a local-first app
that preserves current workflow coverage and output contracts while making the
runtime explicit, testable, and app-owned.

The intended result is a single-user app where the user no longer starts a
Codex chat session manually to use jobhunt. Instead, they use an app UI backed
by a local API, a background job runner, typed tool adapters around the
existing repo scripts, and a controlled agent runtime.

## Current State Summary

Today the repo is organized around this runtime model:

- interactive use starts with `codex` from the repo root
- batch execution runs through `codex exec` workers in `batch/batch-runner.sh`
- checked-in instructions live in `AGENTS.md`, `.codex/skills/`, and
  `modes/*.md`
- deterministic product logic lives in repo-owned scripts and templates
- the dashboard is a Go TUI over the same repo files

Repo surface area that materially affects scope:

- `36` top-level `scripts/` files
- `21` top-level `modes/` files
- a structured batch worker contract in `batch/worker-result.schema.json`
- a Go dashboard that reads the same tracker and report artifacts

Architecturally, the current repo already separates deterministic product logic
from agent orchestration reasonably well:

- `scripts/*.mjs` handle extraction, scanning, PDF generation, tracker merge,
  verification, and maintenance
- `reports/`, `output/`, `batch/tracker-additions/`, and
  `data/applications.md` are durable artifacts
- `templates/` and `modes/` encode business logic and output expectations

What Codex currently provides is the implicit runtime:

- startup checklist execution
- mode routing
- tool access
- conversation continuity
- approvals / human-in-the-loop pauses
- long-running orchestration
- interactive reasoning over repo files

Replacing Codex therefore means reifying this runtime into application code.

## Product Goal

Build a full single-user jobhunt app with feature parity against the current
Codex-primary workflow, while preserving the existing local-first data contract
and deterministic artifact generation.

The app should:

- replace manual `codex` startup as the primary operator path
- preserve current reports, PDFs, tracker additions, and verification rules
- expose current workflows through an app UI and local API
- run long tasks asynchronously with resumable status and approval handling
- keep user data local to the machine by default
- remain compatible with the repo's current file-based surfaces during the
  migration

## Delivery Estimate

For one strong full-stack engineer, the realistic scope for this PRD is:

- `4-8 weeks` for a full single-user app with feature parity
- `3-5 major workstreams`
- `5-7 implementation phases`

This estimate assumes:

- reuse of the existing Node scripts and Playwright setup
- a web app plus local backend, not a cloud multi-tenant system
- no rewrite of the current scanner, PDF, tracker, or report logic

For planning purposes, the concrete sequencing in this document uses the
conservative `7-phase` breakdown above.

## Goals

1. Replace Codex CLI as the primary runtime for single-user operation.
2. Preserve the current repo-owned business logic, file outputs, and tracker
   integrity rules.
3. Convert implicit prompt- and CLI-driven behavior into explicit app-owned
   agents, tools, jobs, and UI flows.
4. Provide a first-class app UI for chat, pipeline review, report viewing,
   batch runs, and status changes.
5. Support resumable long-running workflows with user-visible progress and
   approval checkpoints.
6. Keep the migration local-first and reversible until parity is proven.

## Non-Goals

- multi-user auth, tenancy, or cloud-hosted collaboration
- replacing the current user-layer file contract with a database-first model
- auto-submitting job applications on the user's behalf
- rewriting scanner, PDF, report, tracker, or liveness logic from scratch
- mobile apps
- full cloud sync or SaaS billing

## Product Definition

### User model

Single operator, single workspace, local machine, local repo clone.

The app is allowed to maintain app-owned state, but the repo remains the source
of truth for jobhunt artifacts and user-layer content during the migration.

### Target experience

The user launches the app and can:

- complete onboarding if required files are missing
- paste a JD or job URL into chat and run the full pipeline
- trigger evaluation-only, scan, PDF, tracker, deep research, apply-help,
  interview-prep, patterns, and follow-up flows
- compare multiple evaluated roles or offers before deciding where to invest
  time
- inspect generated reports and PDFs
- review and update tracker status
- run batch jobs and observe structured progress
- approve sensitive actions when needed

The app, not Codex CLI, owns:

- routing
- session memory
- tool registration
- background execution
- error reporting
- status surfaces

## In-Scope Feature Parity

The app must reach parity for these current surfaces:

### 1. Startup and onboarding

- update check behavior equivalent to `scripts/update-system.mjs check`
- required-file detection for:
  - `profile/cv.md`
  - `config/profile.yml`
  - `modes/_profile.md`
  - `config/portals.yml`
- onboarding flow that creates missing user-layer files from existing examples

### 2. Core workflows

- raw JD / URL full auto-pipeline
- single evaluation
- compare offers
- portal scan
- PDF generation
- live application help
- pipeline processing
- tracker review and status editing
- deep company research
- LinkedIn outreach drafting
- interview prep
- training / certification review
- project idea review
- follow-up cadence
- rejection pattern analysis

### 3. Batch processing

- multi-offer processing with background workers
- structured per-offer state
- durable result artifacts
- tracker merge and verification

### 4. Review surfaces

- pipeline / tracker list
- progress and status overview
- report viewer
- artifact links
- job-level failure and warning visibility

### 5. Human-in-the-loop requirements

- no auto-submit behavior
- explicit draft status for candidate-facing outputs
- approval gates for sensitive actions where applicable

## Proposed Architecture

### Recommendation

Build a local web app with a Node/TypeScript backend and a React frontend.
Wrap it in Electron or Tauri later only if desktop packaging becomes necessary.

This repo is already Node- and Playwright-native. TypeScript also aligns with
the current OpenAI Agents SDK for JavaScript and avoids introducing a parallel
Python service boundary.

### High-level architecture

```text
Frontend (React)
  -> Local API server (Node/TypeScript)
     -> Repo-owned OpenAI account auth (`scripts/lib/openai-account-auth/`)
     -> Agent runtime (@openai/agents via custom Codex provider)
     -> Typed tool adapters around scripts/*.mjs
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

### Core components

#### 1. Frontend app

Primary UI surfaces:

- chat / workflow console
- onboarding wizard
- pipeline / tracker page
- report viewer
- batch jobs page
- scan review page
- settings page
- approval prompts / interruptions

#### 2. Local API server

Owns:

- authless single-user app session
- route handlers for workflows
- job scheduling
- run persistence
- repo workspace access
- guardrails around tools and filesystem writes

#### 3. Agent runtime

Use `@openai/agents` as the primary orchestration layer for interactive and
multi-step workflows.

Use the repo-owned OpenAI account auth path documented in
`docs/OPENAI_ACCOUNT_AUTH.md` and implemented under
`scripts/lib/openai-account-auth/` as the required model-access layer for the
Agents SDK.

Use direct Responses API calls only where the full SDK loop adds no value, such
as small one-shot classification or extraction helpers.

#### 4. Tool adapter layer

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

#### 5. Background job runner

Owns:

- async evaluation jobs
- batch evaluation fan-out
- scan jobs
- PDF jobs
- retries and terminal failure states

#### 6. App state store

Use SQLite for app-owned operational state:

- conversations / sessions
- background jobs
- approvals and interruptions
- UI metadata
- cached run summaries

Do not migrate the core user-layer files into SQLite during the initial
parity migration.

#### 7. Workspace adapter

A thin repo-aware layer that resolves paths, enforces user/system boundaries,
and exposes deterministic read/write primitives to the agent runtime.

## Data Model Strategy

### Source-of-truth policy

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

### App-owned state

Store only operational app state outside the repo artifacts:

- UI sessions
- background run state
- approval state
- trace IDs / telemetry references
- optimistic cache for list views

Suggested location:

- `.jobhunt-app/app.db`
- `.jobhunt-app/logs/`

This keeps the migration reversible and preserves compatibility with the Go
dashboard and existing maintenance scripts until the app fully replaces them.

## Agent Design

### Recommended topology

Use one router / orchestrator agent plus a small number of specialist agents.

#### Router agent

Responsibilities:

- detect user intent
- select the correct workflow
- gather missing inputs
- hand off to the correct specialist

#### Specialist agents

- onboarding agent
- evaluation agent
- scan agent
- application-help agent
- tracker agent
- research / interview / follow-up agent
- batch supervisor agent

### Prompt source strategy

Do not bury the product behavior in opaque strings inside the backend.

The checked-in prompt system should remain explicit and repo-owned:

- `AGENTS.md` stays as global policy input
- `modes/*.md` remain the durable workflow contracts
- app-owned prompt wrappers may compose these files, but should not silently
  replace them

This keeps the current product logic inspectable and diffable.

## Tooling Strategy

### Preferred approach

Use explicit backend tools that call the existing scripts and helpers.

Why:

- more deterministic than a generic shell
- easier to test
- easier to permission
- easier to log and retry
- preserves current script boundaries

### Raw shell policy

Raw shell access should be an implementation fallback, not a primary product
tool. If used at all, keep it server-owned and unavailable to end-user prompt
space except through constrained wrappers.

### Browser / Playwright policy

Use backend-owned Playwright flows first.

Do not make arbitrary computer-use browsing the primary implementation path for
current repo workflows unless a workflow truly requires open-ended page
interaction. The current repo already has deterministic browser-backed logic
for specific tasks, and the app should preserve that bias.

For URL-based workflows, preserve the current verification bias:

- browser-backed live posting verification first when available
- repo-owned liveness helpers second
- weaker fetch/search fallback only when the stronger checks are unavailable

## UI Requirements

### Required app surfaces

#### 1. Chat / run console

- accept free-form user input
- display workflow selection and progress
- show generated outputs and follow-up tasks
- support resumable conversations

#### 2. Pipeline page

- show current applications
- filter by status
- sort by score / date / urgency
- open report and PDF artifacts
- edit status

#### 3. Report viewer

- render markdown reports
- show header metadata
- support long reports cleanly

#### 4. Batch page

- create batch inputs
- show per-item state
- expose retries, warnings, and failures
- surface structured worker results

#### 5. Scan review page

- run scan
- inspect shortlist and pending items
- launch evaluation from shortlisted roles

#### 6. Settings / profile page

- edit or open user-layer files
- show missing prerequisites
- expose update check and maintenance actions

#### 7. Approval UI

- show pending approvals or interruptions
- allow approve / reject / resume
- show why the action needs review

## Functional Requirements

### FR1. Onboarding parity

The app must reproduce the current startup checklist and onboarding behavior
without requiring manual CLI interpretation.

### FR2. Auto-pipeline parity

Given a pasted job URL or JD text, the app must be able to:

- extract the JD
- verify the posting status when the input is a live URL
- run evaluation A-G
- save the report
- generate the PDF
- update tracker additions
- surface manual follow-ups when needed

### FR3. Batch parity

The app must preserve the structured batch semantics already encoded in:

- `batch/batch-runner.sh`
- `batch/batch-state.tsv`
- `batch/worker-result.schema.json`

The implementation may change, but the observable result contract should remain
compatible until a deliberate contract migration is approved.

### FR4. Artifact parity

Generated files must remain deterministic and discoverable in their current
locations unless a migration path is explicitly designed and versioned.

This includes current report and workflow invariants such as:

- report headers preserving `**URL:**` and `**Legitimacy:**`
- tracker additions remaining TSV-first before merge
- scan and follow-up workflows continuing to use their existing file surfaces
  such as `data/pipeline.md`, `data/scan-history.tsv`, and `data/follow-ups.md`

### FR5. Tracker integrity

The app must preserve:

- TSV-first tracker additions for new evaluations
- merge-then-verify workflow
- status normalization rules
- duplicate detection expectations

### FR6. Session continuity

Users must be able to resume app conversations and interrupted runs without
losing workflow context.

### FR7. Background execution

Long-running jobs must not block the UI request lifecycle.

### FR8. Approval handling

The app must support explicit pause / resume behavior for human-review steps.

### FR9. Observability

The app must expose enough logs, traces, and run metadata to debug failures
without reading raw model output blindly.

### FR10. Compare-offers parity

The app must preserve the current ability to compare multiple evaluated roles
or offers side by side using existing report artifacts and user-provided offer
details.

## Non-Functional Requirements

- local-first by default
- deterministic output paths
- explicit permission boundaries around writes
- resumable long-running tasks
- low operational overhead for a single user
- no hidden dependence on Codex CLI after parity is reached
- testable parity against current report / tracker / PDF behavior

## Required OpenAI Runtime Architecture

As of `2026-04-20`, the current OpenAI docs still describe the default Agents
SDK OpenAI path in API-key/client terms. That is not the supported auth model
for this project.

Project requirement:

- OpenAI account login is the primary and only supported OpenAI access path
- OpenAI Platform API key setup is not part of normal onboarding
- no API-key fallback is treated as supported project behavior
- `docs/OPENAI_ACCOUNT_AUTH.md` is the source-of-truth auth/runtime contract
  for repo-owned OpenAI access
- `scripts/lib/openai-account-auth/` is the required implementation basis for
  Agents SDK model access, transport, refresh, and credential storage unless it
  is deliberately superseded in-place

Required use in this project:

- Agents SDK only as the orchestration/runtime layer
- a custom account-authenticated Codex provider for model access
- Pi-style login, refresh, storage, account-id extraction, and Codex transport
  adapted into app-owned infrastructure
- explicit sessions for persistent single-user conversations
- prefer a local/custom session backend by default for local-first parity;
  evaluate `OpenAIConversationsSession` only if server-managed memory is a
  deliberate product choice
- background mode or equivalent long-running job handling for evaluation and
  batch work where request timeouts would otherwise be a risk

Architecture implication:

- the app must not depend on `OPENAI_API_KEY` for development, onboarding, or
  primary runtime execution
- the app should extend or directly reuse the checked-in account-auth stack,
  not introduce a parallel OpenAI auth implementation with different runtime
  behavior

## Migration Plan

### Phase 1: foundation and repo contract

- define backend / frontend package structure
- add app-owned state directory
- formalize repo workspace adapter
- codify prompt-loading strategy from existing files

### Phase 2: backend runtime and job infrastructure

- build the Node/TypeScript API
- add SQLite store for sessions, jobs, and approvals
- implement the background job runner
- integrate the checked-in OpenAI account auth/provider stack from
  `scripts/lib/openai-account-auth/`
- add trace and log plumbing

### Phase 3: typed tools and agent orchestration

- wrap existing scripts as explicit tools
- preserve current file outputs
- add deterministic error mapping
- add unit coverage for tool wrappers
- wire router and specialist agent boundaries

### Phase 4: chat, onboarding, and approvals UX

- implement chat / run console
- implement startup checklist and onboarding wizard
- implement resumable conversations and approval prompts
- add settings basics for prerequisite visibility and maintenance actions

### Phase 5: evaluation, artifacts, and tracker parity

- implement auto-pipeline and evaluation flows
- implement report viewer
- preserve PDF generation triggers and output placement
- implement pipeline / tracker page
- preserve tracker-addition and verification semantics

### Phase 6: scan, batch, and application-help parity

- implement scan flows and shortlist review
- replace batch runner UI and orchestration
- support application-help flows and approval checkpoints
- add job-level failure, warning, retry, and resume visibility

### Phase 7: specialist workflows, dashboard replacement, and cutover

- implement remaining specialist flows:
  - compare offers
  - deep company research
  - LinkedIn outreach drafting
  - interview prep
  - training / certification review
  - project idea review
  - follow-up cadence
  - rejection pattern analysis
- reach parity with the current Go dashboard views
- finalize settings, maintenance, and update-check surfaces
- decide whether to retire or keep the Go dashboard as a secondary operator
  surface
- remove Codex CLI from primary onboarding
- run final parity validation and close migration gaps

## Validation Strategy

### 1. Artifact-level parity

Create golden-path tests that compare:

- report creation
- report header invariants such as `URL` and `Legitimacy`
- tracker TSV creation
- merge + verify behavior
- PDF generation triggers and file placement
- scan / pipeline / follow-up file placement and update semantics

### 2. Workflow parity

For each major mode, verify that the app can complete the same workflow class
that the current Codex path supports.

This should explicitly include:

- auto-pipeline from a pasted URL
- scan -> shortlist -> pipeline round-trip
- compare-offers review from existing artifacts
- follow-up tracking round-trip with `data/follow-ups.md`

### 3. Failure semantics

Test:

- missing profile inputs
- partial batch results
- infrastructure failures
- resumable approvals
- invalid tracker writes
- conflicting or stale job-verification signals

### 4. UX validation

Verify that a single operator can complete the main loop entirely in the app:

- onboard
- scan
- evaluate
- open report
- update tracker
- run batch
- resume interrupted job

## Risks

### 1. Prompt drift risk

If the app re-implements workflow behavior in code and quietly bypasses
`modes/*.md`, the product logic will fork.

Mitigation:

- keep prompt logic checked in
- load and compose existing mode files explicitly

### 2. Overpowered tool risk

If the model gets a broad shell instead of typed tools, determinism and safety
will regress.

Mitigation:

- prefer explicit tools
- keep shell behind backend control only

### 3. Hidden state split

If SQLite and repo files both become competing sources of truth, debugging will
become painful.

Mitigation:

- repo files remain canonical for domain data in this phase
- SQLite stores operational state only

### 4. Browser automation fragility

Application-help flows can become brittle if migrated to arbitrary computer use
too early.

Mitigation:

- preserve backend-owned Playwright helpers first
- adopt open-ended computer use only where deterministic flows are insufficient

### 5. Scope inflation

"Full app" can accidentally expand into multi-user SaaS work.

Mitigation:

- keep this PRD strictly single-user and local-first
- defer auth, tenancy, billing, and hosted storage

## Open Design Questions

- Should the first shipped app be web-only, or should it launch immediately as
  an Electron/Tauri desktop shell?
- Should the Go dashboard remain supported after parity, or be deprecated once
  the web pipeline page is stable?
- Should batch workers keep writing the exact current state files, or should
  the app introduce a versioned state contract after initial parity is reached?
- Which session backend should own conversation memory: custom local storage,
  `OpenAIConversationsSession`, or a hybrid model?

## Recommendation

Ship this as a local web app first.

Keep the current repo file contract intact. Build a TypeScript backend around
the Agents SDK, explicit tool wrappers, SQLite-backed operational state, and a
React frontend. Reach feature parity before considering a database-first or
multi-user evolution.

This gives jobhunt a real app surface without throwing away the parts of the
repo that already work.

## Definition of Done

This PRD is satisfied when all of the following are true:

- a single user can use jobhunt primarily through the app without launching
  `codex`
- the main workflows have app parity with the current Codex-primary path
- reports, PDFs, tracker additions, and verification still work
- long-running runs are resumable and visible in the UI
- approvals are explicit and recoverable
- the app runtime is observable and testable
- Codex CLI is no longer required for primary single-user operation

## External Runtime References

These current OpenAI references informed the runtime assumptions in this PRD:

- Agents SDK overview: https://platform.openai.com/docs/guides/agents-sdk/
- Agents SDK JS running agents:
  https://openai.github.io/openai-agents-js/guides/running-agents/
- Agents SDK JS sessions:
  https://openai.github.io/openai-agents-js/guides/sessions/
- Agents SDK JS tools:
  https://openai.github.io/openai-agents-js/guides/tools/
- Background mode:
  https://developers.openai.com/api/docs/guides/background
