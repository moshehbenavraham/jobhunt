# Session 01: Operator Shell and Navigation Foundation

**Session ID**: `phase03-session01-operator-shell-and-navigation-foundation`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Replace the bootstrap-only screen with a navigable operator shell that frames
startup, chat, onboarding, approvals, and settings as distinct app surfaces
driven by live backend state.

---

## Scope

### In Scope (MVP)

- Define the top-level app shell, navigation model, and shared layout for the
  operator experience
- Reuse existing startup and runtime summaries so the shell can show active
  session, readiness, and pending-work indicators
- Add any thin API view-model or summary endpoint changes needed to support a
  stable shell without leaking internal store details
- Add smoke coverage for shell boot, navigation, and offline or error states

### Out of Scope

- Chat message submission or transcript UX
- Onboarding repair mutations
- Approval decision actions

---

## Prerequisites

- [ ] Phase 02 completed and archived

---

## Deliverables

1. Operator shell with stable navigation and shared status regions
2. Shell-facing backend summary contract for readiness and active-work badges
3. Smoke coverage for first-load, offline, and runtime-error shell states

---

## Success Criteria

- [ ] Users can move between core app surfaces without losing live status
- [ ] The shell stays backed by API-owned state instead of duplicated browser
      logic
- [ ] Later sessions can add chat, onboarding, and approvals without
      rebuilding the shell foundation
