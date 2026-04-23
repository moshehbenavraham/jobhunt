# Session 02: Typography and Base Styles

**Session ID**: `phase01-session02-typography-and-base-styles`
**Package**: apps/web
**Status**: Not Started
**Estimated Tasks**: ~18
**Estimated Duration**: 2-3 hours

---

## Objective

Load PRD-defined typography (Space Grotesk, IBM Plex Sans, IBM Plex Mono),
define the full typographic scale as tokens, and apply it across the app so
all text rendering matches the UX PRD.

---

## Scope

### In Scope (MVP)

- Source and load Space Grotesk (headings), IBM Plex Sans (body), IBM Plex Mono
  (code/data) via self-hosted files or CDN with preload
- Add font-face declarations and preload links to avoid FOIT/FOUT
- Define typographic scale tokens in tokens.css: font families, sizes, weights,
  line heights, letter spacing
- Apply typographic tokens to base.css heading and body defaults
- Migrate shell and existing components from Avenir Next or system fonts to PRD
  typography tokens
- Run sculpt-ui design brief before implementation

### Out of Scope

- Color token changes (session 01)
- Shell layout rework (session 03)
- Fine-grained component-level typography refinement (Phase 02)

---

## Prerequisites

- [ ] Session 01 completed (tokens.css exists with color/spacing tokens)
- [ ] Font files or CDN sources identified
- [ ] sculpt-ui design brief completed for this session

---

## Deliverables

1. Font loading setup (preload links, font-face declarations or CDN imports)
2. Typography tokens added to tokens.css
3. base.css updated with typographic defaults
4. Shell and existing components use PRD fonts via token references
5. No remaining references to Avenir Next or non-PRD font families

---

## Success Criteria

- [ ] Space Grotesk renders for headings across the app
- [ ] IBM Plex Sans renders for body text
- [ ] IBM Plex Mono renders for code and data displays
- [ ] No visible FOIT or FOUT on page load
- [ ] All font references use CSS custom properties, not hardcoded font names
- [ ] Screenshot comparison shows PRD-aligned typography
- [ ] sculpt-ui design brief was followed
