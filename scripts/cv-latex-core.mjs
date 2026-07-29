function escapeLatex(value) {
  return String(value)
    .replaceAll('\\', '\\textbackslash{}')
    .replaceAll('&', '\\&')
    .replaceAll('%', '\\%')
    .replaceAll('$', '\\$')
    .replaceAll('#', '\\#')
    .replaceAll('_', '\\_')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}')
    .replaceAll('~', '\\textasciitilde{}')
    .replaceAll('^', '\\textasciicircum{}');
}

function safeLatexUrl(value) {
  if (!value) return '';
  const url = new URL(value);
  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
    throw new Error(`Unsupported LaTeX URL protocol: ${url.protocol}`);
  }
  return String(value)
    .replaceAll('\\', '')
    .replaceAll('%', '\\%')
    .replaceAll('#', '\\#')
    .replaceAll('_', '\\_')
    .replaceAll('{', '')
    .replaceAll('}', '');
}

function section(label, content) {
  return `\\section{${escapeLatex(label)}}\n${content}`;
}

function renderExperience(build) {
  return build.experience
    .map((job) =>
      [
        `\\resumeSubheading{${escapeLatex(job.company)}}{${escapeLatex(job.period)}}{${escapeLatex(job.role)}}{${escapeLatex(job.location || '')}}`,
        '\\resumeItemListStart',
        ...job.bullets.map(
          (bullet) => `\\resumeItem{${escapeLatex(bullet.text)}}`,
        ),
        '\\resumeItemListEnd',
      ].join('\n'),
    )
    .join('\n');
}

function renderProjects(build) {
  return build.projects
    .map((project) =>
      [
        `\\resumeProjectHeading{\\textbf{${escapeLatex(project.name)}}}{${escapeLatex(project.technologies.join(', '))}}`,
        '\\resumeItemListStart',
        `\\resumeItem{${escapeLatex(project.description)}}`,
        '\\resumeItemListEnd',
      ].join('\n'),
    )
    .join('\n');
}

function renderEducation(build) {
  return build.education
    .map(
      (item) =>
        `\\resumeSubheading{${escapeLatex(item.institution)}}{${escapeLatex(item.year || '')}}{${escapeLatex(item.degree)}}{${escapeLatex(item.description || '')}}`,
    )
    .join('\n');
}

function listSection(label, body) {
  return section(
    label,
    `\\resumeSubHeadingListStart\n${body}\n\\resumeSubHeadingListEnd`,
  );
}

function strictReplace(template, replacements) {
  const tokens = [
    ...new Set(
      [...template.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((match) => match[1]),
    ),
  ];
  const missing = tokens.filter((token) => !Object.hasOwn(replacements, token));
  if (missing.length > 0) {
    throw new Error(
      `Missing LaTeX template replacements: ${missing.join(', ')}`,
    );
  }
  let output = template;
  for (const token of tokens) {
    output = output.replaceAll(`{{${token}}}`, replacements[token]);
  }
  if (/\{\{\{?[A-Z0-9_]+\}?\}\}/.test(output)) {
    throw new Error('Unresolved LaTeX template placeholders');
  }
  return output;
}

export function renderCvBuildLatex(build, template) {
  const linkedin = build.candidate.linkedin || '';
  const portfolio = build.candidate.portfolio || '';
  const contactLine = [build.candidate.location, build.candidate.phone]
    .filter(Boolean)
    .join(' | ');
  const competencies = build.competencies.map((item) => item.label).join(', ');
  const skills = build.skills
    .map(
      (group) =>
        `\\textbf{${escapeLatex(group.category)}}{: ${escapeLatex(group.items.join(', '))}}`,
    )
    .join(' \\\\\n');
  return strictReplace(template, {
    NAME: escapeLatex(build.candidate.name),
    CONTACT_LINE: escapeLatex(contactLine),
    EMAIL_URL: safeLatexUrl(`mailto:${build.candidate.email}`).replace(
      /^mailto:/,
      '',
    ),
    EMAIL_DISPLAY: escapeLatex(build.candidate.email),
    LINKEDIN_URL: safeLatexUrl(linkedin),
    LINKEDIN_DISPLAY: escapeLatex(build.candidate.linkedinDisplay || linkedin),
    GITHUB_URL: safeLatexUrl(portfolio),
    GITHUB_DISPLAY: escapeLatex(build.candidate.portfolioDisplay || portfolio),
    SUMMARY_SECTION: section(
      build.labels.summary,
      `\\small{${escapeLatex(build.summary)}}`,
    ),
    COMPETENCIES_SECTION: section(
      build.labels.competencies,
      `\\small{${escapeLatex(competencies)}}`,
    ),
    EDUCATION_SECTION:
      build.education.length > 0
        ? listSection(build.labels.education, renderEducation(build))
        : '% jobhunt-optional-section-education: omitted',
    EXPERIENCE_SECTION: listSection(
      build.labels.experience,
      renderExperience(build),
    ),
    PROJECTS_SECTION:
      build.projects.length > 0
        ? listSection(build.labels.projects, renderProjects(build))
        : '% jobhunt-optional-section-projects: omitted',
    SKILLS_SECTION: section(
      build.labels.skills,
      `\\vspace{-7pt}\n\\begin{itemize}[leftmargin=0.15in, label={}]\\small{\\item{\n${skills}\n}}\\end{itemize}`,
    ),
  });
}

export { escapeLatex, safeLatexUrl };
