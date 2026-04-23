# Session 06: Batch and Specialist Surfaces

**Session ID**: `phase02-session06-batch-and-specialist-surfaces`
**Status**: Not Started
**Estimated Tasks**: ~20
**Estimated Duration**: 2-4 hours
**Packages**: apps/web, apps/api

---

## Objective

Rebuild the batch workspace, specialist review, and application help surfaces
for dense operator scanning with consistent three-zone layout, context rail,
and clear action flows.

---

## Scope

### In Scope (MVP)

- Rebuild batch-workspace-surface.tsx with dense item matrix
- Rebuild batch-workspace-detail-rail.tsx as evidence rail detail
- Rebuild batch-workspace-run-panel.tsx for batch run management
- Rebuild specialist-workspace-surface.tsx with dense workflow rows
- Rebuild specialist-workspace-detail-rail.tsx and review-rail.tsx
- Rebuild specialist-workspace-launch-panel.tsx and state-panel.tsx
- Rebuild research-specialist-review-panel.tsx and
  tracker-specialist-review-panel.tsx
- Rebuild application-help-surface.tsx with launch, draft, and context panels
- Clean pre-existing banned-term violations in application-help and batch
  files (tracked in CONSIDERATIONS.md)
- Migrate all inline hex/RGB values to design tokens
- sculpt-ui design brief before implementation

### Out of Scope

- Deep linking for specialist review states (session 07)
- Screenshot validation tooling (session 07)
- New specialist types

---

## Prerequisites

- [ ] Sessions 01-05 complete (evaluation console, artifact handoff, report
      viewer, pipeline review, tracker and scan)
- [ ] sculpt-ui design brief produced for batch and specialist surfaces

---

## Deliverables

1. Dense batch workspace with item matrix and run panel
2. Rebuilt specialist workspace with workflow rows and detail rail
3. Rebuilt application help with launch, draft, and context panels
4. All pre-existing banned-term violations cleaned
5. Token-compliant styling across all surfaces
6. Banned-terms-clean operator copy

---

## Success Criteria

- [ ] Batch workspace supports scanning 10+ concurrent batch items
- [ ] Specialist workspace shows clear workflow progression
- [ ] Application help surfaces guide the operator through the help flow
- [ ] Pre-existing banned-term violations from CONSIDERATIONS.md resolved
- [ ] No inline hex/RGB color values in batch, specialist, or help files
- [ ] Banned-terms check passes on all rebuilt surfaces
- [ ] Desktop and mobile screenshots reviewed against PRD
