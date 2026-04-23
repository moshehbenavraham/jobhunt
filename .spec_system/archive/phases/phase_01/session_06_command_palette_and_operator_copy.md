# Session 06: Command Palette and Operator Copy

**Session ID**: `phase01-session06-command-palette-and-operator-copy`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~18
**Estimated Duration**: 2-3 hours

---

## Objective

Add a Cmd/Ctrl+K command palette for keyboard-driven navigation and rewrite all
shell section intros with terse, operator-focused copy that helps a stressed
operator decide and act rather than explaining implementation details.

---

## Scope

### In Scope (MVP)

- Create `apps/web/src/shell/command-palette.tsx` with overlay UI
- Create `apps/web/src/shell/use-command-palette.ts` hook for keyboard binding
  and command registration
- Register all router-defined surfaces as palette commands
- Register common actions (new evaluation, view pipeline, open tracker)
- Cmd/Ctrl+K opens palette, Escape closes, arrow keys navigate, Enter selects
- Fuzzy search or substring matching on command names
- Rewrite all shell section headings and intro text:
  - Remove explanatory engineering prose
  - Use concise title plus one short sentence of operator guidance
  - Write for a stressed operator doing triage
- Final pass of banned-terms check on all updated copy
- Run sculpt-ui design brief before implementation

### Out of Scope

- Context-aware commands that depend on current surface state (Phase 02)
- Voice or advanced input methods
- Custom keyboard shortcut configuration

---

## Prerequisites

- [ ] Session 05 completed (router in place for palette navigation targets)
- [ ] sculpt-ui design brief completed for this session

---

## Deliverables

1. `apps/web/src/shell/command-palette.tsx` -- palette overlay component
2. `apps/web/src/shell/use-command-palette.ts` -- keyboard hook and command
   registry
3. All major surfaces registered as palette commands
4. Common actions registered as palette commands
5. All shell section intros rewritten with terse operator copy
6. Banned-terms check passes

---

## Success Criteria

- [ ] Cmd/Ctrl+K opens the command palette from any screen
- [ ] Palette lists all major surfaces and common actions
- [ ] Fuzzy or substring search filters commands as user types
- [ ] Selecting a command navigates to the correct route or triggers the action
- [ ] Escape dismisses the palette
- [ ] All shell section headings and intros are terse, operator-focused, and
      jargon-free
- [ ] banned-terms check passes on all user-visible strings
- [ ] sculpt-ui design brief was followed
