# 0002. Three-Zone CSS Grid Shell Layout

**Status:** Accepted
**Date:** 2026-04-23

## Context

PRD_UX.md specifies an editorial three-zone workbench: left navigation rail,
center canvas, and right evidence rail. The previous implementation used flexbox
with wrap, which could not enforce stable column tracks across breakpoints.

## Options Considered

1. Flexbox with flex-basis percentages - simple but columns wrap unpredictably
   at boundary viewports
2. CSS Grid with explicit column tracks and media queries - stable columns,
   native responsive control, media queries handle breakpoint transitions

## Decision

Option 2. The shell body uses CSS Grid with three named column tracks. Media
queries at 768px and 1200px switch between mobile (single column), tablet
(two columns with collapsed icon rail), and desktop (full three-zone grid).
Layout classes live in `layout.css`; component-specific visual styles remain
inline.

## Consequences

- Grid track definitions enforce zone widths without component cooperation.
- Responsive behavior is centralized in CSS rather than scattered across React
  conditional rendering.
- Evidence rail uses a slide-over drawer on tablet and mobile instead of
  disappearing, preserving contextual information access.
- The Drawer component handles focus trap, scroll lock, and previous-focus
  restoration for accessibility.
