#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { publishArtifactSet, resolveArtifactPath } from './artifact-policy.mjs';
import {
  assertSafeUrl,
  installPlaywrightNetworkGuard,
  parseSafeUrl,
} from './network-policy.mjs';
import { safeFilename } from './path-policy.mjs';
import { validateGenericPdf } from './pdf-artifact-core.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');

function slug(value, fallback) {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return normalized || fallback;
}

export function parsePostingPageTitle(title) {
  const cleaned = String(title || '')
    .replace(
      /\s*[|–-]\s*(?:greenhouse|lever|ashby|workday|linkedin|indeed|wellfound)\s*$/i,
      '',
    )
    .trim();
  const at = cleaned.match(/^(.+?)\s+at\s+(.+)$/i);
  if (at) return { role: at[1].trim(), company: at[2].trim() };
  const divided = cleaned.match(/^([^|–]+?)\s*[|–]\s*(.+)$/);
  if (divided) {
    const roleWords =
      /engineer|manager|director|analyst|scientist|designer|developer|lead|head|architect/i;
    return roleWords.test(divided[2])
      ? { company: divided[1].trim(), role: divided[2].trim() }
      : { role: divided[1].trim(), company: divided[2].trim() };
  }
  const dash = cleaned.match(/^(.+?)\s+-\s+(.+)$/);
  return dash
    ? { role: dash[1].trim(), company: dash[2].trim() }
    : { company: null, role: cleaned || null };
}

export function companyFromPostingUrl(input) {
  const url = parseSafeUrl(input);
  const parts = url.pathname.split('/').filter(Boolean);
  if (
    [
      'boards.greenhouse.io',
      'job-boards.greenhouse.io',
      'jobs.lever.co',
      'jobs.eu.lever.co',
      'jobs.ashbyhq.com',
    ].includes(url.hostname)
  ) {
    return parts[0] || null;
  }
  return null;
}

export function archiveFilename({
  date = new Date().toISOString().slice(0, 10),
  company,
  role,
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Archive date must use YYYY-MM-DD: ${date}`);
  }
  return safeFilename(
    `${date}_${slug(company, 'unknown-company')}_${slug(role, 'job')}.pdf`,
  );
}

export function extractPendingArchiveTargets(pipelineText) {
  const targets = [];
  for (const line of String(pipelineText).split(/\r?\n/)) {
    if (!/^\s*-\s*\[\s\]\s+/.test(line)) continue;
    const match = line.match(/https?:\/\/[^\s|)]+/);
    if (!match) continue;
    const fields = line.split('|').map((field) => field.trim());
    targets.push({
      url: match[0],
      company: fields[1] || null,
      role: fields[2] || null,
    });
  }
  return targets;
}

async function bodyText(page) {
  if (typeof page.locator === 'function') {
    return page
      .locator('body')
      .innerText({ timeout: 5000 })
      .catch(() => '');
  }
  return page.$eval('body', (element) => element.innerText).catch(() => '');
}

async function headingText(page) {
  return page
    .$eval('h1', (element) => element.innerText.trim())
    .catch(() => '');
}

function contentLooksLikePosting(text, heading) {
  return (
    String(heading).trim().length > 2 &&
    String(text).trim().length >= 120 &&
    /\b(?:responsibilit|qualification|requirement|experience|role|about the job)\w*/i.test(
      text,
    )
  );
}

export async function archivePosting({
  root = DEFAULT_ROOT,
  browser,
  url,
  company: companyHint,
  role: roleHint,
  date,
  force = false,
  resolver,
  validatePdf = validateGenericPdf,
} = {}) {
  const initial = await assertSafeUrl(url, { resolver });
  const page = await browser.newPage();
  const removeGuard = await installPlaywrightNetworkGuard(page, { resolver });
  try {
    const response = await page.goto(initial.url.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    if (typeof page.waitForLoadState === 'function') {
      await page
        .waitForLoadState('networkidle', { timeout: 4000 })
        .catch(() => {});
    }
    const final = await assertSafeUrl(page.url(), { resolver });
    const [title, heading, text] = await Promise.all([
      page.title(),
      headingText(page),
      bodyText(page),
    ]);
    if (!contentLooksLikePosting(text, heading)) {
      throw new Error(
        'Rendered page does not contain enough real job-posting content',
      );
    }
    const detected = parsePostingPageTitle(title);
    const company =
      companyHint ||
      detected.company ||
      companyFromPostingUrl(final.url) ||
      'unknown-company';
    const role = roleHint || detected.role || heading || 'job';
    const filename = archiveFilename({ date, company, role });
    const pdf = resolveArtifactPath({
      root,
      directory: 'jds',
      requested: filename,
      extensions: ['.pdf'],
      label: 'Posting archive PDF',
    });
    const manifestPath = resolveArtifactPath({
      root,
      directory: 'jds',
      requested: `${filename.slice(0, -4)}.manifest.json`,
      extensions: ['.json'],
      label: 'Posting archive manifest',
    }).path;
    const stageDirectory = resolve(
      pdf.artifactRoot,
      `.archive-stage-${process.pid}-${randomUUID()}`,
    );
    await mkdir(stageDirectory);
    try {
      const stagedPdf = resolve(stageDirectory, basename(pdf.path));
      const stagedManifest = resolve(stageDirectory, basename(manifestPath));
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
      });
      const validation = await validatePdf(pdfBuffer, { maxPages: 100 });
      if (!validation.valid) {
        throw new Error(
          `Posting archive PDF validation failed: ${validation.checks
            .filter((check) => !check.valid)
            .map((check) => check.id)
            .join(', ')}`,
        );
      }
      const archivedAt = new Date().toISOString();
      const manifest = {
        schemaVersion: 1,
        artifactType: 'job-posting-archive',
        archivedAt,
        source: {
          requestedUrl: initial.url.toString(),
          finalUrl: final.url.toString(),
          httpStatus: response?.status?.() ?? null,
          pageTitle: title,
          contentSha256: createHash('sha256').update(text).digest('hex'),
          contentCharacters: text.length,
        },
        job: { company, role, heading },
        output: {
          pdfPath: `jds/${filename}`,
          pdfSha256: validation.sha256,
          fileSize: validation.size,
          pageCount: validation.pageCount,
        },
        validation: {
          valid: true,
          checks: validation.checks,
        },
      };
      await writeFile(stagedPdf, pdfBuffer, { mode: 0o600 });
      await writeFile(
        stagedManifest,
        `${JSON.stringify(manifest, null, 2)}\n`,
        { mode: 0o600 },
      );
      await publishArtifactSet(
        new Map([
          [stagedPdf, pdf.path],
          [stagedManifest, manifestPath],
        ]),
        { force },
      );
      return {
        filename,
        pdfPath: pdf.path,
        manifestPath,
        reference: `local:jds/${filename}`,
        manifest,
      };
    } finally {
      await rm(stageDirectory, { recursive: true, force: true });
    }
  } finally {
    await removeGuard();
    await page.close();
  }
}

function parseArgs(argv) {
  const options = {
    root: DEFAULT_ROOT,
    force: false,
    dryRun: false,
    pipeline: false,
    json: false,
  };
  for (const value of argv) {
    if (value === '--pipeline') options.pipeline = true;
    else if (value === '--force') options.force = true;
    else if (value === '--dry-run') options.dryRun = true;
    else if (value === '--json') options.json = true;
    else if (value.startsWith('--company=')) {
      options.company = value.slice('--company='.length);
    } else if (value.startsWith('--role=')) {
      options.role = value.slice('--role='.length);
    } else if (value.startsWith('--root=')) {
      options.root = resolve(value.slice('--root='.length));
    } else if (value === '--help' || value === '-h') options.help = true;
    else if (!value.startsWith('--') && !options.url) options.url = value;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

export async function runArchiveCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help || (!options.pipeline && !options.url)) {
    console.log(`Usage:
  node scripts/archive-posting.mjs <url> [--company=NAME] [--role=TITLE]
  node scripts/archive-posting.mjs --pipeline [--dry-run] [--force]

Archives sequentially to jds/ with a sibling provenance/validation manifest.`);
    return options.help ? 0 : 1;
  }
  const root = resolve(options.root);
  let targets;
  if (options.pipeline) {
    const pipelinePath = resolve(root, 'data', 'pipeline.md');
    if (!existsSync(pipelinePath)) {
      throw new Error('data/pipeline.md does not exist');
    }
    targets = extractPendingArchiveTargets(
      await readFile(pipelinePath, 'utf8'),
    );
  } else {
    targets = [
      { url: options.url, company: options.company, role: options.role },
    ];
  }
  if (options.dryRun) {
    const previews = targets.map((target) => ({
      ...target,
      filename: archiveFilename({
        company:
          target.company ||
          companyFromPostingUrl(target.url) ||
          'unknown-company',
        role: target.role || 'job',
      }),
    }));
    console.log(JSON.stringify(previews, null, 2));
    return 0;
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const target of targets) {
      try {
        results.push(
          await archivePosting({
            root,
            browser,
            ...target,
            force: options.force,
          }),
        );
      } catch (error) {
        results.push({ url: target.url, error: error.message });
      }
    }
  } finally {
    await browser.close();
  }
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const result of results) {
      console.log(
        result.error
          ? `FAILED ${result.url}: ${result.error}`
          : `Archived ${result.reference} (${result.manifest.output.pageCount} page(s))`,
      );
    }
  }
  return results.some((result) => result.error) ? 1 : 0;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  runArchiveCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`Posting archive failed: ${error.message}`);
      process.exitCode = 1;
    });
}
