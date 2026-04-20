#!/usr/bin/env node

/**
 * check-liveness.mjs — Playwright job link liveness checker
 *
 * Tests whether job posting URLs are still active or have expired.
 * Uses the same detection logic as scan.md step 7.5.
 * Zero Claude API tokens — pure Playwright.
 *
 * Usage:
 *   node scripts/check-liveness.mjs <url1> [url2] ...
 *   node scripts/check-liveness.mjs --file urls.txt
 *
 * Exit code: 0 if all active, 1 if any expired or uncertain
 */

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyLiveness } from './liveness-core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);

export async function checkUrl(page, url) {
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    const status = response?.status() ?? 0;

    // Give SPAs (Ashby, Lever, Workday) time to hydrate
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    const applyControls = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll(
          'a, button, input[type="submit"], input[type="button"], [role="button"]',
        ),
      );

      return candidates
        .filter((element) => {
          if (element.closest('nav, header, footer')) return false;
          if (element.closest('[aria-hidden="true"]')) return false;

          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden')
            return false;
          if (!element.getClientRects().length) return false;

          return Array.from(element.getClientRects()).some(
            (rect) => rect.width > 0 && rect.height > 0,
          );
        })
        .map((element) => {
          const label = [
            element.innerText,
            element.value,
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
          ]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          return label;
        })
        .filter(Boolean);
    });

    return classifyLiveness({ status, finalUrl, bodyText, applyControls });
  } catch (err) {
    return {
      result: 'expired',
      reason: `navigation error: ${err.message.split('\n')[0]}`,
    };
  }
}

export async function resolveUrls(args, readText = readFile) {
  if (args.length === 0) {
    throw new Error('Usage: node scripts/check-liveness.mjs <url1> [url2] ...');
  }

  if (args[0] === '--file') {
    const text = await readText(args[1], 'utf-8');
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  }
  return args;
}

export async function runChecks({
  args = process.argv.slice(2),
  launchBrowser = () => chromium.launch({ headless: true }),
  readText = readFile,
  stdout = console.log,
} = {}) {
  const urls = await resolveUrls(args, readText);

  stdout(`Checking ${urls.length} URL(s)...\n`);

  const browser = await launchBrowser();
  const page = await browser.newPage();

  let active = 0,
    expired = 0,
    uncertain = 0;

  // Sequential — project rule: never Playwright in parallel
  for (const url of urls) {
    const { result, reason } = await checkUrl(page, url);
    const icon = { active: '✅', expired: '❌', uncertain: '⚠️' }[result];
    stdout(`${icon} ${result.padEnd(10)} ${url}`);
    if (result !== 'active') stdout(`           ${reason}`);
    if (result === 'active') active++;
    else if (result === 'expired') expired++;
    else uncertain++;
  }

  await browser.close();

  stdout(
    `\nResults: ${active} active  ${expired} expired  ${uncertain} uncertain`,
  );
  return expired > 0 || uncertain > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runChecks().then(
    (exitCode) => {
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    },
    (err) => {
      if (
        err.message ===
        'Usage: node scripts/check-liveness.mjs <url1> [url2] ...'
      ) {
        console.error(err.message);
        console.error('       node scripts/check-liveness.mjs --file urls.txt');
      } else {
        console.error('Fatal:', err.message);
      }
      process.exit(1);
    },
  );
}
