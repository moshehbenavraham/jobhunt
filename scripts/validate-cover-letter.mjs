#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAndValidateCoverLetterBuild } from './cover-letter-core.mjs';
import { validatePdf } from './pdf-validation-core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function hashFile(path) {
  return sha256(await readFile(path));
}

function isInside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return (
    rel === '' ||
    (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
  );
}

function resolveArtifact(root, path) {
  if (!path) throw new Error('artifact path is missing');
  const absolute = isAbsolute(path) ? resolve(path) : resolve(root, path);
  if (!isInside(root, absolute)) {
    throw new Error(`artifact path escapes project root: ${path}`);
  }
  return absolute;
}

async function checkHash(report, root, label, path, expected) {
  if (!path || !expected) {
    report.errors.push(`${label} path or hash is missing`);
    return null;
  }
  try {
    const absolute = resolveArtifact(root, path);
    const actual = await hashFile(absolute);
    if (actual !== expected) {
      report.errors.push(`${label} changed: ${path}`);
    }
    return absolute;
  } catch (error) {
    report.errors.push(`${label} is unavailable: ${path} (${error.message})`);
    return null;
  }
}

export async function validateCoverLetterManifest(options) {
  const root = resolve(options.root || DEFAULT_ROOT);
  const manifestPath = resolve(options.manifestPath);
  if (!isInside(root, manifestPath)) {
    throw new Error('Manifest path must stay inside the project');
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const report = {
    schemaVersion: 1,
    artifactType: 'cover-letter',
    manifestPath,
    valid: false,
    errors: [],
    warnings: [],
    pdfValidation: null,
  };

  if (manifest.schemaVersion !== 1) {
    report.errors.push(
      `unsupported manifest schema version: ${manifest.schemaVersion}`,
    );
  }
  if (manifest.artifactType !== 'cover-letter') {
    report.errors.push(
      `manifest artifact type is not cover-letter: ${manifest.artifactType}`,
    );
  }
  if (manifest.review?.humanReviewRequired !== true) {
    report.errors.push('manifest does not require human review');
  }
  if (manifest.review?.status !== 'draft') {
    report.errors.push('cover letter must remain marked as a draft');
  }
  if (manifest.validation?.valid !== true) {
    report.errors.push('manifest does not record successful generation');
  }
  if (manifest.evidence?.valid !== true) {
    report.errors.push('manifest does not record successful evidence checks');
  }

  const buildPath = await checkHash(
    report,
    root,
    'structured build',
    manifest.inputs?.buildPath,
    manifest.inputs?.buildSha256,
  );
  await checkHash(
    report,
    root,
    'template',
    manifest.inputs?.templatePath,
    manifest.inputs?.templateSha256,
  );
  const markdownPath = await checkHash(
    report,
    root,
    'markdown draft',
    manifest.output?.markdownPath,
    manifest.output?.markdownSha256,
  );
  await checkHash(
    report,
    root,
    'rendered HTML',
    manifest.output?.htmlPath,
    manifest.output?.htmlSha256,
  );

  const seenSources = new Set();
  for (const source of manifest.inputs?.sources || []) {
    if (seenSources.has(source.path)) {
      report.errors.push(`duplicate source hash entry: ${source.path}`);
      continue;
    }
    seenSources.add(source.path);
    await checkHash(report, root, 'profile source', source.path, source.sha256);
  }
  if (seenSources.size === 0) {
    report.errors.push('profile source hashes are missing');
  }

  try {
    const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
    if (manifest.pipeline?.version !== version) {
      report.errors.push(
        `pipeline version changed: ${manifest.pipeline?.version || 'missing'} -> ${version}`,
      );
    }
    if (manifest.pipeline?.versionSha256 !== sha256(version)) {
      report.errors.push('pipeline version hash does not match VERSION');
    }
  } catch (error) {
    report.errors.push(`pipeline VERSION is unavailable (${error.message})`);
  }

  if (buildPath) {
    try {
      const rawBuild = JSON.parse(await readFile(buildPath, 'utf8'));
      const { build, evidence } = await parseAndValidateCoverLetterBuild(
        rawBuild,
        { root },
      );
      if (sha256(build.job.jdText) !== manifest.job?.jdSha256) {
        report.errors.push('job description hash does not match the build');
      }
      if (
        build.candidate.name !== manifest.candidate?.name ||
        build.candidate.email !== manifest.candidate?.email
      ) {
        report.errors.push('candidate identity does not match the build');
      }
      if (
        build.job.company !== manifest.job?.company ||
        build.job.role !== manifest.job?.role
      ) {
        report.errors.push('job identity does not match the build');
      }
      if (
        evidence.verifiedEvidenceCount !==
          manifest.evidence?.verifiedEvidenceCount ||
        evidence.verifiedParagraphCount !==
          manifest.evidence?.verifiedParagraphCount
      ) {
        report.errors.push('evidence counts do not match the verified build');
      }
    } catch (error) {
      report.errors.push(`structured build is invalid (${error.message})`);
    }
  }

  if (markdownPath) {
    const markdown = await readFile(markdownPath, 'utf8');
    if (!markdown.includes('human review and editing required')) {
      report.errors.push('markdown draft is missing its human-review marker');
    }
  }

  if (manifest.output?.pdfPath) {
    await checkHash(
      report,
      root,
      'PDF',
      manifest.output.pdfPath,
      manifest.output.pdfSha256,
    );
    report.pdfValidation = await validatePdf({
      pdfPath: resolveArtifact(root, manifest.output.pdfPath),
      root,
      manifestPath,
      expectedFormat: manifest.output.format,
      expectedPages: manifest.output.pageCount,
      maxPages: 1,
      candidateName: manifest.candidate?.name,
      email: manifest.candidate?.email,
      requiredHeadings: manifest.validation?.requiredHeadings || [],
      requireTagged: true,
      requireOutline: true,
      requireTika: options.requireTika,
      tikaJar: options.tikaJar,
    });
    if (!report.pdfValidation.valid) {
      report.errors.push(
        ...report.pdfValidation.errors.map((error) => `PDF: ${error}`),
      );
    }
    report.warnings.push(...report.pdfValidation.warnings);
  } else if (
    manifest.output?.pdfSha256 !== null ||
    manifest.output?.pageCount !== null
  ) {
    report.errors.push('non-PDF manifest contains partial PDF metadata');
  }

  report.valid = report.errors.length === 0;
  return report;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/validate-cover-letter.mjs <manifest.json> [options]',
    '',
    'Options:',
    '  --root=<path>       Project root (default: repository root)',
    '  --json              Print the machine-readable validation report',
    '  --require-tika      Require Apache Tika parser agreement for PDF',
    '  --tika-jar=<path>   Path to tika-app JAR',
  ].join('\n');
}

function parseArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--require-tika') {
      options.requireTika = true;
    } else if (arg.startsWith('--tika-jar=')) {
      options.tikaJar = arg.slice('--tika-jar='.length);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--') && !options.manifestPath) {
      options.manifestPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.manifestPath) throw new Error(usage());
  const report = await validateCoverLetterManifest(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.valid) {
    console.log(`Cover letter validation: PASS (${report.manifestPath})`);
  } else {
    console.error('Cover letter validation: FAIL');
    for (const error of report.errors) console.error(`- ${error}`);
  }
  if (!report.valid) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(`Cover letter validation failed: ${error.message}`);
    process.exit(1);
  });
}
