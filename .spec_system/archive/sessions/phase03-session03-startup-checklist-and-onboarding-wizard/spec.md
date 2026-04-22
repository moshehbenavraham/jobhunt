# Session Specification

**Session ID**: `phase03-session03-startup-checklist-and-onboarding-wizard`
**Phase**: 03 - Chat, Onboarding, and Approvals UX
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 03 already has a stable operator shell and a live chat console, but the
Onboarding surface is still only a placeholder while startup readiness lives in
the Startup diagnostics panel. The next missing capability is a guided
first-run and repair flow that turns those raw diagnostics into an actionable
wizard: show exactly what is missing, preview which files can be repaired from
checked-in templates, and refresh readiness after the operator explicitly asks
the app to repair the workspace.

This session should keep the browser thin. `apps/web` gains a dedicated
onboarding module that renders checklist, preview, confirmation, and readiness
handoff states inside the existing shell. `apps/api` adds only the bounded
read and command routes required to expose deterministic onboarding summaries
and to execute template-backed repairs through the existing workspace mutation
guardrails. The browser must not recreate canonical path rules, template
mapping, or repair eligibility logic.

The result is a real Startup -> Onboarding handoff instead of a dead-end
diagnostics screen. Users can see missing onboarding files, understand which
repairs are available, run explicit template-backed repairs without hidden
writes, and confirm that the live repo state has moved closer to ready. Later
Phase 03 sessions can then layer approvals and settings on top of a shell that
already handles startup repair as a first-class workflow.

---

## 2. Objectives

1. Replace the Onboarding placeholder with a guided wizard that explains
   missing startup prerequisites and available template-backed repairs.
2. Add thin backend onboarding summary and repair routes that reuse the
   existing startup diagnostics and onboarding repair tool logic instead of
   duplicating workspace rules in the browser.
3. Require explicit operator confirmation before any repair mutation, then
   refresh readiness from the live repo state after the repair completes.
4. Add route, browser, and repo-level validation for missing-file, preview,
   repair-success, already-present, and repair-failure flows.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session04-boot-path-and-validation` - provides the existing
      startup payload shape and the no-hidden-write boot contract.
- [x] `phase02-session02-workspace-and-startup-tool-suite` - provides startup
      inspection, onboarding repair definitions, and template-backed repair
      behavior.
- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell frame, Startup surface slot, and stable Onboarding surface slot.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic route design, validation,
  and path ownership rules
- `.spec_system/CONSIDERATIONS.md` for startup freshness, read-first repair
  behavior, and mutation guardrail guidance
- `.spec_system/PRD/PRD.md` and `.spec_system/PRD/PRD_UX.md` for first-run
  onboarding expectations and shell handoff behavior
- `apps/api/src/tools/onboarding-repair-tools.ts` and
  `apps/api/src/workspace/workspace-types.ts` for canonical repair targets and
  template-backed mutation rules
- `apps/web/src/boot/` and `apps/web/src/shell/` for the current startup
  diagnostics contract and shell surface composition

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- `npm run app:api:test:runtime` available for HTTP contract validation
- `npm run doctor` available for setup and onboarding regression checks
- Existing Playwright dependency available for browser smoke coverage

---

## 4. Scope

### In Scope (MVP)

- The Onboarding surface becomes a guided checklist and repair wizard inside
  the existing operator shell.
- The wizard reads canonical missing-file summaries from startup diagnostics
  and a bounded onboarding summary route.
- Users can preview deterministic template-backed repairs for the canonical
  onboarding file set before any mutation occurs.
- Users can trigger an explicit repair action for eligible targets and then
  revalidate startup readiness from the live repo state.
- Mixed states such as already-present files, template-missing failures,
  partial repairability, and remaining blockers are rendered explicitly.

### Out of Scope (Deferred)

- Full profile authoring, YAML editing, or free-form document editing in the
  browser - _Reason: Session 03 only needs checklist, preview, and bounded
  template-backed repair flows._
- Generic approval inbox and paused-run review controls - _Reason: Session 04
  owns the approval inbox and human review surface._
- Settings, auth maintenance, or broader environment management - _Reason:
  Session 05 owns the settings and maintenance surface._
- Artifact review, tracker editing, or workflow launch behavior outside the
  onboarding handoff - _Reason: those belong to later parity phases._

---

## 5. Technical Approach

### Architecture

Add a new `apps/web/src/onboarding/` module that owns the onboarding summary
fetch, selected repair targets, explicit repair confirmation, refresh, and
readiness handoff states. The wizard remains a surface inside the existing
shell, not a new router. It should reuse the existing startup diagnostics hook
for canonical readiness data while calling a dedicated onboarding summary route
for repair preview details that the startup payload does not already own.

On the backend, add a bounded onboarding summary helper plus two routes under
`apps/api/src/server/`: a GET route that composes startup diagnostics with the
preview-onboarding-repair tool output, and a POST repair route that validates
requested targets and executes the existing template-backed repair logic only
after explicit user action. The GET path must remain read-only. The POST path
must keep mutations inside the existing workspace mutation adapter and
canonical repair target set.

To keep scope self-contained before the generic approval inbox exists, the
repair route should reuse the onboarding repair tool logic directly with a
route-owned explicit-confirmation context rather than introducing a second
browser-side file-writing path. The route should surface already-present,
template-missing, invalid-target, and repair-failed states as structured
errors. After a successful repair, the web wizard should re-fetch both the
onboarding summary and startup diagnostics so the shell reflects the live repo
state instead of optimistic guesses.

### Design Patterns

- Read model plus explicit command route: keep preview and checklist reads
  separate from repair mutations so onboarding remains read-first by default.
- Tool-logic reuse: drive repair preview and file creation from the checked-in
  onboarding repair definitions instead of duplicating browser-side rules.
- Confirm-then-mutate flow: require an explicit repair action before writes and
  block duplicate submits while a repair request is in flight.
- Revalidation after mutation: refresh startup and onboarding state from the
  backend after any repair attempt, not from local browser assumptions.
- Bounded target set: limit summary and repair paths to the canonical
  onboarding surfaces already defined in the workspace contract.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing startup diagnostics module in `apps/web/src/boot/`
- TypeScript Node server routes in `apps/api`
- Existing onboarding repair tools and workspace mutation adapter in `apps/api`
- Existing Playwright dependency for browser smoke coverage

---

## 6. Deliverables

### Files to Create

| File                                                    | Purpose                                                                       | Est. Lines |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| `apps/web/src/onboarding/onboarding-types.ts`           | Define onboarding payloads, repair target enums, and view-state types         | ~170       |
| `apps/web/src/onboarding/onboarding-client.ts`          | Fetch onboarding summaries and submit explicit repair requests                | ~170       |
| `apps/web/src/onboarding/use-onboarding-wizard.ts`      | Manage refresh, target selection, and in-flight repair state                  | ~240       |
| `apps/web/src/onboarding/onboarding-checklist.tsx`      | Render required, optional, and runtime checklist cards                        | ~180       |
| `apps/web/src/onboarding/repair-preview-list.tsx`       | Render preview items for ready, already-present, and template-missing targets | ~170       |
| `apps/web/src/onboarding/repair-confirmation-panel.tsx` | Render explicit repair controls and pending-action messaging                  | ~170       |
| `apps/web/src/onboarding/readiness-handoff-card.tsx`    | Render post-repair readiness guidance and next-step messaging                 | ~130       |
| `apps/web/src/onboarding/onboarding-wizard-surface.tsx` | Compose the full onboarding wizard inside the shell surface                   | ~230       |
| `apps/api/src/server/onboarding-summary.ts`             | Build the bounded onboarding summary from startup plus repair preview data    | ~220       |
| `apps/api/src/server/routes/onboarding-route.ts`        | Expose the GET-only onboarding summary endpoint                               | ~100       |
| `apps/api/src/server/routes/onboarding-repair-route.ts` | Expose the POST repair endpoint for explicit template-backed repairs          | ~150       |
| `scripts/test-app-onboarding.mjs`                       | Run browser smoke checks for onboarding checklist, preview, and repair flows  | ~280       |

### Files to Modify

| File                                         | Changes                                                                          | Est. Lines |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| `apps/web/src/shell/operator-shell.tsx`      | Replace the Onboarding placeholder with the live onboarding wizard surface       | ~70        |
| `apps/web/src/boot/startup-status-panel.tsx` | Add onboarding handoff affordances and repair-refresh status copy                | ~90        |
| `apps/api/src/server/routes/index.ts`        | Register the onboarding summary and repair routes in deterministic order         | ~25        |
| `apps/api/src/server/http-server.test.ts`    | Add contract coverage for onboarding summary and repair routes                   | ~260       |
| `scripts/test-all.mjs`                       | Add Session 03 files and onboarding smoke coverage to the quick regression suite | ~90        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Users can open the Onboarding surface and see exactly which startup files
      are missing, optional, or runtime-blocking.
- [ ] Users can preview deterministic repair actions for canonical onboarding
      targets before any write occurs.
- [ ] Users can trigger explicit template-backed repairs for eligible targets
      and see the resulting success or failure state in the wizard.
- [ ] Post-repair refresh reflects the live repo state and makes any remaining
      blockers explicit.
- [ ] Startup and onboarding handoff messaging stays consistent between the
      Startup and Onboarding surfaces.

### Testing Requirements

- [ ] HTTP server tests cover GET onboarding summary and POST onboarding repair
      flows, including already-present, invalid-target, and template-missing
      scenarios.
- [ ] Browser smoke coverage verifies onboarding checklist rendering, repair
      preview selection, duplicate-submit prevention, and success or failure
      revalidation behavior.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `npm run app:api:test:runtime`, `node scripts/test-app-onboarding.mjs`,
      `npm run doctor`, and `node scripts/test-all.mjs --quick` pass after
      integration.

### Non-Functional Requirements

- [ ] GET onboarding summary requests do not mutate repo or app-owned state.
- [ ] Repair writes stay limited to canonical onboarding targets and never
      overwrite already-present files.
- [ ] Onboarding summary payloads remain bounded and deterministic.
- [ ] All new and modified files remain ASCII-only and use Unix LF line
      endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Startup and onboarding logic remain sourced from backend-owned contracts
- [ ] `npm run doctor` is rerun in the same change as onboarding path updates

---

## 8. Implementation Notes

### Key Considerations

- Startup diagnostics remain the canonical readiness source. The wizard should
  consume that contract, not replace it with browser-side file checks.
- Onboarding must stay read-first until the operator explicitly confirms a
  repair. Preview and checklist requests cannot create files.
- Repair target selection should stay bounded to the canonical onboarding
  surface keys already defined in the workspace contract.
- Post-repair readiness must be revalidated from the backend before the UI
  claims the workspace is ready.

### Potential Challenges

- Repair without the generic approval inbox: mitigate with an explicit
  confirmation control in the wizard and a route-owned direct execution path
  that still reuses the existing repair logic and workspace mutation adapter.
- Drift between startup missing summaries and repair preview items: mitigate by
  composing both from the same backend services and always refreshing after
  repair attempts.
- Legacy or already-present fallback files: mitigate with explicit
  already-present messaging and refusal to overwrite existing user data.

### Relevant Considerations

- [P00] **Repo-bound startup freshness**: keep missing-file messaging driven
  from the live workspace summary and revalidate after repairs.
- [P00] **Read-first boot surface**: onboarding loads in preview mode and
  mutates only after explicit operator confirmation.
- [P00] **Live contract payload size**: keep onboarding summaries limited to
  canonical targets and bounded preview items.
- [P02-apps/api] **Mutation guardrails**: repair routes must stay
  repo-relative, target-bounded, and never widen writable surfaces.
- [P02-apps/api] **Template-backed repair**: reuse checked-in repair
  definitions and template sources instead of ad hoc browser-side recipes.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Duplicate repair submits can create conflicting state or misleading success
  banners if the UI does not lock correctly.
- Stale readiness after a successful repair can leave Startup and Onboarding
  disagreeing about the workspace.
- Mixed ready, already-present, and template-missing targets can lead to
  incorrect guidance or accidental overwrite attempts.

---

## 9. Testing Strategy

### Unit Tests

- Validate onboarding payload parsing and error handling in the browser client
- Validate target-selection and in-flight repair state transitions in the hook

### Integration Tests

- Cover onboarding summary and repair routes through `apps/api` HTTP server
  tests with missing, mixed, and invalid repair-target inputs
- Cover the Startup -> Onboarding handoff and post-repair refresh behavior in
  browser smoke coverage

### Manual Testing

- Remove one or more canonical onboarding files, open the app, navigate from
  Startup to Onboarding, preview repairs, run an explicit repair, and confirm
  that readiness refresh reflects the updated repo state

### Edge Cases

- Mixed target sets where some files are ready to repair and others are already
  present
- Missing repair templates or invalid repair-target inputs
- API offline or startup-runtime degraded states after the wizard has already
  loaded once

---

## 10. Dependencies

### External Libraries

- React 19.x
- Zod 4.x
- Playwright 1.59.x

### Other Sessions

- **Depends on**: `phase00-session04-boot-path-and-validation`,
  `phase02-session02-workspace-and-startup-tool-suite`,
  `phase03-session01-operator-shell-and-navigation-foundation`
- **Depended by**: `phase03-session05-settings-and-maintenance-surface`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
