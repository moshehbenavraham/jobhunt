# Session Specification

**Session ID**: `phase02-session06-batch-and-specialist-surfaces`
**Phase**: 02 - Rebuild Workbench and Review Surfaces
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session rebuilds three surface families -- batch workspace, specialist workspace, and application help -- to match the operator-grade mineral-paper aesthetic and dense scanning ergonomics established in Phase 01 and carried through Sessions 01-05 of Phase 02.

The current implementations across all three families share the same deficits: approximately 120 inline hex/rgba color values that bypass the design-token layer, roughly 40 banned-term violations in user-visible strings ("phase", "session", "endpoint", "payload", "contract", "surface", "route"), and no visual alignment with the three-zone layout or token palette. This session replaces every inline color with a CSS custom property reference, rewrites every banned-term string with terse operator copy, and restructures each component to match the dense row, sticky filter, and evidence-rail patterns proven in Sessions 03-05.

The session also covers the two specialist review panels (tracker-specialist-review-panel.tsx and research-specialist-review-panel.tsx) and the shared use-specialist-review.ts hook, ensuring the full specialist workflow chain is token-compliant and jargon-free.

---

## 2. Objectives

1. Migrate all inline hex/rgba color values to CSS custom property tokens across batch (7 files), specialist (12 files), and application-help (6 files)
2. Purge all banned-term violations from user-visible strings, replacing with terse operator-focused copy
3. Rebuild batch item matrix with dense scannable rows, sticky status-filter bar, and clear selection state
4. Rebuild specialist workflow cards with dense row layout, status progression, and clear launch/review actions
5. Rebuild application-help panels with clear launch-to-draft flow and context rail
6. Ensure token consistency with the patterns from Sessions 01-05 (status tones, score chips, action shelves)

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session01-evaluation-console-and-run-flow` - Token-migrated evaluation console, status tone tokens
- [x] `phase02-session02-artifact-handoff-and-evidence-rail` - Artifact packet patterns, evidence rail wiring
- [x] `phase02-session03-report-viewer` - Reading surface patterns, sticky metadata rail
- [x] `phase02-session04-pipeline-review` - Dense hybrid row patterns, sticky filter bar, pagination
- [x] `phase02-session05-tracker-and-scan-surfaces` - Tracker row patterns, scan action shelf, detail pane

### Required Tools/Knowledge

- CSS custom properties from `apps/web/src/styles/tokens.css`
- Existing token patterns from Sessions 01-05 components
- `scripts/check-app-ui-copy.mjs` for banned-terms validation

### Environment Requirements

- Node.js, npm for build verification
- Vite dev server for visual verification
- TypeScript compiler for type checking

---

## 4. Scope

### In Scope (MVP)

- Operator can scan 10+ batch items in a dense matrix with status filters and pagination - token-migrated styling
- Operator can see batch run status, draft readiness, and closeout state - purged jargon, token colors
- Operator can select a batch item and see detail in the evidence rail - token-migrated detail rail
- Operator can view specialist workflow inventory with clear ready/gap separation - token-migrated cards
- Operator can see specialist workflow state, session context, and resume action - purged jargon
- Operator can review tracker-specialist and research-specialist inline results - token-migrated panels
- Operator can launch application help, see draft answers, and inspect context - purged jargon, token colors
- All pre-existing banned-term violations from CONSIDERATIONS.md resolved for batch and application-help files
- All inline hex/rgba values replaced with CSS custom property token references

### Out of Scope (Deferred)

- Deep linking for specialist review states (/workflows/:workflowId) - _Reason: session 07_
- Context-aware command palette commands - _Reason: session 07_
- Screenshot validation tooling - _Reason: session 07_
- New specialist types beyond current contract - _Reason: not in PRD_
- Self-hosted font migration - _Reason: deferred per CONSIDERATIONS.md_

---

## 5. Technical Approach

### Architecture

All three surface families follow the same rebuild pattern proven in Sessions 03-05:

- Replace inline style objects containing hex/rgba with CSS custom property references from tokens.css
- Rewrite user-visible strings to be terse, operator-focused, and jargon-free
- Maintain the existing component composition (surface -> panels -> detail rail)
- Keep outlet context for page-specific state, ShellContext for navigation callbacks
- Use CSS classes for layout grid, inline CSSProperties with var() references for component visuals

### Design Patterns

- **Token migration**: Replace raw hex/rgba values with `var(--jh-color-*)` and `var(--jh-*)` references
- **Copy replacement**: Swap banned terms for operator-focused alternatives per CONVENTIONS.md guidance
- **Dense row pattern**: Match the hybrid row density from pipeline review and tracker surfaces
- **Evidence rail pattern**: Match the detail rail composition from artifact handoff and tracker surfaces
- **Status tone reuse**: Use the 10 status tone tokens from Session 01 for batch/specialist states

### Technology Stack

- CSS custom properties from tokens.css (Phase 01 + Phase 02 additions)
- React with TypeScript (existing)
- Vite bundler (existing)

---

## 6. Deliverables

### Files to Create

| File   | Purpose                                    | Est. Lines |
| ------ | ------------------------------------------ | ---------- |
| (none) | All work is modification of existing files | -          |

### Files to Modify

| File                                                              | Changes                                                          | Est. Lines Changed |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------ |
| `apps/web/src/batch/batch-workspace-surface.tsx`                  | Token migration (~6 hex), copy purge (2 banned terms)            | ~30                |
| `apps/web/src/batch/batch-workspace-detail-rail.tsx`              | Token migration (~15 hex/rgba), copy purge (3 banned terms)      | ~50                |
| `apps/web/src/batch/batch-workspace-run-panel.tsx`                | Token migration (~20 hex/rgba), copy purge (3 banned terms)      | ~60                |
| `apps/web/src/batch/batch-workspace-item-matrix.tsx`              | Token migration (~16 hex/rgba), copy purge (3 banned terms)      | ~50                |
| `apps/web/src/batch/batch-workspace-client.ts`                    | Copy purge (4 banned terms in error messages)                    | ~15                |
| `apps/web/src/workflows/specialist-workspace-surface.tsx`         | Token migration (~6 hex), copy purge (3 banned terms)            | ~30                |
| `apps/web/src/workflows/specialist-workspace-detail-rail.tsx`     | Token migration (~15 hex/rgba), copy purge (7+ banned terms)     | ~50                |
| `apps/web/src/workflows/specialist-workspace-review-rail.tsx`     | Token migration (~13 hex/rgba), copy purge (4 banned terms)      | ~45                |
| `apps/web/src/workflows/specialist-workspace-launch-panel.tsx`    | Token migration (~21 hex/rgba), copy purge (7+ banned terms)     | ~60                |
| `apps/web/src/workflows/specialist-workspace-state-panel.tsx`     | Token migration (~15 hex/rgba), copy purge (5 banned terms)      | ~50                |
| `apps/web/src/workflows/specialist-workspace-client.ts`           | Copy purge (endpoint references in error messages)               | ~15                |
| `apps/web/src/workflows/tracker-specialist-review-panel.tsx`      | Token migration, copy purge                                      | ~40                |
| `apps/web/src/workflows/research-specialist-review-panel.tsx`     | Token migration, copy purge                                      | ~45                |
| `apps/web/src/application-help/application-help-surface.tsx`      | Token migration (~6 hex), copy purge (3 banned terms)            | ~25                |
| `apps/web/src/application-help/application-help-launch-panel.tsx` | Token migration (~23 hex/rgba), copy purge (5 banned terms)      | ~55                |
| `apps/web/src/application-help/application-help-draft-panel.tsx`  | Token migration (~14 hex/rgba), copy purge (3 banned terms)      | ~45                |
| `apps/web/src/application-help/application-help-context-rail.tsx` | Token migration (~12 hex/rgba), copy purge (3 banned terms)      | ~40                |
| `apps/web/src/application-help/application-help-client.ts`        | Copy purge (endpoint/payload in error messages)                  | ~15                |
| `apps/web/src/styles/tokens.css`                                  | Add any missing semantic tokens for batch/specialist/help states | ~20                |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Batch workspace supports scanning 10+ concurrent batch items with status filters
- [ ] Batch detail rail shows selected item metadata, actions, and warnings
- [ ] Batch run panel shows draft readiness, live status, and closeout state
- [ ] Specialist workspace shows clear workflow inventory with ready/gap separation
- [ ] Specialist state panel shows run summary, session context, and resume action
- [ ] Specialist review panels render inline tracker and research reviews
- [ ] Application help launch panel supports request input and session selection
- [ ] Application help draft panel shows staged Q&A answers and review state
- [ ] Application help context rail shows matched report and approval context

### Testing Requirements

- [ ] TypeScript compilation passes with 0 errors
- [ ] Vite build completes successfully
- [ ] `scripts/check-app-ui-copy.mjs` passes with 0 banned-term violations in rebuilt files

### Non-Functional Requirements

- [ ] Zero inline hex/rgba color values in any modified file
- [ ] All user-visible copy is terse, operator-focused, and jargon-free
- [ ] Visual consistency with Sessions 01-05 token patterns

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] Banned-terms check passes

---

## 8. Implementation Notes

### Key Considerations

- The three surface families total ~7,100 lines of source across 20 component/client files plus ~3,800 lines of type files
- Token migration is the bulk of the work: ~120 inline color values to replace
- Copy purge addresses ~40 banned-term occurrences across user-visible strings
- Client files (batch, specialist, application-help) have banned terms in error messages that are displayed to users via error state banners

### Potential Challenges

- **Token coverage**: Some inline colors may not have direct token equivalents; may need to add 5-10 new semantic tokens to tokens.css
- **Error message copy**: Client error messages use "endpoint" and "payload" which need operator-friendly rewrites without losing diagnostic clarity
- **Specialist review panels**: The two specialist review panels and their types/clients add significant scope (~4,200 lines) but share patterns with the main specialist workspace

### Relevant Considerations

- [P01] **Hex/RGB values in non-shell components**: This session directly addresses this concern for batch, specialist, and help surfaces
- [P01] **Pre-existing banned-term violations**: CONSIDERATIONS.md specifically tracks violations in application-help and batch files; this session resolves them
- [P01] **Outlet context vs ShellContext split**: Maintain separation -- navigation callbacks in ShellContext, state hooks in outlet context
- [P01] **CSS classes for layout, inline styles for visuals**: Do not mix these concerns during token migration
- [P01] **Backdrop-filter removal**: Do not re-introduce glassmorphism in any rebuilt surface

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Batch action buttons (merge tracker, retry failed, resume pending) need duplicate-trigger prevention while in-flight
- Specialist launch/resume actions need duplicate-trigger prevention and state reset on close
- Application help launch/resume commands need duplicate-trigger prevention and explicit loading/error states

---

## 9. Testing Strategy

### Unit Tests

- No new unit tests planned (this is a styling and copy migration, not new functionality)

### Integration Tests

- TypeScript compilation (0 errors)
- Vite build (clean, no warnings on modified files)
- Banned-terms check (0 violations)

### Manual Testing

- Verify batch workspace renders with token-based colors on desktop and mobile
- Verify specialist workspace renders all workflow cards with correct token colors
- Verify application help launch-to-draft flow renders with token-based colors
- Spot-check that status colors (success, warning, error, info) match Sessions 01-05 patterns

### Edge Cases

- Batch workspace with 0 items (empty state)
- Specialist workspace with all workflows in tooling-gap state
- Application help with no selected session
- Error/offline banners display with token colors and jargon-free copy

---

## 10. Dependencies

### External Libraries

- No new libraries required

### Other Sessions

- **Depends on**: phase02-session01 through phase02-session05 (token layer, status tones, row patterns)
- **Depended by**: phase02-session07-deep-linking-approvals-and-guardrails (needs all surfaces rebuilt)

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
