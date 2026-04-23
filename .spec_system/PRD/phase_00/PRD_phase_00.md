# Phase 00: Stop the Bleeding

**Status**: Complete
**Progress**: Triage phase (no formal sessions)

## Overview

Triage phase before any visual rebuild begins. Adds deterministic quality gates,
purges internal jargon from user-facing UI, and updates the spec workflow so
future UI sessions cannot ship without UX fidelity checks.

Maps to **Phase A** of the recovery plan:
`docs/ongoing-projects/2026-04-23-app-ux-recovery-plan.md`

## Objectives

1. Add banned-terms copy check script (`scripts/check-app-ui-copy.mjs`) that
   fails on internal implementation jargon in `apps/web/src`, wired into CI
2. Strip internal process language from all currently visible UI strings
3. Update spec workflow: make `sculpt-ui` mandatory for UI sessions, add UX
   translation checklist to `implement`, add UX fidelity gate to `validate`

## Banned Terms (Initial List)

`phase`, `session`, `payload`, `endpoint`, `contract`, `surface`,
`route message`, `artifact review surface`, `canonical`

## Acceptance Criteria

- [ ] `scripts/check-app-ui-copy.mjs` exists and fails when banned terms appear
      in user-visible strings under `apps/web/src`
- [ ] All currently visible UI strings pass the banned-terms check
- [ ] `sculpt-ui` is documented as mandatory for UI sessions
- [ ] `implement` includes a UX translation checklist for UI tasks
- [ ] `validate` includes UX fidelity fail conditions for UI sessions
- [ ] No new UI surfaces, widgets, or visual polish until Phase 01

## Estimated Sessions: 3-4

## Progress Tracker

| Session | Name                | Status | Validated |
| ------- | ------------------- | ------ | --------- |
| -       | No sessions defined | -      | -         |

## Next Steps

Run `/plansession` to get the first session recommendation.
