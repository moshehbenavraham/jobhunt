# Session 04: Batch Flow Validation and Closeout

**Session ID**: `phase02-session04-batch-flow-validation-and-closeout`
**Status**: Not Started
**Estimated Tasks**: ~12-25
**Estimated Duration**: 2-4 hours

---

## Objective

Validate the new batch runtime on controlled flows, capture residual drift,
and prepare Phase 02 for clean validation handoff.

---

## Scope

### In Scope (MVP)

- Run targeted validation for dry-run, resumability, report numbering, and
  structured worker result handling
- Confirm tracker merge and verification steps still behave correctly after
  the runtime change
- Capture residual Phase 03 cleanup items and prepare phase-closeout notes

### Out of Scope

- Broad prompt cleanup or metadata normalization
- Release tasks, version bumps, or archival work owned later in the workflow
- New batch feature work beyond validating the converted runtime

---

## Prerequisites

- [ ] Sessions 01 through 03 completed
- [ ] Batch runtime docs and runner behavior already aligned

---

## Deliverables

1. Validation evidence for the converted batch runtime
2. Residual-runtime notes for Phase 03 handoff
3. Phase 02 closeout inputs ready for `validate` and `updateprd`

---

## Success Criteria

- [ ] Controlled batch flows verify the `codex exec` runner path and
      structured result handling
- [ ] Tracker merge and verification still work after the runtime conversion
- [ ] Remaining cleanup is classified cleanly so Phase 02 can close without
      reopening deferred scope
