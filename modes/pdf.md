# Mode: pdf -- ATS-Optimized PDF Generation

## Full pipeline

1. Read `profile/cv.md` as a source of truth.
2. Ask the user for the JD if it is not already in context (text or URL).
3. Extract 15-20 JD keywords.
4. Detect the JD language and match the CV language (English by default).
5. Detect the company location and choose the page format:
   - US/Canada -> `letter`
   - everywhere else -> `a4`
6. Detect the role archetype and adapt the framing.
7. Rewrite the Professional Summary using JD keywords plus the exit-story bridge.
8. Select the 3-4 most relevant projects.
9. Reorder experience bullets by JD relevance.
10. Build a competency grid from the JD requirements (6-8 keyword phrases).
11. Inject keywords naturally into real achievements. Never invent.
12. Generate the full HTML from the template plus tailored content.
13. Read the candidate name from `config/profile.yml`, normalize it to kebab-case lowercase, and use it as `{candidate}`.
14. Write HTML to `/tmp/cv-{candidate}-{company}.html`.
15. Run:

```bash
node scripts/generate-pdf.mjs /tmp/cv-{candidate}-{company}.html output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf --format={letter|a4}
```

16. Report the PDF path, page count, and approximate keyword coverage.

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

## HTML template

Use `cv-template.html`. Replace the `{{...}}` placeholders with tailored content:

| Placeholder | Content |
| --- | --- |
| `{{LANG}}` | `en` or `es` |
| `{{PAGE_WIDTH}}` | `8.5in` or `210mm` |
| `{{NAME}}` | from profile.yml |
| `{{PHONE}}` | from profile.yml, only when non-empty |
| `{{EMAIL}}` | from profile.yml |
| `{{LINKEDIN_URL}}` | from profile.yml |
| `{{LINKEDIN_DISPLAY}}` | from profile.yml |
| `{{PORTFOLIO_URL}}` | from profile.yml |
| `{{PORTFOLIO_DISPLAY}}` | from profile.yml |
| `{{LOCATION}}` | from profile.yml |
| `{{SECTION_SUMMARY}}` | "Professional Summary" / localized equivalent |
| `{{SUMMARY_TEXT}}` | tailored summary |
| `{{SECTION_COMPETENCIES}}` | "Core Competencies" / localized equivalent |
| `{{COMPETENCIES}}` | competency tags |
| `{{SECTION_EXPERIENCE}}` | "Work Experience" / localized equivalent |
| `{{EXPERIENCE}}` | tailored experience HTML |
| `{{SECTION_PROJECTS}}` | "Projects" / localized equivalent |
| `{{PROJECTS}}` | tailored projects HTML |
| `{{SECTION_EDUCATION}}` | "Education" / localized equivalent |
| `{{EDUCATION}}` | education HTML |
| `{{SECTION_CERTIFICATIONS}}` | "Certifications" / localized equivalent |
| `{{CERTIFICATIONS}}` | certifications HTML |
| `{{SECTION_SKILLS}}` | "Skills" / localized equivalent |
| `{{SKILLS}}` | skills HTML |

## Canva CV generation (optional)

If `config/profile.yml` has `canva_resume_design_id`, offer the user a choice:

- **HTML/PDF (fast, ATS-optimized)**
- **Canva CV (visual, design-preserving)**

If no Canva design ID is configured, skip the prompt and use the HTML/PDF flow.

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

If the role is already in the tracker, update the existing row so the PDF column changes from `❌` to `✅`.
