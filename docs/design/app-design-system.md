# Job-Hunt App Design System

This is the implementation contract for the tracked React operator app in
`apps/web`. The concept images are visual references, not runtime assets:

- `docs/design/app-concepts/operator-home.png`
- `docs/design/app-concepts/tracker-desktop.png`
- `docs/design/app-concepts/tracker-mobile.png`

## Product character

Job-Hunt is a local, evidence-first workbench. It should feel precise and calm:
an editorial heading system over compact operations software. It must not look
like a generic SaaS dashboard.

## Tokens

- Canvas: true white (`#ffffff`)
- Primary ink: graphite (`#17191d`)
- Secondary ink: cool gray (`#5d6470`)
- Rules: cool gray (`#dfe3e8`)
- Accent: cobalt (`#155eef`)
- Attention: restrained amber (`#9a6700` on `#fff4d6`)
- Success: restrained green (`#13745b` on `#e8f7f1`)
- Error: restrained red (`#b42318` on `#fff0ee`)
- Headings: local editorial serif stack
- UI and body copy: local system grotesk stack
- Corners: 2–8px; semantic status chips may be fully rounded
- Shadows: none by default; drawers may use one quiet shadow
- Gradients and glow: prohibited

## Desktop shell

The desktop shell uses three contiguous zones:

1. A narrow left navigation rail with a wordmark and one-line destinations.
2. A flexible center canvas with open, ruled lists and tables.
3. A narrow right context rail for workspace health, selected evidence, and
   real approval state.

The zones use divider rules instead of floating outer cards. A compact status
strip sits below the shell and always repeats the safety invariant:
`No send · No submit`.

Primary navigation order:

1. Today
2. Evaluate
3. Pipeline
4. Tracker
5. Scan
6. Batch
7. Apply Help
8. Specialists
9. Artifacts
10. Settings

Startup, onboarding, and approvals remain routable. Setup appears when required
files are missing; approvals surface through live attention counts and mobile
navigation.

## Surfaces

### Today

Use one page heading followed by compact operational sections:

- Attention now: real pending approvals and recent failures.
- Active work: current workflow/session, or an honest empty state.
- Queue closeout: real pipeline and staged tracker counts.
- Recent artifacts: only artifacts returned by the API.
- Workspace readiness and maintenance: factual health and version data.

Sections are separated by rules. Do not turn each datum into a metric card.

### Tracker

The tracker is an open ruled row list with filters, paging, and a detail pane.
Every displayed value comes from the tracker API. Selection uses a subtle
cobalt wash and left rule. Status is the only consistently chip-like element.

### Other workspaces

Existing evaluation, scan, batch, application-help, specialist, approval,
artifact, onboarding, startup, and settings behaviors remain intact. Shared
tokens remove inflated radii, shadows, gradients, and cream surfaces without
changing their data contracts.

## Responsive behavior

- Desktop (`>=1200px`): three contiguous zones.
- Tablet (`768–1199px`): compact rail, center canvas, right context drawer.
- Mobile (`<768px`): center canvas, bottom navigation, and context drawer.
- Mobile primary navigation: Today, Evaluate, Tracker, Approvals, More.
- Tables and lists must not force page-level horizontal scrolling.
- Detail grids collapse to one column, touch targets remain at least 40px, and
  the safety strip stays visible above the bottom navigation.

## Copy lock

Use the actual runtime vocabulary: session, workflow, approval, report,
tracker addition, auth, operational store, local workspace. Never invent model
names, conversion rates, salary figures, application counts, or success
metrics.

## Fidelity ledger

| Concept characteristic | Implementation owner |
| --- | --- |
| White/graphite/cobalt palette | `apps/web/src/styles/tokens.css` |
| Three contiguous desktop zones | `apps/web/src/styles/layout.css`, `shell/root-layout.tsx` |
| Editorial headings | `apps/web/src/styles/tokens.css` |
| Compact primary navigation | `shell/navigation-rail.tsx`, `shell/shell-types.ts` |
| Right context rail | `shell/evidence-rail.tsx`, `shell/root-layout.tsx` |
| Bottom safety strip | `shell/status-strip.tsx` |
| Open operational home sections | `shell/operator-home-surface.tsx` |
| Ruled tracker list/detail | `tracker/*` |
| Mobile bottom navigation | `shell/bottom-nav.tsx` |
