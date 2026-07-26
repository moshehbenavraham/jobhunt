#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalizeCvBuild,
  createCvBuildJsonSchema,
  getRequiredHeadings,
  parseAndValidateCvBuild,
  renderCvBuild,
} from './cv-build-core.mjs';
import { resolveDocumentTemplate } from './document-templates.mjs';
import { generatePDF, normalizeTextForATS } from './generate-pdf.mjs';
import {
  assertContainedPath,
  ensureContainedDirectory,
  pathIsInside,
} from './path-policy.mjs';
import { formatValidationReport, validatePdf } from './pdf-validation-core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');

function usage() {
  return [
    'Usage:',
    '  node scripts/build-cv.mjs <cv-build.json> <output.pdf> [options]',
    '  node scripts/build-cv.mjs --write-schema=<path>',
    '',
    'Options:',
    '  --root=<path>          Project root (default: repository root)',
    '  --template=<path>      Explicit HTML template under templates/',
    '  --template-name=<name> Named template (or profile default)',
    '  --max-pages=<n>        Maximum PDF pages (default: 2)',
    '  --require-tika         Require Apache Tika parser agreement',
    '  --tika-jar=<path>      Path to tika-app JAR',
  ].join('\n');
}

function parseArgs(args) {
  const options = { maxPages: 2 };
  for (const arg of args) {
    if (arg.startsWith('--write-schema=')) {
      options.schemaOutput = arg.slice('--write-schema='.length);
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length);
    } else if (arg.startsWith('--template=')) {
      options.template = arg.slice('--template='.length);
    } else if (arg.startsWith('--template-name=')) {
      options.templateName = arg.slice('--template-name='.length);
    } else if (arg.startsWith('--max-pages=')) {
      options.maxPages = Number.parseInt(arg.slice('--max-pages='.length), 10);
    } else if (arg === '--require-tika') {
      options.requireTika = true;
    } else if (arg.startsWith('--tika-jar=')) {
      options.tikaJar = arg.slice('--tika-jar='.length);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--') && !options.buildPath) {
      options.buildPath = arg;
    } else if (!arg.startsWith('--') && !options.pdfPath) {
      options.pdfPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(options.maxPages) || options.maxPages < 1) {
    throw new Error('--max-pages must be a positive integer');
  }
  return options;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function hashFile(path) {
  return sha256(await readFile(path));
}

function resolveInsideRoot(root, path, options = {}) {
  return assertContainedPath(root, path, {
    mustExist: options.mustExist ?? false,
    label: options.label || 'Path',
  });
}

function manifestPath(root, path) {
  const rel = relative(resolve(root), resolve(path));
  if (pathIsInside(root, path, { allowRoot: true })) {
    return rel.replaceAll(sep, '/');
  }
  return resolve(path);
}

async function collectSourceHashes(root, build) {
  const sourcePaths = new Set([
    ...build.sourceFiles,
    ...build.evidence.map((item) => item.source),
  ]);
  const optionalArticleDigest = 'profile/article-digest.md';
  if (
    sourcePaths.has('profile/cv.md') &&
    existsSync(resolveInsideRoot(root, optionalArticleDigest))
  ) {
    sourcePaths.add(optionalArticleDigest);
  }

  const sources = [];
  for (const path of [...sourcePaths].sort()) {
    const absolute = resolveInsideRoot(root, path);
    if (!existsSync(absolute)) {
      throw new Error(`CV source file does not exist: ${path}`);
    }
    sources.push({
      path: path.replaceAll('\\', '/'),
      sha256: await hashFile(absolute),
    });
  }
  return sources;
}

async function writeSchema(path) {
  const schema = createCvBuildJsonSchema();
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(schema, null, 2)}\n`);
  return absolute;
}

export async function buildCv(options) {
  const root = resolve(options.root || DEFAULT_ROOT);
  const inputBuildPath = resolve(options.buildPath);
  const outputRoot = ensureContainedDirectory(root, 'output');
  const requestedPdfPath = isAbsolute(options.pdfPath)
    ? resolve(options.pdfPath)
    : String(options.pdfPath).replaceAll('\\', '/').startsWith('output/')
      ? resolve(root, options.pdfPath)
      : resolve(outputRoot, options.pdfPath);
  const outputPdfPath = assertContainedPath(outputRoot, requestedPdfPath, {
    label: 'CV output path',
  });
  if (!outputPdfPath.toLowerCase().endsWith('.pdf')) {
    throw new Error('Output path must end in .pdf');
  }

  const rawBuild = JSON.parse(await readFile(inputBuildPath, 'utf8'));
  const { build, coverage } = await parseAndValidateCvBuild(rawBuild, { root });
  const resolvedTemplate = resolveDocumentTemplate({
    root,
    kind: 'cv',
    name: options.templateName,
    explicitPath: options.template,
  });
  const templatePath = resolvedTemplate.path;
  const template = await readFile(templatePath, 'utf8');
  const html = normalizeTextForATS(renderCvBuild(build, template)).html;

  ensureContainedDirectory(outputRoot, dirname(outputPdfPath), {
    allowRoot: true,
  });
  const base = outputPdfPath.slice(0, -'.pdf'.length);
  const sidecarBuildPath = `${base}.cv-build.json`;
  const htmlPath = `${base}.html`;
  const outputManifestPath = `${base}.manifest.json`;
  const canonicalBuild = canonicalizeCvBuild(build);
  await writeFile(sidecarBuildPath, canonicalBuild);
  await writeFile(htmlPath, html);

  const generated = await generatePDF([
    htmlPath,
    outputPdfPath,
    `--format=${build.job.format}`,
    `--max-pages=${options.maxPages ?? 2}`,
    ...(options.requireTika ? ['--require-tika'] : []),
    ...(options.tikaJar ? [`--tika-jar=${options.tikaJar}`] : []),
  ]);

  const versionPath = resolve(root, 'VERSION');
  const version = existsSync(versionPath)
    ? (await readFile(versionPath, 'utf8')).trim()
    : 'unknown';
  const sourceHashes = await collectSourceHashes(root, build);
  const requiredHeadings = getRequiredHeadings(build);
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    pipeline: {
      name: 'jobhunt',
      version,
      versionSha256: sha256(version),
      renderer: 'playwright-chromium',
    },
    candidate: {
      name: build.candidate.name,
      email: build.candidate.email,
    },
    job: {
      company: build.job.company,
      role: build.job.role,
      format: build.job.format,
      language: build.job.language,
      jdSha256: sha256(build.job.jdText),
    },
    inputs: {
      buildPath: manifestPath(root, sidecarBuildPath),
      buildSha256: await hashFile(sidecarBuildPath),
      templatePath: manifestPath(root, templatePath),
      templateName: resolvedTemplate.name,
      templateSha256: await hashFile(templatePath),
      sources: sourceHashes,
    },
    output: {
      pdfPath: manifestPath(root, outputPdfPath),
      pdfSha256: await hashFile(outputPdfPath),
      htmlPath: manifestPath(root, htmlPath),
      htmlSha256: await hashFile(htmlPath),
      format: build.job.format,
      pageCount: generated.pageCount,
      fileSize: generated.size,
      tagged: true,
      outline: true,
    },
    coverage,
    validation: {
      valid: generated.validation.valid,
      maxPages: options.maxPages ?? 2,
      requiredHeadings,
      checks: generated.validation.checks,
      warnings: generated.validation.warnings,
    },
  };
  await writeFile(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const finalValidation = await validatePdf({
    pdfPath: outputPdfPath,
    root,
    manifestPath: outputManifestPath,
    expectedFormat: build.job.format,
    expectedPages: generated.pageCount,
    maxPages: options.maxPages ?? 2,
    candidateName: build.candidate.name,
    email: build.candidate.email,
    requiredHeadings,
    expectedText: generated.domPreflight.bodyText,
    domPreflight: generated.domPreflight,
    requireTagged: true,
    requireOutline: true,
    requireTika: options.requireTika,
    tikaJar: options.tikaJar,
  });
  if (!finalValidation.valid) {
    throw new Error(formatValidationReport(finalValidation));
  }

  manifest.validation = {
    ...manifest.validation,
    checks: finalValidation.checks,
    warnings: finalValidation.warnings,
    valid: true,
  };
  await writeFile(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    build,
    coverage,
    pdfPath: outputPdfPath,
    htmlPath,
    buildPath: sidecarBuildPath,
    manifestPath: outputManifestPath,
    validation: finalValidation,
  };
}

export async function runBuildCvCli(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (options.schemaOutput) {
    const output = await writeSchema(options.schemaOutput);
    console.log(`CV build schema written: ${output}`);
    return 0;
  }
  if (!options.buildPath || !options.pdfPath) {
    console.error(usage());
    return 1;
  }

  const result = await buildCv(options);
  console.log(`CV build JSON: ${result.buildPath}`);
  console.log(`CV HTML: ${result.htmlPath}`);
  console.log(`CV PDF: ${result.pdfPath}`);
  console.log(`CV manifest: ${result.manifestPath}`);
  console.log(
    `Requirement coverage: must-have ${result.coverage.mustHave.coveragePercent}%, nice-to-have ${result.coverage.niceToHave.coveragePercent}%`,
  );
  console.log(
    `Unsupported terms included: ${result.coverage.unsupportedIncludedCount}`,
  );
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runBuildCvCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(`CV build failed: ${error.message}`);
      process.exitCode = 1;
    });
}
