# Session Specification

**Session ID**: `phase01-session06-command-palette-and-operator-copy`
**Phase**: 01 - Rebuild Foundation and Shell
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session completes Phase 01 by adding a Cmd/Ctrl+K command palette for
keyboard-driven navigation and rewriting all shell section headings and intro
copy to be terse, operator-focused, and jargon-free. Together these two
deliverables close the final gap between the rebuilt foundation/shell and the
PRD_UX.md vision: an operator workbench where a stressed user can reach any
surface in two keystrokes and read zero engineering prose along the way.

The command palette is the first piece of the keyboard navigation model. It
registers all router-defined surfaces and common actions (new evaluation, view
pipeline, open tracker), supports fuzzy/substring matching, and follows the
established design token layer for visual consistency. The operator copy pass
replaces every remaining explanatory description in the navigation rail, surface
placeholders, and home surface with short, scannable guidance written for triage.

This session depends on all five prior sessions: design tokens (S01), typography
(S02), three-zone layout (S03), responsive behavior (S04), and router (S05).
After completion, Phase 01 is done and the project moves to Phase Transition.

---

## 2. Objectives

1. Create a command palette overlay accessible via Cmd/Ctrl+K from any screen
2. Register all 13 router-defined surfaces plus common actions as palette commands
3. Implement fuzzy/substring search filtering with keyboard navigation (arrows, Enter, Escape)
4. Rewrite all shell section headings and intro copy to terse operator guidance
5. Verify banned-terms check passes on all user-visible strings

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - design tokens and CSS custom properties
- [x] `phase01-session02-typography-and-base-styles` - PRD typography loaded
- [x] `phase01-session03-three-zone-shell-layout` - three-zone layout composition
- [x] `phase01-session04-responsive-layout-and-mobile` - responsive behavior
- [x] `phase01-session05-router-and-deep-linking` - React Router with deep-linkable routes

### Required Tools/Knowledge

- React Router navigation API (useNavigate)
- Keyboard event handling (Cmd/Ctrl detection, global listeners)
- CSS custom properties from tokens.css

### Environment Requirements

- Node.js with npm
- Vite dev server for apps/web

---

## 4. Scope

### In Scope (MVP)

- Operator can open a command palette overlay via Cmd/Ctrl+K from any screen
- Palette lists all 13 router surfaces and at least 3 common actions (new evaluation, view pipeline, open tracker)
- Operator can type to filter commands via fuzzy or substring match
- Arrow keys navigate the filtered list, Enter selects, Escape dismisses
- Palette uses design tokens for all visual values (no inline ad hoc colors)
- Palette has accessible ARIA roles and labels
- All navigation rail headings, descriptions, and section intros rewritten for operator triage
- Surface placeholder titles and body copy rewritten to remove engineering prose
- Home surface headings and fallback copy cleaned of internal jargon
- Banned-terms script created and passes on all user-visible strings in apps/web/src

### Out of Scope (Deferred)

- Context-aware commands that depend on current surface state - _Reason: Phase 02 scope_
- Voice or advanced input methods - _Reason: not in PRD_
- Custom keyboard shortcut configuration - _Reason: not in PRD_
- sculpt-ui design brief - _Reason: requires interactive design session; palette follows existing token system_

---

## 5. Technical Approach

### Architecture

The command palette is a standalone overlay component mounted at the RootLayout
level. A custom hook manages the keyboard binding (Cmd/Ctrl+K toggle), a command
registry derived from SHELL_SURFACES and an explicit actions list, and the
filtered/selected state. The overlay renders above all content with a backdrop,
uses focus trapping, and returns focus on dismiss.

The operator copy pass is a targeted rewrite of string literals in shell-types.ts
(surface descriptions), navigation-rail.tsx (nav intro), surface-placeholder.tsx
(placeholder titles/bodies), and operator-home-surface.tsx (home copy).

### Design Patterns

- Registry pattern: commands defined as a static array derived from SHELL_SURFACES plus explicit action entries
- Controlled component: input value drives filter, selected index is state
- Global keydown listener with cleanup on unmount

### Technology Stack

- React 19.x (existing)
- React Router 7.x (existing, for useNavigate)
- CSS custom properties from tokens.css (existing)
- No new dependencies required

---

## 6. Deliverables

### Files to Create

| File                                          | Purpose                                                                 | Est. Lines |
| --------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| `apps/web/src/shell/command-palette.tsx`      | Palette overlay component with search input, command list, and backdrop | ~180       |
| `apps/web/src/shell/use-command-palette.ts`   | Hook: keyboard binding, command registry, filter/selection state        | ~130       |
| `apps/web/src/shell/command-palette-types.ts` | PaletteCommand type, action IDs, registry constants                     | ~50        |
| `scripts/check-app-ui-copy.mjs`               | Banned-terms check script for CI                                        | ~80        |

### Files to Modify

| File                                           | Changes                                                    | Est. Lines |
| ---------------------------------------------- | ---------------------------------------------------------- | ---------- |
| `apps/web/src/shell/root-layout.tsx`           | Mount CommandPalette, wire useCommandPalette hook          | ~15        |
| `apps/web/src/shell/shell-types.ts`            | Rewrite SHELL_SURFACES descriptions to terse operator copy | ~13        |
| `apps/web/src/shell/navigation-rail.tsx`       | Rewrite nav heading and intro paragraph                    | ~10        |
| `apps/web/src/shell/surface-placeholder.tsx`   | Rewrite all placeholder titles and body copy               | ~40        |
| `apps/web/src/shell/operator-home-surface.tsx` | Rewrite home headings and fallback copy                    | ~15        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Cmd/Ctrl+K opens the command palette from any screen
- [ ] Palette lists all 13 surfaces and at least 3 common actions
- [ ] Typing filters commands by fuzzy or substring match
- [ ] Arrow keys navigate, Enter selects, Escape dismisses
- [ ] Selecting a surface command navigates to the correct route
- [ ] Selecting an action command triggers the correct callback
- [ ] Palette closes after command execution

### Testing Requirements

- [ ] Manual keyboard testing on desktop
- [ ] Verify Cmd+K (macOS) and Ctrl+K (Windows/Linux) both work
- [ ] Verify palette does not open when typing in other inputs
- [ ] Visual review: palette uses design tokens, no inline colors

### Non-Functional Requirements

- [ ] Palette opens in under 50ms (no lazy loading needed for static registry)
- [ ] All files ASCII-encoded
- [ ] All user-visible strings pass banned-terms check

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (tokens, naming, structure)
- [ ] No banned terms in any user-visible string

---

## 8. Implementation Notes

### Key Considerations

- The palette must not interfere with text input focus in chat or other surfaces; only activate on Cmd/Ctrl+K specifically
- Keep the command registry static for now; Phase 02 will add dynamic context-aware commands
- Focus must return to the previously focused element on palette dismiss

### Potential Challenges

- Cmd+K conflict with browser bookmark bar: use preventDefault on the keydown event
- Ensuring palette backdrop covers all three zones including drawers on tablet/mobile

### Relevant Considerations

- [P00] **Internal jargon in user-facing strings**: this session does the final copy cleanup pass
- [P00] **sculpt-ui was not enforced during Phases 03-06**: palette follows established token system; no new visual language introduced
- [P00] **Avoid generic glassmorphism**: palette uses the mineral paper/deep ink palette from tokens.css

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session's deliverables:

- Global keyboard listener leaking across component lifecycle (cleanup on scope exit for all acquired resources)
- Palette remaining open after navigation completes (state reset on re-entry)
- Focus trap not releasing on Escape (with platform-appropriate accessibility labels, focus management, and input support)

---

## 9. Testing Strategy

### Unit Tests

- Command registry contains exactly 13 surface entries plus action entries
- Fuzzy filter returns correct matches for partial input
- Filter returns empty list for nonsense input

### Integration Tests

- Palette mount/unmount does not leave dangling event listeners
- Navigation after command selection lands on correct route

### Manual Testing

- Open palette with Cmd/Ctrl+K on every surface
- Type partial surface name, verify filtering
- Arrow down, Enter to select, verify navigation
- Escape dismisses, focus returns
- Verify palette renders correctly on desktop, tablet, and mobile
- Review all copy in navigation rail, placeholders, and home for jargon

### Edge Cases

- Rapid Cmd+K toggle does not cause double mount
- Palette with no matching results shows empty state message
- Palette does not open when focus is in a contenteditable or textarea (guard against conflict)

---

## 10. Dependencies

### External Libraries

- None (uses existing React, React Router, CSS custom properties)

### Other Sessions

- **Depends on**: phase01-session01 through phase01-session05 (all completed)
- **Depended by**: Phase 02 sessions (workbench and review surfaces build on this foundation)

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
