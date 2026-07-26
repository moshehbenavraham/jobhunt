#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import {
  link,
  mkdir,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalizeCoverLetterBuild,
  createCoverLetterBuildJsonSchema,
  defaultCoverLetterBase,
  parseAndValidateCoverLetterBuild,
  renderCoverLetterHtml,
  renderCoverLetterMarkdown,
} from './cover-letter-core.mjs';
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
    '  node scripts/build-cover-letter.mjs <cover-letter-build.json> [options]',
    '  node scripts/build-cover-letter.mjs --payload <cover-letter-build.json> [options]',
    '  node scripts/build-cover-letter.mjs --write-schema=<path>',
    '',
    'Options:',
    '  --pdf                  Also build a one-page uploadable PDF',
    '  --out-base=<path>      Artifact base under output/ (no extension)',
    '  --root=<path>          Project root (default: repository root)',
    '  --template=<path>      Explicit HTML template under templates/',
    '  --template-name=<name> Named template (or profile default)',
    '  --force                Replace an existing deterministic artifact set',
    '  --require-tika         Require Apache Tika parser agreement for PDF',
    '  --tika-jar=<path>      Path to tika-app JAR',
    '',
    'The markdown draft is always generated. Human review is always required.',
  ].join('\n');
}

function parseArgs(args) {
  const options = { pdf: false, force: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--payload') {
      options.buildPath = args[++index];
      if (!options.buildPath) throw new Error('--payload needs a file path');
    } else if (arg.startsWith('--payload=')) {
      options.buildPath = arg.slice('--payload='.length);
    } else if (arg === '--pdf') {
      options.pdf = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--out-base=')) {
      options.outBase = arg.slice('--out-base='.length);
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length);
    } else if (arg.startsWith('--template=')) {
      options.template = arg.slice('--template='.length);
    } else if (arg.startsWith('--template-name=')) {
      options.templateName = arg.slice('--template-name='.length);
    } else if (arg.startsWith('--write-schema=')) {
      options.schemaOutput = arg.slice('--write-schema='.length);
    } else if (arg === '--require-tika') {
      options.requireTika = true;
    } else if (arg.startsWith('--tika-jar=')) {
      options.tikaJar = arg.slice('--tika-jar='.length);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--') && !options.buildPath) {
      options.buildPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function hashFile(path) {
  return sha256(await readFile(path));
}

function isInside(parent, child) {
  return pathIsInside(parent, child, { allowRoot: true });
}

function resolveInsideRoot(root, path, label = 'Path') {
  return assertContainedPath(root, path, { label });
}

function manifestPath(root, path) {
  const rel = relative(resolve(root), resolve(path));
  if (isInside(root, path)) return rel.replaceAll(sep, '/');
  return resolve(path);
}

function removeKnownExtension(path) {
  return path.replace(
    /(?:\.cover-letter\.json|\.manifest\.json|\.html|\.md|\.pdf)$/i,
    '',
  );
}

function resolveArtifactBase(root, build, rawBase) {
  const outputRoot = resolve(root, 'output');
  const defaultBase = defaultCoverLetterBase(build);
  let absolute;
  if (!rawBase) {
    absolute = resolve(outputRoot, defaultBase);
  } else {
    const withoutExtension = removeKnownExtension(rawBase);
    absolute = isAbsolute(withoutExtension)
      ? resolve(withoutExtension)
      : withoutExtension.split(/[\\/]/)[0] === 'output'
        ? resolve(root, withoutExtension)
        : resolve(outputRoot, withoutExtension);
  }
  if (!isInside(outputRoot, absolute) || resolve(absolute) === outputRoot) {
    throw new Error(`Artifact base must stay inside output/: ${rawBase}`);
  }
  if (basename(absolute).startsWith('.')) {
    throw new Error('Artifact base may not be a hidden file');
  }
  return absolute;
}

function assertNoSymlinkEscape(outputRoot, artifactBase) {
  try {
    ensureContainedDirectory(dirname(outputRoot), outputRoot);
    ensureContainedDirectory(outputRoot, dirname(artifactBase), {
      allowRoot: true,
    });
    assertContainedPath(outputRoot, artifactBase, {
      label: 'Cover-letter artifact',
    });
  } catch (error) {
    throw new Error(
      `Artifact directory resolves outside output/ via a symlink: ${error.message}`,
    );
  }
}

async function collectSourceHashes(root, build) {
  const paths = new Set([
    ...build.sourceFiles,
    ...build.evidence
      .map((item) => item.source)
      .filter((source) => source !== 'job.jd'),
  ]);
  const optionalDigest = 'profile/article-digest.md';
  if (existsSync(resolveInsideRoot(root, optionalDigest))) {
    paths.add(optionalDigest);
  }
  const sources = [];
  for (const path of [...paths].sort()) {
    const absolute = resolveInsideRoot(root, path, 'Source path');
    sources.push({
      path: path.replaceAll('\\', '/'),
      sha256: await hashFile(absolute),
    });
  }
  return sources;
}

async function atomicWriteFile(path, content) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.partial`;
  await writeFile(temporary, content);
  try {
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

async function publishArtifacts(stagedArtifacts, force) {
  const finals = [...stagedArtifacts.values()];
  if (!force) {
    const existing = finals.filter((path) => existsSync(path));
    if (existing.length > 0) {
      throw new Error(
        `Refusing to overwrite existing cover-letter artifacts:\n- ${existing.join('\n- ')}\nUse --force only after preserving any human edits.`,
      );
    }
  }

  const published = [];
  const backups = [];
  try {
    for (const [staged, final] of stagedArtifacts) {
      if (force && existsSync(final)) {
        const backup = `${staged}.previous`;
        await rename(final, backup);
        backups.push([backup, final]);
      }
      if (force) {
        await rename(staged, final);
      } else {
        await link(staged, final);
        await unlink(staged);
      }
      published.push(final);
    }
  } catch (error) {
    for (const final of published.reverse()) {
      await unlink(final).catch(() => {});
    }
    for (const [backup, final] of backups.reverse()) {
      await rename(backup, final).catch(() => {});
    }
    throw error;
  }
}

async function writeSchema(path) {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  await atomicWriteFile(
    absolute,
    `${JSON.stringify(createCoverLetterBuildJsonSchema(), null, 2)}\n`,
  );
  return absolute;
}

export async function buildCoverLetter(options) {
  const root = resolve(options.root || DEFAULT_ROOT);
  const inputBuildPath = resolve(options.buildPath);
  const rawBuild = JSON.parse(await readFile(inputBuildPath, 'utf8'));
  const { build, evidence } = await parseAndValidateCoverLetterBuild(rawBuild, {
    root,
  });

  const resolvedTemplate = resolveDocumentTemplate({
    root,
    kind: 'cover-letter',
    name: options.templateName,
    explicitPath: options.template,
  });
  const templatePath = resolvedTemplate.path;
  const template = await readFile(templatePath, 'utf8');
  const markdown = renderCoverLetterMarkdown(build);
  const html = normalizeTextForATS(renderCoverLetterHtml(build, template)).html;
  if (/\{\{[^}]+\}\}/.test(html)) {
    throw new Error('Cover letter template contains unresolved placeholders');
  }

  const artifactBase = resolveArtifactBase(root, build, options.outBase);
  const outputRoot = resolve(root, 'output');
  assertNoSymlinkEscape(outputRoot, artifactBase);

  const finalPaths = {
    build: `${artifactBase}.cover-letter.json`,
    markdown: `${artifactBase}.md`,
    html: `${artifactBase}.html`,
    pdf: options.pdf ? `${artifactBase}.pdf` : null,
    manifest: `${artifactBase}.manifest.json`,
  };
  const stageDirectory = resolve(
    outputRoot,
    `.cover-letter-stage-${process.pid}-${randomUUID()}`,
  );
  await mkdir(stageDirectory, { recursive: false });

  try {
    const stagedPaths = {
      build: resolve(stageDirectory, basename(finalPaths.build)),
      markdown: resolve(stageDirectory, basename(finalPaths.markdown)),
      html: resolve(stageDirectory, basename(finalPaths.html)),
      pdf: finalPaths.pdf
        ? resolve(stageDirectory, basename(finalPaths.pdf))
        : null,
      manifest: resolve(stageDirectory, basename(finalPaths.manifest)),
    };
    const canonicalBuild = canonicalizeCoverLetterBuild(build);
    await writeFile(stagedPaths.build, canonicalBuild);
    await writeFile(stagedPaths.markdown, markdown);
    await writeFile(stagedPaths.html, html);

    let generated = null;
    if (options.pdf) {
      generated = await generatePDF([
        stagedPaths.html,
        stagedPaths.pdf,
        `--format=${build.job.format}`,
        '--max-pages=1',
        ...(options.requireTika ? ['--require-tika'] : []),
        ...(options.tikaJar ? [`--tika-jar=${options.tikaJar}`] : []),
      ]);
    }

    const versionPath = resolve(root, 'VERSION');
    const version = existsSync(versionPath)
      ? (await readFile(versionPath, 'utf8')).trim()
      : 'unknown';
    const sourceHashes = await collectSourceHashes(root, build);
    const manifest = {
      schemaVersion: 1,
      artifactType: 'cover-letter',
      generatedAt: new Date().toISOString(),
      pipeline: {
        name: 'jobhunt',
        version,
        versionSha256: sha256(version),
        renderer: options.pdf ? 'playwright-chromium' : 'deterministic-text',
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
      application: build.application,
      inputs: {
        buildPath: manifestPath(root, finalPaths.build),
        buildSha256: await hashFile(stagedPaths.build),
        templatePath: manifestPath(root, templatePath),
        templateName: resolvedTemplate.name,
        templateSha256: await hashFile(templatePath),
        sources: sourceHashes,
      },
      output: {
        markdownPath: manifestPath(root, finalPaths.markdown),
        markdownSha256: await hashFile(stagedPaths.markdown),
        htmlPath: manifestPath(root, finalPaths.html),
        htmlSha256: await hashFile(stagedPaths.html),
        pdfPath: finalPaths.pdf ? manifestPath(root, finalPaths.pdf) : null,
        pdfSha256: stagedPaths.pdf ? await hashFile(stagedPaths.pdf) : null,
        format: build.job.format,
        pageCount: generated?.pageCount ?? null,
        fileSize: generated?.size ?? null,
        tagged: generated ? true : null,
        outline: generated ? true : null,
      },
      evidence: {
        verifiedEvidenceCount: evidence.verifiedEvidenceCount,
        verifiedParagraphCount: evidence.verifiedParagraphCount,
        valid: evidence.valid,
      },
      review: {
        humanReviewRequired: true,
        status: 'draft',
      },
      validation: {
        valid: evidence.valid && (!generated || generated.validation.valid),
        maxPages: options.pdf ? 1 : null,
        requiredHeadings: generated?.domPreflight.headings ?? [],
        checks: generated?.validation.checks ?? [],
        warnings: generated?.validation.warnings ?? [],
      },
    };
    await writeFile(
      stagedPaths.manifest,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    const stagedArtifacts = new Map([
      [stagedPaths.build, finalPaths.build],
      [stagedPaths.markdown, finalPaths.markdown],
      [stagedPaths.html, finalPaths.html],
      ...(stagedPaths.pdf ? [[stagedPaths.pdf, finalPaths.pdf]] : []),
      [stagedPaths.manifest, finalPaths.manifest],
    ]);
    await publishArtifacts(stagedArtifacts, options.force);

    if (options.pdf) {
      const finalValidation = await validatePdf({
        pdfPath: finalPaths.pdf,
        root,
        manifestPath: finalPaths.manifest,
        expectedFormat: build.job.format,
        expectedPages: 1,
        maxPages: 1,
        candidateName: build.candidate.name,
        email: build.candidate.email,
        requiredHeadings: generated.domPreflight.headings,
        expectedText: generated.domPreflight.bodyText,
        domPreflight: generated.domPreflight,
        requireTagged: true,
        requireOutline: true,
        requireTika: options.requireTika,
        tikaJar: options.tikaJar,
      });
      manifest.validation = {
        ...manifest.validation,
        valid: finalValidation.valid,
        checks: finalValidation.checks,
        warnings: finalValidation.warnings,
      };
      await atomicWriteFile(
        finalPaths.manifest,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      if (!finalValidation.valid) {
        throw new Error(formatValidationReport(finalValidation));
      }
    }

    return {
      build,
      evidence,
      ...finalPaths,
      validation: manifest.validation,
    };
  } finally {
    await rm(stageDirectory, { recursive: true, force: true });
  }
}

export async function runBuildCoverLetterCli(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (options.schemaOutput) {
    const output = await writeSchema(options.schemaOutput);
    console.log(`Cover letter build schema written: ${output}`);
    return 0;
  }
  if (!options.buildPath) {
    throw new Error(usage());
  }
  const result = await buildCoverLetter(options);
  console.log(`Cover letter draft: ${result.markdown}`);
  if (result.pdf) console.log(`Cover letter PDF: ${result.pdf}`);
  console.log(`Cover letter manifest: ${result.manifest}`);
  console.log('Human review: REQUIRED before submission');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runBuildCoverLetterCli().catch((error) => {
    console.error(`Cover letter build failed: ${error.message}`);
    process.exit(1);
  });
}
