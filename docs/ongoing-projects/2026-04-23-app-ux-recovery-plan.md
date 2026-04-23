# 2026-04-23 App UX Recovery Plan

## Context

The current web app is not a faithful implementation of
`.spec_system/PRD/PRD_UX.md`.

The main failures are now clear:

- internal implementation language leaked into operator-facing UI
- the visual system drifted into generic AI dashboard patterns
- the shell layout does not match the editorial three-zone workbench defined in
  the UX PRD
- multiple core UX PRD features were never actually built
- the spec workflow validated code completion and behavioral correctness, but
  did not enforce UX translation quality

This document is a recovery plan, not a defense of the current output.

## Recovery Goal

Replace the current web UX with an operator-grade workbench that:

- matches the information hierarchy, tone, and visual system in
  `.spec_system/PRD/PRD_UX.md`
- removes all internal planning and engineering jargon from user-facing copy
- restores clear run, artifact, review, and approval flows
- adds frontend quality gates so this failure mode cannot quietly ship again

## Non-Negotiables

- No user-facing copy may contain build-process language such as `phase`,
  `session`, `payload`, `endpoint`, `contract`, `surface`, or similar internal
  implementation terms.
- No new UX work should ship on top of the current foundation until the design
  tokens, copy rules, and shell layout are reset.
- No UI session may be considered complete without desktop and mobile screenshot
  review against the UX PRD.
- No UI session may go straight through `implement` without the design brief and
  design-system work from `sculpt-ui`.

## Immediate Triage

### 1. Freeze additive UI work

Do not add new app surfaces, widgets, or visual polish until the shell
foundation is rebuilt.

Affected areas:

- `apps/web/src/shell/*`
- `apps/web/src/chat/*`
- `apps/web/src/reports/*`
- `apps/web/src/pipeline/*`
- `apps/web/src/scan/*`
- `apps/web/src/batch/*`
- `apps/web/src/tracker/*`
- `apps/web/src/workflows/*`

### 2. Remove operator-hostile copy first

Purge internal language from the current app before any visual work continues.

Known bad examples already identified:

- `apps/web/src/chat/chat-console-surface.tsx`
- `apps/web/src/reports/report-viewer-surface.tsx`
- `apps/web/src/shell/navigation-rail.tsx`

Replace them with operator language focused on:

- what this area is for
- what the person can do next
- what result exists now
- what is blocked and why

### 3. Establish a banned-terms check

Add a deterministic copy check script that fails on internal implementation
jargon in `apps/web/src`.

Suggested script:

- `scripts/check-app-ui-copy.mjs`

Initial banned terms:

- `phase`
- `session`
- `payload`
- `endpoint`
- `contract`
- `surface`
- `route message`
- `artifact review surface`
- `canonical`

This should run in the web validation path and in CI.

## Workstream 1: Rebuild the Visual Foundation

### Goal

Replace the current inline-style glassmorphism and generic dashboard aesthetic
with the actual PRD-defined visual system.

### Specific changes

1. Introduce a real token layer for the app.
   Files to add:
   - `apps/web/src/styles/tokens.css`
   - `apps/web/src/styles/base.css`
   - `apps/web/src/styles/layout.css`

2. Load the typography defined by the UX PRD.
   Required fonts:
   - `Space Grotesk`
   - `IBM Plex Sans`
   - `IBM Plex Mono`

3. Move colors, spacing, radius, borders, and typography out of repeated inline
   objects and into shared CSS custom properties.

4. Replace the current purple-tinted radial gradient, white glass cards, and
   `Avenir Next` shell in:
   - `apps/web/src/shell/operator-shell.tsx`
   - `apps/web/src/shell/navigation-rail.tsx`
   - `apps/web/src/shell/status-strip.tsx`
   - `apps/web/src/shell/operator-home-surface.tsx`

5. Enforce the PRD palette:
   - mineral paper base
   - deep ink for rails and dense chrome
   - disciplined cobalt accent
   - restrained status colors

### Acceptance criteria

- A static screenshot of the shell with no app data still reads as intentional,
  distinctive, and aligned with the UX PRD.
- The app no longer reads like a generic SaaS or AI demo.
- The shell uses shared tokens, not repeated ad hoc inline color values.

## Workstream 2: Rebuild the Shell Around the Actual Layout Philosophy

### Goal

Implement the PRD's real shell composition:

- stable left rail
- dominant center canvas
- narrower right rail for evidence, artifacts, or approvals

### Specific changes

1. Rework `apps/web/src/shell/operator-shell.tsx` into a true three-zone
   desktop layout.

2. Keep the right rail persistent on desktop instead of collapsing everything
   into auto-fit card grids.

3. Add tablet and mobile-specific layout behavior rather than relying on
   generic responsive collapse.

4. Add a command palette and keyboard jump model.
   Files to add:
   - `apps/web/src/shell/command-palette.tsx`
   - `apps/web/src/shell/use-command-palette.ts`

5. Replace current shell section intros with concise titles plus one short
   sentence of operator guidance, not explanatory engineering prose.

### Acceptance criteria

- Desktop shell visibly has three distinct work zones.
- Tablet shell uses a collapsed rail and detail drawer, not a broken desktop
  layout.
- Mobile is review-first and remains legible without dense multi-column author
  flows.
- `Cmd/Ctrl+K` opens a working command palette for screens and major actions.

## Workstream 3: Rebuild the Evaluation Console and Artifact Handoff

### Goal

Turn the current chat/evaluation area into the signature run-to-artifact
handoff described in the UX PRD.

### Specific changes

1. Rebuild these files as one coherent flow:
   - `apps/web/src/chat/chat-console-surface.tsx`
   - `apps/web/src/chat/workflow-composer.tsx`
   - `apps/web/src/chat/run-status-panel.tsx`
   - `apps/web/src/chat/run-timeline.tsx`
   - `apps/web/src/chat/evaluation-artifact-rail.tsx`
   - `apps/web/src/chat/recent-session-list.tsx`

2. Make the center canvas the place where active run understanding happens.

3. Make the right rail a compact artifact packet:
   - score
   - legitimacy
   - report state
   - PDF state
   - tracker state
   - warning summary
   - next actions

4. Remove verbose helper copy that explains implementation details instead of
   helping the operator decide.

5. Introduce a real run detail route.
   Minimum requirement:
   - support `/runs/:runId`
   - show timeline, logs summary, artifact state, and resume or retry actions

### Acceptance criteria

- A person can understand the state of one evaluation in under 15 seconds.
- Completed, paused, failed, and degraded runs are clearly distinct at a glance.
- The artifact handoff feels like closure, not another wall of cards.

## Workstream 4: Rebuild Review Surfaces for Scanning, Not Explaining

### Goal

Make report, pipeline, tracker, batch, and scan surfaces readable for a
stressed operator doing triage, not for an AI narrating state.

### Specific changes

1. Rebuild report viewing around reading ergonomics.
   Files:
   - `apps/web/src/reports/report-viewer-surface.tsx`
   - `apps/web/src/reports/*`

   Required behaviors:
   - sticky metadata rail
   - visible section markers or table of contents
   - wider reading column
   - obvious artifact actions

2. Rebuild pipeline review around dense hybrid rows plus a context rail.
   Files:
   - `apps/web/src/pipeline/pipeline-review-surface.tsx`
   - `apps/web/src/pipeline/*`

3. Rebuild tracker, scan, and batch surfaces around:
   - dense scanning rows
   - sticky filters where needed
   - context rail updates without route churn
   - clear action shelves

4. Remove the repeated pattern of generic white cards in auto-fit grids as the
   default solution to every screen.

### Acceptance criteria

- Report viewer reads like a real long-form artifact browser, not a diagnostic
  panel.
- Pipeline, scan, tracker, and batch surfaces support rapid visual scanning and
  preserve context.
- The right rail consistently acts as evidence or detail, not as another card
  bucket.

## Workstream 5: Route and Interaction Parity

### Goal

Close the gap between named PRD features and actual product behavior.

### Missing features to implement

Several of these are delivered by earlier workstreams; this list tracks PRD
parity regardless of which workstream builds them.

- `/runs/:runId` (Workstream 3)
- command palette (Workstream 2)
- sticky report metadata rail (Workstream 4)
- sticky section marker or table of contents behavior (Workstream 4)
- explicit deep linking for report and workflow review states

### Recommendation

Adopt a real router for app-owned navigation instead of continuing to stretch
hash and query syncing beyond its useful limit.

Likely files:

- `apps/web/src/App.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/shell/operator-shell.tsx`
- client helpers under each surface module

### Acceptance criteria

- Important review states are deep-linkable.
- Refreshing the browser does not lose the operator's place.
- Routes match the UX PRD where the PRD defines explicit paths.

## Workstream 6: Repair the Workflow That Allowed This

### Goal

Stop the spec system from treating UX slop as successful implementation.

### Changes required outside the app code

1. Make `sculpt-ui` mandatory for UI sessions.
   Files:
   - `/home/aiwithapex/.codex/skills/apex-spec/references/implement.md`
   - `/home/aiwithapex/.codex/skills/apex-spec/references/plansession.md`
   - `/home/aiwithapex/.codex/skills/apex-spec/SKILL.md`

2. Update `plansession` so UI task descriptions explicitly include:
   - copy translation
   - token and typography setup
   - desktop and mobile layout behavior
   - screenshot review
   - PRD fidelity checks

3. Add a UX translation checklist to `implement`.
   Required checks for UI tasks:
   - no internal process jargon in product copy
   - user-facing copy written for a stressed operator
   - design tokens align with PRD palette and typography
   - layout matches the PRD's zone hierarchy
   - screenshots reviewed before checking the task off

4. Add a UX fidelity gate to `validate`.
   Required fail conditions for UI sessions:
   - banned internal terms present in user-visible strings
   - PRD-defined routes or interactions missing
   - screenshot review not produced
   - visual system drift from PRD tokens

5. Integrate deterministic tooling into CI:
   - `scripts/check-app-ui-copy.mjs` (introduced in Immediate Triage §3)
   - `scripts/test-app-ui-smoke.mjs`
   - optional screenshot snapshots for shell, chat, report, and pipeline

### Acceptance criteria

- A UI session cannot pass `validate` with generic AI-dashboard styling.
- A UI session cannot pass `validate` with internal build jargon on screen.
- A UI session cannot pass `validate` by merely having all files and tests in
  place.

## Execution Order

### Phase A: Stop the bleeding (Immediate Triage, Workstream 6 tooling)

1. Add banned-terms copy check.
2. Strip internal process language from current visible UI.
3. Freeze additive UI work until shell rebuild begins.

### Phase B: Rebuild the foundation (Workstreams 1, 2, 5)

1. Tokenize typography, color, spacing, and layout.
2. Rebuild shell composition.
3. Adopt a real router for app-owned navigation.
4. Add command palette and proper navigation model.

### Phase C: Rebuild the main workbench (Workstreams 3, 4, 5)

1. Rebuild evaluation console and artifact handoff.
2. Add run detail route.
3. Rebuild report and pipeline surfaces.
4. Add explicit deep linking for major review states.

### Phase D: Rebuild the review system (Workstreams 4, 6)

1. Rebuild tracker, scan, batch, and specialist review surfaces.
2. Add screenshot-based UX validation.
3. Update apex-spec frontend guardrails.

## Definition of Done

This turnaround is only complete when all of the following are true:

- the app matches the visual and interaction intent of `PRD_UX.md`
- user-facing UI contains no internal implementation language
- the shell, chat, report, and pipeline screens are human-scannable on desktop
  and mobile
- the app has real route and review parity for the major PRD-defined flows
- the spec workflow now fails bad UX the same way it already fails broken code

## Bottom Line

The correct recovery move is not to polish the current UI. The correct move is
to replace the foundation, rebuild the main workbench, and change the workflow
so completion metrics can no longer masquerade as design quality.
