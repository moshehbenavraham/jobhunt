# Session Specification

**Session ID**: `phase02-session07-deep-linking-approvals-and-guardrails`
**Phase**: 02 - Rebuild Workbench and Review Surfaces
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web (primary), apps/web + spec-system (guardrails)
**Package Stack**: TypeScript React

---

## 1. Session Overview

This is the final session of Phase 02. It closes three remaining gaps in the
rebuilt workbench: (1) deep-link routes for workflow, batch, and scan review
states that are currently missing from the router; (2) a full rebuild of the
approvals inbox surface family -- five components still carrying pre-Phase-01
inline hex/rgba values and banned-term violations; and (3) context-aware
commands for the command palette so it adapts to the current surface.

The session also performs the final banned-terms sweep across all remaining
files in apps/web/src (boot, onboarding, settings) and documents
screenshot-based UX validation guidance for the spec workflow. Completing
this session means all Phase 02 success criteria are met and the project
can transition to Phase 03 or close out.

---

## 2. Objectives

1. Add deep-link routes for /workflows/:workflowId, /batch/:batchId, and
   /scan/:scanId so all major review states are directly addressable
2. Rebuild all 5 approvals components to use design tokens, purge banned
   terms, and adopt operator-grade dense scanning patterns
3. Extend the command palette with context-aware commands that reflect the
   current active surface
4. Run final banned-terms cleanup across boot, onboarding, and settings files
5. Document screenshot-based UX validation in spec workflow references

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session01-evaluation-console-and-run-flow` - token migration + run flow
- [x] `phase02-session02-artifact-handoff-and-evidence-rail` - /runs/:runId route
- [x] `phase02-session03-report-viewer` - /reports/:reportId route
- [x] `phase02-session04-pipeline-review` - pipeline surface rebuild
- [x] `phase02-session05-tracker-and-scan-surfaces` - tracker + scan rebuild
- [x] `phase02-session06-batch-and-specialist-surfaces` - batch + specialist rebuild

### Required Tools/Knowledge

- React Router v7 route configuration patterns (routes.tsx)
- CSS custom properties from tokens.css
- Command palette registry pattern (use-command-palette.ts)
- Banned-terms check script (scripts/check-app-ui-copy.mjs)

### Environment Requirements

- Node.js, npm, TypeScript compiler
- Vite dev server for apps/web

---

## 4. Scope

### In Scope (MVP)

- Operator can navigate directly to /workflows/:workflowId - add route + page
- Operator can navigate directly to /batch/:batchId - add route + page
- Operator can navigate directly to /scan/:scanId - add route + page
- Operator can triage approvals with dense scannable rows - rebuild approval-queue-list.tsx
- Operator can review approval context with tokenized styling - rebuild approval-context-panel.tsx
- Operator can accept/reject with clear decision actions - rebuild approval-decision-bar.tsx
- Operator can resume interrupted runs with clear handoff - rebuild interrupted-run-panel.tsx
- Operator can see the approvals inbox surface with tokenized header - rebuild approval-inbox-surface.tsx
- Operator sees context-aware commands in command palette - extend registry
- All banned-term violations in boot, onboarding, settings purged
- Screenshot-based UX validation documented in spec workflow

### Out of Scope (Deferred)

- Automated screenshot snapshot CI - _Reason: future enhancement, manual process first_
- New approval types beyond current API contract - _Reason: no new backend work_
- Self-hosted fonts migration - _Reason: separate concern, tracked in CONSIDERATIONS_

---

## 5. Technical Approach

### Architecture

Deep-link detail routes follow the established pattern from /runs/:runId and
/reports/:reportId: a new page component renders inside the RootLayout outlet,
receiving the URL param via useParams(). Each detail page fetches its own data
and renders in the center canvas zone.

Approvals components are rebuilt in-place, replacing inline hex/rgba with
var(--jh-\*) token references and rewriting banned-term copy. The component
structure stays the same (surface -> queue list, context panel, decision bar,
interrupted run panel) but the visual treatment aligns with the Phase 02
density and token patterns.

Command palette context awareness is achieved by passing the current surface
ID into the registry builder, which prepends surface-specific commands to the
static registry.

### Design Patterns

- URL-param detail routes: consistent with /runs/:runId, /reports/:reportId
- Token-first styling: inline CSSProperties with var(--jh-\*) references
- Static + contextual command registry: surface-specific commands prepended

### Technology Stack

- React Router v7 (existing)
- CSS custom properties from tokens.css (existing)
- TypeScript strict mode (existing)

---

## 6. Deliverables

### Files to Create

| File                                          | Purpose                               | Est. Lines |
| --------------------------------------------- | ------------------------------------- | ---------- |
| `apps/web/src/pages/workflow-detail-page.tsx` | Deep-link detail for single workflow  | ~60        |
| `apps/web/src/pages/batch-detail-page.tsx`    | Deep-link detail for single batch run | ~60        |
| `apps/web/src/pages/scan-detail-page.tsx`     | Deep-link detail for single scan      | ~60        |

### Files to Modify

| File                                                    | Changes                                     | Est. Lines |
| ------------------------------------------------------- | ------------------------------------------- | ---------- |
| `apps/web/src/routes.tsx`                               | Add 3 new detail routes                     | ~10        |
| `apps/web/src/approvals/approval-inbox-surface.tsx`     | Token migration + banned-term purge         | ~40        |
| `apps/web/src/approvals/approval-queue-list.tsx`        | Token migration + banned-term purge         | ~60        |
| `apps/web/src/approvals/approval-context-panel.tsx`     | Token migration + banned-term purge         | ~80        |
| `apps/web/src/approvals/approval-decision-bar.tsx`      | Token migration + banned-term purge         | ~40        |
| `apps/web/src/approvals/interrupted-run-panel.tsx`      | Token migration + banned-term purge         | ~40        |
| `apps/web/src/shell/command-palette-types.ts`           | Add context-aware command type              | ~20        |
| `apps/web/src/shell/use-command-palette.ts`             | Accept surfaceId, build contextual commands | ~30        |
| `apps/web/src/boot/startup-status-panel.tsx`            | Banned-term purge                           | ~15        |
| `apps/web/src/onboarding/onboarding-wizard-surface.tsx` | Banned-term purge                           | ~5         |
| `apps/web/src/onboarding/readiness-handoff-card.tsx`    | Banned-term purge                           | ~5         |
| `apps/web/src/settings/settings-*.tsx` (6 files)        | Banned-term purge                           | ~30        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] /workflows/:workflowId renders workflow detail with URL param
- [ ] /batch/:batchId renders batch detail with URL param
- [ ] /scan/:scanId renders scan detail with URL param
- [ ] Approvals inbox renders with design token styling (zero inline hex/rgba)
- [ ] Command palette shows context-aware commands for current surface
- [ ] All 30 current banned-term violations resolved

### Testing Requirements

- [ ] TypeScript compilation clean (0 errors)
- [ ] Vite build succeeds
- [ ] scripts/check-app-ui-copy.mjs passes with 0 violations
- [ ] Manual navigation to all 3 new deep-link routes works

### Non-Functional Requirements

- [ ] No inline hex/rgba values in any approvals component
- [ ] Approvals components maintain existing API contract unchanged

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] Desktop and mobile screenshots produced for approvals surfaces

---

## 8. Implementation Notes

### Key Considerations

- Approvals components have a well-established API contract with the backend;
  only the visual layer changes, not the data flow or hook logic
- The approval-inbox-client.ts and use-approval-inbox.ts hooks remain unchanged
- Context-aware commands should not break the existing static registry; they
  prepend to it

### Potential Challenges

- Banned-term "session" in settings files refers to spec-system sessions, not
  UI-facing language; need to rewrite to "workspace" or "configuration" context
- Some approval copy uses "session" to mean API runtime session; rewrite to
  "run" or "workflow" as appropriate for user-facing context

### Relevant Considerations

- [P01] **Pre-existing banned-term violations**: 30 violations across approvals,
  boot, onboarding, and settings files are now addressed in this final session
- [P01] **Hex/RGB values in non-shell components**: Approvals components have
  ~86 inline hex/rgba values to migrate to design tokens
- [P01] **Static command registry**: Extended with context-aware commands while
  keeping the registry pattern intact
- [P01] **Outlet context vs ShellContext split**: Maintained; context-aware
  palette commands use the current surfaceId from navigation state

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Approval decision bar: duplicate-trigger prevention while approve/reject is in-flight
- Deep-link detail pages: explicit loading, empty, error, and offline states
- Context-aware palette: state reset on surface navigation change

---

## 9. Testing Strategy

### Unit Tests

- Context-aware command registry returns correct commands for each surface
- matchesQuery fuzzy search works with contextual commands

### Integration Tests

- Router resolves all 3 new detail routes to correct page components

### Manual Testing

- Navigate to /workflows/test-id, /batch/test-id, /scan/test-id
- Verify approvals inbox dense scanning with pending approvals
- Open command palette on different surfaces, verify context commands appear
- Run scripts/check-app-ui-copy.mjs and confirm 0 violations

### Edge Cases

- Deep-link with invalid/missing ID shows graceful empty state
- Approvals inbox with no pending approvals shows clear empty state
- Command palette context commands update when navigating between surfaces

---

## 10. Dependencies

### External Libraries

- react-router: v7 (already installed)
- No new dependencies

### Other Sessions

- **Depends on**: Sessions 01-06 (all surfaces rebuilt, token layer, router)
- **Depended by**: None (final session of Phase 02)

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
