#!/usr/bin/env node

/**
 * generate-latex.mjs - Validate and compile a generated .tex CV file to PDF.
 *
 * Usage:
 *   node scripts/generate-latex.mjs <input.tex> [output.pdf]
 *
 * Requires: pdflatex (TeX Live, MiKTeX, or equivalent) on PATH.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { copyFile, readFile, rm, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

export const REQUIRED_SECTIONS = [
  {
    key: 'education',
    aliases: [
      'Education',
      'Educacion',
      'Educaci\u00f3n',
      'Formacion',
      'Formaci\u00f3n',
      'Formacao',
      'Forma\u00e7\u00e3o',
      'Formation',
      'Ausbildung',
      'Istruzione',
      'Educazione',
      '\u6559\u80b2',
      '\u5b66\u6b74',
    ],
  },
  {
    key: 'experience',
    aliases: [
      'Work Experience',
      'Experience',
      'Professional Experience',
      'Experiencia',
      'Experiencia Profesional',
      'Experiencia Laboral',
      'Experi\u00eancia',
      'Experi\u00eancia Profissional',
      'Exp\u00e9rience',
      'Berufserfahrung',
      'Esperienza',
      '\u5de5\u4f5c\u7ecf\u5386',
      '\u7d4c\u9a13',
    ],
  },
  {
    key: 'projects',
    aliases: [
      'Personal Projects',
      'Projects',
      'Relevant Projects',
      'Selected Projects',
      'Proyectos',
      'Projetos',
      'Projets',
      'Projekte',
      'Progetti',
      '\u9879\u76ee',
      '\u30d7\u30ed\u30b8\u30a7\u30af\u30c8',
    ],
  },
  {
    key: 'skills',
    aliases: [
      'Technical Skills',
      'Skills',
      'Core Skills',
      'Competencies',
      'Competencias',
      'Competencias Tecnicas',
      'Competencias T\u00e9cnicas',
      'Compet\u00eancias',
      'Compet\u00eancias T\u00e9cnicas',
      'Habilidades',
      'Habilidades Tecnicas',
      'Habilidades T\u00e9cnicas',
      'F\u00e4higkeiten',
      'Comp\u00e9tences',
      'Competenze',
      '\u6280\u80fd',
      '\u30b9\u30ad\u30eb',
    ],
  },
];

export const AUXILIARY_EXTENSIONS = [
  '.aux',
  '.fdb_latexmk',
  '.fls',
  '.log',
  '.out',
  '.synctex.gz',
];

function usage() {
  return 'Usage: node scripts/generate-latex.mjs <input.tex> [output.pdf]';
}

function normalizeSectionHeading(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function parseSectionHeadings(content) {
  return [...content.matchAll(/\\section\*?\{([^}]+)\}/g)].map((match) =>
    match[1].trim(),
  );
}

function parseConfiguredSectionAliases(content) {
  const configured = {};

  for (const match of content.matchAll(
    /^\s*%\s*jobhunt-section-(education|experience|projects|skills)\s*:\s*(.+)$/gim,
  )) {
    const [, key, rawAliases] = match;
    const aliases = rawAliases
      .split('|')
      .map((alias) => alias.trim())
      .filter(Boolean);
    if (aliases.length === 0) {
      continue;
    }
    configured[key] = [...(configured[key] || []), ...aliases];
  }

  return configured;
}

function countCommandUsages(content) {
  const counts = {
    resumeItems: 0,
    subheadings: 0,
    projectHeadings: 0,
  };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.includes('\\newcommand')) {
      continue;
    }
    if (/\\resumeItem\{/.test(trimmed)) {
      counts.resumeItems += 1;
    }
    if (
      /\\resumeSubheading(?:\s|$|\{)/.test(trimmed) &&
      !trimmed.includes('\\resumeSubheadingContinue')
    ) {
      counts.subheadings += 1;
    }
    if (/\\resumeProjectHeading(?:\s|$|\{)/.test(trimmed)) {
      counts.projectHeadings += 1;
    }
  }

  return counts;
}

export function findUnresolvedPlaceholders(content) {
  return [
    ...new Set(
      content.match(/\{\{\{[A-Z0-9_]+\}\}\}|\{\{[A-Z0-9_]+\}\}/g) || [],
    ),
  ].sort();
}

export function validateLatexContent(content, filePath = '') {
  const issues = [];
  const counts = countCommandUsages(content);
  const configuredAliases = parseConfiguredSectionAliases(content);
  const sectionHeadings = new Set(
    parseSectionHeadings(content).map(normalizeSectionHeading).filter(Boolean),
  );

  for (const section of REQUIRED_SECTIONS) {
    const acceptedHeadings = new Set(
      [...section.aliases, ...(configuredAliases[section.key] || [])]
        .map(normalizeSectionHeading)
        .filter(Boolean),
    );

    const found = [...acceptedHeadings].some((heading) =>
      sectionHeadings.has(heading),
    );
    if (!found) {
      issues.push(`Missing required section category: ${section.key}`);
    }
  }

  if (counts.subheadings === 0) {
    issues.push('Missing command usage: \\resumeSubheading');
  }
  if (counts.resumeItems === 0) {
    issues.push('Missing command usage: \\resumeItem');
  }
  if (counts.projectHeadings === 0) {
    issues.push('Missing command usage: \\resumeProjectHeading');
  }

  if (!content.includes('\\begin{document}')) {
    issues.push('Missing \\begin{document}');
  }
  if (!content.includes('\\end{document}')) {
    issues.push('Missing \\end{document}');
  }
  if (!content.includes('\\pdfgentounicode=1')) {
    issues.push('Missing \\pdfgentounicode=1 (ATS compatibility)');
  }

  const unresolved = findUnresolvedPlaceholders(content);
  if (unresolved.length > 0) {
    issues.push(`Unresolved placeholders: ${unresolved.join(', ')}`);
  }

  return {
    file: filePath ? basename(filePath) : null,
    path: filePath || null,
    counts,
    issues,
    valid: issues.length === 0,
  };
}

export async function validateLatexFile(inputPath) {
  const absoluteInputPath = resolve(inputPath);
  const content = await readFile(absoluteInputPath, 'utf8');
  const fileInfo = await stat(absoluteInputPath);
  const report = validateLatexContent(content, absoluteInputPath);

  report.sizeKB = Number((fileInfo.size / 1024).toFixed(1));
  return report;
}

function checkPdflatexAvailable() {
  try {
    execFileSync('pdflatex', ['--version'], {
      stdio: 'pipe',
      timeout: 15000,
    });
    return null;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return (
        'pdflatex is not available on PATH. Install TeX Live (Linux/macOS) or ' +
        'MiKTeX (Windows), or upload the generated .tex file to Overleaf.'
      );
    }
    return `Unable to execute pdflatex: ${error.message}`;
  }
}

async function extractCompileError(logPath, fallbackMessage) {
  try {
    const log = await readFile(logPath, 'utf8');
    const lines = log.split('\n');
    const errorLines = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.startsWith('!')) {
        continue;
      }

      errorLines.push(line.trim());
      if (lines[index + 1] && lines[index + 1].trim().startsWith('l.')) {
        errorLines.push(lines[index + 1].trim());
      }
    }

    if (errorLines.length === 0) {
      return fallbackMessage;
    }

    const message = errorLines.slice(0, 4).join('\n');
    if (/File `[^']+' not found\./.test(message)) {
      return `${message}\nInstall the missing TeX package locally or upload the .tex file to Overleaf.`;
    }

    return message;
  } catch {
    return fallbackMessage;
  }
}

export async function compileLatex(inputPath, outputPath) {
  const absoluteInputPath = resolve(inputPath);
  const texDir = dirname(absoluteInputPath);
  const texBase = basename(absoluteInputPath, '.tex');
  const defaultPdfPath = join(texDir, `${texBase}.pdf`);
  const targetPdfPath = outputPath
    ? resolve(outputPath)
    : resolve(defaultPdfPath);
  const logPath = join(texDir, `${texBase}.log`);

  const pdflatexError = checkPdflatexAvailable();
  if (pdflatexError) {
    return {
      compiled: false,
      compileError: pdflatexError,
    };
  }

  if (!existsSync(dirname(targetPdfPath))) {
    mkdirSync(dirname(targetPdfPath), { recursive: true });
  }

  const pdflatexArgs = [
    '-no-shell-escape',
    '-interaction=nonstopmode',
    '-halt-on-error',
    `-output-directory=${texDir}`,
    absoluteInputPath,
  ];

  try {
    execFileSync('pdflatex', pdflatexArgs, {
      cwd: texDir,
      stdio: 'pipe',
      timeout: 120000,
    });
    execFileSync('pdflatex', pdflatexArgs, {
      cwd: texDir,
      stdio: 'pipe',
      timeout: 120000,
    });
  } catch (error) {
    return {
      compiled: false,
      compileError: await extractCompileError(logPath, error.message),
    };
  }

  const result = {
    compiled: true,
  };

  try {
    if (resolve(defaultPdfPath) !== resolve(targetPdfPath)) {
      await copyFile(defaultPdfPath, targetPdfPath);
      await rm(defaultPdfPath).catch(() => {});
    }

    const pdfStats = await stat(targetPdfPath);
    result.pdf = {
      path: targetPdfPath,
      sizeKB: Number((pdfStats.size / 1024).toFixed(1)),
    };
  } catch (error) {
    result.compiled = false;
    result.postCompileError = `Failed to finalize PDF: ${error.message}`;
  }

  if (result.compiled) {
    for (const extension of AUXILIARY_EXTENSIONS) {
      await rm(join(texDir, `${texBase}${extension}`)).catch(() => {});
    }
  }

  return result;
}

export async function generateLatex(args = process.argv.slice(2)) {
  const [inputPath, outputPath, ...extraArgs] = args;

  if (!inputPath || extraArgs.length > 0) {
    throw new Error(usage());
  }

  const absoluteInputPath = resolve(inputPath);
  if (extname(absoluteInputPath).toLowerCase() !== '.tex') {
    throw new Error('Input file must use the .tex extension.');
  }

  const report = await validateLatexFile(absoluteInputPath);
  if (!report.valid) {
    report.compiled = false;
    report.compileSkipped = true;
    return report;
  }

  return {
    ...report,
    ...(await compileLatex(absoluteInputPath, outputPath)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  generateLatex()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      const success =
        report.valid && report.compiled && !report.postCompileError;
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
