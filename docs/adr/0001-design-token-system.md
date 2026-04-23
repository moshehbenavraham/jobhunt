# 0001. CSS Custom Property Design Token System

**Status:** Accepted
**Date:** 2026-04-23

## Context

The web shell had inline hex colors, magic numbers, and mixed font stacks
scattered across component files. PRD_UX.md defines a specific palette (mineral
paper, deep ink, cobalt accent) and typography (Space Grotesk, IBM Plex Sans,
IBM Plex Mono) that need centralized enforcement.

## Options Considered

1. CSS-in-JS theme object (e.g. styled-components ThemeProvider) - runtime
   overhead, extra dependency, harder to share with plain CSS
2. CSS custom properties in a dedicated token file - zero runtime cost, works
   with any styling approach, inspectable in browser devtools

## Decision

Option 2. All visual values are defined as CSS custom properties in
`apps/web/src/styles/tokens.css` and consumed via `var(--jh-*)` throughout
components and layout files. No inline hex, rgb, or magic font values are
allowed in component files.

## Consequences

- Every color, spacing, radius, shadow, and font value has a single source of
  truth.
- Adding dark mode or alternate themes requires only a new `:root` block.
- Components cannot compile without the token file imported, which prevents
  accidental style drift.
- Glassmorphism backdrop-filter effects were removed in favor of flat token-
  based surfaces per PRD anti-pattern guidance.
