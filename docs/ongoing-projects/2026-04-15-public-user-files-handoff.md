# 2026-04-15 Public User Files Handoff

## Status

Completed on 2026-04-15.

- Added `profile/article-digest.example.md`.
- Added `interview-prep/story-bank.example.md`.
- Added `data/follow-ups.example.md`.
- Removed tracked `interview-prep/story-bank.md` from the Git index so the
  real story bank is now treated as ignored user data.
- Aligned docs, prompts, and scripts to the new canonical path set.
- Validation after completion:
  - `npm run doctor` passed
  - `npm run sync-check` returned the existing non-blocking warning about
    example data in `config/profile.yml` (`full_name`)
  - `node scripts/test-all.mjs --quick` passed with `92 passed, 0 failed`

Historical note: the remainder of this file captures the mid-refactor pause
state and resume checklist that were used to finish the work.

## Objective

Continue the public-repo hygiene refactor so user-owned files do not dirty the
public repo on first real use.

The pattern being applied is:

1. canonical user file path
2. ignored real user file
3. tracked example file
4. docs / prompts / scripts / updater / tests aligned to that contract

## What Has Already Been Done

### Phase 1: CV refactor

This part is complete and was validated.

- Canonical CV path moved from `cv.md` to `profile/cv.md`.
- Added tracked scaffold: `profile/cv.example.md`.
- Ignored real user file: `profile/cv.md`.
- Local file was moved from `cv.md` to `profile/cv.md`.
- Live docs, prompts, scripts, updater, and tests were updated.
- Validation already passed for this phase:
  - `npm run doctor`
  - `npm run sync-check`
  - `node scripts/test-all.mjs --quick`

### Phase 2: additional user-file hygiene

This part is only partially implemented. It is **not yet validated**.

The current target set is:

- `profile/article-digest.md`
- `interview-prep/story-bank.md`
- `data/follow-ups.md`

## Current Intent For Phase 2

### `article-digest`

Move the canonical proof-points file from root to:

- `profile/article-digest.md`

Add:

- tracked example: `profile/article-digest.example.md`
- ignored real file: `profile/article-digest.md`

Legacy compatibility note:

- root `article-digest.md` should still be treated as user data if it exists
  from an older checkout.
- current workspace state: both `article-digest.md` and
  `profile/article-digest.md` are missing, so there is no live file to move.

### `story-bank`

Convert `interview-prep/story-bank.md` from a tracked starter template into:

- tracked example: `interview-prep/story-bank.example.md`
- ignored real file: `interview-prep/story-bank.md`

Important:

- `interview-prep/story-bank.md` currently still exists as a tracked file in the
  worktree.
- `.gitignore` has already been changed to ignore `interview-prep/*.md` except
  `README-interview-prep.md` and `story-bank.example.md`.
- The tracked `story-bank.md` still needs to be removed from git and replaced by
  the example file.

### `follow-ups`

Add:

- tracked example: `data/follow-ups.example.md`
- ignored real file: `data/follow-ups.md`

The example should explicitly note that it is optional because the follow-up
mode can create `data/follow-ups.md` automatically on first use.

Current workspace state:

- `data/follow-ups.md` is missing
- `data/follow-ups.example.md` is missing

## Changes Already Applied For Phase 2

These edits are already in the worktree:

- `.gitignore`
  - now ignores `data/follow-ups.md`
  - now ignores `profile/article-digest.md`
  - now ignores legacy root `article-digest.md`
  - now ignores `interview-prep/*.md` except:
    - `interview-prep/README-interview-prep.md`
    - `interview-prep/story-bank.example.md`
- `scripts/update-system.mjs`
  - user-path protections updated toward:
    - `profile/article-digest.md`
    - legacy `article-digest.md`
    - `interview-prep/story-bank.md`
    - `data/follow-ups.md`
  - system-path expectations updated toward:
    - `profile/article-digest.example.md`
    - `interview-prep/story-bank.example.md`
    - `interview-prep/README-interview-prep.md`
    - `data/follow-ups.example.md`
- `scripts/cv-sync-check.mjs`
  - now prefers `profile/article-digest.md`
  - still accepts legacy root `article-digest.md`
  - warning text updated toward the new canonical path
- `scripts/test-all.mjs`
  - expects the new example files
  - treats the new real files as ignored user files
- Live docs and instruction surfaces already partially updated toward the new
  canonical path set:
  - `AGENTS.md`
  - `.codex/skills/career-ops/SKILL.md`
  - `README.md`
  - `docs/DATA_CONTRACT.md`
  - `docs/SETUP.md`
  - `docs/onboarding.md`
  - `docs/ARCHITECTURE.md`
  - `docs/CUSTOMIZATION.md`
  - `docs/SCRIPTS.md`
  - `docs/CONTRIBUTING.md`
  - `docs/examples/README-examples.md`
  - `interview-prep/README-interview-prep.md`
  - `data/README-data.md`

## What Is Still Missing

These concrete tasks are still undone:

1. Add `profile/article-digest.example.md`.
2. Add `interview-prep/story-bank.example.md`.
3. Add `data/follow-ups.example.md`.
4. Remove tracked `interview-prep/story-bank.md` and replace it with the
   example-based contract.
5. Sweep remaining references across modes, batch prompt, docs, and tests.
6. Re-run validation on the final state.

## Expected Resume Checklist

Resume with these steps in order:

1. Create `profile/article-digest.example.md`.
   - It should be a starter proof-point scaffold.
   - It can borrow structure from `docs/examples/article-digest-example.md`.
2. Create `interview-prep/story-bank.example.md`.
   - Base it on the current tracked `interview-prep/story-bank.md` content.
   - Then remove `interview-prep/story-bank.md` from the tracked surface.
3. Create `data/follow-ups.example.md`.
   - Include the markdown table header used by `modes/followup.md`.
   - Add a short note that this file is optional because the mode can create the
     real file automatically.
4. Update all remaining live references from:
   - `article-digest.md` -> `profile/article-digest.md`
   - tracked `story-bank.md` starter wording -> `story-bank.example.md`
   - plain `follow-ups.md` guidance -> mention the optional example where useful
5. Search for stale references with:

   ```bash
   rg -n "article-digest\\.md|story-bank\\.md|follow-ups\\.md|story-bank\\.example|article-digest\\.example|follow-ups\\.example" . -g '!node_modules' -g '!.git'
   ```

6. Validate:

   ```bash
   npm run doctor
   npm run sync-check
   node scripts/test-all.mjs --quick
   ```

## Current File-State Facts

At pause time:

- `profile/cv.md` exists
- `profile/cv.example.md` exists
- `article-digest.md` missing
- `profile/article-digest.md` missing
- `interview-prep/story-bank.md` exists
- `interview-prep/story-bank.example.md` missing
- `data/follow-ups.md` missing
- `data/follow-ups.example.md` missing

## Important Caution

The worktree currently contains both:

- the already-validated CV refactor
- the partially-applied Phase 2 edits

Do **not** assume the current tree is release-ready. Validation needs to be
rerun after completing the missing file creation and final reference sweep.

## Why This Pause Is Safe

This is a safe place to resume because:

- the intent of Phase 2 is now written down explicitly
- the missing work is small and localized
- the resume order is clear
- the previous validated CV refactor should not be reworked unless a new issue
  is discovered
