# Session Specification

**Session ID**: `phase01-session01-design-token-layer`
**Phase**: 01 - Rebuild Foundation and Shell
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session creates the design token infrastructure that replaces every ad hoc
inline color, spacing, radius, border, and shadow value in the web app with CSS
custom properties sourced from three new stylesheets. The PRD palette -- mineral
paper base, deep ink chrome, disciplined cobalt accent, and restrained status
colors -- becomes the single source of truth for all visual values.

The current codebase has zero CSS files; all visual values live in inline
`CSSProperties` objects scattered across ~100 component files, with hardcoded
hex colors like `#0f172a`, `#f8fafc`, `#fbbf24`, `#fed7aa`, and others
repeated across `operator-shell.tsx`, `navigation-rail.tsx`, `status-strip.tsx`,
and every other surface. This session establishes the token layer and migrates
the three core shell components to prove the pattern works before typography
and layout sessions extend it.

This is the foundational session for Phase 01 -- every subsequent session
depends on the tokens created here.

---

## 2. Objectives

1. Create `apps/web/src/styles/tokens.css` with the full PRD color, spacing,
   radius, border, and shadow token vocabulary
2. Create `apps/web/src/styles/base.css` with CSS reset and body defaults that
   consume tokens
3. Create `apps/web/src/styles/layout.css` with grid zone custom properties for
   the three-zone shell (consumed by session 03)
4. Wire token stylesheets into the app entry point (`main.tsx` or `index.html`)
5. Migrate `operator-shell.tsx`, `navigation-rail.tsx`, and `status-strip.tsx`
   from inline hex/rgb values to token references
6. Ensure banned-terms check still passes after all changes

---

## 3. Prerequisites

### Required Sessions

- [x] Phase 00 - Stop the Bleeding (quality gates, jargon removal, spec workflow)

### Required Tools/Knowledge

- PRD_UX.md (`docs/PRD_UX.md`) for palette and visual system reference
- CSS custom properties (no CSS-in-JS runtime per CONVENTIONS.md)
- Vite CSS import pipeline

### Environment Requirements

- Node.js and npm available
- Vite dev server runnable via `npm run dev` in apps/web

---

## 4. Scope

### In Scope (MVP)

- Operator can see the PRD palette applied to the shell - create `tokens.css`
  with all color, spacing, radius, border, shadow tokens
- Operator can rely on consistent body defaults - create `base.css` with reset
  and defaults consuming tokens
- Future sessions can reference layout zone tokens - create `layout.css` with
  zone width, gap, and breakpoint custom properties (values only, not applied)
- App entry point imports all three stylesheets in correct cascade order
- Shell components (`operator-shell.tsx`, `navigation-rail.tsx`,
  `status-strip.tsx`) reference tokens via `var(--token-name)` in their inline
  style objects instead of raw hex/rgb values
- No remaining hardcoded color hex values in the three migrated shell files

### Out of Scope (Deferred)

- Typography tokens and font loading - _Reason: session 02_
- Shell layout rework to CSS Grid three-zone - _Reason: session 03_
- Migrating non-shell components (surfaces, panels, cards) - _Reason: Phase 02_
- Dark mode or theme switching - _Reason: not in current PRD scope_
- sculpt-ui design brief - _Reason: required by workflow but executed at
  implement time, not planning time_

---

## 5. Technical Approach

### Architecture

The token layer uses CSS custom properties exclusively. Three CSS files form a
cascade: `tokens.css` (declarations only, no selectors beyond `:root`),
`base.css` (reset + body defaults consuming tokens), `layout.css` (layout zone
custom properties for later consumption). Files are imported in `main.tsx`
before the React render so they are available globally.

Shell components keep their inline `CSSProperties` pattern but replace raw
values with `var(--token-name)` strings. This avoids a layout/architecture
migration in this session while eliminating duplicated magic values.

### Design Patterns

- CSS custom properties on `:root`: centralized, debuggable, no runtime cost
- Cascade order: tokens -> base -> layout (specificity-safe)
- Gradual migration: shell-first, surfaces later

### Technology Stack

- CSS custom properties (browser-native)
- Vite CSS import (zero-config)
- React inline styles with `var()` references (TypeScript React)

---

## 6. Deliverables

### Files to Create

| File                             | Purpose                       | Est. Lines |
| -------------------------------- | ----------------------------- | ---------- |
| `apps/web/src/styles/tokens.css` | Full PRD token vocabulary     | ~120       |
| `apps/web/src/styles/base.css`   | Reset and body defaults       | ~45        |
| `apps/web/src/styles/layout.css` | Layout zone custom properties | ~40        |

### Files to Modify

| File                                     | Changes                            | Est. Lines Changed |
| ---------------------------------------- | ---------------------------------- | ------------------ |
| `apps/web/src/main.tsx`                  | Import three CSS files             | ~5                 |
| `apps/web/index.html`                    | Add meta theme-color if needed     | ~2                 |
| `apps/web/src/shell/operator-shell.tsx`  | Replace inline hex with var() refs | ~40                |
| `apps/web/src/shell/navigation-rail.tsx` | Replace inline hex with var() refs | ~35                |
| `apps/web/src/shell/status-strip.tsx`    | Replace inline hex with var() refs | ~30                |

---

## 7. Success Criteria

### Functional Requirements

- [ ] tokens.css defines all PRD palette colors as CSS custom properties
- [ ] tokens.css defines spacing scale (4px base), radius scale, border, and
      shadow tokens
- [ ] base.css applies token defaults to html/body (background, color, line
      height)
- [ ] layout.css defines zone width, gap, and breakpoint custom properties
- [ ] Shell components reference tokens, not inline hex or rgb values
- [ ] App loads stylesheets before React render

### Testing Requirements

- [ ] Vite dev server starts without CSS import errors
- [ ] TypeScript check passes (`npm run check` in apps/web)
- [ ] Visual spot-check: shell renders with PRD palette applied
- [ ] No regression in existing surface rendering

### Non-Functional Requirements

- [ ] Zero runtime JS for token resolution (CSS-only)
- [ ] All token names follow `--jh-{category}-{name}` convention

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] banned-terms check passes

---

## 8. Implementation Notes

### Key Considerations

- Inline `CSSProperties` objects in React accept `var(--token)` as string
  values for any property that takes a string (color, background, border, etc.)
- The PRD palette from PRD_UX.md must be extracted precisely -- do not invent
  or approximate colors
- Existing components use Tailwind-like hex values from the Slate palette
  (`#0f172a`, `#f8fafc`, `#475569`, etc.) -- map these to named tokens

### Potential Challenges

- Large number of inline style objects: Mitigate by focusing this session on
  the three shell files only; other files migrate in later sessions
- Some color values serve double duty (e.g., `#0f172a` as both text and nav
  background): Create semantic token aliases so each usage has a meaningful name
- `var()` in CSSProperties requires TypeScript to accept string where it
  expects a specific type: This works natively in React 19 CSSProperties

### Relevant Considerations

- [P00] **Inline style objects with repeated ad hoc color values**: This session
  directly addresses this by creating the token layer and migrating shell files
- [P00] **Avoid generic glassmorphism / SaaS dashboard aesthetics**: The PRD
  palette (mineral paper, deep ink, cobalt) is enforced via tokens; glassmorphism
  backdrop-filter values are replaced with token-based alternatives
- [P00] **sculpt-ui was not enforced during Phases 03-06**: This session
  establishes the visual vocabulary that sculpt-ui will reference going forward

### Behavioral Quality Focus

Checklist active: No (infrastructure session, no user-facing application logic)

---

## 9. Testing Strategy

### Unit Tests

- No unit tests needed (pure CSS declarations and import wiring)

### Integration Tests

- Vite build succeeds with new CSS imports
- TypeScript compilation passes

### Manual Testing

- Start dev server, confirm shell renders with PRD palette
- Inspect elements to verify CSS custom properties are applied
- Resize browser to confirm no visual regressions in current layout

### Edge Cases

- Missing font-family fallback (tokens should include system font stack)
- CSS custom property not defined: base.css should set sensible `:root` fallbacks
- Import order: tokens must load before base, base before layout

---

## 10. Dependencies

### External Libraries

- None (CSS custom properties are browser-native)

### Other Sessions

- **Depends on**: Phase 00 (complete)
- **Depended by**: Session 02 (typography), Session 03 (layout), Session 04
  (responsive), Session 05 (router), Session 06 (command palette)

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
