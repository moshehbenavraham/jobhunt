# 2026-04-19 Upstream Import Plan

## Scope

This plan covers a curated import of the upstream changes that look useful for
this fork:

- `7c5fecb` - dependency-review workflow hardening when GitHub dependency graph
  is missing
- `379e062` - branded `careers_url` guidance for scan docs and template config
- `b824953` - LaTeX / Overleaf CV export capability, adapted to this repo's
  current structure
- `71dcf10` - CodeQL workflow action bump from `v3` to `v4`
- `9b38009` - Labeler workflow action bump from `v5` to `v6`

Goal:

- import the objectively useful upstream changes without undoing the fork's
  current file layout, data contract, and Codex-first operating model

## Upstream Review Watermark

This document is the canonical upstream review marker for this import pass.

- reviewed upstream range: `2051beb` (`v1.5.0`) through `411afb3`
  (`upstream/main` on 2026-04-19)
- future upstream audits should start after `411afb3`, not from `2051beb`
- this is a review watermark, not a claim that this fork is code-identical to
  upstream through `411afb3`

Per-commit disposition for the reviewed range:

- `10c496c` - reviewed and skipped; generic upstream README change with no
  fork-specific value
- `3a4c596` - reviewed and skipped; PT-BR diacritical restoration is
  upstream-content maintenance outside this fork's import priorities
- `1d60ad5` - reviewed and skipped as a direct import; the important scanner
  truthfulness point is already reflected locally in `modes/scan.md`
- `b824953` - imported in adapted form across Sessions 2 and 3 as the repo-
  native optional LaTeX export path
- `98f9110` - reviewed and skipped; low-priority workflow maintenance with less
  value than the selected import set
- `9b38009` - imported in Session 1
- `71dcf10` - imported in Session 1
- `7c5fecb` - imported in Session 1
- `96a64d1` - reviewed and skipped; upstream README translation addition is not
  needed for this fork
- `379e062` - imported in Session 1
- `0853486` - reviewed and skipped; Gemini CLI integration does not fit the
  fork's Codex-first operating model or current layout
- `411afb3` - reviewed and skipped; contributor-recognition docs change has no
  meaningful impact on this fork's runtime or operator workflow

Non-goals for this plan:

- do not blindly cherry-pick upstream commits into the fork
- do not reintroduce root-level legacy paths such as `cv.md` as the primary
  source of truth
- do not replace the current HTML / Playwright PDF flow as the default CV path
- do not pull in the Gemini-specific integration or provider-specific runtime
  dependencies
- do not modify user-layer files such as `profile/cv.md`, `config/profile.yml`,
  `config/portals.yml`, `data/*`, `reports/*`, or `output/*`

## Session 1. Import low-risk workflow and scan guidance fixes

Focus:

- land the direct CI hardening fix first
- align scan guidance with the branded `careers_url` rule
- optionally batch the low-risk workflow action bumps if they stay clean

Implementation targets:

- `.github/workflows/dependency-review.yml`
- `modes/scan.md`
- `config/portals.example.yml`
- optional tail in the same pass:
  - `.github/workflows/codeql.yml`
  - `.github/workflows/labeler.yml`

Concrete changes:

- port the `7c5fecb` behavior into `dependency-review.yml`:
  - add `continue-on-error: true` to the dependency review step
  - keep `fail-on-severity: high`
  - keep PR comment summaries enabled
  - preserve the upstream TODO note so the temporary nature is explicit
- port the useful guidance from `379e062` into `modes/scan.md`:
  - prefer branded company careers pages first
  - use ATS-hosted pages only as fallback
  - explain why raw ATS URLs can produce false 410 or mismatched job ID issues
  - keep the wording honest about this repo's current scanner behavior
- port the matching config comments into `config/portals.example.yml`
- if the workflow files are otherwise unchanged, include the low-priority action
  bumps in the same review pass:
  - `github/codeql-action` `v3 -> v4`
  - `actions/labeler` `v5 -> v6`

Acceptance bar:

- workflow YAML stays valid and readable
- dependency review no longer creates avoidable PR friction when dependency
  graph is unavailable
- scan docs and template clearly steer users toward branded company careers URLs
- no runtime scan behavior is implied in docs unless the current code actually
  does it

Implementation status on 2026-04-19:

- completed: `dependency-review.yml` now carries the upstream-style temporary
  TODO note and `continue-on-error: true` guard for missing dependency graph
  data
- completed: `modes/scan.md` and `config/portals.example.yml` now prefer
  branded `careers_url` values first, while documenting the current scanner
  nuance that branded pages often need explicit `api:`
- completed: `.github/workflows/codeql.yml` was bumped from
  `github/codeql-action@v3` to `@v4`
- completed: `.github/workflows/labeler.yml` was bumped from
  `actions/labeler@v5` to `@v6`
- validation: touched workflow and template YAML parsed successfully
- validation: Prettier check passed on all touched files
- validation: `node scripts/test-all.mjs --quick` still reports unrelated
  existing failures in batch-runner regression tests and version drift between
  `VERSION` and `package.json`; none of those files were changed in this
  session

## Session 2. Add a repo-native LaTeX export foundation

Focus:

- bring in the useful part of `b824953` without inheriting upstream's older
  repo layout
- make LaTeX export additive and opt-in beside the existing HTML / PDF flow

Implementation targets:

- `scripts/generate-latex.mjs`
- `templates/cv-template.tex`
- `modes/latex.md`
- `package.json`
- optional supporting docs:
  - `docs/SCRIPTS.md`
  - `templates/README-templates.md`

Concrete changes:

- move the upstream script into the repo's current `scripts/` layout
- adapt all path assumptions to the current source of truth:
  - `profile/cv.md`
  - `config/profile.yml`
  - `output/`
  - `scripts/`
- keep the CLI repo-native, for example:

```bash
node scripts/generate-latex.mjs <input.tex> <output.pdf>
```

- preserve the useful validation behavior before compile:
  - required sections present
  - required commands present
  - `\begin{document}` and `\end{document}` present
  - unresolved placeholders rejected
  - ATS-specific settings such as `\pdfgentounicode=1` enforced
- compile via `pdflatex` only when available on `PATH`
- emit a clear actionable error when `pdflatex` is missing instead of silently
  failing
- keep the current HTML / Playwright PDF generator untouched and fully
  supported
- avoid new external API dependencies; this should stay a local templating and
  compile feature

Acceptance bar:

- a valid `.tex` CV can be compiled into `output/*.pdf`
- invalid or incomplete `.tex` files fail with actionable diagnostics
- the existing HTML / PDF flow still works exactly as before
- no root-level legacy path conventions are reintroduced

Implementation status on 2026-04-19:

- completed: added repo-native `scripts/generate-latex.mjs` with pre-compile
  validation, optional output path support, `pdflatex` compilation, auxiliary
  file cleanup, and clear missing-toolchain diagnostics
- completed: added `templates/cv-template.tex` as the repo-local LaTeX /
  Overleaf resume template, keeping the feature additive beside the existing
  HTML / Playwright PDF path
- completed: added `modes/latex.md` with repo-correct `profile/cv.md`,
  `config/profile.yml`, `templates/cv-template.tex`, `output/`, and
  `scripts/generate-latex.mjs` guidance
- completed: added `npm run latex` to `package.json`
- completed: updated `templates/README-templates.md` to surface the new
  template
- validation: `node scripts/generate-latex.mjs templates/cv-template.tex`
  fails before compile with unresolved-placeholder and missing-command
  diagnostics, as intended
- validation: a fully resolved smoke-test `.tex` file compiled successfully to
  PDF via `node scripts/generate-latex.mjs /tmp/jobhunt-latex-smoke.tex
/tmp/jobhunt-latex-smoke.pdf`
- validation: simulating a missing `pdflatex` on `PATH` returns a clear
  actionable error instead of failing silently
- validation: `node --check scripts/generate-latex.mjs` passed
- validation: Prettier check passed on the touched script, docs, and
  `package.json`
- validation: `node scripts/test-all.mjs --quick` still reports the same
  unrelated baseline failures from Session 1 in batch-runner regression tests
  and `VERSION` versus `package.json` / `package-lock.json` drift; no new
  LaTeX-specific failures were introduced
- note: `docs/SCRIPTS.md` and automated regression coverage remain deferred to
  Session 3 by design

## Session 3. Integrate LaTeX into the operator surface, docs, and tests

Focus:

- make the new capability usable and maintainable
- keep the mode boundary explicit so the default workflow does not become
  ambiguous

Implementation targets:

- `docs/SCRIPTS.md`
- `README.md` if the public command surface changes
- `scripts/test-all.mjs`
- `scripts/test-generate-latex.mjs`
- `modes/pdf.md` only if a short cross-reference is needed

Concrete changes:

- document prerequisites:
  - `pdflatex` required
  - supported TeX distributions such as TeX Live or MiKTeX
  - expected output paths and failure modes
- add regression coverage for the new validation surface:
  - missing section detection
  - unresolved placeholder detection
  - missing `\pdfgentounicode=1`
  - graceful error behavior when compile prerequisites are missing
- wire the new regression script into `scripts/test-all.mjs`
- decide whether to expose a convenience package script such as:

```bash
npm run latex -- input.tex output.pdf
```

- document the operator choice clearly:
  - `pdf` remains the default ATS-first flow
  - `latex` is optional when the user explicitly wants a LaTeX / Overleaf path

Acceptance bar:

- the test suite covers the non-compile validation path
- docs make the HTML / PDF versus LaTeX boundary explicit
- operators can tell when to use the new flow without guessing

Implementation status on 2026-04-19:

- completed: updated `docs/SCRIPTS.md` to document `npm run latex`,
  `pdflatex` prerequisites, default output behavior, JSON failure reporting,
  and Overleaf fallback
- completed: updated `README.md` to expose `npm run latex` in the public
  command surface while keeping `npm run pdf` as the default ATS-first export
- completed: updated `modes/pdf.md` with an explicit boundary note pointing
  operators to `modes/latex.md` only when the user explicitly wants a LaTeX /
  Overleaf deliverable
- completed: added `scripts/test-generate-latex.mjs` covering missing required
  section detection, unresolved placeholder detection, missing
  `\\pdfgentounicode=1` detection, and clear missing-`pdflatex` behavior
- completed: wired `scripts/test-generate-latex.mjs` into
  `scripts/test-all.mjs --quick`
- completed: extended `scripts/test-all.mjs` system-file checks to cover the
  new `modes/latex.md` and `templates/cv-template.tex` surfaces
- validation: `node --check scripts/test-generate-latex.mjs` passed
- validation: `node scripts/test-generate-latex.mjs` passed
- validation: Prettier check passed on `docs/SCRIPTS.md`, `README.md`,
  `modes/pdf.md`, `scripts/test-generate-latex.mjs`, and
  `scripts/test-all.mjs`
- validation: ASCII check passed on all Session 3 touched files
- validation: `node scripts/test-all.mjs --quick` now includes the LaTeX
  regression and reports `112 passed, 6 failed, 0 warnings`
- validation: the remaining six quick-suite failures are still the unrelated
  baseline issues from earlier sessions:
  - batch-runner contract path quoting mismatch
  - batch-runner state-semantics completed-versus-failed mismatch
  - batch-runner closeout completed-versus-failed mismatch
  - `VERSION` versus `package.json` drift
  - `VERSION` versus `package-lock.json` root version drift
  - `VERSION` versus `package-lock.json packages[""]` version drift

Follow-up stabilization on 2026-04-19:

- completed: resolved the batch-runner contract drift by removing backticks
  around the `RESULT_FILE:` control line in `batch/batch-prompt.md`, so mock
  and real workers receive the same raw artifact path
- completed: aligned `package.json` and `package-lock.json` back to the
  authoritative `VERSION` file value `1.5.24`
- completed: normalized the touched `batch/batch-prompt.md` table entry to stay
  ASCII-only after the prompt-contract fix
- validation: `node scripts/test-batch-runner-contract.mjs` passed
- validation: `node scripts/test-batch-runner-state-semantics.mjs` passed
- validation: `node scripts/test-batch-runner-closeout.mjs` passed
- validation: `node scripts/test-all.mjs --quick` now reports
  `118 passed, 0 failed, 0 warnings`

## Deferred Maintenance Tail

These changes are worth taking, but they are lower value than the CI fix and
the LaTeX import:

- `71dcf10` - bump `github/codeql-action` from `v3` to `v4`
- `9b38009` - bump `actions/labeler` from `v5` to `v6`

Handling plan:

- include them in Session 1 only if they remain syntax-only maintenance with no
  behavioral drift
- otherwise land them as a separate tiny maintenance PR after the functional
  imports
- do not mix them into the LaTeX implementation PR

Update on 2026-04-19:

- `71dcf10` and `9b38009` were folded into Session 1 after confirming the
  current workflow syntax and `.github/labeler.yml` shape remain compatible

## Recommended Delivery Order

1. PR 1 - CI and scan guidance
   - `7c5fecb`
   - `379e062`
   - optional `71dcf10` and `9b38009`
2. PR 2 - LaTeX foundation
   - script
   - template
   - mode
   - package surface
3. PR 3 - LaTeX docs and tests
   - script reference
   - regression coverage
   - final operator guidance polish

## Risks And Guardrails

- Docs drift risk: keep `modes/scan.md` honest about the current scanner and do
  not copy upstream discovery claims that are not true here.
- Toolchain risk: `pdflatex` will not exist in every environment, so missing
  toolchain behavior must fail clearly and safely.
- Flow ambiguity risk: `modes/pdf.md` should remain the default route; LaTeX
  should be explicitly opt-in.
- Data contract risk: the import must stay in the system layer only and avoid
  touching user personalization or generated outputs.

## Definition Of Done

This import set should be considered complete when:

- dependency review is hardened against missing dependency graph state
- scan docs and config comments teach branded careers URLs first
- LaTeX export exists as a repo-native optional capability
- the LaTeX path is documented and regression-tested
- the workflow version bumps are either landed cleanly or left as explicitly
  deferred low-risk follow-up work
