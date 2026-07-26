# Mode: pdf -- ATS-Optimized PDF Generation

This is the default CV generation mode. Only switch to `modes/latex.md` and
`npm run latex` when the user explicitly wants a LaTeX / Overleaf deliverable.

## Full pipeline

1. Read the candidate sources of truth:
   - `profile/cv.md` (legacy root `cv.md` during migration)
   - `config/profile.yml`
   - `modes/_profile.md`
   - `profile/article-digest.md` when present
2. Ask the user for the JD if it is not already in context (text or URL).
3. Extract every material JD requirement, not an arbitrary keyword count.
   Classify each one as `must-have` or `nice-to-have`.
4. Build a requirement-evidence matrix:
   - `supported`: cite one or more exact evidence records from the source files
   - `unsupported`: leave evidence and included sections empty and record it as
     an explicit gap
   - never include a term declared unsupported anywhere in the CV
5. Detect the JD language and match the CV language (English by default).
6. Detect the company location and choose the page format:
   - US/Canada -> `letter`
   - everywhere else -> `a4`
7. Detect the role archetype and adapt the framing.
8. Tailor the summary, competencies, experience, projects, education,
   certifications, and skills. Every summary, bullet, competency, project,
   education item, certification, and skill group must carry `evidenceIds`.
9. Put the complete build contract in
   `/tmp/cv-build-{candidate}-{company}.json`. Follow
   `templates/cv-build.schema.json`; use
   `scripts/test-fixtures/cv-build-letter.json` as a structural example only.
10. Read the candidate name from `config/profile.yml`, normalize it to
    kebab-case lowercase, and use it as `{candidate}`. Resolve the company and
    role too; fallback words such as `candidate`, `unknown`, `todo`, or `tbd`
    are forbidden in content and filenames.
11. Run:

```bash
npm run cv:build -- \
  /tmp/cv-build-{candidate}-{company}.json \
  output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf \
  --max-pages=2
```

12. Treat a non-zero exit as a failed PDF build. Do not mark the tracker PDF
    column `Yes` unless the sibling `.manifest.json` exists and says
    `validation.valid: true`.
13. Report:
    - the PDF, final HTML, canonical `.cv-build.json`, and manifest paths
    - exact page count and format
    - measured must-have and nice-to-have coverage
    - explicit unsupported gaps
    - any validator warnings

`scripts/build-cv.mjs` is the only default renderer. It validates the Zod
contract and source evidence, renders HTML deterministically, creates a tagged
PDF with an outline, and publishes the PDF only after the finished-file gate
passes. `scripts/generate-pdf.mjs` remains the lower-level HTML renderer; do not
use it directly for a normal tailored CV.

## Finished-file quality gate

The build must fail on any of these:

- malformed PDF (`qpdf`)
- wrong or excessive page count, or wrong Letter/A4 dimensions
- encrypted, untagged, or outline-free output
- missing fonts, unembedded fonts, or fonts without Unicode maps
- candidate name, email, or required headings missing/out of order in
  `pdftotext`
- unresolved placeholders, replacement characters, or zero-width characters
- less than 99% normalized HTML token retention
- disagreement between Poppler and PDF.js (and Apache Tika when configured)
- orphan section headings, dangling separators, or DOM horizontal overflow
- unsupported JD terms included in the CV
- stale or changed build, JD, source, template, HTML, version, or PDF hashes

## ATS rules

- single-column layout
- standard headers: "Professional Summary", "Work Experience", "Education", "Skills", "Certifications", "Projects"
- no critical text in images or SVGs
- no critical text in headers or footers
- UTF-8, selectable text
- no nested tables
- distribute keywords across summary, early bullets, and skills

## PDF design

- **Fonts:** Space Grotesk (headings, 600-700) + DM Sans (body, 400-500)
- **Fonts self-hosted:** `fonts/`
- **Header:** large name, gradient divider, contact row
- **Section headers:** uppercase Space Grotesk, subtle tracking, cyan primary
- **Body:** DM Sans 11px, line-height 1.5
- **Company names:** purple accent
- **Margins:** 0.6in
- **Background:** pure white

## Section order

1. Header
2. Professional Summary
3. Core Competencies
4. Work Experience
5. Projects
6. Education & Certifications
7. Skills

## Keyword-injection strategy

Legitimate reformulation examples:

- JD says "RAG pipelines" and CV says "LLM workflows with retrieval" -> change to "RAG pipeline design and LLM orchestration workflows"
- JD says "MLOps" and CV says "observability, evals, error handling" -> change to "MLOps and observability: evals, error handling, cost monitoring"
- JD says "stakeholder management" and CV says "collaborated with team" -> change to "stakeholder management across engineering, operations, and business"

Never add skills the candidate does not actually have.

## Structured build and HTML template

- `templates/cv-build.schema.json` is the machine-readable input contract.
- `scripts/cv-build-core.mjs` is the deterministic renderer and evidence /
  requirement validator.
- `templates/cv-template.html` owns shared semantic HTML and CSS only.
- Do not manually interpolate template placeholders. The renderer escapes all
  content, omits empty optional contact fields, shortens displayed URLs while
  retaining full link targets, and fails on any unresolved token.
- Keep source excerpts short but exact. A metric in a summary, experience
  bullet, or project description must occur in one of that item's evidence
  excerpts.

## Canva CV generation (optional)

In direct interactive `pdf` requests, if `config/profile.yml` has
`canva_resume_design_id`, offer the user a choice:

- **HTML/PDF (fast, ATS-optimized)**
- **Canva CV (visual, design-preserving)**

If no Canva design ID is configured, skip the prompt and use the HTML/PDF flow.

In `auto-pipeline` or any other unattended flow, do not pause for this choice.
Use the HTML/PDF path by default. Canva is opt-in only when the user explicitly
asks for it.

### Canva workflow

#### Step 1 -- Duplicate the base design

1. `export-design` the base design as PDF.
2. `import-design-from-url` using that PDF URL to create an editable duplicate.
3. Note the new `design_id`.

#### Step 2 -- Read the design structure

1. `get-design-content` for the duplicate.
2. Map text elements to CV sections by content matching:
   - candidate name -> header
   - "Summary" / "Professional Summary" -> summary
   - company names from `profile/cv.md` -> experience
   - degree or school names -> education
   - skill keywords -> skills
3. If mapping fails, show the user what was found and ask for guidance.

#### Step 3 -- Generate tailored content

Reuse the same content-generation rules from the HTML flow.

**Character-budget rule:** each replacement should stay within roughly +/-15% of the original character count so fixed text boxes do not overflow.

#### Step 4 -- Apply edits

1. `start-editing-transaction`
2. `perform-editing-operations` with `find_and_replace_text`
3. Reflow layout after text replacement by reading updated positions and moving downstream work-experience elements to keep spacing even
4. `get-design-thumbnail` and visually inspect for overlap or clipping
5. Iterate until the layout is clean
6. Show the preview to the user
7. `commit-editing-transaction` only after user approval

#### Step 5 -- Export and download the PDF

1. `export-design` as PDF
2. Download immediately:

```bash
curl -sL -o "output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf" "{download_url}"
```

3. Verify the file:

```bash
file output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf
```

It must report a PDF document. If it returns XML or HTML, re-export and retry.

4. Report the PDF path, file size, and Canva design URL.

### Error handling

- If `import-design-from-url` fails, fall back to the HTML/PDF flow.
- If text elements cannot be mapped, warn the user and ask for manual mapping.
- If `find_and_replace_text` finds no matches, broaden the substring matching.
- Always provide the Canva design URL so the user can finish manual tweaks if needed.

## After generation

If the role is already in the tracker, update the existing row so the PDF
column changes from `No` to `Yes` only after running:

```bash
npm run pdf:validate -- \
  output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf \
  --manifest=output/cv-{candidate}-{company}-{YYYY-MM-DD}.manifest.json \
  --quiet
```
