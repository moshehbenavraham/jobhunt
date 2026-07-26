import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const FORMAT_POINTS = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};

function commandResult(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  return {
    command,
    args,
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
  };
}

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function sha256File(path) {
  return sha256Buffer(await readFile(path));
}

function normalizeSearchText(value) {
  return String(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenize(value) {
  return (
    String(value)
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}+#.$%/-]+/gu) || []
  );
}

function tokenRecall(expected, actual) {
  const actualCounts = new Map();
  for (const token of tokenize(actual)) {
    actualCounts.set(token, (actualCounts.get(token) || 0) + 1);
  }
  const expectedTokens = tokenize(expected);
  let matched = 0;
  for (const token of expectedTokens) {
    const remaining = actualCounts.get(token) || 0;
    if (remaining > 0) {
      matched++;
      actualCounts.set(token, remaining - 1);
    }
  }
  return {
    expected: expectedTokens.length,
    matched,
    percent:
      expectedTokens.length === 0
        ? 100
        : Number(((matched / expectedTokens.length) * 100).toFixed(2)),
  };
}

function addCheck(report, id, passed, details, severity = 'error') {
  const check = {
    id,
    status: passed ? 'pass' : severity === 'warning' ? 'warning' : 'fail',
    details,
  };
  report.checks.push(check);
  if (!passed && severity === 'error') report.errors.push(`${id}: ${details}`);
  if (!passed && severity === 'warning')
    report.warnings.push(`${id}: ${details}`);
}

function parsePdfInfo(output) {
  const result = {};
  for (const line of output.split('\n')) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) result[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return result;
}

function parseFontRows(output) {
  return output
    .split('\n')
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      return {
        raw: line,
        embedded: parts.at(-5),
        subset: parts.at(-4),
        unicode: parts.at(-3),
      };
    });
}

function pageBoundaryIssues(text, headings) {
  const normalizedHeadings = new Set(headings.map(normalizeSearchText));
  const issues = [];
  const pages = text.split('\f').filter((page) => page.trim() !== '');
  pages.slice(0, -1).forEach((page, pageIndex) => {
    const lines = page
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const last = lines.at(-1) || '';
    if (normalizedHeadings.has(normalizeSearchText(last))) {
      issues.push(`page ${pageIndex + 1} ends with orphan heading "${last}"`);
    }
  });
  return issues;
}

function danglingSeparatorIssues(text) {
  const issues = [];
  for (const [index, line] of text.split('\n').entries()) {
    if (/[|•·]\s*$/.test(line)) {
      issues.push(`line ${index + 1} ends with a dangling separator`);
    }
  }
  return issues;
}

async function extractWithPdfJs(pdfBuffer) {
  const task = getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
  });
  const document = await task.promise;
  const pages = [];
  let outline = [];
  try {
    outline = (await document.getOutline()) || [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent({
        includeMarkedContent: true,
      });
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += `${item.str}${item.hasEOL ? '\n' : ' '}`;
      }
      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        text: text.trim(),
      });
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  return {
    pageCount: pages.length,
    pages,
    text: pages.map((page) => page.text).join('\f'),
    outlineItemCount: countOutlineItems(outline),
  };
}

function countOutlineItems(items) {
  return items.reduce(
    (count, item) => count + 1 + countOutlineItems(item.items || []),
    0,
  );
}

function resolveInsideRoot(root, path) {
  const absoluteRoot = resolve(root);
  const absolute = isAbsolute(path)
    ? resolve(path)
    : resolve(absoluteRoot, path);
  const rel = relative(absoluteRoot, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Path escapes project root: ${path}`);
  }
  return absolute;
}

async function checkManifestFreshness(manifestPath, root, pdfPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const issues = [];
  const manifestDirectory = dirname(resolve(manifestPath));
  const resolveArtifact = (path) => {
    if (!isAbsolute(path)) return resolveInsideRoot(root, path);
    const absolute = resolve(path);
    const rel = relative(manifestDirectory, absolute);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new Error(`absolute artifact is not beside its manifest: ${path}`);
    }
    return absolute;
  };
  const checkHash = async (label, path, expectedHash) => {
    if (!path || !expectedHash) {
      issues.push(`${label} path or hash missing`);
      return;
    }
    try {
      const current = await sha256File(resolveArtifact(path));
      if (current !== expectedHash) issues.push(`${label} changed: ${path}`);
    } catch (error) {
      issues.push(`${label} unavailable: ${path} (${error.message})`);
    }
  };

  if (manifest.schemaVersion !== 1) {
    issues.push(
      `unsupported manifest schema version: ${manifest.schemaVersion}`,
    );
  }
  if (manifest.validation?.valid !== true) {
    issues.push('manifest does not record a successful validation');
  }
  if (!manifest.candidate?.name || !manifest.candidate?.email) {
    issues.push('candidate identity is missing from the manifest');
  }
  if (
    !manifest.job?.company ||
    !manifest.job?.role ||
    !manifest.job?.jdSha256
  ) {
    issues.push('job identity or JD hash is missing from the manifest');
  }
  if (!['letter', 'a4'].includes(manifest.output?.format)) {
    issues.push(`invalid manifest paper format: ${manifest.output?.format}`);
  }
  if (
    !Number.isInteger(manifest.output?.pageCount) ||
    manifest.output.pageCount < 1
  ) {
    issues.push(`invalid manifest page count: ${manifest.output?.pageCount}`);
  }
  if (
    !Array.isArray(manifest.inputs?.sources) ||
    manifest.inputs.sources.length === 0
  ) {
    issues.push('profile source hashes are missing from the manifest');
  }

  const currentPdfHash = await sha256File(pdfPath);
  if (manifest.output?.pdfSha256 !== currentPdfHash) {
    issues.push('PDF hash does not match the manifest');
  }
  try {
    const recordedPdfPath = resolveArtifact(manifest.output?.pdfPath);
    if (resolve(recordedPdfPath) !== pdfPath) {
      issues.push('manifest PDF path does not identify the validated file');
    }
  } catch (error) {
    issues.push(`manifest PDF path is invalid (${error.message})`);
  }
  await checkHash(
    'structured build',
    manifest.inputs?.buildPath,
    manifest.inputs?.buildSha256,
  );
  await checkHash(
    'template',
    manifest.inputs?.templatePath,
    manifest.inputs?.templateSha256,
  );
  await checkHash(
    'rendered HTML',
    manifest.output?.htmlPath,
    manifest.output?.htmlSha256,
  );

  try {
    const version = (
      await readFile(resolveInsideRoot(root, 'VERSION'), 'utf8')
    ).trim();
    if (manifest.pipeline?.version !== version) {
      issues.push(
        `pipeline version changed: ${manifest.pipeline?.version || 'missing'} -> ${version}`,
      );
    }
    if (
      manifest.pipeline?.versionSha256 !== sha256Buffer(Buffer.from(version))
    ) {
      issues.push('pipeline version hash does not match VERSION');
    }
  } catch (error) {
    issues.push(`pipeline VERSION unavailable (${error.message})`);
  }

  try {
    const buildPath = resolveArtifact(manifest.inputs?.buildPath);
    const build = JSON.parse(await readFile(buildPath, 'utf8'));
    if (
      manifest.job?.jdSha256 !==
      sha256Buffer(Buffer.from(build.job?.jdText || ''))
    ) {
      issues.push('job description hash does not match structured build');
    }
  } catch (error) {
    issues.push(
      `job description hash could not be verified (${error.message})`,
    );
  }

  const seenSources = new Set();
  for (const source of manifest.inputs?.sources || []) {
    if (!source.path || !source.sha256) {
      issues.push('profile source path or hash missing');
      continue;
    }
    if (seenSources.has(source.path)) {
      issues.push(`duplicate profile source: ${source.path}`);
      continue;
    }
    seenSources.add(source.path);
    try {
      const absolute = resolveInsideRoot(root, source.path);
      const current = await sha256File(absolute);
      if (current !== source.sha256) {
        issues.push(`source changed: ${source.path}`);
      }
    } catch (error) {
      issues.push(`source unavailable: ${source.path} (${error.message})`);
    }
  }
  return { manifest, fresh: issues.length === 0, issues };
}

export async function inspectHtmlFile(htmlPath, options = {}) {
  const html = await readFile(htmlPath, 'utf8');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: {
        width: options.viewportWidth || 701,
        height: options.viewportHeight || 941,
      },
    });
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    return await inspectHtmlPage(page);
  } finally {
    await browser.close();
  }
}

export async function inspectHtmlPage(page) {
  return page.evaluate(() => {
    const bodyText = document.body?.innerText || '';
    const headings = [...document.querySelectorAll('h2')]
      .map((node) => node.textContent?.trim() || '')
      .filter(Boolean);
    const candidateName =
      document.querySelector('h1')?.textContent?.trim() || '';
    const mailLink = document.querySelector('a[href^="mailto:"]');
    const email = mailLink
      ? (mailLink.getAttribute('href') || '').replace(/^mailto:/, '')
      : '';
    const unresolvedPlaceholders = [
      ...document.documentElement.innerHTML.matchAll(/\{\{([^}]+)\}\}/g),
    ].map((match) => match[1]);
    const emptyContacts = [...document.querySelectorAll('.contact-item')]
      .filter((node) => !(node.textContent || '').trim())
      .map((node) => node.outerHTML);
    const rootWidth = document.documentElement.clientWidth;
    const horizontalOverflow = [...document.body.querySelectorAll('*')]
      .filter((node) => {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden')
          return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > rootWidth + 1);
      })
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        className:
          typeof node.className === 'string' ? node.className : undefined,
        text: (node.textContent || '').trim().slice(0, 100),
        rect: {
          left: Number(node.getBoundingClientRect().left.toFixed(2)),
          right: Number(node.getBoundingClientRect().right.toFixed(2)),
          rootWidth,
        },
      }))
      .slice(0, 20);
    const bodyOverflow =
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1;

    return {
      bodyText,
      headings,
      candidateName,
      email,
      unresolvedPlaceholders,
      emptyContacts,
      horizontalOverflow,
      bodyOverflow,
    };
  });
}

export async function validatePdf(options) {
  const pdfPath = resolve(options.pdfPath);
  const root = resolve(options.root || process.cwd());
  const report = {
    schemaVersion: 1,
    pdfPath,
    valid: false,
    checks: [],
    errors: [],
    warnings: [],
    metrics: {},
  };

  addCheck(
    report,
    'pdf-exists',
    existsSync(pdfPath),
    existsSync(pdfPath) ? 'PDF exists' : `missing PDF: ${pdfPath}`,
  );
  if (!existsSync(pdfPath)) return report;

  const filename = basename(pdfPath);
  const fallbackMatch = /\b(?:candidate|unknown|placeholder|todo|tbd)\b/i.test(
    filename,
  );
  addCheck(
    report,
    'filename-resolved',
    !fallbackMatch,
    fallbackMatch
      ? `fallback token found in filename: ${filename}`
      : 'filename contains resolved candidate and company values',
  );

  const pdfBuffer = await readFile(pdfPath);
  report.metrics.pdfSha256 = sha256Buffer(pdfBuffer);
  report.metrics.fileSize = pdfBuffer.length;

  const qpdf = commandResult('qpdf', ['--check', pdfPath]);
  addCheck(
    report,
    'qpdf-structure',
    !qpdf.error && qpdf.exitCode === 0,
    qpdf.error
      ? qpdf.error.message
      : qpdf.exitCode === 0
        ? 'qpdf structural validation passed'
        : (qpdf.stdout || qpdf.stderr).trim() || `qpdf exited ${qpdf.exitCode}`,
  );

  let pdfJs;
  try {
    pdfJs = await extractWithPdfJs(pdfBuffer);
    report.metrics.pageCount = pdfJs.pageCount;
    report.metrics.outlineItemCount = pdfJs.outlineItemCount;
    addCheck(
      report,
      'pdfjs-parse',
      true,
      `PDF.js parsed ${pdfJs.pageCount} page(s)`,
    );
  } catch (error) {
    addCheck(report, 'pdfjs-parse', false, error.message);
  }

  const maxPages = options.maxPages ?? 2;
  if (pdfJs) {
    addCheck(
      report,
      'page-count',
      pdfJs.pageCount >= 1 && pdfJs.pageCount <= maxPages,
      `${pdfJs.pageCount} page(s), allowed range 1-${maxPages}`,
    );
    if (options.expectedPages !== undefined) {
      addCheck(
        report,
        'exact-page-count',
        pdfJs.pageCount === options.expectedPages,
        `${pdfJs.pageCount} page(s), expected exactly ${options.expectedPages}`,
      );
    }
    if (options.requireOutline !== false) {
      addCheck(
        report,
        'pdf-outline',
        pdfJs.outlineItemCount > 0,
        `${pdfJs.outlineItemCount} outline item(s)`,
      );
    }
  }

  const expectedFormat = options.expectedFormat?.toLowerCase();
  if (pdfJs && expectedFormat && FORMAT_POINTS[expectedFormat]) {
    const expected = FORMAT_POINTS[expectedFormat];
    const mismatches = pdfJs.pages.filter(
      (page) =>
        Math.abs(page.width - expected.width) > 2 ||
        Math.abs(page.height - expected.height) > 2,
    );
    addCheck(
      report,
      'pdfjs-page-format',
      mismatches.length === 0,
      mismatches.length === 0
        ? `all pages match ${expectedFormat}`
        : `page dimensions do not match ${expectedFormat}: ${mismatches
            .map(
              (page) =>
                `p${page.pageNumber}=${page.width.toFixed(2)}x${page.height.toFixed(2)}`,
            )
            .join(', ')}`,
    );
  }

  const pdfInfo = commandResult('pdfinfo', [pdfPath]);
  const info = parsePdfInfo(pdfInfo.stdout);
  addCheck(
    report,
    'pdfinfo',
    !pdfInfo.error && pdfInfo.exitCode === 0,
    pdfInfo.error
      ? pdfInfo.error.message
      : pdfInfo.exitCode === 0
        ? 'pdfinfo parsed the document'
        : (pdfInfo.stderr || pdfInfo.stdout).trim(),
  );
  if (!pdfInfo.error && pdfInfo.exitCode === 0) {
    report.metrics.pdfInfo = info;
    addCheck(
      report,
      'not-encrypted',
      normalizeSearchText(info.encrypted) === 'no',
      `Encrypted: ${info.encrypted || 'unknown'}`,
    );
    if (options.requireTagged !== false) {
      addCheck(
        report,
        'tagged-pdf',
        normalizeSearchText(info.tagged) === 'yes',
        `Tagged: ${info.tagged || 'unknown'}`,
      );
    }
  }

  const fontsResult = commandResult('pdffonts', [pdfPath]);
  const fonts = parseFontRows(fontsResult.stdout);
  addCheck(
    report,
    'pdffonts',
    !fontsResult.error && fontsResult.exitCode === 0 && fonts.length > 0,
    fontsResult.error
      ? fontsResult.error.message
      : fonts.length > 0
        ? `${fonts.length} font row(s) parsed`
        : (fontsResult.stderr || 'no fonts found').trim(),
  );
  if (fonts.length > 0) {
    const unembedded = fonts.filter((font) => font.embedded !== 'yes');
    const missingUnicode = fonts.filter((font) => font.unicode !== 'yes');
    addCheck(
      report,
      'fonts-embedded',
      unembedded.length === 0,
      unembedded.length === 0
        ? 'all fonts are embedded'
        : `${unembedded.length} font(s) are not embedded`,
    );
    addCheck(
      report,
      'fonts-unicode-mapped',
      missingUnicode.length === 0,
      missingUnicode.length === 0
        ? 'all fonts have Unicode maps'
        : `${missingUnicode.length} font(s) lack Unicode maps`,
    );
  }

  const poppler = commandResult('pdftotext', ['-layout', pdfPath, '-']);
  const popplerText = poppler.stdout;
  addCheck(
    report,
    'pdftotext',
    !poppler.error && poppler.exitCode === 0 && popplerText.trim() !== '',
    poppler.error
      ? poppler.error.message
      : popplerText.trim() !== ''
        ? `${tokenize(popplerText).length} token(s) extracted`
        : (poppler.stderr || 'no text extracted').trim(),
  );

  if (popplerText) {
    report.metrics.extractedWordCount = tokenize(popplerText).length;
    const unresolved = [...popplerText.matchAll(/\{\{([^}]+)\}\}/g)].map(
      (match) => match[1],
    );
    addCheck(
      report,
      'no-unresolved-placeholders',
      unresolved.length === 0,
      unresolved.length === 0
        ? 'no unresolved placeholders'
        : `unresolved placeholders: ${[...new Set(unresolved)].join(', ')}`,
    );
    const invalidCharacters = [
      ...popplerText.matchAll(/(?:\u200B|\u200C|\u200D|\u2060|\uFEFF|\uFFFD)/g),
    ].map((match) => `U+${match[0].codePointAt(0).toString(16).toUpperCase()}`);
    addCheck(
      report,
      'no-invalid-characters',
      invalidCharacters.length === 0,
      invalidCharacters.length === 0
        ? 'no zero-width or replacement characters'
        : `invalid characters: ${[...new Set(invalidCharacters)].join(', ')}`,
    );

    const requiredText = [
      ...(options.candidateName ? [options.candidateName] : []),
      ...(options.email ? [options.email] : []),
    ];
    const normalizedPdfText = normalizeSearchText(popplerText);
    const missingRequiredText = requiredText.filter(
      (value) => !normalizedPdfText.includes(normalizeSearchText(value)),
    );
    addCheck(
      report,
      'candidate-identity',
      missingRequiredText.length === 0,
      missingRequiredText.length === 0
        ? 'candidate name and email are extractable'
        : `missing identity text: ${missingRequiredText.join(', ')}`,
    );

    const requiredHeadings = options.requiredHeadings || [];
    let previousIndex = -1;
    const missingOrOutOfOrder = [];
    for (const heading of requiredHeadings) {
      const index = normalizedPdfText.indexOf(normalizeSearchText(heading));
      if (index < 0) {
        missingOrOutOfOrder.push(`missing "${heading}"`);
      } else if (index <= previousIndex) {
        missingOrOutOfOrder.push(`out of order "${heading}"`);
      }
      previousIndex = Math.max(previousIndex, index);
    }
    addCheck(
      report,
      'section-heading-order',
      missingOrOutOfOrder.length === 0,
      missingOrOutOfOrder.length === 0
        ? `${requiredHeadings.length} required heading(s) appear in order`
        : missingOrOutOfOrder.join(', '),
    );

    const boundaryIssues = pageBoundaryIssues(popplerText, requiredHeadings);
    addCheck(
      report,
      'no-orphan-headings',
      boundaryIssues.length === 0,
      boundaryIssues.length === 0
        ? 'no page ends with an orphan heading'
        : boundaryIssues.join('; '),
    );

    const separatorIssues = danglingSeparatorIssues(popplerText);
    addCheck(
      report,
      'no-dangling-separators',
      separatorIssues.length === 0,
      separatorIssues.length === 0
        ? 'no extracted line ends with a dangling separator'
        : separatorIssues.join('; '),
    );
  }

  if (pdfJs && popplerText) {
    const agreement = tokenRecall(popplerText, pdfJs.text);
    report.metrics.pdfJsPopplerAgreement = agreement;
    addCheck(
      report,
      'cross-parser-agreement',
      agreement.percent >= (options.minParserAgreement ?? 98),
      `PDF.js retained ${agreement.percent}% of Poppler tokens`,
    );
  }

  if (options.expectedText && popplerText) {
    const retention = tokenRecall(options.expectedText, popplerText);
    report.metrics.htmlTokenRetention = retention;
    addCheck(
      report,
      'html-token-retention',
      retention.percent >= (options.minTokenRetention ?? 99),
      `PDF retained ${retention.percent}% of expected HTML tokens`,
    );
  }

  if (options.domPreflight) {
    const preflight = options.domPreflight;
    const issues = [
      ...(preflight.unresolvedPlaceholders || []).map(
        (item) => `unresolved placeholder ${item}`,
      ),
      ...(preflight.emptyContacts || []).map(() => 'empty contact item'),
      ...(preflight.horizontalOverflow || []).map(
        (item) =>
          `horizontal overflow in ${item.tag}.${item.className || ''}: ${item.text}`,
      ),
      ...(preflight.bodyOverflow
        ? ['document body overflows horizontally']
        : []),
    ];
    addCheck(
      report,
      'dom-preflight',
      issues.length === 0,
      issues.length === 0 ? 'DOM preflight passed' : issues.join('; '),
    );
  }

  const tikaJar = options.tikaJar || process.env.TIKA_APP_JAR;
  const requireTika =
    options.requireTika === true ||
    process.env.PDF_VALIDATION_REQUIRE_TIKA === '1';
  if (tikaJar) {
    const tika = commandResult('java', ['-jar', tikaJar, '-t', pdfPath], {
      timeout: 120000,
    });
    if (!tika.error && tika.exitCode === 0) {
      const agreement = tokenRecall(popplerText, tika.stdout);
      report.metrics.tikaPopplerAgreement = agreement;
      addCheck(
        report,
        'tika-parser-agreement',
        agreement.percent >= (options.minParserAgreement ?? 98),
        `Apache Tika retained ${agreement.percent}% of Poppler tokens`,
      );
    } else {
      addCheck(
        report,
        'tika-parser-agreement',
        false,
        tika.error?.message ||
          (tika.stderr || tika.stdout).trim() ||
          `Tika exited ${tika.exitCode}`,
        requireTika ? 'error' : 'warning',
      );
    }
  } else {
    addCheck(
      report,
      'tika-parser-agreement',
      false,
      'TIKA_APP_JAR is not configured; optional independent Tika check skipped',
      requireTika ? 'error' : 'warning',
    );
  }

  if (options.manifestPath) {
    try {
      const freshness = await checkManifestFreshness(
        resolve(options.manifestPath),
        root,
        pdfPath,
      );
      report.metrics.manifest = {
        path: resolve(options.manifestPath),
        fresh: freshness.fresh,
      };
      addCheck(
        report,
        'manifest-freshness',
        freshness.fresh,
        freshness.fresh
          ? 'PDF hash and all source hashes match the manifest'
          : freshness.issues.join('; '),
      );
    } catch (error) {
      addCheck(report, 'manifest-freshness', false, error.message);
    }
  }

  report.valid = report.errors.length === 0;
  return report;
}

export function formatValidationReport(report) {
  const lines = [
    `PDF validation: ${report.valid ? 'PASS' : 'FAIL'}`,
    `File: ${report.pdfPath}`,
  ];
  for (const check of report.checks) {
    const marker =
      check.status === 'pass'
        ? 'PASS'
        : check.status === 'warning'
          ? 'WARN'
          : 'FAIL';
    lines.push(`[${marker}] ${check.id}: ${check.details}`);
  }
  return lines.join('\n');
}

export async function loadManifestExpectations(manifestPath, root) {
  const absoluteManifest = resolve(manifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifest, 'utf8'));
  let htmlPath;
  if (manifest.output?.htmlPath) {
    if (isAbsolute(manifest.output.htmlPath)) {
      const candidate = resolve(manifest.output.htmlPath);
      const manifestDirectory = dirname(absoluteManifest);
      const rel = relative(manifestDirectory, candidate);
      if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
        throw new Error(
          `Absolute HTML artifact is not beside its manifest: ${candidate}`,
        );
      }
      htmlPath = candidate;
    } else {
      htmlPath = resolveInsideRoot(root, manifest.output.htmlPath);
    }
  }
  let html;
  if (htmlPath && existsSync(htmlPath)) {
    html = await inspectHtmlFile(htmlPath, {
      viewportWidth: manifest.output?.format === 'a4' ? 679 : 701,
      viewportHeight: manifest.output?.format === 'a4' ? 1007 : 941,
    });
  }
  return {
    manifest,
    htmlPath,
    expectedText: html?.bodyText,
    candidateName: manifest.candidate?.name || html?.candidateName,
    email: manifest.candidate?.email || html?.email,
    requiredHeadings:
      manifest.validation?.requiredHeadings || html?.headings || [],
    expectedFormat: manifest.output?.format,
    expectedPages: manifest.output?.pageCount,
    maxPages: manifest.validation?.maxPages,
    domPreflight: html,
    manifestPath: absoluteManifest,
  };
}

export function manifestPathForPdf(pdfPath) {
  const absolute = resolve(pdfPath);
  return resolve(
    dirname(absolute),
    `${basename(absolute, '.pdf')}.manifest.json`,
  );
}
