# Session Specification

**Session ID**: `phase03-session05-settings-and-maintenance-surface`
**Phase**: 03 - Chat, Onboarding, and Approvals UX
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 03 now has live Startup, Chat, Onboarding, and Approvals surfaces, but
the Settings tab is still a placeholder. The remaining gap is operational
confidence: the operator still lacks one stable browser surface for auth
readiness, maintenance guidance, repo and app paths, prompt or tool support,
and updater visibility. Closing that gap is what turns the shell from a demo
frame into the primary local entry point for everyday interactive use.

This session should keep the browser thin. `apps/web` gains a dedicated
`apps/web/src/settings/` module that renders runtime readiness, workspace
context, auth next steps, support coverage, and maintenance guidance inside
the existing shell. `apps/api` adds only a bounded read-only settings summary
route plus a helper that normalizes `node scripts/update-system.mjs check`
output. The browser must not execute repo scripts, mutate auth state, or
duplicate prompt and tool registry logic.

The result should be a real Settings surface instead of placeholder copy.
Operators can confirm startup and auth status, inspect repo and app-owned
paths, review prompt and tool support, see update-check results, and follow
maintenance commands from one page. That closes Phase 03 with all planned
shell surfaces live and leaves later phases to focus on workflow parity
instead of shell basics.

---

## 2. Objectives

1. Replace the Settings placeholder with a live diagnostics and maintenance
   surface inside the operator shell.
2. Add a bounded read-only backend summary for startup, auth, prompt support,
   tool support, workspace paths, and update-check status.
3. Keep maintenance actions explicit and safe by allowing browser refreshes
   while leaving update, rollback, backup, and auth commands as terminal
   guidance.
4. Add route, browser, and repo-level validation for ready, degraded,
   update-available, dismissed, and offline settings states.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session04-boot-path-and-validation` - provides the canonical
      startup payload and read-only boot contract.
- [x] `phase02-session01-tool-registry-and-execution-policy` - provides the
      deterministic backend tool catalog and scoped capability metadata.
- [x] `phase02-session02-workspace-and-startup-tool-suite` - provides startup
      inspection, prompt support, workspace summaries, and repair boundaries.
- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell frame, navigation surface, and Settings slot.
- [x] `phase03-session03-startup-checklist-and-onboarding-wizard` - provides
      startup and onboarding handoff behavior that Settings must reference.
- [x] `phase03-session04-approval-inbox-and-human-review-flow` - provides the
      completed shell review loop that Settings closes out for the phase.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic route design, validation,
  and file ownership rules
- `.spec_system/CONSIDERATIONS.md` for payload-size discipline, startup
  freshness, and tool-catalog drift guidance
- `.spec_system/PRD/PRD.md` and `.spec_system/PRD/PRD_UX.md` for settings,
  profile, auth, and maintenance expectations
- `scripts/update-system.mjs` and `scripts/doctor.mjs` for read-only updater
  visibility and maintenance guidance contracts
- `apps/api/src/index.ts`, `apps/api/src/server/startup-status.ts`, and
  `apps/api/src/tools/default-tool-suite.ts` for canonical startup, auth,
  prompt, and tool metadata
- `apps/web/src/boot/` and `apps/web/src/shell/` for the existing shell,
  startup diagnostics, and surface composition contract

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:web:check` and `npm run app:web:build` available from the repo
  root
- `npm run app:api:test:runtime` and `npm run app:api:test:tools` available
  for route and tool-catalog verification
- `node scripts/update-system.mjs check`, `npm run doctor`, and
  `node scripts/test-all.mjs --quick` available for maintenance and repo-level
  regression checks
- Existing Playwright dependency available for browser smoke coverage

---

## 4. Scope

### In Scope (MVP)

- The Settings surface becomes a dedicated operator shell page instead of a
  placeholder.
- The page shows startup readiness, auth status, operational-store health,
  repo and app-state paths, and current spec-session context.
- The backend exposes a bounded settings summary that includes prompt support,
  tool-catalog preview, maintenance commands, and updater-check visibility.
- The updater check remains read-only and surfaces structured states such as
  `up-to-date`, `update-available`, `dismissed`, and `offline`.
- Refresh actions revalidate settings data and can trigger shared shell or
  startup refresh callbacks so shell chrome stays aligned.
- Degraded, offline, dismissed, and update-available states render explicitly.

### Out of Scope (Deferred)

- Browser-triggered update apply, rollback, backup execution, doctor runs, or
  auth login or refresh commands - _Reason: Settings basics stay read-only in
  Phase 03 and leave high-impact maintenance actions in the terminal._
- Editing user-layer files or full profile management in the browser -
  _Reason: this session only needs diagnostics, guidance, and shortcuts._
- Artifact management, tracker cleanup, or workflow-specific maintenance tools
  - _Reason: those belong to later parity phases._
- Cloud-hosted or multi-user settings surfaces - _Reason: the PRD remains
  local-first and single-operator._

---

## 5. Technical Approach

### Architecture

Add a new `apps/web/src/settings/` module that owns settings-summary fetch,
refresh, stale-summary fallback, and card composition for runtime readiness,
workspace paths, auth guidance, prompt or tool support, and maintenance
commands. The surface stays inside the existing operator shell rather than
introducing a new router tree. It should accept shell-owned callbacks for
opening Startup or Onboarding and for refreshing shared shell summaries after
the Settings view refreshes.

On the backend, add a read-only `settings-summary.ts` helper that composes
startup diagnostics, prompt-contract metadata, tool-registry preview data,
package and path context, maintenance command definitions, and a normalized
update-check helper from `settings-update-check.ts`. The update-check helper
should execute `node scripts/update-system.mjs check` with a bounded timeout,
parse the JSON output, and map it to explicit route states without exposing raw
stdout. `routes/settings-route.ts` exposes a GET-only settings summary endpoint
with optional bounded preview-limit query parameters.

Do not add mutation routes for backup, update apply, rollback, doctor, or auth
repair. The Settings page should expose those as explicit terminal commands and
next-step guidance only. Payloads must stay narrow: counts plus bounded
previews for workflows and tools, no raw prompt contents, no unbounded catalog
lists, and no shell-script logs.

### Design Patterns

- Read-only summary route: keep the Settings surface inspectable and safe by
  routing all state through backend-owned summaries.
- Read-only updater adapter: normalize updater-check output behind a bounded
  helper with timeout and explicit offline or dismissed handling.
- Bounded preview payloads: return counts plus small ordered previews for tool
  and workflow support to keep Settings fast.
- Command guidance over mutation: show maintenance commands in the UI without
  letting the browser execute them.
- Cross-surface handoff: let Settings route the operator back to Startup or
  Onboarding when the summary shows missing prerequisites.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- Existing shell and startup modules in `apps/web/src/shell/` and
  `apps/web/src/boot/`
- TypeScript Node server routes in `apps/api`
- Existing startup-diagnostics service, prompt-contract summary, and tool
  registry in `apps/api`
- Node standard library child-process helpers for the read-only updater check
- Existing Playwright dependency for browser smoke coverage

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/web/src/settings/settings-types.ts` | Define settings payloads, update-check enums, and maintenance-command contracts | ~220 |
| `apps/web/src/settings/settings-client.ts` | Fetch settings summaries and normalize client-side refresh failures | ~200 |
| `apps/web/src/settings/use-settings-surface.ts` | Manage refresh, stale-summary fallback, and shell-resync callbacks | ~240 |
| `apps/web/src/settings/settings-runtime-card.tsx` | Render startup, store, and phase-close readiness state | ~170 |
| `apps/web/src/settings/settings-workspace-card.tsx` | Render repo, app-state, and current-session path context | ~180 |
| `apps/web/src/settings/settings-auth-card.tsx` | Render auth readiness, runtime config, and next-step guidance | ~190 |
| `apps/web/src/settings/settings-support-card.tsx` | Render prompt workflow support and tool-catalog preview | ~200 |
| `apps/web/src/settings/settings-maintenance-card.tsx` | Render update-check visibility and terminal maintenance commands | ~220 |
| `apps/web/src/settings/settings-surface.tsx` | Compose the full Settings and maintenance surface inside the shell | ~250 |
| `apps/api/src/server/settings-update-check.ts` | Execute the read-only updater check and normalize route-safe states | ~170 |
| `apps/api/src/server/settings-summary.ts` | Build the bounded settings summary from startup, prompt, tool, and updater data | ~260 |
| `apps/api/src/server/routes/settings-route.ts` | Expose the GET-only settings summary endpoint | ~120 |
| `scripts/test-app-settings.mjs` | Run browser smoke checks for the settings surface and update-check states | ~320 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/web/src/shell/operator-shell.tsx` | Replace the Settings placeholder with the live settings surface and handoff callbacks | ~70 |
| `apps/api/src/server/routes/index.ts` | Register the settings route in deterministic order | ~20 |
| `apps/api/src/server/http-server.test.ts` | Add contract coverage for settings summary and updater-check states | ~260 |
| `scripts/test-app-shell.mjs` | Extend shell smoke coverage to enter and refresh the Settings surface | ~120 |
| `scripts/test-all.mjs` | Add Session 05 files and settings smoke coverage to the quick regression suite | ~110 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Users can open the Settings surface and inspect startup, auth, and
      maintenance state without leaving the app shell.
- [ ] Settings shows structured updater-check states and never mutates update
      or auth state from a browser refresh.
- [ ] Settings surfaces prompt workflow coverage, tool-catalog preview, and
      repo or app-state paths without requiring raw file or database
      inspection.
- [ ] Refreshing Settings revalidates the live backend summary and can keep
      shared shell diagnostics aligned through callbacks.
- [ ] Degraded, offline, dismissed, and update-available states are explicit
      and actionable.

### Testing Requirements

- [ ] HTTP server tests cover settings summary reads, preview-limit validation,
      and updater states including `up-to-date`, `update-available`,
      `dismissed`, and `offline`.
- [ ] Browser smoke coverage verifies settings rendering, auth guidance,
      updater visibility, maintenance command cards, and refresh behavior.
- [ ] `npm run app:web:check`, `npm run app:web:build`,
      `npm run app:api:test:runtime`, `npm run app:api:test:tools`,
      `node scripts/test-app-settings.mjs`, `node scripts/test-app-shell.mjs`,
      `npm run doctor`, and `node scripts/test-all.mjs --quick` pass after
      integration.

### Non-Functional Requirements

- [ ] GET settings summary requests do not mutate repo or app-owned state.
- [ ] Update-check handling remains bounded, read-only, and explicit about
      offline or dismissed outcomes.
- [ ] Tool and workflow preview payloads remain bounded and deterministic.
- [ ] All new and modified files remain ASCII-only and use Unix LF line
      endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Settings data remains sourced from backend-owned summaries and checked-in
      registries
- [ ] Browser code does not execute repo scripts or mutate auth or workspace
      state

---

## 8. Implementation Notes

### Key Considerations

- Startup diagnostics already expose auth readiness, config, and workspace
  ownership. Settings should reuse that summary rather than inventing a second
  browser-side readiness model.
- Tool support must come from the backend registry so the UI never drifts from
  the actual allowed capability surface.
- The updater check is time-sensitive and potentially offline, so the helper
  must use bounded execution and surface structured fallback states.
- Settings refresh should be able to revalidate shared shell summaries so the
  page and shell chrome do not disagree after maintenance-related refreshes.

### Potential Challenges

- Update checks can block or go offline: mitigate with a dedicated helper,
  timeout, and explicit offline state.
- Tool or workflow previews can grow too large: mitigate with capped preview
  limits and counts plus previews rather than full lists.
- Startup, shell, and settings summaries can drift after refresh: mitigate
  with shared callbacks and revalidation after successful settings refreshes.

### Relevant Considerations

- [P00] **Repo-bound startup freshness**: keep settings readiness and path
  guidance driven from the live workspace and startup summary.
- [P00] **Read-first boot surface**: Settings must stay read-only for Phase 03
  and avoid hidden writes or browser-run maintenance commands.
- [P00] **Live contract payload size**: keep settings payloads narrow with
  counts and bounded previews.
- [P02-apps/api] **Tool catalog drift**: derive tool support from the backend
  registry instead of a copied browser list.
- [P00] **Canonical live surface**: continue treating checked-in scripts,
  prompts, and workspace boundaries as the source of truth.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:
- Showing stale update, auth, or readiness state after the operator refreshes
  the Settings page
- Letting the browser imply that update, rollback, backup, or auth repair can
  run directly from the UI when they still require terminal commands
- Returning oversized tool or workflow payloads that slow the shell and drift
  from the bounded-summary design

---

## 9. Testing Strategy

### Unit Tests

- Validate settings payload parsing and update-check enum handling in the web
  client
- Validate settings hook refresh and stale-summary fallback behavior

### Integration Tests

- Verify the settings route returns bounded summaries with deterministic tool
  and workflow previews
- Verify updater-check normalization maps `up-to-date`, `update-available`,
  `dismissed`, and `offline` states into stable route payloads
- Verify the route rejects invalid preview-limit query inputs with explicit
  validation errors

### Manual Testing

- Open the Settings surface from the shell, confirm auth state, workspace
  paths, prompt and tool support, and updater visibility, then refresh and
  verify the page revalidates cleanly
- Trigger a degraded startup state and confirm Settings points the operator
  back to Startup or Onboarding instead of claiming the workspace is stable

### Edge Cases

- Updater check returns `dismissed` or `offline`
- Auth readiness is `expired-auth` or `invalid-auth`
- Preview-limit query inputs are invalid or exceed the bounded maximum
- The API goes offline after a previously successful Settings refresh

---

## 10. Dependencies

### External Libraries

- React 19.x
- Zod 4.x
- Playwright 1.59.x
- Node.js standard library child-process helpers

### Other Sessions

- **Depends on**: `phase00-session04-boot-path-and-validation`,
  `phase02-session01-tool-registry-and-execution-policy`,
  `phase02-session02-workspace-and-startup-tool-suite`,
  `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase03-session03-startup-checklist-and-onboarding-wizard`,
  `phase03-session04-approval-inbox-and-human-review-flow`
- **Depended by**: none within Phase 03; completion enables `audit` after
  `updateprd` closes the phase

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
