# Session Specification

**Session ID**: `phase01-session02-typography-and-base-styles`
**Phase**: 01 - Rebuild Foundation and Shell
**Status**: Not Started
**Created**: 2026-04-23
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

This session introduces the PRD-defined typography system into the web app.
Space Grotesk is loaded for headings, IBM Plex Sans for body text, and IBM Plex
Mono for code and data displays. The full typographic scale is defined as design
tokens in `tokens.css`, base heading and body defaults are applied in `base.css`,
and the three shell components migrated in session 01 are updated to use the new
font tokens instead of fallback system fonts.

Currently `base.css` has a font-family fallback stack that still lists Avenir
Next and system fonts. No `@font-face` declarations or preload hints exist, and
there are no typographic scale tokens (sizes, weights, line heights, letter
spacing). Inline `fontSize`, `fontWeight`, and `lineHeight` values are scattered
across 50+ component files with raw pixel and numeric values.

This session establishes the typographic token vocabulary and proves the pattern
on the shell components. Remaining components adopt the tokens in Phase 02
sessions. The sculpt-ui design brief must be completed before implementation
begins.

---

## 2. Objectives

1. Source and load Space Grotesk, IBM Plex Sans, and IBM Plex Mono via
   self-hosted font files or Google Fonts CDN with preload hints to avoid
   FOIT/FOUT
2. Define the full typographic token scale in `tokens.css`: font families,
   sizes (display through caption), weights, line heights, letter spacing
3. Apply typographic tokens in `base.css` to heading and body element defaults
4. Migrate the three shell components (`operator-shell.tsx`,
   `navigation-rail.tsx`, `status-strip.tsx`) and `operator-home-surface.tsx`
   from hardcoded font values to token references
5. Remove all references to Avenir Next and non-PRD font families from the
   codebase
6. Verify no FOIT/FOUT on page load and confirm screenshot comparison with PRD
   typography intent

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-design-token-layer` - tokens.css exists with color,
      spacing, radius, border, and shadow tokens; base.css exists with reset and
      body defaults; stylesheets wired into main.tsx

### Required Tools/Knowledge

- PRD typography spec: Space Grotesk (headings), IBM Plex Sans (body),
  IBM Plex Mono (code/data)
- CSS @font-face declarations and font-display strategy
- Preload link hints for critical fonts
- CSS custom properties for token layer

### Environment Requirements

- Node.js and npm available
- Vite dev server runnable via `npm run dev` in apps/web
- Network access for Google Fonts CDN (or local font files)

---

## 4. Scope

### In Scope (MVP)

- Operator sees PRD-aligned headings in Space Grotesk across the app - add
  font loading and heading defaults
- Operator sees body text in IBM Plex Sans - update base.css font-family and
  add font loading
- Operator sees code/data text in IBM Plex Mono - add font token and loading
- All font references use CSS custom properties, not hardcoded font names
- Typography scale tokens (12 sizes from display to caption) defined in
  tokens.css
- Shell components use typographic tokens instead of raw fontSize/fontWeight
  values
- Font preload hints added to index.html to prevent FOIT/FOUT
- sculpt-ui design brief completed before implementation

### Out of Scope (Deferred)

- Migrating non-shell components from inline font values to tokens -
  _Reason: Phase 02 scope_
- Shell layout rework to CSS Grid three-zone - _Reason: session 03_
- Fine-grained reading-column typography (report viewer, pipeline) -
  _Reason: Phase 02_
- Variable font optimization - _Reason: not in current PRD scope_

---

## 5. Technical Approach

### Architecture

Three font families are loaded via Google Fonts CDN using `<link>` tags in
`index.html` with `rel="preconnect"` and `rel="preload"` for the critical
weights. A `@font-face` fallback block in a new section of `tokens.css`
provides the font-family custom properties.

Typography tokens follow the existing `--jh-{category}-{name}` convention and
are declared on `:root` in `tokens.css`. Three token groups are added:

1. **Font families**: `--jh-font-heading`, `--jh-font-body`, `--jh-font-mono`
2. **Type scale**: `--jh-text-{size}-{property}` for each step (display, h1-h4,
   body-lg, body, body-sm, caption, mono, mono-sm, label, label-sm)
3. **Weight**: `--jh-font-weight-{name}` for regular, medium, semibold, bold

`base.css` applies heading defaults (h1-h6 use `--jh-font-heading` with
appropriate scale step). The body element inherits `--jh-font-body`.

Shell components replace inline `fontSize`, `fontWeight`, `lineHeight`, and
`letterSpacing` values with `var(--jh-text-*)` token references.

### Design Patterns

- CSS custom properties on `:root`: zero runtime cost, debuggable
- Google Fonts CDN with `font-display: swap` and preconnect: fast, reliable
- Progressive enhancement: system font fallback stack until web fonts load
- Token-first: components reference tokens, never raw font values

### Technology Stack

- Google Fonts CDN (Space Grotesk, IBM Plex Sans, IBM Plex Mono)
- CSS custom properties (browser-native)
- CSS `@font-face` / `font-display: swap`
- Preconnect + preload link hints

---

## 6. Deliverables

### Files to Create

| File                                                           | Purpose | Est. Lines |
| -------------------------------------------------------------- | ------- | ---------- |
| (none -- all deliverables are modifications to existing files) |         |            |

### Files to Modify

| File                                           | Changes                                                    | Est. Lines Changed |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| `apps/web/index.html`                          | Add preconnect and Google Fonts link tags                  | ~8                 |
| `apps/web/src/styles/tokens.css`               | Add typography token section (families, scale, weights)    | ~80                |
| `apps/web/src/styles/base.css`                 | Update body font-family to use token; add heading defaults | ~30                |
| `apps/web/src/shell/operator-shell.tsx`        | Replace inline font values with token refs                 | ~10                |
| `apps/web/src/shell/navigation-rail.tsx`       | Replace inline font values with token refs                 | ~15                |
| `apps/web/src/shell/status-strip.tsx`          | Replace inline font values with token refs                 | ~20                |
| `apps/web/src/shell/operator-home-surface.tsx` | Replace inline font values with token refs                 | ~15                |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Space Grotesk renders for headings across the app
- [ ] IBM Plex Sans renders for body text
- [ ] IBM Plex Mono renders for code and data displays
- [ ] tokens.css defines font family, size, weight, line-height, and
      letter-spacing tokens
- [ ] base.css applies typographic defaults to headings and body
- [ ] Shell components use token references, not inline font values

### Testing Requirements

- [ ] Vite dev server starts without errors
- [ ] TypeScript check passes
- [ ] Visual spot-check: headings render in Space Grotesk
- [ ] Visual spot-check: body text renders in IBM Plex Sans
- [ ] No visible FOIT or FOUT on page load (preload verified)

### Non-Functional Requirements

- [ ] Zero runtime JS for font loading (CSS/HTML only)
- [ ] All typography token names follow `--jh-font-*` and `--jh-text-*`
      convention
- [ ] Google Fonts preconnect hint present for fast connection

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] Banned-terms check passes
- [ ] sculpt-ui design brief was followed
- [ ] Screenshot comparison shows PRD-aligned typography

---

## 8. Implementation Notes

### Key Considerations

- Google Fonts CDN is the simplest path; self-hosting is an option if CDN
  latency becomes a concern but is out of scope for MVP
- `font-display: swap` avoids FOIT; preload hints reduce FOUT window
- The existing `base.css` body font-family must be updated to reference the
  `--jh-font-body` token with a system font fallback stack
- Heading defaults in `base.css` override any browser defaults (user-agent
  stylesheet)

### Potential Challenges

- **FOIT/FOUT**: Mitigate with preconnect, preload for critical weights, and
  `font-display: swap`
- **Inline font values scattered across 50+ files**: Only shell components are
  migrated this session; remaining files adopt tokens in Phase 02
- **TypeScript accepting var() in CSSProperties**: Works natively in React 19
  CSSProperties for string-accepting properties

### Relevant Considerations

- [P00] **Font loading strategy needed for Space Grotesk + IBM Plex family**:
  This session directly addresses this concern by adding preconnect, preload,
  and font-display: swap
- [P00] **Avoid generic glassmorphism / SaaS dashboard aesthetics**: PRD
  typography (editorial Space Grotesk headings, professional IBM Plex body)
  sets a distinctive visual identity
- [P00] **sculpt-ui was not enforced during Phases 03-06**: This session
  requires sculpt-ui design brief as a prerequisite

### Behavioral Quality Focus

Checklist active: No (infrastructure/token session, no user-facing application
logic beyond font rendering)

---

## 9. Testing Strategy

### Unit Tests

- No unit tests needed (pure CSS/HTML declarations and inline style migration)

### Integration Tests

- Vite build succeeds with updated CSS
- TypeScript compilation passes

### Manual Testing

- Start dev server, confirm headings render in Space Grotesk (check font-family
  in browser DevTools)
- Confirm body text renders in IBM Plex Sans
- Confirm monospace elements render in IBM Plex Mono
- Verify no FOIT/FOUT: hard refresh and observe text rendering
- Resize browser to confirm no visual regressions

### Edge Cases

- Slow network: font-display swap ensures text is visible with system fonts
  until web fonts load
- Font CDN unreachable: fallback stack (system fonts) ensures readable text
- CSS custom property not defined: tokens.css fallback values handle this

---

## 10. Dependencies

### External Libraries

- Google Fonts CDN (Space Grotesk, IBM Plex Sans, IBM Plex Mono) -- no npm
  packages needed

### Other Sessions

- **Depends on**: `phase01-session01-design-token-layer` (complete)
- **Depended by**: Session 03 (shell layout), Session 04 (responsive), all
  Phase 02 sessions that refine component typography

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
