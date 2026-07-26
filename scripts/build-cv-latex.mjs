#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  publishArtifactSet,
  resolveArtifactPath,
} from './artifact-policy.mjs';
import {
  canonicalizeCvBuild,
  parseAndValidateCvBuild,
} from './cv-build-core.mjs';
import { renderCvBuildLatex } from './cv-latex-core.mjs';
import { resolveDocumentTemplate } from './document-templates.mjs';
import { validateLatexContent } from './generate-latex.mjs';
import { assertContainedPath, pathIsInside } from './path-policy.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function projectLabel(root, path) {
  return pathIsInside(root, path, { allowRoot: true })
    ? relative(root, path).replaceAll(sep, '/')
    : resolve(path);
}

export async function buildCvLatex({
  root = DEFAULT_ROOT,
  buildPath,
  outputPath,
  template,
  templateName,
  force = false,
} = {}) {
  const projectRoot = resolve(root);
  const raw = JSON.parse(await readFile(resolve(buildPath), 'utf8'));
  const { build, coverage } = await parseAndValidateCvBuild(raw, {
    root: projectRoot,
  });
  const resolvedTemplate = resolveDocumentTemplate({
    root: projectRoot,
    kind: 'cv',
    format: 'tex',
    name: templateName,
    explicitPath: template,
  });
  const templateText = await readFile(resolvedTemplate.path, 'utf8');
  const latex = renderCvBuildLatex(build, templateText);
  const validation = validateLatexContent(latex);
  if (!validation.valid) {
    throw new Error(
      `Generated LaTeX failed validation:\n- ${validation.issues.join('\n- ')}`,
    );
  }
  const output = resolveArtifactPath({
    root: projectRoot,
    directory: 'output',
    requested: outputPath,
    extensions: ['.tex'],
    label: 'LaTeX CV output',
  });
  const base = output.path.slice(0, -4);
  const sidecarPath = resolveArtifactPath({
    root: projectRoot,
    directory: 'output',
    requested: `${base}.cv-build.json`,
    extensions: ['.json'],
    label: 'LaTeX CV build sidecar',
  }).path;
  const manifestPath = resolveArtifactPath({
    root: projectRoot,
    directory: 'output',
    requested: `${base}.manifest.json`,
    extensions: ['.json'],
    label: 'LaTeX CV manifest',
  }).path;

  const sourcePaths = new Set([
    ...build.sourceFiles,
    ...build.evidence.map((item) => item.source),
  ]);
  const sources = [];
  for (const path of [...sourcePaths].sort()) {
    const absolute = assertContainedPath(projectRoot, path, {
      mustExist: true,
      label: 'CV source',
    });
    const content = await readFile(absolute);
    sources.push({ path, sha256: sha256(content) });
  }
  const canonicalBuild = canonicalizeCvBuild(build);
  const manifest = {
    schemaVersion: 1,
    artifactType: 'cv-latex',
    generatedAt: new Date().toISOString(),
    candidate: { name: build.candidate.name, email: build.candidate.email },
    job: {
      company: build.job.company,
      role: build.job.role,
      language: build.job.language,
      jdSha256: sha256(build.job.jdText),
    },
    inputs: {
      buildPath: projectLabel(projectRoot, sidecarPath),
      buildSha256: sha256(canonicalBuild),
      templatePath: projectLabel(projectRoot, resolvedTemplate.path),
      templateName: resolvedTemplate.name,
      templateSha256: sha256(templateText),
      sources,
    },
    output: {
      texPath: projectLabel(projectRoot, output.path),
      texSha256: sha256(latex),
    },
    coverage,
    validation: {
      valid: true,
      checks: [
        { id: 'latex-structure', valid: true },
        { id: 'evidence-contract', valid: true },
        { id: 'path-containment', valid: true },
      ],
    },
  };

  const stage = resolve(
    output.artifactRoot,
    `.cv-latex-stage-${process.pid}-${randomUUID()}`,
  );
  await mkdir(stage);
  try {
    const stagedTex = resolve(stage, basename(output.path));
    const stagedBuild = resolve(stage, basename(sidecarPath));
    const stagedManifest = resolve(stage, basename(manifestPath));
    await writeFile(stagedTex, latex, { mode: 0o600 });
    await writeFile(stagedBuild, canonicalBuild, { mode: 0o600 });
    await writeFile(
      stagedManifest,
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600 },
    );
    await publishArtifactSet(
      new Map([
        [stagedTex, output.path],
        [stagedBuild, sidecarPath],
        [stagedManifest, manifestPath],
      ]),
      { force },
    );
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  return {
    texPath: output.path,
    buildPath: sidecarPath,
    manifestPath,
    validation: manifest.validation,
  };
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, force: false };
  for (const value of argv) {
    if (value === '--force') options.force = true;
    else if (value.startsWith('--root=')) {
      options.root = resolve(value.slice('--root='.length));
    } else if (value.startsWith('--template=')) {
      options.template = value.slice('--template='.length);
    } else if (value.startsWith('--template-name=')) {
      options.templateName = value.slice('--template-name='.length);
    } else if (value === '--help' || value === '-h') options.help = true;
    else if (!value.startsWith('--') && !options.buildPath) {
      options.buildPath = value;
    } else if (!value.startsWith('--') && !options.outputPath) {
      options.outputPath = value;
    } else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

export async function runBuildCvLatexCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help || !options.buildPath || !options.outputPath) {
    console.log(`Usage:
  node scripts/build-cv-latex.mjs <cv-build.json> <output.tex>
    [--template-name=NAME] [--template=PATH] [--force] [--root=PATH]

Use npm run latex -- output.tex to compile after reviewing the source.`);
    return options.help ? 0 : 1;
  }
  const result = await buildCvLatex(options);
  console.log(`LaTeX CV: ${result.texPath}`);
  console.log(`Manifest: ${result.manifestPath}`);
  return 0;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  runBuildCvLatexCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`LaTeX CV build failed: ${error.message}`);
      process.exitCode = 1;
    });
}
