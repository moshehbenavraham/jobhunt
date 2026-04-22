# Considerations

> Institutional memory for AI assistants. Updated between phases via carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 04 (2026-04-22)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt

<!-- Max 5 items -->

- [P04] **Review-focus contract drift**: Evaluation-result, report-viewer, pipeline-review, and tracker-workspace now share provenance and review-focus fields; keep API payloads and browser parsers aligned when extending handoff paths.
- [P04-apps/api] **Markdown parser fragility**: Report, pipeline, and tracker summaries parse repo markdown directly; file format changes must be coordinated with parser tests and fixture updates.
- [P04-apps/web] **URL-backed focus sync**: Shell surfaces depend on query state and custom focus events; preserve cleanup, refresh, and re-entry handling when adding more views.
- [P04] **Bounded parity payloads**: Keep summary payloads and preview windows capped so polling surfaces stay fast and do not grow into raw artifact readers.

### External Dependencies

<!-- Max 5 items -->

- [P04] **Smoke suite coverage**: The dedicated smoke scripts and quick regression gate now protect parity; keep them updated whenever a new surface or handoff path lands.
- [P04-apps/api] **Repo file contract stability**: The API summaries depend on canonical report, pipeline, and tracker paths staying stable in the repo-owned file contract.

### Performance / Security

<!-- Max 5 items -->

- [P04] **Read-only browser boundary**: Keep repo-file access and tracker mutations backend-owned; browser surfaces should remain fail-closed parsers over bounded summaries.
- [P04] **Payload growth control**: The new review-focus fields are useful, but they should not expand polling responses beyond the current bounded pattern.

### Architecture

<!-- Max 5 items -->

- [P04] **Thin browser surfaces**: Continue keeping workflow inference in API contracts instead of React state or ad hoc client parsing.
- [P04] **Canonical handoff routing**: Chat, report, pipeline, and tracker surfaces should continue to share the same backend-owned review-focus model.

---

## Lessons Learned

Proven patterns and anti-patterns. Reference during implementation.

### What Worked

<!-- Max 15 items -->

- [P04] **Backend-owned review focus**: Explicit next-target data made handoff routing deterministic across chat, report, pipeline, and tracker surfaces.
- [P04] **Bounded read models**: One typed summary per surface kept the browser simple and reduced parser drift.
- [P04] **Strict browser parsing**: Fail-closed payload parsers surfaced contract drift early instead of rendering partial state.
- [P04] **URL-backed focus state**: Query-string focus survived refresh and re-entry without hidden client state.
- [P04] **Read-only summary routes**: Keeping repo reads behind API routes preserved the browser trust boundary.
- [P04] **Line-preserving tracker updates**: Editing only the status cell reduced tracker drift risk.
- [P04] **Reusable shell handoff paths**: Reusing the same handoff pattern across surfaces kept navigation consistent.

### What To Avoid

<!-- Max 10 items -->

- [P04] **Browser guessing from files**: Do not let React infer artifact readiness by reading repo files directly.
- [P04] **Unbounded polling summaries**: Do not return raw artifact detail when a bounded summary is enough.
- [P04] **UI-only mutation logic**: Keep tracker edits and maintenance actions behind backend routes and tools.
- [P04] **Parallel selection state**: Avoid separate client-owned focus models for chat, report, pipeline, and tracker views.

### Tool/Library Notes

<!-- Max 5 items -->

- [P04] **`scripts/test-app-auto-pipeline-parity.mjs`**: Use for raw-JD and live-URL parity smoke coverage.
- [P04] **`scripts/test-app-report-viewer.mjs`**: Use when report browsing or artifact handoff changes.
- [P04] **`scripts/test-app-pipeline-review.mjs`**: Use when queue parsing or pipeline handoff changes.
- [P04] **`scripts/test-app-tracker-workspace.mjs`**: Use when tracker status editing or maintenance actions change.
- [P04] **`node scripts/test-all.mjs --quick`**: Keep this as the fast regression gate after surface changes.

---

## Resolved

Recently closed items (buffer - rotates out after 2 phases).

| Phase | Item                     | Resolution                                                                                                                              |
| ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| P03   | Bounded polling payloads | Phase 04 added bounded evaluation, report, pipeline, and tracker summaries so browser polling no longer depends on raw artifact detail. |
| P03   | Interaction race guards  | Phase 04 added duplicate-submit and in-flight action guards, plus backend-owned mutation paths where needed.                            |
| P03   | UI-only mutation logic   | Phase 04 moved tracker edits and maintenance actions behind API routes and tools instead of browser-owned command logic.                |

_Auto-generated by carryforward. Manual edits allowed but may be overwritten._
