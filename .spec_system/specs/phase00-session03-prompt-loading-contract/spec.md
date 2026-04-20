# Session Specification

**Session ID**: `phase00-session03-prompt-loading-contract`
**Phase**: 00 - Foundation and Repo Contract
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

This session turns the workspace adapter from Session 02 into the prompt and
context contract that the app runtime will actually consume. Today the repo's
product logic lives in checked-in instruction surfaces such as `AGENTS.md`,
`modes/_shared.md`, `modes/_profile.md`, workflow mode files, and the user
profile sources under `config/` and `profile/`. If the app loads those assets
in an implicit or ad hoc way, parity will drift before the runtime is even
bootable.

The implementation should create a typed prompt-loading module inside
`apps/api` that does three things explicitly: map supported workflow intents to
exact mode files, define the canonical source order and precedence rules for
instruction layers versus user data, and provide a local-safe cache or reload
policy so prompt edits are visible without hidden session state. The output
should stay inspectable: later chat, job, and approval flows should receive a
structured prompt bundle, not depend on scattered file reads or undocumented
string concatenation.

This session is next because Phase 00 still has two open candidates and Session
04 is blocked on Session 03. The phase PRD requires prompt loading before the
boot-path and validation pass, and the session stub for Session 03 depends
directly on the workspace adapter contract that is now complete.

---

## 2. Objectives

1. Define an explicit workflow-to-mode routing contract in `apps/api` that
   matches the live routing table in `AGENTS.md`.
2. Define deterministic source order and precedence across `AGENTS.md`,
   `modes/_shared.md`, `modes/_profile.md`, workflow mode files,
   `config/profile.yml`, `profile/cv.md`, and optional `profile/article-digest.md`.
3. Implement an inspectable prompt loader and local reload strategy that uses
   checked-in repo files as the source of truth and rejects unsupported
   workflow inputs.
4. Add package-local validation that proves routing, load order, legacy
   fallback handling, and prompt freshness before Session 04 builds boot-time
   diagnostics on top.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session01-monorepo-app-skeleton` - provides the `apps/api`
      package scaffold and repo-root helper baseline.
- [x] `phase00-session02-workspace-adapter-contract` - provides the typed
      workspace surfaces, missing-file policy, and boundary enforcement the
      prompt loader should consume.

### Required Tools/Knowledge

- `AGENTS.md` routing rules and startup constraints
- `modes/_shared.md` source-of-truth and precedence rules
- `docs/DATA_CONTRACT.md` for user-versus-system ownership
- Existing `apps/api/src/workspace/` contract and repo path helpers

### Environment Requirements

- Node.js and npm installed for the current repo workspace
- Write access to `apps/api/` and `.spec_system/`
- Prompt sources remain read-only inputs during this session

---

## 4. Scope

### In Scope (MVP)

- Backend can resolve supported workflow intents to exact checked-in mode files
  without inventing a parallel routing table.
- Backend can assemble a structured prompt bundle with explicit layer order for
  operational instructions, shared rules, user overrides, workflow guidance,
  and supporting candidate data.
- Backend can apply legacy fallback rules for `cv.md` and
  `article-digest.md` while keeping the canonical profile paths primary.
- Backend can refresh prompt assets deterministically during local development
  when underlying files change.

### Out of Scope (Deferred)

- Prompt wording cleanup or metadata cleanup - *Reason: active considerations
  say to keep broader prompt cleanup isolated from contract work.*
- UI chat composition, conversation state, or agent orchestration - *Reason:
  later phases own runtime interaction and tool execution.*
- Boot-path health endpoints or cross-package startup wiring - *Reason:
  Session 04 owns the minimal runnable boot path and validation surface.*

---

## 5. Technical Approach

### Architecture

Introduce a focused `apps/api/src/prompt/` module that sits on top of the
workspace adapter and exports one public loader contract. The module should
split responsibilities across small files: workflow routing, source policy,
path resolution, cache or reload behavior, composition, and summary output.

The routing manifest should be derived from the live `AGENTS.md` table and use
checked-in repo-relative mode paths only. The loader should distinguish
instruction layers from supporting profile data rather than flatten everything
into one opaque string too early. A structured bundle should preserve both
order and source identity so later runtime code can inspect what was loaded and
why.

Prompt freshness should favor correctness over cleverness. For local-first use,
the simplest reliable behavior is a read-through cache keyed by resolved source
identity plus file freshness metadata, with deterministic invalidation when the
file changes. Unsupported workflow inputs and missing required mode files
should fail explicitly instead of falling back to hidden defaults.

### Design Patterns

- Registry-first routing: centralize intent-to-mode mapping in one checked-in
  manifest.
- Layered prompt bundles: keep operational instructions, shared rules, user
  overrides, workflow guidance, and supporting data as explicit segments.
- Default-deny resolution: only allow mode files and prompt sources declared by
  the contract.
- Freshness-aware local cache: reload when prompt assets change on disk.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Node standard library file-system and path helpers
- Existing `apps/api/src/workspace/` adapter and repo path helpers
- Node built-in test runner for package-local prompt contract validation

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/prompt/prompt-types.ts` | Shared prompt source, bundle, and workflow types | ~90 |
| `apps/api/src/prompt/workflow-mode-map.ts` | Explicit workflow-to-mode routing manifest | ~120 |
| `apps/api/src/prompt/prompt-source-policy.ts` | Canonical source order and precedence rules | ~120 |
| `apps/api/src/prompt/prompt-resolution.ts` | Safe path and source resolution helpers | ~130 |
| `apps/api/src/prompt/prompt-cache.ts` | Freshness-aware prompt cache and reload behavior | ~120 |
| `apps/api/src/prompt/prompt-compose.ts` | Structured prompt bundle composition helpers | ~110 |
| `apps/api/src/prompt/prompt-loader.ts` | Public prompt loader facade and error mapping | ~160 |
| `apps/api/src/prompt/prompt-summary.ts` | Loader summaries for diagnostics and later boot paths | ~80 |
| `apps/api/src/prompt/test-utils.ts` | Temp-repo prompt fixtures and mutation helpers | ~110 |
| `apps/api/src/prompt/prompt-loader.test.ts` | Package-local routing, precedence, and cache tests | ~220 |
| `apps/api/src/prompt/index.ts` | Package-local barrel export for prompt modules | ~20 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/index.ts` | Expose prompt contract summary in startup diagnostics | ~50 |
| `apps/api/package.json` | Add or refine deterministic prompt-contract test coverage commands | ~10 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Supported workflow intents resolve to exact checked-in mode files and
      unsupported intents fail explicitly.
- [ ] Prompt bundles preserve the declared source order for `AGENTS.md`,
      shared mode, profile mode, workflow mode, and supporting profile assets.
- [ ] Article-digest precedence over CV proof-point metrics is encoded in the
      prompt-source policy when both files exist.
- [ ] Local prompt edits invalidate or refresh cached content deterministically
      without requiring an app restart.

### Testing Requirements

- [ ] Package-local tests cover workflow routing, source order, legacy CV
      fallback, optional article digest handling, and missing-mode failures.
- [ ] `npm run check --workspace @jobhunt/api` passes after the prompt module
      is introduced.
- [ ] `npm run test --workspace @jobhunt/api` passes for the prompt contract
      coverage.
- [ ] Manual verification confirms prompt summary diagnostics do not mutate any
      repo-owned or user-layer file.

### Non-Functional Requirements

- [ ] Prompt loading remains inspectable and avoids hidden prompt text outside
      checked-in repo files.
- [ ] All prompt-source paths are repo-root-relative and ownership-aware.
- [ ] The contract stays narrow enough for Session 04 and later runtime phases
      to reuse without re-deciding routing or precedence rules.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- The repo already defines live routing in `AGENTS.md` and source precedence in
  `modes/_shared.md`; this session should load those rules, not rewrite them.
- Session 02 already established the workspace adapter, so prompt loading
  should reuse that contract instead of re-implementing file ownership logic.
- The app needs structured prompt inputs for later runtime work, but this
  session should stop short of chat UX or agent orchestration.

### Potential Challenges

- Workflow drift: if the route manifest diverges from `AGENTS.md`, later
  runtime behavior will fork. Keep routing centralized and testable.
- Mixed concerns: avoid blending instruction layers with candidate data so
  precedence remains inspectable.
- Cache staleness: use explicit freshness checks and deterministic invalidation
  rather than long-lived hidden state.

### Relevant Considerations

- [P02] **Prompt and metadata cleanup**: keep broader wording cleanup out of
  this session and focus on the loading contract only.
- [P00] **Canonical live surface**: treat `AGENTS.md`, `.codex/skills/`,
  `docs/`, and `modes/` as authoritative.
- [P02] **Trust boundary is file-based**: keep prompt loading anchored to
  checked-in files and temp fixtures, not live user data mutation.
- [P02] **Live contract first**: prefer the checked-in routing and data
  contract over narrative summaries when there is any ambiguity.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- The loader assembles sources in the wrong order and silently changes runtime
  behavior.
- The route resolver permits undeclared mode paths or unsupported workflows.
- Cached prompt assets stay stale after local file edits and hide live changes.

---

## 9. Testing Strategy

### Unit Tests

- Validate workflow intent resolution against the declared route manifest.
- Validate prompt source order, required-versus-optional inputs, and legacy
  fallback behavior.
- Validate cache freshness and invalidation when prompt files change.

### Integration Tests

- Assemble prompt bundles from temp-repo fixtures that mimic the live mode and
  profile surfaces.
- Verify startup diagnostics can summarize the prompt contract using the public
  loader interface.

### Manual Testing

- Run `npm run test --workspace @jobhunt/api` and inspect the prompt summary
  emitted from `apps/api/src/index.ts`.
- Edit a prompt source locally, rerun the loader, and confirm the updated
  source content is reflected without mutating repo files.

### Edge Cases

- Legacy root `cv.md` exists without `profile/cv.md`
- `profile/article-digest.md` is absent
- A requested workflow mode file is missing or not declared
- A prompt asset changes between consecutive loads

---

## 10. Dependencies

### External Libraries

- Node standard library
- Existing TypeScript and `tsx` dev tooling already present in `apps/api`

### Internal Modules

- `apps/api/src/config/repo-paths.ts`
- `apps/api/src/workspace/workspace-adapter.ts`
- `apps/api/src/workspace/workspace-contract.ts`
- `AGENTS.md`
- `modes/_shared.md`

### Other Sessions

- **Depends on**: `phase00-session02-workspace-adapter-contract`
- **Depended by**: `phase00-session04-boot-path-and-validation`, later Phase 01
  runtime and job-orchestration sessions

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
