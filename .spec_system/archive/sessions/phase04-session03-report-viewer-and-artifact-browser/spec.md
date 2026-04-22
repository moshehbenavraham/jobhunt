# Session Specification

**Session ID**: `phase04-session03-report-viewer-and-artifact-browser`
**Phase**: 04 - Evaluation, Artifacts, and Tracker Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 04 Session 02 made the evaluation handoff visible inside the chat shell,
but report review still stops at a deferred button state. Operators can see
that a report or PDF exists, yet they still cannot open a checked-in report,
inspect its header, or browse recent artifacts from inside the app. That keeps
the run-to-artifact loop incomplete and blocks later pipeline and tracker
review sessions from building on a real artifact-reading surface.

This session stays web-led in `apps/web`, but it needs a small read-only API
addition in `apps/api` to stay within the repo's thin-browser rules. The
backend should expose one bounded report-viewer summary that validates a
selected report path, returns parsed report metadata plus markdown content for
allowed `reports/` entries, and lists recent report and PDF artifacts with
deterministic ordering. The browser should consume that one contract instead of
reading repo files directly or guessing artifact state from paths alone.

The result gives Phase 04 a dedicated artifact review surface inside the shell.
Session 04 can hand pipeline rows into the same report-reading context, Session
05 can reuse the artifact browser while keeping tracker writes on canonical
mutation paths, and Session 06 can close end-to-end parity without report
review still living outside the app.

---

## 2. Objectives

1. Add a typed, read-only report-viewer contract that exposes selected report
   metadata, markdown content, and recent artifact browser data through one
   bounded API route.
2. Add a dedicated artifact-review shell surface that lets operators open a
   selected report and browse recent report and PDF artifacts without leaving
   the app.
3. Wire Session 02 report handoff actions into the new surface through a
   deterministic URL-backed focus contract and explicit missing, offline, and
   stale-artifact states.
4. Add API and browser coverage for selected-report reads, latest-report
   fallback, invalid-path handling, and missing-artifact behavior.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session03-evaluation-pdf-and-tracker-tools` - provides the
      canonical report and PDF artifact paths that the viewer must read without
      widening the workspace boundary.
- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell surface registry and navigation frame this session extends.
- [x] `phase03-session02-chat-console-and-session-resume` - provides the chat
      surface and selected-session patterns the report handoff will reuse.
- [x] `phase04-session01-evaluation-result-contract` - provides the typed
      evaluation artifact packet that announces when a report is ready.
- [x] `phase04-session02-evaluation-console-and-artifact-handoff` - provides
      the evaluation artifact rail whose deferred report action this session
      turns into a real in-app handoff.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for bounded payloads, deterministic routing,
  and no-new-dependency expectations
- `.spec_system/CONSIDERATIONS.md` for thin-browser rules, parser drift, and
  shell refresh reuse
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_04/PRD_phase_04.md` for the run-to-artifact and
  report-review requirements
- `apps/api/src/tools/evaluation-artifact-tools.ts` and
  `apps/api/src/config/repo-paths.ts` for canonical artifact listing and
  repo-relative path validation
- `apps/web/src/chat/evaluation-artifact-rail.tsx` and
  `apps/web/src/approvals/approval-inbox-client.ts` for handoff and URL-focus
  patterns already used in the shell
- `apps/web/src/shell/` for surface registration, navigation, and shell-owned
  frame composition

### Environment Requirements

- Workspace dependencies installed from the repo root
- `npm run app:api:check`, `npm run app:api:build`,
  `npm run app:api:test:runtime`, `npm run app:web:check`, and
  `npm run app:web:build` available from the repo root
- Existing runtime HTTP harness and browser smoke harness available under
  `apps/api/src/server/http-server.test.ts` and `scripts/`
- `node scripts/test-all.mjs --quick` available for repo-level regressions

---

## 4. Scope

### In Scope (MVP)

- Add one read-only API route for selected report review and recent artifact
  browsing.
- Validate selected report paths against the canonical repo boundary and keep
  invalid or missing artifact states explicit.
- Surface report header metadata, report markdown content, and recent report or
  PDF artifacts through a bounded list-plus-detail contract.
- Add a dedicated shell surface for artifact review and wire report-ready
  handoff from the evaluation console into that surface.
- Keep recent artifact browsing deterministic with bounded pagination and
  explicit empty states.
- Add API and browser coverage for report-ready, missing, stale, invalid, and
  offline states.

### Out of Scope (Deferred)

- Pipeline queue review or pipeline-originated selection - _Reason: Session 04
  owns the pipeline workspace._
- Tracker status editing, merge, or verification actions - _Reason: Session 05
  owns tracker review and mutation flows._
- Browser-owned PDF rendering or filesystem browsing outside canonical report
  and output artifacts - _Reason: this session adds read-only review, not a
  general workspace explorer._
- Report editing, regeneration, or write paths - _Reason: artifact creation
  remains owned by the existing backend tools and workflows._

---

## 5. Technical Approach

### Architecture

Add a new read-only report-viewer server module in `apps/api/src/server/` that
builds one bounded summary from canonical artifact paths. The route should
accept an optional selected report path plus bounded artifact-browser query
inputs, validate them against the repo-owned `reports/` and `output/`
surfaces, read the selected report markdown only when the path is allowed, and
return a compact response with header metadata, report body, missing-state
details, and recent artifact items in deterministic order.

On the browser side, add a new `apps/web/src/reports/` surface package with
strict payload parsing, a client-side focus helper, and a list-plus-detail
state hook. The shell should gain a new artifact-review surface that reuses the
existing frame, while the report viewer hook owns selected report resolution,
latest-report fallback, refresh, and cleanup behavior. The browser should stay
thin: no direct filesystem access, no hidden path derivation, and no
report-content assumptions beyond what the API returns.

Handoff behavior should mirror the existing approval focus pattern. When the
evaluation artifact rail has a ready report, it should push the operator into
the artifact-review surface with a selected report path in URL-backed focus
state. Refresh, deep-link, and re-entry behavior should remain deterministic,
and missing or deleted reports should render an explicit stale-artifact state
instead of silently falling back to an unrelated file.

### Design Patterns

- Read-only allowlisted route: validate repo-relative report paths at the
  server boundary closest to the file read.
- List-plus-detail contract: keep recent artifact browsing bounded and pair it
  with one selected report summary instead of returning unbounded file sets.
- Strict parser boundary: fail closed on payload drift before the viewer tries
  to render partial artifact state.
- URL-backed focus handoff: persist the selected report and surface state
  across refresh and navigation without inventing browser-only hidden state.
- Thin browser surface: keep report metadata extraction and artifact ownership
  in the API, not in React components.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- TypeScript Node server modules in `apps/api`
- Existing `zod` route-validation patterns
- Existing repo-path validation helpers in `apps/api/src/config/repo-paths.ts`
- Existing artifact-listing semantics from `apps/api/src/tools/evaluation-artifact-tools.ts`
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                | Purpose                                                                                           | Est. Lines |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/report-viewer-contract.ts`     | Define the typed report-viewer payload, selected-report metadata, and recent-artifact item shapes | ~220       |
| `apps/api/src/server/report-viewer-summary.ts`      | Build the bounded report-viewer summary from allowed report reads and artifact listing helpers    | ~320       |
| `apps/api/src/server/routes/report-viewer-route.ts` | Expose the GET-only report-viewer endpoint with query validation                                  | ~120       |
| `apps/web/src/reports/report-viewer-types.ts`       | Define strict parser helpers and typed report-viewer payloads for the browser                     | ~220       |
| `apps/web/src/reports/report-viewer-client.ts`      | Fetch report-viewer summaries and manage URL-backed report focus                                  | ~180       |
| `apps/web/src/reports/use-report-viewer.ts`         | Coordinate selected-report state, refresh, fallback, and request cleanup                          | ~220       |
| `apps/web/src/reports/report-viewer-surface.tsx`    | Render recent artifact browsing, selected report metadata, and markdown review states             | ~340       |
| `scripts/test-app-report-viewer.mjs`                | Browser smoke coverage for artifact browsing and report handoff behavior                          | ~220       |

### Files to Modify

| File                                             | Changes                                                                                                         | Est. Lines |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/routes/index.ts`            | Register the report-viewer route in deterministic order                                                         | ~20        |
| `apps/api/src/server/http-server.test.ts`        | Add runtime-contract coverage for selected report, invalid path, missing artifact, and bounded listing behavior | ~260       |
| `apps/web/src/shell/shell-types.ts`              | Register the artifact-review surface and keep shell surface parsing deterministic                               | ~60        |
| `apps/web/src/shell/navigation-rail.tsx`         | Add navigation affordance and badge copy for the artifact-review surface                                        | ~70        |
| `apps/web/src/shell/operator-shell.tsx`          | Render the new report-viewer surface inside the existing shell frame                                            | ~120       |
| `apps/web/src/chat/evaluation-artifact-rail.tsx` | Turn report-ready handoff from deferred copy into a real artifact-surface launch path                           | ~90        |
| `scripts/test-all.mjs`                           | Add the new report-viewer smoke script and ASCII coverage to the quick regression gate                          | ~40        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operators can open a selected checked-in report from inside the shell and
      review its metadata plus markdown content.
- [ ] Recent report and PDF artifacts are discoverable through a bounded
      in-app browser with deterministic ordering.
- [ ] Report-ready handoff from the evaluation console opens the artifact-review
      surface with the correct selected report in focus.
- [ ] Missing, deleted, invalid, and unsupported report selections remain
      explicit and never silently fall back to another artifact.
- [ ] The browser never reads repo files directly or exposes raw filesystem
      internals beyond validated repo-relative artifact paths.

### Testing Requirements

- [ ] HTTP runtime-contract tests cover selected-report reads, latest-report
      fallback, invalid path rejection, missing report states, and bounded
      recent-artifact listing.
- [ ] Browser smoke coverage covers report-ready handoff, recent-artifact
      browsing, stale selected-report states, and offline refresh behavior.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, `npm run app:web:check`,
      `npm run app:web:build`, `node scripts/test-app-report-viewer.mjs`, and
      `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] All route inputs are schema-validated and bounded.
- [ ] Report reads remain allowlisted to canonical artifact paths and do not
      widen the workspace boundary.
- [ ] Recent artifact payloads stay bounded and deterministic.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Browser parser types stay aligned with the route contract
- [ ] Missing-artifact and stale-focus states are explicit in both API and UI

---

## 8. Implementation Notes

### Key Considerations

- This session adds review-only surfaces. It must not introduce report writes,
  PDF generation, or tracker mutation paths.
- Selected report focus should be deterministic across refresh and shell
  navigation, not trapped in ephemeral component state.
- Report metadata should come from bounded server-side parsing so the browser
  does not need to infer headers from markdown text heuristics.

### Potential Challenges

- Report path traversal or invalid artifact selection: mitigate with strict
  repo-relative path validation at the route boundary.
- Stale focus after report deletion or artifact cleanup: mitigate with an
  explicit missing-artifact state instead of falling back silently.
- Payload drift between API and browser: mitigate with strict parser helpers,
  stable enums, and fixture-backed smoke coverage.

### Relevant Considerations

- [P00] **Canonical live surface**: Report and PDF artifacts remain repo-owned
  files, so the viewer must read through validated canonical paths.
- [P03-apps/web] **Frontend parser and fixture drift**: Keep browser parsers,
  fake API coverage, and backend summaries aligned as the new surface lands.
- [P03-apps/web] **Thin browser surfaces**: Keep artifact ownership, metadata
  extraction, and missing-state decisions backend-owned.
- [P03-apps/web] **Bounded polling payloads**: Keep recent artifact lists
  narrow and deterministic so the surface stays fast and predictable.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- A ready report handoff opens the wrong artifact after refresh or hash
  navigation.
- The route accepts an out-of-scope repo path or hides an invalid selection
  behind a generic success payload.
- Deleted or stale report paths leave the viewer showing a previous document
  instead of an explicit missing-artifact state.

---

## 9. Testing Strategy

### Unit Tests

- Exercise selected-report metadata normalization and missing-state mapping.
- Exercise browser parser coverage for selected report, recent artifacts, and
  explicit missing or invalid states.

### Integration Tests

- Verify the report-viewer route returns the selected report when the path is
  allowed and present.
- Verify the route rejects invalid paths and returns explicit missing states for
  deleted or absent reports.
- Verify recent report and PDF listing stays bounded, filtered, and
  deterministically ordered.
- Verify report-ready chat handoff opens the artifact-review surface with the
  correct selected report in focus.

### Manual Testing

- Start the local API and web app, open a completed evaluation from the chat
  console, follow the report handoff into the artifact surface, and confirm the
  selected report remains in focus after refresh.
- Browse recent report and PDF artifacts, then verify empty, stale, and offline
  states remain explicit.

### Edge Cases

- Selected report path is missing after a previous successful handoff
- Recent artifacts directory is empty
- Selected artifact is a PDF while the viewer needs a report document
- Report exists but expected header metadata is incomplete
- Caller requests an out-of-scope repo-relative path

---

## 10. Dependencies

### External Libraries

- `zod` - existing route query validation and contract parsing
- Node standard library `fs` and `path` - bounded report reads and artifact
  metadata checks
- React 19 - shell surface composition and list-plus-detail rendering

### Internal Dependencies

- `apps/api/src/config/repo-paths.ts`
- `apps/api/src/tools/evaluation-artifact-tools.ts`
- `apps/web/src/chat/evaluation-artifact-rail.tsx`
- `apps/web/src/shell/shell-types.ts`
- `apps/web/src/approvals/approval-inbox-client.ts`

### Other Sessions

- **Depends on**: `phase02-session03-evaluation-pdf-and-tracker-tools`,
  `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase03-session02-chat-console-and-session-resume`,
  `phase04-session01-evaluation-result-contract`,
  `phase04-session02-evaluation-console-and-artifact-handoff`
- **Depended by**: `phase04-session04-pipeline-review-workspace`,
  `phase04-session05-tracker-workspace-and-integrity-actions`,
  `phase04-session06-auto-pipeline-parity-and-regression`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
