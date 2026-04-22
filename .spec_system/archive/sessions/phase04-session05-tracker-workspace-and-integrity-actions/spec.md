# Session Specification

**Session ID**: `phase04-session05-tracker-workspace-and-integrity-actions`
**Phase**: 04 - Evaluation, Artifacts, and Tracker Parity
**Status**: Not Started
**Created**: 2026-04-22
**Package**: apps/web
**Package Stack**: TypeScript React

---

## 1. Session Overview

Phase 04 Session 04 moved queue review into the app, but tracker maintenance
still lives outside the shell. Operators can inspect processed pipeline rows,
yet they still need to open `data/applications.md`, guess which statuses are
canonical, and run merge or verify scripts manually whenever tracker closeout
needs attention. That leaves the main evaluation-to-tracker loop incomplete
and keeps Session 06 blocked on a real tracker review surface.

This session adds a bounded tracker workspace without weakening the repo's
integrity rules. The backend should parse `data/applications.md`, expose
bounded tracker row previews plus one selected-detail payload, surface pending
TSV additions, and return the canonical status list from `templates/states.yml`.
Tracker mutations should stay backend-owned: status updates rewrite only the
existing tracker row, while merge, verify, normalize, and dedup actions keep
reusing the allowlisted scripts and warning semantics that already protect the
repo.

The browser should consume that contract through a dedicated tracker surface in
the shell. Operators need list, filter, sort, and selected-detail behavior;
explicit action feedback for status or maintenance commands; and a direct
report handoff when a tracker row links to an artifact. Once this session is
done, Phase 04 can finish with Session 06 focused on end-to-end auto-pipeline
parity instead of still lacking tracker review and integrity controls.

---

## 2. Objectives

1. Add a typed tracker-workspace contract that exposes bounded tracker list and
   detail data, pending TSV summary, canonical status options, and integrity
   action feedback through backend-owned routes.
2. Add canonical status update support that edits existing tracker rows without
   bypassing the markdown table contract or widening write access beyond the
   tracker surface.
3. Add a dedicated tracker shell surface with filter, sort, row selection,
   report link-out, and explicit loading, empty, error, offline, and
   in-flight-action states.
4. Add API, tool, and browser coverage for invalid status input, stale
   selection, pending TSV warnings, maintenance action results, and duplicate
   submit guards.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session03-evaluation-pdf-and-tracker-tools` - provides the
      canonical tracker TSV, report, PDF, and verification semantics this
      session must preserve.
- [x] `phase03-session01-operator-shell-and-navigation-foundation` - provides
      the shell frame and navigation registry that the tracker workspace
      extends.
- [x] `phase04-session01-evaluation-result-contract` - provides typed report,
      PDF, and warning signals that tracker detail can reuse.
- [x] `phase04-session03-report-viewer-and-artifact-browser` - provides the
      report-viewer handoff target and artifact review patterns the tracker
      surface should reuse.
- [x] `phase04-session04-pipeline-review-workspace` - provides bounded review
      surface patterns and the queue context that now needs tracker closeout.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic routing, bounded payloads,
  and no-new-dependency expectations
- `.spec_system/CONSIDERATIONS.md` for thin-browser rules, parser drift risk,
  and interaction race-guard expectations
- `.spec_system/SECURITY-COMPLIANCE.md` for the current clean posture and the
  need to keep tracker writes bounded to canonical repo targets
- `.spec_system/PRD/PRD.md`, `.spec_system/PRD/PRD_UX.md`, and
  `.spec_system/PRD/phase_04/PRD_phase_04.md` for tracker parity, review, and
  closeout requirements
- `apps/api/src/tools/tracker-integrity-tools.ts` plus `templates/states.yml`
  and the allowlisted maintenance scripts under `scripts/` for canonical
  status, merge, verify, normalize, and dedup behavior
- `apps/api/src/workspace/workspace-contract.ts` for tracker and
  tracker-additions surface ownership
- `dashboard/internal/data/career.go` for existing tracker parsing and
  line-oriented status update semantics that should be ported, not reinvented
- `apps/web/src/pipeline/`, `apps/web/src/reports/`, and `apps/web/src/shell/`
  for bounded review-surface, link-out, and shell-owned composition patterns

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

- Add one read-only API route for bounded tracker review from
  `data/applications.md`, including row previews, selected detail, canonical
  status options, and pending TSV summary.
- Add one backend-owned action route for status updates plus merge, verify,
  normalize, and dedup commands with explicit warning and conflict handling.
- Preserve tracker-table formatting, report or PDF links, and canonical status
  validation during status changes.
- Add a dedicated shell surface for tracker review with filter, sort, row
  selection, action notices, and report-viewer link-out behavior.
- Surface pending tracker additions and integrity warnings clearly without
  inventing browser-only filesystem rules.
- Add API, tool, and browser coverage for missing tracker data, invalid input,
  stale selection, pending TSVs, and action outcomes.

### Out of Scope (Deferred)

- Creating new tracker rows directly in `data/applications.md` - _Reason: new
  entries remain staged through TSV additions only._
- Chat-driven tracker specialist routing, offer comparison, follow-up cadence,
  or rejection-pattern workflows - _Reason: this session focuses on the shell
  workspace and canonical tracker maintenance path._
- Scan, batch, or pipeline execution controls - _Reason: those workflows are
  owned by Session 04 or deferred to Phase 05._
- Freeform note editing, report editing, or PDF regeneration - _Reason: this
  session only reviews artifacts and updates canonical tracker state._

---

## 5. Technical Approach

### Architecture

Add a tracker workspace server module in `apps/api/src/server/` that reads the
canonical applications tracker and pending TSV directory through the existing
workspace contract. A new tracker-table helper should parse the markdown table,
preserve source lines, and expose a line-oriented status-update primitive so
the backend can rewrite only the status cell for an existing row. The summary
builder should return a bounded list-plus-detail payload with entry numbers,
date, company, role, score, canonical status, report or PDF availability,
pending-TSV counts, and explicit warning signals for stale selection or missing
artifacts.

Tracker mutations should stay backend-owned and deterministic. The status
change path should extend the existing tracker integrity tool set with an
`update-tracker-status` mutation that validates the new status against
`templates/states.yml`, targets exactly one tracker row, and preserves the rest
of the markdown document byte-for-byte where possible. A new action route
should wrap that mutation plus the existing merge, verify, normalize, and dedup
tools through route-owned execution context, translating warnings and conflicts
into explicit response payloads instead of raw stdout.

The browser should gain a new `apps/web/src/tracker/` package with strict
payload parsing, URL-backed focus helpers, and a hook that coordinates refresh,
selection, and mutation notice state. The tracker surface should reuse the
shell frame, render bounded list and detail panels, expose canonical status
controls and maintenance actions with duplicate-submit prevention, and hand off
linked reports to the existing report-viewer surface instead of adding another
artifact renderer.

### Design Patterns

- Markdown-table parser and line-preserving updater: keep tracker status edits
  deterministic and limited to the canonical markdown table.
- List-plus-detail contract: keep tracker payloads bounded while pairing them
  with one selected-detail summary and pending-TSV overview.
- Route-owned tool execution: reuse allowlisted integrity tools behind typed
  routes instead of exposing scripts or stdout parsing to the browser.
- URL-backed focus handoff: persist selected tracker row, filter, and sort
  state across refresh and navigation without hidden browser-only state.
- Thin browser surface: keep parsing, canonical status validation, and tracker
  mutation rules in the API layer.

### Technology Stack

- React 19 with TypeScript in `apps/web`
- TypeScript Node server modules in `apps/api`
- Existing `zod` route-validation patterns
- Existing workspace mutation adapter and repo-path helpers in `apps/api`
- Existing tracker integrity tools and allowlisted maintenance scripts
- No new dependencies

---

## 6. Deliverables

### Files to Create

| File                                                           | Purpose                                                                                                  | Est. Lines |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/tracker-workspace-contract.ts`            | Define tracker-workspace payloads, filters, canonical-status options, warnings, and action-result shapes | ~260       |
| `apps/api/src/server/tracker-table.ts`                         | Parse the tracker markdown table and provide line-preserving status-update helpers                       | ~320       |
| `apps/api/src/server/tracker-workspace-summary.ts`             | Build the bounded tracker list and detail summary with pending TSV context and artifact enrichment       | ~420       |
| `apps/api/src/server/routes/tracker-workspace-route.ts`        | Expose the GET-only tracker-workspace endpoint with query validation                                     | ~120       |
| `apps/api/src/server/routes/tracker-workspace-action-route.ts` | Expose the POST tracker action endpoint for status and integrity commands                                | ~180       |
| `apps/web/src/tracker/tracker-workspace-types.ts`              | Define strict parser helpers and typed tracker-workspace payloads for the browser                        | ~260       |
| `apps/web/src/tracker/tracker-workspace-client.ts`             | Fetch tracker summaries, dispatch actions, and manage URL-backed tracker focus                           | ~220       |
| `apps/web/src/tracker/use-tracker-workspace.ts`                | Coordinate tracker refresh, selection, action notices, and focus cleanup                                 | ~260       |
| `apps/web/src/tracker/tracker-workspace-surface.tsx`           | Render tracker list, selected detail, canonical status controls, and integrity action states             | ~420       |
| `scripts/test-app-tracker-workspace.mjs`                       | Browser smoke coverage for tracker navigation, status updates, and integrity actions                     | ~260       |

### Files to Modify

| File                                                 | Changes                                                                                                     | Est. Lines |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/api/src/server/routes/index.ts`                | Register the tracker-workspace routes in deterministic order                                                | ~30        |
| `apps/api/src/server/http-server.test.ts`            | Add runtime-contract coverage for tracker summary, invalid actions, status validation, and warning outcomes | ~320       |
| `apps/api/src/tools/tracker-integrity-tools.ts`      | Add canonical tracker status mutation support and shared warning mapping for route-owned actions            | ~220       |
| `apps/api/src/tools/tracker-integrity-tools.test.ts` | Cover status updates, conflict handling, and warning pass-through                                           | ~220       |
| `apps/web/src/shell/shell-types.ts`                  | Register the tracker surface and keep shell parsing deterministic                                           | ~80        |
| `apps/web/src/shell/navigation-rail.tsx`             | Add tracker navigation copy and badge handling                                                              | ~90        |
| `apps/web/src/shell/surface-placeholder.tsx`         | Keep shell placeholder handling exhaustive after the tracker surface is added                               | ~50        |
| `apps/web/src/shell/operator-shell.tsx`              | Render the tracker workspace and reuse shared report-viewer handoff behavior                                | ~160       |
| `scripts/test-app-shell.mjs`                         | Add shell smoke coverage for tracker navigation and report handoff                                          | ~120       |
| `scripts/test-all.mjs`                               | Add tracker-workspace smoke coverage and ASCII file checks to the quick regression suite                    | ~50        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Operators can review tracker rows, pending TSV additions, and selected
      detail inside the shell without opening `data/applications.md` directly.
- [ ] Operators can update tracker status only to canonical labels and the
      backend preserves the markdown tracker contract during the write.
- [ ] Merge, verify, normalize, and dedup outcomes are visible in the tracker
      workspace with explicit warnings and refresh-ready action feedback.
- [ ] Selected tracker rows can hand off to the existing report-viewer surface
      when a checked-in report artifact is available.

### Testing Requirements

- [ ] Tracker integrity tool tests cover canonical status updates, conflict
      handling, and warning pass-through.
- [ ] HTTP runtime-contract tests cover missing tracker data, parsed rows,
      invalid query and action rejection, canonical status enforcement, and
      maintenance warning outcomes.
- [ ] Browser smoke coverage covers tracker navigation, selection, status
      update, maintenance actions, and report link-out behavior.
- [ ] `npm run app:api:check`, `npm run app:api:build`,
      `npm run app:api:test:runtime`, `npm run app:web:check`,
      `npm run app:web:build`, `node scripts/test-app-tracker-workspace.mjs`,
      and `node scripts/test-all.mjs --quick` pass after integration.

### Non-Functional Requirements

- [ ] Browser code never parses tracker markdown or writes repo files directly.
- [ ] Status updates and maintenance actions enforce duplicate-submit and
      conflict handling before mutating tracker state.
- [ ] Tracker payloads remain bounded by filter, sort, selection, and page
      limits instead of returning the full markdown document.
- [ ] All new files remain ASCII-only and use Unix LF line endings.

### Quality Gates

- [ ] All touched files follow `.spec_system/CONVENTIONS.md`
- [ ] Tracker writes stay constrained to canonical tracker or tracker-additions
      surfaces
- [ ] Warning and failure paths remain explicit and test-covered

---

## 8. Implementation Notes

### Key Considerations

- Reuse the existing tracker integrity tool surface before adding any new
  mutation path or script wrapper.
- Treat the markdown tracker table as the canonical storage contract and keep
  status updates line-preserving wherever possible.
- Keep tracker payloads bounded and selected-detail oriented so the browser
  does not poll or render the entire tracker file on every refresh.

### Potential Challenges

- Preserving tracker table formatting during status edits: mitigate with a
  parser that stores source lines and rewrites only the status column for one
  matched entry.
- Stale selection after merge, dedup, or normalize: mitigate with explicit
  stale-selection responses plus client revalidation after every mutation.
- Warning-only script failures being hidden from the UI: mitigate with
  structured warning mapping and visible action notices for merge, verify,
  normalize, and dedup responses.

### Relevant Considerations

- [P02-apps/api] **Tool catalog drift**: Keep tracker status update and
  integrity routes aligned with the existing tracker tool suite instead of
  creating a second mutation registry.
- [P03-apps/web] **Frontend parser and fixture drift**: Update strict
  tracker-workspace parsers and smoke payloads together when API shapes change.
- [P03-apps/web+apps/api] **Interaction race guards**: Apply synchronous
  duplicate-submit guards in the browser and backend idempotence or conflict
  handling for tracker actions.
- [P03-apps/web+apps/api] **Single mutation paths**: Route tracker writes
  through canonical backend services and tools instead of adding UI-only edit
  logic.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:

- Rapid double-submit on status or maintenance actions causing conflicting
  tracker writes
- Stale row focus after merge, normalize, or dedup leaving the operator on a
  no-longer-valid selection
- Divergence between tracker summary payloads, strict browser parsers, and
  report-viewer handoff metadata

---

## 9. Testing Strategy

### Unit Tests

- Cover tracker table parsing, canonical status lookup, and line-preserving
  status update behavior.
- Cover tracker integrity tool status update conflicts and warning pass-through
  for merge, verify, normalize, and dedup flows.

### Integration Tests

- Cover tracker-workspace GET and POST routes with missing tracker files,
  invalid filters, invalid status updates, successful status writes, and
  warning-producing maintenance commands.
- Cover report-link enrichment and stale-selection behavior against realistic
  tracker rows and pending TSV additions.

### Manual Testing

- Open the tracker workspace in the shell, filter and sort rows, select a row,
  change status, and confirm the refreshed detail stays in sync.
- Trigger merge, verify, normalize, and dedup actions from the workspace and
  confirm warning notices plus report link-out behavior remain explicit.

### Edge Cases

- Missing `data/applications.md` with pending TSV additions still present
- Non-canonical status input rejected before any write occurs
- Duplicate action clicks while a tracker mutation is already in flight
- Selected row removed or renumbered after dedup or normalize

---

## 10. Dependencies

### External Libraries

- `react`: existing shell surface runtime in `apps/web`
- `zod`: existing route input validation in `apps/api`
- Existing workspace mutation adapter and tool execution contracts in
  `apps/api`

### Other Sessions

- **Depends on**: `phase02-session03-evaluation-pdf-and-tracker-tools`,
  `phase03-session01-operator-shell-and-navigation-foundation`,
  `phase04-session01-evaluation-result-contract`,
  `phase04-session03-report-viewer-and-artifact-browser`,
  `phase04-session04-pipeline-review-workspace`
- **Depended by**: `phase04-session06-auto-pipeline-parity-and-regression`

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
