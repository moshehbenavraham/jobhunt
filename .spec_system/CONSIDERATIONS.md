# Considerations

> Institutional memory for AI assistants. Updated between phases via carryforward.
> **Line budget**: 600 max | **Last updated**: Phase 05 (2026-04-22)

---

## Active Concerns

Items requiring attention in upcoming phases. Review before each session.

### Technical Debt

<!-- Max 5 items -->

- [P05] **Specialist summary drift**: Scan, batch, and application-help all rely on bounded summary contracts and route-owned actions; keep API payloads, browser parsers, and smoke fixtures aligned.
- [P05-apps/api] **Markdown parser fragility**: Scan history, batch state, and application-help context still parse repo-owned markdown or sidecar files; fixture and parser updates must stay coordinated.
- [P05-apps/web] **URL-backed focus sync**: Specialized workspaces depend on query state and cleanup for refresh and re-entry; preserve stale-selection recovery and listener teardown.
- [P05] **Bounded payload growth**: Keep shortlist, item-matrix, and draft-packet payloads capped so polling stays fast and does not drift toward raw artifact readers.

### External Dependencies

<!-- Max 5 items -->

- [P05] **Smoke suite coverage**: Dedicated smoke scripts now cover scan, batch, and application-help; keep them updated whenever a new surface or handoff path lands.
- [P05-apps/api] **Repo file contract stability**: The API summaries depend on canonical report, tracker, and draft-packet paths staying stable in the repo-owned file contract.

### Performance / Security

<!-- Max 5 items -->

- [P05] **Read-only browser boundary**: Keep repo-file access, tracker mutations, and approval-sensitive actions backend-owned; browser surfaces should remain fail-closed parsers over bounded summaries.
- [P05] **No-submit boundary**: Application-help must stay review-only and never drift into browser-owned submission behavior.

### Architecture

<!-- Max 5 items -->

- [P05] **Thin browser surfaces**: Continue keeping workflow inference in API contracts instead of React state or ad hoc client parsing.
- [P05] **Canonical handoff routing**: Chat, report, tracker, scan, batch, and application-help surfaces should continue to share the same backend-owned handoff model.

---

## Lessons Learned

Proven patterns and anti-patterns. Reference during implementation.

### What Worked

<!-- Max 15 items -->

- [P05] **Bounded read models**: One typed summary per specialist surface kept the browser simple and reduced parser drift.
- [P05] **Strict browser parsing**: Fail-closed payload parsers surfaced contract drift early instead of rendering partial state.
- [P05] **URL-backed focus state**: Query-string focus survived refresh and re-entry without hidden client state.
- [P05] **Read-only summary routes**: Keeping repo reads behind API routes preserved the browser trust boundary.
- [P05] **Route-owned mutations**: Explicit backend actions and duplicate-submit guards kept retries and closeout flows safe.
- [P05] **Reusable shell handoff paths**: Reusing the same handoff pattern across surfaces kept navigation consistent.
- [P05-apps/api] **App-owned draft packets**: Staging application-help packets under `.jobhunt-app/` kept review explicit, bounded, and replayable.
- [P05-apps/web] **Dedicated smoke scripts**: Per-surface smoke harnesses gave reliable regression coverage for the new workflows.

### What To Avoid

<!-- Max 10 items -->

- [P05] **Browser guessing from files**: Do not let React infer artifact readiness by reading repo files directly.
- [P05] **Unbounded polling summaries**: Do not return raw artifact detail when a bounded summary is enough.
- [P05] **UI-only mutation logic**: Keep scan, batch, tracker, and application-help actions behind backend routes and tools.
- [P05] **Parallel selection state**: Avoid separate client-owned focus models for specialized review surfaces.

### Tool/Library Notes

<!-- Max 5 items -->

- [P05] **`scripts/test-app-scan-review.mjs`**: Use when scan review or shortlist handoff changes.
- [P05] **`scripts/test-app-batch-workspace.mjs`**: Use when batch supervision, retry, or closeout changes.
- [P05] **`scripts/test-app-application-help.mjs`**: Use when application-help review, approval, or resume behavior changes.
- [P05] **`node scripts/test-all.mjs --quick`**: Keep this as the fast regression gate after surface changes.

---

## Resolved

Recently closed items (buffer - rotates out after 2 phases).

| Phase | Item                     | Resolution                                                                                                                              |
| ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| P04   | Smoke suite coverage     | Phase 05 added and wired dedicated scan, batch, and application-help smoke coverage into the quick regression gate.                     |
| P03   | Bounded polling payloads | Phase 04 added bounded evaluation, report, pipeline, and tracker summaries so browser polling no longer depends on raw artifact detail. |
| P03   | Interaction race guards  | Phase 04 added duplicate-submit and in-flight action guards, plus backend-owned mutation paths where needed.                            |
| P03   | UI-only mutation logic   | Phase 04 moved tracker edits and maintenance actions behind API routes and tools instead of browser-owned command logic.                |

_Auto-generated by carryforward. Manual edits allowed but may be overwritten._
