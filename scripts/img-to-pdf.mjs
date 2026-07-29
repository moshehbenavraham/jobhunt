#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { publishArtifactSet, resolveArtifactPath } from './artifact-policy.mjs';
import { pathIsInside } from './path-policy.mjs';
import { validateGenericPdf } from './pdf-artifact-core.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 20000;
const MAX_PIXELS = 100_000_000;

const IMAGE_TYPES = {
  '.png': {
    mime: 'image/png',
    matches: (buffer) =>
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  '.jpg': {
    mime: 'image/jpeg',
    matches: (buffer) =>
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  '.jpeg': {
    mime: 'image/jpeg',
    matches: (buffer) =>
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  '.gif': {
    mime: 'image/gif',
    matches: (buffer) =>
      ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
  },
  '.webp': {
    mime: 'image/webp',
    matches: (buffer) =>
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
};

export function detectImageType(path, buffer) {
  const extension = extname(path).toLowerCase();
  const type = IMAGE_TYPES[extension];
  if (!type) {
    throw new Error(
      `Unsupported image type ${extension || '(none)'}; expected PNG, JPEG, GIF, or WebP`,
    );
  }
  if (!type.matches(buffer)) {
    throw new Error(`Image bytes do not match the ${extension} extension`);
  }
  return { extension, mime: type.mime };
}

function sourceLabel(root, inputPath) {
  if (pathIsInside(root, inputPath, { allowRoot: false })) {
    return relative(root, inputPath).replaceAll(sep, '/');
  }
  return `external:${basename(inputPath)}`;
}

export async function convertImageToPdfArtifact({
  root = DEFAULT_ROOT,
  inputPath,
  outputPath,
  force = false,
  browserFactory = () => chromium.launch({ headless: true }),
  validatePdf = validateGenericPdf,
} = {}) {
  const projectRoot = resolve(root);
  const input = resolve(inputPath);
  if (!existsSync(input)) throw new Error(`Image not found: ${input}`);
  if (!lstatSync(input).isFile() || lstatSync(input).isSymbolicLink()) {
    throw new Error('Image input must be a regular non-symlink file');
  }
  const image = await readFile(input);
  if (image.length === 0 || image.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image size must be between 1 byte and ${MAX_IMAGE_BYTES} bytes`,
    );
  }
  const type = detectImageType(input, image);
  const output = resolveArtifactPath({
    root: projectRoot,
    directory: 'output',
    requested: outputPath,
    extensions: ['.pdf'],
    label: 'Image PDF output',
  });
  const manifestPath = resolveArtifactPath({
    root: projectRoot,
    directory: 'output',
    requested: `${output.path.slice(0, -4)}.manifest.json`,
    extensions: ['.json'],
    label: 'Image PDF manifest',
  }).path;

  const browser = await browserFactory();
  let pdfBuffer;
  let dimensions;
  try {
    const page = await browser.newPage();
    try {
      if (typeof page.route === 'function') {
        await page.route('**/*', async (route) => {
          const protocol = new URL(route.request().url()).protocol;
          if (['about:', 'data:'].includes(protocol)) await route.continue();
          else await route.abort('blockedbyclient');
        });
      }
      const dataUrl = `data:${type.mime};base64,${image.toString('base64')}`;
      await page.setContent(
        `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0}img{display:block}</style><img id="source" alt="" src="${dataUrl}">`,
        { waitUntil: 'load' },
      );
      await page.waitForFunction(
        () => {
          const element = document.getElementById('source');
          return (
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0 &&
            element.naturalHeight > 0
          );
        },
        { timeout: 10000 },
      );
      dimensions = await page.evaluate(() => {
        const element = document.getElementById('source');
        return {
          width: element.naturalWidth,
          height: element.naturalHeight,
        };
      });
      if (
        dimensions.width > MAX_DIMENSION ||
        dimensions.height > MAX_DIMENSION ||
        dimensions.width * dimensions.height > MAX_PIXELS
      ) {
        throw new Error(
          `Image dimensions exceed safety limits: ${dimensions.width}x${dimensions.height}`,
        );
      }
      pdfBuffer = await page.pdf({
        width: `${dimensions.width / 96}in`,
        height: `${dimensions.height / 96}in`,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: true,
      });
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const validation = await validatePdf(pdfBuffer, {
    exactPages: 1,
    maxPages: 1,
  });
  if (!validation.valid) {
    throw new Error(
      `Image PDF validation failed: ${validation.checks
        .filter((check) => !check.valid)
        .map((check) => check.id)
        .join(', ')}`,
    );
  }
  const stageDirectory = resolve(
    output.artifactRoot,
    `.image-pdf-stage-${process.pid}-${randomUUID()}`,
  );
  await mkdir(stageDirectory);
  try {
    const stagedPdf = resolve(stageDirectory, basename(output.path));
    const stagedManifest = resolve(stageDirectory, basename(manifestPath));
    const manifest = {
      schemaVersion: 1,
      artifactType: 'image-pdf',
      generatedAt: new Date().toISOString(),
      source: {
        path: sourceLabel(projectRoot, input),
        mime: type.mime,
        sha256: createHash('sha256').update(image).digest('hex'),
        fileSize: image.length,
        width: dimensions.width,
        height: dimensions.height,
      },
      output: {
        pdfPath: `output/${basename(output.path)}`,
        pdfSha256: validation.sha256,
        fileSize: validation.size,
        pageCount: validation.pageCount,
      },
      validation: { valid: true, checks: validation.checks },
    };
    await writeFile(stagedPdf, pdfBuffer, { mode: 0o600 });
    await writeFile(stagedManifest, `${JSON.stringify(manifest, null, 2)}\n`, {
      mode: 0o600,
    });
    await publishArtifactSet(
      new Map([
        [stagedPdf, output.path],
        [stagedManifest, manifestPath],
      ]),
      { force },
    );
    return {
      pdfPath: output.path,
      manifestPath,
      dimensions,
      validation,
    };
  } finally {
    await rm(stageDirectory, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, force: false, json: false };
  for (const value of argv) {
    if (value === '--force') options.force = true;
    else if (value === '--json') options.json = true;
    else if (value.startsWith('--root=')) {
      options.root = resolve(value.slice('--root='.length));
    } else if (value === '--help' || value === '-h') options.help = true;
    else if (!value.startsWith('--') && !options.inputPath) {
      options.inputPath = value;
    } else if (!value.startsWith('--') && !options.outputPath) {
      options.outputPath = value;
    } else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

export async function runImagePdfCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help || !options.inputPath || !options.outputPath) {
    console.log(`Usage:
  node scripts/img-to-pdf.mjs <image> <output.pdf> [--force] [--root=PATH] [--json]

The PDF and sibling validation/provenance manifest are confined to output/.`);
    return options.help ? 0 : 1;
  }
  const result = await convertImageToPdfArtifact(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Image PDF: ${result.pdfPath}`);
    console.log(`Manifest: ${result.manifestPath}`);
    console.log(
      `Dimensions: ${result.dimensions.width}x${result.dimensions.height}; validation PASS`,
    );
  }
  return 0;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  runImagePdfCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`Image-to-PDF failed: ${error.message}`);
      process.exitCode = 1;
    });
}
