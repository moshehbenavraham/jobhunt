# Session 03: Startup Checklist and Onboarding Wizard

**Session ID**: `phase03-session03-startup-checklist-and-onboarding-wizard`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Turn the existing startup diagnostics into a guided onboarding and repair flow
that explains missing prerequisites, previews template-backed fixes, and
refreshes readiness after explicit user action.

---

## Scope

### In Scope (MVP)

- Present the startup checklist as a guided onboarding surface instead of a
  static diagnostics panel
- Reuse the typed inspection, preview, and repair tools for missing onboarding
  files and tracker skeleton setup
- Show canonical file paths, template sources, and post-repair refresh states
- Add validation coverage for missing-file, repair-preview, repair-success,
  and repair-failure flows

### Out of Scope

- Full profile editing or document authoring in the browser
- Artifact generation or evaluation workflows beyond readiness handoff
- Settings and maintenance surfaces outside onboarding needs

---

## Prerequisites

- [ ] Session 01 operator shell and navigation foundation completed

---

## Deliverables

1. Guided startup checklist and onboarding wizard in the app shell
2. Preview and repair integration for the canonical onboarding file set
3. Coverage for explicit repair and readiness-refresh flows

---

## Success Criteria

- [ ] Users can see exactly which startup files are missing and why they matter
- [ ] Users can preview deterministic repair actions before any mutation
- [ ] Readiness refresh after repair reflects the live repo state without
      hidden writes
