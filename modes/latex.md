# Mode: latex - LaTeX / Overleaf CV Export

Use this mode only when the user explicitly wants a LaTeX or Overleaf path.
The default ATS-first flow remains `pdf`.

## Pipeline

1. Read `profile/cv.md` as the source of truth.
2. Read `config/profile.yml` for candidate identity and contact info.
3. Ask the user for the JD if it is not already in context (text or URL).
4. Extract 15-20 JD keywords.
5. Detect the JD language and match the CV language (English by default).
6. Detect the role archetype and adapt the framing.
7. Rewrite the Professional Summary using JD keywords without inventing skills.
8. Select the 3-4 most relevant projects.
9. Reorder experience bullets by JD relevance.
10. Inject keywords naturally into real achievements.
11. Generate the `.tex` file from `templates/cv-template.tex`.
12. Write it to `output/cv-{candidate}-{company}-{YYYY-MM-DD}.tex`.
13. Validate and compile it:

```bash
npm run latex -- output/cv-{candidate}-{company}-{YYYY-MM-DD}.tex output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf
```

14. Report the `.tex` path, `.pdf` path, file sizes, section count, and approximate keyword coverage.

## Operating rules

- This mode is additive and opt-in. Do not replace the existing HTML / Playwright `pdf` flow unless the user explicitly asks for LaTeX.
- If `pdflatex` is missing on `PATH`, stop and tell the user to install TeX Live or MiKTeX, or upload the generated `.tex` file to Overleaf.
- Keep the LaTeX output ATS-safe:
  - single-column layout
  - standard or localized section headers
  - no images or graphics
  - `\pdfgentounicode=1` present
- Escape LaTeX-special characters in user text before inserting it:
  - `&` -> `\&`
  - `%` -> `\%`
  - `$` -> `\$`
  - `#` -> `\#`
  - `_` -> `\_`
  - `{` -> `\{`
  - `}` -> `\}`
  - `~` -> `\textasciitilde{}`
  - `^` -> `\textasciicircum{}`
  - `\` -> `\textbackslash{}`
- Do not escape the first argument to `\href{...}`. Escape only the display text.

## Template placeholders

The template at `templates/cv-template.tex` uses placeholder tokens that must
be fully resolved before compilation:

| Placeholder            | Source                                                                     |
| ---------------------- | -------------------------------------------------------------------------- |
| `{{NAME}}`             | `config/profile.yml -> candidate.full_name`                                |
| `{{CONTACT_LINE}}`     | phone / location / work authorization line built from `config/profile.yml` |
| `{{EMAIL_URL}}`        | raw email for `mailto:`                                                    |
| `{{EMAIL_DISPLAY}}`    | escaped email display text                                                 |
| `{{LINKEDIN_URL}}`     | full LinkedIn URL with scheme                                              |
| `{{LINKEDIN_DISPLAY}}` | escaped LinkedIn display text                                              |
| `{{GITHUB_URL}}`       | full GitHub URL with scheme                                                |
| `{{GITHUB_DISPLAY}}`   | escaped GitHub display text                                                |
| `{{EDUCATION}}`        | `\resumeSubheading` blocks                                                 |
| `{{EXPERIENCE}}`       | `\resumeSubheading` plus `\resumeItem` blocks                              |
| `{{PROJECTS}}`         | `\resumeProjectHeading` plus `\resumeItem` blocks                          |
| `{{SKILLS}}`           | grouped `\textbf{Category}{: items}` lines                                 |

## Validation behavior

`scripts/generate-latex.mjs` rejects incomplete files before compile when any
of the following are missing:

- required section headers
- localized equivalents are accepted for the required education, experience,
  projects, and skills sections
- if a language or heading variant is not covered by the built-in aliases, add
  per-file overrides such as `% jobhunt-section-education: Formation Academique`
- `\resumeSubheading`, `\resumeItem`, or `\resumeProjectHeading` usage
- `\begin{document}` or `\end{document}`
- unresolved placeholders such as `{{NAME}}` or `{{{EMAIL_DISPLAY}}}`
- `\pdfgentounicode=1`

## Overleaf compatibility

The generated `.tex` file is intended to stay self-contained and uploadable to
Overleaf. If local `pdflatex` compilation fails because a package is missing,
the file can still be used in Overleaf after the placeholders are fully
resolved.
