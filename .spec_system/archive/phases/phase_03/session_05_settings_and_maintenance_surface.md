# Session 05: Settings and Maintenance Surface

**Session ID**: `phase03-session05-settings-and-maintenance-surface`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~13
**Estimated Duration**: 2-4 hours

---

## Objective

Close the phase with a settings surface that exposes authenticated runtime
state, startup health, maintenance guidance, and operator-facing diagnostics
needed to use the app as the primary local entry point.

---

## Scope

### In Scope (MVP)

- Build a settings page for startup status, auth readiness, repo paths, and
  maintenance guidance
- Reuse backend summaries for update-check visibility, prompt and tool support,
  and operational-store health where those contracts already exist
- Add light-weight maintenance actions or refresh affordances only where the
  existing API surface can support them safely
- Add validation or smoke coverage for settings-state rendering and refresh

### Out of Scope

- Full artifact management or dashboard replacement
- Multi-user account settings
- New workflow implementation that belongs to later parity phases

---

## Prerequisites

- [ ] Session 01 operator shell and navigation foundation completed
- [ ] Session 02 chat console and session resume completed
- [ ] Session 03 startup checklist and onboarding wizard completed
- [ ] Session 04 approval inbox and human review flow completed

---

## Deliverables

1. Settings and maintenance surface with operator-facing runtime diagnostics
2. Safe refresh and maintenance affordances backed by existing API contracts
3. Phase-close coverage for the primary operator shell surfaces

---

## Success Criteria

- [ ] Users can inspect startup, auth, and maintenance status from one place
- [ ] Settings data stays sourced from backend-owned summaries and contracts
- [ ] The app has the minimum UX surface required to replace CLI-first startup
      for everyday interactive use
