# Session Specification

**Session ID**: `phase02-session01-evaluation-console-and-run-flow`
**Phase**: 02 - Rebuild Workbench and Review Surfaces
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session rebuilds the evaluation console center canvas as a coherent
run-understanding zone. The existing chat-console components use 100% inline
hex/rgba color values, contain banned internal jargon in user-visible strings,
and present a generic AI-dashboard layout instead of the PRD-defined
three-zone workbench pattern established in Phase 01.

The rebuild migrates all evaluation console components to Phase 01 design
tokens, rewrites operator-facing copy to be terse and jargon-free, and
restructures the center canvas into a clear run-to-artifact flow where an
operator can comprehend any evaluation's state in under 15 seconds.

This is the first Phase 02 session and the entry point for Workstream 3
(Rebuild the Evaluation Console and Artifact Handoff) from the recovery plan.
Session 02 will build on this work to add the right-rail artifact packet and
run detail route.

---

## 2. Objectives

1. Rebuild chat-console-surface.tsx center canvas layout using design tokens
   and the three-zone composition from Phase 01
2. Rebuild run-status-panel.tsx with token-based status tones and clear visual
   distinction between completed, running, paused, failed, and degraded states
3. Rebuild run-timeline.tsx as a compact chronological event feed using design
   tokens
4. Rebuild workflow-composer.tsx as a clean launch area with token-based styling
5. Rebuild recent-session-list.tsx as a compact recent-runs sidebar using
   design tokens and operator-focused copy
6. Purge all banned terms from user-visible strings across evaluation console
   components (including client error messages)
7. Ensure all evaluation console components pass the banned-terms copy check

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - CSS custom properties in tokens.css
- [x] `phase01-session02-typography-and-base-styles` - Space Grotesk, IBM Plex typography
- [x] `phase01-session03-three-zone-shell-layout` - CSS Grid three-zone layout
- [x] `phase01-session04-responsive-layout-and-mobile` - Responsive breakpoints
- [x] `phase01-session05-router-and-deep-linking` - React Router v7 routes
- [x] `phase01-session06-command-palette-and-operator-copy` - Command palette, copy rules

### Required Tools/Knowledge

- Phase 01 design tokens (tokens.css, base.css, layout.css)
- Banned-terms check script (scripts/check-app-ui-copy.mjs)
- PRD palette: mineral paper, deep ink, disciplined cobalt, restrained status tones

### Environment Requirements

- Node.js with npm
- Vite dev server (apps/web)

---

## 4. Scope

### In Scope (MVP)

- Operator sees a rebuilt evaluation console center canvas - full token migration and layout rebuild of chat-console-surface.tsx
- Operator sees clear run state at a glance - run-status-panel.tsx rebuilt with token-based status tones (completed=green, running=blue, paused=amber, failed=red, degraded=muted)
- Operator sees chronological run events - run-timeline.tsx rebuilt with token-based severity tones
- Operator can launch evaluations - workflow-composer.tsx rebuilt with token-based styling and jargon-free copy
- Operator can browse recent runs - recent-session-list.tsx rebuilt as compact sidebar with operator copy
- Operator sees no internal jargon - all banned terms purged from UI strings in console components
- Client error messages use operator language - chat-console-client.ts and evaluation-result-client.ts error strings rewritten
- Type parser error messages use operator language - chat-console-types.ts and evaluation-result-types.ts assertion labels rewritten
- sculpt-ui design brief produced before implementation

### Out of Scope (Deferred)

- Right-rail artifact packet rebuild - _Reason: Session 02 scope_
- /runs/:runId detail route - _Reason: Session 02 scope_
- Report viewer - _Reason: Session 03 scope_
- Pipeline review - _Reason: Session 04 scope_
- evaluation-artifact-rail.tsx full rebuild - _Reason: Session 02 scope (minor banned-term fixes in error strings are in scope)_

---

## 5. Technical Approach

### Architecture

All evaluation console components will consume CSS custom properties from
tokens.css. Layout uses the three-zone CSS Grid established in Phase 01.
Component-specific visuals use inline CSSProperties with `var(--jh-*)` token
references per CONVENTIONS.md. State management pattern (useChatConsole hook
with outlet context) remains unchanged -- this session is a visual and copy
rebuild, not a data layer refactor.

### Design Patterns

- **Token consumption**: All color, spacing, radius, typography via `var(--jh-*)` -- zero inline hex/rgba
- **Status tone mapping**: Map run states to `--jh-color-status-*` tokens instead of hardcoded palettes
- **Three-zone layout**: Left rail (recent runs), center canvas (active run understanding), right rail (prepared for session 02)
- **Operator copy**: Terse, scannable, action-oriented -- no narration of implementation state

### Technology Stack

- CSS custom properties from tokens.css (Phase 01)
- React 18+ with TypeScript
- Vite bundler
- React Router v7 (Phase 01)

---

## 6. Deliverables

### Files to Create

| File                                           | Purpose | Est. Lines |
| ---------------------------------------------- | ------- | ---------- |
| (none -- this session modifies existing files) |         |            |

### Files to Modify

| File                                            | Changes                                                                  | Est. Lines Changed |
| ----------------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| `apps/web/src/chat/chat-console-surface.tsx`    | Full visual rebuild: token migration, layout to three-zone, copy rewrite | ~300               |
| `apps/web/src/chat/run-status-panel.tsx`        | Full visual rebuild: token-based status tones, copy rewrite              | ~400               |
| `apps/web/src/chat/run-timeline.tsx`            | Token migration, copy rewrite                                            | ~120               |
| `apps/web/src/chat/workflow-composer.tsx`       | Token migration, layout rebuild, copy rewrite                            | ~200               |
| `apps/web/src/chat/recent-session-list.tsx`     | Token migration, copy rewrite, operator language                         | ~200               |
| `apps/web/src/chat/chat-console-client.ts`      | Error message copy rewrite (remove endpoint/payload terms)               | ~30                |
| `apps/web/src/chat/chat-console-types.ts`       | Assertion label copy rewrite (remove payload/session terms)              | ~20                |
| `apps/web/src/chat/evaluation-result-types.ts`  | Assertion label copy rewrite (remove payload terms)                      | ~10                |
| `apps/web/src/chat/evaluation-result-client.ts` | Error message copy rewrite (remove endpoint/payload terms)               | ~20                |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operator can understand one evaluation state in under 15 seconds
- [ ] Completed, paused, failed, and degraded runs are visually distinct
- [ ] Recent runs sidebar is compact and scannable
- [ ] Launch area is clean and inviting
- [ ] Run timeline shows chronological events with clear severity tones

### Testing Requirements

- [ ] Banned-terms copy check passes on all evaluation console files
- [ ] Vite build completes without errors
- [ ] TypeScript compilation passes
- [ ] Manual visual review on desktop and mobile viewports

### Non-Functional Requirements

- [ ] Zero inline hex/RGB values in any modified file
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

- The existing components work correctly in terms of data flow and state management. The useChatConsole hook, client fetch logic, and type parsers are functionally sound. This session is purely a visual/copy rebuild.
- The run-status-panel.tsx has the most complex inline color mapping (~30 unique hex values for status tones). These must map to the --jh-color-status-\* token family.
- evaluation-artifact-rail.tsx has the heaviest banned-term violations but is primarily session 02 scope. Only fix error message strings that appear in the client/types files this session.

### Potential Challenges

- **Status tone token coverage**: The existing status palette uses ~30 unique hex values. Some may not have exact token equivalents and will need mapping to the closest --jh-color-status-\* token.
- **Copy rewrite without losing meaning**: Banned terms like "session" appear in operator-meaningful contexts ("Recent sessions"). Replacements must preserve operator understanding (e.g., "Recent runs").
- **Layout density**: The current chat-console-surface.tsx uses a custom grid. Rebuilding on the three-zone pattern must preserve information density.

### Relevant Considerations

- [P01] **Hex/RGB values in non-shell components**: This session is the first Phase 02 migration -- every inline color value in the 9 target files gets replaced with token references
- [P01] **Pre-existing banned-term violations**: Evaluation console files are among the worst offenders; this session cleans them
- [P01] **Outlet context vs ShellContext split**: Maintain separation -- useChatConsole provides page state, ShellContext provides navigation callbacks
- [P01] **CSS classes for layout, inline styles for visuals**: Grid layout via CSS classes in layout.css, component visuals via inline CSSProperties with var() references
- [P01] **Backdrop-filter removal**: Do not re-introduce glassmorphism in rebuilt components

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Run status display shows stale state after polling failure (with explicit loading, empty, error, and offline states)
- Workflow composer double-submit during in-flight evaluation launch (with duplicate-trigger prevention while in-flight)
- Recent runs list shows inconsistent state after session focus change (with state reset or revalidation on re-entry)

---

## 9. Testing Strategy

### Unit Tests

- No new unit tests required (visual rebuild, not logic change)
- Existing useChatConsole hook tests remain valid

### Integration Tests

- Vite build must complete cleanly
- TypeScript strict compilation must pass

### Manual Testing

- Desktop viewport: verify three-zone layout, run status clarity, timeline readability
- Mobile viewport: verify responsive collapse, touch targets, scrollability
- Launch a mock evaluation and verify visual flow from composer to active run to timeline
- Verify all status states (completed, running, paused, failed, degraded) are visually distinct

### Edge Cases

- Empty state: no recent runs, no active evaluation
- Error state: backend unreachable
- Long content: many timeline events, long run descriptions
- Rapid state transitions: polling updates during active run

---

## 10. Dependencies

### External Libraries

- react-router: v7 (existing)
- No new dependencies required

### Other Sessions

- **Depends on**: All Phase 01 sessions (complete)
- **Depended by**: phase02-session02-artifact-handoff-and-evidence-rail (builds on rebuilt console)

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
