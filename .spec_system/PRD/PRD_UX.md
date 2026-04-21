# Job-Hunt - UX Requirements Document

**Companion to**: [PRD.md](PRD.md)
**Created**: 2026-04-21

---

## 1. Design Brief

### Emotional Targets

Calm command + decisive momentum + earned optimism

The operator arrives with real uncertainty and limited time. The interface
should reduce panic, surface leverage, and make each next action feel
purposeful. This is not a toy dashboard and not a generic productivity SaaS.
It is a campaign workbench for high-stakes career decisions.

### Aesthetic Identity

- **Reference domain**: Air traffic control flight strips mixed with editorial
  planning walls and strategy-room pinboards
- **Era / movement**: Swiss International typography with late-20th-century
  transit graphics
- **Material metaphor**: Warm mineral paper layered over powder-coated
  aluminum with bright signal ink

The resulting identity should feel structured, tactile, and alert rather than
dark, gamer-like, or over-polished.

### Signature Moment

The signature moment is the **run-to-artifact handoff**. When an evaluation or
scan completes, the live run timeline condenses into a compact artifact packet
that docks into the right rail: score chip, report status, PDF status,
tracker-write status, and a one-line summary appear together as a durable
result. The operator should feel the shift from "thinking in progress" to
"decision-ready artifact" in one glance.

### Micro-Narrative

Arrival -> Orientation -> Triage -> Execution -> Closure

Arrival begins in a stable shell with clear current status. Orientation comes
from the left rail, current workspace title, and visible queue of pending work.
Triage happens in the center canvas through scan review, pipeline filters, and
run summaries. Execution lives in the run console, approval flows, and artifact
actions. Closure happens when a run becomes a report, a tracker update, or a
resolved approval rather than disappearing into history.

---

## 2. User Flows

### Flow 1: First-Run Onboarding

**Trigger**: App launch with one or more missing required files
**Goal**: Reach a ready workspace without using CLI-only setup instructions

```text
[Launch]
   |
   v
[Workspace preflight]
   |
   +--> [All files present] --> [Open Run Console]
   |
   v
[Missing files detected]
   |
   v
[Onboarding wizard]
   |
   +--> [Create from examples]
   |
   +--> [Paste or edit profile data]
   |
   v
[Validation passes]
   |
   v
[Ready workspace]
```

**Happy path**: Operator launches the app, sees exactly which files are
missing, completes the wizard, and lands in the run console with setup cleared.
**Error states**: Invalid YAML, write permission failure, incomplete required
fields, interrupted onboarding resumed later.

### Flow 2: JD or URL Evaluation

**Trigger**: Operator pastes a JD or job URL into the run console
**Goal**: Produce a report-ready result with visible artifact state

```text
[Run Console]
   |
   v
[Paste JD or URL]
   |
   v
[Preflight summary]
   |
   +--> [Live URL] --> [Verification step]
   |
   v
[Start run]
   |
   v
[Live timeline + artifact rail]
   |
   +--> [Approval needed] --> [Approval inbox] --> [Resume run]
   |
   v
[Artifacts ready]
   |
   +--> [Open report]
   +--> [Open PDF]
   \--> [Open pipeline entry]
```

**Happy path**: Operator pastes input, starts the run, watches meaningful
progress, and opens the resulting report or pipeline entry.
**Error states**: Invalid URL, extraction failure, legitimacy uncertainty,
report write failure, tracker-addition conflict.

### Flow 3: Pipeline Review and Status Update

**Trigger**: Operator opens the pipeline page
**Goal**: Triage existing opportunities and update tracker state quickly

```text
[Pipeline page]
   |
   v
[Filter + sort + select row]
   |
   v
[Context panel updates]
   |
   +--> [Open report]
   |
   +--> [Open PDF]
   |
   \--> [Change status]
            |
            v
       [Status saved]
```

**Happy path**: Operator filters to a subset, selects an opportunity, reviews
the summary, and updates status without losing context.
**Error states**: Missing report, stale tracker row, merge-needed warning,
invalid status transition surfaced from repo rules.

### Flow 4: Scan to Shortlist to Evaluation

**Trigger**: Operator opens the scan workspace
**Goal**: Convert a fresh scan into a ranked shortlist and selected evaluations

```text
[Scan page]
   |
   v
[Start scan job]
   |
   v
[Background progress]
   |
   v
[Shortlist review]
   |
   +--> [Inspect candidate]
   |
   +--> [Mark ignore]
   |
   \--> [Send to evaluation]
            |
            v
       [Run Console or batch seed]
```

**Happy path**: Operator runs scan, reviews ranked candidates, and sends the
best roles into the evaluation workflow.
**Error states**: Empty results, duplicate suppression confusion, ATS access
limitations, stale scan state.

### Flow 5: Batch Job Management

**Trigger**: Operator creates or resumes a batch workflow
**Goal**: Monitor many items without losing per-item clarity

```text
[Batch page]
   |
   v
[Compose batch]
   |
   v
[Validate items]
   |
   v
[Start batch]
   |
   v
[Per-item state matrix]
   |
   +--> [Retry failed item]
   |
   +--> [Inspect warning]
   |
   \--> [Merge and verify]
```

**Happy path**: Operator submits a batch, tracks item-level state, retries
specific failures, and completes merge-plus-verify from the same surface.
**Error states**: Item blocked by approval, schema mismatch, pending TSVs,
merge verification failure.

### Flow 6: Approval Resolution

**Trigger**: A running workflow pauses for human review
**Goal**: Resolve the decision without losing run context

```text
[Approval badge in shell]
   |
   v
[Approval inbox]
   |
   v
[Context drawer]
   |
   +--> [Approve]
   |
   +--> [Reject]
   |
   \--> [Defer]
            |
            v
       [Run resumes or stays paused]
```

**Happy path**: Operator sees what triggered review, understands impact,
approves or rejects, and the run resumes visibly.
**Error states**: Approval stale, underlying run already failed, missing
context payload, rejected action requiring alternate next step.

### Flow 7: Specialist Workflow Workspace

**Trigger**: Operator launches compare-offers, deep research, interview prep,
follow-up, patterns, training, or project review
**Goal**: Use a focused workspace without fragmenting the app shell

```text
[Workflow launcher]
   |
   v
[Specialist workspace]
   |
   v
[Context form or artifact picker]
   |
   v
[Run timeline]
   |
   v
[Artifact output panel]
```

**Happy path**: Operator chooses a specialist mode, supplies context, runs it,
and receives an artifact or recommendation in the shared app shell.
**Error states**: Missing prerequisite artifacts, unsupported comparison set,
workflow-specific input validation errors.

---

## 3. Screen Inventory

| Screen                  | Route/Path           | Purpose                                                              | Key Components                                                                          |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| App Shell / Run Console | `/`                  | Default workspace for launching and monitoring runs                  | Left rail, run composer, live timeline, artifact rail, global command palette           |
| Onboarding Wizard       | `/onboarding`        | Resolve missing required files and initial profile setup             | Preflight checklist, stepper, file status cards, inline editors, validation summary     |
| Run Detail              | `/runs/:runId`       | Full view of a running or completed workflow                         | Timeline, logs/traces summary, artifact status, retry or resume controls                |
| Pipeline Page           | `/pipeline`          | Review tracked opportunities and update status                       | Filter bar, sortable list or table, summary panel, status actions, artifact links       |
| Report Viewer           | `/reports/:reportId` | Read long markdown reports cleanly                                   | Report header, sticky metadata rail, table of contents, markdown body, artifact actions |
| Scan Review             | `/scan`              | Run scans and review shortlist candidates                            | Scan launcher, progress panel, shortlist cards, dedup notes, launch actions             |
| Batch Jobs              | `/batch`             | Create and monitor batch workflows                                   | Batch composer, item matrix, warning states, merge and verify actions                   |
| Approval Inbox          | `/approvals`         | Resolve paused actions needing review                                | Approval list, context drawer, approve/reject controls, resume state                    |
| Settings and Profile    | `/settings`          | Manage user-layer files, auth state, and maintenance actions         | File cards, profile shortcuts, auth status, update check, maintenance tools             |
| Specialist Workspace    | `/workflows/:mode`   | Host compare-offers and specialist flows inside one consistent shell | Context panel, artifact picker, workflow timeline, result viewer                        |

---

## 4. Navigation Structure

```text
[App Shell]
|-- [Run Console] (/)
|   \-- [Run Detail] (/runs/:runId)
|-- [Pipeline] (/pipeline)
|   \-- [Report Viewer] (/reports/:reportId)
|-- [Scan Review] (/scan)
|-- [Batch Jobs] (/batch)
|-- [Approval Inbox] (/approvals)
|-- [Specialist Workspace] (/workflows/:mode)
\-- [Settings and Profile] (/settings)
```

**Navigation pattern**: Left rail navigation on desktop, collapsible drawer on
tablet, bottom navigation plus overflow sheet on mobile. Secondary in-screen
tabs are allowed within Pipeline, Scan, Batch, and Settings when they preserve
deep linking.

**Deep linking**: Supported for `runId`, `reportId`, specialist `mode`,
pipeline filters, batch views, and approval IDs.

**Shell rules**:

- Onboarding intercepts the shell only when prerequisites fail
- Approval count is always visible in the primary nav
- The run composer remains globally reachable from desktop shell states
- Back navigation should restore the last selected row, tab, or split-pane
  context where possible

---

## 5. Interaction Patterns

### Run Composer

- Accept plain text, pasted JD blocks, and ATS URLs in one field
- Detect likely input type immediately and show a lightweight preflight summary
- Keep primary action pinned and obvious
- Show recent workflow shortcuts without overwhelming the composer

### Forms

- Validation: both inline and on submit
- Error display: field-level copy plus a form-level summary for blockers
- Success feedback: inline success state first, toast second
- Autosave: only for low-risk settings fields, never for high-impact workflow
  actions

### Drawers and Dialogs

- Use right-side drawers on desktop for report quick view, approval context,
  and row details
- Use full-screen sheets on tablet and mobile for the same content
- Reserve confirmation dialogs for destructive or state-resetting actions such
  as archiving scan state or discarding a drafted batch

### Loading States

- Use skeleton rows for list screens
- Use streaming timeline states for active runs
- Use determinate step chips when the workflow knows its stage
- Never block the whole shell with a full-page spinner during background work

### Notifications

- Toasts for non-blocking completion and save events
- Inline banners for verification warnings, merge blockers, or tracker
  conflicts
- Persistent inbox badges for approvals and failed jobs

### Tables and Lists

- Pipeline and batch views prefer hybrid table-card rows: dense enough for
  scanning, readable enough for quick detail
- Row selection updates a context panel instead of forcing route churn
- Status chips must always pair color with text

### Comparison and Review

- Compare-offers and shortlist review should support side-by-side inspection on
  large screens
- On smaller screens, use stacked cards with sticky action footers

---

## 6. Motion and Animation Strategy

### Philosophy

Motion exists to clarify state changes, preserve orientation, and make the
handoff from live reasoning to durable artifact feel tangible.

### Entrance Choreography

- App load: shell chrome appears first, then the active workspace, then the
  right-side context rail
- Large list sections reveal in short, grouped cascades rather than one item at
  a time
- Onboarding steps transition horizontally on desktop and vertically on mobile

### Interaction Feedback

- Hover states: subtle 1-2px lift, border darkening, and accent underline
- Click or tap responses: quick surface compression, then release
- Focus rings: 2px high-contrast ring plus 2px gap from component edge
- Selected pipeline rows: accent bar + surface tint, not only background fill

### Scroll-Driven Moments

- Report viewer keeps a slim progress indicator and section marker rail visible
- Scan review uses a sticky action shelf that compresses as the shortlist body
  scrolls
- Wide-screen pipeline pages keep filter chrome sticky while the detail rail
  updates independently

### Animation Constraints

- Locked target: 60fps on normal operator hardware
- Maximum 3 simultaneous animations per viewport region
- Prefer transform and opacity; avoid layout-thrashing transitions
- Respect `prefers-reduced-motion` with calmer fades, no parallax, no bouncing
- Long-running timelines may pulse one active stage, but never animate every
  completed step

---

## 7. Layout Philosophy

### Composition Approach

Use an **editorial operations workbench**. Desktop layout is intentionally
asymmetric: stable left rail, dominant center canvas, and a narrower right rail
for context, artifacts, or approvals. The center area is where decisions
happen; the right rail is where evidence accumulates.

### Visual Hierarchy

- Scale contrast: strong between workspace titles, section labels, and dense
  operational rows
- Negative space: moderate, not airy; enough room to reduce panic without
  wasting scanning space
- Section rhythm: alternate dense data surfaces with quieter artifact and
  summary blocks

### Section Transitions

Use pinned headers, tonal field changes, and ruled separators instead of heavy
card nesting. The operator should feel movement between work zones, not a stack
of unrelated widgets.

---

## 8. Responsive Strategy

| Breakpoint    | Target       | Layout Approach                                                                                           |
| ------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `< 768px`     | Mobile       | Review-first single column, bottom nav, full-screen sheets, simplified run composer, sticky action footer |
| `768-1199px`  | Tablet       | Two-pane layout, collapsible rail, detail drawer instead of permanent right context rail                  |
| `1200-1599px` | Desktop      | Full three-zone workbench with persistent right rail and primary left navigation                          |
| `>= 1600px`   | Wide desktop | Expanded report reading width, side-by-side comparison states, batch matrix and context visible together  |

**Approach**: Desktop-first adaptive design. Phone-sized browsers must support
review, approvals, and light triage; dense authoring workflows are optimized
for laptop and desktop use.

**Touch targets**: Minimum `44x44px` with generous separation between dense row
actions.

---

## 9. Accessibility

**Target**: WCAG 2.1 AA baseline

- Keyboard navigation: all major workflows reachable without pointer input
- Screen reader: semantic landmarks, proper heading order, labeled controls,
  and live regions for run progress and approval changes
- Color contrast: minimum WCAG AA for text, chips, and status indicators
- Focus management: dialogs and sheets trap focus correctly and restore the
  invoking control when closed
- Reduced motion: replace directional movement with opacity and color changes
  when motion preferences request it
- Status meaning: never rely on color alone; every state uses explicit text and
  iconography or labels

---

## 10. Design System

### Color Architecture

- **Dominant surface** (60%): Mineral paper `#F4EFE6`
- **Secondary surfaces** (25%): Stone `#E3DDD2`, fog `#D9E4E8`, and deep ink
  `#20313A` for high-focus rails and report chrome
- **Accent** (10%): Cobalt `#2C63FF`
- **Signal colors** (5%): Verdigris `#1F9D84`, amber `#C5851B`, coral
  `#D85B45`, and mulberry `#7B4ED8`

Palette character: warm-neutral foundation with precise synthetic accents.
Accent usage should stay disciplined: one dominant accent focus per viewport.

### Typography

- **Display font**: Space Grotesk
- **Body font**: IBM Plex Sans
- **Monospace**: IBM Plex Mono
- **Scale ratio**: 1.25
- **Minimum body size**: 16px on desktop, 15px only in dense operational rows

### Spacing Scale

`4, 8, 12, 16, 24, 32, 48, 64, 96`

Use 24px and 32px as the main section rhythm values. Dense tables may compress
to 12px internal padding but should never fall below 8px.

### Elevation and Depth

Depth is created through layered paper cards, hairline borders, and restrained
shadow bands:

- Ground: mineral canvas
- Working surface: elevated cards with 1px ink-tinted borders
- Active focus: accent edge or inset highlight, not oversized glow
- Heavy modal state: rare, reserved for irreversible or blocking decisions

### Texture and Atmosphere

Use subtle paper grain or drafting-grid texture only on large background fields.
Do not texture data-heavy surfaces. The atmosphere should feel tactile and
intentional, not nostalgic or noisy.

---

## 11. Component Patterns

| Component        | Used In                                       | Behavior                                                                              |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Global shell     | All screens                                   | Persistent navigation, approval badge, workspace title, and global action access      |
| Command palette  | All screens                                   | Fast jump to screens, workflows, reports, and maintenance actions                     |
| Run composer     | Run Console                                   | Unified input for JD text, URLs, and workflow launch intents                          |
| Live timeline    | Run Console, Run Detail, Specialist Workspace | Stage-by-stage progress with visible waiting, approval, and completion states         |
| Artifact packet  | Run Console, Run Detail                       | Compact summary of report, PDF, tracker, and follow-up outputs                        |
| Pipeline row     | Pipeline                                      | Dense hybrid row with summary data, status chip, and right-panel selection behavior   |
| Context rail     | Pipeline, Scan, Batch                         | Shows selected item details, warnings, and quick actions without route churn          |
| Report viewer    | Report Viewer                                 | Long-form markdown reader with sticky metadata, section anchors, and artifact actions |
| Shortlist card   | Scan Review                                   | Candidate summary with fit signals, dedup notes, and launch-to-evaluate action        |
| Batch matrix row | Batch Jobs                                    | Per-item state with retry, inspect, and merge readiness indicators                    |
| Approval drawer  | Approval Inbox, Run Detail                    | Shows triggering context, impact, and explicit approve or reject actions              |
| File status card | Settings and Onboarding                       | Explains missing files, edit state, and shortcuts into the filesystem-backed setup    |

---

## 12. Anti-Patterns to Avoid

- Do not recreate terminal nostalgia in the web app through fake CRT styling,
  black-background defaulting, or monospace-overuse.
- Do not use anonymous gray SaaS cards for every surface. The workspace needs
  strong zones and memorable hierarchy.
- Do not stack modal over modal for core workflows. Keep context visible in
  rails, drawers, or split panes.
- Do not flood the UI with many accent colors at once. Status and focus colors
  must remain legible and disciplined.
- Do not hide filesystem consequences. If an action writes a report, tracker
  addition, or PDF, the interface should surface that outcome clearly.

---

## 13. Open UX Questions

1. Should phone-sized browsers in the first release support active run authoring
   or remain review-and-approval oriented below `768px`?
2. Should compare-offers get a dedicated comparison board in its own route, or
   live inside the shared Specialist Workspace pattern first?
3. Should the first shipped visual system be light-first only, or should a
   dark companion theme ship alongside it from day one?
