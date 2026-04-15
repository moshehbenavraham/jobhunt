# Session 03: Batch Runtime Docs Alignment

**Session ID**: `phase02-session03-batch-runtime-docs-alignment`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours

---

## Objective

Align the batch-owned operational docs with the live `codex exec` runtime and
the structured worker result contract.

---

## Scope

### In Scope (MVP)

- Update batch-owned documentation such as `batch/README-batch.md` and the
  relevant batch sections of `docs/ARCHITECTURE.md`
- Document the structured worker result contract, batch-state expectations,
  and validation path for operators
- Make only the narrowly scoped runtime edits needed in other batch-facing
  surfaces if they block Phase 02 validation

### Out of Scope

- Repo-wide prompt and mode wording cleanup owned by Phase 03
- Non-batch metadata normalization
- New product features outside the existing batch workflow

---

## Prerequisites

- [ ] Sessions 01 and 02 completed
- [ ] The runtime contract and state semantics are settled

---

## Deliverables

1. Updated batch operator docs for the Codex-native runner
2. Updated architecture notes that describe the structured batch contract
3. A clear boundary between Phase 02 runtime docs and Phase 03 wording cleanup

---

## Success Criteria

- [ ] Batch operators can follow the docs using `codex exec`, not `claude -p`
- [ ] The worker result contract is documented where batch operators and
      contributors expect to find it
- [ ] Any remaining prompt or metadata cleanup is explicitly tagged for
      Phase 03 rather than silently mixed into Phase 02
