# Session Specification

**Session ID**: `phase02-session02-artifact-handoff-and-evidence-rail`
**Phase**: 02 - Rebuild Workbench and Review Surfaces
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session rebuilds the right evidence rail as a compact artifact packet and
implements the `/runs/:runId` detail route. The PRD_UX.md defines the "signature
moment" as the run-to-artifact handoff: when an evaluation completes, the live
timeline condenses into a compact artifact packet (score chip, report status,
PDF status, tracker-write status, one-line summary) that docks into the right
rail. The current `evaluation-artifact-rail.tsx` uses ~30 inline hex/rgba color
values, card-heavy layout, and verbose sections that violate the "compact
artifact packet" intent.

The `/runs/:runId` route currently redirects to `/` (home). This session
replaces that redirect with a real Run Detail page showing timeline, logs
summary, artifact state, and resume/retry controls per PRD_UX.md section 3.

Together these two deliverables close the run-to-artifact handoff loop: the
operator can see a compact result summary in the evidence rail during and after
a run, and can deep-link to any run's full detail view for investigation or
retry.

---

## 2. Objectives

1. Rebuild evaluation-artifact-rail.tsx as a compact artifact packet in the
   evidence rail using design tokens, no inline hex/rgba values
2. Implement a real /runs/:runId route with Run Detail page (timeline, logs
   summary, artifact state, resume/retry actions)
3. Connect the artifact rail to live run state for real-time updates during
   active evaluations
4. Migrate all inline hex/RGB color values in artifact handoff files to CSS
   custom property tokens
5. Replace all internal jargon in artifact handoff and run detail copy with
   operator-focused language
6. Ensure banned-terms check passes on all modified files

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - CSS custom properties in tokens.css
- [x] `phase01-session02-typography-and-base-styles` - Space Grotesk, IBM Plex typography
- [x] `phase01-session03-three-zone-shell-layout` - CSS Grid three-zone layout
- [x] `phase01-session04-responsive-layout-and-mobile` - Responsive breakpoints
- [x] `phase01-session05-router-and-deep-linking` - React Router v7 routes
- [x] `phase01-session06-command-palette-and-operator-copy` - Command palette, copy rules
- [x] `phase02-session01-evaluation-console-and-run-flow` - Rebuilt evaluation console center canvas

### Required Tools/Knowledge

- Phase 01 design tokens (tokens.css, base.css, layout.css)
- Phase 02 status tone tokens added in Session 01 (--jh-color-status-_, --jh-color-severity-_, --jh-color-closeout-\*)
- Banned-terms check script (scripts/check-app-ui-copy.mjs)
- PRD palette: mineral paper, deep ink, disciplined cobalt, restrained status tones
- Evaluation result data contract (evaluation-result-types.ts)

### Environment Requirements

- Node.js with npm
- Vite dev server (apps/web)

---

## 4. Scope

### In Scope (MVP)

- Operator sees a compact artifact packet in the right rail - rebuild evaluation-artifact-rail.tsx with token-based styling, condensed layout (score chip, report/PDF/tracker status badges, one-line closeout summary, action buttons)
- Operator can deep-link to any run - implement real /runs/:runId Run Detail page component
- Run Detail shows run overview - timeline summary, checkpoint progress, artifact state, and failure details when applicable
- Run Detail shows resume/retry controls - resume button for paused runs, retry guidance for failed runs
- Artifact rail updates during active runs - wire artifact rail to existing polling/evaluation-result data with explicit loading, error, and offline states
- Run Detail is navigable from artifact rail - add "View run details" link in artifact packet
- Evidence rail renders artifact packet contextually - when on /evaluate with an active or completed run, right rail shows artifact packet instead of placeholder
- All artifact handoff files use design tokens - zero inline hex/rgba values
- All user-visible copy is operator-grade - no banned terms, terse and scannable
- sculpt-ui design brief produced before implementation

### Out of Scope (Deferred)

- Report viewer rebuild - _Reason: Session 03 scope_
- Pipeline review rebuild - _Reason: Session 04 scope_
- Backend run-detail API endpoint - _Reason: Frontend uses existing evaluation-result summary data; no new API needed this session_
- Specialist workspace surfaces - _Reason: Session 06 scope_

---

## 5. Technical Approach

### Architecture

The artifact rail consumes the same `EvaluationResultSummaryPayload` data
already fetched by `useChatConsole`. The rebuild restructures the visual
presentation from verbose card sections into a compact vertical packet:

1. **Score + legitimacy chip row** - headline data at the top
2. **Artifact status badges** - report/PDF/tracker as inline status pills
3. **Closeout summary** - one-line state with tone badge
4. **Warning count** - compact indicator, not full list
5. **Handoff actions** - button group for report/pipeline/tracker/approval navigation

The Run Detail page is a new page component at `/runs/:runId` that reads the
`runId` param and renders a focused detail view. Since no backend run-detail
endpoint exists yet, the page will use the evaluation-result summary data
(which includes session, job, checkpoint, failure, handoff, and artifact info)
plus a link back to the evaluate console for the full timeline.

### Design Patterns

- **Token consumption**: All color, spacing, radius, typography via `var(--jh-*)` -- zero inline hex/rgba
- **Compact packet layout**: Vertical stack with inline badges instead of card grid
- **Status tone reuse**: Reuse --jh-color-status-_, --jh-color-closeout-_, --jh-color-severity-\* tokens from Session 01
- **Three-zone composition**: Run Detail uses center canvas + right rail (artifact packet)
- **Deep link pattern**: /runs/:runId with useParams, consistent with existing React Router v7 setup

### Technology Stack

- CSS custom properties from tokens.css (Phase 01 + Session 01 additions)
- React 18+ with TypeScript
- React Router v7 (useParams, Link)
- Vite bundler

---

## 6. Deliverables

### Files to Create

| File                                     | Purpose                                    | Est. Lines |
| ---------------------------------------- | ------------------------------------------ | ---------- |
| `apps/web/src/pages/run-detail-page.tsx` | Run Detail page component for /runs/:runId | ~250       |
| `apps/web/src/chat/run-detail-types.ts`  | Types for run detail view state            | ~40        |
| `apps/web/src/chat/use-run-detail.ts`    | Hook to fetch and manage run detail state  | ~120       |

### Files to Modify

| File                                             | Changes                                                                     | Est. Lines Changed |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------ |
| `apps/web/src/chat/evaluation-artifact-rail.tsx` | Full visual rebuild: compact packet, token migration, copy rewrite          | ~600               |
| `apps/web/src/routes.tsx`                        | Replace /runs/:runId redirect with real RunDetailPage component             | ~5                 |
| `apps/web/src/shell/evidence-rail.tsx`           | Wire artifact packet into evidence rail when evaluation context exists      | ~40                |
| `apps/web/src/chat/evaluation-result-client.ts`  | Add run-detail fetch helper (reuses summary endpoint with sessionId filter) | ~30                |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Right rail shows a compact, scannable artifact summary (not verbose card sections)
- [ ] /runs/:runId loads a real detail view (not a redirect)
- [ ] Artifact handoff feels like closure for completed evaluations
- [ ] Run Detail shows timeline summary, artifact state, and resume/retry controls
- [ ] Artifact rail has a "View run details" link that navigates to /runs/:runId
- [ ] Loading, error, and offline states are explicit in both artifact rail and run detail

### Testing Requirements

- [ ] Banned-terms copy check passes on all artifact handoff and run detail files
- [ ] Vite build completes without errors
- [ ] TypeScript compilation passes
- [ ] Manual visual review on desktop and mobile viewports

### Non-Functional Requirements

- [ ] Zero inline hex/RGB values in any modified or created file
- [ ] All visual values sourced from CSS custom properties
- [ ] Typography follows token scale (Space Grotesk headings, IBM Plex Sans body, IBM Plex Mono data)

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] Desktop and mobile screenshots reviewed against PRD

---

## 8. Implementation Notes

### Key Considerations

- The existing evaluation-artifact-rail.tsx is 932 lines with complex handoff intent logic that is functionally correct. The data flow (createHandoffIntents, renderActionButton) must be preserved -- this session is a visual/copy rebuild.
- The artifact rail currently uses ~30 unique hex color values across getArtifactTone, getCloseoutTone, getVerificationTone, getHandoffTone, panelStyle, sectionStyle, buttonStyle, and inline styles. All must map to existing --jh-color-\* tokens.
- The /runs/:runId route must handle the case where no run data is available (invalid runId, no active session) with a clear empty state.
- No backend run-detail API exists. The Run Detail page uses the same evaluation-result summary data that the artifact rail already consumes, filtered by sessionId from the URL param.

### Potential Challenges

- **Compact layout without losing information**: The current rail shows 6 sections (closeout, stats, input/verification, artifacts, warnings, handoff actions). Compressing to a compact packet requires careful information hierarchy.
- **Run Detail without dedicated API**: The evaluation-result summary provides session, job, checkpoint, failure, and artifact data -- enough for an MVP detail view. A dedicated run-detail API can be added in a later session if needed.
- **Copy rewrite density**: The artifact rail has many user-visible strings. Each must be rewritten to operator language while preserving meaning.

### Relevant Considerations

- [P01] **Hex/RGB values in non-shell components**: This session migrates all artifact rail inline colors to tokens
- [P01] **Pre-existing banned-term violations**: Artifact rail strings were partially cleaned in Session 01; this session completes the visual and copy rebuild
- [P01] **Outlet context vs ShellContext split**: Maintain separation -- artifact rail consumes evaluation state from outlet context, navigation callbacks from ShellContext
- [P01] **CSS classes for layout, inline styles for visuals**: Grid layout via CSS classes, component visuals via inline CSSProperties with var() references
- [P01] **Backdrop-filter removal**: Do not re-introduce glassmorphism
- [P01] **Static command registry**: Run Detail page should be reachable from command palette (add context-aware command if applicable)

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Artifact rail shows stale data after polling failure (with explicit loading, empty, error, and offline states)
- Run Detail page shows no data for invalid runId (with schema-validated input and explicit error mapping)
- Resume/retry button double-click during in-flight action (with duplicate-trigger prevention while in-flight)
- Artifact rail does not reset when switching between runs (with state reset or revalidation on re-entry)

---

## 9. Testing Strategy

### Unit Tests

- No new unit tests required for visual rebuild
- Existing useChatConsole and evaluation-result-client tests remain valid
- useRunDetail hook should have basic state management coverage if time permits

### Integration Tests

- Vite build must complete cleanly
- TypeScript strict compilation must pass

### Manual Testing

- Desktop viewport: verify compact artifact packet in right rail, run detail page layout
- Mobile viewport: verify responsive collapse, touch targets, scrollability
- Navigate to /runs/:runId with valid and invalid run IDs
- Verify artifact rail updates during active run polling
- Verify resume/retry buttons on paused/failed run states
- Verify handoff action buttons navigate to correct surfaces

### Edge Cases

- Empty state: no active run, no evaluation data
- Error state: backend unreachable, invalid runId
- Long content: many warnings, long checkpoint lists
- Rapid state transitions: polling updates during active run
- Direct URL navigation to /runs/:runId without prior evaluate page visit

---

## 10. Dependencies

### External Libraries

- react-router: v7 (existing, useParams for runId extraction)
- No new dependencies required

### Other Sessions

- **Depends on**: All Phase 01 sessions (complete), phase02-session01 (complete)
- **Depended by**: phase02-session03-report-viewer (report viewer navigated from artifact rail)

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
