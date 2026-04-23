# Session 07: Deep Linking, Approvals, and Guardrails

**Session ID**: `phase02-session07-deep-linking-approvals-and-guardrails`
**Status**: Not Started
**Estimated Tasks**: ~18
**Estimated Duration**: 2-4 hours
**Packages**: apps/web, apps/api

---

## Objective

Close remaining deep-linking gaps, rebuild the approvals inbox, add
context-aware commands to the command palette, and establish screenshot-based
UX validation in the spec workflow.

---

## Scope

### In Scope (MVP)

- Add explicit deep-link routes for workflow review states
  (/workflows/:workflowId, /batch/:batchId, /scan/:scanId)
- Rebuild approval-inbox-surface.tsx for dense approval scanning
- Rebuild interrupted-run-panel.tsx for clear resume/dismiss actions
- Rebuild approval-queue-list.tsx and approval-context-panel.tsx
- Rebuild approval-decision-bar.tsx with clear accept/reject actions
- Clean pre-existing banned-term violations in approvals files
- Add context-aware commands to command palette registry
- Add screenshot-based UX validation guidance to spec workflow
- Update apex-spec frontend guardrails for Phase 02 patterns
- Migrate all inline hex/RGB values to design tokens
- Final banned-terms pass across all apps/web/src
- sculpt-ui design brief before implementation

### Out of Scope

- Automated screenshot snapshot CI (future enhancement)
- New approval types beyond current contract
- Self-hosted fonts migration

---

## Prerequisites

- [ ] Sessions 01-06 complete (all surfaces rebuilt)
- [ ] sculpt-ui design brief produced for approvals and final polish

---

## Deliverables

1. Working deep-link routes for workflows, batch, and scan review states
2. Rebuilt approvals inbox with dense scanning and clear decision actions
3. Context-aware command palette commands
4. Screenshot-based UX validation documentation for spec workflow
5. Updated apex-spec frontend guardrails
6. Final banned-terms compliance across all surfaces
7. Token-compliant styling across all rebuilt approvals components

---

## Success Criteria

- [ ] All major review states are deep-linkable (runs, reports, workflows,
      batch, scan)
- [ ] Approvals inbox supports rapid triage with clear accept/reject
- [ ] Command palette includes context-aware commands for current surface
- [ ] Spec workflow documents screenshot validation requirements
- [ ] Final banned-terms check passes across all apps/web/src
- [ ] No inline hex/RGB color values anywhere in apps/web/src
- [ ] Desktop and mobile screenshots produced for all rebuilt surfaces
- [ ] Phase 02 success criteria from PRD_phase_02.md fully met
