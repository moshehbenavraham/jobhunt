#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalizeListingUrl,
  fingerprintSimilarity,
} from './fingerprint-core.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(dirname(SCRIPT_PATH), '..');

export function parseFingerprintHistory(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length === 0) return [];
  const columns = lines[0].split('\t');
  if (!columns.includes('url')) return [];
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row = Object.fromEntries(
      columns.map((column, index) => [column, values[index] || '']),
    );
    return {
      url: row.url,
      date: row.first_seen,
      company: row.company,
      title: row.title,
      status: row.status,
      canonicalUrl:
        row.canonical_url || canonicalizeListingUrl(row.url) || row.url,
      identityFingerprint: row.identity_fingerprint,
      contentFingerprint: row.content_fingerprint,
      recordedStatus: row.listing_status,
      matchedUrl: row.matched_url,
    };
  });
}

export function detectListingEvents(
  rows,
  { windowDays = 90, threshold = 0.92, now = Date.now() } = {},
) {
  const cutoff = now - windowDays * 86_400_000;
  const recent = (rows || []).filter((row) => {
    const timestamp = Date.parse(row.date);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
  const events = [];
  for (let rightIndex = 1; rightIndex < recent.length; rightIndex++) {
    const right = recent[rightIndex];
    let best = null;
    for (let leftIndex = 0; leftIndex < rightIndex; leftIndex++) {
      const left = recent[leftIndex];
      let kind = null;
      let score =
        right.contentFingerprint && left.contentFingerprint
          ? fingerprintSimilarity(
              right.contentFingerprint,
              left.contentFingerprint,
            )
          : 0;
      if (
        right.canonicalUrl &&
        right.canonicalUrl === left.canonicalUrl &&
        right.url !== left.url
      ) {
        kind = 'cosmetic_duplicate';
        score = 1;
      } else if (
        right.contentFingerprint &&
        left.contentFingerprint &&
        score >= threshold
      ) {
        kind =
          right.identityFingerprint === left.identityFingerprint
            ? 'relisted'
            : 'cross_listing';
      } else if (
        right.identityFingerprint &&
        right.identityFingerprint === left.identityFingerprint
      ) {
        kind =
          right.contentFingerprint && left.contentFingerprint
            ? 'materially_changed'
            : 'possible_repost';
      }
      if (kind && (!best || score > best.score)) {
        best = { kind, score, current: right, previous: left };
      }
    }
    if (best) events.push(best);
  }
  return events.sort(
    (left, right) =>
      right.current.date.localeCompare(left.current.date) ||
      right.score - left.score,
  );
}

export function renderRepostSummary(events) {
  if (events.length === 0) return 'No listing changes detected.';
  return events
    .map(
      (event) =>
        `${event.current.date} | ${event.kind} | ${event.current.company} | ${event.current.title} | ${event.previous.url} -> ${event.current.url}`,
    )
    .join('\n');
}

export function runDetectReposts(
  args = process.argv.slice(2),
  { stdout = console.log } = {},
) {
  const path = resolve(ROOT, 'data', 'scan-history.tsv');
  const windowIndex = args.indexOf('--window');
  const windowDays =
    windowIndex === -1 ? 90 : Number(args[windowIndex + 1] || 90);
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    throw new Error('--window must be a positive number of days');
  }
  const rows = existsSync(path)
    ? parseFingerprintHistory(readFileSync(path, 'utf8'))
    : [];
  const events = detectListingEvents(rows, { windowDays });
  if (args.includes('--json')) {
    stdout(JSON.stringify({ windowDays, events }, null, 2));
  } else {
    stdout(renderRepostSummary(events));
  }
  return events;
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    runDetectReposts();
  } catch (error) {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  }
}
