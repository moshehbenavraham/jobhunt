#!/usr/bin/env node

/**
 * generate-pdf.mjs — HTML → PDF via Playwright
 *
 * Usage:
 *   node scripts/generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4]
 *
 * Requires: @playwright/test (or playwright) installed.
 * Uses Chromium headless to render the HTML and produce a clean, ATS-parseable PDF.
 */

import { chromium } from 'playwright';
import { basename, resolve, dirname, join } from 'node:path';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  formatValidationReport,
  inspectHtmlPage,
  validatePdf,
} from './pdf-validation-core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const projectRoot = resolve(SCRIPT_DIR, '..');

/**
 * Normalize text for ATS compatibility by converting problematic Unicode.
 *
 * ATS parsers and legacy systems often fail on em-dashes, smart quotes,
 * zero-width characters, and non-breaking spaces. These cause mojibake,
 * parsing errors, or display issues. See issue #1.
 *
 * Only touches body text — preserves CSS, JS, tag attributes, and URLs.
 * Returns { html, replacements } so the caller can log what was changed.
 */
export function normalizeTextForATS(html) {
  const replacements = {};
  const bump = (key, n) => {
    replacements[key] = (replacements[key] || 0) + n;
  };

  const masks = [];
  const masked = html.replace(
    /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (match) => {
      const token = `\u0000MASK${masks.length}\u0000`;
      masks.push(match);
      return token;
    },
  );

  let out = '';
  let i = 0;
  while (i < masked.length) {
    const lt = masked.indexOf('<', i);
    if (lt === -1) {
      out += sanitizeText(masked.slice(i));
      break;
    }
    out += sanitizeText(masked.slice(i, lt));
    const gt = masked.indexOf('>', lt);
    if (gt === -1) {
      out += masked.slice(lt);
      break;
    }
    out += masked.slice(lt, gt + 1);
    i = gt + 1;
  }

  const restored = out.replace(
    new RegExp('\\u0000MASK(\\d+)\\u0000', 'g'),
    (_, n) => masks[Number(n)],
  );
  return { html: restored, replacements };

  function sanitizeText(text) {
    if (!text) return text;
    let t = text;
    t = t.replace(/\u2014/g, () => {
      bump('em-dash', 1);
      return '-';
    });
    t = t.replace(/\u2013/g, () => {
      bump('en-dash', 1);
      return '-';
    });
    t = t.replace(/[\u201C\u201D\u201E\u201F]/g, () => {
      bump('smart-double-quote', 1);
      return '"';
    });
    t = t.replace(/[\u2018\u2019\u201A\u201B]/g, () => {
      bump('smart-single-quote', 1);
      return "'";
    });
    t = t.replace(/\u2026/g, () => {
      bump('ellipsis', 1);
      return '...';
    });
    t = t.replace(/(?:\u200B|\u200C|\u200D|\u2060|\uFEFF)/g, () => {
      bump('zero-width', 1);
      return '';
    });
    t = t.replace(/\u00A0/g, () => {
      bump('nbsp', 1);
      return ' ';
    });
    return t;
  }
}

export async function generatePDF(args = process.argv.slice(2)) {
  // Parse arguments
  let inputPath,
    outputPath,
    format = 'a4',
    maxPages = 2,
    requireTika = false,
    tikaJar;

  for (const arg of args) {
    if (arg.startsWith('--format=')) {
      format = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--max-pages=')) {
      maxPages = Number.parseInt(arg.split('=')[1], 10);
    } else if (arg === '--require-tika') {
      requireTika = true;
    } else if (arg.startsWith('--tika-jar=')) {
      tikaJar = arg.slice('--tika-jar='.length);
    } else if (!inputPath) {
      inputPath = arg;
    } else if (!outputPath) {
      outputPath = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!inputPath || !outputPath) {
    console.error(
      'Usage: node scripts/generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4] [--max-pages=2] [--require-tika] [--tika-jar=path]',
    );
    process.exit(1);
  }

  inputPath = resolve(inputPath);
  outputPath = resolve(outputPath);
  mkdirSync(dirname(outputPath), { recursive: true });

  // Validate format
  const validFormats = ['a4', 'letter'];
  if (!validFormats.includes(format)) {
    console.error(
      `Invalid format "${format}". Use: ${validFormats.join(', ')}`,
    );
    process.exit(1);
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    console.error('Invalid max page count. Use a positive integer.');
    process.exit(1);
  }

  console.log(`📄 Input:  ${inputPath}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📏 Format: ${format.toUpperCase()}`);

  // Read HTML to inject font paths as absolute file:// URLs
  let html = await readFile(inputPath, 'utf-8');

  // Resolve font paths relative to jobhunt/fonts/
  const fontsDir = resolve(projectRoot, 'fonts');
  html = html.replace(/url\(['"]?\.\/fonts\//g, `url('file://${fontsDir}/`);
  // Close any unclosed quotes from the replacement (handles all font formats)
  html = html.replace(
    /file:\/\/([^'")]+)\.(woff2?|ttf|otf)['"]?\)/g,
    `file://$1.$2')`,
  );

  // Normalize text for ATS compatibility (issue #1)
  const normalized = normalizeTextForATS(html);
  html = normalized.html;
  const totalReplacements = Object.values(normalized.replacements).reduce(
    (a, b) => a + b,
    0,
  );
  if (totalReplacements > 0) {
    const breakdown = Object.entries(normalized.replacements)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    console.log(
      `🧹 ATS normalization: ${totalReplacements} replacements (${breakdown})`,
    );
  }

  const browser = await chromium.launch({ headless: true });
  const tempOutputPath = join(
    dirname(outputPath),
    `.${basename(outputPath, '.pdf')}.${process.pid}.partial.pdf`,
  );
  try {
    const page = await browser.newPage({
      viewport: {
        // Match the printable box after the 0.6in PDF margins so DOM
        // overflow checks use the same effective width as the final page.
        width: format === 'letter' ? 701 : 679,
        height: format === 'letter' ? 941 : 1007,
      },
    });
    await page.emulateMedia({ media: 'print' });

    // Fonts have already been rewritten to absolute file URLs.
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    const domPreflight = await inspectHtmlPage(page);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: format,
      printBackground: true,
      tagged: true,
      outline: true,
      margin: {
        top: '0.6in',
        right: '0.6in',
        bottom: '0.6in',
        left: '0.6in',
      },
      preferCSSPageSize: false,
    });

    // Validate a temporary file and publish only after every quality gate passes.
    await writeFile(tempOutputPath, pdfBuffer);
    const validation = await validatePdf({
      pdfPath: tempOutputPath,
      expectedFormat: format,
      maxPages,
      candidateName: domPreflight.candidateName,
      email: domPreflight.email,
      requiredHeadings: domPreflight.headings,
      expectedText: domPreflight.bodyText,
      domPreflight,
      requireTagged: true,
      requireOutline: true,
      requireTika,
      tikaJar,
    });
    if (!validation.valid) {
      throw new Error(formatValidationReport(validation));
    }
    await rename(tempOutputPath, outputPath);
    const pageCount = validation.metrics.pageCount;

    console.log(`✅ PDF generated: ${outputPath}`);
    console.log(`📊 Pages: ${pageCount}`);
    console.log(`📦 Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    console.log('🔎 Validation: PASS');

    return {
      outputPath,
      pageCount,
      size: pdfBuffer.length,
      validation,
      domPreflight,
    };
  } finally {
    await browser.close();
    await unlink(tempOutputPath).catch(() => {});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  generatePDF().catch((err) => {
    console.error('❌ PDF generation failed:', err.message);
    process.exit(1);
  });
}
