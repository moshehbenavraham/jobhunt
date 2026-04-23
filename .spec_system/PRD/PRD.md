# Job-Hunt - Product Requirements Document

## Overview

UX recovery effort for the Job-Hunt web app. The current implementation is not
a faithful translation of `.spec_system/PRD/PRD_UX.md`. Internal implementation
language leaked into operator-facing UI, the visual system drifted into generic
AI dashboard patterns, the shell layout does not match the editorial three-zone
workbench, and multiple core UX PRD features were never built.

This PRD governs the rebuild, not incremental polish.

**Source of truth:** `docs/ongoing-projects/2026-04-23-app-ux-recovery-plan.md`

## Recovery Goal

Replace the current web UX with an operator-grade workbench that:

- matches the information hierarchy, tone, and visual system in `PRD_UX.md`
- removes all internal planning and engineering jargon from user-facing copy
- restores clear run, artifact, review, and approval flows
- adds frontend quality gates so this failure mode cannot quietly ship again

## Non-Negotiables

1. No user-facing copy may contain build-process language (`phase`, `session`,
   `payload`, `endpoint`, `contract`, `surface`, or similar).
2. No new UX work ships on top of the current foundation until design tokens,
   copy rules, and shell layout are reset.
3. No UI session is complete without desktop and mobile screenshot review against
   the UX PRD.
4. No UI session may skip the design brief and design-system work from
   `sculpt-ui`.

## Goals

1. Faithful visual and interaction translation of PRD_UX.md
2. Operator-grade information density and scan ergonomics
3. Zero internal jargon in any user-facing surface
4. Deterministic frontend quality gates in CI
5. Deep-linkable routes for all major review states

## Phases

| Phase | Name                                  | Sessions   | Status            |
| ----- | ------------------------------------- | ---------- | ----------------- |
| 00    | Stop the Bleeding                     | 0 (triage) | Complete          |
| 01    | Rebuild Foundation and Shell          | 6          | In Progress (5/6) |
| 02    | Rebuild Workbench and Review Surfaces | TBD        | Not Started       |

## Phase 00: Stop the Bleeding

**Source:** Recovery plan Phase A + Workstream 6 tooling

Triage phase. Add deterministic quality gates, purge internal jargon from
current UI, update spec workflow so future UI sessions cannot ship without
UX fidelity checks. No visual rebuild work happens here.

### Objectives

1. Add banned-terms copy check script (`scripts/check-app-ui-copy.mjs`) and
   wire it into CI
2. Strip internal process language from all currently visible UI strings
3. Update spec workflow: make `sculpt-ui` mandatory for UI sessions, add UX
   translation checklist to `implement`, add UX fidelity gate to `validate`

### Estimated sessions: 3-4

### Sessions (To Be Defined)

Use `/plansession` to get recommendations for sessions to implement.

## Phase 01: Rebuild Foundation and Shell

**Source:** Recovery plan Phase B (Workstreams 1, 2, 5)

Replace the visual foundation and shell composition. This is where design
tokens, typography, the three-zone layout, routing, and the command palette
land. Nothing ships to users until this phase makes the shell read as
intentional and distinctive.

### Objectives

1. Introduce design token layer (`tokens.css`, `base.css`, `layout.css`) with
   the PRD palette (mineral paper, deep ink, disciplined cobalt, restrained
   status colors)
2. Load PRD-defined typography (Space Grotesk, IBM Plex Sans, IBM Plex Mono)
3. Move all inline style values to shared CSS custom properties
4. Rework operator shell into a true three-zone layout (left rail, center
   canvas, right evidence rail)
5. Add tablet and mobile-specific layout behavior
6. Adopt a real router for app-owned deep-linkable navigation
7. Add command palette with `Cmd/Ctrl+K`
8. Replace section intros with concise operator-focused copy

### Sessions: 6

## Phase 02: Rebuild Workbench and Review Surfaces

**Source:** Recovery plan Phases C + D (Workstreams 3, 4, 6)

Rebuild the main evaluation workbench and all review surfaces on top of the
Phase 01 foundation. Evaluation console, artifact handoff, report viewer,
pipeline, tracker, scan, and batch surfaces all land here. Closes with
screenshot validation and final spec guardrail updates.

### Objectives

1. Rebuild evaluation console as a coherent run-to-artifact handoff flow
2. Make center canvas the active run understanding zone, right rail the compact
   artifact packet
3. Introduce `/runs/:runId` detail route with timeline, logs, artifact state,
   and resume/retry
4. Achieve 15-second state comprehension for any single evaluation
5. Rebuild report viewer with reading ergonomics (sticky metadata, section
   markers, wide reading column)
6. Rebuild pipeline review with dense hybrid rows and context rail
7. Rebuild tracker, scan, and batch surfaces for dense scanning with sticky
   filters, context rail, and clear action shelves
8. Add explicit deep linking for report and workflow review states
9. Add screenshot-based UX validation to spec workflow
10. Update apex-spec frontend guardrails

### Estimated sessions: 6-8

## Technical Stack

- TypeScript React (Vite) -- `apps/web`
- TypeScript Node -- `apps/api`
- CSS custom properties for design tokens
- Space Grotesk / IBM Plex Sans / IBM Plex Mono typography
- React Router for deep-linkable navigation

## Success Criteria

- [ ] App matches the visual and interaction intent of PRD_UX.md
- [ ] User-facing UI contains no internal implementation language
- [ ] Shell, chat, report, and pipeline screens are human-scannable on desktop
      and mobile
- [ ] App has real route and review parity for major PRD-defined flows
- [ ] Spec workflow fails bad UX the same way it already fails broken code
- [ ] Deterministic copy check runs in CI
- [ ] Screenshot review is part of every UI session validation

## Reference Documents

- `docs/ongoing-projects/2026-04-23-app-ux-recovery-plan.md` -- source recovery plan
- `.spec_system/PRD/PRD_UX.md` -- canonical UX specification (if present)
- `.spec_system/archive/` -- full history from Phases 00-06 original build
