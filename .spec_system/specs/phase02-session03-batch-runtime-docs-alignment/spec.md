# Session Specification

**Session ID**: `phase02-session03-batch-runtime-docs-alignment`
**Phase**: 02 - Batch Runtime Conversion
**Status**: Complete
**Created**: 2026-04-15

---

## 1. Session Overview

Session 01 converted the batch worker boundary from `claude -p` to
`codex exec`, and Session 02 made the structured result contract
authoritative for batch-state semantics. The remaining gap is that the
operator-facing batch docs still describe the old runtime, the old state
model, or only a shallow architecture summary that no longer explains how the
live system works.

This session aligns the batch-owned docs with the code that now exists. The
goal is operational clarity, not another runtime rewrite. Batch operators and
contributors should be able to read the docs, understand the `codex exec`
worker path, know what artifacts and state rows to expect, and follow the
merge and verification steps without reverse-engineering `batch-runner.sh`.

This is the natural next session because Session 04 depends on accurate
runtime docs before controlled validation and closeout work can happen. The
scope must stay narrow: update the batch-owned docs and only make the minimum
runtime-only corrections in adjacent batch surfaces that would otherwise leave
Phase 02 in a contradictory state.

---

## 2. Objectives

1. Document the live batch runtime around `codex exec`, structured result
   files, and repo-owned merge and verification scripts.
2. Explain the current batch-state expectations, retry behavior, and operator
   validation flow in the docs surfaces that batch users actually read.
3. Align architecture and routed batch guidance with the settled Session 02
   state semantics without reopening unrelated Phase 03 wording cleanup.
4. Capture explicit residual cleanup items so Phase 03 inherits a clear
   deferral ledger instead of hidden drift.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase02-session01-codex-exec-worker-contract` - provides the stable
      `codex exec` worker-launch path and checked-in contract assets
- [x] `phase02-session02-structured-batch-result-handling` - provides the
      settled structured-result status model, warning semantics, and rerun
      behavior that this docs pass must explain accurately

### Required Tools/Knowledge

- Familiarity with the Phase 02 PRD and Session 03 stub
- Working knowledge of `batch/batch-runner.sh`,
  `batch/worker-result.schema.json`, and `scripts/test-all.mjs`
- Awareness of batch operator surfaces in `batch/README-batch.md`,
  `docs/ARCHITECTURE.md`, and `modes/batch.md`
- `bash`, `node`, `rg`, and `codex`

### Environment Requirements

- Repo root checkout with `.spec_system/` initialized
- Phase 02 session stubs present under `.spec_system/PRD/phase_02/`
- Ability to compare docs against the live runner, schema, and validation
  scripts from the current checkout

---

## 4. Scope

### In Scope (MVP)

- Batch operator documentation explains the live `codex exec` runtime,
  structured-result artifacts, state semantics, and merge/verify flow using
  the checked-in runner and scripts.
- `batch/README-batch.md` becomes the current operator guide for standalone
  batch execution, flags, resumability, and validation.
- `docs/ARCHITECTURE.md` describes the live batch-processing contract at the
  right level of detail and points readers at the batch-owned runtime docs.
- `modes/batch.md` receives only the minimum runtime corrections required to
  remove contradictory `claude -p` guidance before Session 04 validation.
- Session notes record any remaining prompt or wording cleanup that should
  stay deferred to Phase 03.

### Out of Scope (Deferred)

- Broad prompt-language cleanup across `modes/`, `batch/`, or other repo docs
  - Reason: Phase 03 owns repo-wide wording and metadata normalization
- Batch runner, schema, fixture, or dashboard behavior changes
  - Reason: Sessions 01 and 02 already settled the runtime behavior
- Controlled batch validation, tracker-merge evidence capture, and closeout
  notes
  - Reason: Session 04 owns validation and phase-closeout preparation
- Release, updater, or version-path work outside the batch docs surface
  - Reason: later workflow stages own release-path changes

---

## 5. Technical Approach

### Architecture

Treat the live code as authoritative. The session should derive every doc edit
from `batch/batch-runner.sh`, the structured result schema, the current quick
validation surface, and the existing tracker merge and verification scripts.
The docs should describe what the runner does today, not what earlier batch
design notes said before Sessions 01 and 02 landed.

Keep the docs layered by ownership. `batch/README-batch.md` should carry the
operator-level details: prerequisites, flags, state values, resumability,
artifacts, and the merge and verify path. `docs/ARCHITECTURE.md` should stay
high-level but no longer be vague or stale about batch processing. If
`modes/batch.md` still contradicts the live runtime in a way that would mislead
operators or future validation, correct only the runtime facts needed to
remove that contradiction and leave broader style cleanup deferred.

Use an explicit deferral ledger. Any stale wording or broader cleanup that is
real but outside this session should be written into the session notes rather
than silently pulled into scope.

### Design Patterns

- Live-contract documentation: derive runtime docs from the current runner,
  schema, and validation scripts
- Layered doc ownership: keep operator detail in batch-owned docs and
  architecture detail in the repo-wide overview
- Explicit deferral: record residual drift for Phase 03 instead of absorbing
  unrelated cleanup
- Validator-aware writing: keep docs aligned with the commands and artifacts
  used by `node scripts/test-all.mjs --quick`

### Technology Stack

- Markdown docs in `batch/`, `docs/`, and `modes/`
- Bash runtime in `batch/batch-runner.sh`
- JSON schema contract in `batch/worker-result.schema.json`
- Node.js validation scripts such as `scripts/test-all.mjs`,
  `scripts/merge-tracker.mjs`, and `scripts/verify-pipeline.mjs`

---

## 6. Deliverables

### Files to Create

| File                                                                                        | Purpose                                                                              | Est. Lines |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| `.spec_system/specs/phase02-session03-batch-runtime-docs-alignment/implementation-notes.md` | Record the stale-doc audit, Phase 03 deferrals, and docs-to-code validation evidence | ~90        |

### Files to Modify

| File                    | Changes                                                                                                                              | Est. Lines |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `batch/README-batch.md` | Rewrite the batch operator guide around the live `codex exec` runtime, structured results, state semantics, and validation path      | ~180       |
| `docs/ARCHITECTURE.md`  | Update the batch-processing and data-flow overview to reflect the settled runtime contract and point readers to the batch-owned docs | ~60        |
| `modes/batch.md`        | Apply only the runtime corrections needed to remove contradictory `claude -p` guidance before Session 04 validation                  | ~60        |

---

## 7. Success Criteria

### Functional Requirements

- [ ] `batch/README-batch.md` documents `codex exec`, not `claude -p`, as the
      live batch worker runtime
- [ ] The batch operator docs explain result artifacts, batch-state values,
      retry behavior, and merge and verification steps accurately
- [ ] `docs/ARCHITECTURE.md` describes the current batch contract rather than
      a generic or stale batch summary
- [ ] Any `modes/batch.md` edits stay limited to runtime-fact alignment and
      do not absorb broader Phase 03 cleanup
- [ ] Session notes capture the residual wording cleanup that remains deferred
      after this docs pass

### Testing Requirements

- [ ] A docs-to-code audit confirms the rewritten docs match the current
      runner flags, state values, structured-result contract, and merge and
      verify commands
- [ ] A scoped search confirms stale `claude -p` guidance is removed from the
      session-owned doc surfaces or explicitly deferred outside the session
- [ ] `node scripts/test-all.mjs --quick` passes after the docs changes
- [ ] Manual walkthrough of the rewritten quick-start and batch flow reveals
      no contradictory runtime steps

### Non-Functional Requirements

- [ ] Docs-local links and repo paths resolve from the file that owns them
- [ ] Session scope remains tightly limited to batch runtime docs and
      validation blockers
- [ ] No new PII, secrets, or telemetry surfaces are introduced in docs,
      examples, or validation notes

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Docs follow project conventions and the existing data contract boundary

---

## 8. Implementation Notes

### Key Considerations

- Session 02 settled `completed`, `partial`, semantic `failed`, and
  infrastructure-failed behavior. Session 03 docs must explain that settled
  state model instead of the pre-Session-02 assumptions.
- `batch/README-batch.md` still documents `claude -p`, and
  `modes/batch.md` still contains stale worker-runtime guidance that can
  mislead operators if left untouched.
- `docs/ARCHITECTURE.md` already frames the repo as Codex-first but currently
  underspecifies the batch runtime and does not describe the structured result
  contract operators now depend on.
- `docs/` files must keep links and routing relative to their own directory.

### Potential Challenges

- Avoiding scope creep into a full prompt and mode rewrite while still fixing
  contradictions that would block Session 04 validation
- Translating the structured result and state model into operator-friendly
  guidance without inventing new behavior
- Keeping `batch/README-batch.md`, `docs/ARCHITECTURE.md`, and `modes/batch.md`
  aligned on the same runtime vocabulary after the rewrite

### Relevant Considerations

- [P00] **Residual legacy references**: Keep non-batch cleanup out of this
  session unless it directly blocks the batch runtime docs.
- [P00] **Validator surface drift**: Recheck doc edits against the runner,
  quick test gate, and merge and verify scripts as soon as the wording
  changes.
- [P01] **Deferred runtime-reference cleanup**: Limit this session to the
  batch-owned runtime docs and record any broader cleanup for Phase 03.
- [P00] **No data collection surface**: Preserve the current no-PII and
  no-secrets baseline in examples, logs references, and validation notes.
- [P00] **Canonical live surface**: Treat `AGENTS.md`, `.codex/skills/`, and
  live docs as the authoritative runtime surfaces.
- [P01] **Docs-local links matter**: Keep links relative to the owning docs
  directory so future readers do not hit root-relative drift again.

---

## 9. Testing Strategy

### Unit Tests

- N/A - this session is documentation and runtime-alignment work rather than a
  new code path

### Integration Tests

- Run `node scripts/test-all.mjs --quick` after the doc edits
- Compare the rewritten docs against `batch/batch-runner.sh`,
  `batch/worker-result.schema.json`, and the merge and verification scripts

### Manual Testing

- Walk through the rewritten quick start and resumability sections as if
  operating a standalone batch run from scratch
- Verify `docs/ARCHITECTURE.md` and `modes/batch.md` no longer contradict the
  live runtime path

### Edge Cases

- `partial` results that still produce reports and tracker additions
- Semantic `failed` results versus infrastructure failures and retry behavior
- Dry-run, `--retry-failed`, and resumability instructions staying consistent
  with the current runner flags and state file

---

## 10. Dependencies

### External Libraries

- None beyond the existing repo runtime and validation tooling

### Other Sessions

- **Depends on**:
  `phase02-session01-codex-exec-worker-contract`,
  `phase02-session02-structured-batch-result-handling`
- **Depended by**:
  `phase02-session04-batch-flow-validation-and-closeout`,
  Phase 03 wording and metadata cleanup

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
