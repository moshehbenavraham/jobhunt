#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const TEMPLATE_PATH = join(ROOT, 'templates', 'cv-template.tex');

const { compileLatex, generateLatex, validateLatexContent } = await import(
  pathToFileURL(join(ROOT, 'scripts', 'generate-latex.mjs')).href
);

const TEMPLATE = readFileSync(TEMPLATE_PATH, 'utf8');

function buildResolvedTemplate(overrides = {}) {
  let content = TEMPLATE;
  const replacements = {
    '{{NAME}}': 'Test User',
    '{{CONTACT_LINE}}': 'Tel Aviv | Remote',
    '{{EMAIL_URL}}': 'test@example.com',
    '{{{EMAIL_DISPLAY}}}': 'test@example.com',
    '{{{LINKEDIN_URL}}}': 'https://linkedin.com/in/test-user',
    '{{{LINKEDIN_DISPLAY}}}': 'linkedin.com/in/test-user',
    '{{{GITHUB_URL}}}': 'https://github.com/test-user',
    '{{{GITHUB_DISPLAY}}}': 'github.com/test-user',
    '{{EDUCATION}}':
      '\\resumeSubheading{Test University}{2018 -- 2022}{B.S. Computer Science}{Remote}',
    '{{EXPERIENCE}}': [
      '\\resumeSubheading{Example Corp}{2022 -- Present}{Software Engineer}{Remote}',
      '\\resumeItemListStart',
      '\\resumeItem{Built ATS-safe resume tooling for tailored applications.}',
      '\\resumeItemListEnd',
    ].join('\n'),
    '{{PROJECTS}}': [
      '\\resumeProjectHeading{\\textbf{Jobhunt} $|$ Node.js}{2026}',
      '\\resumeItemListStart',
      '\\resumeItem{Added LaTeX validation coverage without disturbing the HTML PDF path.}',
      '\\resumeItemListEnd',
    ].join('\n'),
    '{{SKILLS}}': '\\textbf{Languages}{: JavaScript, SQL, HTML}',
    ...overrides,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replaceAll(placeholder, value);
  }

  return content;
}

function expectIssue(report, expectedSubstring) {
  assert.equal(report.valid, false, 'report should be invalid');
  assert.equal(
    report.compileSkipped,
    true,
    'invalid reports should skip compilation',
  );
  assert.ok(
    report.issues.some((issue) => issue.includes(expectedSubstring)),
    `expected issue containing: ${expectedSubstring}`,
  );
}

function expectValidValidation(report, label) {
  assert.equal(report.valid, true, `${label} should validate`);
  assert.deepEqual(report.issues, [], `${label} should not report issues`);
}

async function writeAndGenerate(tempDir, fileName, content) {
  const inputPath = join(tempDir, fileName);
  writeFileSync(inputPath, content);
  const report = await generateLatex([inputPath]);
  return { inputPath, report };
}

const tempDir = mkdtempSync(join(tmpdir(), 'jobhunt-generate-latex-'));

try {
  {
    const resolvedTemplate = buildResolvedTemplate();
    assert.match(
      resolvedTemplate,
      /\\underline\{test@example\.com\}/,
      'email display text should stay wrapped in \\underline braces',
    );
    assert.match(
      resolvedTemplate,
      /\\href\{https:\/\/linkedin\.com\/in\/test-user\}/,
      'LinkedIn URL should stay wrapped in \\href braces',
    );
    assert.match(
      resolvedTemplate,
      /\\underline\{linkedin\.com\/in\/test-user\}/,
      'LinkedIn display text should stay wrapped in \\underline braces',
    );
    assert.match(
      resolvedTemplate,
      /\\href\{https:\/\/github\.com\/test-user\}/,
      'GitHub URL should stay wrapped in \\href braces',
    );
  }

  {
    const missingSection = buildResolvedTemplate().replace(
      '\\section{Education}',
      '\\section{Education History}',
    );
    const { report } = await writeAndGenerate(
      tempDir,
      'missing-section.tex',
      missingSection,
    );
    expectIssue(report, 'Missing required section category: education');
  }

  {
    const localizedSections = buildResolvedTemplate()
      .replace('\\section{Education}', '\\section{Educaci\u00f3n}')
      .replace('\\section{Work Experience}', '\\section{Experiencia}')
      .replace('\\section{Personal Projects}', '\\section{Proyectos}')
      .replace(
        '\\section{Technical Skills}',
        '\\section{Habilidades T\u00e9cnicas}',
      );
    expectValidValidation(
      validateLatexContent(localizedSections, 'localized-sections.tex'),
      'Localized section headings',
    );
  }

  {
    const customConfiguredSections = [
      '% jobhunt-section-education: Formation Academique',
      '% jobhunt-section-experience: Parcours Professionnel',
      '% jobhunt-section-projects: Realisations Choisies',
      '% jobhunt-section-skills: Outils Maitrises',
      buildResolvedTemplate()
        .replace('\\section{Education}', '\\section{Formation Academique}')
        .replace(
          '\\section{Work Experience}',
          '\\section{Parcours Professionnel}',
        )
        .replace(
          '\\section{Personal Projects}',
          '\\section{Realisations Choisies}',
        )
        .replace('\\section{Technical Skills}', '\\section{Outils Maitrises}'),
    ].join('\n');
    expectValidValidation(
      validateLatexContent(
        customConfiguredSections,
        'custom-configured-sections.tex',
      ),
      'Configured section headings',
    );
  }

  {
    const unresolvedPlaceholder = buildResolvedTemplate({
      '{{NAME}}': '{{NAME}}',
    });
    const { report } = await writeAndGenerate(
      tempDir,
      'unresolved-placeholder.tex',
      unresolvedPlaceholder,
    );
    expectIssue(report, 'Unresolved placeholders: {{NAME}}');
  }

  {
    const missingUnicode = buildResolvedTemplate().replace(
      '\\pdfgentounicode=1',
      '% pdfgentounicode disabled for regression test',
    );
    const { report } = await writeAndGenerate(
      tempDir,
      'missing-pdfgentounicode.tex',
      missingUnicode,
    );
    expectIssue(report, 'Missing \\pdfgentounicode=1 (ATS compatibility)');
  }

  {
    const validInputPath = join(tempDir, 'missing-pdflatex.tex');
    const outputPath = join(tempDir, 'missing-pdflatex.pdf');
    writeFileSync(validInputPath, buildResolvedTemplate());

    const originalPath = process.env.PATH;
    process.env.PATH = '';
    try {
      const result = await compileLatex(validInputPath, outputPath);
      assert.equal(
        result.compiled,
        false,
        'compile should fail without pdflatex',
      );
      assert.match(
        result.compileError,
        /pdflatex is not available on PATH/,
        'compile error should explain the missing toolchain',
      );
    } finally {
      process.env.PATH = originalPath;
    }
  }

  console.log('LaTeX generation regressions pass');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
