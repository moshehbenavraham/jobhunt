#!/usr/bin/env node

/**
 * scan.mjs - Zero-token portal scanner
 *
 * Fetches supported ATS APIs directly, applies title filters from portals.yml,
 * deduplicates against existing history, and appends new offers to pipeline.md
 * and scan-history.tsv.
 *
 * Usage:
 *   node scripts/scan.mjs
 *   node scripts/scan.mjs --dry-run
 *   node scripts/scan.mjs --compare-clean
 *   node scripts/scan.mjs --company Cohere
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  detectApi,
  fetchJson,
  PARSERS,
  parseAshby,
  parseGreenhouse,
  parseLever,
} from './ats-core.mjs';

const parseYaml = yaml.load;

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const PROJECT_ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..');

const DATA_DIR = resolve(PROJECT_ROOT, 'data');
const PORTALS_PATH = resolve(PROJECT_ROOT, 'portals.yml');
const PROFILE_PATH = resolve(PROJECT_ROOT, 'config', 'profile.yml');
const SCAN_HISTORY_PATH = resolve(DATA_DIR, 'scan-history.tsv');
const PIPELINE_PATH = resolve(DATA_DIR, 'pipeline.md');
const APPLICATIONS_PATH = resolve(DATA_DIR, 'applications.md');

const CONCURRENCY = 10;
const PIPELINE_TEMPLATE = [
  '# Pipeline',
  '',
  '## Shortlist',
  '',
  'Run `npm run scan` to refresh the shortlist.',
  '',
  '## Pending',
  '',
  '## Processed',
  '',
].join('\n');
const SCAN_HISTORY_HEADER = 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n';
const REMOTE_POLICIES = new Set([
  'unrestricted',
  'remote_only',
  'remote_or_allowed_locations',
  'allowed_locations_only',
]);
const REMOTE_TERMS = [
  'remote',
  'distributed',
  'anywhere',
  'work from home',
  'home based',
  'home-based',
];
const LOCATION_REGION_TERMS = {
  US: [
    'united states',
    'usa',
    'u s a',
    'us',
    'u s',
    'us only',
    'north america',
    'new york',
    'san francisco',
    'nashville',
    'seattle',
    'austin',
    'chicago',
    'boston',
    'los angeles',
  ],
  CANADA: ['canada', 'toronto', 'vancouver', 'montreal'],
  ISRAEL: ['israel', 'tel aviv', 'jerusalem'],
  EMEA: [
    'emea',
    'europe',
    'european union',
    'united kingdom',
    'uk',
    'london',
    'berlin',
    'germany',
    'france',
    'paris',
    'poland',
    'amsterdam',
    'netherlands',
    'spain',
    'madrid',
    'middle east',
    'dubai',
    'riyadh',
    'uae',
    'saudi arabia',
  ],
  LATAM: [
    'latam',
    'latin america',
    'mexico',
    'brazil',
    'argentina',
    'colombia',
    'chile',
  ],
  APAC: [
    'apac',
    'asia pacific',
    'australia',
    'new zealand',
    'india',
    'japan',
    'tokyo',
    'singapore',
    'korea',
    'seoul',
    'hong kong',
    'philippines',
  ],
};
const US_STATE_CODE_PATTERN =
  /,\s*(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/i;
const SHORTLIST_BUCKETS = [
  { id: 'strongest-fit', label: 'Strongest fit' },
  { id: 'possible-fit', label: 'Possible fit' },
  { id: 'adjacent-or-noisy', label: 'Adjacent or noisy' },
];
const SHORTLIST_LANE_LABELS = {
  'forward-deployed': 'Forward Deployed',
  deployment: 'Deployment',
  solutions: 'Solutions',
  'solutions-architect': 'Solutions Architect',
  'solutions-engineer': 'Solutions Engineer',
  'customer-engineering': 'Customer Engineering',
  'priority-title': 'core target roles',
};
const SHORTLIST_RISK_HINTS = [
  {
    term: 'member of technical staff',
    penalty: 1.25,
    reason: 'title is wrapped in a broader MOTS label',
  },
  { term: 'partner', penalty: 0.75, reason: 'partner-facing variant' },
  { term: 'founding', penalty: 0.75, reason: 'founding-stage scope' },
  { term: 'specialist', penalty: 0.5, reason: 'specialized sub-track' },
  {
    term: 'infrastructure',
    penalty: 0.5,
    reason: 'infrastructure-heavy specialization',
  },
];

mkdirSync(DATA_DIR, { recursive: true });

function ensurePipelineFile() {
  if (!existsSync(PIPELINE_PATH)) {
    writeFileSync(PIPELINE_PATH, PIPELINE_TEMPLATE, 'utf-8');
  }
}

function ensureScanHistoryFile() {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, SCAN_HISTORY_HEADER, 'utf-8');
  }
}

function ensureScanArtifacts() {
  ensurePipelineFile();
  ensureScanHistoryFile();
}

function loadProfileConfig() {
  if (!existsSync(PROFILE_PATH)) return {};
  return parseYaml(readFileSync(PROFILE_PATH, 'utf-8')) || {};
}

function normalizeMatchText(value) {
  return ` ${String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

function includesNormalizedTerm(normalizedText, term) {
  const normalizedTerm = normalizeMatchText(term);
  return (
    normalizedTerm.trim().length > 0 && normalizedText.includes(normalizedTerm)
  );
}

function normalizeStringList(values) {
  const source = Array.isArray(values) ? values : values ? [values] : [];
  return source.map((value) => String(value || '').trim()).filter(Boolean);
}

function splitProfileTerms(value) {
  return normalizeStringList(String(value || '').split(/[|/,;]/));
}

function normalizeRegionList(values) {
  return normalizeStringList(values)
    .map((value) => value.toUpperCase())
    .filter((value) => value in LOCATION_REGION_TERMS || value === 'REMOTE');
}

function buildDiscoveryConfig(profileConfig) {
  const discovery =
    profileConfig && typeof profileConfig.discovery === 'object'
      ? profileConfig.discovery
      : {};
  const remotePolicyRaw =
    typeof discovery.remote_policy === 'string'
      ? discovery.remote_policy.trim().toLowerCase()
      : 'unrestricted';
  const remotePolicy = REMOTE_POLICIES.has(remotePolicyRaw)
    ? remotePolicyRaw
    : 'unrestricted';
  const allowedLocationTerms = normalizeStringList(
    discovery.allowed_location_terms,
  );
  const blockedLocationTerms = normalizeStringList(
    discovery.blocked_location_terms,
  );
  const allowedRegions = new Set(
    normalizeRegionList(discovery.allowed_regions),
  );
  const blockedRegions = new Set(
    normalizeRegionList(discovery.blocked_regions),
  );
  const allowUnknownLocations = discovery.allow_unknown_locations !== false;
  const allowRemoteUnknownLocations =
    discovery.allow_remote_unknown_locations !== false;

  return {
    remotePolicy,
    allowedLocationTerms,
    blockedLocationTerms,
    allowedRegions,
    blockedRegions,
    allowUnknownLocations,
    allowRemoteUnknownLocations,
    enabled:
      remotePolicy !== 'unrestricted' ||
      allowedLocationTerms.length > 0 ||
      blockedLocationTerms.length > 0 ||
      allowedRegions.size > 0 ||
      blockedRegions.size > 0,
  };
}

function classifyLocation(location) {
  const raw = String(location || '').trim();
  const normalized = normalizeMatchText(raw);
  const regions = new Set();
  const isRemote = REMOTE_TERMS.some((term) =>
    includesNormalizedTerm(normalized, term),
  );

  if (isRemote) regions.add('REMOTE');
  if (US_STATE_CODE_PATTERN.test(raw)) regions.add('US');

  for (const [region, terms] of Object.entries(LOCATION_REGION_TERMS)) {
    if (terms.some((term) => includesNormalizedTerm(normalized, term))) {
      regions.add(region);
    }
  }

  const sortedRegions = [...regions].sort();

  return {
    raw,
    normalized,
    isRemote,
    regions: sortedRegions,
    hasGeographySignal: sortedRegions.some((region) => region !== 'REMOTE'),
  };
}

function evaluateLocation(location, discoveryConfig) {
  const info = classifyLocation(location);
  if (!discoveryConfig?.enabled) {
    return { allowed: true, reason: null, detail: null, info };
  }

  const matchedBlockedTerm = discoveryConfig.blockedLocationTerms.find((term) =>
    includesNormalizedTerm(info.normalized, term),
  );
  if (matchedBlockedTerm) {
    return {
      allowed: false,
      reason: 'blocked-location-term',
      detail: matchedBlockedTerm,
      info,
    };
  }

  const blockedRegion = info.regions.find((region) =>
    discoveryConfig.blockedRegions.has(region),
  );
  if (blockedRegion) {
    return {
      allowed: false,
      reason: 'blocked-region',
      detail: blockedRegion,
      info,
    };
  }

  if (discoveryConfig.remotePolicy === 'remote_only' && !info.isRemote) {
    return { allowed: false, reason: 'not-remote', detail: null, info };
  }

  const hasAllowedConstraints =
    discoveryConfig.allowedLocationTerms.length > 0 ||
    discoveryConfig.allowedRegions.size > 0;
  const matchedAllowedTerm = discoveryConfig.allowedLocationTerms.find((term) =>
    includesNormalizedTerm(info.normalized, term),
  );
  const matchedAllowedRegion = info.regions.find((region) =>
    discoveryConfig.allowedRegions.has(region),
  );
  const hasAllowedMatch = Boolean(matchedAllowedTerm || matchedAllowedRegion);
  const requiresAllowedMatch =
    hasAllowedConstraints &&
    (discoveryConfig.remotePolicy === 'allowed_locations_only' ||
      (discoveryConfig.remotePolicy === 'remote_or_allowed_locations' &&
        !info.isRemote));
  const isUnknownLocation =
    info.raw.length === 0 ||
    (!matchedAllowedTerm && !matchedAllowedRegion && !info.hasGeographySignal);

  if (requiresAllowedMatch && hasAllowedMatch) {
    return { allowed: true, reason: null, detail: null, info };
  }

  if (requiresAllowedMatch && !hasAllowedMatch) {
    const allowUnknown = info.isRemote
      ? discoveryConfig.allowRemoteUnknownLocations
      : discoveryConfig.allowUnknownLocations;
    if (isUnknownLocation && allowUnknown) {
      return { allowed: true, reason: null, detail: null, info };
    }
    if (isUnknownLocation) {
      return { allowed: false, reason: 'unknown-location', detail: null, info };
    }
    return {
      allowed: false,
      reason: 'outside-allowed-geography',
      detail: null,
      info,
    };
  }

  if (isUnknownLocation) {
    const allowUnknown = info.isRemote
      ? discoveryConfig.allowRemoteUnknownLocations
      : discoveryConfig.allowUnknownLocations;
    if (!allowUnknown) {
      return { allowed: false, reason: 'unknown-location', detail: null, info };
    }
  }

  return { allowed: true, reason: null, detail: null, info };
}

function describeLocationDecision(decision) {
  switch (decision.reason) {
    case 'blocked-location-term':
      return `blocked location term (${decision.detail})`;
    case 'blocked-region':
      return `blocked region (${decision.detail})`;
    case 'not-remote':
      return 'remote-only policy';
    case 'outside-allowed-geography':
      return 'outside allowed geography';
    case 'unknown-location':
      return 'unknown location';
    default:
      return 'location filtered';
  }
}

function summarizeLocationRejections(rejections, limit = 4) {
  const grouped = new Map();

  for (const rejection of rejections) {
    const label = describeLocationDecision(rejection);
    if (!grouped.has(label)) grouped.set(label, new Set());
    grouped
      .get(label)
      .add(rejection.info.raw || `${rejection.company} | ${rejection.title}`);
  }

  return [...grouped.entries()].map(([label, values]) => {
    const items = [...values].sort();
    if (items.length <= limit) {
      return `${label}: ${items.join(', ')}`;
    }
    return `${label}: ${items.slice(0, limit).join(', ')} (+${items.length - limit} more)`;
  });
}

function formatDiscoverySummary(discoveryConfig) {
  if (!discoveryConfig?.enabled) return [];

  const lines = [`Profile discovery: ${discoveryConfig.remotePolicy}`];

  if (discoveryConfig.allowedLocationTerms.length > 0) {
    lines.push(
      `Allowed location terms: ${summarizeNames(
        discoveryConfig.allowedLocationTerms,
      )}`,
    );
  }

  if (discoveryConfig.allowedRegions.size > 0) {
    lines.push(
      `Allowed regions: ${[...discoveryConfig.allowedRegions].sort().join(', ')}`,
    );
  }

  if (discoveryConfig.blockedLocationTerms.length > 0) {
    lines.push(
      `Blocked location terms: ${summarizeNames(
        discoveryConfig.blockedLocationTerms,
      )}`,
    );
  }

  if (discoveryConfig.blockedRegions.size > 0) {
    lines.push(
      `Blocked regions: ${[...discoveryConfig.blockedRegions].sort().join(', ')}`,
    );
  }

  return lines;
}

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map((keyword) =>
    keyword.toLowerCase(),
  );
  const negative = (titleFilter?.negative || []).map((keyword) =>
    keyword.toLowerCase(),
  );

  return (title) => {
    const lower = title.toLowerCase();
    const hasPositive =
      positive.length === 0 ||
      positive.some((keyword) => lower.includes(keyword));
    const hasNegative = negative.some((keyword) => lower.includes(keyword));
    return hasPositive && !hasNegative;
  };
}

function loadSeenUrls() {
  const seen = new Set();

  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();
  if (!existsSync(APPLICATIONS_PATH)) return seen;

  const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
  for (const match of text.matchAll(
    /\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g,
  )) {
    const company = match[1].trim().toLowerCase();
    const role = match[2].trim().toLowerCase();
    if (company && role && company !== 'company') {
      seen.add(`${company}::${role}`);
    }
  }

  return seen;
}

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  ensurePipelineFile();
  let text = readFileSync(PIPELINE_PATH, 'utf-8');

  const marker = '## Pending';
  const idx = text.indexOf(marker);

  if (idx === -1) {
    const processedIdx = text.indexOf('## Processed');
    const insertAt = processedIdx === -1 ? text.length : processedIdx;
    const block =
      `\n${marker}\n\n` +
      offers
        .map(
          (offer) => `- [ ] ${offer.url} | ${offer.company} | ${offer.title}`,
        )
        .join('\n') +
      '\n\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    const block =
      '\n' +
      offers
        .map(
          (offer) => `- [ ] ${offer.url} | ${offer.company} | ${offer.title}`,
        )
        .join('\n') +
      '\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  if (offers.length === 0) return;

  ensureScanHistoryFile();
  const lines = `${offers
    .map(
      (offer) =>
        `${offer.url}\t${date}\t${offer.source}\t${offer.title}\t${offer.company}\tadded`,
    )
    .join('\n')}\n`;
  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

async function parallelFetch(tasks, limit) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < tasks.length) {
      const task = tasks[index++];
      results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    next(),
  );
  await Promise.all(workers);
  return results;
}

function summarizeNames(names, limit = 6) {
  const unique = [...new Set(names.filter(Boolean))].sort();
  if (unique.length <= limit) return unique.join(', ');
  return `${unique.slice(0, limit).join(', ')} (+${unique.length - limit} more)`;
}

function readPipelineText() {
  if (!existsSync(PIPELINE_PATH)) return PIPELINE_TEMPLATE;
  return readFileSync(PIPELINE_PATH, 'utf-8');
}

function getSectionRange(text, marker) {
  const start = text.indexOf(marker);
  if (start === -1) return null;

  const nextSection = text.indexOf('\n## ', start + marker.length);
  return {
    start,
    end: nextSection === -1 ? text.length : nextSection + 1,
  };
}

function normalizePendingOffer(offer) {
  return {
    url: String(offer.url || '').trim(),
    company: String(offer.company || '').trim(),
    title: String(offer.title || '').trim(),
    location: String(offer.location || '').trim(),
  };
}

function parsePendingOffersFromPipeline(text) {
  const section = getSectionRange(text, '## Pending');
  if (!section) return [];

  const pendingText = text.slice(section.start, section.end);
  const offers = [];

  for (const line of pendingText.split('\n')) {
    const match = line.match(
      /^- \[ \] (https?:\/\/\S+)(?: \| ([^|]+) \| (.+))?$/,
    );
    if (!match) continue;
    offers.push(
      normalizePendingOffer({
        url: match[1],
        company: match[2] || '',
        title: match[3] || '',
      }),
    );
  }

  return offers;
}

function loadPendingPipelineOffers() {
  return parsePendingOffersFromPipeline(readPipelineText());
}

function mergeOffers(...offerLists) {
  const merged = [];
  const seen = new Set();

  for (const offers of offerLists) {
    for (const offer of offers || []) {
      const normalized = normalizePendingOffer(offer);
      if (!normalized.url || seen.has(normalized.url)) continue;
      seen.add(normalized.url);
      merged.push(normalized);
    }
  }

  return merged;
}

function buildCompanyPriorityMap(companies) {
  const priorityMap = new Map();

  companies.forEach((company, index) => {
    priorityMap.set(company.name.toLowerCase(), index);
  });

  return priorityMap;
}

function inferLaneFromKeyword(keyword) {
  const lower = String(keyword || '').toLowerCase();
  if (lower.includes('forward deployed')) return 'forward-deployed';
  if (lower.includes('deployment')) return 'deployment';
  if (lower.includes('architect')) return 'solutions-architect';
  if (lower.includes('engineer')) {
    if (lower.includes('solution')) return 'solutions-engineer';
    if (lower.includes('customer')) return 'customer-engineering';
  }
  return 'priority-title';
}

function describePositiveKeyword(keyword) {
  const lower = String(keyword || '').toLowerCase();
  if (lower.includes('forward deployed'))
    return 'direct forward-deployed title';
  if (lower.includes('deployment strategist')) return 'direct deployment title';
  if (lower.includes('deployment')) return 'direct deployment title';
  if (
    lower.includes('solutions architect') ||
    lower.includes('solution architect')
  ) {
    return 'direct solutions-architect title';
  }
  if (
    lower.includes('solutions engineer') ||
    lower.includes('solution engineer')
  ) {
    return 'direct solutions-engineer title';
  }
  if (lower.includes('customer engineer')) return 'customer-engineering title';
  return `matched target term "${keyword}"`;
}

function scorePositiveKeyword(keyword) {
  const lower = String(keyword || '').toLowerCase();
  if (lower.includes('forward deployed')) return 6;
  if (lower.includes('deployment')) return 5.5;
  if (
    lower.includes('solutions architect') ||
    lower.includes('solution architect')
  ) {
    return 5;
  }
  if (
    lower.includes('solutions engineer') ||
    lower.includes('solution engineer')
  ) {
    return 4.5;
  }
  if (lower.includes('customer engineer')) return 4;
  return 3.5;
}

function scoreOfferForShortlist(offer, shortlistContext) {
  const title = String(offer.title || '');
  const normalizedTitle = normalizeMatchText(title);
  const matchedKeywords = shortlistContext.positiveKeywords.filter((keyword) =>
    includesNormalizedTerm(normalizedTitle, keyword),
  );
  const why = [];
  let score = 0;

  matchedKeywords.forEach((keyword, index) => {
    const keywordScore = scorePositiveKeyword(keyword);
    score += index === 0 ? keywordScore : Math.max(1.5, keywordScore - 2);
    why.push(describePositiveKeyword(keyword));
  });

  const companyKey = String(offer.company || '').toLowerCase();
  if (shortlistContext.companyPriority.has(companyKey)) {
    const index = shortlistContext.companyPriority.get(companyKey);
    const priorityBoost = Math.max(0.5, 2.2 - index * 0.18);
    score += priorityBoost;
    if (priorityBoost >= 1.4) {
      why.push('high-priority target company');
    } else if (priorityBoost >= 0.9) {
      why.push('core company list');
    }
  }

  if (offer.location) {
    const locationInfo = classifyLocation(offer.location);
    const matchedAllowedTerm =
      shortlistContext.discovery.allowedLocationTerms.find((term) =>
        includesNormalizedTerm(locationInfo.normalized, term),
      );
    const matchedAllowedRegion = locationInfo.regions.find((region) =>
      shortlistContext.discovery.allowedRegions.has(region),
    );

    if (locationInfo.isRemote) {
      score += 0.75;
      why.push('remote-compatible');
    } else if (matchedAllowedTerm || matchedAllowedRegion) {
      score += 0.5;
      why.push('aligned geography');
    }
  }

  for (const hint of SHORTLIST_RISK_HINTS) {
    if (!includesNormalizedTerm(normalizedTitle, hint.term)) continue;
    score -= hint.penalty;
    why.push(hint.reason);
  }

  const primaryKeyword = matchedKeywords[0] || '';
  const lane = inferLaneFromKeyword(primaryKeyword);
  const roundedScore = Number(score.toFixed(2));
  let bucket = 'adjacent-or-noisy';

  if (roundedScore >= 7.5) {
    bucket = 'strongest-fit';
  } else if (roundedScore >= 5.5) {
    bucket = 'possible-fit';
  }

  return {
    ...normalizePendingOffer(offer),
    bucket,
    bucketLabel:
      SHORTLIST_BUCKETS.find((entry) => entry.id === bucket)?.label ||
      'Possible fit',
    lane,
    score: roundedScore,
    why: [...new Set(why)].slice(0, 3),
  };
}

function compareShortlistOffers(a, b) {
  const bucketRank = new Map(
    SHORTLIST_BUCKETS.map((bucket, index) => [bucket.id, index]),
  );
  return (
    bucketRank.get(a.bucket) - bucketRank.get(b.bucket) ||
    b.score - a.score ||
    a.company.localeCompare(b.company) ||
    a.title.localeCompare(b.title)
  );
}

function normalizeLaneFamily(lane) {
  if (lane === 'deployment') return 'forward-deployed';
  if (lane === 'solutions-architect' || lane === 'solutions-engineer') {
    return 'solutions';
  }
  return lane;
}

function buildCampaignGuidance(topOffers) {
  if (topOffers.length === 0) return null;

  const laneCounts = new Map();
  for (const offer of topOffers) {
    if (offer.bucket === 'adjacent-or-noisy') continue;
    const family = normalizeLaneFamily(offer.lane);
    laneCounts.set(family, (laneCounts.get(family) || 0) + 1);
  }

  const rankedLanes = [...laneCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  if (rankedLanes.length === 0) {
    return 'Use the shortlist order below and defer adjacent/noisy roles until stronger matches are exhausted.';
  }

  const primary =
    SHORTLIST_LANE_LABELS[rankedLanes[0][0]] || 'top-priority roles';
  const secondary =
    rankedLanes.length > 1 && rankedLanes[1][1] >= 2
      ? SHORTLIST_LANE_LABELS[rankedLanes[1][0]] || null
      : null;

  if (secondary) {
    return `Current strongest lane cluster: ${primary} + ${secondary}. Use the top of the list below before touching adjacent/noisy roles.`;
  }

  return `Current strongest lane: ${primary}. Use the top of the list below before touching adjacent/noisy roles.`;
}

function buildShortlist(offers, shortlistContext) {
  const rankedOffers = offers
    .map((offer) => scoreOfferForShortlist(offer, shortlistContext))
    .sort(compareShortlistOffers);
  const bucketCounts = {
    'strongest-fit': 0,
    'possible-fit': 0,
    'adjacent-or-noisy': 0,
  };

  rankedOffers.forEach((offer) => {
    bucketCounts[offer.bucket] += 1;
  });

  const topOffers = rankedOffers.slice(0, 10);

  return {
    totalOffers: rankedOffers.length,
    rankedOffers,
    topOffers,
    bucketCounts,
    campaignGuidance: buildCampaignGuidance(topOffers),
  };
}

function renderShortlistSection(shortlist, date) {
  const lines = [
    '## Shortlist',
    '',
    `Last refreshed: ${date} by npm run scan.`,
    '',
  ];

  if (shortlist.totalOffers === 0) {
    lines.push(
      'No pending roles yet. Run `npm run scan` or paste a job URL into Codex.',
    );
    lines.push('');
    return lines.join('\n');
  }

  if (shortlist.campaignGuidance) {
    lines.push(`Campaign guidance: ${shortlist.campaignGuidance}`);
    lines.push('');
  }

  lines.push('Bucket counts:');
  lines.push(
    `- Strongest fit: ${shortlist.bucketCounts['strongest-fit']}`,
    `- Possible fit: ${shortlist.bucketCounts['possible-fit']}`,
    `- Adjacent or noisy: ${shortlist.bucketCounts['adjacent-or-noisy']}`,
    '',
    'Top 10 to evaluate first:',
  );

  shortlist.topOffers.forEach((offer, index) => {
    const why = offer.why.length > 0 ? ` | ${offer.why.join('; ')}` : '';
    lines.push(
      `${index + 1}. ${offer.bucketLabel} | ${offer.url} | ${offer.company} | ${offer.title}${why}`,
    );
  });

  lines.push(
    '',
    'Next step:',
    '- Review these top roles first in this order.',
    '- Run the full evaluation flow on the top 3 before touching adjacent/noisy roles.',
    '',
  );

  return lines.join('\n');
}

function upsertPipelineShortlist(shortlist, date) {
  ensurePipelineFile();
  const sectionText = renderShortlistSection(shortlist, date);
  let text = readPipelineText();
  const existing = getSectionRange(text, '## Shortlist');

  if (existing) {
    text =
      text.slice(0, existing.start) + sectionText + text.slice(existing.end);
  } else {
    const pending = text.indexOf('## Pending');
    const insertAt = pending === -1 ? text.length : pending;
    const prefix =
      insertAt > 0 && !text.slice(0, insertAt).endsWith('\n') ? '\n' : '';
    text =
      text.slice(0, insertAt) +
      prefix +
      sectionText +
      (text.slice(insertAt).startsWith('\n') ? '' : '\n') +
      text.slice(insertAt);
  }

  if (!text.endsWith('\n')) text += '\n';
  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function printShortlist(shortlist) {
  if (shortlist.totalOffers === 0) return;

  console.log('\nShortlist buckets:');
  console.log(`  - Strongest fit: ${shortlist.bucketCounts['strongest-fit']}`);
  console.log(`  - Possible fit: ${shortlist.bucketCounts['possible-fit']}`);
  console.log(
    `  - Adjacent or noisy: ${shortlist.bucketCounts['adjacent-or-noisy']}`,
  );

  if (shortlist.campaignGuidance) {
    console.log(`\nCampaign guidance: ${shortlist.campaignGuidance}`);
  }

  console.log('\nTop 10 to evaluate first:');
  shortlist.topOffers.forEach((offer, index) => {
    const why = offer.why.length > 0 ? ` | ${offer.why.join('; ')}` : '';
    console.log(
      `  ${index + 1}. ${offer.bucketLabel} | ${offer.company} | ${offer.title}${why}`,
    );
  });
}

function collectInactiveConfigNotes(config, scopedCompanies) {
  const notes = [];
  const searchQueries = Array.isArray(config.search_queries)
    ? config.search_queries
    : [];
  const seniorityBoost = Array.isArray(config.title_filter?.seniority_boost)
    ? config.title_filter.seniority_boost
    : [];
  const legacyCompanyEntries = scopedCompanies.filter(
    (company) => company.scan_method || company.scan_query,
  );

  if (searchQueries.length > 0) {
    notes.push(
      `search_queries (${searchQueries.length}) are stored in portals.yml but ignored by this scanner`,
    );
  }

  if (seniorityBoost.length > 0) {
    notes.push(
      `title_filter.seniority_boost (${seniorityBoost.length}) is present but ignored by this scanner`,
    );
  }

  if (legacyCompanyEntries.length > 0) {
    notes.push(
      `tracked_companies.scan_method/scan_query are ignored for ${legacyCompanyEntries.length} entries: ${summarizeNames(
        legacyCompanyEntries.map((company) => company.name),
      )}`,
    );
  }

  return notes;
}

function buildCompanyLists(companies, filterCompany) {
  const scopedCompanies = companies.filter(
    (company) =>
      !filterCompany || company.name.toLowerCase().includes(filterCompany),
  );
  const targets = [];
  const skipped = [];

  for (const company of scopedCompanies) {
    if (company.enabled === false) {
      skipped.push({ name: company.name, reason: 'disabled in portals.yml' });
      continue;
    }

    const api = detectApi(company);
    if (!api) {
      skipped.push({
        name: company.name,
        reason: 'no supported ATS API detected from api/careers_url',
      });
      continue;
    }

    targets.push({ ...company, _api: api });
  }

  return { scopedCompanies, skipped, targets };
}

export async function runScan(args = process.argv.slice(2)) {
  const dryRunRequested = args.includes('--dry-run');
  const compareClean = args.includes('--compare-clean');
  const dryRun = dryRunRequested || compareClean;
  const companyFlag = args.indexOf('--company');
  const companyValue = companyFlag !== -1 ? args[companyFlag + 1] : null;
  const filterCompany = companyValue ? companyValue.toLowerCase() : null;

  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8')) || {};
  const profileConfig = loadProfileConfig();
  const discoveryConfig = buildDiscoveryConfig(profileConfig);
  const companies = Array.isArray(config.tracked_companies)
    ? config.tracked_companies
    : [];
  const titleFilter = buildTitleFilter(config.title_filter);
  const { scopedCompanies, skipped, targets } = buildCompanyLists(
    companies,
    filterCompany,
  );
  const inactiveConfigNotes = collectInactiveConfigNotes(
    config,
    scopedCompanies,
  );

  if (!dryRun) ensureScanArtifacts();

  console.log(`Scanning ${targets.length} companies via supported ATS APIs`);
  if (filterCompany && scopedCompanies.length === 0) {
    console.log(`No tracked companies matched --company ${companyValue}`);
  }
  if (compareClean) {
    console.log(
      '(compare-clean mode - ignoring scan history, pipeline, and tracker dedup state)',
    );
  }
  if (dryRun) console.log('(dry run - no files will be written)\n');

  const seenUrls = compareClean ? new Set() : loadSeenUrls();
  const seenCompanyRoles = compareClean ? new Set() : loadSeenCompanyRoles();

  const date = new Date().toISOString().slice(0, 10);
  let totalFound = 0;
  let totalFiltered = 0;
  let totalLocationFiltered = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [];
  const locationRejections = [];
  const discoverySummary = formatDiscoverySummary(discoveryConfig);
  const shortlistContext = {
    positiveKeywords: normalizeStringList(config.title_filter?.positive),
    companyPriority: buildCompanyPriorityMap(targets),
    discovery: discoveryConfig,
  };

  const tasks = targets.map((company) => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url);
      const jobs = PARSERS[type](json, company.name);
      totalFound += jobs.length;

      for (const job of jobs) {
        if (!titleFilter(job.title)) {
          totalFiltered++;
          continue;
        }

        const locationDecision = evaluateLocation(
          job.location,
          discoveryConfig,
        );
        if (!locationDecision.allowed) {
          totalLocationFiltered++;
          locationRejections.push({
            ...locationDecision,
            company: job.company,
            title: job.title,
          });
          continue;
        }

        if (seenUrls.has(job.url)) {
          totalDupes++;
          continue;
        }

        const companyRoleKey = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
        if (seenCompanyRoles.has(companyRoleKey)) {
          totalDupes++;
          continue;
        }

        seenUrls.add(job.url);
        seenCompanyRoles.add(companyRoleKey);
        newOffers.push({ ...job, source: `${type}-api` });
      }
    } catch (error) {
      errors.push({ company: company.name, error: error.message });
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  const shortlistOffers = compareClean
    ? mergeOffers(newOffers)
    : dryRun
      ? mergeOffers(loadPendingPipelineOffers(), newOffers)
      : loadPendingPipelineOffers();
  const shortlist = buildShortlist(shortlistOffers, shortlistContext);

  if (!dryRun) {
    upsertPipelineShortlist(shortlist, date);
  }

  console.log(`\n${'-'.repeat(45)}`);
  console.log(`Portal Scan - ${date}`);
  console.log(`${'-'.repeat(45)}`);
  console.log(`Companies configured: ${scopedCompanies.length}`);
  console.log(`Companies scanned:    ${targets.length}`);
  console.log(`Companies skipped:    ${skipped.length}`);
  console.log(`Total jobs found:     ${totalFound}`);
  console.log(`Filtered by title:    ${totalFiltered} removed`);
  console.log(`Filtered by location: ${totalLocationFiltered} removed`);
  console.log(`Duplicates:           ${totalDupes} skipped`);
  console.log(`New offers added:     ${newOffers.length}`);

  if (targets.length > 0) {
    console.log('\nScanned companies:');
    for (const company of [...targets].sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      console.log(`  - ${company.name} (${company._api.type})`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped companies (${skipped.length}):`);
    for (const company of [...skipped].sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      console.log(`  - ${company.name}: ${company.reason}`);
    }
  }

  if (inactiveConfigNotes.length > 0) {
    console.log(`\nUnsupported config (${inactiveConfigNotes.length}):`);
    for (const note of inactiveConfigNotes) {
      console.log(`  - ${note}`);
    }
  }

  if (discoverySummary.length > 0) {
    console.log(`\nProfile constraints (${discoverySummary.length}):`);
    for (const line of discoverySummary) {
      console.log(`  - ${line}`);
    }
  }

  if (locationRejections.length > 0) {
    const rejectionSummary = summarizeLocationRejections(locationRejections);
    console.log(`\nLocation rejections (${locationRejections.length}):`);
    for (const line of rejectionSummary) {
      console.log(`  - ${line}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const error of errors.sort((a, b) =>
      a.company.localeCompare(b.company),
    )) {
      console.log(`  - ${error.company}: ${error.error}`);
    }
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const offer of newOffers) {
      console.log(
        `  + ${offer.company} | ${offer.title} | ${offer.location || 'N/A'}`,
      );
    }

    if (dryRun) {
      console.log('\n(dry run - run without --dry-run to save results)');
    } else {
      console.log(
        `\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`,
      );
    }
  }

  printShortlist(shortlist);

  if (shortlist.topOffers.length > 0) {
    if (dryRun) {
      console.log(
        '\nNext step: if this shortlist looks right, run npm run scan to refresh data/pipeline.md and then start with the top 3 roles.',
      );
    } else {
      console.log(
        '\nNext step: open data/pipeline.md -> ## Shortlist, start with the top 3 roles, and leave adjacent/noisy roles for later.',
      );
    }
  } else {
    console.log(
      '\nNext step: tighten portals.yml or add higher-fit companies, then rerun npm run scan.',
    );
  }
}

export {
  appendToPipeline,
  appendToScanHistory,
  buildDiscoveryConfig,
  buildCompanyLists,
  buildShortlist,
  buildTitleFilter,
  classifyLocation,
  collectInactiveConfigNotes,
  describeLocationDecision,
  detectApi,
  evaluateLocation,
  ensurePipelineFile,
  ensureScanArtifacts,
  ensureScanHistoryFile,
  fetchJson,
  formatDiscoverySummary,
  loadPendingPipelineOffers,
  loadSeenCompanyRoles,
  loadSeenUrls,
  loadProfileConfig,
  normalizeMatchText,
  parallelFetch,
  parseAshby,
  parsePendingOffersFromPipeline,
  parseGreenhouse,
  parseLever,
  printShortlist,
  renderShortlistSection,
  scoreOfferForShortlist,
  splitProfileTerms,
  summarizeNames,
  summarizeLocationRejections,
  upsertPipelineShortlist,
};

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  runScan().catch((error) => {
    console.error('Fatal:', error.message);
    process.exit(1);
  });
}
