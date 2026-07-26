import { createHash } from 'node:crypto';

export const FINGERPRINT_MIN_TEXT = 200;
export const CROSS_LISTING_THRESHOLD = 0.92;
const TRACKING_KEYS = new Set([
  'fbclid',
  'gh_jid',
  'gh_src',
  'gclid',
  'ref',
  'referrer',
  'source',
  'trk',
]);

export function canonicalizeListingUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    url.pathname =
      url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    for (const key of [...url.searchParams.keys()]) {
      if (
        key.toLowerCase().startsWith('utm_') ||
        TRACKING_KEYS.has(key.toLowerCase())
      ) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return '';
  }
}

export function normalizeJdText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fingerprintText(value) {
  const text = normalizeJdText(value);
  if (text.length < FINGERPRINT_MIN_TEXT) return '';
  const tokens = text.split(' ');
  if (tokens.length < 3) return '';
  const weights = Array(64).fill(0);
  for (let index = 0; index <= tokens.length - 3; index++) {
    const digest = createHash('sha256')
      .update(tokens.slice(index, index + 3).join(' '))
      .digest();
    for (let bit = 0; bit < 64; bit++) {
      weights[bit] += (digest[bit >> 3] >> (7 - (bit & 7))) & 1 ? 1 : -1;
    }
  }
  let hash = 0n;
  for (let bit = 0; bit < 64; bit++) {
    if (weights[bit] > 0) hash |= 1n << BigInt(63 - bit);
  }
  return hash.toString(16).padStart(16, '0');
}

export function fingerprintSimilarity(left, right) {
  if (
    !/^[0-9a-f]{16}$/.test(left || '') ||
    !/^[0-9a-f]{16}$/.test(right || '')
  ) {
    return 0;
  }
  let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (value) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return 1 - distance / 64;
}

function identityPart(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function identityFingerprint(job) {
  const company = identityPart(job.company);
  const title = identityPart(job.title);
  if (!company || !title) return '';
  return createHash('sha256')
    .update(`${company}\0${title}`)
    .digest('hex')
    .slice(0, 20);
}

export function enrichListingFingerprint(job) {
  return {
    ...job,
    canonicalUrl: canonicalizeListingUrl(job.url),
    identityFingerprint: identityFingerprint(job),
    contentFingerprint: fingerprintText(job.description),
  };
}

export function classifyListingAgainstHistory(
  job,
  history,
  {
    threshold = CROSS_LISTING_THRESHOLD,
    windowDays = 90,
    now = Date.now(),
  } = {},
) {
  const matches = [];
  const cutoff = now - windowDays * 86_400_000;
  for (const row of history || []) {
    const timestamp = Date.parse(row.firstSeen || row.first_seen);
    if (Number.isFinite(timestamp) && timestamp < cutoff) continue;
    if (job.canonicalUrl && job.canonicalUrl === row.canonicalUrl) {
      matches.push({ kind: 'cosmetic_duplicate', score: 1, row });
      continue;
    }
    if (
      job.contentFingerprint &&
      row.contentFingerprint &&
      fingerprintSimilarity(job.contentFingerprint, row.contentFingerprint) >=
        threshold
    ) {
      const sameIdentity =
        job.identityFingerprint &&
        job.identityFingerprint === row.identityFingerprint;
      matches.push({
        kind: sameIdentity ? 'relisted' : 'cross_listing',
        score: fingerprintSimilarity(
          job.contentFingerprint,
          row.contentFingerprint,
        ),
        row,
      });
      continue;
    }
    if (
      job.identityFingerprint &&
      job.identityFingerprint === row.identityFingerprint
    ) {
      matches.push({
        kind:
          job.contentFingerprint && row.contentFingerprint
            ? 'materially_changed'
            : 'possible_repost',
        score: 0,
        row,
      });
    }
  }
  const priority = {
    cosmetic_duplicate: 0,
    cross_listing: 1,
    relisted: 2,
    materially_changed: 3,
    possible_repost: 4,
  };
  return (
    matches.sort(
      (left, right) =>
        priority[left.kind] - priority[right.kind] || right.score - left.score,
    )[0] || null
  );
}
