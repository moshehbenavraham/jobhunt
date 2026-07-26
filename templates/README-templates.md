# Templates

System-layer template files used by jobhunt scripts and modes. These files are auto-updated when you run `npm run update` -- put user customizations in the user-layer files instead (see `docs/DATA_CONTRACT.md`).

## Files

| File                             | Used By                                                                                      | Purpose                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `cover-letter-build.schema.json` | `scripts/build-cover-letter.mjs`                                                             | Structured letter, trigger, and evidence contract    |
| `cover-letter-template.html`     | `scripts/cover-letter-core.mjs`, `scripts/generate-pdf.mjs`                                  | Semantic one-page cover-letter template              |
| `cv-build.schema.json`           | `scripts/build-cv.mjs`                                                                       | Structured CV, evidence, and JD requirement contract |
| `cv-template.html`               | `scripts/cv-build-core.mjs`, `scripts/generate-pdf.mjs`                                      | Semantic HTML/CSS for ATS-optimized CV PDFs          |
| `cv-template.tex`                | `scripts/generate-latex.mjs`                                                                 | LaTeX / Overleaf template for ATS-optimized CV PDFs  |
| `states.yml`                     | `scripts/verify-pipeline.mjs`, `scripts/normalize-statuses.mjs`, `scripts/merge-tracker.mjs` | Canonical application states and their aliases       |

### cover-letter-build.schema.json

The machine-readable contract for deterministic cover-letter builds. It
requires an explicit generation trigger, observed form status, exact source
evidence for every non-closing paragraph, and `humanReviewRequired: true`.
Generate or refresh it with:

```bash
npm run cover-letter -- --write-schema=templates/cover-letter-build.schema.json
```

See `scripts/test-fixtures/cover-letter-build.json` for a synthetic example.

### cover-letter-template.html

The semantic one-page template for optional cover-letter PDFs. It uses the same
self-hosted font and ATS text rules as the CV pipeline while keeping Markdown
as the editable source of truth.

Keep all renderer tokens intact and run `npm run cover-letter:test` after
changing the template.

### cv-build.schema.json

The machine-readable Zod-derived input contract for deterministic CV builds.
It requires a complete requirement-evidence matrix and evidence references on
all candidate claims. Generate or refresh it with:

```bash
npm run cv:build -- --write-schema=templates/cv-build.schema.json
```

See `scripts/test-fixtures/cv-build-letter.json` for a synthetic example.

### cv-template.html

The semantic HTML template rendered by Playwright into PDF. The deterministic
renderer fills its document, contact, and complete-section tokens. Do not
manually interpolate it during a normal CV build.

**Design:** Space Grotesk headings + DM Sans body, single-column ATS-safe layout, self-hosted fonts from `fonts/`.

**Customization:** Edit this file to change colors, spacing, or section order.
Keep the renderer tokens intact and run `npm run pdf:test` after any change.

### cv-template.tex

The LaTeX template used for optional Overleaf-compatible CV generation. It uses placeholder tokens (`{{NAME}}`, `{{EXPERIENCE}}`, `{{PROJECTS}}`, etc.) that must be fully resolved before compilation.

**Design:** Single-column ATS-safe layout with standard section headings and `\pdfgentounicode=1` enabled for machine-readable output.

**Usage:**

```bash
npm run latex -- output/cv-name-company-date.tex output/cv-name-company-date.pdf
```

**Prerequisites:** `pdflatex` on `PATH` via TeX Live, MiKTeX, or equivalent. If local compilation is unavailable, upload the generated `.tex` file to Overleaf instead.

**Customization:** Edit this file to change spacing, section order, or formatting commands. Placeholder guidance lives in `modes/latex.md`.

### states.yml

Defines the 9 canonical application states (`Evaluated`, `Applied`,
`Responded`, `Interview`, `Offer`, `Hired`, `Rejected`, `Discarded`, `SKIP`)
with aliases for common variants. Node and dashboard writers validate status
transitions against this file.

**Do not rename states** -- the dashboard and all scripts depend on these exact IDs. You can add aliases if you encounter new variants that should map to an existing state.
