# 2026-04-23 Pipeline and Chat Investigation

## Context

This note captures the findings from live investigation of three operator-facing
app problems reported during web testing:

- the pipeline list does not visibly show the JD or URL
- pasting a job URL or JD into chat appears to launch a run, but nothing is
  actually processed
- the `Resume` action appears available but does not do useful work

No code changes were made during this investigation. The local web and API dev
servers were stopped at the user's request after reproduction.

## Validation Update

Re-checked against the current source on `2026-04-23`.

Status:

- Findings 1, 3, 4, and 5 are source-confirmed as written, with minor nuance
  added below.
- Finding 2 is directionally correct, but the original wording was too narrow:
  the launch path does not only fail to create a durable job; it does not start
  any backing execution after the runtime handoff. Current durable workflow
  executors cover `scan-portals`, `process-pipeline`, and `batch-evaluation`,
  while `single-evaluation` and `auto-pipeline` are routed as evaluation
  specialist handoffs with typed artifact tools, not as durable job types.
- Therefore the implementation fix should first choose the intended execution
  model for chat-launched evaluations: live specialist run, durable evaluation
  job, or another explicit run record. Do not simply enqueue
  `single-evaluation` without adding a matching executor and state contract.

## Startup And Environment

- repo: `jobhunt`
- date of investigation: `2026-04-23`
- update check: `up-to-date`
- required profile/setup files were present
- local frontend dev server was run via `npm run app:web:dev`
- local API server was run via `npm run app:api:serve`

Note:

- `npm run app:api:dev` does not keep the API server running for app testing
  because it maps to `tsx src/index.ts` and exits after diagnostics

## Finding 1: Pipeline List Hides The URL Even Though The Data Exists

### Reproduction

1. Open `/pipeline` in the web app.
2. Observe the queue rows.
3. The row body shows role, company, and state, but not the JD source or URL.

Live example from the first row:

- visible text:
  - `EMEA AE Lead, Beneficial Deployments`
  - `Anthropic`
  - `--`
  - `Pending`
- hidden evidence:
  - the row `aria-label` included the actual job URL
  - `data/pipeline.md` also contains the URLs for pending entries

### Conclusion

This is a frontend rendering omission, not a missing-data problem. The URL is
already present in the loaded row data, but the queue row component does not
display it in the list.

### Relevant Files

- `apps/web/src/pipeline/pipeline-row.tsx`
- `apps/web/src/pipeline/pipeline-context-detail.tsx`
- `apps/web/src/pipeline/pipeline-review-client.ts`
- `apps/api/src/server/pipeline-review-summary.ts`

### Likely Fix

Render `row.url` visibly in `pipeline-row.tsx`, likely as a clipped secondary
line beneath the role and company block. The detail panel already exposes the
link, but the list itself currently hides the information the operator needs for
quick scanning.

## Finding 2: Chat Launch Creates Sessions Without Starting Work

### Reproduction

1. Launch the app locally with frontend and API running.
2. Open `/chat`.
3. Paste a job URL and start a single evaluation flow.
4. The UI reports a running handoff, but nothing actually starts processing.

Manual API reproduction:

```bash
curl -sS -X POST http://127.0.0.1:5172/orchestration \
  -H 'content-type: application/json' \
  -d '{"kind":"launch","workflow":"single-evaluation","sessionId":null,"context":{"promptText":"https://jobs.ashbyhq.com/cohere/1bc73d85-e6f4-4338-b53a-9ffb609a950d"}}'
```

Returned behavior:

- `handoff.job` was `null`
- `handoff.state` was `"running"`
- `handoff.message` was `"Run handoff is active."`
- a new session was created
- the selected session had:
  - `jobs: []`
  - `activeJobId: null`
  - `status: "pending"`
  - `state: "running"`

Follow-up `GET /chat-console` confirmed the same session state:

- `job: null`
- `activeJobId: null`
- `status: "pending"`
- `state: "running"`

### Database Evidence

Inspection of `.jobhunt-app/app.db` showed:

- `runtime_sessions` had rows
- `runtime_jobs` had `0` rows
- `runtime_approvals` had `0` rows

This matches the reported behavior exactly: sessions are being created, but no
workflow jobs exist to process or resume.

Validation re-check of the same local database still showed sessions present and
no jobs or approvals: `runtime_sessions = 4`, `runtime_jobs = 0`,
`runtime_approvals = 0`.

### Conclusion

The launch path is creating a session-only record and bootstrapping runtime
readiness, but it does not start a backing run. In the current code, there is no
durable `single-evaluation` or `auto-pipeline` job executor to enqueue, and
there is also no alternate live-agent execution call after bootstrap. The API
summary layer still reports the session as active or running, so the user is
told work is in progress when there is no execution record backing that claim.

This should be treated as a missing execution-backend handoff, not just a
missing insert into `runtime_jobs`.

### Relevant Files

- `apps/api/src/server/routes/orchestration-route.ts`
- `apps/api/src/orchestration/orchestration-service.ts`
- `apps/api/src/orchestration/workflow-router.ts`
- `apps/api/src/orchestration/session-lifecycle.ts`
- `apps/api/src/job-runner/workflow-job-contract.ts`
- `apps/api/src/job-runner/workflow-job-executors.ts`
- `apps/api/src/tools/evaluation-workflow-tools.ts`
- `apps/api/src/orchestration/specialist-catalog.ts`
- `apps/api/src/server/chat-console-summary.ts`
- `apps/api/src/server/evaluation-result-summary.ts`

## Finding 3: Session Summary Logic Reports False Running States

### Current Behavior

The summary layer treats a pending session as effectively in flight even when no
job exists.

In `apps/api/src/server/chat-console-summary.ts`:

- `resolveSessionState(...)` returns `"running"` for session statuses such as
  `pending`, `running`, or `waiting`, even if `job` is `null`
- `resolveHandoffState(...)` returns `"running"` from session status alone, even
  when `handoff.job` is `null`
- `resolveResumeAllowed(session)` currently allows resume for anything not
  cancelled, even if there is no job to resume

In `apps/api/src/server/evaluation-result-summary.ts`:

- the base state treats `session.status === "pending"` as meaningful work in
  progress even without a job
- in-flight logic therefore keeps artifacts in a pending-looking state instead
  of an honest not-started or empty state

### Conclusion

Even if the missing execution handoff is fixed, the summary layer still needs
to stop describing a session-only placeholder as a running workflow.

## Finding 4: Resume Is Effectively A No-Op For Empty Sessions

### Why It Happens

Because the chat launch flow currently creates sessions without backing jobs or
live runs:

- the UI displays sessions that look resumable
- `Resume` appears available
- there is no `runtime_jobs` row to continue

Nuance: resume is not a literal no-op. It can update session orchestration
metadata and bootstrap runtime readiness again. It is operationally a no-op for
the operator because there is still no job or live run to resume.

### Likely UX/API Fix

- only allow resume when an actual job exists
- adjust route and handoff messaging to say that no backing workflow run has
  been created yet instead of implying active execution
- consider hiding or disabling `Resume` in the session list when `session.job`
  is `null`

### Relevant Files

- `apps/web/src/chat/recent-session-list.tsx`
- `apps/web/src/chat/use-chat-console.ts`
- `apps/api/src/server/chat-console-summary.ts`

## Finding 5: Chat Hits Local Rate Limits Too Easily

### Evidence

During normal page load and interaction, the app sometimes showed messages such
as `API currently offline` and `Too many requests`.

Observed API behavior:

- repeated `GET /chat-console` requests produced `429` responses

Current defaults in `apps/api/src/runtime/runtime-config.ts`:

- `DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5`
- `DEFAULT_RATE_LIMIT_WINDOW_MS = 10_000`

### Likely Contributing Frontend Behavior

In `apps/web/src/chat/use-chat-console.ts`:

- `handleFocusChange()` always calls `loadSummary("select", nextSelectedSessionId)`
  even when the selected session is unchanged
- `runCommand()` both syncs focus and directly calls `loadSummary(...)`
- `selectSession()` also syncs URL state and directly loads summary

This makes it easy for normal SPA interaction to exceed the current API default
rate limit.

### Conclusion

The current local defaults are too strict for the existing chat request pattern,
or the frontend is over-fetching, or both. This is likely a separate issue from
the missing-job bug, but it degrades operator trust and makes the chat flow look
more broken than it already is.

## Previous Fresh Session Handoff

Last updated: `2026-04-23`

This document was re-opened as a `qimpl` work file for an implementation pass.
The pass was intentionally paused at the user's request before source edits were
made. This section is retained as historical context and is superseded by the
implementation resolution update below.

Current state:

- Job-Hunt startup checks were re-run and remained `up-to-date`.
- Required setup files were still present.
- `.spec_system/` exists, so the implementation should continue under the Apex
  spec quick-implementation discipline, treating this markdown file as the work
  hub.
- The working tree still only showed this document as untracked during the
  pause: `?? docs/ongoing-projects/2026-04-23-pipeline-chat-investigation.md`.
- No implementation source files were changed in the paused pass.
- No tests were run in the paused pass.

Source context verified during the paused pass:

- `apps/web/src/pipeline/pipeline-row.tsx` still renders `row.role ?? row.url`
  and company, so URLs remain hidden when a role/title exists.
- `apps/api/src/orchestration/orchestration-service.ts` still creates or
  reuses a session, bootstraps runtime readiness, closes the provider, and then
  summarizes existing session activity. It does not start a worker or enqueue a
  job after bootstrap.
- `apps/api/src/orchestration/session-lifecycle.ts` still persists launch
  sessions as `pending` with the existing `activeJobId` or `null`; it does not
  create jobs.
- `apps/api/src/job-runner/workflow-job-contract.ts` still defines durable job
  types only for `scan-portals`, `process-pipeline`, and `batch-evaluation`.
- `apps/api/src/job-runner/workflow-job-executors.ts` contains a reusable
  `defaultRunBatchWorker(...)` path that launches `codex exec` with
  `batch/batch-prompt.md`, validates `batch/worker-result.schema.json`, and is
  already used by `process-pipeline` and `batch-evaluation`.
- `apps/api/src/runtime/service-container.ts` wires durable executors into one
  cached job runner and already starts that runner.
- `apps/api/src/server/chat-console-summary.ts` still computes false running
  and resume states from session status alone when no job exists.
- `apps/api/src/server/evaluation-result-summary.ts` still treats a pending
  session without a job as an in-flight evaluation.
- `apps/web/src/chat/use-chat-console.ts` still has duplicate reload paths:
  `syncChatConsoleSessionFocus(...)` dispatches a focus event while callers also
  call `loadSummary(...)` directly.
- `apps/api/src/runtime/runtime-config.ts` still defaults to `5` requests per
  `10_000ms`.

Recommended implementation direction:

- Prefer a durable evaluation job over a session-only or hidden live-agent path.
  It fits the existing app architecture because the chat UI, resume affordance,
  evaluation-result route, approval/runtime stores, and operator summaries
  already understand durable `runtime_jobs`.
- Add typed durable job support for `single-evaluation` and `auto-pipeline`
  rather than merely inserting ad hoc rows. The likely minimal backend slice is:
  update `workflowJobTypeValues`, add evaluation payload/result schemas, add
  executor definitions in `workflow-job-executors.ts`, and add orchestration
  launch enqueue logic after runtime readiness succeeds.
- Reuse the existing batch worker contract where practical. The `batch` prompt
  already performs full A-G evaluation, report write, PDF generation, tracker
  staging, and structured result emission. For URL launches, the durable
  evaluation executor can reserve a report number and call the existing batch
  worker path with a stable synthetic id. For raw JD launches, it likely needs to
  write the raw JD text to the worker JD file or extend `defaultRunBatchWorker`
  to accept optional JD text.
- Keep resume honest. Resume should inspect or continue an existing durable job;
  it should not show as enabled for a session with `job: null`.
- Fix false UI state even after adding jobs. A defensive summary layer should
  still report a session-only placeholder as not running and not resumable.

Suggested next edit order for a fresh session:

1. `apps/api/src/job-runner/workflow-job-contract.ts`: add
   `single-evaluation` and `auto-pipeline` payload/result contracts.
2. `apps/api/src/job-runner/workflow-job-executors.ts`: add evaluation
   executors, likely by extracting reusable helpers around `defaultRunBatchWorker`
   and `nextReportNumber`.
3. `apps/api/src/orchestration/orchestration-service.ts`: enqueue the durable
   evaluation job for launch requests after runtime readiness succeeds, then
   return the created job in the handoff.
4. `apps/api/src/server/chat-console-summary.ts` and
   `apps/api/src/server/evaluation-result-summary.ts`: require an actual job for
   running/resumable in-flight states.
5. `apps/web/src/chat/recent-session-list.tsx`: disable or annotate `Resume`
   when there is no backing job.
6. `apps/web/src/chat/use-chat-console.ts`: dedupe URL-focus-triggered reloads
   so selection, command completion, and focus events do not double-fetch.
7. `apps/web/src/pipeline/pipeline-row.tsx`: visibly render `row.url` as a
   secondary source line.
8. `apps/api/src/runtime/runtime-config.ts`: consider raising the local default
   rate limit after fetch dedupe is in place.

Suggested validation from the paused handoff:

- `npm run app:api:check`
- `npm run app:web:check`
- `npm run app:api:test:orchestration`
- `npm run app:api:test:job-runner`
- `npm run app:api:test:runtime`
- `node scripts/test-app-chat-console.mjs`
- `node scripts/test-app-auto-pipeline-parity.mjs`
- `node scripts/test-app-pipeline-review.mjs`

## Implementation Resolution Update

Last updated: `2026-04-23`

Current status: all five findings have implementation coverage.

Implemented changes:

- Pipeline rows now visibly render `row.url` as a secondary source line when a
  role/title exists.
- `single-evaluation` and `auto-pipeline` are now first-class durable workflow
  job types with typed payload/result contracts.
- Chat-launched evaluation jobs enqueue after runtime readiness succeeds, using
  stable job IDs and the existing durable runner. URL launches use the canonical
  URL. Raw JD launches persist the raw text in the durable job payload so queued
  jobs survive process restarts, while session context and UI summaries remain
  redacted.
- The evaluation executor reuses `batch/batch-prompt.md` through
  `defaultRunBatchWorker(...)`, reserves a report number, writes raw JD text to
  the worker JD file when needed, removes that temp JD file after the worker
  exits, checkpoints the single result, and runs tracker merge/verify closeout
  tools for completed or partial evaluations.
- Chat and evaluation summaries now require an actual job before reporting
  running/in-flight/resumable states. Historical session-only records now show
  as ready/empty and not resumable instead of pretending work is active.
- The chat `Resume` button is disabled unless the session has a backing job.
- Chat URL-focus synchronization can suppress internal focus events, and
  `handleFocusChange()` ignores unchanged selections, removing duplicate
  summary fetches from normal select/launch flows.
- The local API default rate limit was raised from `5` to `20` requests per
  `10_000ms`.

Files changed:

- `apps/api/src/job-runner/workflow-job-contract.ts`
- `apps/api/src/job-runner/workflow-job-executors.ts`
- `apps/api/src/orchestration/orchestration-service.ts`
- `apps/api/src/runtime/service-container.ts`
- `apps/api/src/runtime/runtime-config.ts`
- `apps/api/src/server/chat-console-summary.ts`
- `apps/api/src/server/evaluation-result-summary.ts`
- `apps/web/src/chat/chat-console-client.ts`
- `apps/web/src/chat/use-chat-console.ts`
- `apps/web/src/chat/recent-session-list.tsx`
- `apps/web/src/pipeline/pipeline-row.tsx`
- Targeted tests were added/updated in:
  `apps/api/src/job-runner/workflow-job-executors.test.ts`,
  `apps/api/src/orchestration/orchestration-service.test.ts`, and
  `apps/api/src/server/http-server.test.ts`.

Validation completed:

- `npm run app:check`
- `npm run app:api:test:orchestration`
- `npm run app:api:test:job-runner`
- `npm run app:api:test:runtime`
- `node scripts/test-app-chat-console.mjs`
- `node scripts/test-app-auto-pipeline-parity.mjs`
- `node scripts/test-app-pipeline-review.mjs`

Validation notes:

- The API test suites emit expected Node SQLite experimental warnings.
- No live external job evaluation was executed during validation; the durable
  evaluation executor was covered with stubbed batch-worker tests and app smoke
  checks.

Remaining operational notes:

- Existing historical session-only records are not backfilled with jobs. They
  now display honestly as jobless and not resumable.
- Real chat-launched evaluations still depend on local OpenAI auth, the Codex
  CLI, and the normal batch worker's ability to fetch or process the JD.
- If raw JD persistence in `runtime_jobs.payload` is considered too sensitive
  later, the next hardening pass should stage raw JD text under `jds/` and store
  only a repo-relative JD path in the durable job payload.

## Recommended Next Steps

The originally recommended fixes are implemented. Suggested follow-up is a
manual live smoke test with `npm run app:api:serve` and `npm run app:web:dev`:
launch one URL evaluation and one raw-JD evaluation from `/chat`, then confirm
each creates a `runtime_jobs` row, shows a resumable job-backed session, and
eventually surfaces report/PDF/tracker artifacts.

## Paused State

Original investigation pause:

- investigation was complete enough to identify the likely frontend omission and
  the likely backend state-model bug
- no fixes had been implemented yet
- no tests were added or run beyond live reproduction, API probing, and local
  database inspection
- the local frontend and API servers had been stopped

Latest implementation pause:

- an implementation pass began and re-verified the affected files listed above
- no source edits were made before the user requested a safe pause
- resume from the "Previous Fresh Session Handoff" section above

Latest implementation completion:

- implementation resumed under `qimpl` and resolved the five findings
- source edits and targeted tests are complete
- resume from "Implementation Resolution Update" if follow-up work is needed
