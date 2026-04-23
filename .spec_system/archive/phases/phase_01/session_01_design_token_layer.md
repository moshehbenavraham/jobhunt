# Session 01: Design Token Layer

**Session ID**: `phase01-session01-design-token-layer`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~20
**Estimated Duration**: 3-4 hours

---

## Objective

Create the design token infrastructure (tokens.css, base.css, layout.css) that
replaces all ad hoc inline style values with CSS custom properties aligned to
the PRD palette.

---

## Scope

### In Scope (MVP)

- Create `apps/web/src/styles/tokens.css` with all PRD color, spacing, radius,
  border, and shadow tokens
- Create `apps/web/src/styles/base.css` with reset, body defaults, and token
  application
- Create `apps/web/src/styles/layout.css` with grid zone custom properties
- Define the PRD palette: mineral paper base, deep ink chrome, disciplined
  cobalt accent, restrained status colors (green, amber, red, muted)
- Define spacing scale, border radius scale, and shadow tokens
- Wire token files into the app entry point
- Begin migrating shell components from inline styles to token references
- Run sculpt-ui design brief before implementation

### Out of Scope

- Typography tokens (session 02)
- Shell layout rework (session 03)
- Migrating non-shell components (later sessions and Phase 02)
- Dark mode or theme switching

---

## Prerequisites

- [ ] Phase 00 quality gates in place (banned-terms check, spec workflow updates)
- [ ] PRD_UX.md available for palette reference
- [ ] sculpt-ui design brief completed for this session

---

## Deliverables

1. `apps/web/src/styles/tokens.css` -- full token vocabulary
2. `apps/web/src/styles/base.css` -- reset and body defaults
3. `apps/web/src/styles/layout.css` -- layout zone custom properties
4. Shell components migrated from inline color/spacing values to token references
5. No remaining ad hoc color hex values in shell component files

---

## Success Criteria

- [ ] tokens.css defines all PRD palette colors as CSS custom properties
- [ ] tokens.css defines spacing, radius, border, and shadow scales
- [ ] base.css applies token defaults to html/body
- [ ] Shell components reference tokens, not inline hex or rgb values
- [ ] Static screenshot of the shell shows PRD palette applied
- [ ] banned-terms check still passes
- [ ] sculpt-ui design brief was followed
